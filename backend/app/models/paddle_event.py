from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


class PaddleWebhookEvent(Base):
    __tablename__ = "paddle_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    notification_id = Column(String, nullable=True, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    processing_status = Column(String, nullable=False, default="received", index=True)
    occurred_at = Column(DateTime, nullable=True)
    payload = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
