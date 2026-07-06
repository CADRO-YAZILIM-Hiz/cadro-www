from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.email import EmailService
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission, has_permission
from app.core.request_audit import log_purchase_request_action
from app.core.scope import get_team_scoped_employee_ids
from app.models.asset_expense import Expense, PurchaseRequest, PurchaseRequestActionLog
from app.models.company import Company
from app.models.employee import Employee

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.purchase_requests"))])


class PurchaseRequestCreate(BaseModel):
    employee_id: int
    item_name: str
    item_url: Optional[str] = None
    vendor_name: Optional[str] = None
    quantity: int = 1
    unit_price: float
    currency: str = "TRY"
    justification: Optional[str] = None
    needed_by: Optional[date] = None


class PurchaseRequestStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


def _resolve_finance_approver(db: Session, company_id: int) -> Employee | None:
    company = db.query(Company).filter(Company.id == company_id).first()
    if company and company.payroll_officer_id:
        return db.query(Employee).filter(
            Employee.id == company.payroll_officer_id,
            Employee.company_id == company_id,
        ).first()

    return db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.role.in_(["ADMIN", "SUPERADMIN"]),
        Employee.status == "ACTIVE",
    ).order_by(Employee.role.desc(), Employee.id.asc()).first()


def _can_user_approve_purchase(item: PurchaseRequest, current_user: dict) -> bool:
    if has_permission(current_user, "purchase_requests.manage_company"):
        return True
    if item.finance_approver_id and item.finance_approver_id == current_user["user_id"]:
        return True
    return False


def _can_user_convert_purchase(item: PurchaseRequest, current_user: dict) -> bool:
    return has_permission(current_user, "purchase_requests.convert_company") or (
        item.finance_approver_id and item.finance_approver_id == current_user["user_id"]
    )


def _build_query(db: Session, current_user: dict, query_text: Optional[str] = None, employee_id: Optional[int] = None):
    query = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.employee),
        joinedload(PurchaseRequest.finance_approver),
    ).filter(PurchaseRequest.company_id == current_user["company_id"])

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(PurchaseRequest.employee_id == current_user["user_id"])
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(PurchaseRequest.employee_id.in_(employee_ids))

    if query_text:
        normalized = f"%{query_text.strip()}%"
        query = query.filter(
            or_(
                PurchaseRequest.item_name.ilike(normalized),
                PurchaseRequest.vendor_name.ilike(normalized),
                PurchaseRequest.justification.ilike(normalized),
                PurchaseRequest.employee.has(
                    or_(
                        Employee.first_name.ilike(normalized),
                        Employee.last_name.ilike(normalized),
                        Employee.email.ilike(normalized),
                    )
                ),
            )
        )

    if employee_id:
        query = query.filter(PurchaseRequest.employee_id == employee_id)

    return query


@router.post("/")
def create_purchase_request(
    payload: PurchaseRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != payload.employee_id and not has_permission(current_user, "purchase_requests.manage_company"):
        raise HTTPException(status_code=403, detail=_("expense_own_only", request))

    employee = db.query(Employee).filter(
        Employee.id == payload.employee_id,
        Employee.company_id == current_user["company_id"],
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    quantity = max(int(payload.quantity or 1), 1)
    unit_price = Decimal(str(payload.unit_price or 0))
    total_amount = unit_price * Decimal(quantity)
    finance_approver = _resolve_finance_approver(db, current_user["company_id"])

    item = PurchaseRequest(
        company_id=current_user["company_id"],
        employee_id=employee.id,
        finance_approver_id=finance_approver.id if finance_approver else None,
        item_name=payload.item_name.strip(),
        item_url=payload.item_url,
        vendor_name=payload.vendor_name,
        quantity=quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        currency=payload.currency or "TRY",
        justification=payload.justification,
        needed_by=payload.needed_by,
        status="PENDING",
    )
    db.add(item)
    db.flush()
    log_purchase_request_action(
        db,
        company_id=item.company_id,
        purchase_request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="CREATED",
        new_status="PENDING",
        detail=f"{item.item_name} talebi oluşturuldu.",
    )
    db.commit()
    db.refresh(item)

    if finance_approver and finance_approver.email:
        html = f"""
        <h3 style="color:#0ea5e9;">Yeni Satın Alma Talebi Onay Bekliyor</h3>
        <p><strong>{employee.first_name} {employee.last_name}</strong> yeni bir satın alma talebi oluşturdu.</p>
        <p><strong>Kalem:</strong> {item.item_name}</p>
        <p><strong>Tutar:</strong> {item.total_amount} {item.currency}</p>
        """
        EmailService.send_operational_email(
            finance_approver.email,
            _("purchase_request_pending_email_subject", request),
            html,
        )

    return {"message": _("purchase_request_created_success", request)}


@router.get("/")
@router.get("/list")
def get_purchase_requests(
    request: Request,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "purchase_requests.view_workspace", request)
    query = _build_query(
        db,
        current_user,
        query_text=request.query_params.get("query"),
        employee_id=int(request.query_params["employee_id"]) if request.query_params.get("employee_id") else None,
    )
    if status:
        query = query.filter(PurchaseRequest.status == status)

    items = query.order_by(PurchaseRequest.created_at.desc(), PurchaseRequest.id.desc()).all()

    return [
        {
            "id": item.id,
            "employee_id": item.employee_id,
            "first_name": item.employee.first_name if item.employee else "-",
            "last_name": item.employee.last_name if item.employee else "",
            "item_name": item.item_name,
            "item_url": item.item_url,
            "vendor_name": item.vendor_name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price or 0),
            "total_amount": float(item.total_amount or 0),
            "currency": item.currency,
            "justification": item.justification,
            "needed_by": item.needed_by.isoformat() if item.needed_by else None,
            "status": item.status,
            "finance_approver_name": (
                f"{item.finance_approver.first_name} {item.finance_approver.last_name}".strip()
                if item.finance_approver else "-"
            ),
            "rejection_reason": item.rejection_reason,
            "can_approve": _can_user_approve_purchase(item, current_user) and item.status == "PENDING",
            "can_convert_to_expense": (
                _can_user_convert_purchase(item, current_user)
                and item.status == "APPROVED"
                and not item.converted_expense_id
            ),
            "converted_expense_id": item.converted_expense_id,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


@router.get("/summary")
def purchase_request_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "purchase_requests.view_workspace", request)
    query_text = request.query_params.get("query")
    employee_id = int(request.query_params["employee_id"]) if request.query_params.get("employee_id") else None
    base_query = _build_query(db, current_user, query_text=query_text, employee_id=employee_id)

    def summarize(status: str):
        items = base_query.filter(PurchaseRequest.status == status).all()
        totals_by_currency = {}
        for item in items:
            currency = item.currency or "TRY"
            totals_by_currency[currency] = float(totals_by_currency.get(currency, 0)) + float(item.total_amount or 0)
        return {"count": len(items), "totals_by_currency": totals_by_currency}

    return {
        "pending": summarize("PENDING"),
        "approved": summarize("APPROVED"),
        "rejected": summarize("REJECTED"),
    }


@router.put("/{request_id}/status")
def update_purchase_request_status(
    request_id: int,
    payload: PurchaseRequestStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "purchase_requests.view_workspace", request)
    item = db.query(PurchaseRequest).options(joinedload(PurchaseRequest.employee)).filter(
        PurchaseRequest.id == request_id,
        PurchaseRequest.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("purchase_request_not_found", request))

    if not _can_user_approve_purchase(item, current_user):
        raise HTTPException(status_code=403, detail=_("purchase_request_only_finance_approver", request))

    if payload.status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail=_("invalid_status", request))

    if item.employee_id == current_user["user_id"] and payload.status == "APPROVED" and current_user["role"] != "SUPERADMIN":
        raise HTTPException(status_code=400, detail=_("purchase_request_cannot_approve_own", request))

    previous_status = item.status
    item.status = payload.status
    item.approved_by = current_user["user_id"]
    item.rejection_reason = payload.rejection_reason if payload.status == "REJECTED" else None
    log_purchase_request_action(
        db,
        company_id=item.company_id,
        purchase_request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="STATUS_UPDATED",
        previous_status=previous_status,
        new_status=item.status,
        detail=item.rejection_reason if item.status == "REJECTED" else f"Talep {item.status} durumuna alındı.",
    )
    db.commit()

    if item.employee and item.employee.email:
        if payload.status == "APPROVED":
            subject = _("purchase_request_approved_email_subject", request)
            html = f"<p><strong>{item.item_name}</strong> talebiniz finans tarafından onaylandı.</p>"
        else:
            subject = _("purchase_request_rejected_email_subject", request)
            html = f"<p><strong>{item.item_name}</strong> talebiniz reddedildi.</p><p>{item.rejection_reason or ''}</p>"
        EmailService.send_operational_email(item.employee.email, subject, html)

    return {"message": _("purchase_request_status_updated", request).format(status=payload.status)}


@router.post("/{request_id}/convert-to-expense")
def convert_purchase_request_to_expense(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "purchase_requests.view_workspace", request)
    item = db.query(PurchaseRequest).options(joinedload(PurchaseRequest.employee)).filter(
        PurchaseRequest.id == request_id,
        PurchaseRequest.company_id == current_user["company_id"],
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("purchase_request_not_found", request))

    if not _can_user_convert_purchase(item, current_user):
        raise HTTPException(status_code=403, detail=_("purchase_request_convert_unauthorized", request))

    if item.status != "APPROVED":
        raise HTTPException(status_code=400, detail=_("purchase_request_convert_only_approved", request))

    if item.converted_expense_id:
        raise HTTPException(status_code=400, detail=_("purchase_request_already_converted", request))

    category = "Satın Alma Talebi"
    description_parts = [item.item_name]
    if item.vendor_name:
        description_parts.append(f"Tedarikçi: {item.vendor_name}")
    if item.justification:
        description_parts.append(item.justification)

    expense = Expense(
        company_id=item.company_id,
        employee_id=item.employee_id,
        amount=item.total_amount,
        currency=item.currency,
        category=category,
        description=" | ".join(description_parts),
        expense_date=item.needed_by or date.today(),
        status="APPROVED",
        is_paid=False,
        purchase_request_id=item.id,
    )
    db.add(expense)
    db.flush()

    item.converted_expense_id = expense.id
    log_purchase_request_action(
        db,
        company_id=item.company_id,
        purchase_request_id=item.id,
        actor_employee_id=current_user["user_id"],
        action="CONVERTED_TO_EXPENSE",
        previous_status=item.status,
        new_status=item.status,
        detail=f"Talep #{expense.id} numaralı masrafa dönüştürüldü.",
    )
    db.commit()
    db.refresh(expense)

    return {
        "message": _("purchase_request_converted_success", request),
        "expense_id": expense.id,
        "purchase_request_id": item.id,
    }


@router.get("/{request_id}/history")
def get_purchase_request_history(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "purchase_requests.view_workspace", request)
    item = _build_query(db, current_user).filter(PurchaseRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=_("purchase_request_not_found", request))

    history_items = (
        db.query(PurchaseRequestActionLog)
        .filter(
            PurchaseRequestActionLog.company_id == current_user["company_id"],
            PurchaseRequestActionLog.purchase_request_id == request_id,
        )
        .order_by(PurchaseRequestActionLog.created_at.desc(), PurchaseRequestActionLog.id.desc())
        .all()
    )
    actor_ids = {entry.actor_employee_id for entry in history_items if entry.actor_employee_id}
    actors = {}
    if actor_ids:
        actors = {
            employee.id: f"{employee.first_name} {employee.last_name}".strip()
            for employee in db.query(Employee).filter(Employee.id.in_(actor_ids)).all()
        }

    return [
        {
            "id": entry.id,
            "action": entry.action,
            "previous_status": entry.previous_status,
            "new_status": entry.new_status,
            "detail": entry.detail,
            "actor_name": actors.get(entry.actor_employee_id, "-"),
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }
        for entry in history_items
    ]
