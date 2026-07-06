from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import SessionLocal
# Senin modellerin ve şemaların (Yollarını kendi projene göre teyit et)
from app.models.ats import JobPosting, Candidate
from app.schemas.ats import JobPostingOut, JobPostingCreate

router = APIRouter()

# Veritabanı bağlantısı
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/jobs", response_model=List[JobPostingOut], summary="Aktif İş İlanlarını Getir")
def get_active_jobs(company_id: int = 1, db: Session = Depends(get_db)):
    """
    Dashboard için şirketin aktif iş ilanlarını ve 
    o ilanlara başvuran adayların listesini getirir.
    (Şimdilik company_id=1 olarak varsayıyoruz, ileride tokenden alacağız)
    """
    jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company_id,
        JobPosting.is_active == True
    ).all()
    
    return jobs

@router.post("/jobs", response_model=JobPostingOut, summary="Yeni İş İlanı Aç")
def create_job_posting(job_in: JobPostingCreate, company_id: int = 1, db: Session = Depends(get_db)):
    """
    'Yeni İlan Aç' butonuna basıldığında çalışacak olan kayıt rotası.
    """
    new_job = JobPosting(
        company_id=company_id,
        title=job_in.title,
        department=job_in.department,
        description=job_in.description,
        is_active=True
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job