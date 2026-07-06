import json
import os
import re
import shutil
import uuid
from datetime import date, datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.email import EmailService
from app.core.i18n import _
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission, has_permission
from app.core.request_audit import log_generic_request_action
from app.core.scope import get_team_scoped_employee_ids
from app.models.company import Company
from app.models.employee import Employee
from app.models.generic_request import GenericRequest, GenericRequestActionLog, GenericRequestMessage

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.generic_requests"))])

UPLOAD_DIR = os.path.join("static", "generic_requests")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {"pdf", "jpeg", "jpg", "png", "doc", "docx", "xls", "xlsx", "txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024


REQUEST_TYPE_CONFIG = {
    "IT_ACCESS": {
        "responsible_field": "it_responsible",
        "label_key": "generic_request_type_it_access_label",
        "route_hint_key": "generic_request_type_it_access_hint",
    },
    "HR_DOCUMENT": {
        "responsible_field": "hr_responsible",
        "label_key": "generic_request_type_hr_document_label",
        "route_hint_key": "generic_request_type_hr_document_hint",
    },
    "HEALTH_RECORD_CORRECTION": {
        "responsible_field": "hr_responsible",
        "label_key": "generic_request_type_health_record_correction_label",
        "route_hint_key": "generic_request_type_health_record_correction_hint",
    },
    "ADMIN_SUPPORT": {
        "responsible_field": "admin_responsible",
        "label_key": "generic_request_type_admin_support_label",
        "route_hint_key": "generic_request_type_admin_support_hint",
    },
    "PAYROLL_QUERY": {
        "responsible_field": "payroll_officer_id",
        "label_key": "generic_request_type_payroll_query_label",
        "route_hint_key": "generic_request_type_payroll_query_hint",
    },
    "EQUIPMENT_REQUEST": {
        "responsible_field": "admin_responsible",
        "label_key": "generic_request_type_equipment_request_label",
        "route_hint_key": "generic_request_type_equipment_request_hint",
    },
    "OTHER": {
        "responsible_field": "hr_responsible",
        "label_key": "generic_request_type_other_label",
        "route_hint_key": "generic_request_type_other_hint",
    },
}

PROCESS_STATUSES = {"IN_PROGRESS", "COMPLETED", "REJECTED"}


class GenericRequestCreate(BaseModel):
    request_type: str
    title: str
    description: str
    requested_for_employee_id: Optional[int] = None
    priority: str = "NORMAL"
    needed_by: Optional[date] = None
    form_payload: Optional[dict[str, Any]] = None


class GenericRequestStatusUpdate(BaseModel):
    status: str
    resolution_note: Optional[str] = None


class GenericRequestMessageCreate(BaseModel):
    message: str


def _sanitize_filename(filename: str) -> str:
    base_name = os.path.basename(filename or "request_file")
    name, ext = os.path.splitext(base_name)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._") or "request_file"
    safe_ext = re.sub(r"[^A-Za-z0-9.]", "", ext.lower())
    return f"{safe_name}{safe_ext}"


def _validate_attachment(file: UploadFile, request: Request):
    if not file.filename:
        raise HTTPException(status_code=400, detail=_("generic_request_invalid_file", request))
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=_("generic_request_unsupported_file", request))
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=_("generic_request_file_size_limit", request))
    return ext


def _resolve_assignee(db: Session, company: Company | None, request_type: str) -> Employee | None:
    if not company:
        return None

    config = REQUEST_TYPE_CONFIG.get(request_type, REQUEST_TYPE_CONFIG["OTHER"])
    responsible_id = getattr(company, config["responsible_field"], None)
    if responsible_id:
        employee = db.query(Employee).filter(
            Employee.id == responsible_id,
            Employee.company_id == company.id,
            Employee.status == "ACTIVE",
        ).first()
        if employee:
            return employee

    return db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.role.in_(["ADMIN", "SUPERADMIN"]),
        Employee.status == "ACTIVE",
    ).order_by(Employee.role.desc(), Employee.id.asc()).first()


def _serialize(item: GenericRequest, current_user: dict, request: Request):
    config = REQUEST_TYPE_CONFIG.get(item.request_type, REQUEST_TYPE_CONFIG["OTHER"])
    return {
        "id": item.id,
        "request_type": item.request_type,
        "request_type_label": _(config["label_key"], request),
        "route_hint": _(config["route_hint_key"], request),
        "title": item.title,
        "description": item.description,
        "priority": item.priority,
        "status": item.status,
        "needed_by": item.needed_by.isoformat() if item.needed_by else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "resolution_note": item.resolution_note,
        "form_payload": item.payload_dict(),
        "creator_id": item.created_by,
        "creator_name": f"{item.creator.first_name} {item.creator.last_name}".strip() if item.creator else "-",
        "requested_for_employee_id": item.requested_for_employee_id,
        "requested_for_name": (
            f"{item.requested_for_employee.first_name} {item.requested_for_employee.last_name}".strip()
            if item.requested_for_employee else None
        ),
        "assigned_to": item.assigned_to,
        "assigned_to_name": f"{item.assignee.first_name} {item.assignee.last_name}".strip() if item.assignee else "-",
        "processed_by_name": f"{item.processor.first_name} {item.processor.last_name}".strip() if item.processor else None,
        "can_process": (
            has_permission(current_user, "generic_requests.process_company")
            or item.assigned_to == current_user["user_id"]
        ) and item.status in {"OPEN", "IN_PROGRESS"},
        "can_view": True,
    }


def _serialize_message(msg: GenericRequestMessage):
    sender_name = "-"
    if msg.sender:
        sender_name = f"{msg.sender.first_name} {msg.sender.last_name}".strip()
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_name": sender_name,
        "message": msg.message,
        "file_url": msg.file_url,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def _build_query(db: Session, current_user: dict, request: Request):
    query = db.query(GenericRequest).options(
        joinedload(GenericRequest.creator),
        joinedload(GenericRequest.requested_for_employee),
        joinedload(GenericRequest.assignee),
        joinedload(GenericRequest.processor),
    ).filter(GenericRequest.company_id == current_user["company_id"])

    query_text = request.query_params.get("query")
    request_type = request.query_params.get("request_type")
    employee_id = request.query_params.get("employee_id")
    status = request.query_params.get("status")

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(
            or_(
                GenericRequest.created_by == current_user["user_id"],
                GenericRequest.requested_for_employee_id == current_user["user_id"],
                GenericRequest.assigned_to == current_user["user_id"],
            )
        )
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(
            or_(
                GenericRequest.created_by.in_(employee_ids),
                GenericRequest.requested_for_employee_id.in_(employee_ids),
                GenericRequest.assigned_to == current_user["user_id"],
            )
        )

    if query_text:
        normalized = f"%{query_text.strip()}%"
        query = query.filter(
            or_(
                GenericRequest.title.ilike(normalized),
                GenericRequest.description.ilike(normalized),
                GenericRequest.creator.has(
                    or_(
                        Employee.first_name.ilike(normalized),
                        Employee.last_name.ilike(normalized),
                        Employee.email.ilike(normalized),
                    )
                ),
                GenericRequest.requested_for_employee.has(
                    or_(
                        Employee.first_name.ilike(normalized),
                        Employee.last_name.ilike(normalized),
                        Employee.email.ilike(normalized),
                    )
                ),
            )
        )

    if request_type and request_type != "ALL":
        query = query.filter(GenericRequest.request_type == request_type)
    if employee_id and employee_id != "ALL":
        query = query.filter(
            or_(
                GenericRequest.created_by == int(employee_id),
                GenericRequest.requested_for_employee_id == int(employee_id),
            )
        )
    if status and status != "ALL":
        query = query.filter(GenericRequest.status == status)

    return query


def _can_view(db: Session, item: GenericRequest, current_user: dict) -> bool:
    if has_permission(current_user, "generic_requests.process_company") and current_user["role"] != "MANAGER":
        return True
    if item.assigned_to == current_user["user_id"]:
        return True
    if item.created_by == current_user["user_id"]:
        return True
    if item.requested_for_employee_id == current_user["user_id"]:
        return True
    if current_user["role"] == "MANAGER":
        employee_ids = set(get_team_scoped_employee_ids(db, current_user))
        return (
            item.created_by in employee_ids
            or item.requested_for_employee_id in employee_ids
            or item.assigned_to == current_user["user_id"]
        )
    return False


def _get_item_or_404(db: Session, current_user: dict, request_id: int, request: Request) -> GenericRequest:
    item = db.query(GenericRequest).options(
        joinedload(GenericRequest.creator),
        joinedload(GenericRequest.requested_for_employee),
        joinedload(GenericRequest.assignee),
        joinedload(GenericRequest.processor),
        joinedload(GenericRequest.messages).joinedload(GenericRequestMessage.sender),
    ).filter(
        GenericRequest.id == request_id,
        GenericRequest.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("generic_request_not_found", request))
    if not _can_view(db, item, current_user):
        raise HTTPException(status_code=403, detail=_("generic_request_view_unauthorized", request))
    return item


def _serialize_history(db: Session, company_id: int, request_id: int):
    history_items = (
        db.query(GenericRequestActionLog)
        .filter(
            GenericRequestActionLog.company_id == company_id,
            GenericRequestActionLog.request_id == request_id,
        )
        .order_by(GenericRequestActionLog.created_at.desc(), GenericRequestActionLog.id.desc())
        .all()
    )
    actor_ids = {item.actor_employee_id for item in history_items if item.actor_employee_id}
    actors = {}
    if actor_ids:
        actors = {
            employee.id: f"{employee.first_name} {employee.last_name}".strip()
            for employee in db.query(Employee).filter(Employee.id.in_(actor_ids)).all()
        }

    return [
        {
            "id": item.id,
            "action": item.action,
            "previous_status": item.previous_status,
            "new_status": item.new_status,
            "detail": item.detail,
            "actor_name": actors.get(item.actor_employee_id, "-"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in history_items
    ]


@router.get("/catalog")
def get_request_catalog(request: Request):
    return [
        {
            "code": code,
            "label": _(data["label_key"], request),
            "route_hint": _(data["route_hint_key"], request),
        }
        for code, data in REQUEST_TYPE_CONFIG.items()
    ]


@router.post("/")
def create_generic_request(
    payload: GenericRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    request_type = payload.request_type if payload.request_type in REQUEST_TYPE_CONFIG else "OTHER"
    requested_for_employee_id = payload.requested_for_employee_id or current_user["user_id"]

    if current_user["role"] == "EMPLOYEE" and requested_for_employee_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail=_("generic_request_own_only", request))

    requested_for = db.query(Employee).filter(
        Employee.id == requested_for_employee_id,
        Employee.company_id == current_user["company_id"],
    ).first()
    if not requested_for:
        raise HTTPException(status_code=404, detail=_("generic_request_employee_not_found", request))

    assignee = _resolve_assignee(db, company, request_type)
    item = GenericRequest(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        requested_for_employee_id=requested_for.id,
        assigned_to=assignee.id if assignee else None,
        request_type=request_type,
        priority=(payload.priority or "NORMAL").upper(),
        title=payload.title.strip(),
        description=payload.description.strip(),
        needed_by=payload.needed_by,
        form_payload=json.dumps(payload.form_payload or {}, ensure_ascii=False),
        status="OPEN",
    )
    db.add(item)
    db.flush()
    log_generic_request_action(
        db,
        company_id=item.company_id,
        request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="CREATED",
        new_status="OPEN",
        detail=f"{item.title} talebi oluşturuldu.",
    )
    db.commit()
    db.refresh(item)

    if assignee and assignee.email:
        EmailService.send_operational_email(
            assignee.email,
            _("generic_request_new_email_subject", request),
            f"""
            <h3 style="color:#0ea5e9;">Yeni Talep</h3>
            <p><strong>{item.title}</strong> başlıklı yeni talep şirket süreç kuyruğunuza düştü.</p>
            <p><strong>Talep türü:</strong> {_(REQUEST_TYPE_CONFIG[request_type]['label_key'], request)}</p>
            <p><strong>Talep edilen personel:</strong> {requested_for.first_name} {requested_for.last_name}</p>
            """,
        )

    return {"message": _("generic_request_created_success", request)}


@router.get("/")
def list_generic_requests(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    items = _build_query(db, current_user, request).order_by(
        GenericRequest.created_at.desc(),
        GenericRequest.id.desc(),
    ).all()
    return [_serialize(item, current_user, request) for item in items]


@router.get("/summary-metrics")
def generic_request_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    base_query = _build_query(db, current_user, request)

    def count(status: str):
        return base_query.filter(GenericRequest.status == status).count()

    return {
        "open": count("OPEN"),
        "in_progress": count("IN_PROGRESS"),
        "completed": count("COMPLETED"),
        "rejected": count("REJECTED"),
    }


@router.get("/{request_id}")
def get_generic_request_detail(
    request: Request,
    request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    item = _get_item_or_404(db, current_user, request_id, request)
    detail = _serialize(item, current_user, request)
    detail["messages"] = [_serialize_message(msg) for msg in sorted(item.messages, key=lambda m: m.created_at or datetime.min)]
    detail["history"] = _serialize_history(db, current_user["company_id"], item.id)
    return detail


@router.post("/{request_id}/messages")
def add_generic_request_message(
    request_id: int,
    payload: GenericRequestMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    item = _get_item_or_404(db, current_user, request_id, request)
    if item.status in {"COMPLETED", "REJECTED"} and current_user["role"] == "EMPLOYEE":
        raise HTTPException(status_code=400, detail=_("generic_request_closed_message_forbidden", request))
    message = GenericRequestMessage(
        request_id=item.id,
        sender_id=current_user["user_id"],
        message=payload.message.strip(),
    )
    db.add(message)
    log_generic_request_action(
        db,
        company_id=item.company_id,
        request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="MESSAGE_ADDED",
        previous_status=item.status,
        new_status=item.status,
        detail=payload.message.strip()[:240],
    )
    db.commit()
    db.refresh(message)
    return _serialize_message(message)


@router.post("/{request_id}/messages/with-file")
def add_generic_request_message_with_file(
    request_id: int,
    request: Request,
    message: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    item = _get_item_or_404(db, current_user, request_id, request)
    if item.status in {"COMPLETED", "REJECTED"} and current_user["role"] == "EMPLOYEE":
        raise HTTPException(status_code=400, detail=_("generic_request_closed_message_forbidden", request))
    _validate_attachment(file, request)
    safe_filename = _sanitize_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    record = GenericRequestMessage(
        request_id=item.id,
        sender_id=current_user["user_id"],
        message=(message or _("generic_request_file_attached_default", request)).strip(),
        file_url=f"/static/generic_requests/{unique_name}",
    )
    db.add(record)
    log_generic_request_action(
        db,
        company_id=item.company_id,
        request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="ATTACHMENT_ADDED",
        previous_status=item.status,
        new_status=item.status,
        detail=file.filename,
    )
    db.commit()
    db.refresh(record)
    return _serialize_message(record)


@router.put("/{request_id}/status")
def update_generic_request_status(
    request_id: int,
    payload: GenericRequestStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    item = db.query(GenericRequest).options(
        joinedload(GenericRequest.creator),
        joinedload(GenericRequest.requested_for_employee),
    ).filter(
        GenericRequest.id == request_id,
        GenericRequest.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("generic_request_not_found", request))

    if not has_permission(current_user, "generic_requests.process_company") and item.assigned_to != current_user["user_id"]:
        raise HTTPException(status_code=403, detail=_("generic_request_process_unauthorized", request))

    status = (payload.status or "").upper()
    if status not in PROCESS_STATUSES:
        raise HTTPException(status_code=400, detail=_("invalid_status", request))

    previous_status = item.status
    item.status = status
    item.resolution_note = payload.resolution_note
    item.processed_by = current_user["user_id"]
    log_generic_request_action(
        db,
        company_id=item.company_id,
        request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="STATUS_UPDATED",
        previous_status=previous_status,
        new_status=item.status,
        detail=payload.resolution_note or f"Talep {item.status} durumuna alındı.",
    )
    db.commit()

    recipient = item.creator or item.requested_for_employee
    if recipient and recipient.email:
        EmailService.send_operational_email(
            recipient.email,
            _("generic_request_status_email_subject", request),
            f"""
            <h3 style="color:#0ea5e9;">Talep Güncellendi</h3>
            <p><strong>{item.title}</strong> başlıklı talebiniz <strong>{status}</strong> durumuna geçti.</p>
            <p>{payload.resolution_note or ''}</p>
            """,
        )

    return {"message": _("generic_request_status_updated", request).format(status=status)}


@router.get("/{request_id}/history")
def get_generic_request_history(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "generic_requests.view_workspace", request)
    item = _get_item_or_404(db, current_user, request_id, request)
    return _serialize_history(db, current_user["company_id"], item.id)
