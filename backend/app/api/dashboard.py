from datetime import date, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.approval_routing import (
    get_actionable_pending_documents,
    get_actionable_pending_leaves,
)
from app.core.scope import get_team_scoped_employee_ids
from app.models.announcement import Announcement
from app.models.document import EmployeeDocument
from app.models.employee import Department, Employee
from app.models.leave import LeaveRequest
from app.models.training import Training

router = APIRouter()

WEATHER_TIMEOUT_SECONDS = 5


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "NORMAL"
    expires_at: date = None


# ==========================================
# 📢 DUYURU ROTALARI (GÜVENLİ)
# ==========================================
@router.post("/announcement")
def create_announcement(req: AnnouncementCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_announcement_create", request))

    comp_id = current_user["company_id"]
    new_ann = Announcement(
        company_id=comp_id,
        title=req.title,
        content=req.content,
        priority=req.priority,
        expires_at=req.expires_at
    )
    db.add(new_ann)
    db.commit()
    return {"message": _("announcement_created", request)}


@router.delete("/announcement/{ann_id}")
def delete_announcement(ann_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_announcement_delete", request))

    comp_id = current_user["company_id"]
    ann = db.query(Announcement).filter(
        Announcement.id == ann_id,
        Announcement.company_id == comp_id
    ).first()

    if not ann:
        raise HTTPException(status_code=404, detail=_("announcement_not_found", request))

    db.delete(ann)
    db.commit()
    return {"message": _("announcement_deleted", request)}


# ==========================================
# 🌤️ CANLI HAVA DURUMU RADARI (🌍 GLOBAL SAAS VERSİYONU)
# ==========================================
@router.get("/weather")
def get_live_weather(request: Request, city: str = "Istanbul", current_user: dict = Depends(get_current_user)):
    try:
        # 1. Adım: Şehir ismini global koordinatlara (Lat/Lon) çevir
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
        geo_resp = requests.get(geo_url, timeout=WEATHER_TIMEOUT_SECONDS)

        geo_json = geo_resp.json() if geo_resp.status_code == 200 else {}
        if geo_resp.status_code != 200 or not geo_json.get("results"):
            return {
                "city": city.capitalize(),
                "temp": "-",
                "condition": _("location_not_found", request),
                "icon_type": "CLOUDY"
            }

        geo_data = geo_json["results"][0]
        lat = geo_data["latitude"]
        lon = geo_data["longitude"]
        actual_city = geo_data["name"]

        # 2. Adım: Koordinatlardan anlık hava durumunu çek
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&temperature_unit=celsius"
        weather_resp = requests.get(weather_url, timeout=WEATHER_TIMEOUT_SECONDS)

        if weather_resp.status_code != 200:
            raise Exception(_("weather_api_error", request))

        data = weather_resp.json()
        temp = data["current_weather"]["temperature"]
        code = data["current_weather"]["weathercode"]

        # WMO Weather interpretation codes (Translated)
        if code in [0, 1]:
            condition, icon = _("weather_sunny", request), "SUNNY"
        elif code in [2, 3]:
            condition, icon = _("weather_partly_cloudy", request), "CLOUDY"
        elif code in [45, 48]:
            condition, icon = _("weather_foggy", request), "CLOUDY"
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
            condition, icon = _("weather_rainy", request), "RAINY"
        elif code in [71, 73, 75, 85, 86]:
            condition, icon = _("weather_snowy", request), "SNOWY"
        elif code in [95, 96, 99]:
            condition, icon = _("weather_stormy", request), "RAINY"
        else:
            condition, icon = _("weather_unknown", request), "CLOUDY"

        return {
            "city": actual_city,
            "temp": round(temp),
            "condition": condition,
            "icon_type": icon
        }
    except Exception:
        return {
            "city": city.capitalize(),
            "temp": "-",
            "condition": _("connection_error", request),
            "icon_type": "CLOUDY"
        }


# ==========================================
# 📊 KOKPİT ÖZETİ (SUMMARY - ROL BAZLI)
# ==========================================
@router.get("/summary")
def get_dashboard_full(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    today = date.today()
    comp_id = current_user["company_id"]
    role = current_user.get("role")
    scoped_employee_ids = None
    if role == "MANAGER":
        scoped_employee_ids = get_team_scoped_employee_ids(db, current_user)

    # Frontend tarafında dashboard HR_AND_UP için de kullanılıyor.
    is_admin = current_user["role"] in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]

    # 1. ORTAK VERİLER (Herkes görebilir)
    announcements = db.query(Announcement).filter(
        Announcement.company_id == comp_id,
        or_(Announcement.expires_at.is_(None), Announcement.expires_at >= today)
    ).order_by(Announcement.created_at.desc()).limit(5).all()

    upcoming_trainings = db.query(Training).filter(
        Training.company_id == comp_id,
        Training.status == "SCHEDULED",
        Training.training_date >= today
    ).order_by(Training.training_date.asc(), Training.training_time.asc()).limit(4).all()

    trainings_data = [
        {
            "id": t.id,
            "title": t.title,
            "instructor": t.instructor,
            "date": t.training_date.strftime("%d.%m.%Y"),
            "time": t.training_time.strftime("%H:%M"),
            "days_left": (t.training_date - today).days
        }
        for t in upcoming_trainings
    ]

    active_emps = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel)
    ).filter(
        Employee.company_id == comp_id,
        Employee.status == "ACTIVE"
    )
    if scoped_employee_ids is not None:
        active_emps = active_emps.filter(Employee.id.in_(scoped_employee_ids))
    active_emps = active_emps.all()

    upcoming_birthdays = []
    for emp in active_emps:
        if emp.birth_date:
            try:
                next_bday = emp.birth_date.replace(year=today.year)
            except ValueError:
                next_bday = emp.birth_date.replace(year=today.year, month=3, day=1)

            if next_bday < today:
                try:
                    next_bday = next_bday.replace(year=today.year + 1)
                except ValueError:
                    next_bday = next_bday.replace(year=today.year + 1, month=3, day=1)

            days_until = (next_bday - today).days
            if days_until <= 15:
                dept_name = emp.department_rel.name if emp.department_rel else _("general_department", request)
                upcoming_birthdays.append({
                    "id": emp.id,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "department": dept_name,
                    "days_left": days_until,
                    "date_str": next_bday.strftime("%d.%m")
                })

    upcoming_birthdays.sort(key=lambda x: x["days_left"])

    # Yeni İşe Başlayanlar
    thirty_days_ago = today - timedelta(days=30)
    new_hires = db.query(Employee).options(joinedload(Employee.position_rel)).filter(
        Employee.company_id == comp_id,
        Employee.status == "ACTIVE",
        Employee.hire_date >= thirty_days_ago
    ).order_by(Employee.hire_date.desc()).limit(10).all()

    # 2. YÖNETİCİYE ÖZEL VERİLER (Sadece yetkililer görür)
    cards_data = {"total_employees": 0, "on_leave_today": 0, "pending_leaves": 0}
    pending_documents_data = []
    dept_dist_data = []

    if is_admin:
        cards_data["total_employees"] = len(active_emps)

        cards_data["on_leave_today"] = db.query(LeaveRequest).join(
            Employee, LeaveRequest.employee_id == Employee.id
        ).filter(
            Employee.company_id == comp_id,
            LeaveRequest.status == "APPROVED",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        )
        if scoped_employee_ids is not None:
            cards_data["on_leave_today"] = cards_data["on_leave_today"].filter(LeaveRequest.employee_id.in_(scoped_employee_ids)).count()
        else:
            cards_data["on_leave_today"] = cards_data["on_leave_today"].count()

        cards_data["pending_leaves"] = len(get_actionable_pending_leaves(db, current_user))

        pending_documents = get_actionable_pending_documents(db, current_user)[:10]

        pending_documents_data = [
            {
                "id": d.id,
                "employee_id": d.employee_id,
                "employee_name": f"{d.employee.first_name} {d.employee.last_name}" if d.employee else _("unknown_employee", request),
                "document_type": d.document_type,
                "file_name": d.file_name
            }
            for d in pending_documents
        ]

        # Departman Dağılım Grafiği
        dept_dist = db.query(Department.name, func.count(Employee.id)).outerjoin(
            Employee, Employee.department_id == Department.id
        ).filter(
            Employee.company_id == comp_id,
            Employee.status == "ACTIVE"
        )
        if scoped_employee_ids is not None:
            dept_dist = dept_dist.filter(Employee.id.in_(scoped_employee_ids))
        dept_dist = dept_dist.group_by(Department.name).all()

        dept_dist_data = [
            {"name": d[0] or _("unspecified_department", request), "value": d[1]}
            for d in dept_dist
        ]

    # 3. YANIT DÖNDÜR
    return {
        "cards": cards_data,
        "charts": {
            "trend": [],
            "departments": dept_dist_data
        },
        "social": {
            "announcements": [
                {
                    "id": a.id,
                    "title": a.title,
                    "content": a.content,
                    "priority": a.priority,
                    "date": a.created_at.strftime("%d.%m.%Y")
                }
                for a in announcements
            ],
            "new_hires": [
                {
                    "id": e.id,
                    "name": f"{e.first_name} {e.last_name}",
                    "position": e.position_rel.title if e.position_rel else _("new_starter", request),
                    "hire_date": e.hire_date.strftime("%d.%m.%Y")
                }
                for e in new_hires
            ],
            "birthdays": upcoming_birthdays,
            "trainings": trainings_data
        },
        "pending_documents": pending_documents_data
    }
