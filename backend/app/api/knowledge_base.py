from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.knowledge_audit import log_knowledge_receipt_action, snapshot_knowledge_article
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission, has_permission
from app.models.employee import Department, Employee
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleReceipt, KnowledgeArticleReceiptLog, KnowledgeArticleVersion

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.knowledge"))])

VALID_SCOPES = {"ALL", "ROLE", "DEPARTMENT", "EMPLOYEE"}
VALID_TYPES = {"ARTICLE", "POLICY"}
VALID_STATUS = {"DRAFT", "PUBLISHED", "ARCHIVED"}
VALID_TARGET_ROLES = {"EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPERADMIN"}


class KnowledgeArticlePayload(BaseModel):
    title: str
    summary: Optional[str] = None
    content: str
    category: Optional[str] = None
    article_type: str = "ARTICLE"
    version: str = "1.0"
    status: str = "PUBLISHED"
    require_ack: bool = False
    target_scope: str = "ALL"
    target_role: Optional[str] = None
    target_department_id: Optional[int] = None
    target_employee_id: Optional[int] = None


def _normalize_scope(value: Optional[str]) -> str:
    return (value or "ALL").strip().upper()


def _normalize_type(value: Optional[str]) -> str:
    return (value or "ARTICLE").strip().upper()


def _normalize_status(value: Optional[str]) -> str:
    return (value or "PUBLISHED").strip().upper()


def _normalize_role(value: Optional[str]) -> Optional[str]:
    if value in [None, ""]:
        return None
    return str(value).strip().upper()


def _ensure_manage_access(current_user: dict, request: Request):
    ensure_permission(current_user, "knowledge.manage_company", request)


def _validate_targeting(payload: KnowledgeArticlePayload, db: Session, current_user: dict):
    scope = _normalize_scope(payload.target_scope)
    article_type = _normalize_type(payload.article_type)
    status = _normalize_status(payload.status)
    target_role = _normalize_role(payload.target_role)

    if scope not in VALID_SCOPES:
        raise HTTPException(status_code=400, detail="Geçersiz hedef kapsamı.")
    if article_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="Geçersiz içerik türü.")
    if status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail="Geçersiz yayın durumu.")

    if scope == "ROLE":
        if target_role not in VALID_TARGET_ROLES:
            raise HTTPException(status_code=400, detail="Hedef rol seçilmelidir.")
    elif scope == "DEPARTMENT":
        if not payload.target_department_id:
            raise HTTPException(status_code=400, detail="Hedef departman seçilmelidir.")
        department = db.query(Department).filter(
            Department.id == payload.target_department_id,
            Department.company_id == current_user["company_id"],
        ).first()
        if not department:
            raise HTTPException(status_code=404, detail="Departman bulunamadı.")
    elif scope == "EMPLOYEE":
        if not payload.target_employee_id:
            raise HTTPException(status_code=400, detail="Hedef personel seçilmelidir.")
        employee = db.query(Employee).filter(
            Employee.id == payload.target_employee_id,
            Employee.company_id == current_user["company_id"],
            Employee.status == "ACTIVE",
        ).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Personel bulunamadı.")

    return {
        "scope": scope,
        "article_type": article_type,
        "status": status,
        "target_role": target_role,
    }


def _target_filter_for_user(current_user: dict, employee: Employee):
    return or_(
        KnowledgeArticle.target_scope == "ALL",
        and_(
            KnowledgeArticle.target_scope == "ROLE",
            KnowledgeArticle.target_role == (current_user.get("role") or "EMPLOYEE"),
        ),
        and_(
            KnowledgeArticle.target_scope == "DEPARTMENT",
            KnowledgeArticle.target_department_id == employee.department_id,
        ),
        and_(
            KnowledgeArticle.target_scope == "EMPLOYEE",
            KnowledgeArticle.target_employee_id == employee.id,
        ),
    )


def _eligible_employee_query(db: Session, article: KnowledgeArticle):
    query = db.query(Employee).filter(
        Employee.company_id == article.company_id,
        Employee.status == "ACTIVE",
    )
    if article.target_scope == "ROLE" and article.target_role:
        query = query.filter(Employee.role == article.target_role)
    elif article.target_scope == "DEPARTMENT" and article.target_department_id:
        query = query.filter(Employee.department_id == article.target_department_id)
    elif article.target_scope == "EMPLOYEE" and article.target_employee_id:
        query = query.filter(Employee.id == article.target_employee_id)
    return query


def _receipt_state(article: KnowledgeArticle, employee_id: int):
    receipt = next((item for item in article.receipts if item.employee_id == employee_id), None)
    acknowledged_for_current_version = bool(
        receipt
        and receipt.acknowledged_at
        and receipt.acknowledged_version == article.version
    )
    return {
        "is_read": bool(receipt and receipt.first_read_at),
        "is_acknowledged": acknowledged_for_current_version,
        "needs_reacknowledgement": bool(receipt and receipt.acknowledged_at and receipt.acknowledged_version != article.version),
        "first_read_at": receipt.first_read_at.isoformat() if receipt and receipt.first_read_at else None,
        "last_read_at": receipt.last_read_at.isoformat() if receipt and receipt.last_read_at else None,
        "acknowledged_at": receipt.acknowledged_at.isoformat() if receipt and receipt.acknowledged_at else None,
        "acknowledged_version": receipt.acknowledged_version if receipt else None,
    }


def _scope_label(article: KnowledgeArticle):
    if article.target_scope == "ROLE" and article.target_role:
        return f"ROL: {article.target_role}"
    if article.target_scope == "DEPARTMENT" and article.target_department:
        return f"DEPARTMAN: {article.target_department.name}"
    if article.target_scope == "EMPLOYEE" and article.target_employee:
        return f"PERSONEL: {article.target_employee.first_name} {article.target_employee.last_name}"
    return "TÜM ŞİRKET"


def _serialize_article(article: KnowledgeArticle, current_user: dict, include_stats: bool, db: Session):
    assigned_count = None
    read_count = None
    ack_count = None
    pending_ack_count = None
    if include_stats:
        assigned_count = _eligible_employee_query(db, article).count()
        read_count = len([item for item in article.receipts if item.first_read_at])
        ack_count = len([
            item for item in article.receipts
            if item.acknowledged_at and item.acknowledged_version == article.version
        ])
        pending_ack_count = max(assigned_count - ack_count, 0) if article.require_ack else 0

    payload = {
        "id": article.id,
        "title": article.title,
        "summary": article.summary,
        "content": article.content,
        "category": article.category,
        "article_type": article.article_type,
        "version": article.version,
        "status": article.status,
        "require_ack": article.require_ack,
        "target_scope": article.target_scope,
        "target_role": article.target_role,
        "target_department_id": article.target_department_id,
        "target_department_name": article.target_department.name if article.target_department else None,
        "target_employee_id": article.target_employee_id,
        "target_employee_name": (
            f"{article.target_employee.first_name} {article.target_employee.last_name}"
            if article.target_employee else None
        ),
        "scope_label": _scope_label(article),
        "created_at": article.created_at.isoformat() if article.created_at else None,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "creator_name": (
            f"{article.creator.first_name} {article.creator.last_name}"
            if article.creator else None
        ),
    }
    payload.update(_receipt_state(article, current_user["user_id"]))
    if include_stats:
        payload.update(
            {
                "assigned_count": assigned_count,
                "read_count": read_count,
                "ack_count": ack_count,
                "pending_ack_count": pending_ack_count,
            }
        )
    return payload


def _serialize_version_history(db: Session, article_id: int):
    history_items = (
        db.query(KnowledgeArticleVersion)
        .filter(KnowledgeArticleVersion.article_id == article_id)
        .order_by(KnowledgeArticleVersion.created_at.desc(), KnowledgeArticleVersion.id.desc())
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
            "snapshot_type": item.snapshot_type,
            "version": item.version,
            "status": item.status,
            "title": item.title,
            "summary": item.summary,
            "content": item.content,
            "category": item.category,
            "article_type": item.article_type,
            "target_scope": item.target_scope,
            "target_role": item.target_role,
            "actor_name": actors.get(item.actor_employee_id, "-"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in history_items
    ]


def _serialize_receipt_history(db: Session, article_id: int):
    history_items = (
        db.query(KnowledgeArticleReceiptLog)
        .filter(KnowledgeArticleReceiptLog.article_id == article_id)
        .order_by(KnowledgeArticleReceiptLog.created_at.desc(), KnowledgeArticleReceiptLog.id.desc())
        .all()
    )
    employee_ids = {item.employee_id for item in history_items if item.employee_id}
    employees = {}
    if employee_ids:
        employees = {
            employee.id: f"{employee.first_name} {employee.last_name}".strip()
            for employee in db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        }
    return [
        {
            "id": item.id,
            "action_type": item.action_type,
            "article_version": item.article_version,
            "employee_name": employees.get(item.employee_id, "-"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in history_items
    ]


def _get_article_for_user(article_id: int, db: Session, current_user: dict):
    query = db.query(KnowledgeArticle).options(
        joinedload(KnowledgeArticle.receipts),
        joinedload(KnowledgeArticle.creator),
        joinedload(KnowledgeArticle.target_department),
        joinedload(KnowledgeArticle.target_employee),
    ).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    )
    article = query.first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")

    if has_permission(current_user, "knowledge.manage_company"):
        return article

    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Personel kaydı bulunamadı.")

    if article.status != "PUBLISHED":
        raise HTTPException(status_code=403, detail="Bu içeriğe erişim yetkiniz yok.")

    visible = db.query(KnowledgeArticle.id).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
        KnowledgeArticle.status == "PUBLISHED",
        _target_filter_for_user(current_user, employee),
    ).first()
    if not visible:
        raise HTTPException(status_code=403, detail="Bu içeriğe erişim yetkiniz yok.")

    return article


@router.get("/articles")
def list_articles(
    request: Request,
    article_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(KnowledgeArticle).options(
        joinedload(KnowledgeArticle.receipts),
        joinedload(KnowledgeArticle.creator),
        joinedload(KnowledgeArticle.target_department),
        joinedload(KnowledgeArticle.target_employee),
    ).filter(KnowledgeArticle.company_id == current_user["company_id"])

    if not has_permission(current_user, "knowledge.manage_company"):
        employee = db.query(Employee).filter(
            Employee.id == current_user["user_id"],
            Employee.company_id == current_user["company_id"],
        ).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Personel kaydı bulunamadı.")
        query = query.filter(KnowledgeArticle.status == "PUBLISHED")
        query = query.filter(_target_filter_for_user(current_user, employee))
    elif status:
        normalized_status = _normalize_status(status)
        if normalized_status in VALID_STATUS:
            query = query.filter(KnowledgeArticle.status == normalized_status)

    if article_type:
        normalized_type = _normalize_type(article_type)
        if normalized_type in VALID_TYPES:
            query = query.filter(KnowledgeArticle.article_type == normalized_type)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                KnowledgeArticle.title.ilike(pattern),
                KnowledgeArticle.summary.ilike(pattern),
                KnowledgeArticle.content.ilike(pattern),
                KnowledgeArticle.category.ilike(pattern),
            )
        )

    articles = query.order_by(
        KnowledgeArticle.published_at.desc().nullslast(),
        KnowledgeArticle.created_at.desc(),
    ).all()

    include_stats = has_permission(current_user, "knowledge.manage_company")
    return [_serialize_article(item, current_user, include_stats, db) for item in articles]


@router.post("/articles")
def create_article(
    payload: KnowledgeArticlePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    validated = _validate_targeting(payload, db, current_user)

    article = KnowledgeArticle(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        updated_by=current_user["user_id"],
        title=payload.title.strip(),
        summary=(payload.summary or "").strip() or None,
        content=payload.content.strip(),
        category=(payload.category or "").strip() or None,
        article_type=validated["article_type"],
        version=(payload.version or "1.0").strip() or "1.0",
        status=validated["status"],
        require_ack=bool(payload.require_ack),
        target_scope=validated["scope"],
        target_role=validated["target_role"],
        target_department_id=payload.target_department_id if validated["scope"] == "DEPARTMENT" else None,
        target_employee_id=payload.target_employee_id if validated["scope"] == "EMPLOYEE" else None,
        published_at=datetime.utcnow() if validated["status"] == "PUBLISHED" else None,
    )
    db.add(article)
    db.flush()
    snapshot_knowledge_article(
        db,
        article,
        actor_employee_id=current_user["user_id"],
        snapshot_type="CREATED",
    )
    db.commit()
    db.refresh(article)
    return {"message": "Bilgi bankası içeriği oluşturuldu.", "id": article.id}


@router.put("/articles/{article_id}")
def update_article(
    article_id: int,
    payload: KnowledgeArticlePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")

    validated = _validate_targeting(payload, db, current_user)
    article.title = payload.title.strip()
    article.summary = (payload.summary or "").strip() or None
    article.content = payload.content.strip()
    article.category = (payload.category or "").strip() or None
    article.article_type = validated["article_type"]
    article.version = (payload.version or "1.0").strip() or "1.0"
    article.status = validated["status"]
    article.require_ack = bool(payload.require_ack)
    article.target_scope = validated["scope"]
    article.target_role = validated["target_role"]
    article.target_department_id = payload.target_department_id if validated["scope"] == "DEPARTMENT" else None
    article.target_employee_id = payload.target_employee_id if validated["scope"] == "EMPLOYEE" else None
    article.updated_by = current_user["user_id"]
    if article.status == "PUBLISHED" and not article.published_at:
        article.published_at = datetime.utcnow()
    db.flush()
    snapshot_knowledge_article(
        db,
        article,
        actor_employee_id=current_user["user_id"],
        snapshot_type="UPDATED",
    )
    db.commit()
    return {"message": "Bilgi bankası içeriği güncellendi."}


@router.delete("/articles/{article_id}")
def delete_article(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")
    snapshot_knowledge_article(
        db,
        article,
        actor_employee_id=current_user["user_id"],
        snapshot_type="DELETED",
    )
    db.delete(article)
    db.commit()
    return {"message": "Bilgi bankası içeriği silindi."}


@router.get("/articles/{article_id}/history")
def get_article_history(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")
    return _serialize_version_history(db, article.id)


@router.get("/articles/{article_id}/receipt-history")
def get_article_receipt_history(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")
    return _serialize_receipt_history(db, article.id)


@router.post("/articles/{article_id}/restore/{version_id}")
def restore_article_version(
    article_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.company_id == current_user["company_id"],
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı.")

    version_item = db.query(KnowledgeArticleVersion).filter(
        KnowledgeArticleVersion.id == version_id,
        KnowledgeArticleVersion.article_id == article.id,
        KnowledgeArticleVersion.company_id == current_user["company_id"],
    ).first()
    if not version_item:
        raise HTTPException(status_code=404, detail="Sürüm kaydı bulunamadı.")

    snapshot_knowledge_article(
        db,
        article,
        actor_employee_id=current_user["user_id"],
        snapshot_type="PRE_RESTORE",
    )

    article.title = version_item.title
    article.summary = version_item.summary
    article.content = version_item.content
    article.category = version_item.category
    article.article_type = version_item.article_type
    article.version = version_item.version
    article.status = version_item.status
    article.require_ack = version_item.require_ack
    article.target_scope = version_item.target_scope
    article.target_role = version_item.target_role
    article.target_department_id = version_item.target_department_id
    article.target_employee_id = version_item.target_employee_id
    article.published_at = version_item.published_at or (datetime.utcnow() if version_item.status == "PUBLISHED" else None)
    article.updated_by = current_user["user_id"]

    db.flush()
    snapshot_knowledge_article(
        db,
        article,
        actor_employee_id=current_user["user_id"],
        snapshot_type="RESTORED",
    )
    db.commit()
    return {"message": "Bilgi bankası sürümü geri yüklendi."}


@router.post("/articles/{article_id}/read")
def mark_article_read(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    article = _get_article_for_user(article_id, db, current_user)
    receipt = db.query(KnowledgeArticleReceipt).filter(
        KnowledgeArticleReceipt.article_id == article.id,
        KnowledgeArticleReceipt.employee_id == current_user["user_id"],
    ).first()
    now = datetime.utcnow()
    if not receipt:
        receipt = KnowledgeArticleReceipt(
            article_id=article.id,
            employee_id=current_user["user_id"],
            first_read_at=now,
            last_read_at=now,
        )
        db.add(receipt)
    else:
        if not receipt.first_read_at:
            receipt.first_read_at = now
        receipt.last_read_at = now
    log_knowledge_receipt_action(
        db,
        article_id=article.id,
        company_id=article.company_id,
        employee_id=current_user["user_id"],
        action_type="READ",
        article_version=article.version,
    )
    db.commit()
    return {"message": "İçerik okundu olarak işaretlendi."}


@router.post("/articles/{article_id}/ack")
def acknowledge_article(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    article = _get_article_for_user(article_id, db, current_user)
    now = datetime.utcnow()
    receipt = db.query(KnowledgeArticleReceipt).filter(
        KnowledgeArticleReceipt.article_id == article.id,
        KnowledgeArticleReceipt.employee_id == current_user["user_id"],
    ).first()
    if not receipt:
        receipt = KnowledgeArticleReceipt(
            article_id=article.id,
            employee_id=current_user["user_id"],
            first_read_at=now,
            last_read_at=now,
            acknowledged_at=now,
            acknowledged_version=article.version,
        )
        db.add(receipt)
    else:
        if not receipt.first_read_at:
            receipt.first_read_at = now
        receipt.last_read_at = now
        receipt.acknowledged_at = now
        receipt.acknowledged_version = article.version
    log_knowledge_receipt_action(
        db,
        article_id=article.id,
        company_id=article.company_id,
        employee_id=current_user["user_id"],
        action_type="ACK",
        article_version=article.version,
    )
    db.commit()
    return {"message": "Politika onayı kaydedildi."}
