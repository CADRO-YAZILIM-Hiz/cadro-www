from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    company_name = Column(String, nullable=True)
    actor_employee_id = Column(Integer, nullable=True, index=True)
    actor_name = Column(String, nullable=True)
    actor_role = Column(String, nullable=True, index=True)
    actor_department_id = Column(Integer, nullable=True, index=True)
    actor_department_name = Column(String, nullable=True)
    action_type = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False, index=True)
    http_method = Column(String, nullable=False, index=True)
    path = Column(String, nullable=False)
    query_string = Column(Text, nullable=True)
    status_code = Column(Integer, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
