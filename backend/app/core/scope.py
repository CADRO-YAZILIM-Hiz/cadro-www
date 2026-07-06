from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.employee import Employee


def get_manager_department_id(db: Session, current_user: dict) -> int | None:
    if str(current_user.get("role") or "").upper() != "MANAGER":
        return None

    manager = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()
    if not manager:
        return None
    return manager.department_id


def get_team_scoped_employee_ids(db: Session, current_user: dict) -> list[int]:
    role = str(current_user.get("role") or "").upper()
    user_id = int(current_user["user_id"])

    if role != "MANAGER":
        return [user_id]

    manager_department_id = get_manager_department_id(db, current_user)
    if not manager_department_id:
        return [user_id]

    rows = db.query(Employee.id).filter(
        Employee.company_id == current_user["company_id"],
        or_(
            Employee.id == user_id,
            Employee.department_id == manager_department_id,
        ),
    ).all()
    employee_ids = [row[0] for row in rows]
    return employee_ids or [user_id]
