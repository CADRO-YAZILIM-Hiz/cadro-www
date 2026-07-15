import json
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class GenericRequest(Base):
    __tablename__ = "generic_requests"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    requested_for_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)

    request_type = Column(String(80), nullable=False, index=True)
    priority = Column(String(30), nullable=False, default="NORMAL")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    needed_by = Column(Date, nullable=True)
    form_payload = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="OPEN", index=True)
    resolution_note = Column(Text, nullable=True)
    processed_by = Column(Integer, ForeignKey("employees.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="generic_requests")
    creator = relationship("Employee", foreign_keys=[created_by], back_populates="created_generic_requests")
    requested_for_employee = relationship("Employee", foreign_keys=[requested_for_employee_id], back_populates="requested_generic_requests")
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    processor = relationship("Employee", foreign_keys=[processed_by])
    messages = relationship("GenericRequestMessage", back_populates="request", cascade="all, delete-orphan")

    def payload_dict(self):
        if not self.form_payload:
            return {}
        try:
            return json.loads(self.form_payload)
        except (TypeError, ValueError):
            return {}


class GenericRequestMessage(Base):
    __tablename__ = "generic_request_messages"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("generic_requests.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    request = relationship("GenericRequest", back_populates="messages")
    sender = relationship("Employee", foreign_keys=[sender_id])


class GenericRequestActionLog(Base):
    __tablename__ = "generic_request_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    request_id = Column(Integer, nullable=False, index=True)
    actor_employee_id = Column(Integer, nullable=True, index=True)
    action = Column(String, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
