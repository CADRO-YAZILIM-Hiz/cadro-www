import io
import os
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, time
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.plan_features import plan_feature_required
from app.models.training import Training, TrainingParticipant
from app.models.employee import Employee
from app.api.report import format_text

router = APIRouter(dependencies=[Depends(plan_feature_required("enterprise.training"))])

FONT_DIR = "/app/fonts" if os.path.exists("/app/fonts") else "fonts"
REGULAR_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
AMIRI_REGULAR_PATH = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
AMIRI_BOLD_PATH = os.path.join(FONT_DIR, "Amiri-Bold.ttf")


def ensure_training_fonts():
    try:
        if "TrainingRoboto" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(REGULAR_FONT_PATH):
            pdfmetrics.registerFont(TTFont("TrainingRoboto", REGULAR_FONT_PATH))
        if "TrainingRoboto-Bold" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(BOLD_FONT_PATH):
            pdfmetrics.registerFont(TTFont("TrainingRoboto-Bold", BOLD_FONT_PATH))
        if "TrainingAmiri" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(AMIRI_REGULAR_PATH):
            pdfmetrics.registerFont(TTFont("TrainingAmiri", AMIRI_REGULAR_PATH))
        if "TrainingAmiri-Bold" not in pdfmetrics.getRegisteredFontNames() and os.path.exists(AMIRI_BOLD_PATH):
            pdfmetrics.registerFont(TTFont("TrainingAmiri-Bold", AMIRI_BOLD_PATH))
    except Exception as e:
        print(f"Training font register error: {e}")


ensure_training_fonts()


class TrainingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructor: Optional[str] = None
    location: str
    training_date: date
    training_time: time


class ParticipantAdd(BaseModel):
    employee_ids: List[int]


class CancelRequest(BaseModel):
    custom_message: str


class AttendanceUpdate(BaseModel):
    status: str


@router.post("/")
def create_training(req: TrainingCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_create_training", request))

    new_training = Training(
        company_id=current_user["company_id"],
        title=req.title,
        description=req.description,
        instructor=req.instructor,
        location=req.location,
        training_date=req.training_date,
        training_time=req.training_time
    )
    db.add(new_training)
    db.commit()
    db.refresh(new_training)
    return new_training


@router.get("/")
def get_trainings(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = (
        db.query(Training)
        .options(
            joinedload(Training.participants)
            .joinedload(TrainingParticipant.employee)
            .joinedload(Employee.department_rel)
        )
        .filter(Training.company_id == current_user["company_id"])
    )

    if current_user["role"] == "EMPLOYEE":
        query = query.join(TrainingParticipant).filter(TrainingParticipant.employee_id == current_user["user_id"])

    trainings = query.order_by(Training.training_date.desc()).all()

    result = []
    for t in trainings:
        participants = []

        if current_user["role"] in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]:
            for p in t.participants:
                participants.append({
                    "participant_id": p.id,
                    "employee_id": p.employee.id if p.employee else None,
                    "first_name": p.employee.first_name if p.employee else _("deleted_employee_label", request),
                    "last_name": p.employee.last_name if p.employee else _("new_starter", request),
                    "department": (
                        p.employee.department_rel.name
                        if p.employee and p.employee.department_rel
                        else "-"
                    ),
                    "attendance_status": p.attendance_status
                })

        result.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "instructor": t.instructor,
            "location": t.location,
            "training_date": t.training_date,
            "training_time": t.training_time,
            "status": t.status,
            "participants": participants
        })

    return result


@router.post("/{training_id}/assign")
def assign_employees(training_id: int, req: ParticipantAdd, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_assign_personnel", request))

    training = db.query(Training).filter(
        Training.id == training_id,
        Training.company_id == current_user["company_id"]
    ).first()
    if not training:
        raise HTTPException(status_code=404, detail=_("training_not_found", request))

    valid_emps = db.query(Employee).filter(
        Employee.company_id == current_user["company_id"],
        Employee.id.in_(req.employee_ids),
        Employee.status == "ACTIVE"
    ).all()

    valid_emp_dict = {e.id: e for e in valid_emps}

    assigned_count = 0
    for emp_id in req.employee_ids:
        if emp_id not in valid_emp_dict:
            continue

        exists = db.query(TrainingParticipant).filter(
            TrainingParticipant.training_id == training_id,
            TrainingParticipant.employee_id == emp_id
        ).first()

        if not exists:
            participant = TrainingParticipant(training_id=training_id, employee_id=emp_id)
            db.add(participant)
            assigned_count += 1

            emp = valid_emp_dict[emp_id]
            print(f"📧 E-POSTA SIM: {emp.email} | Konu: {training.title}")

    db.commit()
    return {"message": _("personnel_assigned_success", request).format(count=assigned_count)}


@router.put("/participant/{participant_id}/attendance")
def update_attendance(participant_id: int, req: AttendanceUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER", "HR", "INSTRUCTOR"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_attendance", request))

    participant = db.query(TrainingParticipant).join(Training).filter(
        TrainingParticipant.id == participant_id,
        Training.company_id == current_user["company_id"]
    ).first()

    if not participant:
        raise HTTPException(status_code=404, detail=_("participant_not_found_or_unauth", request))

    participant.attendance_status = req.status
    db.commit()
    return {"message": _("attendance_updated", request)}


@router.post("/{training_id}/cancel")
def cancel_training(training_id: int, req: CancelRequest, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_cancel_training", request))

    training = db.query(Training).filter(
        Training.id == training_id,
        Training.company_id == current_user["company_id"]
    ).first()
    if not training:
        raise HTTPException(status_code=404, detail=_("training_not_found", request))

    training.status = "CANCELLED"
    db.commit()

    participants = db.query(TrainingParticipant).options(
        joinedload(TrainingParticipant.employee)
    ).filter(
        TrainingParticipant.training_id == training_id
    ).all()

    for p in participants:
        if p.employee:
            print(f"🚨 İPTAL BİLDİRİMİ SIM: {p.employee.email} | {req.custom_message}")

    return {"message": _("training_cancelled_success", request)}


@router.delete("/{training_id}")
def delete_training(training_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_delete_training", request))

    training = db.query(Training).filter(
        Training.id == training_id,
        Training.company_id == current_user["company_id"]
    ).first()
    if not training:
        raise HTTPException(status_code=404, detail=_("training_not_found", request))

    db.delete(training)
    db.commit()
    return {"message": _("training_deleted_success", request)}


@router.get("/{training_id}/participants-report")
def export_training_participants_report(
    training_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER", "HR"]:
        raise HTTPException(status_code=403, detail=_("unauthorized_assign_personnel", request))

    training = db.query(Training).options(
        joinedload(Training.participants)
        .joinedload(TrainingParticipant.employee)
        .joinedload(Employee.department_rel)
    ).filter(
        Training.id == training_id,
        Training.company_id == current_user["company_id"]
    ).first()

    if not training:
        raise HTTPException(status_code=404, detail=_("training_not_found", request))

    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    font_regular = "TrainingAmiri" if is_arabic and "TrainingAmiri" in pdfmetrics.getRegisteredFontNames() else "TrainingRoboto"
    font_bold = "TrainingAmiri-Bold" if is_arabic and "TrainingAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else "TrainingRoboto-Bold"
    if font_regular not in pdfmetrics.getRegisteredFontNames():
        font_regular = "Helvetica"
    if font_bold not in pdfmetrics.getRegisteredFontNames():
        font_bold = "Helvetica-Bold"

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TrainingReportTitle",
        parent=styles["Heading1"],
        fontName=font_bold,
        fontSize=16,
        leading=20,
        alignment=2 if is_arabic else 0,
        spaceAfter=12,
    )
    meta_style = ParagraphStyle(
        "TrainingReportMeta",
        parent=styles["Normal"],
        fontName=font_regular,
        fontSize=10,
        leading=14,
        alignment=2 if is_arabic else 0,
        spaceAfter=6,
    )
    cell_style = ParagraphStyle(
        "TrainingReportCell",
        parent=styles["Normal"],
        fontName=font_regular,
        fontSize=8.5,
        leading=11,
        alignment=2 if is_arabic else 0,
    )
    header_cell_style = ParagraphStyle(
        "TrainingReportHeaderCell",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8.5,
        leading=11,
        textColor=colors.whitesmoke,
        alignment=2 if is_arabic else 0,
    )

    def tr_text(key: str, **kwargs) -> str:
        raw = _(key, request).format(**kwargs) if kwargs else _(key, request)
        return format_text(raw, is_arabic, strip_html=True)

    participants = []
    for participant in training.participants:
        employee = participant.employee
        participants.append({
            "name": f"{employee.first_name} {employee.last_name}" if employee else tr_text("deleted_employee_label"),
            "department": employee.department_rel.name if employee and employee.department_rel else "-",
            "status": participant.attendance_status or tr_text("training_report_pending"),
            "employee_status": employee.status if employee else "INACTIVE"
        })

    table_headers = [
        Paragraph(format_text(tr_text("training_report_col_name"), is_arabic), header_cell_style),
        Paragraph(format_text(tr_text("training_report_col_department"), is_arabic), header_cell_style),
        Paragraph(format_text(tr_text("training_report_col_participation"), is_arabic), header_cell_style),
        Paragraph(format_text(tr_text("training_report_col_employee_status"), is_arabic), header_cell_style),
    ]
    if is_arabic:
        table_headers.reverse()

    table_data = [table_headers]
    for item in participants:
        employee_status_label = tr_text("training_report_employee_archived") if item["employee_status"] == "INACTIVE" else tr_text("training_report_employee_active")
        row = [
            Paragraph(format_text(item["name"], is_arabic), cell_style),
            Paragraph(format_text(item["department"], is_arabic), cell_style),
            Paragraph(format_text(item["status"], is_arabic), cell_style),
            Paragraph(format_text(employee_status_label, is_arabic), cell_style),
        ]
        if is_arabic:
            row.reverse()
        table_data.append(row)

    if len(table_data) == 1:
        empty_row = [
            Paragraph(format_text(tr_text("training_report_no_participants"), is_arabic), cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
        ]
        if is_arabic:
            empty_row.reverse()
        table_data.append(empty_row)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    elements = [
        Paragraph(format_text(tr_text("training_report_title"), is_arabic), title_style),
        Paragraph(format_text(f"{tr_text('training_report_training_label')}: {training.title}", is_arabic), meta_style),
        Paragraph(format_text(f"{tr_text('training_report_date_label')}: {training.training_date.strftime('%d.%m.%Y')}", is_arabic), meta_style),
        Paragraph(format_text(f"{tr_text('training_report_time_label')}: {training.training_time.strftime('%H:%M') if hasattr(training.training_time, 'strftime') else training.training_time}", is_arabic), meta_style),
        Paragraph(format_text(f"{tr_text('training_report_instructor_label')}: {training.instructor or '-'}", is_arabic), meta_style),
        Paragraph(format_text(f"{tr_text('training_report_total_label')}: {len(participants)}", is_arabic), meta_style),
        Spacer(1, 12),
    ]

    report_table = Table(table_data, colWidths=[6.0 * cm, 3.9 * cm, 3.8 * cm, 3.8 * cm])
    report_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTNAME", (0, 1), (-1, -1), font_regular),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT" if is_arabic else "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(report_table)

    doc.build(elements)
    buffer.seek(0)

    filename = urllib.parse.quote(f"{tr_text('training_report_filename_prefix')}_{training.title}.pdf".replace(" ", "_"))
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{filename}"}
    )
