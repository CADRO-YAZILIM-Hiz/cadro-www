from pydantic import BaseModel, ConfigDict
from typing import Optional

# --- ADMIN API İÇİN: BORDRO TİPLERİ ---
class PayrollTypeBase(BaseModel):
    code: str
    name: str
    employee_sgk_rate: float = 9.0
    employee_provident_rate: float = 5.0
    employer_sgk_rate: float = 11.0
    employer_provident_rate: float = 5.0
    employer_hazard_rate: float = 0.0
    government_contribution_rate: float = 0.0
    is_active: bool = True

class PayrollTypeCreate(PayrollTypeBase):
    pass

class PayrollTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    employee_sgk_rate: Optional[float] = None
    employee_provident_rate: Optional[float] = None
    employer_sgk_rate: Optional[float] = None
    employer_provident_rate: Optional[float] = None
    employer_hazard_rate: Optional[float] = None
    government_contribution_rate: Optional[float] = None
    is_active: Optional[bool] = None

class PayrollTypeOut(PayrollTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- BORDRO İŞLEMLERİ ---
class PayrollCalculate(BaseModel):
    employee_id: int
    month: int
    year: int
    weekday_ot_hours: float = 0
    weekend_ot_hours: float = 0
    other_earnings: float = 0 

class PayrollOut(BaseModel):
    id: int
    employee_id: int
    month: int
    year: int
    total_gross: float
    overtime_total_pay: float
    social_security_deduction: float
    provident_fund_deduction: float
    income_tax_deduction: float
    net_salary: float 
    total_approved_expenses: float = 0.0  
    final_payable_amount: float  
    status: str
    applied_payroll_code: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)