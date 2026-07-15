# backend/app/schemas/leave.py
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class LeaveRequestCreate(BaseModel):
    employee_id: int # HR kendi eklerse diye, personel girerse token'dan alınacak
    leave_country: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str] = None

class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    first_name: str
    last_name: str
    leave_country: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class LeaveStatusUpdate(BaseModel):
    status: str # APPROVED veya REJECTED
