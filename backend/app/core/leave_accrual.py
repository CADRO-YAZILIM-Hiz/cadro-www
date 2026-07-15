from datetime import date
from sqlalchemy.orm import Session
from app.models.leave_policy import LeavePolicy


def years_between(start: date, end: date) -> float:
    # basit kıdem hesabı (gün bazında)
    days = (end - start).days
    return max(0.0, days / 365.0)


def get_or_create_default_policy(db: Session, company_id: int) -> LeavePolicy:
    policy = db.query(LeavePolicy).filter(LeavePolicy.company_id == company_id).first()
    if policy:
        return policy

    policy = LeavePolicy(company_id=company_id, name="Default Policy")
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def entitled_days_for_year(db: Session, company_id: int, hire_date: date, year: int) -> int:
    policy = get_or_create_default_policy(db, company_id)

    # İlgili yılın sonu itibariyle kıdem
    ref = date(year, 12, 31)
    tenure = years_between(hire_date, ref)

    if tenure < 1:
        return policy.days_0_1
    if tenure < 5:
        return policy.days_1_5
    if tenure < 10:
        return policy.days_5_10
    return policy.days_10_plus