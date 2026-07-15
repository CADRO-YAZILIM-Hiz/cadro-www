from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, String, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    date = Column(Date, nullable=False)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    
    # Giriş ve Çıkış koordinatları (Global Standart)
    in_lat = Column(Numeric(10, 8), nullable=True)
    in_long = Column(Numeric(11, 8), nullable=True)
    out_lat = Column(Numeric(10, 8), nullable=True)
    out_long = Column(Numeric(11, 8), nullable=True)

    # Kaynak: WEB, MOBILE, QR, DEVICE
    entry_source = Column(String, default="WEB")

    # Kayıt tipi: TIME, SICK_REPORT, LEAVE_OVERLAY
    record_type = Column(String, default="TIME")
    
    # Durumlar: PRESENT, ABSENT, LATE, OFF, EARLY_OUT, LATE_EARLY_OUT, SICK_REPORT
    status = Column(String, default="PRESENT")

    # İstisna / devamsızlık sınıfı: NONE, SICK_REPORT, APPROVED_LEAVE vb.
    exception_type = Column(String, nullable=True)
    
    # 3 ADIMLI ONAY MEKANİZMASI
    # Durumlar: PENDING, MANAGER_APPROVED, HR_APPROVED
    approval_status = Column(String, default="PENDING")

    # Bordro etkisi: STANDARD, FULL_PAY, DEDUCT
    payroll_treatment = Column(String, default="STANDARD")
    include_in_payroll = Column(Boolean, default=True)
    payroll_decision_note = Column(Text, nullable=True)

    # Sağlık raporu / resmi istisna metadata
    supporting_document_no = Column(String, nullable=True)
    issued_by = Column(String, nullable=True)
    issue_date = Column(Date, nullable=True)
    range_start_date = Column(Date, nullable=True)
    range_end_date = Column(Date, nullable=True)

    # Evrensel Mesai Hesaplama Alanları
    total_work_hours = Column(Numeric(5, 2), default=0)
    weekday_ot_hours = Column(Numeric(5, 2), default=0)
    weekend_ot_hours = Column(Numeric(5, 2), default=0)
    holiday_ot_hours = Column(Numeric(5, 2), default=0) # Resmi tatil mesaisi

    employee = relationship("Employee", back_populates="attendances")
    company = relationship("Company", back_populates="attendances")
