from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class LifecycleChecklistTemplate(Base):
    __tablename__ = "lifecycle_checklist_templates"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    mode = Column(String(32), nullable=False, index=True)  # onboarding, offboarding
    label = Column(String(255), nullable=False)
    detail = Column(Text, nullable=True)
    responsible_role = Column(String(50), nullable=True)
    action_key = Column(String(80), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_required = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company")
    completions = relationship(
        "LifecycleChecklistCompletion",
        back_populates="template",
        cascade="all, delete-orphan",
    )


class LifecycleChecklistCompletion(Base):
    __tablename__ = "lifecycle_checklist_completions"
    __table_args__ = (
        UniqueConstraint("template_id", "employee_id", name="uq_lifecycle_template_employee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("lifecycle_checklist_templates.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    is_done = Column(Boolean, nullable=False, default=False)
    note = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    template = relationship("LifecycleChecklistTemplate", back_populates="completions")
    employee = relationship("Employee", foreign_keys=[employee_id])
    completer = relationship("Employee", foreign_keys=[completed_by])
