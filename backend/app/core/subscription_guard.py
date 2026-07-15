from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from app.core.database import get_db
from app.models.company import Company, SubscriptionStatus
from app.models.subscription import Subscription
from app.models.employee import Employee


def check_subscription_status(company_id: int, db: Session) -> Subscription:
    """
    Şirketin aktif bir Paddle aboneliği olup olmadığını kontrol eder.
    Company.subscription_status ve Subscription.expiry_date'e bakılır.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Şirket bulunamadı."
        )

    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız aktif değil. Lütfen aboneliğinizi yenileyin."
        )

    if company.subscription_status == SubscriptionStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aboneliğiniz iptal edilmiştir."
        )

    # Subscription tablosundan son kaydı kontrol et
    subscription = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.expiry_date.desc().nullslast(), Subscription.id.desc())
        .first()
    )

    if subscription and subscription.expiry_date:
        if subscription.expiry_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Abonelik süreniz dolmuştur. Lütfen planınızı yenileyin."
            )

    return subscription


def check_employee_limit(company_id: int, db: Session):
    """
    Şirketin plan bazlı personel limitini kontrol eder.
    Limit bilgisi plan_features.py'deki plana göre belirlenir.
    """
    from app.core.plan_features import normalize_plan_code

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return

    plan = normalize_plan_code(company.plan_code)

    # Plan bazlı personel limitleri
    PLAN_LIMITS = {
        "BASIC": 10,
        "PRO": 50,
        "ENTERPRISE": 99999,  # Sınırsız
    }
    max_employees = PLAN_LIMITS.get(plan, 50)

    current_count = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.status == "ACTIVE"
    ).count()

    if current_count >= max_employees:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Personel limitine ulaştınız ({max_employees}). Daha fazla personel eklemek için planınızı yükseltin."
        )


def active_subscription_required(company_id: int, db: Session = Depends(get_db)):
    """API endpoint'lerinde dependency olarak kullanılır."""
    return check_subscription_status(company_id, db)
