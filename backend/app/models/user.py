from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # --- 🛡️ YENİ GÜVENLİK ALANLARI ---
    mfa_enabled = Column(Boolean, default=True) # Varsayılan olarak MFA açık olsun mu?
    otp_code = Column(String, nullable=True)     # E-postaya giden 6 haneli kod
    otp_expiry = Column(DateTime, nullable=True) # Kodun son kullanma zamanı
    
    # İlk girişte veya sıfırlama sonrası şifre değiştirme zorunluluğu
    require_password_change = Column(Boolean, default=False) 
    
    # E-posta değişikliği için geçici alan
    pending_email = Column(String, nullable=True) 
    # ---------------------------------

    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", back_populates="users")