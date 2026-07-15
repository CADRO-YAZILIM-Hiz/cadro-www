import os
import shutil
import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.api.helpdesk import UPLOAD_DIR as HELPDESK_UPLOAD_DIR, sanitize_filename as sanitize_ticket_filename, validate_attachment
from app.core.i18n import _
from app.core.leave_catalog import (
    get_leave_catalog,
    get_leave_type_label,
    infer_leave_country,
    is_leave_type_allowed,
    normalize_leave_country,
    normalize_leave_type,
)
from app.core.approval_routing import (
    can_user_approve_document,
    can_user_approve_expense,
    can_user_approve_leave,
    get_actionable_pending_documents,
    get_actionable_pending_expenses,
    get_actionable_pending_leaves,
    resolve_document_approvers,
    resolve_expense_approvers,
    resolve_leave_approvers,
    should_auto_approve,
)
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.api.document import (
    UPLOAD_DIR as DOCUMENT_UPLOAD_DIR,
    build_document_download_url,
    sanitize_filename,
    validate_upload,
)
from app.models.asset_expense import Asset, Expense
from app.models.company import Company
from app.models.document import EmployeeDocument
from app.models.employee import Employee
from app.models.helpdesk import Ticket, TicketMessage
from app.models.leave import LeaveRequest
from app.models.mobile_device import MobileDevice
from app.models.training import Training, TrainingParticipant
from app.models.attendance import Attendance
from app.services.mobile_device_service import bind_mobile_device_to_employee

router = APIRouter()
EXPENSE_UPLOAD_DIR = "uploads/expenses"
EXPENSE_ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
EXPENSE_MAX_FILE_SIZE = 5 * 1024 * 1024


class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_name: str | None = None
    device_platform: str
    push_token: str | None = None


class PushTokenRequest(BaseModel):
    device_id: str
    push_token: str


class PushTokenRemoveRequest(BaseModel):
    device_id: str


class MobileLeaveCreateRequest(BaseModel):
    leave_country: str | None = None
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: str | None = None


class MobileTicketCreateRequest(BaseModel):
    category: str
    priority: str
    subject: str
    message: str


class MobileTicketMessageRequest(BaseModel):
    message: str


ADMIN_MOBILE_ROLES = {"MANAGER", "HR", "ADMIN", "SUPERADMIN"}


class MobileStatusUpdateRequest(BaseModel):
    status: str
    rejection_reason: str | None = None


def mobile_success(data=None, message: str | None = None):
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def mobile_list(items: list, total: int, page: int, page_size: int, message: str | None = None):
    return {
        "success": True,
        "message": message,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def mobile_not_found(message: str):
    raise HTTPException(
        status_code=404,
        detail={
            "success": False,
            "code": "NOT_FOUND",
            "message": message,
        },
    )


def resolve_mobile_ticket_assignee(company: Company | None, category: str) -> int | None:
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


def _normalize_demo_turkish_text(value: str | None) -> str:
    if not value:
        return "-"

    token_map = {
        "asli": "Aslı",
        "ayse": "Ayşe",
        "yigit": "Yiğit",
        "nazli": "Nazlı",
        "ates": "Ateş",
        "koc": "Koç",
        "guner": "Güner",
        "akin": "Akın",
        "ozdemir": "Özdemir",
        "sari": "Sarı",
        "gok": "Gök",
        "insan": "İnsan",
        "kaynaklari": "Kaynakları",
        "ik": "İK",
        "uzmani": "Uzmanı",
        "muduru": "Müdürü",
        "yonetici": "Yönetici",
        "yardimci": "Yardımcı",
        "muhendis": "Mühendis",
        "idari": "İdari",
        "isler": "İşler",
        "egitim": "Eğitim",
        "gelisim": "Gelişim",
        "kazanimi": "Kazanımı",
        "santiye": "Şantiye",
        "soforu": "Şoförü",
        "teknisyeni": "Teknisyeni",
        "uzmanligi": "Uzmanlığı",
        "musteri": "Müşteri",
        "cozum": "Çözüm",
        "cozumleri": "Çözümleri",
    }

    parts = []
    current = ""
    for char in value:
        if char.isalnum():
            current += char
        else:
            if current:
                parts.append(current)
                current = ""
            parts.append(char)
    if current:
        parts.append(current)

    normalized_parts = []
    for part in parts:
        if not any(ch.isalnum() for ch in part):
            normalized_parts.append(part)
            continue

        mapped = token_map.get(part.lower())
        if mapped:
            normalized_parts.append(mapped)
            continue

        if part.isupper() and part.isascii():
            lowered = part.lower()
            normalized_parts.append(f"{lowered[:1].upper()}{lowered[1:]}")
            continue

        normalized_parts.append(part)

    return "".join(normalized_parts)


def _mobile_employee_name(employee: Employee | None) -> str:
    if not employee:
        return "-"
    full_name = f"{employee.first_name or ''} {employee.last_name or ''}".strip()
    return _normalize_demo_turkish_text(full_name) if full_name else "-"


def _ensure_mobile_admin_access(current_user: dict):
    if current_user.get("role") not in ADMIN_MOBILE_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/leaves")
def get_my_mobile_leaves(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.employee_id == current_user["user_id"],
    ).order_by(LeaveRequest.created_at.desc()).all()

    return mobile_list(
        items=[
            {
                "id": item.id,
                "leave_country": item.leave_country or infer_leave_country(item.leave_type),
                "leave_type": item.leave_type,
                "leave_type_label": get_leave_type_label(
                    item.leave_type,
                    item.leave_country,
                    request.headers.get("accept-language"),
                ),
                "start_date": item.start_date.isoformat() if item.start_date else None,
                "end_date": item.end_date.isoformat() if item.end_date else None,
                "total_days": float(item.total_days or 0),
                "reason": item.reason,
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in requests
        ],
        total=len(requests),
        page=1,
        page_size=len(requests) or 0,
    )


@router.get("/leaves/summary")
def get_my_mobile_leave_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_year = date.today().year
    approved_requests = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.employee_id == current_user["user_id"],
        LeaveRequest.status == "APPROVED",
        extract("year", LeaveRequest.start_date) == current_year,
    ).all()

    breakdown = {}
    for leave in approved_requests:
        breakdown[leave.leave_type] = breakdown.get(leave.leave_type, 0) + float(leave.total_days or 0)

    return mobile_success({
        "year": current_year,
        "total_used_days": float(sum(item.total_days or 0 for item in approved_requests)),
        "breakdown": breakdown,
    })


@router.get("/leave-catalog")
def get_mobile_leave_catalog(request: Request):
    return mobile_success(get_leave_catalog(request.headers.get("accept-language")))


@router.post("/leaves")
def create_mobile_leave(
    payload: MobileLeaveCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()

    if not employee:
        mobile_not_found(_("employee_not_found", request))

    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail=_("start_date_after_end_date", request))

    overlapping_leave = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.employee_id == current_user["user_id"],
        LeaveRequest.status.in_(["PENDING", "APPROVED"]),
        LeaveRequest.start_date <= payload.end_date,
        LeaveRequest.end_date >= payload.start_date,
    ).first()

    if overlapping_leave:
        raise HTTPException(
            status_code=400,
            detail=_("overlapping_leave_error", request).format(
                start=overlapping_leave.start_date,
                end=overlapping_leave.end_date,
            ),
        )

    leave_type = normalize_leave_type(payload.leave_type)
    leave_country = normalize_leave_country(
        payload.leave_country,
        fallback=infer_leave_country(leave_type),
    )
    if not is_leave_type_allowed(leave_country, leave_type):
        raise HTTPException(status_code=400, detail="Selected leave type is not valid for this country profile.")

    approvers = resolve_leave_approvers(db, current_user["company_id"], employee)
    initial_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"

    leave_request = LeaveRequest(
        company_id=current_user["company_id"],
        employee_id=current_user["user_id"],
        leave_country=leave_country,
        leave_type=leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=payload.total_days,
        reason=payload.reason,
        status=initial_status,
    )
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    if initial_status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.LEAVE_CREATED,
            {
                "company_id": current_user["company_id"],
                "entity_id": leave_request.id,
                "subject_employee_id": employee.id,
                "subject_employee_name": _mobile_employee_name(employee),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
            },
        )

    return mobile_success(
        {
            "id": leave_request.id,
            "status": leave_request.status,
        },
        _("leave_auto_approved", request) if initial_status == "APPROVED" else _("leave_created_pending", request),
    )


@router.get("/expenses")
def get_my_mobile_expenses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    items = db.query(Expense).filter(
        Expense.company_id == current_user["company_id"],
        Expense.employee_id == current_user["user_id"],
    ).order_by(Expense.expense_date.desc(), Expense.id.desc()).all()

    return mobile_list(
        items=[
            {
                "id": item.id,
                "amount": float(item.amount or 0),
                "currency": item.currency,
                "category": item.category,
                "description": item.description,
                "expense_date": item.expense_date.isoformat() if item.expense_date else None,
                "status": item.status,
                "is_paid": bool(item.is_paid),
                "receipt_url": item.receipt_url,
            }
            for item in items
        ],
        total=len(items),
        page=1,
        page_size=len(items) or 0,
    )


@router.get("/expenses/summary")
def get_my_mobile_expense_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    expenses = db.query(Expense).filter(
        Expense.company_id == current_user["company_id"],
        Expense.employee_id == current_user["user_id"],
    ).all()

    pending_count = 0
    approved_count = 0
    paid_count = 0
    total_amount = 0.0

    for expense in expenses:
        total_amount += float(expense.amount or 0)
        if expense.is_paid:
            paid_count += 1
        elif expense.status == "APPROVED":
            approved_count += 1
        elif expense.status == "PENDING":
            pending_count += 1

    return mobile_success({
        "pending_count": pending_count,
        "approved_count": approved_count,
        "paid_count": paid_count,
        "total_amount": total_amount,
        "total_items": len(expenses),
    })


@router.post("/expenses")
def create_mobile_expense(
    request: Request,
    amount: float = Form(...),
    currency: str = Form("TRY"),
    category: str = Form(...),
    description: str | None = Form(None),
    expense_date: date = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()

    if not employee:
        mobile_not_found(_("employee_not_found", request))

    approvers = resolve_expense_approvers(db, current_user["company_id"], employee)
    initial_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"
    receipt_url = None

    if file and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in EXPENSE_ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=_("expense_invalid_file", request))

        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > EXPENSE_MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=_("expense_file_size_limit", request))

        os.makedirs(EXPENSE_UPLOAD_DIR, exist_ok=True)
        safe_filename = f"mobile_receipt_{current_user['company_id']}_{current_user['user_id']}_{uuid.uuid4().hex[:10]}.{ext}"
        receipt_path = os.path.join(EXPENSE_UPLOAD_DIR, safe_filename)

        with open(receipt_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        receipt_url = f"/{receipt_path}"

    expense = Expense(
        company_id=current_user["company_id"],
        employee_id=current_user["user_id"],
        amount=amount,
        currency=currency,
        category=category,
        description=description,
        expense_date=expense_date,
        status=initial_status,
        is_paid=False,
        receipt_url=receipt_url,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    if initial_status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.EXPENSE_CREATED,
            {
                "company_id": current_user["company_id"],
                "entity_id": expense.id,
                "subject_employee_id": employee.id,
                "subject_employee_name": _mobile_employee_name(employee),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
                "amount_label": f"{amount} {currency}",
            },
        )

    return mobile_success(
        {
            "id": expense.id,
            "status": expense.status,
        },
        _("expense_auto_approved", request) if initial_status == "APPROVED" else _("expense_created_pending", request),
    )


@router.get("/helpdesk")
def get_my_mobile_helpdesk(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tickets = db.query(Ticket).options(joinedload(Ticket.creator)).filter(
        Ticket.company_id == current_user["company_id"],
        Ticket.created_by == current_user["user_id"],
    ).order_by(Ticket.created_at.desc()).all()

    return mobile_list(
        items=[
            {
                "id": ticket.id,
                "category": ticket.category,
                "priority": ticket.priority,
                "subject": ticket.subject,
                "status": ticket.status,
                "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
                "creator_name": f"{ticket.creator.first_name} {ticket.creator.last_name}" if ticket.creator else None,
            }
            for ticket in tickets
        ],
        total=len(tickets),
        page=1,
        page_size=len(tickets) or 0,
    )


@router.get("/helpdesk/{ticket_id}")
def get_my_mobile_ticket_detail(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Ticket).options(
        joinedload(Ticket.creator).joinedload(Employee.department_rel),
        joinedload(Ticket.assignee),
        joinedload(Ticket.messages).joinedload(TicketMessage.sender),
    ).filter(
        Ticket.company_id == current_user["company_id"],
        Ticket.id == ticket_id,
    )

    role = current_user.get("role", "EMPLOYEE")
    if role not in ADMIN_MOBILE_ROLES:
        query = query.filter(Ticket.created_by == current_user["user_id"])

    ticket = query.first()

    if not ticket:
        mobile_not_found(_("ticket_not_found", request))

    department_name = (
        ticket.creator.department_rel.name
        if ticket.creator and getattr(ticket.creator, "department_rel", None)
        else _("unspecified", request)
    )

    return mobile_success({
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "employee": {
            "first_name": ticket.creator.first_name if ticket.creator else "",
            "last_name": ticket.creator.last_name if ticket.creator else "",
            "department": department_name,
        },
        "messages": [
            {
                "id": message.id,
                "sender_id": message.sender_id,
                "sender_name": f"{message.sender.first_name} {message.sender.last_name}" if message.sender else "System",
                "message": message.message,
                "file_url": getattr(message, "file_url", None),
                "created_at": message.created_at.isoformat() if message.created_at else None,
            }
            for message in ticket.messages
        ],
    })


@router.post("/helpdesk")
def create_mobile_ticket(
    request: Request,
    category: str = Form(...),
    priority: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    assigned_employee_id = resolve_mobile_ticket_assignee(company, category)

    ticket = Ticket(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        assigned_to=assigned_employee_id,
        category=category,
        priority=priority,
        subject=subject,
        description=message,
        status="AÇIK",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    file_url = None
    if file and file.filename:
        ext = validate_attachment(file, request)
        os.makedirs(HELPDESK_UPLOAD_DIR, exist_ok=True)
        original_safe_name = sanitize_ticket_filename(file.filename)
        safe_filename = (
            f"mobile_ticket_{ticket.id}_{uuid.uuid4().hex[:8]}_"
            f"{original_safe_name.rsplit('.', 1)[0]}.{ext}"
        )
        file_path = os.path.join(HELPDESK_UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/{file_path}"

    first_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user["user_id"],
        message=message,
        file_url=file_url,
    )
    db.add(first_msg)
    db.commit()
    recipient_ids = []
    if assigned_employee_id:
        recipient_ids.append(assigned_employee_id)
    else:
        recipient_ids = [
            employee.id
            for employee in db.query(Employee).filter(
                Employee.company_id == current_user["company_id"],
                Employee.role.in_(["SUPERADMIN", "ADMIN"]),
                Employee.status == "ACTIVE",
            ).all()
        ]
    dispatch_push_event(
        db,
        PushEventType.HELPDESK_CREATED,
        {
            "company_id": current_user["company_id"],
            "entity_id": ticket.id,
            "actor_employee_id": current_user["user_id"],
            "ticket_subject": subject,
            "responsible_employee_ids": recipient_ids,
            "deep_link": "/admin-queue/helpdesk",
        },
    )

    return mobile_success(
        {
            "id": ticket.id,
            "status": ticket.status,
        },
        _("ticket_created_success", request),
    )


@router.post("/helpdesk/{ticket_id}/messages")
def add_mobile_ticket_message(
    ticket_id: int,
    request: Request,
    message: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Ticket).filter(
        Ticket.company_id == current_user["company_id"],
        Ticket.id == ticket_id,
    )

    role = current_user.get("role", "EMPLOYEE")
    if role not in ADMIN_MOBILE_ROLES:
        query = query.filter(Ticket.created_by == current_user["user_id"])

    ticket = query.first()

    if not ticket:
        mobile_not_found(_("ticket_not_found", request))

    if ticket.status == "ÇÖZÜLDÜ":
        raise HTTPException(status_code=400, detail=_("ticket_closed_cannot_message", request))

    file_url = None
    if file and file.filename:
        ext = validate_attachment(file, request)
        os.makedirs(HELPDESK_UPLOAD_DIR, exist_ok=True)
        original_safe_name = sanitize_ticket_filename(file.filename)
        safe_filename = (
            f"mobile_ticket_msg_{ticket.id}_{uuid.uuid4().hex[:8]}_"
            f"{original_safe_name.rsplit('.', 1)[0]}.{ext}"
        )
        file_path = os.path.join(HELPDESK_UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/{file_path}"

    new_message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user["user_id"],
        message=message,
        file_url=file_url,
    )
    if role in ADMIN_MOBILE_ROLES and ticket.status != "ÇÖZÜLDÜ":
        ticket.status = "İŞLEMDE"
    db.add(new_message)
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

    return mobile_success(None, _("message_sent_success", request))


@router.put("/helpdesk/{ticket_id}/status")
def update_mobile_ticket_status(
    ticket_id: int,
    payload: MobileStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "EMPLOYEE")
    is_admin = role in ADMIN_MOBILE_ROLES

    query = db.query(Ticket).filter(
        Ticket.company_id == current_user["company_id"],
        Ticket.id == ticket_id,
    )
    if not is_admin:
        query = query.filter(Ticket.created_by == current_user["user_id"])

    ticket = query.first()

    if not ticket:
        mobile_not_found(_("ticket_not_found", request))

    if not is_admin and payload.status == "ÇÖZÜLDÜ":
        raise HTTPException(status_code=403, detail=_("unauthorized_close_ticket", request))

    if payload.status not in {"AÇIK", "İŞLEMDE", "ÇÖZÜLDÜ"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    ticket.status = payload.status
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

    return mobile_success(None, _("ticket_status_updated", request).format(status=payload.status))


@router.get("/me/home")
def get_mobile_home(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    employee = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel),
    ).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()

    if not employee:
        mobile_not_found(_("employee_not_found", request))

    today = date.today()
    current_year = today.year

    today_attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.company_id == employee.company_id,
        Attendance.date == today,
    ).order_by(Attendance.id.desc()).first()

    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status == "APPROVED",
        extract("year", LeaveRequest.start_date) == current_year,
    ).all()
    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status == "PENDING",
    ).count()

    pending_expenses = db.query(Expense).filter(
        Expense.employee_id == employee.id,
        Expense.status == "PENDING",
    ).count()

    assigned_assets = db.query(Asset).filter(
        Asset.employee_id == employee.id,
        Asset.status == "ASSIGNED",
    ).count()

    pending_documents = db.query(EmployeeDocument).filter(
        EmployeeDocument.employee_id == employee.id,
        EmployeeDocument.status == "PENDING",
    ).count()

    upcoming_trainings = db.query(Training).join(
        TrainingParticipant, Training.id == TrainingParticipant.training_id
    ).filter(
        TrainingParticipant.employee_id == employee.id,
        Training.status == "SCHEDULED",
        Training.training_date >= today,
    ).order_by(Training.training_date.asc()).limit(5).all()

    open_tickets = db.query(Ticket).filter(
        Ticket.company_id == employee.company_id,
        Ticket.created_by == employee.id,
        Ticket.status.in_(["AÇIK", "İŞLEMDE"]),
    ).count()

    return mobile_success({
        "profile": {
            "id": employee.id,
            "full_name": _normalize_demo_turkish_text(f"{employee.first_name} {employee.last_name}".strip()),
            "email": employee.email,
            "phone": employee.phone,
            "department": _normalize_demo_turkish_text(
                employee.department_rel.name if employee.department_rel else _("unspecified_department", request)
            ),
            "position": _normalize_demo_turkish_text(
                employee.position_rel.title if employee.position_rel else _("unspecified", request)
            ),
            "role": employee.role,
        },
        "attendance": {
            "date": today.isoformat(),
            "status": today_attendance.status if today_attendance else "NOT_STARTED",
            "check_in": today_attendance.check_in.isoformat() if today_attendance and today_attendance.check_in else None,
            "check_out": today_attendance.check_out.isoformat() if today_attendance and today_attendance.check_out else None,
            "total_work_hours": float(today_attendance.total_work_hours or 0) if today_attendance else 0,
        },
        "summary": {
            "used_leave_days": float(sum(req.total_days or 0 for req in approved_leaves)),
            "pending_leaves": pending_leaves,
            "pending_expenses": pending_expenses,
            "assigned_assets": assigned_assets,
            "pending_documents": pending_documents,
            "open_tickets": open_tickets,
            "upcoming_trainings": len(upcoming_trainings),
        },
        "upcoming_trainings": [
            {
                "id": training.id,
                "title": training.title,
                "date": training.training_date.isoformat() if training.training_date else None,
                "time": training.training_time.strftime("%H:%M") if training.training_time else None,
                "location": training.location,
            }
            for training in upcoming_trainings
        ],
        "server_time": datetime.utcnow().isoformat(),
    })


@router.get("/notifications/summary")
def get_mobile_notification_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "EMPLOYEE")
    company_id = current_user.get("company_id")
    employee_id = current_user.get("user_id")

    if role in ["MANAGER", "HR", "ADMIN", "SUPERADMIN"]:
        pending_leaves = len(get_actionable_pending_leaves(db, current_user))
        pending_expenses = len(get_actionable_pending_expenses(db, current_user))
        pending_documents = len(get_actionable_pending_documents(db, current_user))
        open_tickets = db.query(Ticket).filter(
            Ticket.company_id == company_id,
            Ticket.status.in_(["AÇIK", "İŞLEMDE"]),
        ).count()
    else:
        pending_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == "PENDING",
        ).count()
        pending_expenses = db.query(Expense).filter(
            Expense.employee_id == employee_id,
            Expense.status == "PENDING",
        ).count()
        pending_documents = db.query(EmployeeDocument).filter(
            EmployeeDocument.employee_id == employee_id,
            EmployeeDocument.status == "PENDING",
        ).count()
        open_tickets = db.query(Ticket).filter(
            Ticket.created_by == employee_id,
            Ticket.status.in_(["AÇIK", "İŞLEMDE"]),
        ).count()

    total = pending_leaves + pending_expenses + pending_documents + open_tickets

    return mobile_success({
        "total": total,
        "details": {
            "pending_leaves": pending_leaves,
            "pending_expenses": pending_expenses,
            "pending_documents": pending_documents,
            "open_tickets": open_tickets,
        },
    })


@router.get("/approvals/summary")
def get_mobile_approvals_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "EMPLOYEE")
    company_id = current_user.get("company_id")

    if role not in ["MANAGER", "HR", "ADMIN", "SUPERADMIN"]:
        return mobile_success({
            "pending_leaves": 0,
            "pending_expenses": 0,
            "pending_documents": 0,
            "open_tickets": 0,
            "total": 0,
        })

    pending_leaves = len(get_actionable_pending_leaves(db, current_user))
    pending_expenses = len(get_actionable_pending_expenses(db, current_user))
    pending_documents = len(get_actionable_pending_documents(db, current_user))
    open_tickets = db.query(Ticket).filter(
        Ticket.company_id == company_id,
        Ticket.status.in_(["AÇIK", "İŞLEMDE"]),
    ).count()

    total = pending_leaves + pending_expenses + pending_documents + open_tickets
    return mobile_success({
        "pending_leaves": pending_leaves,
        "pending_expenses": pending_expenses,
        "pending_documents": pending_documents,
        "open_tickets": open_tickets,
        "total": total,
    })


@router.get("/admin/queues/{queue_type}")
def get_mobile_admin_queue(
    queue_type: str,
    request: Request,
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)
    company_id = current_user["company_id"]
    normalized_status = (status or "").upper()

    if queue_type == "leaves":
        query = db.query(LeaveRequest).options(
            joinedload(LeaveRequest.employee)
        ).filter(
            LeaveRequest.company_id == company_id,
        ).order_by(LeaveRequest.created_at.desc()).all()

        items = query
        if normalized_status in ("", "PENDING"):
            items = [item for item in items if item.status == "PENDING"]
            items = [item for item in items if can_user_approve_leave(db, item, current_user, item.employee)]
        elif normalized_status in {"APPROVED", "REJECTED"}:
            items = [item for item in items if item.status == normalized_status]
        total = len(items)
        items = items[(page - 1) * page_size: page * page_size]
        return mobile_list(
            items=[
                {
                    "id": item.id,
                    "employee_id": item.employee_id,
                    "employee_name": _mobile_employee_name(item.employee),
                    "leave_type": item.leave_type,
                    "start_date": item.start_date.isoformat() if item.start_date else None,
                    "end_date": item.end_date.isoformat() if item.end_date else None,
                    "total_days": float(item.total_days or 0),
                    "reason": item.reason,
                    "status": item.status,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                }
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    if queue_type == "expenses":
        items = db.query(Expense).options(
            joinedload(Expense.employee)
        ).filter(
            Expense.company_id == company_id,
        ).order_by(Expense.expense_date.desc(), Expense.id.desc()).all()
        if normalized_status in ("", "PENDING"):
            items = [item for item in items if item.status == "PENDING"]
            items = [item for item in items if can_user_approve_expense(db, item, current_user, item.employee)]
        elif normalized_status == "APPROVED":
            items = [item for item in items if item.status == "APPROVED" and not bool(item.is_paid)]
        elif normalized_status == "REJECTED":
            items = [item for item in items if item.status == "REJECTED"]
        elif normalized_status == "PAID":
            items = [item for item in items if bool(item.is_paid)]
        total = len(items)
        items = items[(page - 1) * page_size: page * page_size]
        return mobile_list(
            items=[
                {
                    "id": item.id,
                    "employee_id": item.employee_id,
                    "employee_name": _mobile_employee_name(item.employee),
                    "amount": float(item.amount or 0),
                    "currency": item.currency,
                    "category": item.category,
                    "description": item.description,
                    "expense_date": item.expense_date.isoformat() if item.expense_date else None,
                    "receipt_url": item.receipt_url,
                    "status": "PAID" if bool(item.is_paid) else item.status,
                }
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    if queue_type == "documents":
        items = db.query(EmployeeDocument).join(
            Employee, Employee.id == EmployeeDocument.employee_id
        ).options(
            joinedload(EmployeeDocument.employee)
        ).filter(
            Employee.company_id == company_id,
        ).order_by(EmployeeDocument.upload_date.desc(), EmployeeDocument.id.desc()).all()
        if normalized_status in ("", "PENDING"):
            items = [item for item in items if item.status == "PENDING"]
            items = [item for item in items if can_user_approve_document(db, item, current_user, item.employee)]
        elif normalized_status in {"APPROVED", "REJECTED"}:
            items = [item for item in items if item.status == normalized_status]
        total = len(items)
        items = items[(page - 1) * page_size: page * page_size]
        return mobile_list(
            items=[
                {
                    "id": item.id,
                    "employee_id": item.employee_id,
                    "employee_name": _mobile_employee_name(item.employee),
                    "category": item.category,
                    "document_type": item.document_type,
                    "file_name": item.file_name,
                    "file_url": build_document_download_url(item.id) if item.file_path else None,
                    "status": item.status,
                    "upload_date": item.upload_date.isoformat() if item.upload_date else None,
                }
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    if queue_type == "helpdesk":
        query = db.query(Ticket).options(
            joinedload(Ticket.creator)
        ).filter(Ticket.company_id == company_id)
        if normalized_status in ("", "OPEN"):
            query = query.filter(Ticket.status.in_(["AÇIK", "OPEN"]))
        elif normalized_status == "IN_PROGRESS":
            query = query.filter(Ticket.status.in_(["İŞLEMDE", "IN_PROGRESS"]))
        elif normalized_status == "RESOLVED":
            query = query.filter(Ticket.status.in_(["ÇÖZÜLDÜ", "RESOLVED"]))
        else:
            query = query.filter(Ticket.status.in_(["AÇIK", "OPEN", "İŞLEMDE", "IN_PROGRESS"]))
        total = query.count()
        items = query.order_by(Ticket.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return mobile_list(
            items=[
                {
                    "id": item.id,
                    "employee_id": item.created_by,
                    "employee_name": _mobile_employee_name(item.creator),
                    "category": item.category,
                    "priority": item.priority,
                    "subject": item.subject,
                    "status": item.status,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                    "updated_at": item.updated_at.isoformat() if item.updated_at else None,
                }
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    mobile_not_found(_("resource_not_found", request))


@router.get("/admin/queues/{queue_type}/status-summary")
def get_mobile_admin_queue_status_summary(
    queue_type: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)
    company_id = current_user["company_id"]

    if queue_type == "leaves":
        approved_count = db.query(LeaveRequest).filter(
            LeaveRequest.company_id == company_id,
            LeaveRequest.status == "APPROVED",
        ).count()
        rejected_count = db.query(LeaveRequest).filter(
            LeaveRequest.company_id == company_id,
            LeaveRequest.status == "REJECTED",
        ).count()
        return mobile_success({
            "pending_count": len(get_actionable_pending_leaves(db, current_user)),
            "approved_count": approved_count,
            "rejected_count": rejected_count,
        })

    if queue_type == "expenses":
        approved_count = db.query(Expense).filter(
            Expense.company_id == company_id,
            Expense.status == "APPROVED",
            Expense.is_paid.is_(False),
        ).count()
        rejected_count = db.query(Expense).filter(
            Expense.company_id == company_id,
            Expense.status == "REJECTED",
        ).count()
        paid_count = db.query(Expense).filter(
            Expense.company_id == company_id,
            Expense.is_paid.is_(True),
        ).count()
        return mobile_success({
            "pending_count": len(get_actionable_pending_expenses(db, current_user)),
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "paid_count": paid_count,
        })

    if queue_type == "documents":
        approved_count = db.query(EmployeeDocument).join(
            Employee, Employee.id == EmployeeDocument.employee_id
        ).filter(
            Employee.company_id == company_id,
            EmployeeDocument.status == "APPROVED",
        ).count()
        rejected_count = db.query(EmployeeDocument).join(
            Employee, Employee.id == EmployeeDocument.employee_id
        ).filter(
            Employee.company_id == company_id,
            EmployeeDocument.status == "REJECTED",
        ).count()
        return mobile_success({
            "pending_count": len(get_actionable_pending_documents(db, current_user)),
            "approved_count": approved_count,
            "rejected_count": rejected_count,
        })

    if queue_type == "helpdesk":
        open_count = db.query(Ticket).filter(
            Ticket.company_id == company_id,
            Ticket.status.in_(["AÇIK", "OPEN"]),
        ).count()
        in_progress_count = db.query(Ticket).filter(
            Ticket.company_id == company_id,
            Ticket.status.in_(["İŞLEMDE", "IN_PROGRESS"]),
        ).count()
        resolved_count = db.query(Ticket).filter(
            Ticket.company_id == company_id,
            Ticket.status.in_(["ÇÖZÜLDÜ", "RESOLVED"]),
        ).count()
        return mobile_success({
            "pending_count": open_count + in_progress_count,
            "approved_count": in_progress_count,
            "rejected_count": resolved_count,
            "open_count": open_count,
            "in_progress_count": in_progress_count,
            "resolved_count": resolved_count,
        })

    mobile_not_found(_("resource_not_found", request))


@router.put("/admin/leaves/{request_id}/status")
def update_mobile_admin_leave_status(
    request_id: int,
    payload: MobileStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)

    leave_request = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.employee)
    ).filter(
        LeaveRequest.id == request_id,
        LeaveRequest.company_id == current_user["company_id"],
    ).first()

    if not leave_request:
        mobile_not_found(_("leave_not_found", request))

    if payload.status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    if leave_request.employee_id == current_user["user_id"] and payload.status == "APPROVED":
        if current_user["role"] != "SUPERADMIN":
            raise HTTPException(status_code=400, detail=_("cannot_approve_own_leave", request))

    if not can_user_approve_leave(db, leave_request, current_user, leave_request.employee):
        raise HTTPException(status_code=403, detail=_("unauthorized_approve_leave", request))

    leave_request.status = payload.status
    leave_request.approved_by = current_user["user_id"]
    if payload.status == "REJECTED":
        leave_request.rejection_reason = payload.rejection_reason
        db.commit()
        dispatch_push_event(
            db,
            PushEventType.LEAVE_REJECTED,
            {
                "company_id": leave_request.company_id,
                "entity_id": leave_request.id,
                "subject_employee_id": leave_request.employee_id,
                "subject_employee_name": _mobile_employee_name(leave_request.employee),
                "actor_employee_id": current_user["user_id"],
            },
        )
        return mobile_success(None, _("leave_rejected", request))

    db.commit()
    dispatch_push_event(
        db,
        PushEventType.LEAVE_APPROVED,
        {
            "company_id": leave_request.company_id,
            "entity_id": leave_request.id,
            "subject_employee_id": leave_request.employee_id,
            "subject_employee_name": _mobile_employee_name(leave_request.employee),
            "actor_employee_id": current_user["user_id"],
        },
    )
    return mobile_success(None, _("leave_approved_email_sent", request))


@router.put("/admin/expenses/{expense_id}/status")
def update_mobile_admin_expense_status(
    expense_id: int,
    payload: MobileStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)

    expense = db.query(Expense).options(
        joinedload(Expense.employee)
    ).filter(
        Expense.id == expense_id,
        Expense.company_id == current_user["company_id"],
    ).first()

    if not expense:
        mobile_not_found(_("expense_not_found", request))

    if expense.is_paid:
        raise HTTPException(status_code=400, detail=_("expense_already_paid", request))

    if payload.status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    if expense.employee_id == current_user["user_id"] and payload.status == "APPROVED":
        if current_user["role"] != "SUPERADMIN":
            raise HTTPException(status_code=400, detail=_("expense_cannot_approve_own", request))

    if not can_user_approve_expense(db, expense, current_user, expense.employee):
        raise HTTPException(status_code=403, detail=_("expense_unauthorized_approve", request))

    expense.status = payload.status
    db.commit()
    dispatch_push_event(
        db,
        PushEventType.EXPENSE_APPROVED if payload.status == "APPROVED" else PushEventType.EXPENSE_REJECTED,
        {
            "company_id": expense.company_id,
            "entity_id": expense.id,
            "subject_employee_id": expense.employee_id,
            "subject_employee_name": _mobile_employee_name(expense.employee),
            "actor_employee_id": current_user["user_id"],
        },
    )
    return mobile_success(None, _("expense_status_updated", request).format(status=payload.status))


@router.put("/admin/documents/{document_id}/status")
def update_mobile_admin_document_status(
    document_id: int,
    payload: MobileStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)

    if current_user["role"] not in {"HR", "ADMIN", "SUPERADMIN"}:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    document = db.query(EmployeeDocument).join(
        Employee, Employee.id == EmployeeDocument.employee_id
    ).filter(
        EmployeeDocument.id == document_id,
        Employee.company_id == current_user["company_id"],
    ).first()

    if not document:
        mobile_not_found(_("doc_not_found", request))

    if payload.status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    if not can_user_approve_document(db, document, current_user, document.employee):
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    document.status = payload.status
    db.commit()
    dispatch_push_event(
        db,
        PushEventType.DOCUMENT_APPROVED if payload.status == "APPROVED" else PushEventType.DOCUMENT_REJECTED,
        {
            "company_id": current_user["company_id"],
            "entity_id": document.id,
            "subject_employee_id": document.employee_id,
            "subject_employee_name": _mobile_employee_name(document.employee),
            "actor_employee_id": current_user["user_id"],
        },
    )
    return mobile_success(None, _("doc_status_updated", request).format(status=payload.status))


@router.post("/device/register")
def register_mobile_device(
    payload: DeviceRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    device, deactivated_device_count = bind_mobile_device_to_employee(
        db,
        company_id=current_user["company_id"],
        employee_id=current_user["user_id"],
        device_id=payload.device_id,
        device_name=payload.device_name,
        device_platform=payload.device_platform,
        push_token=payload.push_token,
    )

    db.commit()
    db.refresh(device)

    return mobile_success({
        "message": _("mobile_device_registered", request),
        "deactivated_device_count": deactivated_device_count,
        "device": {
            "id": device.id,
            "device_id": device.device_id,
            "device_name": device.device_name,
            "device_platform": device.device_platform,
            "push_token_registered": bool(device.push_token),
            "last_login_at": device.last_login_at.isoformat() if device.last_login_at else None,
        },
    }, _("mobile_device_registered", request))


@router.get("/devices")
def list_my_mobile_devices(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    devices = db.query(MobileDevice).filter(
        MobileDevice.company_id == current_user["company_id"],
        MobileDevice.employee_id == current_user["user_id"],
        MobileDevice.is_active.is_(True),
    ).order_by(MobileDevice.updated_at.desc()).all()

    return mobile_list(
        items=[
            {
                "id": device.id,
                "device_id": device.device_id,
                "device_name": device.device_name,
                "device_platform": device.device_platform,
                "push_token_registered": bool(device.push_token),
                "last_login_at": device.last_login_at.isoformat() if device.last_login_at else None,
                "updated_at": device.updated_at.isoformat() if device.updated_at else None,
            }
            for device in devices
        ],
        total=len(devices),
        page=1,
        page_size=len(devices) or 0,
    )


@router.get("/admin/devices")
def list_company_mobile_devices(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_mobile_admin_access(current_user)

    devices = db.query(MobileDevice).options(
        joinedload(MobileDevice.employee)
    ).filter(
        MobileDevice.company_id == current_user["company_id"],
        MobileDevice.is_active.is_(True),
    ).order_by(MobileDevice.updated_at.desc()).all()

    return mobile_list(
        items=[
            {
                "id": device.id,
                "employee_id": device.employee_id,
                "employee_name": _mobile_employee_name(device.employee),
                "device_id": device.device_id,
                "device_name": device.device_name,
                "device_platform": device.device_platform,
                "push_token_registered": bool(device.push_token),
                "last_login_at": device.last_login_at.isoformat() if device.last_login_at else None,
                "updated_at": device.updated_at.isoformat() if device.updated_at else None,
            }
            for device in devices
        ],
        total=len(devices),
        page=1,
        page_size=len(devices) or 0,
    )


@router.post("/push/register")
def register_push_token(
    payload: PushTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    device = db.query(MobileDevice).filter(
        MobileDevice.device_id == payload.device_id,
        MobileDevice.company_id == current_user["company_id"],
        MobileDevice.employee_id == current_user["user_id"],
    ).first()

    if not device:
        return register_mobile_device(
            DeviceRegisterRequest(
                device_id=payload.device_id,
                device_platform="unknown",
                push_token=payload.push_token,
            ),
            request=request,
            db=db,
            current_user=current_user,
        )

    device.push_token = payload.push_token
    device.is_active = True
    device.updated_at = datetime.utcnow()
    db.commit()

    return mobile_success(None, _("push_token_registered", request))


@router.delete("/push/register")
def remove_push_token(
    payload: PushTokenRemoveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    device = db.query(MobileDevice).filter(
        MobileDevice.device_id == payload.device_id,
        MobileDevice.company_id == current_user["company_id"],
        MobileDevice.employee_id == current_user["user_id"],
    ).first()

    if not device:
        return mobile_success(None, _("push_token_removed", request))

    device.push_token = None
    device.updated_at = datetime.utcnow()
    db.commit()
    return mobile_success(None, _("push_token_removed", request))


@router.get("/helpdesk/tickets")
def get_mobile_helpdesk_tickets(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Ticket).filter(Ticket.company_id == current_user["company_id"])

    if current_user.get("role") == "EMPLOYEE":
        query = query.filter(Ticket.created_by == current_user["user_id"])

    total = query.count()
    items = query.order_by(Ticket.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return mobile_list(
        items=[
            {
                "id": ticket.id,
                "category": ticket.category,
                "priority": ticket.priority,
                "subject": ticket.subject,
                "status": ticket.status,
                "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
                "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
            }
            for ticket in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/documents")
def get_mobile_documents(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(EmployeeDocument).join(
        Employee, Employee.id == EmployeeDocument.employee_id
    ).filter(
        Employee.company_id == current_user["company_id"],
        EmployeeDocument.employee_id == current_user["user_id"],
    )

    total = query.count()
    items = query.order_by(EmployeeDocument.upload_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return mobile_list(
        items=[
            {
                "id": document.id,
                "category": document.category,
                "document_type": document.document_type,
                "file_name": document.file_name,
                "file_url": build_document_download_url(document.id) if document.file_path else None,
                "status": document.status,
                "upload_date": document.upload_date.isoformat() if document.upload_date else None,
            }
            for document in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/documents")
async def create_mobile_document(
    request: Request,
    document_type: str = Form(...),
    category: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()

    if not employee:
        mobile_not_found(_("employee_not_found", request))

    ext = validate_upload(file, request)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    original_safe_name = sanitize_filename(file.filename)
    safe_filename = (
        f"mobile_doc_{current_user['company_id']}_{current_user['user_id']}_{timestamp}_"
        f"{original_safe_name.rsplit('.', 1)[0]}.{ext}"
    )
    file_path = os.path.join(DOCUMENT_UPLOAD_DIR, safe_filename)
    os.makedirs(DOCUMENT_UPLOAD_DIR, exist_ok=True)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    approvers = resolve_document_approvers(db, current_user["company_id"], employee)
    document = EmployeeDocument(
        employee_id=current_user["user_id"],
        category=category or document_type,
        document_type=document_type,
        file_name=file.filename,
        file_path=file_path,
        status="APPROVED" if should_auto_approve(current_user, approvers) else "PENDING",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    if document.status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.DOCUMENT_UPLOADED,
            {
                "company_id": current_user["company_id"],
                "entity_id": document.id,
                "subject_employee_id": employee.id,
                "subject_employee_name": _mobile_employee_name(employee),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
            },
        )

    return mobile_success(
        {
            "id": document.id,
            "status": document.status,
            "file_url": build_document_download_url(document.id) if document.file_path else None,
        },
        _("doc_uploaded", request),
    )


@router.delete("/documents/{document_id}")
def delete_mobile_document(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    document = db.query(EmployeeDocument).join(
        Employee, Employee.id == EmployeeDocument.employee_id
    ).filter(
        Employee.company_id == current_user["company_id"],
        EmployeeDocument.id == document_id,
        EmployeeDocument.employee_id == current_user["user_id"],
    ).first()

    if not document:
        mobile_not_found(_("doc_not_found", request))

    if document.status != "PENDING":
        raise HTTPException(status_code=403, detail=_("delete_own_docs_only", request))

    if document.file_path and os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except OSError:
            pass

    db.delete(document)
    db.commit()
    return mobile_success(message=_("doc_deleted", request))
