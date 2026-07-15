# backend/app/api/notification.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.approval_routing import (
    get_actionable_pending_documents,
    get_actionable_pending_expenses,
    get_actionable_pending_leaves,
)
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.dossier_rules import build_dossier_compliance_summary, get_dossier_alert_roles
from app.core.permissions import has_permission
from app.core.scope import get_manager_department_id, get_team_scoped_employee_ids
from app.models.asset_expense import Expense, PurchaseRequest
from app.models.company import Company
from app.models.document import EmployeeDocument
from app.models.employee import Employee
from app.models.generic_request import GenericRequest
from app.models.helpdesk import Ticket
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleReceipt
from app.models.leave import LeaveRequest

router = APIRouter()


def _purchase_request_query(db: Session, current_user: dict):
    query = db.query(PurchaseRequest).filter(
        PurchaseRequest.company_id == current_user["company_id"]
    )

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(PurchaseRequest.employee_id == current_user["user_id"])
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(PurchaseRequest.employee_id.in_(employee_ids))

    return query


def _generic_request_query(db: Session, current_user: dict):
    query = db.query(GenericRequest).filter(
        GenericRequest.company_id == current_user["company_id"]
    )

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

    return query


def _helpdesk_query(db: Session, current_user: dict):
    query = db.query(Ticket).filter(
        Ticket.company_id == current_user["company_id"]
    )

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    is_payroll_officer = bool(company and company.payroll_officer_id == current_user["user_id"])

    if has_permission(current_user, "helpdesk.process_company"):
        return query

    manager_department_id = get_manager_department_id(db, current_user)
    if has_permission(current_user, "helpdesk.process_team") and manager_department_id:
        return query.filter(
            or_(
                Ticket.created_by == current_user["user_id"],
                Ticket.assigned_to == current_user["user_id"],
                Ticket.creator.has(Employee.department_id == manager_department_id),
            )
        )

    if is_payroll_officer:
        return query.filter(
            or_(
                Ticket.created_by == current_user["user_id"],
                Ticket.assigned_to == current_user["user_id"],
                Ticket.category == "BORDRO",
            )
        )

    return query.filter(
        or_(
            Ticket.created_by == current_user["user_id"],
            Ticket.assigned_to == current_user["user_id"],
        )
    )


def _knowledge_ack_count(db: Session, current_user: dict):
    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"],
        Employee.company_id == current_user["company_id"],
    ).first()
    if not employee:
        return 0

    target_filter = or_(
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

    return db.query(KnowledgeArticle).outerjoin(
        KnowledgeArticleReceipt,
        and_(
            KnowledgeArticleReceipt.article_id == KnowledgeArticle.id,
            KnowledgeArticleReceipt.employee_id == current_user["user_id"],
        ),
    ).filter(
        KnowledgeArticle.company_id == current_user["company_id"],
        KnowledgeArticle.status == "PUBLISHED",
        KnowledgeArticle.require_ack.is_(True),
        target_filter,
        or_(
            KnowledgeArticleReceipt.id.is_(None),
            KnowledgeArticleReceipt.acknowledged_at.is_(None),
            KnowledgeArticleReceipt.acknowledged_version != KnowledgeArticle.version,
        ),
    ).count()


def _employee_scope_query(db: Session, current_user: dict):
    query = db.query(Employee).filter(Employee.company_id == current_user["company_id"])

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(Employee.id == current_user["user_id"])
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(Employee.id.in_(employee_ids))

    return query


def _dossier_alert_counts(db: Session, current_user: dict):
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    if current_user["role"] not in get_dossier_alert_roles(company):
        return {
            "dossier_missing_required_documents": 0,
            "dossier_expired_documents": 0,
            "dossier_expiring_documents": 0,
        }

    employees = _employee_scope_query(db, current_user).all()
    if not employees:
        return {
            "dossier_missing_required_documents": 0,
            "dossier_expired_documents": 0,
            "dossier_expiring_documents": 0,
        }

    employee_ids = [employee.id for employee in employees]
    documents = (
        db.query(EmployeeDocument)
        .filter(EmployeeDocument.employee_id.in_(employee_ids))
        .all()
    )

    documents_by_employee: dict[int, list[EmployeeDocument]] = {}
    for document in documents:
        documents_by_employee.setdefault(document.employee_id, []).append(document)

    missing_required_count = 0
    expired_documents_count = 0
    expiring_documents_count = 0

    for employee in employees:
        summary = build_dossier_compliance_summary(
            employee,
            documents_by_employee.get(employee.id, []),
            company,
        )
        missing_required_count += summary["summary"]["missing_required_count"]
        expired_documents_count += summary["summary"]["expired_documents_count"]
        expiring_documents_count += summary["summary"]["expiring_documents_count"]

    return {
        "dossier_missing_required_documents": missing_required_count,
        "dossier_expired_documents": expired_documents_count,
        "dossier_expiring_documents": expiring_documents_count,
    }


@router.get("/unread-count")
def get_unread_count(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "EMPLOYEE")
    company_id = current_user.get("company_id")

    pending_leaves = 0
    pending_expenses = 0
    open_tickets = 0
    pending_tickets = 0
    in_progress_tickets = 0
    pending_documents = 0
    pending_purchase_requests = _purchase_request_query(db, current_user).filter(
        PurchaseRequest.status == "PENDING"
    ).count()

    generic_base_query = _generic_request_query(db, current_user).filter(
        GenericRequest.status.in_(["OPEN", "IN_PROGRESS"])
    )
    open_generic_requests = generic_base_query.filter(
        GenericRequest.request_type != "HEALTH_RECORD_CORRECTION"
    ).count()
    health_record_corrections = generic_base_query.filter(
        GenericRequest.request_type == "HEALTH_RECORD_CORRECTION"
    ).count()
    pending_policy_acknowledgements = _knowledge_ack_count(db, current_user)
    dossier_alerts = _dossier_alert_counts(db, current_user)

    if role in ["MANAGER", "HR", "ADMIN", "SUPERADMIN"]:
        pending_leaves = len(get_actionable_pending_leaves(db, current_user))
        pending_expenses = len(get_actionable_pending_expenses(db, current_user))
        pending_documents = len(get_actionable_pending_documents(db, current_user))
    elif role == "EMPLOYEE":
        pending_leaves = (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.company_id == company_id,
                LeaveRequest.employee_id == current_user["user_id"],
                LeaveRequest.status == "PENDING",
            )
            .count()
        )
        pending_expenses = (
            db.query(Expense)
            .filter(
                Expense.company_id == company_id,
                Expense.employee_id == current_user["user_id"],
                Expense.status == "PENDING",
            )
            .count()
        )
        pending_documents = (
            db.query(EmployeeDocument)
            .filter(
                EmployeeDocument.employee_id == current_user["user_id"],
                EmployeeDocument.status == "PENDING",
            )
            .count()
        )

    ticket_query = _helpdesk_query(db, current_user)
    pending_tickets = ticket_query.filter(Ticket.status == "AÇIK").count()
    in_progress_tickets = ticket_query.filter(Ticket.status == "İŞLEMDE").count()
    open_tickets = ticket_query.filter(
        or_(Ticket.status == "AÇIK", Ticket.status == "İŞLEMDE"),
    ).count()

    return {
        "details": {
            "pending_leaves": pending_leaves,
            "pending_expenses": pending_expenses,
            "pending_documents": pending_documents,
            "pending_purchase_requests": pending_purchase_requests,
            "open_generic_requests": open_generic_requests,
            "open_tickets": open_tickets,
            "pending_tickets": pending_tickets,
            "in_progress_tickets": in_progress_tickets,
            "health_record_corrections": health_record_corrections,
            "pending_policy_acknowledgements": pending_policy_acknowledgements,
            "dossier_missing_required_documents": dossier_alerts["dossier_missing_required_documents"],
            "dossier_expired_documents": dossier_alerts["dossier_expired_documents"],
            "dossier_expiring_documents": dossier_alerts["dossier_expiring_documents"],
        }
    }
