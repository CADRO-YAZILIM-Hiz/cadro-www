import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.company import Company
from app.models.employee import Employee

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SUPPORT_MESSAGES_PATH = BACKEND_ROOT / "support_messages.json"
SUPPORT_UPLOADS_DIR = BACKEND_ROOT / "uploads" / "support"
MAX_ATTACHMENT_COUNT = 5
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024
REQUESTER_ROLES = {"ADMIN", "SUPERADMIN"}
BROADCAST_AUDIENCE_ROLES = {"ADMIN", "SUPERADMIN"}
STATUS_VALUES = {"PENDING", "IN_PROGRESS", "RESOLVED"}
RECORD_TYPE_SUPPORT = "SUPPORT_REQUEST"
RECORD_TYPE_BROADCAST = "BROADCAST"
SUPPORT_CATEGORY_SUBSCRIPTION_CANCELLATION = "Abonelik İptal Talebi"


class SupportStatusUpdate(BaseModel):
    status: str
    owner_note: str | None = None


def _ensure_storage():
    SUPPORT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not SUPPORT_MESSAGES_PATH.exists():
        SUPPORT_MESSAGES_PATH.write_text("[]", encoding="utf-8")


def _load_records() -> list[dict]:
    _ensure_storage()
    try:
        payload = json.loads(SUPPORT_MESSAGES_PATH.read_text(encoding="utf-8"))
        return payload if isinstance(payload, list) else []
    except Exception:
        return []


def _save_records(records: list[dict]) -> None:
    _ensure_storage()
    SUPPORT_MESSAGES_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _serialize_attachments(record: dict) -> list[dict]:
    return [
        {
            "filename": item.get("filename"),
            "content_type": item.get("content_type"),
            "size_bytes": item.get("size_bytes"),
            "url": item.get("url"),
        }
        for item in (record.get("attachments") or [])
    ]


def _normalize_read_receipts(record: dict) -> list[dict]:
    receipts = record.get("read_receipts")
    if isinstance(receipts, list):
        return receipts
    legacy_ids = record.get("read_by_user_ids") or []
    return [{"user_id": user_id, "read_at": None} for user_id in legacy_ids]


def _get_read_user_ids(record: dict) -> set[int]:
    return {
        int(receipt.get("user_id"))
        for receipt in _normalize_read_receipts(record)
        if receipt.get("user_id") is not None
    }


async def _store_attachments(record_id: str, files: List[UploadFile]) -> list[dict]:
    _ensure_storage()
    total_size = 0
    attachment_rows = []
    message_dir = SUPPORT_UPLOADS_DIR / record_id
    message_dir.mkdir(parents=True, exist_ok=True)

    if len(files or []) > MAX_ATTACHMENT_COUNT:
        raise HTTPException(status_code=400, detail=f"En fazla {MAX_ATTACHMENT_COUNT} dosya ekleyebilirsiniz.")

    for upload in files or []:
        content = await upload.read()
        file_size = len(content)
        total_size += file_size

        if file_size > MAX_ATTACHMENT_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"{upload.filename} dosyasi 10 MB sinirini asiyor.")
        if total_size > MAX_TOTAL_ATTACHMENT_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Toplam ek boyutu 20 MB sinirini asiyor.")

        safe_name = f"{uuid.uuid4().hex}_{upload.filename or 'attachment'}"
        target_path = message_dir / safe_name
        target_path.write_bytes(content)
        attachment_rows.append(
            {
                "filename": upload.filename or "attachment",
                "content_type": upload.content_type or "application/octet-stream",
                "size_bytes": file_size,
                "path": str(target_path),
                "url": f"/uploads/support/{record_id}/{safe_name}",
            }
        )

    return attachment_rows


def _serialize_support_record(record: dict) -> dict:
    return {
        **record,
        "attachments": _serialize_attachments(record),
    }


def _get_broadcast_recipients(db: Session) -> list[dict]:
    recipients = (
        db.query(Employee, Company)
        .join(Company, Company.id == Employee.company_id)
        .filter(Employee.role.in_(tuple(BROADCAST_AUDIENCE_ROLES)))
        .filter(Employee.status == "ACTIVE")
        .all()
    )
    return [
        {
            "user_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
            "role": employee.role,
            "company_id": company.id,
            "company_name": company.name,
            "email": employee.email,
        }
        for employee, company in recipients
    ]


def _serialize_broadcast_record(
    record: dict,
    current_user_id: int | None = None,
    recipients: list[dict] | None = None,
) -> dict:
    read_receipts = _normalize_read_receipts(record)
    read_by_ids = _get_read_user_ids(record)
    recipients = recipients or []
    enriched_receipts = []
    recipient_by_id = {item["user_id"]: item for item in recipients}

    for receipt in read_receipts:
      recipient = recipient_by_id.get(receipt.get("user_id"), {})
      enriched_receipts.append(
          {
              "user_id": receipt.get("user_id"),
              "employee_name": receipt.get("employee_name") or recipient.get("employee_name"),
              "role": receipt.get("role") or recipient.get("role"),
              "company_id": receipt.get("company_id") or recipient.get("company_id"),
              "company_name": receipt.get("company_name") or recipient.get("company_name"),
              "email": receipt.get("email") or recipient.get("email"),
              "read_at": receipt.get("read_at"),
          }
      )

    pending_recipients = [
        item
        for item in recipients
        if item.get("user_id") not in read_by_ids
    ]

    return {
        **record,
        "attachments": _serialize_attachments(record),
        "is_read": current_user_id in read_by_ids if current_user_id is not None else False,
        "read_count": len(enriched_receipts),
        "pending_count": len(pending_recipients),
        "read_receipts": enriched_receipts,
        "pending_recipients": pending_recipients,
    }


def _require_owner(current_user: dict) -> None:
    if current_user.get("role") != "OWNER":
        raise HTTPException(status_code=403, detail="Bu islem yalnizca owner icindir.")


def _require_requester_role(current_user: dict) -> None:
    if current_user.get("role") not in REQUESTER_ROLES:
        raise HTTPException(status_code=403, detail="Bu alan yalnizca admin ve superadmin icin aciktir.")


def _require_superadmin(current_user: dict) -> None:
    if current_user.get("role") != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Bu islem yalnizca superadmin icin aciktir.")


@router.post("/contact")
async def contact_support(
    request: Request,
    category: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_requester_role(current_user)

    employee = db.query(Employee).filter(Employee.id == current_user["user_id"]).first()
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first() if current_user.get("company_id") else None

    clean_subject = (subject or "").strip()
    clean_message = (message or "").strip()
    clean_category = (category or "").strip()

    if not clean_subject:
        raise HTTPException(status_code=400, detail="Konu alani bos birakilamaz.")
    if not clean_message:
        raise HTTPException(status_code=400, detail="Mesaj alani bos birakilamaz.")

    record_id = str(uuid.uuid4())
    attachments = await _store_attachments(record_id, files)

    full_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() or current_user.get("email") or "Bilinmeyen Kullanici"
    now = datetime.utcnow().isoformat()
    record = {
        "id": record_id,
        "type": RECORD_TYPE_SUPPORT,
        "company_id": current_user.get("company_id"),
        "company_name": getattr(company, "name", None) or "Bilinmeyen Sirket",
        "requester_employee_id": current_user.get("user_id"),
        "requester_name": full_name,
        "requester_email": getattr(employee, "email", None) or current_user.get("email"),
        "requester_role": current_user.get("role"),
        "category": clean_category,
        "subject": clean_subject,
        "message": clean_message,
        "status": "PENDING",
        "owner_note": "",
        "created_at": now,
        "updated_at": now,
        "attachments": attachments,
    }

    records = _load_records()
    records.insert(0, record)
    _save_records(records)
    return {"message": "Destek kaydi olusturuldu.", "item": _serialize_support_record(record)}


@router.post("/subscription-cancellation")
async def request_subscription_cancellation(
    request: Request,
    message: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_superadmin(current_user)

    employee = db.query(Employee).filter(Employee.id == current_user["user_id"]).first()
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first() if current_user.get("company_id") else None

    clean_message = (message or "").strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Iptal talebi icin aciklama alani bos birakilamaz.")

    company_name = getattr(company, "name", None) or "Bilinmeyen Sirket"
    clean_subject = f"Abonelik iptal talebi - {company_name}"

    record_id = str(uuid.uuid4())
    attachments = await _store_attachments(record_id, files)
    full_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() or current_user.get("email") or "Bilinmeyen Kullanici"
    now = datetime.utcnow().isoformat()
    record = {
        "id": record_id,
        "type": RECORD_TYPE_SUPPORT,
        "company_id": current_user.get("company_id"),
        "company_name": company_name,
        "requester_employee_id": current_user.get("user_id"),
        "requester_name": full_name,
        "requester_email": getattr(employee, "email", None) or current_user.get("email"),
        "requester_role": current_user.get("role"),
        "category": SUPPORT_CATEGORY_SUBSCRIPTION_CANCELLATION,
        "subject": clean_subject,
        "message": clean_message,
        "status": "PENDING",
        "owner_note": "",
        "created_at": now,
        "updated_at": now,
        "attachments": attachments,
        "requires_owner_approval": True,
        "request_kind": "SUBSCRIPTION_CANCELLATION",
    }

    records = _load_records()
    records.insert(0, record)
    _save_records(records)
    return {"message": "Abonelik iptal talebi olusturuldu.", "item": _serialize_support_record(record)}


@router.get("/my")
def get_my_support_messages(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _require_requester_role(current_user)
    return [
        _serialize_support_record(item)
        for item in _load_records()
        if item.get("type") == RECORD_TYPE_SUPPORT and item.get("requester_employee_id") == current_user.get("user_id")
    ]


@router.get("/inbox")
def get_owner_inbox(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _require_owner(current_user)
    return [
        _serialize_support_record(item)
        for item in _load_records()
        if item.get("type") == RECORD_TYPE_SUPPORT
    ]


@router.put("/{message_id}/status")
def update_support_status(
    message_id: str,
    payload: SupportStatusUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _require_owner(current_user)
    next_status = str(payload.status or "").upper().strip()
    if next_status not in STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Gecersiz destek durumu.")

    records = _load_records()
    target_index = next(
        (
            index
            for index, item in enumerate(records)
            if item.get("id") == message_id and item.get("type") == RECORD_TYPE_SUPPORT
        ),
        None,
    )
    if target_index is None:
        raise HTTPException(status_code=404, detail="Destek kaydi bulunamadi.")

    records[target_index]["status"] = next_status
    records[target_index]["owner_note"] = (payload.owner_note or "").strip()
    records[target_index]["updated_at"] = datetime.utcnow().isoformat()
    _save_records(records)
    return _serialize_support_record(records[target_index])


@router.post("/broadcast")
async def create_broadcast(
    request: Request,
    subject: str = Form(...),
    message: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user),
):
    _require_owner(current_user)

    clean_subject = (subject or "").strip()
    clean_message = (message or "").strip()

    if not clean_subject:
        raise HTTPException(status_code=400, detail="Konu alani bos birakilamaz.")
    if not clean_message:
        raise HTTPException(status_code=400, detail="Mesaj alani bos birakilamaz.")

    record_id = str(uuid.uuid4())
    attachments = await _store_attachments(record_id, files)
    now = datetime.utcnow().isoformat()
    record = {
        "id": record_id,
        "type": RECORD_TYPE_BROADCAST,
        "subject": clean_subject,
        "message": clean_message,
        "audience_roles": sorted(BROADCAST_AUDIENCE_ROLES),
        "created_by_role": current_user.get("role"),
        "created_by_name": current_user.get("email") or "Owner",
        "created_at": now,
        "updated_at": now,
        "attachments": attachments,
        "read_receipts": [],
    }

    records = _load_records()
    records.insert(0, record)
    _save_records(records)
    return {"message": "Yayin mesaji olusturuldu.", "item": _serialize_broadcast_record(record)}


@router.get("/broadcasts/owner")
def get_owner_broadcasts(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_owner(current_user)
    recipients = _get_broadcast_recipients(db)
    return [
        _serialize_broadcast_record(item, recipients=recipients)
        for item in _load_records()
        if item.get("type") == RECORD_TYPE_BROADCAST
    ]


@router.get("/broadcasts")
def get_broadcasts_for_current_user(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _require_requester_role(current_user)
    role = current_user.get("role")
    return [
        _serialize_broadcast_record(item, current_user.get("user_id"))
        for item in _load_records()
        if item.get("type") == RECORD_TYPE_BROADCAST and role in set(item.get("audience_roles") or [])
    ]


@router.get("/broadcasts/unread-count")
def get_broadcast_unread_count(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _require_requester_role(current_user)
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    unread_count = 0
    for item in _load_records():
        if item.get("type") != RECORD_TYPE_BROADCAST:
            continue
        if role not in set(item.get("audience_roles") or []):
            continue
        if user_id not in _get_read_user_ids(item):
            unread_count += 1
    return {"count": unread_count}


@router.post("/broadcasts/{broadcast_id}/read")
def mark_broadcast_as_read(
    broadcast_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_requester_role(current_user)
    user_id = current_user.get("user_id")
    role = current_user.get("role")
    records = _load_records()
    target_index = next(
        (
            index
            for index, item in enumerate(records)
            if item.get("id") == broadcast_id and item.get("type") == RECORD_TYPE_BROADCAST
        ),
        None,
    )
    if target_index is None:
        raise HTTPException(status_code=404, detail="Yayin mesaji bulunamadi.")
    if role not in set(records[target_index].get("audience_roles") or []):
        raise HTTPException(status_code=403, detail="Bu duyuruyu goruntuleme yetkiniz yok.")

    employee = db.query(Employee).filter(Employee.id == user_id).first()
    company = db.query(Company).filter(Company.id == current_user.get("company_id")).first() if current_user.get("company_id") else None
    receipts = _normalize_read_receipts(records[target_index])
    existing_receipt = next((item for item in receipts if item.get("user_id") == user_id), None)
    if existing_receipt:
        existing_receipt["read_at"] = existing_receipt.get("read_at") or datetime.utcnow().isoformat()
        existing_receipt["employee_name"] = existing_receipt.get("employee_name") or (f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() if employee else None)
        existing_receipt["role"] = existing_receipt.get("role") or current_user.get("role")
        existing_receipt["company_id"] = existing_receipt.get("company_id") or current_user.get("company_id")
        existing_receipt["company_name"] = existing_receipt.get("company_name") or getattr(company, "name", None)
        existing_receipt["email"] = existing_receipt.get("email") or getattr(employee, "email", None)
    else:
        receipts.append(
            {
                "user_id": user_id,
                "employee_name": f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() if employee else None,
                "role": current_user.get("role"),
                "company_id": current_user.get("company_id"),
                "company_name": getattr(company, "name", None),
                "email": getattr(employee, "email", None) if employee else None,
                "read_at": datetime.utcnow().isoformat(),
            }
        )
    records[target_index]["read_receipts"] = receipts
    records[target_index]["updated_at"] = datetime.utcnow().isoformat()
    _save_records(records)
    return _serialize_broadcast_record(records[target_index], user_id)
