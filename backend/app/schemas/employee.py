from pydantic import BaseModel, validator
from typing import Optional, Any
from datetime import date, datetime

# ==========================================
# 🏢 YENİ: DEPARTMAN ŞEMALARI
# ==========================================
class DepartmentCreate(BaseModel):
    name: str

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None

class DepartmentOut(BaseModel):
    id: int
    company_id: int
    name: str

    class Config:
        orm_mode = True

# ==========================================
# 🎯 KADRO (POSITION) ŞEMALARI
# ==========================================
class PositionCreate(BaseModel):
    title: str
    department_id: Optional[int] = None # 🎯 String yerine ID oldu
    parent_id: Optional[int] = None

class PositionUpdate(BaseModel):
    title: Optional[str] = None
    department_id: Optional[int] = None # 🎯 String yerine ID oldu
    parent_id: Optional[int] = None

class PositionOut(BaseModel):
    id: int
    company_id: int
    title: str
    department_id: Optional[int] = None # 🎯 String yerine ID oldu
    parent_id: Optional[int] = None

    class Config:
        orm_mode = True

# ==========================================
# 📂 EVRAK ŞEMALARI
# ==========================================
class EmployeeDocumentOut(BaseModel):
    id: int
    category: str
    document_type: str
    file_name: str
    status: str

    class Config:
        orm_mode = True

# ==========================================
# 👥 PERSONEL ŞEMALARI
# ==========================================
class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    identity_no: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    
    birth_place: Optional[str] = None
    nationality: Optional[str] = "KKTC"
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    account_holder_name: Optional[str] = None
    tax_id_number: Optional[str] = None
    work_authorization_type: Optional[str] = None
    work_authorization_no: Optional[str] = None
    work_authorization_start_date: Optional[Any] = None
    work_authorization_expiry_date: Optional[Any] = None
    visa_type: Optional[str] = None
    visa_expiry_date: Optional[Any] = None
    nda_signed_at: Optional[Any] = None
    handbook_ack_signed_at: Optional[Any] = None
    background_check_status: Optional[str] = None
    background_check_completed_at: Optional[Any] = None
    occupational_health_status: Optional[str] = None
    occupational_health_valid_until: Optional[Any] = None
    
    department_id: Optional[Any] = None 
    
    birth_date: Optional[Any] = None
    hire_date: Optional[Any] = None
    
    position_id: Optional[Any] = None
    company_id: Optional[Any] = None
    gross_salary: Optional[Any] = None
    salary_currency: Optional[str] = "TRY"
    
    is_married: Optional[bool] = False
    spouse_name: Optional[str] = None
    spouse_works: Optional[bool] = False
    children_count: Optional[Any] = 0
    children_names: Optional[Any] = None
    
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    education_level: Optional[str] = None
    social_security_no: Optional[str] = None
    provident_fund_no: Optional[str] = None
    
    candidate_id: Optional[Any] = None
    status: Optional[str] = "ACTIVE"
    
    # 🚨 SİHİRLİ DOKUNUŞ: Artık Frontend'den gelen ROL bilgisini kabul ediyor!
    role: Optional[str] = "EMPLOYEE" 

    @validator(
        "birth_date",
        "hire_date",
        "work_authorization_start_date",
        "work_authorization_expiry_date",
        "visa_expiry_date",
        "nda_signed_at",
        "handbook_ack_signed_at",
        "background_check_completed_at",
        "occupational_health_valid_until",
        pre=True
    )
    def parse_empty_dates(cls, value):
        if value == "" or value == "null" or value is None:
            return None
        if isinstance(value, str):
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        return value


class EmployeeUpdate(BaseModel):
    company_id: Optional[Any] = None
    position_id: Optional[Any] = None
    department_id: Optional[Any] = None 
    role: Optional[str] = None  
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    identity_no: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[Any] = None
    hire_date: Optional[Any] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    account_holder_name: Optional[str] = None
    tax_id_number: Optional[str] = None
    work_authorization_type: Optional[str] = None
    work_authorization_no: Optional[str] = None
    work_authorization_start_date: Optional[Any] = None
    work_authorization_expiry_date: Optional[Any] = None
    visa_type: Optional[str] = None
    visa_expiry_date: Optional[Any] = None
    nda_signed_at: Optional[Any] = None
    handbook_ack_signed_at: Optional[Any] = None
    background_check_status: Optional[str] = None
    background_check_completed_at: Optional[Any] = None
    occupational_health_status: Optional[str] = None
    occupational_health_valid_until: Optional[Any] = None
    gross_salary: Optional[Any] = None
    salary_currency: Optional[str] = None
    is_married: Optional[bool] = None
    spouse_name: Optional[str] = None
    spouse_works: Optional[bool] = None
    children_count: Optional[Any] = None
    children_names: Optional[Any] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    education_level: Optional[str] = None
    social_security_no: Optional[str] = None
    provident_fund_no: Optional[str] = None
    status: Optional[str] = None

    @validator(
        "birth_date",
        "hire_date",
        "work_authorization_start_date",
        "work_authorization_expiry_date",
        "visa_expiry_date",
        "nda_signed_at",
        "handbook_ack_signed_at",
        "background_check_completed_at",
        "occupational_health_valid_until",
        pre=True
    )
    def parse_empty_dates_update(cls, value):
        if value == "" or value == "null" or value is None:
            return None
        if isinstance(value, str):
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        return value

    class Config:
        extra = "ignore" 


class EmployeeOut(BaseModel):
    id: int
    company_id: int
    position_id: Optional[int] = None
    department_id: Optional[int] = None 
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    identity_no: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    account_holder_name: Optional[str] = None
    tax_id_number: Optional[str] = None
    work_authorization_type: Optional[str] = None
    work_authorization_no: Optional[str] = None
    work_authorization_start_date: Optional[date] = None
    work_authorization_expiry_date: Optional[date] = None
    visa_type: Optional[str] = None
    visa_expiry_date: Optional[date] = None
    nda_signed_at: Optional[date] = None
    handbook_ack_signed_at: Optional[date] = None
    background_check_status: Optional[str] = None
    background_check_completed_at: Optional[date] = None
    occupational_health_status: Optional[str] = None
    occupational_health_valid_until: Optional[date] = None
    gross_salary: Optional[Any] = None
    salary_currency: Optional[str] = None
    is_married: Optional[bool] = False
    spouse_name: Optional[str] = None
    spouse_works: Optional[bool] = False
    children_count: Optional[int] = 0
    children_names: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    education_level: Optional[str] = None
    social_security_no: Optional[str] = None
    provident_fund_no: Optional[str] = None
    status: str
    
    # 🚨 ÇIKTI İÇİN DOKUNUŞ: Frontend artık personelin rolünü okuyabilecek
    role: str

    class Config:
        orm_mode = True

class EmployeeTerminate(BaseModel):
    exit_date: date
