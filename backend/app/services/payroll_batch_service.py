from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.services.payroll_service import calculate_kktc_payroll
from fastapi import HTTPException, status
from datetime import date

def process_bulk_payroll(db: Session, company_id: int, year: int, month: int):
    """
    Belirli bir şirket için tüm aktif personelin maaşını toplu hesaplar.
    """
    # 1. O ay zaten hesaplanmış bordroları kontrol et (Mükerrer kaydı önle)
    existing_payroll = db.query(Payroll).filter(
        Payroll.company_id == company_id,
        Payroll.year == year,
        Payroll.month == month
    ).first()

    if existing_payroll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{year}/{month} dönemi için zaten bordro hesaplanmış."
        )

    # 2. Şirketin aktif personellerini getir
    employees = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.status == "ACTIVE"
    ).all()

    processed_count = 0
    total_net_payout = 0

    for emp in employees:
        # Daha önce yazdığımız o meşhur KKTC hesaplama motorunu çağırıyoruz
        payroll_data = calculate_kktc_payroll(
            gross_salary=emp.gross_salary,
            is_married=emp.is_married,
            num_children=emp.num_children,
            is_disabled=emp.is_disabled
        )

        # 3. Veritabanına kaydet
        new_payroll = Payroll(
            employee_id=emp.id,
            company_id=company_id,
            year=year,
            month=month,
            gross_salary=emp.gross_salary,
            net_salary=payroll_data["net_salary"],
            income_tax=payroll_data["income_tax"],
            social_security_emp=payroll_data["social_security_employee"],
            provident_fund_emp=payroll_data["provident_fund_employee"],
            total_cost=payroll_data["total_cost_to_employer"],
            calculation_date=date.today()
        )
        
        db.add(new_payroll)
        processed_count += 1
        total_net_payout += payroll_data["net_salary"]

    db.commit()
    
    return {
        "processed_employees": processed_count,
        "total_net_payout": round(total_net_payout, 2),
        "period": f"{month}/{year}"
    }