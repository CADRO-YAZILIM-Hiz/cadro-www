from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.core.database import Base

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    category = Column(String, nullable=False) 
    document_type = Column(String, nullable=False) 
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False) 
    upload_date = Column(Date, default=date.today, nullable=False)
    document_number = Column(String, nullable=True)
    issued_by = Column(String, nullable=True)
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True) 
    is_mandatory = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)

    # 🎯 YENİ EKLENEN KABLO: ONAY DURUMU (PENDING, APPROVED, REJECTED)
    status = Column(String, default="APPROVED", nullable=False)

    # Çalışan ile ilişki
    employee = relationship("Employee", back_populates="documents")


class DocumentActionLog(Base):
    __tablename__ = "document_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    document_id = Column(Integer, nullable=True, index=True)
    actor_employee_id = Column(Integer, nullable=True, index=True)
    action = Column(String, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    document_type = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
