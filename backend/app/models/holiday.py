# app/models/holiday.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship  # <-- EKSİK OLAN SATIR BUYDU, EKLE
from app.core.database import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)

    name = Column(String, nullable=False)
    holiday_date = Column(Date, nullable=False, index=True)

    # İlişki tanımı
    company = relationship("Company")

    __table_args__ = (
        UniqueConstraint("company_id", "holiday_date", name="uq_holiday_company_date"),
    )
