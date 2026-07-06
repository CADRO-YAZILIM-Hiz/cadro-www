from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission
from app.models.asset_expense import PurchaseRequest
from app.models.attendance import Attendance
from app.models.document import EmployeeDocument
from app.models.employee import Employee
from app.models.generic_request import GenericRequest
from app.models.helpdesk import Ticket
from app.models.kpi import KpiMetric
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleReceipt
from app.models.leave import LeaveRequest

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.kpi"))])

class KpiMetricCreate(BaseModel):
    title: str
    category: str
    unit: str = "COUNT"
    value: float
    target_value: Optional[float] = None
    metric_date: date
    source_type: str = "MANUAL"
    note: Optional[str] = None


class KpiMetricUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    value: Optional[float] = None
    target_value: Optional[float] = None
    metric_date: Optional[date] = None
    source_type: Optional[str] = None
    note: Optional[str] = None


def _ensure_view_access(current_user: dict, request: Request):
    ensure_permission(current_user, "kpi.view_company", request)


def _ensure_manage_access(current_user: dict, request: Request):
    ensure_permission(current_user, "kpi.manage_company", request)


def _serialize_metric(item: KpiMetric):
    progress_ratio = None
    if item.target_value and float(item.target_value or 0) != 0:
        progress_ratio = round((float(item.value or 0) / float(item.target_value or 1)) * 100, 2)

    return {
        "id": item.id,
        "title": item.title,
        "category": item.category,
        "unit": item.unit,
        "value": float(item.value or 0),
        "target_value": float(item.target_value) if item.target_value is not None else None,
        "metric_date": item.metric_date.isoformat() if item.metric_date else None,
        "source_type": item.source_type,
        "note": item.note,
        "progress_ratio": progress_ratio,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "creator_name": f"{item.creator.first_name} {item.creator.last_name}".strip() if item.creator else "-",
    }


def _get_filtered_query(db: Session, current_user: dict, request: Request):
    query = db.query(KpiMetric).options(joinedload(KpiMetric.creator)).filter(
        KpiMetric.company_id == current_user["company_id"]
    )
    category = request.query_params.get("category")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    query_text = request.query_params.get("query")

    if category and category != "ALL":
        query = query.filter(KpiMetric.category == category)
    if start_date:
        query = query.filter(KpiMetric.metric_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(KpiMetric.metric_date <= date.fromisoformat(end_date))
    if query_text:
        normalized = f"%{query_text.strip()}%"
        query = query.filter(KpiMetric.title.ilike(normalized))
    return query


def _sum_decimal(items, attr):
    total = Decimal("0")
    for item in items:
        total += Decimal(str(getattr(item, attr) or 0))
    return float(total)


@router.get("/catalog")
def get_kpi_catalog():
    return {
        "categories": [
            "HEADCOUNT",
            "RECRUITMENT",
            "PAYROLL",
            "ABSENCE",
            "TRAINING",
            "PERFORMANCE",
            "FINANCE",
            "OTHER",
        ],
        "units": [
            "COUNT",
            "PERCENT",
            "CURRENCY",
            "DAY",
            "HOUR",
        ],
        "sources": [
            "MANUAL",
            "SYSTEM",
        ],
    }


@router.get("/")
def list_kpi_metrics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_view_access(current_user, request)
    items = _get_filtered_query(db, current_user, request).order_by(
        KpiMetric.metric_date.desc(),
        KpiMetric.id.desc(),
    ).all()
    return [_serialize_metric(item) for item in items]


@router.get("/summary")
def kpi_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_view_access(current_user, request)
    today = date.today()
    start_date_str = request.query_params.get("start_date")
    end_date_str = request.query_params.get("end_date")
    start_date = date.fromisoformat(start_date_str) if start_date_str else today.replace(day=1)
    end_date = date.fromisoformat(end_date_str) if end_date_str else today
    query = _get_filtered_query(db, current_user, request)
    current_items = query.all()

    range_days = max((end_date - start_date).days + 1, 1)
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=range_days - 1)

    previous_query = db.query(KpiMetric).options(joinedload(KpiMetric.creator)).filter(
        KpiMetric.company_id == current_user["company_id"],
        KpiMetric.metric_date >= previous_start,
        KpiMetric.metric_date <= previous_end,
    )
    category = request.query_params.get("category")
    query_text = request.query_params.get("query")
    if category and category != "ALL":
        previous_query = previous_query.filter(KpiMetric.category == category)
    if query_text:
        normalized = f"%{query_text.strip()}%"
        previous_query = previous_query.filter(KpiMetric.title.ilike(normalized))
    previous_items = previous_query.all()

    by_category = {}
    for item in current_items:
        by_category.setdefault(item.category, {"count": 0, "total_value": 0.0, "target_total": 0.0})
        by_category[item.category]["count"] += 1
        by_category[item.category]["total_value"] += float(item.value or 0)
        by_category[item.category]["target_total"] += float(item.target_value or 0)

    current_total = _sum_decimal(current_items, "value")
    previous_total = _sum_decimal(previous_items, "value")
    delta_value = current_total - previous_total
    active_employees = db.query(Employee).filter(
        Employee.company_id == current_user["company_id"],
        Employee.status == "ACTIVE",
    ).count()
    approved_leave_today = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= today,
        LeaveRequest.end_date >= today,
    ).count()
    absent_today = db.query(Attendance).filter(
        Attendance.company_id == current_user["company_id"],
        Attendance.date == today,
        Attendance.status == "ABSENT",
    ).count()

    absence_rate_today = round((absent_today / active_employees) * 100, 2) if active_employees else 0
    leave_coverage_rate_today = round((approved_leave_today / active_employees) * 100, 2) if active_employees else 0
    exited_in_range = db.query(Employee).filter(
        Employee.company_id == current_user["company_id"],
        Employee.exit_date.isnot(None),
        Employee.exit_date >= start_date,
        Employee.exit_date <= end_date,
    ).count()
    headcount_basis = max(active_employees + exited_in_range, 1)
    turnover_rate = round((exited_in_range / headcount_basis) * 100, 2) if headcount_basis else 0

    approved_leave_requests_in_range = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.status == "APPROVED",
        LeaveRequest.end_date >= start_date,
        LeaveRequest.start_date <= end_date,
    ).all()
    approved_leave_days_in_range = 0
    for leave in approved_leave_requests_in_range:
        overlap_start = max(leave.start_date, start_date)
        overlap_end = min(leave.end_date, end_date)
        approved_leave_days_in_range += max((overlap_end - overlap_start).days + 1, 0)
    workday_capacity = max(active_employees * max(range_days, 1), 1)
    leave_usage_rate = round((approved_leave_days_in_range / workday_capacity) * 100, 2) if workday_capacity else 0

    system_metrics = {
        "active_employees": active_employees,
        "approved_leave_today": approved_leave_today,
        "absent_today": absent_today,
        "absence_rate_today": absence_rate_today,
        "leave_coverage_rate_today": leave_coverage_rate_today,
        "turnover_rate": turnover_rate,
        "leave_usage_rate": leave_usage_rate,
        "open_request_queue": (
            db.query(PurchaseRequest).filter(
                PurchaseRequest.company_id == current_user["company_id"],
                PurchaseRequest.status == "PENDING",
            ).count()
            + db.query(GenericRequest).filter(
                GenericRequest.company_id == current_user["company_id"],
                GenericRequest.status.in_(["OPEN", "IN_PROGRESS"]),
            ).count()
            + db.query(Ticket).filter(
                Ticket.company_id == current_user["company_id"],
                or_(Ticket.status == "AÇIK", Ticket.status == "İŞLEMDE"),
            ).count()
        ),
        "pending_policy_acknowledgements": db.query(KnowledgeArticleReceipt).join(
            KnowledgeArticle,
            KnowledgeArticleReceipt.article_id == KnowledgeArticle.id,
        ).filter(
            KnowledgeArticle.company_id == current_user["company_id"],
            KnowledgeArticle.status == "PUBLISHED",
            KnowledgeArticle.require_ack.is_(True),
            or_(
                KnowledgeArticleReceipt.acknowledged_at.is_(None),
                KnowledgeArticleReceipt.acknowledged_version != KnowledgeArticle.version,
            ),
        ).count(),
        "expiring_documents_30d": db.query(EmployeeDocument).join(
            Employee,
            EmployeeDocument.employee_id == Employee.id,
        ).filter(
            Employee.company_id == current_user["company_id"],
            Employee.status == "ACTIVE",
            EmployeeDocument.status == "APPROVED",
            EmployeeDocument.expiry_date.isnot(None),
            EmployeeDocument.expiry_date >= today,
            EmployeeDocument.expiry_date <= today + timedelta(days=30),
        ).count(),
    }

    return {
        "current_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_metrics": len(current_items),
            "total_value": current_total,
        },
        "previous_range": {
            "start_date": previous_start.isoformat(),
            "end_date": previous_end.isoformat(),
            "total_metrics": len(previous_items),
            "total_value": previous_total,
        },
        "delta_value": delta_value,
        "categories": by_category,
        "system_metrics": system_metrics,
    }


@router.post("/")
def create_kpi_metric(
    payload: KpiMetricCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    item = KpiMetric(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        title=payload.title.strip(),
        category=(payload.category or "OTHER").upper(),
        unit=(payload.unit or "COUNT").upper(),
        value=Decimal(str(payload.value or 0)),
        target_value=Decimal(str(payload.target_value)) if payload.target_value is not None else None,
        metric_date=payload.metric_date,
        source_type=(payload.source_type or "MANUAL").upper(),
        note=payload.note,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": _("kpi_metric_created_success", request), "item": _serialize_metric(item)}


@router.put("/{metric_id}")
def update_kpi_metric(
    metric_id: int,
    payload: KpiMetricUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    item = db.query(KpiMetric).filter(
        KpiMetric.id == metric_id,
        KpiMetric.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("kpi_metric_not_found", request))

    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.category is not None:
        item.category = payload.category.upper()
    if payload.unit is not None:
        item.unit = payload.unit.upper()
    if payload.value is not None:
        item.value = Decimal(str(payload.value))
    if payload.target_value is not None:
        item.target_value = Decimal(str(payload.target_value))
    if payload.metric_date is not None:
        item.metric_date = payload.metric_date
    if payload.source_type is not None:
        item.source_type = payload.source_type.upper()
    if payload.note is not None:
        item.note = payload.note
    db.commit()
    db.refresh(item)
    return {"message": _("kpi_metric_updated_success", request), "item": _serialize_metric(item)}


@router.delete("/{metric_id}")
def delete_kpi_metric(
    metric_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_manage_access(current_user, request)
    item = db.query(KpiMetric).filter(
        KpiMetric.id == metric_id,
        KpiMetric.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("kpi_metric_not_found", request))
    db.delete(item)
    db.commit()
    return {"message": _("kpi_metric_deleted_success", request)}
