from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class KpiMetric(Base):
    __tablename__ = "kpi_metrics"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False, index=True)
    category = Column(String(80), nullable=False, index=True)
    unit = Column(String(30), nullable=False, default="COUNT")
    value = Column(Numeric(14, 2), nullable=False)
    target_value = Column(Numeric(14, 2), nullable=True)
    metric_date = Column(Date, nullable=False, default=date.today, index=True)
    source_type = Column(String(30), nullable=False, default="MANUAL")
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="kpi_metrics")
    creator = relationship("Employee", foreign_keys=[created_by])
