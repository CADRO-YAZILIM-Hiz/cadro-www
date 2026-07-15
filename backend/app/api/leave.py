from fastapi import APIRouter, Depends, HTTPException, Request # 🎯 YENİ: Request eklendi
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, or_, and_
from datetime import date
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz eklendi
from app.core.email import EmailService # ✅ YENİ: Sınıf olarak import edildi
from app.core.permissions import ensure_permission, has_permission
from app.core.leave_catalog import (
    get_leave_catalog,
    get_leave_type_label,
    infer_leave_country,
    is_leave_type_allowed,
    normalize_leave_country,
    normalize_leave_type,
)
from app.core.approval_routing import (
    can_user_approve_leave,
    get_actionable_pending_leaves,
    resolve_leave_approvers,
    should_auto_approve,
)
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.core.scope import get_team_scoped_employee_ids
from app.models.leave import LeaveRequest
from app.models.employee import Employee
from app.schemas.leave import LeaveRequestCreate, LeaveRequestOut, LeaveStatusUpdate

router = APIRouter()


@router.get("/catalog")
def get_leave_catalog_endpoint(request: Request):
    accept_language = request.headers.get("accept-language")
    return get_leave_catalog(accept_language)

# --- 1. YENİ İZİN TALEBİ OLUŞTURMA (TEK ONAY SİSTEMİ & ÇAKIŞMA DÜZELTMESİ) ---
@router.post("/", response_model=dict)
def create_leave_request(
    payload: LeaveRequestCreate, 
    request: Request, # 🌍 YENİ: Dil tespiti
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    if getattr(payload, "employee_id", None):
        emp_id = int(payload.employee_id)
    else:
        emp_id = int(current_user["user_id"])

    if emp_id != int(current_user["user_id"]) and not has_permission(current_user, "leave.manage_company"):
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
    
    emp_query = db.query(Employee).filter(
        Employee.id == emp_id,
        Employee.company_id == current_user["company_id"]
    )
        
    emp = emp_query.first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
        
    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail=_("start_date_after_end_date", request))
        
    # Çakışma Kontrolü - Daha güçlü
    overlapping_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == emp_id,
        LeaveRequest.status.in_(["PENDING", "APPROVED"]),
        or_(
            and_(LeaveRequest.start_date <= payload.start_date, LeaveRequest.end_date >= payload.start_date),
            and_(LeaveRequest.start_date <= payload.end_date, LeaveRequest.end_date >= payload.end_date),
            and_(LeaveRequest.start_date >= payload.start_date, LeaveRequest.end_date <= payload.end_date)
        )
    ).all()
    
    if overlapping_leaves:
        overlap_details = ", ".join([f"{l.start_date} - {l.end_date}" for l in overlapping_leaves])
        raise HTTPException(
            status_code=400, 
            detail=_("overlapping_leave_error", request).format(overlaps=overlap_details)
        )

    leave_type = normalize_leave_type(payload.leave_type)
    leave_country = normalize_leave_country(
        getattr(payload, "leave_country", None),
        fallback=infer_leave_country(leave_type),
    )
    if not is_leave_type_allowed(leave_country, leave_type):
        raise HTTPException(status_code=400, detail="Selected leave type is not valid for this country profile.")

    approvers = resolve_leave_approvers(db, emp.company_id, emp)
    initial_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"

    new_request = LeaveRequest(
        company_id=emp.company_id, 
        employee_id=emp_id,
        leave_country=leave_country,
        leave_type=leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=payload.total_days,
        reason=payload.reason,
        status=initial_status
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    if initial_status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.LEAVE_CREATED,
            {
                "company_id": emp.company_id,
                "entity_id": new_request.id,
                "subject_employee_id": emp.id,
                "subject_employee_name": f"{emp.first_name} {emp.last_name}".strip(),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
            },
        )

    # 📧 E-POSTA BİLDİRİMLERİ 
    if initial_status == "PENDING":
        for approver in approvers:
            if not approver.email:
                continue
            html = f"""
            <h3 style="color:#0ea5e9;">Yeni İzin Talebi Onayınızı Bekliyor ⏳</h3>
            <p><strong>{emp.first_name} {emp.last_name}</strong>, {payload.start_date} - {payload.end_date} tarihleri arasında {payload.total_days} gün izin talep etti.</p>
            <p>Lütfen sisteme giriş yaparak talebi değerlendirin.</p>
            """
            EmailService.send_operational_email(approver.email, "İzin Talebi Onayı Bekleniyor", html)

    if initial_status == "APPROVED":
         return {"message": _("leave_auto_approved", request)}
         
    return {"message": _("leave_created_pending", request)}

# --- 2. TÜM İZİN TALEPLERİNİ LİSTELE ---
@router.get("/")
@router.get("/list")
def get_leave_requests(request: Request, status: str = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "leaves.view_workspace", request)
    query = db.query(LeaveRequest).options(joinedload(LeaveRequest.employee)).filter(
        LeaveRequest.company_id == current_user["company_id"]
    )

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(LeaveRequest.employee_id == current_user["user_id"])
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(LeaveRequest.employee_id.in_(employee_ids))
            
    if status:
        query = query.filter(LeaveRequest.status == status)
        
    requests = query.order_by(LeaveRequest.created_at.desc()).all()

    if current_user["role"] in ["MANAGER", "HR", "ADMIN", "SUPERADMIN"] and status == "PENDING":
        requests = [req for req in requests if can_user_approve_leave(db, req, current_user, req.employee)]
    
    result = []
    for req in requests:
        result.append({
            "id": req.id,
            "employee_id": req.employee_id,
            "first_name": req.employee.first_name if req.employee else _("unknown_employee", request),
            "last_name": req.employee.last_name if req.employee else "",
            "leave_country": req.leave_country or infer_leave_country(req.leave_type),
            "leave_type": req.leave_type,
            "leave_type_label": get_leave_type_label(
                req.leave_type,
                req.leave_country,
                request.headers.get("accept-language"),
            ),
            "start_date": req.start_date,
            "end_date": req.end_date,
            "total_days": req.total_days,
            "reason": req.reason,
            "status": req.status,
            "created_at": req.created_at
        })
    return result

# --- 3. İZİN ONAYLA / REDDET (TEK ONAY SİSTEMİ) ---
@router.put("/{request_id}/status")
def update_leave_status(
    request_id: int, 
    payload: LeaveStatusUpdate, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "leave.manage_company", request)
        
    query = db.query(LeaveRequest).options(joinedload(LeaveRequest.employee)).filter(
        LeaveRequest.id == request_id,
        LeaveRequest.company_id == current_user["company_id"]
    )
        
    req = query.first()
    
    if not req:
        raise HTTPException(status_code=404, detail=_("leave_not_found", request))
        
    if req.employee_id == current_user["user_id"] and payload.status == "APPROVED":
        if current_user["role"] != "SUPERADMIN":
            raise HTTPException(status_code=400, detail=_("cannot_approve_own_leave", request))
    
    if not can_user_approve_leave(db, req, current_user, req.employee):
        raise HTTPException(status_code=403, detail=_("unauthorized_approve_leave", request))

    if payload.status == "REJECTED":
        req.status = "REJECTED"
        req.approved_by = current_user["user_id"]
        if hasattr(payload, 'rejection_reason'):
            req.rejection_reason = payload.rejection_reason
        db.commit()
        dispatch_push_event(
            db,
            PushEventType.LEAVE_REJECTED,
            {
                "company_id": req.company_id,
                "entity_id": req.id,
                "subject_employee_id": req.employee_id,
                "subject_employee_name": f"{req.employee.first_name} {req.employee.last_name}".strip() if req.employee else None,
                "actor_employee_id": current_user["user_id"],
            },
        )
        
        if req.employee and req.employee.email:
            html = f"""<h3 style="color:#e11d48;">İzin Talebiniz Reddedildi ❌</h3>
            <p>{req.start_date} - {req.end_date} tarihleri arasındaki talebiniz uygun görülmemiştir.</p>"""
            EmailService.send_operational_email(req.employee.email, "İzin Talebiniz Reddedildi", html) # ✅ DÜZELTİLDİ
            
        return {"message": _("leave_rejected", request)}

    if payload.status == "APPROVED":
        req.status = "APPROVED"
        req.approved_by = current_user["user_id"]
        db.commit()
        dispatch_push_event(
            db,
            PushEventType.LEAVE_APPROVED,
            {
                "company_id": req.company_id,
                "entity_id": req.id,
                "subject_employee_id": req.employee_id,
                "subject_employee_name": f"{req.employee.first_name} {req.employee.last_name}".strip() if req.employee else None,
                "actor_employee_id": current_user["user_id"],
            },
        )
        
        if req.employee and req.employee.email:
            html = f"""<h3 style="color:#10b981;">İzniniz Onaylandı! 🏖️</h3>
            <p>Tebrikler! {req.start_date} - {req.end_date} tarihleri arasındaki izin talebiniz yetkililerce onaylanmıştır.</p>
            <p>İyi dinlenmeler dileriz.</p>"""
            EmailService.send_operational_email(req.employee.email, "İzniniz Onaylandı! 🎉", html) # ✅ DÜZELTİLDİ
            
        return {"message": _("leave_approved", request)}

    req.status = payload.status
    db.commit()
    return {"message": _("leave_status_updated", request).format(status=payload.status)}
    
# --- 4. İK İÇİN: PERSONEL BU YIL NE KADAR İZİN KULLANDI? ---
@router.get("/summary/{employee_id}")
def get_employee_leave_summary(
    employee_id: int, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "leaves.view_workspace", request)
    if current_user["user_id"] != employee_id and not has_permission(current_user, "leave.manage_company"):
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
    current_year = date.today().year
    
    query = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == "APPROVED",
        extract('year', LeaveRequest.start_date) == current_year
    )
    
    query = query.filter(LeaveRequest.company_id == current_user["company_id"])
        
    approved_requests = query.all()
    
    total_used_days = sum(req.total_days for req in approved_requests)
    
    breakdown = {}
    breakdown_items = {}
    for req in approved_requests:
        breakdown[req.leave_type] = breakdown.get(req.leave_type, 0) + req.total_days
        bucket_key = f"{req.leave_country or infer_leave_country(req.leave_type)}::{req.leave_type}"
        if bucket_key not in breakdown_items:
            breakdown_items[bucket_key] = {
                "leave_country": req.leave_country or infer_leave_country(req.leave_type),
                "leave_type": req.leave_type,
                "leave_type_label": get_leave_type_label(
                    req.leave_type,
                    req.leave_country,
                    request.headers.get("accept-language"),
                ),
                "total_days": 0,
            }
        breakdown_items[bucket_key]["total_days"] += req.total_days
        
    return {
        "year": current_year,
        "total_used_days": total_used_days,
        "breakdown": breakdown,
        "breakdown_items": list(breakdown_items.values()),
    }
