from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Query, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date, timedelta
import pandas as pd
from typing import Optional
from math import radians, cos, sin, asin, sqrt
from pydantic import BaseModel

from app.core.database import get_db
# 🔥 YENİ: RoleChecker'ı import ettik
from app.core.dependencies import get_current_user, RoleChecker 
from app.core.i18n import _
from app.core.scope import get_team_scoped_employee_ids
from app.models.attendance import Attendance
from app.models.company import Company, Location
from app.models.leave import LeaveRequest
from app.schemas.attendance import AttendanceCreate, AttendanceOut, AttendanceApprove
from app.models.employee import Employee 
from app.services.work_schedule_service import evaluate_attendance_record, resolve_effective_schedule

router = APIRouter()


def normalize_column_name(name: str) -> str:
    if name is None:
        return ""
    normalized = str(name).strip().lower()
    replacements = {
        "ı": "i",
        "İ": "i",
        "ş": "s",
        "Ş": "s",
        "ğ": "g",
        "Ğ": "g",
        "ü": "u",
        "Ü": "u",
        "ö": "o",
        "Ö": "o",
        "ç": "c",
        "Ç": "c",
    }
    for old, new in replacements.items():
        normalized = normalized.replace(old, new)
    normalized = normalized.replace(" ", "_").replace("-", "_").replace("/", "_")
    return normalized

# ==========================================
# 🛡️ YETKİ TURNİKELERİ (RBAC)
# ==========================================
allow_all = RoleChecker(["OWNER", "SUPERADMIN", "ADMIN", "HR", "MANAGER", "EMPLOYEE"])
allow_hr_manager = RoleChecker(["OWNER", "SUPERADMIN", "ADMIN", "HR", "MANAGER"])
allow_admin = RoleChecker(["OWNER", "SUPERADMIN", "ADMIN", "HR"])

# ==========================================
# 🛡️ JSON VERİLERİ İÇİN PYDANTIC ŞEMALARI
# ==========================================
class ClockInRequest(BaseModel):
    latitude: float
    longitude: float
    qr_data: str

class ClockOutRequest(BaseModel):
    latitude: float
    longitude: float
    qr_data: str


class SickReportCreate(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    report_no: Optional[str] = None
    issued_by: Optional[str] = None
    issue_date: Optional[date] = None
    payroll_treatment: str = "FULL_PAY"
    decision_note: Optional[str] = None

# ==========================================
# 📐 YARDIMCI FONKSİYON: HAVERSINE (MESAFE HESAPLAMA)
# ==========================================
def calculate_distance(lat1, lon1, lat2, lon2):
    try:
        R = 6371000 
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        return 2 * asin(sqrt(a)) * R
    except Exception:
        return 999999 


def parse_qr_payload(qr_data: str, request: Request) -> tuple[int, str]:
    if not qr_data:
        raise HTTPException(status_code=400, detail=_("qr_required_for_attendance", request))

    try:
        parts = dict(item.split(":", 1) for item in qr_data.split("|"))
        loc_id = int(parts.get("LOC_ID", 0))
        token = parts.get("TOKEN", "")
    except Exception:
        raise HTTPException(status_code=400, detail=_("invalid_qr_format", request))

    if not loc_id or not token:
        raise HTTPException(status_code=400, detail=_("invalid_qr_format", request))

    return loc_id, token


def validate_qr_location_access(
    db: Session,
    company_id: int,
    latitude: float,
    longitude: float,
    qr_data: str,
    request: Request
) -> str:
    loc_id, token = parse_qr_payload(qr_data, request)

    location = db.query(Location).filter(
        Location.id == loc_id,
        Location.company_id == company_id,
        Location.is_active == True
    ).first()

    if not location or location.qr_token != token:
        raise HTTPException(status_code=400, detail=_("invalid_location_or_qr", request))

    dist = calculate_distance(latitude, longitude, location.latitude, location.longitude)
    if dist > location.allowed_radius:
        raise HTTPException(
            status_code=400,
            detail=_("too_far_from_location", request).format(distance=int(dist))
        )

    return location.name


def parse_optional_date(value: Optional[str], field_name: str, request: Request) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error=f"{field_name} is invalid."))


def iter_date_range(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def build_attendance_response(record: Attendance, request: Request, db: Session) -> dict:
    employee = record.employee
    schedule, _source = (resolve_effective_schedule(db, employee, record.date) if employee else (None, None))
    evaluation = evaluate_attendance_record(record, schedule)
    department_name = None
    if employee and getattr(employee, "department_rel", None):
        department_name = employee.department_rel.name

    return {
        "id": record.id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else _("unknown_employee", request),
        "department": department_name or _("unspecified_department", request),
        "date": record.date,
        "check_in": record.check_in.strftime("%H:%M") if record.check_in else "-",
        "check_out": record.check_out.strftime("%H:%M") if record.check_out else "-",
        "status": record.status,
        "approval_status": record.approval_status,
        "total_work_hours": float(record.total_work_hours or 0),
        "schedule_name": evaluation["schedule_name"],
        "schedule_type": evaluation["schedule_type"],
        "scheduled_start": evaluation["scheduled_start"].strftime("%H:%M") if evaluation["scheduled_start"] else None,
        "scheduled_end": evaluation["scheduled_end"].strftime("%H:%M") if evaluation["scheduled_end"] else None,
        "late_minutes": evaluation["late_minutes"],
        "early_leave_minutes": evaluation["early_leave_minutes"],
        "overtime_minutes": evaluation["overtime_minutes"],
        "violation_code": evaluation["violation_code"],
        "record_type": record.record_type or "TIME",
        "exception_type": record.exception_type,
        "payroll_treatment": record.payroll_treatment or "STANDARD",
        "include_in_payroll": bool(record.include_in_payroll) if record.include_in_payroll is not None else True,
        "payroll_decision_note": record.payroll_decision_note,
        "supporting_document_no": record.supporting_document_no,
        "issued_by": record.issued_by,
        "issue_date": record.issue_date,
        "range_start_date": record.range_start_date,
        "range_end_date": record.range_end_date,
    }


def build_self_attendance_response(record: Attendance, request: Request, db: Session) -> dict:
    employee = record.employee
    schedule, _source = (resolve_effective_schedule(db, employee, record.date) if employee else (None, None))
    evaluation = evaluate_attendance_record(record, schedule)

    response = {
        "id": record.id,
        "date": record.date,
        "check_in": record.check_in.strftime("%H:%M") if record.check_in else "-",
        "check_out": record.check_out.strftime("%H:%M") if record.check_out else "-",
        "status": record.status,
        "total_work_hours": float(record.total_work_hours or 0),
        "schedule_name": evaluation["schedule_name"],
        "schedule_type": evaluation["schedule_type"],
        "scheduled_start": evaluation["scheduled_start"].strftime("%H:%M") if evaluation["scheduled_start"] else None,
        "scheduled_end": evaluation["scheduled_end"].strftime("%H:%M") if evaluation["scheduled_end"] else None,
        "late_minutes": evaluation["late_minutes"],
        "early_leave_minutes": evaluation["early_leave_minutes"],
        "overtime_minutes": evaluation["overtime_minutes"],
        "violation_code": evaluation["violation_code"],
        "record_type": record.record_type or "TIME",
        "exception_type": record.exception_type,
        "payroll_treatment": record.payroll_treatment or "STANDARD",
        "include_in_payroll": bool(record.include_in_payroll) if record.include_in_payroll is not None else True,
        "supporting_document_no": record.supporting_document_no,
        "issue_date": record.issue_date,
        "range_start_date": record.range_start_date,
        "range_end_date": record.range_end_date,
    }

    if (record.record_type or "").upper() == "SICK_REPORT":
        treatment = (record.payroll_treatment or "FULL_PAY").upper()
        response["employee_visible_payroll_note"] = (
            _("attendance_self_sick_full_pay_note", request)
            if treatment == "FULL_PAY"
            else _("attendance_self_sick_deduct_note", request)
        )

    return response

# ==========================================
# 📍 1. İŞE BAŞLA (CLOCK-IN) - GPS & QR KONTROLLÜ
# ==========================================
@router.post("/clock-in")
def clock_in(
    data: ClockInRequest, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_all) # 🔥 Herkes giriş yapabilir
):
    employee_id = current_user["user_id"] 
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    
    today = date.today()
    existing = db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.date == today).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail=_("already_clocked_in_today", request))

    matched_location_name = validate_qr_location_access(
        db=db,
        company_id=current_user["company_id"],
        latitude=data.latitude,
        longitude=data.longitude,
        qr_data=data.qr_data,
        request=request
    )
    entry_source = "MOBILE_GPS"
    entry_source = "MOBILE_QR"

    now = datetime.now()
    schedule, _source = resolve_effective_schedule(db, employee, today)
    clock_in_status = "PRESENT"
    if schedule:
        evaluation_preview = evaluate_attendance_record(
            Attendance(date=today, check_in=now, check_out=None),
            schedule
        )
        if evaluation_preview["late_minutes"] > 0:
            clock_in_status = "LATE"

    new_entry = Attendance(
        company_id=current_user["company_id"],
        employee_id=employee_id,
        date=today,
        check_in=now,
        in_lat=data.latitude,
        in_long=data.longitude,
        status=clock_in_status,
        approval_status="PENDING",
        entry_source=entry_source
    )
    db.add(new_entry)
    db.commit()
    
    return {
        "message": _("clock_in_successful", request).format(location=matched_location_name), 
        "time": new_entry.check_in
    }

# ==========================================
# 🏁 2. PAYDOS ET (CLOCK-OUT)
# ==========================================
@router.post("/clock-out")
def clock_out(
    data: ClockOutRequest, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_all) # 🔥 Herkes çıkış yapabilir
):
    employee_id = current_user["user_id"]
    record = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.company_id == current_user["company_id"],
        Attendance.check_out.is_(None)
    ).order_by(Attendance.date.desc(), Attendance.id.desc()).first()
    
    if not record or not record.check_in:
        raise HTTPException(status_code=404, detail=_("clock_in_record_not_found", request))
    
    if record.check_out:
        raise HTTPException(status_code=400, detail=_("already_clocked_out", request))

    validate_qr_location_access(
        db=db,
        company_id=current_user["company_id"],
        latitude=data.latitude,
        longitude=data.longitude,
        qr_data=data.qr_data,
        request=request
    )

    now = datetime.now()
    record.check_out = now
    record.out_lat = data.latitude
    record.out_long = data.longitude
    
    diff = record.check_out - record.check_in
    total_hours = round(diff.total_seconds() / 3600, 2)
    record.total_work_hours = total_hours
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    schedule, _source = (resolve_effective_schedule(db, employee, record.date) if employee else (None, None))
    evaluation = evaluate_attendance_record(record, schedule)
    if evaluation["early_leave_minutes"] > 0 and record.status != "LATE":
        record.status = "EARLY_OUT"
    if evaluation["violation_code"] == "LATE_IN_EARLY_OUT":
        record.status = "LATE_EARLY_OUT"
    record.weekday_ot_hours = round(evaluation["overtime_minutes"] / 60, 2)
    
    db.commit()
    return {"message": _("clock_out_successful", request), "total_hours": total_hours}

# ==========================================
# 📊 3. EXCEL İLE TOPLU YÜKLEME
# ==========================================
@router.post("/bulk-upload")
async def bulk_upload(
    request: Request,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(allow_admin) # 🔥 Sadece ADMIN ve HR yükleyebilir
):
    try:
        df = pd.read_excel(file.file)
        raw_columns = list(df.columns)
        normalized_columns = {normalize_column_name(col): col for col in raw_columns}
        valid_emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.company_id == current_user["company_id"]).all()]
        employees = db.query(Employee).filter(Employee.company_id == current_user["company_id"]).all()
        employee_name_map = {
            f"{emp.first_name} {emp.last_name}".strip().lower(): emp.id
            for emp in employees
        }

        date_col = normalized_columns.get("date") or normalized_columns.get("tarih")
        employee_id_col = normalized_columns.get("employee_id") or normalized_columns.get("personel_id") or normalized_columns.get("calisan_id")
        employee_name_col = normalized_columns.get("employee_name") or normalized_columns.get("name") or normalized_columns.get("ad_soyad") or normalized_columns.get("personel")
        status_col = normalized_columns.get("status") or normalized_columns.get("durum")
        total_hours_col = normalized_columns.get("total_work_hours") or normalized_columns.get("toplam_saat")
        weekday_ot_col = normalized_columns.get("weekday_ot_hours") or normalized_columns.get("haftaici_mesai")
        weekend_ot_col = normalized_columns.get("weekend_ot_hours") or normalized_columns.get("haftasonu_mesai")

        if not date_col:
            raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="Tarih sütunu bulunamadı."))
        if not employee_id_col and not employee_name_col:
            raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="Personel ID veya Ad Soyad sütunu bulunamadı."))

        for _, row in df.iterrows():
            emp_id = None
            if employee_id_col and pd.notna(row.get(employee_id_col)):
                emp_id = int(row[employee_id_col])
            elif employee_name_col and pd.notna(row.get(employee_name_col)):
                emp_id = employee_name_map.get(str(row[employee_name_col]).strip().lower())

            if emp_id not in valid_emp_ids:
                continue 

            new_rec = Attendance(
                company_id=current_user["company_id"],
                employee_id=emp_id,
                date=pd.to_datetime(row[date_col]).date(),
                status=row.get(status_col, 'PRESENT') if status_col else 'PRESENT',
                approval_status="PENDING", 
                total_work_hours=row.get(total_hours_col, 0) if total_hours_col else 0,
                weekday_ot_hours=row.get(weekday_ot_col, 0) if weekday_ot_col else 0,
                weekend_ot_hours=row.get(weekend_ot_col, 0) if weekend_ot_col else 0
            )
            db.add(new_rec)
        db.commit()
        return {"message": _("bulk_upload_success", request)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error=str(e)))

# ==========================================
# 📋 4. TÜM PUANTAJ LİSTESİ
# ==========================================
@router.get("/list")
def list_attendance(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_hr_manager) # 🔥 Sadece İK ve Yöneticiler tüm listeyi görebilir
):
    parsed_from = parse_optional_date(from_date, "from_date", request)
    parsed_to = parse_optional_date(to_date, "to_date", request)
    query = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department_rel)
    )\
        .filter(Attendance.company_id == current_user["company_id"])

    if current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(Attendance.employee_id.in_(employee_ids))

    if parsed_from:
        query = query.filter(Attendance.date >= parsed_from)
    if parsed_to:
        query = query.filter(Attendance.date <= parsed_to)

    records = query.order_by(Attendance.date.desc()).all()
    
    return [build_attendance_response(r, request, db) for r in records]

# ==========================================
# ✅ 5. ONAY MEKANİZMASI
# ==========================================
@router.put("/approve")
def approve_attendance(
    request: Request,
    data: AttendanceApprove, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(allow_hr_manager) # 🔥 Sadece İK ve Yöneticiler onay verebilir
):
    records_query = db.query(Attendance).filter(
        Attendance.id.in_(data.record_ids), 
        Attendance.company_id == current_user["company_id"]
    )

    if current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        records_query = records_query.filter(Attendance.employee_id.in_(employee_ids))

    records = records_query.all()
    
    for r in records:
        if data.action == "APPROVE_MANAGER":
            r.approval_status = "MANAGER_APPROVED"
        elif data.action == "APPROVE_HR":
            r.approval_status = "HR_APPROVED"
        elif data.action == "REJECT":
            r.approval_status = "PENDING"
            
    db.commit()
    return {"message": _("records_processed", request).format(count=len(records))}
    
# ==========================================
# 👤 6. PERSONELİN KENDİ PUANTAJ GEÇMİŞİ
# ==========================================
@router.get("/my-records")
def get_my_attendance(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_all) # 🔥 Herkes kendi kaydını görebilir
):
    records = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department_rel)
    ).filter(
        Attendance.employee_id == current_user["user_id"],
        Attendance.company_id == current_user["company_id"]
    ).order_by(Attendance.date.desc()).limit(30).all() # Son 30 günü getir
    
    return [build_self_attendance_response(r, request, db) for r in records]


@router.post("/sick-report")
def create_sick_report(
    payload: SickReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_hr_manager)
):
    if current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        if payload.employee_id not in employee_ids:
            raise HTTPException(status_code=403, detail=_("unauthorized", request))

    employee = db.query(Employee).filter(
        Employee.id == payload.employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="End date must be after start date."))

    payroll_treatment = (payload.payroll_treatment or "FULL_PAY").upper()
    if payroll_treatment not in {"FULL_PAY", "DEDUCT"}:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="Unsupported payroll treatment."))

    conflicting_dates = []
    for current_day in iter_date_range(payload.start_date, payload.end_date):
        existing = db.query(Attendance).filter(
            Attendance.company_id == current_user["company_id"],
            Attendance.employee_id == payload.employee_id,
            Attendance.date == current_day
        ).first()
        if existing:
            conflicting_dates.append(current_day.isoformat())

    if conflicting_dates:
        raise HTTPException(
            status_code=400,
            detail=_("excel_error", request).format(error=f"Existing attendance exists for: {', '.join(conflicting_dates[:5])}")
        )

    created_count = 0
    for current_day in iter_date_range(payload.start_date, payload.end_date):
        db.add(Attendance(
            company_id=current_user["company_id"],
            employee_id=payload.employee_id,
            date=current_day,
            entry_source="HEALTH_REPORT",
            record_type="SICK_REPORT",
            exception_type="SICK_REPORT",
            status="SICK_REPORT",
            approval_status="HR_APPROVED",
            payroll_treatment=payroll_treatment,
            include_in_payroll=True,
            payroll_decision_note=payload.decision_note,
            supporting_document_no=payload.report_no,
            issued_by=payload.issued_by,
            issue_date=payload.issue_date,
            range_start_date=payload.start_date,
            range_end_date=payload.end_date,
            total_work_hours=0,
            weekday_ot_hours=0,
            weekend_ot_hours=0,
            holiday_ot_hours=0,
        ))
        created_count += 1

    db.commit()
    return {
        "message": _("records_processed", request).format(count=created_count),
        "created_days": created_count,
        "payroll_treatment": payroll_treatment,
    }


@router.get("/payroll-summary")
def get_payroll_summary(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(allow_hr_manager)
):
    parsed_from = parse_optional_date(from_date, "from_date", request) or date.today().replace(day=1)
    parsed_to = parse_optional_date(to_date, "to_date", request) or date.today()
    if parsed_to < parsed_from:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="End date must be after start date."))

    employee_query = db.query(Employee).options(joinedload(Employee.department_rel)).filter(
        Employee.company_id == current_user["company_id"],
        Employee.status == "ACTIVE",
    )
    scoped_employee_ids = None
    if current_user["role"] == "MANAGER":
        scoped_employee_ids = get_team_scoped_employee_ids(db, current_user)
        employee_query = employee_query.filter(Employee.id.in_(scoped_employee_ids))
    employees = employee_query.all()

    department_filter = (department or "").strip().lower()
    text_filter = (query or "").strip().lower()

    attendance_records = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department_rel)
    ).filter(
        Attendance.company_id == current_user["company_id"],
        Attendance.date >= parsed_from,
        Attendance.date <= parsed_to
    )
    if scoped_employee_ids is not None:
        attendance_records = attendance_records.filter(Attendance.employee_id.in_(scoped_employee_ids))
    attendance_records = attendance_records.all()

    approved_leaves = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.employee).joinedload(Employee.department_rel)
    ).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= parsed_to,
        LeaveRequest.end_date >= parsed_from
    )
    if scoped_employee_ids is not None:
        approved_leaves = approved_leaves.filter(LeaveRequest.employee_id.in_(scoped_employee_ids))
    approved_leaves = approved_leaves.all()

    attendance_map = {}
    for record in attendance_records:
        attendance_map.setdefault(record.employee_id, []).append(record)

    leave_map = {}
    for leave in approved_leaves:
        leave_map.setdefault(leave.employee_id, []).append(leave)

    rows = []
    totals = {
        "employees": 0,
        "worked_days": 0,
        "approved_leave_days": 0,
        "sick_report_days": 0,
        "paid_sick_days": 0,
        "deducted_sick_days": 0,
        "late_count": 0,
        "early_out_count": 0,
        "overtime_hours": 0.0,
    }

    for employee in employees:
        department_name = getattr(getattr(employee, "department_rel", None), "name", "") or ""
        full_name = f"{employee.first_name or ''} {employee.last_name or ''}".strip()

        if department_filter and department_name.strip().lower() != department_filter:
            continue
        if text_filter and text_filter not in full_name.lower() and text_filter not in str(employee.email or "").lower():
            continue

        employee_records = attendance_map.get(employee.id, [])
        employee_leaves = leave_map.get(employee.id, [])

        worked_days = sum(1 for record in employee_records if (record.record_type or "TIME") == "TIME" and (record.status or "").upper() in {"PRESENT", "LATE", "EARLY_OUT", "LATE_EARLY_OUT"})
        sick_report_rows = [record for record in employee_records if (record.status or "").upper() == "SICK_REPORT"]
        sick_report_days = len(sick_report_rows)
        paid_sick_days = sum(1 for record in sick_report_rows if (record.payroll_treatment or "STANDARD").upper() == "FULL_PAY")
        deducted_sick_days = sum(1 for record in sick_report_rows if (record.payroll_treatment or "STANDARD").upper() == "DEDUCT")
        late_count = sum(1 for record in employee_records if (record.status or "").upper() in {"LATE", "LATE_EARLY_OUT"} or (record.approval_status or "").upper() == "LATE")
        early_out_count = sum(1 for record in employee_records if (record.status or "").upper() in {"EARLY_OUT", "LATE_EARLY_OUT"})
        overtime_hours = round(sum(float(record.weekday_ot_hours or 0) + float(record.weekend_ot_hours or 0) + float(record.holiday_ot_hours or 0) for record in employee_records), 2)

        approved_leave_days = 0
        for leave in employee_leaves:
            if (leave.leave_type or "").upper() == "SICK":
                continue
            overlap_start = max(parsed_from, leave.start_date)
            overlap_end = min(parsed_to, leave.end_date)
            if overlap_end >= overlap_start:
                approved_leave_days += (overlap_end - overlap_start).days + 1

        row = {
            "employee_id": employee.id,
            "employee_name": full_name,
            "department": department_name or "-",
            "worked_days": worked_days,
            "approved_leave_days": approved_leave_days,
            "sick_report_days": sick_report_days,
            "paid_sick_days": paid_sick_days,
            "deducted_sick_days": deducted_sick_days,
            "late_count": late_count,
            "early_out_count": early_out_count,
            "overtime_hours": overtime_hours,
        }
        rows.append(row)

        totals["employees"] += 1
        totals["worked_days"] += worked_days
        totals["approved_leave_days"] += approved_leave_days
        totals["sick_report_days"] += sick_report_days
        totals["paid_sick_days"] += paid_sick_days
        totals["deducted_sick_days"] += deducted_sick_days
        totals["late_count"] += late_count
        totals["early_out_count"] += early_out_count
        totals["overtime_hours"] = round(totals["overtime_hours"] + overtime_hours, 2)

    rows.sort(key=lambda item: item["employee_name"].lower())
    return {
        "from_date": parsed_from,
        "to_date": parsed_to,
        "rows": rows,
        "totals": totals,
    }
