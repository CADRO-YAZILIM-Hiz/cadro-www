from sqlalchemy import Column, Integer, ForeignKey, String, Date, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import date, datetime

# --- 1. MOOD TRACKER (GÜNLÜK RUH HALİ) ---
class MoodLog(Base):
    __tablename__ = "mood_logs"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    date = Column(Date, default=date.today)
    mood = Column(String(50), nullable=False) # HARIKA, IYI, NORMAL, KOTU, BERBAT
    note = Column(Text, nullable=True) # Opsiyonel neden belirtebilir

    employee = relationship("Employee", backref="moods")

# --- 2. KUDOS (TAKDİR VE TEŞEKKÜR ROZETLERİ) ---
class Kudos(Base):
    __tablename__ = "kudos"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    sender_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    badge = Column(String(50), nullable=False) # TAKIM YILDIZI, HIZLI ÇÖZÜCÜ, SÜPER YARDIMSEVER vb.
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Kimden kime gittiğini bağlayan ilişkiler
    sender = relationship("Employee", foreign_keys=[sender_id])
    receiver = relationship("Employee", foreign_keys=[receiver_id])