from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.core.database import Base
from sqlalchemy import Column, String, Boolean, DateTime

# ==========================================
# 🏢 DEPARTMAN TABLOSU
# ==========================================
class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    
    company = relationship("Company")
    positions = relationship("Position", back_populates="department_rel")
    employees = relationship("Employee", back_populates="department_rel")

# ==========================================
# 🎯 KADRO (POZİSYON) TABLOSU
# ==========================================
class Position(Base):
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True) 
    
    title = Column(String, nullable=False)      
    parent_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    
    company = relationship("Company")
    department_rel = relationship("Department", back_populates="positions")
    parent = relationship("Position", remote_side=[id], backref="children")
    employees = relationship("Employee", back_populates="position_rel")

# ==========================================
# 🧑‍💼 PERSONEL TABLOSU
# ==========================================
class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True, nullable=False)
    
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True) 
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    hashed_password = Column(String, nullable=True) 
    role = Column(String, default="EMPLOYEE", nullable=False) 

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    identity_no = Column(String, unique=True, index=True, nullable=True) 
    mother_name = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    birth_place = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    
    gender = Column(String, nullable=True) 
    blood_type = Column(String(10), nullable=True) 
    
    address = Column(Text, nullable=True) 
    emergency_contact_name = Column(String(150), nullable=True)
    emergency_contact_relation = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    social_security_no = Column(String, nullable=True) 
    provident_fund_no = Column(String, nullable=True) 
    nationality = Column(String, default="KKTC") 
    bank_name = Column(String(150), nullable=True)
    iban = Column(String(64), nullable=True)
    account_holder_name = Column(String(150), nullable=True)
    tax_id_number = Column(String(64), nullable=True)
    work_authorization_type = Column(String(100), nullable=True)
    work_authorization_no = Column(String(100), nullable=True)
    work_authorization_start_date = Column(Date, nullable=True)
    work_authorization_expiry_date = Column(Date, nullable=True)
    visa_type = Column(String(100), nullable=True)
    visa_expiry_date = Column(Date, nullable=True)
    nda_signed_at = Column(Date, nullable=True)
    handbook_ack_signed_at = Column(Date, nullable=True)
    background_check_status = Column(String(50), nullable=True)
    background_check_completed_at = Column(Date, nullable=True)
    occupational_health_status = Column(String(50), nullable=True)
    occupational_health_valid_until = Column(Date, nullable=True)
    
    is_married = Column(Boolean, default=False)
    spouse_name = Column(String(100), nullable=True) 
    spouse_works = Column(Boolean, default=False) 
    children_count = Column(Integer, default=0)    
    children_names = Column(Text, nullable=True) 
    
    education_level = Column(String, nullable=True) 
    email = Column(String, nullable=True, unique=True) 
    phone = Column(String, nullable=True)
    hire_date = Column(Date, default=date.today, nullable=False)
    exit_date = Column(Date, nullable=True)
    status = Column(String, default="ACTIVE", nullable=False) 
    
    gross_salary = Column(Numeric(10, 2), nullable=False) 
    salary_currency = Column(String(3), default="TRY") 

    mfa_enabled = Column(Boolean, default=True)  # MFA açık mı kapalı mı?
    otp_code = Column(String, nullable=True)      # E-postaya giden 6 haneli kod
    otp_expiry = Column(DateTime, nullable=True)  # Kodun son kullanma zamanı
    require_password_change = Column(Boolean, default=False) # Şifre değişimi zorunlu mu?

    # ==========================================
    # 🎯 PERSONEL İLİŞKİLERİ (Aşağıdan Buraya Taşındı!)
    # ==========================================
    company = relationship("Company", back_populates="employees", foreign_keys=[company_id])
    department_rel = relationship("Department", back_populates="employees")
    position_rel = relationship("Position", back_populates="employees")
    manager = relationship("Employee", remote_side=[id], back_populates="subordinates")
    subordinates = relationship("Employee", back_populates="manager")
    
    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="employee", cascade="all, delete-orphan")
    purchase_requests = relationship(
        "PurchaseRequest",
        foreign_keys="[PurchaseRequest.employee_id]",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    created_generic_requests = relationship(
        "GenericRequest",
        foreign_keys="[GenericRequest.created_by]",
        back_populates="creator",
    )
    requested_generic_requests = relationship(
        "GenericRequest",
        foreign_keys="[GenericRequest.requested_for_employee_id]",
        back_populates="requested_for_employee",
    )
    assets = relationship("Asset", back_populates="employee") 
    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="employee", cascade="all, delete-orphan")
    
    received_reviews = relationship(
        "PerformanceReview", 
        foreign_keys="[PerformanceReview.employee_id]", 
        back_populates="employee", 
        cascade="all, delete-orphan"
    )
    
    given_reviews = relationship(
        "PerformanceReview", 
        foreign_keys="[PerformanceReview.reviewer_id]", 
        back_populates="reviewer"
    )
    
    leave_requests = relationship(
        "LeaveRequest",
        foreign_keys="[LeaveRequest.employee_id]", 
        back_populates="employee"
    )

# ==========================================
# 🔄 PERSONEL PROFİL GÜNCELLEME TALEPLERİ (Self-Service)
# ==========================================
class ProfileUpdateRequest(Base):
    __tablename__ = "profile_update_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    changes_json = Column(Text, nullable=False) 
    status = Column(String, default="PENDING") 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # --- İLİŞKİLER ---
    employee = relationship("Employee", foreign_keys=[employee_id], backref="profile_updates")
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])
