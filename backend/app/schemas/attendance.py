from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class AttendanceCreate(BaseModel):
    employee_id: int
    date: date
    status: str = "PRESENT"
    weekday_ot_hours: float = 0
    weekend_ot_hours: float = 0

class AttendanceOut(BaseModel):
    id: int
    date: date
    status: str
    approval_status: str # 🎯 YENİ: React'e onay durumunu gönderiyoruz
    weekday_ot_hours: float
    weekend_ot_hours: float

    class Config:
        from_attributes = True

# 🎯 YENİ: TOPLU ONAYLAMA ŞEMASI (İK veya Müdür tek tıkla 50 kişiyi onaylayabilsin diye)
class AttendanceApprove(BaseModel):
    record_ids: List[int]
    action: str # Beklenen değerler: "APPROVE_MANAGER", "APPROVE_HR", "REJECT"