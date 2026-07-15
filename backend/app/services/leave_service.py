from datetime import date
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.leave import LeaveRequest

def update_employee_leave_entitlement(db: Session, employee_id: int):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    policy = db.query(LeavePolicy).filter(LeavePolicy.company_id == emp.company_id).first()
    
    if not emp or not policy:
        return None

    # Kıdem Hesapla (Yıl bazında)
    seniority_years = (date.today() - emp.hire_date).days // 365
    
    # Politikaya göre gün belirle
    entitled_days = policy.days_1_5
    if 5 <= seniority_years < 15:
        entitled_days = policy.days_5_15
    elif seniority_years >= 15:
        entitled_days = policy.days_15_plus

    # Bakiyeyi güncelle veya oluştur
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == date.today().year
    ).first()

    if not balance:
        balance = LeaveBalance(
            company_id=emp.company_id,
            employee_id=employee_id,
            year=date.today().year,
            entitled_days=entitled_days,
            remaining_days=entitled_days # Başlangıçta hepsi kalan
        )
        db.add(balance)
    else:
        balance.entitled_days = entitled_days
        # Kalan gün = (Yeni Hak + Devreden) - Kullanılan
        balance.remaining_days = (entitled_days + balance.carried_forward) - balance.used_days

    db.commit()
    return balance