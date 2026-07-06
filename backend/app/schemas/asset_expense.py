# backend/app/models/asset_expense.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import date
from app.core.database import Base

# ==============================================================
# 💻 ZİMMET (ASSET) MODELİ
# ==============================================================
class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True) # Boştaysa null
    
    asset_name = Column(String, nullable=False) # Örn: MacBook Pro M3
    category = Column(String, nullable=False)   # Örn: Elektronik, Araç, Telefon
    serial_no = Column(String, nullable=True)   # 🎯 DÜZELTME: API'ne uygun 'serial_no' yapıldı
    
    given_date = Column(Date, default=date.today)
    return_date = Column(Date, nullable=True)
    
    condition_on_assign = Column(String, nullable=True) # 🎯 YENİ: PDF için Kondisyon durumu
    description = Column(String, nullable=True)         # 🎯 YENİ: Cihaz notları
    
    status = Column(String, default="AVAILABLE") # AVAILABLE (Boşta), ASSIGNED (Zimmetli), IN_REPAIR (Tamirde)
    is_acknowledged = Column(Boolean, default=False) # 🎯 YENİ: Personel cihazı teslim aldı mı?
    
    # --- İLİŞKİLER ---
    company = relationship("Company", back_populates="assets")
    employee = relationship("Employee", back_populates="assets")


# ==============================================================
# 💸 MASRAF BEYANI (EXPENSE) MODELİ
# ==============================================================
class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="TRY")  
    category = Column(String, nullable=False)    
    description = Column(String, nullable=True)
    expense_date = Column(Date, nullable=False)
    
    receipt_url = Column(String, nullable=True)  
    status = Column(String, default="PENDING")   
    is_paid = Column(Boolean, default=False)     
    
    # --- İLİŞKİLER ---
    company = relationship("Company", back_populates="expenses")
    employee = relationship("Employee", back_populates="expenses")