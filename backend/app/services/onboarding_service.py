from datetime import date, datetime, timedelta
import random
import string
import urllib.parse

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import EmailService
from app.core.security import hash_password
from app.models.company import Company
from app.models.employee import Employee, Department, Position


def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=length))


def generate_reset_code() -> str:
    return str(random.randint(100000, 999999))


def generate_unique_company_name(db: Session, base_name: str) -> str:
    name = base_name
    counter = 1

    while db.query(Company).filter(Company.name == name).first():
        name = f"{base_name}_{counter}"
        counter += 1

    return name


def _issue_reset_code_and_send_email(db: Session, employee: Employee) -> None:
    reset_code = generate_reset_code()
    reset_expiry = datetime.utcnow() + timedelta(minutes=20)

    employee.otp_code = reset_code
    employee.otp_expiry = reset_expiry
    employee.require_password_change = True

    db.commit()
    db.refresh(employee)

    encoded_email = urllib.parse.quote(employee.email, safe="")
    setup_url = f"{settings.APP_BASE_URL.rstrip('/')}/login?mode=setup&payment=success&email={encoded_email}"
    print(f"[PADDLE SETUP EMAIL] to={employee.email}", flush=True)

    EmailService.send_password_reset_email(
        employee.email,
        reset_code,
        action_url=setup_url,
        action_label="Şifremi Belirle ve Hesabımı Aktifleştir",
    )


def onboard_from_paddle(db: Session, email: str) -> Employee:
    clean_email = email.strip().lower()

    print(f"[ONBOARD TRIGGER] email={clean_email}", flush=True)

    # 1. existing user → reset gönder
    existing_employee = db.query(Employee).filter(Employee.email == clean_email).first()
    if existing_employee:
        _issue_reset_code_and_send_email(db, existing_employee)
        return existing_employee

    # 2. company bul
    company = db.query(Company).filter(Company.email == clean_email).first()

    if not company:
        print("[WARNING] Company not found, creating fallback", flush=True)

        base_name = clean_email.split("@")[0]
        company_name = generate_unique_company_name(db, base_name)

        company = Company(
            name=company_name,
            email=clean_email,
            is_active=True,
        )
        db.add(company)
        db.flush()

    # 3. department
    department = db.query(Department).filter(
        Department.company_id == company.id,
        Department.name == "General"
    ).first()

    if not department:
        department = Department(company_id=company.id, name="General")
        db.add(department)
        db.flush()

    # 4. position
    position = db.query(Position).filter(
        Position.company_id == company.id,
        Position.title == "Admin"
    ).first()

    if not position:
        position = Position(
            company_id=company.id,
            title="Admin",
            department_id=department.id
        )
        db.add(position)
        db.flush()

    # 5. employee oluştur
    temp_password = generate_temp_password()

    employee = Employee(
        company_id=company.id,
        department_id=department.id,
        position_id=position.id,
        first_name="Admin",
        last_name="User",
        email=clean_email,
        hashed_password=hash_password(temp_password),
        role="ADMIN",
        status="ACTIVE",
        hire_date=date.today(),
        gross_salary=0,
        mfa_enabled=False,
        require_password_change=True,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    _issue_reset_code_and_send_email(db, employee)

    print(f"[ONBOARD SUCCESS] company_id={company.id} employee_id={employee.id}", flush=True)

    return employee
