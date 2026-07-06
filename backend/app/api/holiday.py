from fastapi import APIRouter, Depends, HTTPException, Request # 🎯 YENİ: Request eklendi
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date
from typing import Optional, List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz eklendi
from app.core.permissions import ensure_permission
from app.models.holiday import Holiday

router = APIRouter()

@router.post("/add")
def add_holiday(
    name: str,
    holiday_date: date,
    request: Request, # 🌍 YENİ: Dil tespiti
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "company.settings.manage", request)
    company_id = current_user["company_id"]

    existing = db.query(Holiday).filter(
        Holiday.company_id == company_id,
        Holiday.holiday_date == holiday_date,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu tarih için resmi tatil zaten kayıtlı.")

    h = Holiday(
        company_id=company_id,
        name=name,
        holiday_date=holiday_date,
    )
    db.add(h)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bu tarih için resmi tatil zaten kayıtlı.")
    db.refresh(h)

    return {"message": _("holiday_added", request), "holiday_id": h.id}

@router.get("/list")
def list_holidays(
    request: Request, # 🌍 YENİ: Dil tespiti
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "company.settings.manage", request)
    company_id = current_user["company_id"]

    q = db.query(Holiday).filter(Holiday.company_id == company_id)

    # İstersen yıla göre filtre
    if year:
        q = q.filter(
            Holiday.holiday_date >= date(year, 1, 1),
            Holiday.holiday_date <= date(year, 12, 31),
        )

    return q.order_by(Holiday.holiday_date.asc()).all()
