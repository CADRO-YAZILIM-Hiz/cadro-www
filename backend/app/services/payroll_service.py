from sqlalchemy.orm import Session
from app.models.payroll import Payroll, PayrollType
from app.models.employee import Employee
from app.models.settings import PayrollSettings, TaxBracket

# KKTC Yasal Aylık Çalışma Saati
WORKING_HOURS_MONTHLY = 173.33 

def calculate_progressive_tax(taxable_income: float, brackets: list[TaxBracket]) -> float:
    """Kademeli Gelir Vergisi (Progressive Tax) Hesaplama Algoritması"""
    if taxable_income <= 0 or not brackets:
        return 0.0
    
    tax = 0.0
    # Dilimleri en düşükten en yükseğe doğru sırala
    sorted_brackets = sorted(brackets, key=lambda x: x.min_amount)
    
    for bracket in sorted_brackets:
        if taxable_income > bracket.min_amount:
            # Sınırı belirle (Eğer tavan yoksa sonsuz kabul et)
            limit = bracket.max_amount if bracket.max_amount else float('inf')
            
            # Bu dilime giren parayı bul
            chunk = min(taxable_income, limit) - bracket.min_amount
            
            if chunk > 0:
                tax += chunk * (bracket.tax_rate / 100)
    
    return tax

def process_employee_payroll(
    db: Session, 
    employee_id: int, 
    company_id: int, 
    month: int, 
    year: int, 
    exchange_rate: float = 1.0, 
    ot_weekday_hours: float = 0, 
    ot_weekend_hours: float = 0, 
    other_earnings: float = 0
):
    # 1. Personel ve Yatırım Tipi
    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.company_id == company_id).first()
    if not emp:
        raise ValueError("Personel bulunamadı.")
        
    ptype = db.query(PayrollType).filter(PayrollType.id == emp.payroll_type_id).first()
    if not ptype:
        ptype = db.query(PayrollType).first() 

    # 2. Sistem Ayarları ve Vergi Dilimleri
    settings = db.query(PayrollSettings).filter(PayrollSettings.is_active == True).order_by(PayrollSettings.id.desc()).first()
    if not settings:
        raise ValueError("Sistemde aktif bir 'PayrollSettings' (Asgari Ücret Ayarı) bulunamadı!")
    
    tax_brackets = db.query(TaxBracket).filter(TaxBracket.setting_id == settings.id).all()

    # 3. Döviz Kontrolü (TL'ye Çevrim)
    base_gross_currency = float(emp.gross_salary)
    base_gross_try = base_gross_currency * exchange_rate

    # 4. Fazla Mesai (TL)
    hourly_rate_try = base_gross_try / WORKING_HOURS_MONTHLY
    wd_pay_try = ot_weekday_hours * hourly_rate_try * 1.5
    we_pay_try = ot_weekend_hours * hourly_rate_try * 2.0
    total_ot_pay_try = wd_pay_try + we_pay_try
    other_earnings_try = other_earnings * exchange_rate

    # Toplam Brüt (TL)
    total_gross_try = base_gross_try + total_ot_pay_try + other_earnings_try

    # 5. SGK TAVAN LİMİTİ KONTROLÜ
    sgk_ceiling_limit = settings.min_wage * settings.sgk_ceiling_multiplier
    base_for_sgk_pf = min(total_gross_try, sgk_ceiling_limit)

    # 6. Yasal Kesintiler (Tavan Sınırlandırılmış Matrah Üzerinden)
    sgk_deduction = base_for_sgk_pf * (float(ptype.employee_sgk_rate) / 100)
    provident_deduction = base_for_sgk_pf * (float(ptype.employee_provident_rate) / 100)

    employer_sgk = base_for_sgk_pf * (float(ptype.employer_sgk_rate) / 100)
    employer_provident = base_for_sgk_pf * (float(ptype.employer_provident_rate) / 100)

    # 7. Gelir Vergisi
    monthly_personal_exemption = (settings.personal_exemption_annual / 12) + (settings.spouse_exemption / 12) + (settings.child_exemption / 12 * emp.children_count)
    tax_base = total_gross_try - (sgk_deduction + provident_deduction + monthly_personal_exemption)
    
    # Serbest Bölge İstisnası
    if emp.company.is_free_zone:
        income_tax_deduction = 0.0
    else:
        income_tax_deduction = calculate_progressive_tax(tax_base, tax_brackets) if tax_base > 0 else 0.0

    # 8. Net Maaş (TL)
    net_salary_try = total_gross_try - (sgk_deduction + provident_deduction + income_tax_deduction)

    total_approved_expenses_try = 0.0 
    final_payable_amount_try = net_salary_try + total_approved_expenses_try

    # 9. Veritabanına Kayıt
    new_payroll = Payroll(
        employee_id=emp.id,
        company_id=company_id,
        month=month,
        year=year,
        applied_payroll_code=ptype.code,
        currency=emp.salary_currency, 
        exchange_rate=exchange_rate,   
        base_gross_salary=base_gross_try,
        total_gross=total_gross_try,
        overtime_total_pay=total_ot_pay_try,
        social_security_deduction=sgk_deduction,
        provident_fund_deduction=provident_deduction,
        employer_ss_contribution=employer_sgk,
        employer_pf_contribution=employer_provident,
        taxable_matrah=tax_base if tax_base > 0 else 0,
        income_tax_deduction=income_tax_deduction,
        net_salary=net_salary_try,
        final_payable_amount=final_payable_amount_try,
        status="DRAFT" 
    )
    
    db.add(new_payroll)
    db.commit()
    db.refresh(new_payroll)
    
    return new_payroll, None