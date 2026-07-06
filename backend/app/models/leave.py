from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    leave_country = Column(String, nullable=True)
    leave_type = Column(String, nullable=False) # ANNUAL, SICK, EXCUSED, MATERNITY
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False)
    reason = Column(Text, nullable=True)
    
    # Onay Süreci
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED, CANCELLED
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Rapor/Belge Desteği (Örn: Sağlık raporu URL)
    attachment_url = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # 🎯 DÜZELTME: Sınıf adı LeaveRequest olduğu için string tanımlamaları düzeltildi
    employee = relationship(
        "Employee", 
        foreign_keys="[LeaveRequest.employee_id]", 
        back_populates="leave_requests"
    )
    
    approver = relationship(
        "Employee", 
        foreign_keys=[approved_by]
    )
