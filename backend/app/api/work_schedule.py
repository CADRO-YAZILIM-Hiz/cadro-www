from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
import io
import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.models.employee import Department, Employee
from app.models.work_schedule import (
    DepartmentWorkSchedule,
    EmployeeWorkScheduleOverride,
    WorkSchedule,
)
from app.schemas.work_schedule import (
    DepartmentScheduleBulkAssign,
    EmployeeScheduleBulkAssign,
    EmployeeScheduleClear,
    WorkScheduleCreate,
    WorkScheduleOut,
    WorkScheduleUpdate,
)
from app.services.work_schedule_service import resolve_effective_schedule

router = APIRouter()
FONT_DIR = "/app/fonts"
REGULAR_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
AMIRI_REGULAR_PATH = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
AMIRI_BOLD_PATH = os.path.join(FONT_DIR, "Amiri-Bold.ttf")
ARABIC_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")

try:
    if "CadroSchedule" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(REGULAR_FONT_PATH):
        pdfmetrics.registerFont(TTFont("CadroSchedule", REGULAR_FONT_PATH))
    if "CadroSchedule-Bold" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(BOLD_FONT_PATH):
        pdfmetrics.registerFont(TTFont("CadroSchedule-Bold", BOLD_FONT_PATH))
    if "CadroScheduleAmiri" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(AMIRI_REGULAR_PATH):
        pdfmetrics.registerFont(TTFont("CadroScheduleAmiri", AMIRI_REGULAR_PATH))
    if "CadroScheduleAmiri-Bold" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(AMIRI_BOLD_PATH):
        pdfmetrics.registerFont(TTFont("CadroScheduleAmiri-Bold", AMIRI_BOLD_PATH))
except Exception as font_error:
    print(f"Work schedule PDF font warning: {font_error}")


def ensure_schedule_access(current_user: dict, request: Request):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR", "MANAGER"]:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))


def get_request_language(request: Request) -> str:
    accept_language = (request.headers.get("Accept-Language") or "tr").lower()
    if accept_language.startswith("ar"):
        return "ar"
    if accept_language.startswith("de"):
        return "de"
    if accept_language.startswith("en"):
        return "en"
    return "tr"


def localize_pdf_text(value, request: Request) -> str:
    text = str(value)
    if get_request_language(request) == "ar":
        return text.translate(ARABIC_DIGITS)
    return text



def pdf_text(value, request: Request) -> str:
    text = localize_pdf_text(value, request)
    if get_request_language(request) == "ar":
        return str(text)
    return str(text)

def get_schedule_fonts(request: Request) -> tuple[str, str]:
    if get_request_language(request) == "ar" and "CadroScheduleAmiri" in pdfmetrics.getRegisteredFontNames():
        return (
            "CadroScheduleAmiri",
            "CadroScheduleAmiri-Bold" if "CadroScheduleAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else "CadroScheduleAmiri",
        )
    return (
        "CadroSchedule" if "CadroSchedule" in pdfmetrics.getRegisteredFontNames() else "Helvetica",
        "CadroSchedule-Bold" if "CadroSchedule-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold",
    )


def serialize_schedule(db: Session, schedule: WorkSchedule) -> dict:
    department_assignments_count = db.query(DepartmentWorkSchedule).filter(
        DepartmentWorkSchedule.work_schedule_id == schedule.id,
        DepartmentWorkSchedule.is_active.is_(True),
    ).count()
    employee_overrides_count = db.query(EmployeeWorkScheduleOverride).filter(
        EmployeeWorkScheduleOverride.work_schedule_id == schedule.id,
        EmployeeWorkScheduleOverride.is_active.is_(True),
    ).count()

    return {
        "id": schedule.id,
        "company_id": schedule.company_id,
        "name": schedule.name,
        "schedule_type": schedule.schedule_type,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "break_minutes": schedule.break_minutes,
        "grace_in_minutes": schedule.grace_in_minutes,
        "grace_out_minutes": schedule.grace_out_minutes,
        "late_after_minutes": schedule.late_after_minutes,
        "early_leave_after_minutes": schedule.early_leave_after_minutes,
        "overtime_after_minutes": schedule.overtime_after_minutes,
        "core_start_time": schedule.core_start_time,
        "core_end_time": schedule.core_end_time,
        "crosses_midnight": schedule.crosses_midnight,
        "is_active": schedule.is_active,
        "department_assignments_count": department_assignments_count,
        "employee_overrides_count": employee_overrides_count,
    }


def generate_work_schedule_pdf_report(schedules: list[dict], request: Request):
    font_regular, font_bold = get_schedule_fonts(request)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="WorkScheduleTitle",
        parent=styles["Heading1"],
        fontName=font_bold,
        fontSize=16,
        alignment=0,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=14,
    )
    meta_style = ParagraphStyle(
        name="WorkScheduleMeta",
        parent=styles["BodyText"],
        fontName=font_regular,
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=10,
    )
    cell_style = ParagraphStyle(
        name="WorkScheduleCell",
        parent=styles["BodyText"],
        fontName=font_regular,
        fontSize=8,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        wordWrap="CJK",
    )
    header_cell_style = ParagraphStyle(
        name="WorkScheduleHeaderCell",
        parent=styles["BodyText"],
        fontName=font_bold,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        wordWrap="CJK",
    )

    elements = [
        Paragraph(pdf_text(_("work_schedule_report_title", request), request), title_style),
        Paragraph(
            pdf_text(_("work_schedule_report_meta", request).format(
                count=localize_pdf_text(len(schedules), request),
                date=localize_pdf_text(date.today().strftime("%d.%m.%Y"), request),
            ), request),
            meta_style,
        ),
        Spacer(1, 0.2 * cm),
    ]

    table_data = [[
        Paragraph(pdf_text(_("col_schedule_name", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_schedule_type", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_schedule_hours", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_break", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_department_defaults", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_employee_overrides", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_schedule_rules", request), request), header_cell_style),
    ]]

    for schedule in schedules:
        hours = localize_pdf_text(
            f"{str(schedule['start_time'])[:5]} - {str(schedule['end_time'])[:5]}",
            request,
        )
        rules = "<br/>".join([
            f"{_('lbl_grace_in', request)}: {localize_pdf_text(schedule.get('grace_in_minutes', 0), request)} {_('lbl_minutes_short', request)}",
            f"{_('lbl_grace_out', request)}: {localize_pdf_text(schedule.get('grace_out_minutes', 0), request)} {_('lbl_minutes_short', request)}",
            f"{_('lbl_ot_after', request)}: {localize_pdf_text(schedule.get('overtime_after_minutes', 0), request)} {_('lbl_minutes_short', request)}",
        ])
        table_data.append([
            Paragraph(pdf_text(str(schedule.get("name") or "-").replace("\n", "<br/>"), request), cell_style),
            Paragraph(pdf_text(str(schedule.get("schedule_type") or "-").replace("\n", "<br/>"), request), cell_style),
            Paragraph(pdf_text(str(hours).replace("\n", "<br/>"), request), cell_style),
            Paragraph(
                f"{localize_pdf_text(schedule.get('break_minutes', 0), request)} {_('lbl_minutes_short', request)}",
                cell_style,
            ),
            Paragraph(pdf_text(schedule.get("department_assignments_count", 0), request), cell_style),
            Paragraph(pdf_text(schedule.get("employee_overrides_count", 0), request), cell_style),
            Paragraph(pdf_text(str(rules).replace(" / ", "<br/>"), request), cell_style),
        ])

    table = Table(
        table_data,
        colWidths=[4.6 * cm, 2.8 * cm, 3.1 * cm, 2.3 * cm, 2.7 * cm, 2.7 * cm, 10.2 * cm],
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 9),
    ]))

    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_single_schedule_members_pdf(schedule: WorkSchedule, employees: list[dict], request: Request):
    font_regular, font_bold = get_schedule_fonts(request)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ScheduleMemberTitle",
        parent=styles["Heading1"],
        fontName=font_bold,
        fontSize=16,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=10,
    )
    meta_style = ParagraphStyle(
        name="ScheduleMemberMeta",
        parent=styles["BodyText"],
        fontName=font_regular,
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=8,
    )
    cell_style = ParagraphStyle(
        name="ScheduleMemberCell",
        parent=styles["BodyText"],
        fontName=font_regular,
        fontSize=8,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    elements = [
        Paragraph(pdf_text(f"{_('work_schedule_members_report_title', request)}: {schedule.name}", request), title_style),
        Paragraph(
            pdf_text(_("work_schedule_members_report_meta", request).format(
                date=localize_pdf_text(date.today().strftime("%d.%m.%Y"), request),
                count=localize_pdf_text(len(employees), request),
                schedule_type=schedule.schedule_type,
            ), request),
            meta_style,
        ),
    ]

    header_cell_style = ParagraphStyle(
        name="ScheduleMemberHeaderCell",
        parent=styles["BodyText"],
        fontName=font_bold,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        wordWrap="CJK",
    )

    table_data = [[
        Paragraph(pdf_text(_("col_employee_name", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_department", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_position", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_schedule_source", request), request), header_cell_style),
        Paragraph(pdf_text(_("col_schedule_hours", request), request), header_cell_style),
    ]]

    if not employees:
        table_data.append([
            Paragraph(pdf_text(_("work_schedule_no_members", request), request), cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph(
                localize_pdf_text(f"{str(schedule.start_time)[:5]} - {str(schedule.end_time)[:5]}", request),
                cell_style,
            ),
        ])
    else:
        for employee in employees:
            table_data.append([
                Paragraph(pdf_text(str(employee["employee_name"]).replace("\n", "<br/>"), request), cell_style),
                Paragraph(pdf_text(str(employee["department_name"]).replace("\n", "<br/>"), request), cell_style),
                Paragraph(pdf_text(str(employee["position_name"]).replace("\n", "<br/>"), request), cell_style),
                Paragraph(pdf_text(str(employee["source_label"]).replace("\n", "<br/>"), request), cell_style),
                Paragraph(pdf_text(str(employee["hours_label"]).replace("\n", "<br/>"), request), cell_style),
            ])

    table = Table(
        table_data,
        colWidths=[6.2 * cm, 4.0 * cm, 4.8 * cm, 4.2 * cm, 4.8 * cm],
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 9),
    ]))
    elements.append(Spacer(1, 0.2 * cm))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.post("/templates", response_model=WorkScheduleOut)
def create_work_schedule(
    payload: WorkScheduleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    schedule = WorkSchedule(company_id=current_user["company_id"], **payload.dict())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/templates")
def list_work_schedules(
    request: Request,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    query = db.query(WorkSchedule).filter(WorkSchedule.company_id == current_user["company_id"])
    if active_only:
        query = query.filter(WorkSchedule.is_active.is_(True))
    schedules = query.order_by(WorkSchedule.name.asc()).all()
    return [serialize_schedule(db, schedule) for schedule in schedules]


@router.get("/templates/report")
def download_work_schedule_report(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    schedules = db.query(WorkSchedule).filter(
        WorkSchedule.company_id == current_user["company_id"]
    ).order_by(WorkSchedule.name.asc()).all()
    serialized = [serialize_schedule(db, schedule) for schedule in schedules]
    pdf_buffer = generate_work_schedule_pdf_report(serialized, request)
    file_name = f"work_schedules_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'}
    )


@router.get("/templates/{schedule_id}/report")
def download_single_work_schedule_report(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == schedule_id,
        WorkSchedule.company_id == current_user["company_id"],
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Mesai planı bulunamadı.")

    active_employees = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel),
    ).filter(
        Employee.company_id == current_user["company_id"],
        Employee.status == "ACTIVE",
    ).order_by(Employee.first_name.asc(), Employee.last_name.asc()).all()

    report_rows = []
    for employee in active_employees:
        effective_schedule, source = resolve_effective_schedule(db, employee, date.today())
        if not effective_schedule or effective_schedule.id != schedule.id:
            continue
        report_rows.append({
            "employee_name": f"{employee.first_name} {employee.last_name}".strip() or "-",
            "department_name": employee.department_rel.name if employee.department_rel else _("unspecified_department", request),
            "position_name": employee.position_rel.title if employee.position_rel else _("unspecified", request),
            "source_label": _("work_schedule_source_employee", request) if source == "EMPLOYEE_OVERRIDE" else _("work_schedule_source_department", request),
            "hours_label": f"{str(schedule.start_time)[:5]} - {str(schedule.end_time)[:5]}",
        })

    pdf_buffer = generate_single_schedule_members_pdf(schedule, report_rows, request)
    safe_name = "".join(ch for ch in schedule.name if ch.isalnum() or ch in ("_", "-", " ")).strip().replace(" ", "_") or f"schedule_{schedule.id}"
    file_name = f"{safe_name}_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'}
    )


@router.put("/templates/{schedule_id}", response_model=WorkScheduleOut)
def update_work_schedule(
    schedule_id: int,
    payload: WorkScheduleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == schedule_id,
        WorkSchedule.company_id == current_user["company_id"]
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Mesai planı bulunamadı.")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/templates/{schedule_id}")
def delete_work_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == schedule_id,
        WorkSchedule.company_id == current_user["company_id"]
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Mesai planı bulunamadı.")

    has_dept_assignments = db.query(DepartmentWorkSchedule).filter(
        DepartmentWorkSchedule.work_schedule_id == schedule_id,
        DepartmentWorkSchedule.is_active.is_(True)
    ).count()
    has_employee_overrides = db.query(EmployeeWorkScheduleOverride).filter(
        EmployeeWorkScheduleOverride.work_schedule_id == schedule_id,
        EmployeeWorkScheduleOverride.is_active.is_(True)
    ).count()
    if has_dept_assignments or has_employee_overrides:
        raise HTTPException(status_code=400, detail="Bu plan aktif atamalarda kullanılıyor. Önce atamaları kaldırın.")

    db.delete(schedule)
    db.commit()
    return {"message": "Mesai planı silindi."}


@router.post("/assign/departments")
def assign_schedules_to_departments(
    payload: DepartmentScheduleBulkAssign,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    company_id = current_user["company_id"]

    for item in payload.assignments:
        department = db.query(Department).filter(
            Department.id == item.department_id,
            Department.company_id == company_id
        ).first()
        schedule = db.query(WorkSchedule).filter(
            WorkSchedule.id == item.work_schedule_id,
            WorkSchedule.company_id == company_id
        ).first()
        if not department or not schedule:
            raise HTTPException(status_code=404, detail="Departman veya mesai planı bulunamadı.")

        existing_records = db.query(DepartmentWorkSchedule).filter(
            DepartmentWorkSchedule.department_id == item.department_id,
            DepartmentWorkSchedule.company_id == company_id
        ).order_by(DepartmentWorkSchedule.id.desc()).all()

        existing = next((record for record in existing_records if record.is_active), None)
        if not existing and existing_records:
            existing = existing_records[0]

        for record in existing_records:
            if existing and record.id != existing.id:
                record.is_active = False

        if existing:
            existing.work_schedule_id = item.work_schedule_id
            existing.is_active = True
        else:
            db.add(
                DepartmentWorkSchedule(
                    company_id=company_id,
                    department_id=item.department_id,
                    work_schedule_id=item.work_schedule_id,
                    is_active=True,
                )
            )

    db.commit()
    return {"message": "Departman mesai planları güncellendi."}


@router.get("/assign/departments")
def list_department_schedule_assignments(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    assignments = (
        db.query(DepartmentWorkSchedule)
        .filter(
            DepartmentWorkSchedule.company_id == current_user["company_id"],
            DepartmentWorkSchedule.is_active.is_(True)
        )
        .all()
    )
    return [
        {
            "id": assignment.id,
            "department_id": assignment.department_id,
            "department_name": assignment.department.name if assignment.department else None,
            "work_schedule_id": assignment.work_schedule_id,
            "work_schedule_name": assignment.work_schedule.name if assignment.work_schedule else None,
            "is_active": assignment.is_active,
            "employee_count": db.query(Employee).filter(
                Employee.company_id == current_user["company_id"],
                Employee.department_id == assignment.department_id,
                Employee.status == "ACTIVE",
            ).count(),
        }
        for assignment in assignments
    ]


@router.get("/assign/employees/overrides")
def list_employee_schedule_overrides(
    request: Request,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    query = (
        db.query(EmployeeWorkScheduleOverride)
        .join(Employee, EmployeeWorkScheduleOverride.employee_id == Employee.id)
        .filter(Employee.company_id == current_user["company_id"])
    )
    if active_only:
        query = query.filter(EmployeeWorkScheduleOverride.is_active.is_(True))

    overrides = query.order_by(
        EmployeeWorkScheduleOverride.effective_from.desc(),
        EmployeeWorkScheduleOverride.id.desc(),
    ).all()

    return [
        {
            "id": override.id,
            "employee_id": override.employee_id,
            "employee_name": f"{override.employee.first_name} {override.employee.last_name}" if override.employee else None,
            "department_id": override.employee.department_id if override.employee else None,
            "department_name": override.employee.department_rel.name if override.employee and override.employee.department_rel else None,
            "work_schedule_id": override.work_schedule_id,
            "work_schedule_name": override.work_schedule.name if override.work_schedule else None,
            "effective_from": override.effective_from,
            "effective_to": override.effective_to,
            "reason": override.reason,
            "is_active": override.is_active,
        }
        for override in overrides
    ]


@router.post("/assign/employees/bulk")
def assign_schedule_to_employees(
    payload: EmployeeScheduleBulkAssign,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    company_id = current_user["company_id"]

    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == payload.work_schedule_id,
        WorkSchedule.company_id == company_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Mesai planı bulunamadı.")

    employees = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.id.in_(payload.employee_ids),
        Employee.status == "ACTIVE"
    ).all()
    if not employees:
        raise HTTPException(status_code=404, detail="Atanacak personel bulunamadı.")

    for employee in employees:
        existing = (
            db.query(EmployeeWorkScheduleOverride)
            .filter(
                EmployeeWorkScheduleOverride.employee_id == employee.id,
                EmployeeWorkScheduleOverride.is_active.is_(True),
            )
            .first()
        )
        if existing:
            existing.work_schedule_id = payload.work_schedule_id
            existing.effective_from = payload.effective_from
            existing.effective_to = payload.effective_to
            existing.reason = payload.reason
        else:
            db.add(
                EmployeeWorkScheduleOverride(
                    employee_id=employee.id,
                    work_schedule_id=payload.work_schedule_id,
                    effective_from=payload.effective_from,
                    effective_to=payload.effective_to,
                    reason=payload.reason,
                    is_active=True,
                )
            )

    db.commit()
    return {"message": f"{len(employees)} personel için özel mesai planı atandı."}


@router.post("/assign/employees/clear")
def clear_employee_schedule_overrides(
    payload: EmployeeScheduleClear,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    overrides = db.query(EmployeeWorkScheduleOverride).join(Employee).filter(
        Employee.company_id == current_user["company_id"],
        EmployeeWorkScheduleOverride.employee_id.in_(payload.employee_ids),
        EmployeeWorkScheduleOverride.is_active.is_(True),
    ).all()
    for override in overrides:
        override.is_active = False
    db.commit()
    return {"message": f"{len(overrides)} personel için özel plan kaldırıldı."}


@router.get("/employees/{employee_id}/effective")
def get_employee_effective_schedule(
    employee_id: int,
    request: Request,
    target_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_schedule_access(current_user, request)
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Personel bulunamadı.")

    effective_date = target_date or date.today()
    schedule, source = resolve_effective_schedule(db, employee, effective_date)
    if not schedule:
        return {"employee_id": employee.id, "schedule": None, "source": None, "date": effective_date}

    return {
        "employee_id": employee.id,
        "date": effective_date,
        "source": source,
        "schedule": {
            "id": schedule.id,
            "name": schedule.name,
            "schedule_type": schedule.schedule_type,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "crosses_midnight": schedule.crosses_midnight,
        }
    }
