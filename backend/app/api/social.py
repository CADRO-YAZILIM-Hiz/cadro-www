from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.models.social import MoodLog, Kudos
from app.models.employee import Employee

router = APIRouter()


class MoodCreate(BaseModel):
    mood: str
    note: str = None


class KudosCreate(BaseModel):
    receiver_id: int
    badge: str
    message: str = None


@router.post("/mood")
def log_mood(req: MoodCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    existing = db.query(MoodLog).filter(
        MoodLog.employee_id == current_user["user_id"],
        MoodLog.date == date.today()
    ).first()

    if existing:
        existing.mood = req.mood
        existing.note = req.note
    else:
        new_mood = MoodLog(
            company_id=current_user["company_id"],
            employee_id=current_user["user_id"],
            mood=req.mood,
            note=req.note
        )
        db.add(new_mood)

    db.commit()
    return {"message": _("mood_logged_success", request)}


@router.get("/mood/today")
def get_today_mood(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    mood = db.query(MoodLog).filter(
        MoodLog.employee_id == current_user["user_id"],
        MoodLog.date == date.today()
    ).first()
    return {"mood": mood.mood if mood else None}


@router.post("/kudos")
def send_kudos(req: KudosCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if req.receiver_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail=_("cannot_send_kudos_to_self", request))

    receiver_emp = db.query(Employee).filter(
        Employee.id == req.receiver_id,
        Employee.company_id == current_user["company_id"],
        Employee.status == "ACTIVE"
    ).first()

    if not receiver_emp:
        raise HTTPException(status_code=404, detail=_("kudos_receiver_not_found", request))

    new_kudos = Kudos(
        company_id=current_user["company_id"],
        sender_id=current_user["user_id"],
        receiver_id=req.receiver_id,
        badge=req.badge,
        message=req.message
    )
    db.add(new_kudos)
    db.commit()
    return {"message": _("kudos_sent_success", request)}


@router.get("/kudos/feed")
def get_kudos_feed(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    feed = (
        db.query(Kudos)
        .options(joinedload(Kudos.sender), joinedload(Kudos.receiver))
        .filter(Kudos.company_id == current_user["company_id"])
        .order_by(Kudos.created_at.desc())
        .limit(10)
        .all()
    )

    result = []
    for k in feed:
        result.append({
            "id": k.id,
            "sender": f"{k.sender.first_name} {k.sender.last_name}" if k.sender else _("unknown_user", request),
            "receiver": f"{k.receiver.first_name} {k.receiver.last_name}" if k.receiver else _("unknown_user", request),
            "badge": k.badge,
            "message": k.message,
            "time": k.created_at.strftime("%d.%m.%Y %H:%M")
        })
    return result


@router.get("/colleagues")
def get_colleagues(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emps = (
        db.query(Employee)
        .options(joinedload(Employee.department_rel))
        .filter(
            Employee.company_id == current_user["company_id"],
            Employee.status == "ACTIVE",
            Employee.id != current_user["user_id"]
        )
        .all()
    )

    return [
        {
            "id": e.id,
            "name": f"{e.first_name} {e.last_name}",
            "department": e.department_rel.name if e.department_rel else "-"
        }
        for e in emps
    ]
