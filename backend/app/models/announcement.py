from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Date
from datetime import datetime
from app.core.database import Base

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(50), default="NORMAL") # HIGH, NORMAL, LOW
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # YENİ: Otomatik silinme/gizlenme tarihi
    expires_at = Column(Date, nullable=True)