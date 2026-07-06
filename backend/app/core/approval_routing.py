from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from app.models.asset_expense import Expense
from app.models.company import Company
from app.models.document import EmployeeDocument
from app.models.employee import Employee
from app.models.leave import LeaveRequest

MANAGER_FIRST_SUBJECT_ROLES = {"EMPLOYEE", "HR"}
HR_ADMIN_ROLES = {"HR", "ADMIN", "SUPERADMIN"}
ADMIN_FINANCE_ROLES = {"ADMIN", "SUPERADMIN"}


def _load_company(db: Session, company_id: int) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def _load_employee(db: Session, employee_id: int, company_id: int) -> Employee | None:
    return db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company_id,
    ).first()


def _active_employees_by_roles(
    db: Session,
    company_id: int,
    roles: Iterable[str],
) -> list[Employee]:
    return db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.role.in_(list(roles)),
        Employee.status == "ACTIVE",
    ).all()


def _department_managers(
    db: Session,
    company_id: int,
    department_id: int | None,
) -> list[Employee]:
    if not department_id:
        return []
    return db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.department_id == department_id,
        Employee.role == "MANAGER",
        Employee.status == "ACTIVE",
    ).all()


def _extend_unique(
    bucket: list[Employee],
    seen: set[int],
    employees: Iterable[Employee | None],
    exclude_ids: set[int],
):
    for employee in employees:
        if not employee:
            continue
        if employee.id in exclude_ids or employee.id in seen:
            continue
        if employee.status != "ACTIVE":
            continue
        bucket.append(employee)
        seen.add(employee.id)


def _company_specific_employees(
    db: Session,
    company: Company | None,
    employee_ids: Iterable[int | None],
) -> list[Employee]:
    if not company:
        return []
    resolved_ids = [employee_id for employee_id in employee_ids if employee_id]
    if not resolved_ids:
        return []
    return db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.id.in_(resolved_ids),
        Employee.status == "ACTIVE",
    ).all()


def resolve_leave_approvers(db: Session, company_id: int, subject_employee: Employee) -> list[Employee]:
    company = _load_company(db, company_id)
    approvers: list[Employee] = []
    seen: set[int] = set()
    exclude_ids = {subject_employee.id}

    if subject_employee.role in MANAGER_FIRST_SUBJECT_ROLES:
        _extend_unique(
            approvers,
            seen,
            _department_managers(db, company_id, subject_employee.department_id),
            exclude_ids,
        )

    _extend_unique(
        approvers,
        seen,
        _company_specific_employees(db, company, [company.hr_responsible if company else None]),
        exclude_ids,
    )
    _extend_unique(
        approvers,
        seen,
        _active_employees_by_roles(db, company_id, HR_ADMIN_ROLES),
        exclude_ids,
    )
    return approvers


def resolve_expense_approvers(db: Session, company_id: int, subject_employee: Employee) -> list[Employee]:
    company = _load_company(db, company_id)
    approvers: list[Employee] = []
    seen: set[int] = set()
    exclude_ids = {subject_employee.id}

    if subject_employee.role in MANAGER_FIRST_SUBJECT_ROLES:
        _extend_unique(
            approvers,
            seen,
            _department_managers(db, company_id, subject_employee.department_id),
            exclude_ids,
        )

    _extend_unique(
        approvers,
        seen,
        _company_specific_employees(
            db,
            company,
            [
                company.payroll_officer_id if company else None,
                company.admin_responsible if company else None,
            ],
        ),
        exclude_ids,
    )
    _extend_unique(
        approvers,
        seen,
        _active_employees_by_roles(db, company_id, ADMIN_FINANCE_ROLES),
        exclude_ids,
    )
    return approvers


def resolve_document_approvers(db: Session, company_id: int, subject_employee: Employee) -> list[Employee]:
    company = _load_company(db, company_id)
    approvers: list[Employee] = []
    seen: set[int] = set()
    exclude_ids = {subject_employee.id}

    _extend_unique(
        approvers,
        seen,
        _company_specific_employees(db, company, [company.hr_responsible if company else None]),
        exclude_ids,
    )
    _extend_unique(
        approvers,
        seen,
        _active_employees_by_roles(db, company_id, HR_ADMIN_ROLES),
        exclude_ids,
    )
    return approvers


def should_auto_approve(current_user: dict, approvers: list[Employee]) -> bool:
    return current_user.get("role") == "SUPERADMIN" or len(approvers) == 0


def can_user_approve_leave(
    db: Session,
    leave_request: LeaveRequest,
    current_user: dict,
    subject_employee: Employee | None = None,
) -> bool:
    if leave_request.status != "PENDING":
        return False
    if leave_request.employee_id == current_user["user_id"] and current_user.get("role") != "SUPERADMIN":
        return False
    employee = subject_employee or _load_employee(db, leave_request.employee_id, leave_request.company_id)
    if not employee:
        return False
    approver_ids = {employee.id for employee in resolve_leave_approvers(db, leave_request.company_id, employee)}
    return current_user["user_id"] in approver_ids or current_user.get("role") == "SUPERADMIN"


def can_user_approve_expense(
    db: Session,
    expense: Expense,
    current_user: dict,
    subject_employee: Employee | None = None,
) -> bool:
    if expense.status != "PENDING":
        return False
    if expense.employee_id == current_user["user_id"] and current_user.get("role") != "SUPERADMIN":
        return False
    employee = subject_employee or _load_employee(db, expense.employee_id, expense.company_id)
    if not employee:
        return False
    approver_ids = {employee.id for employee in resolve_expense_approvers(db, expense.company_id, employee)}
    return current_user["user_id"] in approver_ids or current_user.get("role") == "SUPERADMIN"


def can_user_approve_document(
    db: Session,
    document: EmployeeDocument,
    current_user: dict,
    subject_employee: Employee | None = None,
) -> bool:
    if document.status != "PENDING":
        return False
    if document.employee_id == current_user["user_id"] and current_user.get("role") != "SUPERADMIN":
        return False
    employee = subject_employee or _load_employee(db, document.employee_id, current_user["company_id"])
    if not employee:
        return False
    approver_ids = {employee.id for employee in resolve_document_approvers(db, employee.company_id, employee)}
    return current_user["user_id"] in approver_ids or current_user.get("role") == "SUPERADMIN"


def get_actionable_pending_leaves(db: Session, current_user: dict) -> list[LeaveRequest]:
    items = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.status == "PENDING",
    ).all()
    return [item for item in items if can_user_approve_leave(db, item, current_user)]


def get_actionable_pending_expenses(db: Session, current_user: dict) -> list[Expense]:
    items = db.query(Expense).filter(
        Expense.company_id == current_user["company_id"],
        Expense.status == "PENDING",
    ).all()
    return [item for item in items if can_user_approve_expense(db, item, current_user)]


def get_actionable_pending_documents(db: Session, current_user: dict) -> list[EmployeeDocument]:
    items = db.query(EmployeeDocument).join(
        Employee, Employee.id == EmployeeDocument.employee_id
    ).filter(
        Employee.company_id == current_user["company_id"],
        EmployeeDocument.status == "PENDING",
    ).all()
    return [item for item in items if can_user_approve_document(db, item, current_user, item.employee)]
