from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# --- OKR (HEDEF) ŞEMALARI ---
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: date

class GoalCreate(GoalBase):
    employee_id: int

class GoalProgressUpdate(BaseModel):
    progress: int

class GoalOut(GoalBase):
    id: int
    employee_id: int
    progress: int
    status: str
    start_date: date
    
    class Config:
        from_attributes = True

# --- 360 DERECE ŞEMALARI ---
class ReviewBase(BaseModel):
    review_period: str
    rating: float
    comments: Optional[str] = None
    review_type: str = "MANAGER"

class ReviewCreate(ReviewBase):
    employee_id: int
    reviewer_id: int

class ReviewOut(ReviewBase):
    id: int
    employee_id: int
    reviewer_id: int
    review_date: date
    
    class Config:
        from_attributes = True

# --- YAPAY ZEKA 9-BOX MATRİS ŞEMASI ---
class PerformanceAnalysisOut(BaseModel):
    employee_name: str
    average_goal_progress: float  # X Ekseni
    average_review_rating: float  # Y Ekseni
    nine_box_category: str
    ai_executive_summary: str