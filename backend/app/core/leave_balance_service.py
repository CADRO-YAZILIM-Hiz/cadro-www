from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from app.models.employee import Employee
from app.models.leave import LeaveRequest

def get_employee_seniority(hire_date: date) -> int:
    """Personelin kaç yıllık kıdemi olduğunu hesaplar."""
    today = date.today()
    return today.year - hire_date.year - ((today.month, today.day) < (hire_date.month, hire_date.day))

def calculate_entitled_days(seniority: int, policy: LeavePolicy) -> int:
    """Politikaya göre kıdem yılına karşılık gelen izin gününü döner."""
    if seniority < 1:
        return policy.days_0_1
    elif 1 <= seniority < 5:
        return policy.days_1_5
    elif 5 <= seniority < 15:
        return policy.days_5_15  # KKTC standardı 15 yıla göre revize etmiştik
    else:
        return policy.days_15_plus

def update_or_create_leave_balance(db: Session, employee_id: int, year: int):
    """
    Personel için o yılın izin bakiyesini oluşturur veya günceller.
    Ayrıca geçen yıldan devreden izinleri de hesaba katar.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    policy = db.query(LeavePolicy).filter(LeavePolicy.company_id == emp.company_id).first()
    
    if not policy:
        # Şirketin özel politikası yoksa varsayılan değerleri kullanabiliriz
        return None

    seniority = get_employee_seniority(emp.hire_date)
    new_entitlement = calculate_entitled_days(seniority, policy)
    
    # 1. Geçen yılın bakiyesine bak (Devir işlemi için)
    previous_balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year - 1
    ).first()
    
    carried_days = Decimal("0")
    if previous_balance and policy.carry_over_allowed:
        # Politika sınırına göre devreden günü belirle
        carried_days = min(previous_balance.remaining_days, Decimal(str(policy.max_carry_over_days)))

    # 2. Mevcut yılın kaydını bul veya oluştur
    current_balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year
    ).first()

    if not current_balance:
        current_balance = LeaveBalance(
            employee_id=employee_id,
            company_id=emp.company_id,
            year=year,
            carried_forward=carried_days,
            entitled_days=new_entitlement,
            used_days=0,
            pending_days=0,
            remaining_days=carried_days + new_entitlement
        )
        db.add(current_balance)
    else:
        # Eğer bakiye zaten varsa (belki maaş artışı veya kıdem değişti) güncelle
        current_balance.entitled_days = new_entitlement
        current_balance.carried_forward = carried_days
        current_balance.remaining_days = (current_balance.carried_forward + current_balance.entitled_days) - (current_balance.used_days + current_balance.pending_days)

    db.commit()
    return current_balance