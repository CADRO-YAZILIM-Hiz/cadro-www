from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import date

# 1. HEDEFLER (OKR - Objectives & Key Results)
class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=False)
    
    progress = Column(Integer, default=0) # %0 ile %100 arası
    status = Column(String(50), default="TODO") # TODO, IN_PROGRESS, COMPLETED
    
    employee = relationship("Employee", back_populates="goals", foreign_keys=[employee_id])

# 2. 360 DERECE DEĞERLENDİRME VE PUANLAMA
class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False) # Değerlendirilen
    reviewer_id = Column(Integer, ForeignKey("employees.id"), nullable=False) # Değerlendiren
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    review_type = Column(String(50), default="MANAGER") # MANAGER, PEER (İş Arkadaşı), SELF, SUBORDINATE (Ast)
    review_period = Column(String(50), nullable=False) # Örn: "2024 Yıl Sonu"
    rating = Column(Float, nullable=False) # 1.0 ile 5.0 arası yıldız
    comments = Column(Text, nullable=True)
    review_date = Column(Date, default=date.today)
    
    employee = relationship("Employee", back_populates="received_reviews", foreign_keys=[employee_id])
    reviewer = relationship("Employee", back_populates="given_reviews", foreign_keys=[reviewer_id])