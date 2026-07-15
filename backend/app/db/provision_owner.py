from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
APP_ENV_PATH = BACKEND_DIR / "app" / ".env"

if APP_ENV_PATH.exists():
    load_dotenv(APP_ENV_PATH)
else:
    load_dotenv()

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.announcement import Announcement  # noqa: F401,E402
from app.models.asset_expense import Asset, Expense, PurchaseRequest, PurchaseRequestActionLog  # noqa: F401,E402
from app.models.ats import Candidate, JobPosting  # noqa: F401,E402
from app.models.attendance import Attendance  # noqa: F401,E402
from app.models.audit_log import AuditLog  # noqa: F401,E402
from app.models.company import Company, Location, SubscriptionStatus  # noqa: F401,E402
from app.models.document import EmployeeDocument  # noqa: F401,E402
from app.models.employee import Department, Employee, Position  # noqa: E402
from app.models.generic_request import GenericRequest, GenericRequestActionLog, GenericRequestMessage  # noqa: F401,E402
from app.models.helpdesk import Ticket, TicketMessage  # noqa: F401,E402
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleReceipt, KnowledgeArticleReceiptLog, KnowledgeArticleVersion  # noqa: F401,E402
from app.models.kpi import KpiMetric  # noqa: F401,E402
from app.models.leave import LeaveRequest  # noqa: F401,E402
from app.models.performance import Goal, PerformanceReview  # noqa: F401,E402
from app.models.social import Kudos, MoodLog  # noqa: F401,E402
from app.models.subscription import Subscription  # noqa: F401,E402
from app.models.training import Training, TrainingParticipant  # noqa: F401,E402
from app.models.user import User  # noqa: F401,E402
from app.models.work_schedule import DepartmentWorkSchedule, EmployeeWorkScheduleOverride, WorkSchedule  # noqa: F401,E402


PLATFORM_COMPANY_NAME = "CADRO Platform"
PLATFORM_DEPARTMENT_NAME = "Platform"
PLATFORM_POSITION_NAME = "Platform Owner"


def ensure_company(db):
    company = db.query(Company).filter(Company.name == PLATFORM_COMPANY_NAME).first()
    if company:
        return company

    company = Company(
        name=PLATFORM_COMPANY_NAME,
        official_legal_name="CADRO Platform",
        plan_code="ENTERPRISE",
        subscription_status=SubscriptionStatus.ACTIVE,
        trial_ends_at=datetime.utcnow() + timedelta(days=3650),
        is_active=True,
        address="Platform Internal Workspace",
        phone=None,
        email="info@cadro.io",
        website="https://app.cadro.io",
    )
    db.add(company)
    db.flush()
    return company


def ensure_department(db, company: Company):
    department = db.query(Department).filter(
        Department.company_id == company.id,
        Department.name == PLATFORM_DEPARTMENT_NAME,
    ).first()
    if department:
        return department

    department = Department(company_id=company.id, name=PLATFORM_DEPARTMENT_NAME)
    db.add(department)
    db.flush()
    return department


def ensure_position(db, company: Company, department: Department):
    position = db.query(Position).filter(
        Position.company_id == company.id,
        Position.department_id == department.id,
        Position.title == PLATFORM_POSITION_NAME,
    ).first()
    if position:
        return position

    position = Position(
        company_id=company.id,
        department_id=department.id,
        title=PLATFORM_POSITION_NAME,
        parent_id=None,
    )
    db.add(position)
    db.flush()
    return position


def upsert_owner(db, first_name: str, last_name: str, email: str, password: str):
    company = ensure_company(db)
    department = ensure_department(db, company)
    position = ensure_position(db, company, department)

    owner = db.query(Employee).filter(
        (Employee.email == email) | (Employee.role == "OWNER")
    ).order_by(Employee.id.asc()).first()

    if owner is None:
        owner = Employee(
            company_id=company.id,
            department_id=department.id,
            position_id=position.id,
            manager_id=None,
            hashed_password=hash_password(password),
            role="OWNER",
            first_name=first_name,
            last_name=last_name,
            identity_no=None,
            mother_name=None,
            father_name=None,
            birth_place=None,
            birth_date=None,
            gender=None,
            blood_type=None,
            address="Platform Internal Workspace",
            emergency_contact_name=None,
            emergency_contact_relation=None,
            emergency_contact_phone=None,
            social_security_no=None,
            provident_fund_no=None,
            nationality="TR",
            bank_name=None,
            iban=None,
            account_holder_name=None,
            tax_id_number=None,
            work_authorization_type=None,
            work_authorization_no=None,
            work_authorization_start_date=None,
            work_authorization_expiry_date=None,
            visa_type=None,
            visa_expiry_date=None,
            nda_signed_at=None,
            handbook_ack_signed_at=None,
            background_check_status=None,
            background_check_completed_at=None,
            occupational_health_status=None,
            occupational_health_valid_until=None,
            is_married=False,
            spouse_name=None,
            spouse_works=False,
            children_count=0,
            children_names=None,
            education_level=None,
            email=email,
            phone=None,
            hire_date=date.today(),
            exit_date=None,
            status="ACTIVE",
            gross_salary=0,
            salary_currency="TRY",
            mfa_enabled=True,
            otp_code=None,
            otp_expiry=None,
            require_password_change=False,
        )
        db.add(owner)
    else:
        owner.company_id = company.id
        owner.department_id = department.id
        owner.position_id = position.id
        owner.manager_id = None
        owner.role = "OWNER"
        owner.first_name = first_name
        owner.last_name = last_name
        owner.email = email
        owner.hashed_password = hash_password(password)
        owner.status = "ACTIVE"
        owner.hire_date = owner.hire_date or date.today()
        owner.gross_salary = owner.gross_salary or 0
        owner.salary_currency = owner.salary_currency or "TRY"
        owner.mfa_enabled = True
        owner.require_password_change = False
        owner.exit_date = None
        owner.otp_code = None
        owner.otp_expiry = None

    db.flush()
    return owner, company


def main():
    parser = argparse.ArgumentParser(description="Create or update the platform owner user.")
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        owner, company = upsert_owner(
            db,
            first_name=args.first_name,
            last_name=args.last_name,
            email=args.email,
            password=args.password,
        )
        db.commit()
        print(
            {
                "owner_id": owner.id,
                "email": owner.email,
                "role": owner.role,
                "company_id": company.id,
                "company_name": company.name,
                "mfa_enabled": owner.mfa_enabled,
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
