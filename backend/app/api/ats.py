import os
import io
import shutil
import json
import urllib.parse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request # 🎯 YENİ: Request eklendi
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from pydantic import BaseModel
from pypdf import PdfReader

import requests as req_lib

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle

from app.models.company import Company
from app.api.report import get_header_elements, create_footer, format_text

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user 
from app.core.i18n import _ # 🌍 YENİ: Çeviri motoru eklendi
from app.core.plan_features import plan_feature_required
from app.models.ats import JobPosting, Candidate
from app.schemas.ats import (
    JobPostingCreate, JobPostingOut, 
    CandidateCreate, CandidateOut, CandidateUpdateStage, CandidateUpdateRating, OfferLetterRequest
)

HR_AGENT_URL = settings.HR_AGENT_URL
HR_AGENT_SECRET = settings.HR_AGENT_SECRET
MAX_CV_SIZE = 5 * 1024 * 1024
router = APIRouter(dependencies=[Depends(plan_feature_required("ops.ats"))])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "cvs")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class RejectionMail(BaseModel):
    subject: str
    body: str

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"PDF Okuma Hatası: {e}")
    return text

# ==========================================
# 🏢 İŞ İLANLARI (JOB POSTINGS)
# ==========================================

@router.post("/jobs", response_model=JobPostingOut)
def create_job_posting(job_in: JobPostingCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    new_job = JobPosting(
        company_id=current_user["company_id"], 
        title=job_in.title,
        department=job_in.department,
        description=job_in.description
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("/jobs", response_model=List[JobPostingOut])
def get_job_postings(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(JobPosting).options(joinedload(JobPosting.candidates)).filter(
        JobPosting.company_id == current_user["company_id"] 
    ).order_by(JobPosting.created_at.desc()).all()

# ==========================================
# 🧑‍💼 ADAY YÖNETİMİ (CANDIDATES)
# ==========================================

@router.post("/candidates", response_model=CandidateOut)
def create_candidate(candidate_in: CandidateCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    job_posting = db.query(JobPosting).filter(
        JobPosting.id == candidate_in.job_posting_id,
        JobPosting.company_id == current_user["company_id"]
    ).first()
    if not job_posting:
        raise HTTPException(status_code=404, detail=_("job_not_found", request))

    new_candidate = Candidate(
        company_id=current_user["company_id"], 
        job_posting_id=candidate_in.job_posting_id,
        first_name=candidate_in.first_name,
        last_name=candidate_in.last_name,
        email=candidate_in.email,
        phone=candidate_in.phone,
        notes=candidate_in.notes,
        stage="YENI"
    )
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    return new_candidate

@router.put("/candidates/{candidate_id}/stage")
def update_candidate_stage(candidate_id: int, stage_in: CandidateUpdateStage, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.company_id == current_user["company_id"]).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
    
    candidate.stage = stage_in.stage
    db.commit()
    return {"message": _("stage_updated", request).format(stage=stage_in.stage)}

@router.put("/candidates/{candidate_id}/rating")
def update_candidate_rating(candidate_id: int, rating_in: CandidateUpdateRating, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.company_id == current_user["company_id"]).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
    
    candidate.hr_rating_communication = rating_in.hr_rating_communication
    candidate.hr_rating_technical = rating_in.hr_rating_technical
    candidate.hr_rating_culture = rating_in.hr_rating_culture
    candidate.hr_rating_motivation = rating_in.hr_rating_motivation
    candidate.hr_notes_pros = rating_in.hr_notes_pros
    candidate.hr_notes_cons = rating_in.hr_notes_cons
    candidate.hr_notes_overall = rating_in.hr_notes_overall
    candidate.workflow_badges = rating_in.workflow_badges

    db.commit()
    return {"message": _("rating_updated", request)}

@router.post("/candidates/{candidate_id}/reject")
def reject_candidate(candidate_id: int, mail_data: RejectionMail, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.company_id == current_user["company_id"]).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
    
    candidate.stage = "RED"
    db.commit()
    return {"message": _("candidate_rejected_mail", request)}

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id, 
        Candidate.company_id == current_user["company_id"]
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found_or_unauth", request))
    
    if candidate.cv_url:
        try:
            file_name = candidate.cv_url.split("/")[-1]
            file_path = os.path.join(UPLOAD_DIR, file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            pass

    db.delete(candidate)
    db.commit()
    return {"message": _("candidate_deleted", request)}

# ==========================================
# 📄 CV YÜKLEME VE YAPAY ZEKA DEĞERLENDİRMESİ
# ==========================================

@router.post("/candidates/{candidate_id}/cv")
def upload_candidate_cv(
    candidate_id: int, 
    request: Request,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension != "pdf":
         raise HTTPException(status_code=400, detail=_("cv_pdf_only", request))
         
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_CV_SIZE:
        raise HTTPException(status_code=400, detail=_("cv_size_limit", request))

    candidate = db.query(Candidate).options(joinedload(Candidate.job_posting)).filter(
        Candidate.id == candidate_id, 
        Candidate.company_id == current_user["company_id"]
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))

    file_name = f"cv_{candidate.id}_{int(datetime.now().timestamp())}.pdf"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    if candidate.cv_url:
        old_path = os.path.join(BASE_DIR, candidate.cv_url.lstrip("/"))
        if os.path.exists(old_path):
            try: os.remove(old_path)
            except: pass
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        candidate.cv_url = f"/static/cvs/{file_name}"
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=_("file_save_error", request).format(error=str(e)))

    cv_text = extract_text_from_pdf(file_path)

    if cv_text.strip() and HR_AGENT_URL:
        try:
            job_title = candidate.job_posting.title if candidate.job_posting else "Belirtilmemiş"
            job_desc = candidate.job_posting.description if candidate.job_posting and candidate.job_posting.description else "Genel Başvuru"

            headers = {"X-Agent-Secret": HR_AGENT_SECRET} if HR_AGENT_SECRET else {}
            ai_response = req_lib.post(
                f"{HR_AGENT_URL}/api/v1/cv/evaluate",
                json={
                    "cv_text": cv_text,
                    "job_title": job_title,
                    "job_description": job_desc,
                    "candidate_id": candidate.id,
                },
                headers=headers,
                timeout=120.0,
            )
            ai_response.raise_for_status()
            ai_data = ai_response.json()

            candidate.rating = ai_data.get("score", 0)
            candidate.notes = f"🤖 AI Değerlendirmesi: {ai_data.get('summary', '')}"
            candidate.hr_rating_communication = ai_data.get("communication", 0)
            candidate.hr_rating_technical = ai_data.get("technical", 0)
            candidate.hr_rating_culture = ai_data.get("culture", 0)
            candidate.hr_rating_motivation = ai_data.get("motivation", 0)
            candidate.hr_notes_pros = ai_data.get("pros", "")
            candidate.hr_notes_cons = ai_data.get("cons", "")
            candidate.hr_notes_overall = ai_data.get("overall", "")
            db.commit()

        except Exception as e:
            candidate.notes = "🤖 Yapay Zeka değerlendirmesi şu an yapılamadı."
            db.commit()

    return {
        "message": _("cv_uploaded", request), 
        "cv_url": candidate.cv_url,
        "ai_rating": getattr(candidate, 'rating', 0),
        "ai_notes": getattr(candidate, 'notes', '')
    }

# ==========================================
# 🌟 DİNAMİK İŞ TEKLİFİ (OFFER LETTER) PDF ÜRETİMİ
# ==========================================

@router.post("/candidates/{candidate_id}/offer-letter")
def generate_offer_letter(candidate_id: int, offer_data: OfferLetterRequest, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.company_id == current_user["company_id"]).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
        
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=60)
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    font_reg = "Amiri" if is_arabic else "Roboto"
    font_bold = "Amiri-Bold" if is_arabic else "Roboto-Bold"
    
    elements = get_header_elements(company, request, is_arabic, font_bold)
    elements.append(Spacer(1, 30))
    center_heading = ParagraphStyle('CenterHeading_TR', fontName=font_bold, fontSize=16, alignment=2 if is_arabic else 1, spaceAfter=20)
    body_style = ParagraphStyle('BodyText_TR', fontName=font_reg, fontSize=11, leading=16, alignment=2 if is_arabic else 0)
    bold_style = ParagraphStyle('BoldText_TR', fontName=font_bold, fontSize=11, leading=16, alignment=2 if is_arabic else 0)

    def tr_text(key: str, **kwargs) -> str:
        raw = _(key, request).format(**kwargs) if kwargs else _(key, request)
        return format_text(raw, is_arabic, strip_html=True)

    elements.append(Paragraph(tr_text("offer_letter_title"), center_heading))
    elements.append(Spacer(1, 20))

    greeting = tr_text("offer_letter_greeting", full_name=f"{candidate.first_name} {candidate.last_name}")
    elements.append(Paragraph(greeting, body_style))
    elements.append(Spacer(1, 15))

    paragraph_1 = tr_text("offer_letter_intro", position_title=offer_data.position_title)
    elements.append(Paragraph(paragraph_1, body_style))
    elements.append(Spacer(1, 15))

    elements.append(Paragraph(tr_text("offer_letter_details_heading"), bold_style))
    elements.append(Spacer(1, 10))

    details = "<br/>".join([
        tr_text("offer_letter_detail_position", value=offer_data.position_title),
        tr_text("offer_letter_detail_salary", value=f"{offer_data.salary:,.2f} {offer_data.currency}"),
        tr_text("offer_letter_detail_start_date", value=str(offer_data.start_date)),
        tr_text("offer_letter_detail_work_location", value=tr_text("offer_letter_work_location_default", company_name=company.name)),
    ])
    details = format_text(details, is_arabic, strip_html=True)
    elements.append(Paragraph(details, body_style))
    elements.append(Spacer(1, 15))

    paragraph_2 = tr_text("offer_letter_closing")
    elements.append(Paragraph(paragraph_2, body_style))
    elements.append(Spacer(1, 40))

    signature = tr_text("offer_letter_signature", company_name=company.name)
    elements.append(Paragraph(signature, body_style))
    
    footer_func = create_footer(company, request, is_arabic, font_reg)
    doc.build(elements, onFirstPage=footer_func, onLaterPages=footer_func)
    
    buffer.seek(0)
    raw_filename = f"{_('offer_letter_filename_prefix', request)}_{candidate.first_name}_{candidate.last_name}.pdf"
    safe_filename = urllib.parse.quote(raw_filename)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )

# ==========================================
# 🧠 MANUEL YAPAY ZEKA (GEMINI) ANALİZ ROTASI
# ==========================================
@router.get("/candidates/{candidate_id}/analyze")
def analyze_candidate_cv(candidate_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    candidate = db.query(Candidate).options(joinedload(Candidate.job_posting)).filter(
        Candidate.id == candidate_id, 
        Candidate.company_id == current_user["company_id"]
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
        
    if not candidate.cv_url:
        raise HTTPException(status_code=400, detail=_("candidate_no_cv", request))
        
    if not HR_AGENT_URL:
        raise HTTPException(status_code=500, detail=_("gemini_api_missing", request))

    file_name = candidate.cv_url.split("/")[-1]
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=_("cv_file_not_found", request))
        
    cv_text = extract_text_from_pdf(file_path)
    
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail=_("pdf_text_extract_error", request))
        
    try:
        job_title = candidate.job_posting.title if candidate.job_posting else "Belirtilmemiş"
        job_desc = candidate.job_posting.description if candidate.job_posting and candidate.job_posting.description else "Genel Başvuru"

        headers = {"X-Agent-Secret": HR_AGENT_SECRET} if HR_AGENT_SECRET else {}
        ai_response = req_lib.post(
            f"{HR_AGENT_URL}/api/v1/cv/evaluate",
            json={
                "cv_text": cv_text,
                "job_title": job_title,
                "job_description": job_desc,
                "candidate_id": candidate.id,
            },
            headers=headers,
            timeout=120.0,
        )
        ai_response.raise_for_status()
        ai_data = ai_response.json()

        candidate.rating = ai_data.get("score", 0)
        candidate.notes = f"🤖 AI Değerlendirmesi: {ai_data.get('summary', '')}"
        candidate.hr_rating_communication = ai_data.get("communication", 0)
        candidate.hr_rating_technical = ai_data.get("technical", 0)
        candidate.hr_rating_culture = ai_data.get("culture", 0)
        candidate.hr_rating_motivation = ai_data.get("motivation", 0)
        candidate.hr_notes_pros = ai_data.get("pros", "")
        candidate.hr_notes_cons = ai_data.get("cons", "")
        candidate.hr_notes_overall = ai_data.get("overall", "")
        db.commit()

        return {
            "match_score": candidate.rating,
            "summary": ai_data.get("summary", ""),
            "scorecard": {
                "communication": candidate.hr_rating_communication,
                "technical": candidate.hr_rating_technical,
                "culture": candidate.hr_rating_culture,
                "motivation": candidate.hr_rating_motivation,
            },
            "notes": {
                "pros": candidate.hr_notes_pros,
                "cons": candidate.hr_notes_cons,
                "overall": candidate.hr_notes_overall,
            },
        }

    except Exception as e:
        print(f"HR Agent Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=_("ai_analysis_error", request))
