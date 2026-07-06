from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class JobPosting(Base):
    __tablename__ = "job_postings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # İlişkiler
    company = relationship("Company")
    candidates = relationship("Candidate", back_populates="job_posting", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    
    cv_url = Column(String(255), nullable=True)
    stage = Column(String(50), default="YENI") 
    
    # --- YZ (YAPAY ZEKA) DEĞERLENDİRME ALANLARI ---
    rating = Column(Integer, default=0) 
    notes = Column(Text, nullable=True) 

    # 🎯 YENİ: İK (İNSAN KAYNAKLARI) SCORECARD ALANLARI ---
    hr_rating_communication = Column(Integer, default=0) # İletişim ve İfade
    hr_rating_technical = Column(Integer, default=0)     # Teknik / Mesleki Bilgi
    hr_rating_culture = Column(Integer, default=0)       # Kurum Kültürüne Uyum
    hr_rating_motivation = Column(Integer, default=0)    # Özgüven ve Motivasyon
    
    hr_notes_pros = Column(Text, nullable=True)          # Artılar (Güçlü Yönler)
    hr_notes_cons = Column(Text, nullable=True)          # Eksiler (Gelişim Alanları)
    hr_notes_overall = Column(Text, nullable=True)       # Genel Karar / Özet
    workflow_badges = Column(Text, nullable=True)        # Süreç rozetleri (JSON array)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    job_posting = relationship("JobPosting", back_populates="candidates")
