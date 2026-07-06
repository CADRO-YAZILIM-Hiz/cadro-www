from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- 1. ADAY (CANDIDATE) ŞEMALARI ---
class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    notes: Optional[str] = None

class CandidateCreate(CandidateBase):
    job_posting_id: int

class CandidateOut(CandidateBase):
    id: int
    company_id: int
    job_posting_id: int
    cv_url: Optional[str] = None
    stage: str
    
    # YZ (Yapay Zeka) Alanları
    rating: int
    notes: Optional[str] = None
    
    # 🎯 YENİ: İK SCORECARD ALANLARI (Frontend'e gönderilecek veriler)
    hr_rating_communication: int = 0
    hr_rating_technical: int = 0
    hr_rating_culture: int = 0
    hr_rating_motivation: int = 0
    hr_notes_pros: Optional[str] = None
    hr_notes_cons: Optional[str] = None
    hr_notes_overall: Optional[str] = None
    workflow_badges: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CandidateUpdateStage(BaseModel):
    stage: str

# 🎯 GÜNCELLENDİ: Frontend'den puanlama kaydedildiğinde bu veriler gelecek
class CandidateUpdateRating(BaseModel):
    hr_rating_communication: int = 0
    hr_rating_technical: int = 0
    hr_rating_culture: int = 0
    hr_rating_motivation: int = 0
    hr_notes_pros: Optional[str] = None
    hr_notes_cons: Optional[str] = None
    hr_notes_overall: Optional[str] = None
    workflow_badges: Optional[str] = None

class OfferLetterRequest(BaseModel):
    salary: float
    currency: str = "TRY"
    position_title: str
    start_date: str # YYYY-MM-DD formatında

# --- 2. İŞ İLANI ŞEMALARI ---
class JobPostingBase(BaseModel):
    title: str
    department: str
    description: Optional[str] = None

class JobPostingCreate(JobPostingBase):
    pass

class JobPostingOut(JobPostingBase):
    id: int
    company_id: int
    is_active: bool
    created_at: datetime
    candidates: List[CandidateOut] = [] 

    class Config:
        from_attributes = True
