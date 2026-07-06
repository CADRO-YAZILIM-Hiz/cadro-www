import os
import re
import shutil
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.helpdesk_audit import log_ticket_action
from app.core.email import EmailService
from app.core.permissions import ensure_permission, has_permission
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.core.scope import get_manager_department_id
from app.models.helpdesk import Ticket, TicketMessage, TicketActionLog
from app.models.employee import Employee
from app.models.company import Company

router = APIRouter()

# --- UPLOAD DİZİNİ (PDF'ler için) ---
UPLOAD_DIR = os.path.join("static", "tickets")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- GÜVENLİK AYARLARI ---
ALLOWED_EXTENSIONS = {"pdf", "jpeg", "jpg", "png", "doc", "docx", "xls", "xlsx", "txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# --- PYDANTIC ŞEMALARI ---
class TicketCreate(BaseModel):
    category: str
    priority: str
    subject: str
    message: str


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None


class MessageCreate(BaseModel):
    message: str


def _serialize_ticket_history(ticket: Ticket):
    return [
        {
            "id": item.id,
            "action_type": item.action_type,
            "action_note": item.action_note,
            "actor_name": (
                f"{item.actor.first_name} {item.actor.last_name}".strip()
                if item.actor else "Sistem"
            ),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in sorted(ticket.action_logs, key=lambda item: (item.created_at or datetime.min, item.id), reverse=True)
    ]


# ==========================================
# 🛡️ YARDIMCI FONKSİYONLAR
# ==========================================
def sanitize_filename(filename: str) -> str:
    base_name = os.path.basename(filename or "ticket_file")
    name, ext = os.path.splitext(base_name)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._") or "ticket_file"
    safe_ext = re.sub(r"[^A-Za-z0-9.]", "", ext.lower())
    return f"{safe_name}{safe_ext}"


def validate_attachment(file: UploadFile, request: Request):
    if not file.filename:
        raise HTTPException(status_code=400, detail=_("invalid_doc_format", request))

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=_("invalid_doc_format", request))

    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=_("doc_size_limit", request))

    return ext


def get_company_access_flags(db: Session, current_user: dict):
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    is_payroll_officer = company and company.payroll_officer_id == current_user["user_id"]
    can_process_company = has_permission(current_user, "helpdesk.process_company")
    can_process_team = has_permission(current_user, "helpdesk.process_team")
    manager_department_id = get_manager_department_id(db, current_user)
    return company, is_payroll_officer, can_process_company, can_process_team, manager_department_id


def resolve_responsible_assignee(company: Company, category: str) -> Optional[int]:
    if not company:
        return None

    category_map = {
        "IT_DESTEK": company.it_responsible,
        "IK_TALEBI": company.hr_responsible,
        "DİĞER": company.hr_responsible,
        "DIGER": company.hr_responsible,
        "IDARI_TALEP": company.admin_responsible,
        "BORDRO": company.payroll_officer_id,
    }
    return category_map.get(category)


def get_ticket_notification_recipients(db: Session, company: Company, category: str) -> list[Employee]:
    recipients = []
    assigned_employee_id = resolve_responsible_assignee(company, category)

    if assigned_employee_id:
        assigned_employee = db.query(Employee).filter(
            Employee.id == assigned_employee_id,
            Employee.company_id == company.id,
            Employee.status == "ACTIVE"
        ).first()
        if assigned_employee:
            recipients.append(assigned_employee)

    if recipients:
        return recipients

    return db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.role.in_(["SUPERADMIN", "ADMIN"]),
        Employee.status == "ACTIVE"
    ).all()


def _is_ticket_in_manager_scope(ticket: Ticket, manager_department_id: int | None) -> bool:
    if not manager_department_id:
        return False
    creator_department_id = ticket.creator.department_id if ticket.creator else None
    return creator_department_id == manager_department_id


def ensure_ticket_access(
    ticket: Ticket,
    current_user: dict,
    is_payroll_officer: bool,
    can_process_company: bool,
    can_process_team: bool,
    manager_department_id: int | None,
    request: Request,
):
    can_access = (
        can_process_company
        or ticket.created_by == current_user["user_id"]
        or ticket.assigned_to == current_user["user_id"]
        or (is_payroll_officer and ticket.category == "BORDRO")
        or (can_process_team and _is_ticket_in_manager_scope(ticket, manager_department_id))
    )

    if not can_access:
        raise HTTPException(status_code=403, detail=_("unauthorized_view_ticket", request))


# --- ROTALAR ---

# 1. YENİ TALEP OLUŞTURMA
@router.post("/")
def create_ticket(payload: TicketCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.create_own", request)
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    assigned_employee_id = resolve_responsible_assignee(company, payload.category)

    new_ticket = Ticket(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        assigned_to=assigned_employee_id,
        category=payload.category,
        priority=payload.priority,
        subject=payload.subject,
        description=payload.message,
        status="AÇIK"
    )
    db.add(new_ticket)
    db.flush()
    log_ticket_action(
        db,
        ticket_id=new_ticket.id,
        company_id=current_user["company_id"],
        actor_employee_id=current_user["user_id"],
        action_type="CREATED",
        action_note=payload.subject,
        metadata={"category": payload.category, "priority": payload.priority},
    )

    first_msg = TicketMessage(
        ticket_id=new_ticket.id,
        sender_id=current_user["user_id"],
        message=payload.message
    )
    db.add(first_msg)
    log_ticket_action(
        db,
        ticket_id=new_ticket.id,
        company_id=current_user["company_id"],
        actor_employee_id=current_user["user_id"],
        action_type="MESSAGE_ADDED",
        action_note=(payload.message or "")[:160],
    )
    db.commit()
    db.refresh(new_ticket)

    # 📧 YENİ: Yetkililere "Yeni Talep" Maili At
    sender_emp = db.query(Employee).filter(Employee.id == current_user["user_id"]).first()
    sender_name = f"{sender_emp.first_name} {sender_emp.last_name}" if sender_emp else "Bir personel"

    recipients = get_ticket_notification_recipients(db, company, payload.category) if company else []
    dispatch_push_event(
        db,
        PushEventType.HELPDESK_CREATED,
        {
            "company_id": current_user["company_id"],
            "entity_id": new_ticket.id,
            "actor_employee_id": current_user["user_id"],
            "ticket_subject": payload.subject,
            "responsible_employee_ids": [recipient.id for recipient in recipients],
            "deep_link": "/admin-queue/helpdesk",
        },
    )

    for recipient in recipients:
        if recipient.email:
            html = f"""<h3 style="color:#0ea5e9;">Yeni Destek Talebi ⚠️</h3>
            <p><strong>{sender_name}</strong> tarafından yeni bir <strong>{payload.category}</strong> talebi açıldı.</p>
            <p><strong>Konu:</strong> {payload.subject}</p>
            <p>Lütfen sisteme giriş yaparak talebi yanıtlayın.</p>"""
            EmailService.send_operational_email(recipient.email, f"Yeni Talep: {payload.subject}", html)

    return {"message": _("ticket_created_success", request)}


# 2. TALEPLERİ LİSTELEME
@router.get("/")
def get_tickets(request: Request, status: str = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    query = db.query(Ticket).options(joinedload(Ticket.creator)).filter(
        Ticket.company_id == current_user["company_id"]
    )

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)

    if not can_process_company:
        if can_process_team and manager_department_id:
            query = query.filter(
                or_(
                    Ticket.created_by == current_user["user_id"],
                    Ticket.assigned_to == current_user["user_id"],
                    Ticket.creator.has(Employee.department_id == manager_department_id),
                )
            )
        elif is_payroll_officer:
            query = query.filter(
                or_(
                    Ticket.created_by == current_user["user_id"],
                    Ticket.category == "BORDRO",
                    Ticket.assigned_to == current_user["user_id"]
                )
            )
        else:
            query = query.filter(
                or_(
                    Ticket.created_by == current_user["user_id"],
                    Ticket.assigned_to == current_user["user_id"]
                )
            )

    if status and status != "ALL":
        query = query.filter(Ticket.status == status)

    tickets = query.order_by(Ticket.created_at.desc()).all()

    result = []
    for t in tickets:
        result.append({
            "id": t.id,
            "category": t.category,
            "priority": t.priority,
            "subject": t.subject,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "assigned_to": t.assigned_to,
            "creator_name": f"{t.creator.first_name} {t.creator.last_name}" if t.creator else None
        })
    return result


# 3. TALEP DETAYI VE MESAJ GEÇMİŞİ
@router.get("/{ticket_id}")
def get_ticket_details(ticket_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    ticket = db.query(Ticket).options(
        joinedload(Ticket.creator).joinedload(Employee.department_rel),
        joinedload(Ticket.assignee),
        joinedload(Ticket.messages).joinedload(TicketMessage.sender),
        joinedload(Ticket.action_logs).joinedload(TicketActionLog.actor),
    ).filter(
        Ticket.id == ticket_id,
        Ticket.company_id == current_user["company_id"]
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail=_("ticket_not_found", request))

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)
    ensure_ticket_access(ticket, current_user, is_payroll_officer, can_process_company, can_process_team, manager_department_id, request)

    msg_list = []
    for m in ticket.messages:
        msg_list.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": f"{m.sender.first_name} {m.sender.last_name}" if m.sender else "Sistem",
            "message": m.message,
            "file_url": getattr(m, "file_url", None),
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    dept_name = ticket.creator.department_rel.name if ticket.creator and getattr(ticket.creator, "department_rel", None) else _("unspecified", request)

    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "assigned_to": ticket.assigned_to,
        "employee": {
            "first_name": ticket.creator.first_name if ticket.creator else "",
            "last_name": ticket.creator.last_name if ticket.creator else "",
            "department": dept_name
        },
        "messages": msg_list,
        "history": _serialize_ticket_history(ticket),
    }


# 4. YENİ MESAJ GÖNDERME
@router.post("/{ticket_id}/messages")
def add_ticket_message(ticket_id: int, payload: MessageCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    ticket = db.query(Ticket).options(joinedload(Ticket.creator)).filter(
        Ticket.id == ticket_id,
        Ticket.company_id == current_user["company_id"]
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=_("ticket_not_found", request))

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)
    ensure_ticket_access(ticket, current_user, is_payroll_officer, can_process_company, can_process_team, manager_department_id, request)

    if ticket.status == "ÇÖZÜLDÜ":
        raise HTTPException(status_code=400, detail=_("ticket_closed_cannot_message", request))

    new_msg = TicketMessage(ticket_id=ticket.id, sender_id=current_user["user_id"], message=payload.message)
    ticket.status = "İŞLEMDE" if current_user["role"] != "EMPLOYEE" else ticket.status
    db.add(new_msg)
    log_ticket_action(
        db,
        ticket_id=ticket.id,
        company_id=ticket.company_id,
        actor_employee_id=current_user["user_id"],
        action_type="MESSAGE_ADDED",
        action_note=(payload.message or "")[:160],
    )
    db.commit()
    participant_ids = [message.sender_id for message in ticket.messages] + [ticket.created_by, ticket.assigned_to]
    dispatch_push_event(
        db,
        PushEventType.HELPDESK_REPLY,
        {
            "company_id": ticket.company_id,
            "entity_id": ticket.id,
            "actor_employee_id": current_user["user_id"],
            "ticket_subject": ticket.subject,
            "ticket_creator_id": ticket.created_by,
            "assigned_employee_id": ticket.assigned_to,
            "ticket_participant_ids": participant_ids,
            "deep_link": f"/helpdesk/{ticket.id}",
        },
    )

    if current_user["role"] != "EMPLOYEE" and ticket.creator and ticket.creator.email:
        html = f"""<h3 style="color:#10b981;">Talebinize Cevap Geldi 💬</h3>
        <p><strong>{ticket.subject}</strong> başlıklı destek talebinize yeni bir yanıt eklendi.</p>
        <p>Lütfen Destek Masası'na giriş yaparak kontrol ediniz.</p>"""
        EmailService.send_operational_email(ticket.creator.email, f"Yanıt: {ticket.subject}", html)

    return {"message": _("message_sent_success", request)}


# 5. DOSYALI MESAJ GÖNDERME
@router.post("/{ticket_id}/messages/with-file")
def add_message_with_file(
    ticket_id: int,
    request: Request,
    message: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    ticket = db.query(Ticket).options(joinedload(Ticket.creator)).filter(
        Ticket.id == ticket_id,
        Ticket.company_id == current_user["company_id"]
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=_("ticket_not_found", request))

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)
    ensure_ticket_access(ticket, current_user, is_payroll_officer, can_process_company, can_process_team, manager_department_id, request)

    if ticket.status == "ÇÖZÜLDÜ":
        raise HTTPException(status_code=400, detail=_("ticket_closed", request))

    ext = validate_attachment(file, request)
    original_safe_name = sanitize_filename(file.filename)
    safe_filename = f"ticket_{ticket_id}_{uuid.uuid4().hex[:8]}_{original_safe_name.rsplit('.', 1)[0]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/{file_path}"

    msg_text = message if message else _("see_attached_file", request)
    new_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user["user_id"],
        message=msg_text,
        file_url=file_url
    )

    ticket.status = "İŞLEMDE" if current_user["role"] != "EMPLOYEE" else ticket.status
    db.add(new_msg)
    log_ticket_action(
        db,
        ticket_id=ticket.id,
        company_id=ticket.company_id,
        actor_employee_id=current_user["user_id"],
        action_type="ATTACHMENT_ADDED",
        action_note=msg_text[:160] if msg_text else None,
        metadata={"file_url": file_url},
    )
    db.commit()
    participant_ids = [message.sender_id for message in ticket.messages] + [ticket.created_by, ticket.assigned_to]
    dispatch_push_event(
        db,
        PushEventType.HELPDESK_REPLY,
        {
            "company_id": ticket.company_id,
            "entity_id": ticket.id,
            "actor_employee_id": current_user["user_id"],
            "ticket_subject": ticket.subject,
            "ticket_creator_id": ticket.created_by,
            "assigned_employee_id": ticket.assigned_to,
            "ticket_participant_ids": participant_ids,
            "deep_link": f"/helpdesk/{ticket.id}",
        },
    )

    if current_user["role"] != "EMPLOYEE" and ticket.creator and ticket.creator.email:
        html = f"""<h3 style="color:#8b5cf6;">Size Bir Dosya Gönderildi 📎</h3>
        <p><strong>{ticket.subject}</strong> başlıklı talebinize istinaden bir dosya (Örn: Bordro/Belge) iletilmiştir.</p>
        <p>Lütfen sisteme giriş yaparak dosyayı görüntüleyin.</p>"""
        EmailService.send_operational_email(ticket.creator.email, f"Dosya İletildi: {ticket.subject}", html)

    return {"message": _("file_message_sent_success", request), "file_url": file_url}


# 6. TALEP DURUMU GÜNCELLEME
@router.put("/{ticket_id}/status")
def update_ticket_status(ticket_id: int, payload: TicketUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    ticket = db.query(Ticket).options(joinedload(Ticket.creator)).filter(
        Ticket.id == ticket_id,
        Ticket.company_id == current_user["company_id"]
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=_("ticket_not_found", request))

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)

    is_assigned_responsible = ticket.assigned_to == current_user["user_id"]
    can_process = (
        can_process_company
        or is_assigned_responsible
        or (is_payroll_officer and ticket.category == "BORDRO")
        or (can_process_team and _is_ticket_in_manager_scope(ticket, manager_department_id))
    )

    if not can_process:
        raise HTTPException(status_code=403, detail=_("unauthorized_close_ticket", request))

    if payload.assigned_to is not None:
        assignee = db.query(Employee).filter(
            Employee.id == payload.assigned_to,
            Employee.company_id == current_user["company_id"],
            Employee.status == "ACTIVE"
        ).first()
        if not assignee:
            raise HTTPException(status_code=404, detail=_("employee_not_found", request))
        ticket.assigned_to = payload.assigned_to
        log_ticket_action(
            db,
            ticket_id=ticket.id,
            company_id=ticket.company_id,
            actor_employee_id=current_user["user_id"],
            action_type="ASSIGNED",
            action_note=f"{assignee.first_name} {assignee.last_name}".strip(),
            metadata={"assigned_to": payload.assigned_to},
        )

    if payload.status:
        ticket.status = payload.status
        log_ticket_action(
            db,
            ticket_id=ticket.id,
            company_id=ticket.company_id,
            actor_employee_id=current_user["user_id"],
            action_type="STATUS_UPDATED",
            action_note=payload.status,
            metadata={"status": payload.status},
        )

        if payload.status == "ÇÖZÜLDÜ" and ticket.creator and ticket.creator.email:
            html = f"""<h3 style="color:#10b981;">Talebiniz Çözüldü Olarak İşaretlendi ✅</h3>
            <p><strong>{ticket.subject}</strong> başlıklı destek talebiniz yetkili tarafından 'Çözüldü' olarak kapatılmıştır.</p>
            <p>Eğer sorununuz devam ediyorsa lütfen yeni bir talep oluşturun.</p>"""
            EmailService.send_operational_email(ticket.creator.email, f"Talep Kapatıldı: {ticket.subject}", html)

    db.commit()
    dispatch_push_event(
        db,
        PushEventType.HELPDESK_STATUS_CHANGED,
        {
            "company_id": ticket.company_id,
            "entity_id": ticket.id,
            "actor_employee_id": current_user["user_id"],
            "ticket_subject": ticket.subject,
            "ticket_creator_id": ticket.created_by,
            "deep_link": f"/helpdesk/{ticket.id}",
        },
    )
    return {"message": _("ticket_status_updated", request).format(status=payload.status)}


@router.get("/{ticket_id}/history")
def get_ticket_history(ticket_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "helpdesk.view_workspace", request)
    ticket = db.query(Ticket).options(
        joinedload(Ticket.creator),
        joinedload(Ticket.action_logs).joinedload(TicketActionLog.actor),
    ).filter(
        Ticket.id == ticket_id,
        Ticket.company_id == current_user["company_id"],
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail=_("ticket_not_found", request))

    company, is_payroll_officer, can_process_company, can_process_team, manager_department_id = get_company_access_flags(db, current_user)
    ensure_ticket_access(ticket, current_user, is_payroll_officer, can_process_company, can_process_team, manager_department_id, request)

    return _serialize_ticket_history(ticket)
