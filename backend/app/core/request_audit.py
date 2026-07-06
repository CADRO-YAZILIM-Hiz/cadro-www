from app.models.asset_expense import PurchaseRequestActionLog
from app.models.generic_request import GenericRequestActionLog


def log_purchase_request_action(
    db,
    *,
    company_id: int,
    purchase_request_id: int,
    actor_employee_id: int | None,
    action: str,
    previous_status: str | None = None,
    new_status: str | None = None,
    detail: str | None = None,
):
    db.add(
        PurchaseRequestActionLog(
            company_id=company_id,
            purchase_request_id=purchase_request_id,
            actor_employee_id=actor_employee_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            detail=detail,
        )
    )


def log_generic_request_action(
    db,
    *,
    company_id: int,
    request_id: int,
    actor_employee_id: int | None,
    action: str,
    previous_status: str | None = None,
    new_status: str | None = None,
    detail: str | None = None,
):
    db.add(
        GenericRequestActionLog(
            company_id=company_id,
            request_id=request_id,
            actor_employee_id=actor_employee_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            detail=detail,
        )
    )
