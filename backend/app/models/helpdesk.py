# backend/app/models/helpdesk.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# ==========================================
# 🛠️ ANA TALEP (TICKET) TABLOSU
# ==========================================
class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Talebi kim açtı?
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Talep kime atandı? (IT Uzmanı, İK Personeli vb.)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True) 
    
    category = Column(String, nullable=False)   # Örn: IT_DESTEK, IK_TALEBI, BAKIM_ONARIM
    priority = Column(String, default="NORMAL") # DÜŞÜK, NORMAL, ACİL
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)  # İlk açılış mesajı/detayı
    
    status = Column(String, default="AÇIK")     # AÇIK, İŞLEMDE, ÇÖZÜLDÜ
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # --- İLİŞKİLER ---
    creator = relationship("Employee", foreign_keys=[created_by])
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    
    # Bir talebin (ticket) altındaki tüm sohbet mesajları
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")
    action_logs = relationship("TicketActionLog", back_populates="ticket", cascade="all, delete-orphan")


# ==========================================
# 💬 SOHBET (TICKET MESSAGES) TABLOSU
# ==========================================
class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- İLİŞKİLER ---
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("Employee", foreign_keys=[sender_id]) # Mesajı gönderen kişi
    file_url = Column(String, nullable=True)


class TicketActionLog(Base):
    __tablename__ = "ticket_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    actor_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    action_type = Column(String, nullable=False)
    action_note = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="action_logs")
    actor = relationship("Employee", foreign_keys=[actor_employee_id])
