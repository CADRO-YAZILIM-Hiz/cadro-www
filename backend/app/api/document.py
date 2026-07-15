from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import re
import shutil
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.permissions import ensure_permission, has_permission
from app.core.approval_routing import resolve_document_approvers, should_auto_approve
from app.core.document_audit import log_document_action
from app.core.dossier_rules import build_dossier_compliance_summary
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.models.document import EmployeeDocument, DocumentActionLog
from app.models.employee import Employee

router = APIRouter()

# --- GÜVENLİK AYARLARI ---
UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mevcut kazanılmış yetenekleri korumak için doküman tiplerini geniş tutuyoruz.
ALLOWED_EXTENSIONS = {"pdf", "jpeg", "jpg", "png", "doc", "docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # Evraklar için 10MB Sınırı


# ==========================================
# 🛡️ YARDIMCI GÜVENLİK FONKSİYONLARI
# ==========================================
def sanitize_filename(filename: str) -> str:
    """Kullanıcının yüklediği dosya adını disk için güvenli hale getirir."""
    base_name = os.path.basename(filename or "document")
    name, ext = os.path.splitext(base_name)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._") or "document"
    safe_ext = re.sub(r"[^A-Za-z0-9.]", "", ext.lower())
    return f"{safe_name}{safe_ext}"


def validate_upload(file: UploadFile, request: Request):
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


def build_document_download_url(document_id: int) -> str:
    return f"/document/{document_id}/download"


def serialize_document(document: EmployeeDocument) -> dict:
    return {
        "id": document.id,
        "employee_id": document.employee_id,
        "category": document.category,
        "document_type": document.document_type,
        "file_name": document.file_name,
        "file_path": build_document_download_url(document.id),
        "download_url": build_document_download_url(document.id),
        "status": document.status,
        "upload_date": document.upload_date.isoformat() if document.upload_date else None,
        "document_number": document.document_number,
        "issued_by": document.issued_by,
        "issue_date": document.issue_date.isoformat() if document.issue_date else None,
        "expiry_date": document.expiry_date.isoformat() if document.expiry_date else None,
        "is_mandatory": bool(document.is_mandatory),
        "notes": document.notes,
    }


# ==========================================
# 📂 1. EVRAK YÜKLEME (UPLOAD)
# ==========================================
@router.post("/upload")
async def upload_document(
    request: Request,
    employee_id: int = Form(...),
    document_type: str = Form(...),
    category: str = Form(None),
    document_number: str = Form(None),
    issued_by: str = Form(None),
    issue_date: str = Form(None),
    valid_until: str = Form(None),
    is_mandatory: str = Form("false"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    is_own_upload = (
        current_user["user_id"] == employee_id
        and has_permission(current_user, "dossier.upload_own")
    )
    can_manage_company = has_permission(current_user, "dossier.manage_company")
    if not is_own_upload and not can_manage_company:
        raise HTTPException(status_code=403, detail=_("upload_own_only", request))

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    ext = validate_upload(file, request)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    original_safe_name = sanitize_filename(file.filename)
    safe_filename = f"doc_{current_user['company_id']}_{employee_id}_{timestamp}_{original_safe_name.rsplit('.', 1)[0]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    approvers = resolve_document_approvers(db, employee.company_id, employee)
    doc_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"

    new_doc = EmployeeDocument(
        employee_id=employee_id,
        category=category or document_type,
        document_type=document_type,
        file_name=file.filename,
        file_path=file_path,
        document_number=(document_number or "").strip() or None,
        issued_by=(issued_by or "").strip() or None,
        issue_date=datetime.strptime(issue_date[:10], "%Y-%m-%d").date() if issue_date else None,
        expiry_date=datetime.strptime(valid_until[:10], "%Y-%m-%d").date() if valid_until else None,
        is_mandatory=1 if str(is_mandatory).lower() in {"1", "true", "yes", "on"} else 0,
        status=doc_status
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    log_document_action(
        db,
        company_id=employee.company_id,
        employee_id=employee.id,
        document_id=new_doc.id,
        actor_employee_id=current_user["user_id"],
        action="UPLOADED",
        new_status=doc_status,
        document_type=document_type,
        file_name=file.filename,
        detail=f"document_type={document_type}",
    )
    db.commit()

    if doc_status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.DOCUMENT_UPLOADED,
            {
                "company_id": employee.company_id,
                "entity_id": new_doc.id,
                "subject_employee_id": employee.id,
                "subject_employee_name": f"{employee.first_name} {employee.last_name}".strip(),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
            },
        )

    return {
        "message": _("doc_uploaded", request),
        "document_id": new_doc.id,
        "status": doc_status
    }


# ==========================================
# 🗂️ 2. PERSONELİN EVRAKLARINI LİSTELEME
# ==========================================
@router.get("/{employee_id}")
def get_employee_documents(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    can_view_company = has_permission(current_user, "dossier.view_company")
    can_view_own = (
        current_user["user_id"] == employee_id
        and has_permission(current_user, "dossier.view_own")
    )
    if not can_view_company and not can_view_own:
        raise HTTPException(status_code=403, detail=_("view_own_docs_only", request))

    documents = (
        db.query(EmployeeDocument)
        .join(Employee, EmployeeDocument.employee_id == Employee.id)
        .filter(
            EmployeeDocument.employee_id == employee_id,
            Employee.company_id == current_user["company_id"]
        )
        .order_by(EmployeeDocument.upload_date.desc())
        .all()
    )

    return [serialize_document(document) for document in documents]


@router.get("/{employee_id}/compliance-summary")
def get_employee_document_compliance_summary(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    can_view_company = has_permission(current_user, "dossier.view_company")
    can_view_own = (
        current_user["user_id"] == employee_id
        and has_permission(current_user, "dossier.view_own")
    )
    if not can_view_company and not can_view_own:
        raise HTTPException(status_code=403, detail=_("view_own_docs_only", request))

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    documents = (
        db.query(EmployeeDocument)
        .filter(EmployeeDocument.employee_id == employee.id)
        .order_by(EmployeeDocument.upload_date.desc())
        .all()
    )

    return build_dossier_compliance_summary(employee, documents, employee.company)


@router.get("/{document_id}/download")
def download_document_file(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    document = (
        db.query(EmployeeDocument)
        .join(Employee, EmployeeDocument.employee_id == Employee.id)
        .filter(
            EmployeeDocument.id == document_id,
            Employee.company_id == current_user["company_id"],
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail=_("doc_not_found", request))

    can_view_company = has_permission(current_user, "dossier.view_company")
    can_view_own = (
        current_user["user_id"] == document.employee_id
        and has_permission(current_user, "dossier.view_own")
    )
    if not can_view_company and not can_view_own:
        raise HTTPException(status_code=403, detail=_("view_own_docs_only", request))

    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail=_("doc_not_found", request))

    return FileResponse(
        document.file_path,
        media_type="application/octet-stream",
        filename=document.file_name,
    )


@router.get("/{document_id}/history")
def get_document_history(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "dossier.view_workspace", request)
    document = (
        db.query(EmployeeDocument)
        .join(Employee, EmployeeDocument.employee_id == Employee.id)
        .filter(
            EmployeeDocument.id == document_id,
            Employee.company_id == current_user["company_id"],
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail=_("doc_not_found", request))

    can_view_company = has_permission(current_user, "dossier.view_company")
    can_view_own = (
        current_user["user_id"] == document.employee_id
        and has_permission(current_user, "dossier.view_own")
    )
    if not can_view_company and not can_view_own:
        raise HTTPException(status_code=403, detail=_("view_own_docs_only", request))

    history_items = (
        db.query(DocumentActionLog)
        .filter(
            DocumentActionLog.company_id == current_user["company_id"],
            DocumentActionLog.document_id == document_id,
        )
        .order_by(DocumentActionLog.created_at.desc(), DocumentActionLog.id.desc())
        .all()
    )

    actor_ids = {item.actor_employee_id for item in history_items if item.actor_employee_id}
    actor_map = {}
    if actor_ids:
        actors = db.query(Employee).filter(Employee.id.in_(actor_ids)).all()
        actor_map = {
            actor.id: {
                "name": f"{actor.first_name} {actor.last_name}".strip(),
                "role": actor.role,
            }
            for actor in actors
        }

    return [
        {
            "id": item.id,
            "action": item.action,
            "previous_status": item.previous_status,
            "new_status": item.new_status,
            "document_type": item.document_type,
            "file_name": item.file_name,
            "detail": item.detail,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "actor_employee_id": item.actor_employee_id,
            "actor_name": actor_map.get(item.actor_employee_id, {}).get("name"),
            "actor_role": actor_map.get(item.actor_employee_id, {}).get("role"),
        }
        for item in history_items
    ]


# ==========================================
# 🗑️ 3. EVRAK SİLME
# ==========================================
@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "dossier.view_workspace", request)
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == document_id).first()

    if not doc:
        raise HTTPException(status_code=404, detail=_("doc_not_found", request))

    employee = db.query(Employee).filter(
        Employee.id == doc.employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()

    if not employee:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    can_manage_company = has_permission(current_user, "dossier.manage_company")
    can_delete_own_pending = (
        current_user["user_id"] == doc.employee_id
        and has_permission(current_user, "dossier.view_own")
        and doc.status == "PENDING"
    )
    if not can_manage_company and not can_delete_own_pending:
        raise HTTPException(status_code=403, detail=_("delete_own_docs_only", request))

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Fiziksel dosya silinemedi: {e}")

    log_document_action(
        db,
        company_id=employee.company_id,
        employee_id=employee.id,
        document_id=doc.id,
        actor_employee_id=current_user["user_id"],
        action="DELETED",
        previous_status=doc.status,
        document_type=doc.document_type,
        file_name=doc.file_name,
        detail="document_deleted",
    )
    db.delete(doc)
    db.commit()
    return {"message": _("doc_deleted", request)}
