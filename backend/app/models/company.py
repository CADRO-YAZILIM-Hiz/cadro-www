from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.core.database import Base
import enum
import uuid

class SubscriptionStatus(str, enum.Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"

# ==============================================================
# 🎯 ÇOKLU KONUM (ŞANTİYE/OFİS) MODELİ
# ==============================================================
class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    name = Column(String, nullable=False) # Örn: "Girne Merkez Şantiye"
    address = Column(String, nullable=True)
    
    # 🌍 Koordinat ve Güvenlik Çemberi
    latitude = Column(Numeric(10, 8), nullable=False)  
    longitude = Column(Numeric(11, 8), nullable=False) 
    allowed_radius = Column(Integer, default=100) # Metre cinsinden
    
    # 🔐 Bu konuma özel eşsiz QR şifresi
    qr_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    is_active = Column(Boolean, default=True)

    company = relationship("Company", back_populates="locations")

# ==============================================================
# 🏢 ŞİRKET MODELİ
# ==============================================================
class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    official_legal_name = Column(String, nullable=True)
    logo_url = Column(String, nullable=True) 
    
    # 🔥 YENİ EKLENEN SÜTUN (Seed hatasını çözer)
    is_free_zone = Column(Boolean, default=False)
    
    # 🎯 BORDRO SORUMLUSU ID'Sİ
    payroll_officer_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # ==============================================================
    # 🎯 YENİ EKLENEN ROTA SÜTUNLARI (Kazanılmış yetenekler korundu!)
    # ==============================================================
    it_responsible = Column(Integer, ForeignKey("employees.id"), nullable=True)
    hr_responsible = Column(Integer, ForeignKey("employees.id"), nullable=True)
    admin_responsible = Column(Integer, ForeignKey("employees.id"), nullable=True)
    onboarding_responsible = Column(Integer, ForeignKey("employees.id"), nullable=True)
    offboarding_responsible = Column(Integer, ForeignKey("employees.id"), nullable=True)
    plan_code = Column(String, nullable=False, default="PRO")
    
    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    trial_ends_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=30))
    is_active = Column(Boolean, default=True)

    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=False, unique=True)
    website = Column(String, nullable=True)
    tax_number = Column(String, nullable=True)
    workplace_registration_no = Column(String, nullable=True)
    dossier_required_global = Column(Text, nullable=True)
    dossier_required_tr = Column(Text, nullable=True)
    dossier_required_kktc = Column(Text, nullable=True)
    dossier_required_eu = Column(Text, nullable=True)
    dossier_required_mena = Column(Text, nullable=True)
    dossier_required_leadership = Column(Text, nullable=True)
    dossier_alert_roles = Column(Text, nullable=True)

    # --- İLİŞKİLER ---
    locations = relationship("Location", back_populates="company", cascade="all, delete-orphan") 
    
    users = relationship("User", back_populates="company")
    
    employees = relationship("Employee", back_populates="company", foreign_keys="[Employee.company_id]")
    payroll_officer = relationship("Employee", foreign_keys=[payroll_officer_id])
    
    attendances = relationship("Attendance", back_populates="company")
    expenses = relationship("Expense", back_populates="company")
    purchase_requests = relationship("PurchaseRequest", back_populates="company")
    generic_requests = relationship("GenericRequest", back_populates="company", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="company")
    leave_requests = relationship("LeaveRequest", cascade="all, delete-orphan")
    kpi_metrics = relationship("KpiMetric", back_populates="company", cascade="all, delete-orphan")

    paddle_customer_id = Column(String, nullable=True)
    paddle_subscription_id = Column(String, nullable=True)
    paddle_price_id = Column(String, nullable=True)
    paddle_transaction_id = Column(String, nullable=True)
