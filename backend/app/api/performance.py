import os
import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException, Request # 🎯 YENİ: Request eklendi
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user 
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz eklendi
from app.core.plan_features import plan_feature_required

from app.models.performance import Goal, PerformanceReview
from app.models.employee import Employee
from app.schemas.performance import (
    GoalCreate, GoalOut, GoalProgressUpdate, 
    ReviewCreate, ReviewOut, PerformanceAnalysisOut
)

router = APIRouter(dependencies=[Depends(plan_feature_required("enterprise.performance"))])

# --- YENİ EKLENEN ŞEMALAR (Korundu) ---
class GoalUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: date

class ReviewUpdate(BaseModel):
    review_period: str
    rating: float
    comments: Optional[str] = None
    review_type: str

# --- YAPAY ZEKA AYARLARI ---
GEMINI_API_KEY = settings.GEMINI_API_KEY
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ==========================================
# 🎯 1. OKR (HEDEF) ROTALARI
# ==========================================
@router.post("/goals", response_model=GoalOut)
def create_goal(req: GoalCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != req.employee_id:
        raise HTTPException(status_code=403, detail=_("create_own_goal_only", request))

    emp = db.query(Employee).filter(Employee.id == req.employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    
    new_goal = Goal(
        company_id=emp.company_id, employee_id=emp.id, title=req.title,
        description=req.description, due_date=req.due_date
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.get("/goals/{employee_id}", response_model=List[GoalOut])
def get_employee_goals(employee_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    return db.query(Goal).filter(Goal.employee_id == employee_id, Goal.company_id == current_user["company_id"]).all()

@router.put("/goals/{goal_id}/progress")
def update_goal_progress(goal_id: int, req: GoalProgressUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.company_id == current_user["company_id"]).first()
    if not goal: raise HTTPException(status_code=404, detail=_("goal_not_found", request))
    
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != goal.employee_id:
        raise HTTPException(status_code=403, detail=_("unauthorized_update_goal_progress", request))
    
    goal.progress = max(0, min(req.progress, 100))
    goal.status = "COMPLETED" if goal.progress == 100 else ("IN_PROGRESS" if goal.progress > 0 else "TODO")
    db.commit()
    return {"message": _("progress_updated", request), "progress": goal.progress, "status": goal.status}

@router.put("/goals/{goal_id}")
def update_goal(goal_id: int, req: GoalUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.company_id == current_user["company_id"]).first()
    if not goal: raise HTTPException(status_code=404, detail=_("goal_not_found", request))
    
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != goal.employee_id:
        raise HTTPException(status_code=403, detail=_("unauthorized_edit_goal", request))

    goal.title = req.title
    goal.description = req.description
    goal.due_date = req.due_date
    db.commit()
    return {"message": _("goal_updated", request)}

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.company_id == current_user["company_id"]).first()
    if not goal: raise HTTPException(status_code=404, detail=_("goal_not_found", request))
    
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != goal.employee_id:
        raise HTTPException(status_code=403, detail=_("unauthorized_delete_goal", request))

    db.delete(goal)
    db.commit()
    return {"message": _("goal_deleted", request)}

# ==========================================
# 🔄 2. 360 DERECE DEĞERLENDİRME ROTALARI
# ==========================================
@router.post("/reviews", response_model=ReviewOut)
def create_review(req: ReviewCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == req.employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("review_employee_not_found", request))
    
    if req.review_type != "SELF_REVIEW" and current_user["user_id"] == req.employee_id:
        raise HTTPException(status_code=400, detail=_("cannot_self_review", request))

    new_review = PerformanceReview(
        company_id=emp.company_id, 
        employee_id=req.employee_id, 
        reviewer_id=current_user["user_id"],
        review_period=req.review_period, 
        rating=max(0.0, min(req.rating, 5.0)), 
        comments=req.comments, 
        review_type=req.review_type
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/reviews/{employee_id}", response_model=List[ReviewOut])
def get_employee_reviews(employee_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    return db.query(PerformanceReview).filter(
        PerformanceReview.employee_id == employee_id, 
        PerformanceReview.company_id == current_user["company_id"]
    ).all()

@router.put("/reviews/{review_id}")
def update_review(review_id: int, req: ReviewUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id, PerformanceReview.company_id == current_user["company_id"]).first()
    if not review: raise HTTPException(status_code=404, detail=_("review_not_found", request))
    
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != review.reviewer_id:
        raise HTTPException(status_code=403, detail=_("unauthorized_edit_review", request))

    review.review_period = req.review_period
    review.rating = max(0.0, min(req.rating, 5.0))
    review.comments = req.comments
    review.review_type = req.review_type
    db.commit()
    return {"message": _("review_updated", request)}

@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id, PerformanceReview.company_id == current_user["company_id"]).first()
    if not review: raise HTTPException(status_code=404, detail=_("review_not_found", request))
    
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != review.reviewer_id:
        raise HTTPException(status_code=403, detail=_("unauthorized_delete_review", request))

    db.delete(review)
    db.commit()
    return {"message": _("review_deleted", request)}

# ==========================================
# 🧠 3. YAPAY ZEKA & 9-BOX MATRİS ANALİZİ
# ==========================================
@router.get("/analysis/{employee_id}", response_model=PerformanceAnalysisOut)
def get_ai_performance_analysis(employee_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
         raise HTTPException(status_code=403, detail=_("unauthorized_ai_analysis", request))

    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    goals = db.query(Goal).filter(
        Goal.employee_id == employee_id,
        Goal.company_id == current_user["company_id"]
    ).all()
    avg_progress = sum(g.progress for g in goals) / len(goals) if goals else 0.0

    reviews = db.query(PerformanceReview).filter(
        PerformanceReview.employee_id == employee_id,
        PerformanceReview.company_id == current_user["company_id"]
    ).all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0

    nine_box = _("nine_box_unknown", request)
    if avg_progress >= 80 and avg_rating >= 4.0: nine_box = _("nine_box_1", request)
    elif avg_progress >= 80 and avg_rating >= 2.5: nine_box = _("nine_box_2", request)
    elif avg_progress >= 50 and avg_rating >= 4.0: nine_box = _("nine_box_3", request)
    elif avg_progress >= 50 and avg_rating >= 2.5: nine_box = _("nine_box_5", request)
    elif avg_progress < 50 and avg_rating < 2.5: nine_box = _("nine_box_9", request)
    else: nine_box = _("nine_box_development", request)

    ai_summary = _("not_enough_data_for_evaluation", request)
    
    if (goals or reviews) and GEMINI_API_KEY:
        try:
            # Kullanıcının tarayıcı dilini tespit edip AI'a bildiriyoruz (örn: "en", "de", "tr", "ar")
            browser_lang = request.headers.get("Accept-Language", "tr").split(",")[0]
            
            prompt = f"""
            Sen uzman bir İnsan Kaynakları (İK) Analisti ve Yönetim Danışmanısın.
            Personel Adı: {emp.first_name} {emp.last_name}
            Hedef Gerçekleştirme (OKR) Başarısı: %{avg_progress:.1f}
            360 Derece Kültür/Davranış Puanı: {avg_rating:.1f} / 5.0
            Sistemin atadığı 9-Box Matris Konumu: {nine_box}
            Lütfen C-Level yöneticiler için bu personelin durumunu özetleyen kısa (3-4 cümlelik) net, profesyonel bir karar destek raporu yaz.
            Lütfen raporu kesinlikle '{browser_lang}' dilinde (tarayıcı dili) yaz. (Örneğin tarayıcı dili 'en' ise İngilizce, 'de' ise Almanca, 'ar' ise Arapça).
            """
            mevcut_modeller = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            secilen_model = next((m for m in mevcut_modeller if 'gemini' in m), mevcut_modeller[0])
            
            model = genai.GenerativeModel(secilen_model)
            response = model.generate_content(prompt)
            ai_summary = response.text.strip()
        except Exception as e:
            print(f"AI Analiz Hatası: {e}")
            ai_summary = _("ai_summary_failed", request)

    return PerformanceAnalysisOut(
        employee_name=f"{emp.first_name} {emp.last_name}",
        average_goal_progress=round(avg_progress, 1),
        average_review_rating=round(avg_rating, 1),
        nine_box_category=nine_box,
        ai_executive_summary=ai_summary
    )
