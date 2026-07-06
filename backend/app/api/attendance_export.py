from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
import pandas as pd
import io
import os
import re
from urllib.parse import quote
from email.message import EmailMessage
from datetime import date

# PDF Kütüphaneleri ve Fontlar
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except ImportError:
    arabic_reshaper = None
    get_display = None

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.email import EmailService
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.leave import LeaveRequest
from app.core.i18n import _
from app.core.permissions import ensure_permission

router = APIRouter()

# ==========================================
# 🇹🇷🇩🇪🇸🇦 FONT KURULUMU
# ==========================================
FONT_DIR = "/app/fonts" if os.path.exists("/app/fonts") else "fonts"
os.makedirs(FONT_DIR, exist_ok=True)
regular_font_path = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
bold_font_path = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
amiri_regular_path = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
amiri_bold_path = os.path.join(FONT_DIR, "Amiri-Bold.ttf")

font_regular = 'Helvetica'
font_bold = 'Helvetica-Bold'
arabic_font_regular = font_regular
arabic_font_bold = font_bold

try:
    if os.path.exists(regular_font_path) and os.path.exists(bold_font_path):
        pdfmetrics.registerFont(TTFont('CustomFont', regular_font_path))
        pdfmetrics.registerFont(TTFont('CustomFont-Bold', bold_font_path))
        font_regular = 'CustomFont'
        font_bold = 'CustomFont-Bold'
    if os.path.exists(amiri_regular_path) and os.path.exists(amiri_bold_path):
        pdfmetrics.registerFont(TTFont('AttendanceAmiri', amiri_regular_path))
        pdfmetrics.registerFont(TTFont('AttendanceAmiri-Bold', amiri_bold_path))
        arabic_font_regular = 'AttendanceAmiri'
        arabic_font_bold = 'AttendanceAmiri-Bold'
except Exception as e:
    print(f"Font Kayıt Hatası: {e}")

def prep_text(text):
    if text is None:
        return "-"
    text_str = str(text)
    if arabic_reshaper and get_display:
        try:
            reshaped_text = arabic_reshaper.reshape(text_str)
            return get_display(reshaped_text)
        except Exception:
            return text_str
    return text_str

def translate_status(status_val: str, request: Request) -> str:
    if not status_val:
        return "-"
    s = status_val.upper()
    if s == "PRESENT": return _("status_present", request)
    if s == "ABSENT": return _("status_absent", request)
    if s == "LATE": return _("status_late", request)
    if s == "OFF": return _("status_off", request)
    if s == "EARLY_OUT": return _("status_early_out", request)
    if s == "LATE_EARLY_OUT": return _("status_late_early", request)
    if s == "SICK_REPORT": return _("status_sick_report", request)
    return status_val

class EmailReportRequest(BaseModel):
    email_to: EmailStr
    format: str = "pdf"
    from_date: date | None = None
    to_date: date | None = None


def _build_payroll_summary_rows(
    db: Session,
    current_user: dict,
    request: Request,
    from_date: date | None,
    to_date: date | None,
    department: str | None,
    query: str | None,
):
    parsed_from = from_date or date.today().replace(day=1)
    parsed_to = to_date or date.today()
    if parsed_to < parsed_from:
        raise HTTPException(status_code=400, detail=_("excel_error", request).format(error="End date must be after start date."))

    employee_query = db.query(Employee).options(joinedload(Employee.department_rel)).filter(
        Employee.company_id == current_user["company_id"],
        Employee.status == "ACTIVE",
    )
    employees = employee_query.all()

    department_filter = (department or "").strip().lower()
    text_filter = (query or "").strip().lower()

    attendance_records = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department_rel)
    ).filter(
        Attendance.company_id == current_user["company_id"],
        Attendance.date >= parsed_from,
        Attendance.date <= parsed_to,
    ).all()

    approved_leaves = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.employee).joinedload(Employee.department_rel)
    ).filter(
        LeaveRequest.company_id == current_user["company_id"],
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= parsed_to,
        LeaveRequest.end_date >= parsed_from,
    ).all()

    attendance_map = {}
    for record in attendance_records:
        attendance_map.setdefault(record.employee_id, []).append(record)

    leave_map = {}
    for leave in approved_leaves:
        leave_map.setdefault(leave.employee_id, []).append(leave)

    rows = []
    for employee in employees:
        department_name = getattr(getattr(employee, "department_rel", None), "name", "") or ""
        full_name = f"{employee.first_name or ''} {employee.last_name or ''}".strip()

        if department_filter and department_name.strip().lower() != department_filter:
            continue
        if text_filter and text_filter not in full_name.lower() and text_filter not in str(employee.email or "").lower():
            continue

        employee_records = attendance_map.get(employee.id, [])
        employee_leaves = leave_map.get(employee.id, [])

        worked_days = sum(
            1
            for record in employee_records
            if (record.record_type or "TIME") == "TIME"
            and (record.status or "").upper() in {"PRESENT", "LATE", "EARLY_OUT", "LATE_EARLY_OUT"}
        )
        sick_report_rows = [record for record in employee_records if (record.status or "").upper() == "SICK_REPORT"]
        sick_report_days = len(sick_report_rows)
        paid_sick_days = sum(1 for record in sick_report_rows if (record.payroll_treatment or "STANDARD").upper() == "FULL_PAY")
        deducted_sick_days = sum(1 for record in sick_report_rows if (record.payroll_treatment or "STANDARD").upper() == "DEDUCT")
        late_count = sum(
            1
            for record in employee_records
            if (record.status or "").upper() in {"LATE", "LATE_EARLY_OUT"} or (record.approval_status or "").upper() == "LATE"
        )
        early_out_count = sum(1 for record in employee_records if (record.status or "").upper() in {"EARLY_OUT", "LATE_EARLY_OUT"})
        overtime_hours = round(
            sum(
                float(record.weekday_ot_hours or 0)
                + float(record.weekend_ot_hours or 0)
                + float(record.holiday_ot_hours or 0)
                for record in employee_records
            ),
            2,
        )

        approved_leave_days = 0
        for leave in employee_leaves:
            if (leave.leave_type or "").upper() == "SICK":
                continue
            overlap_start = max(parsed_from, leave.start_date)
            overlap_end = min(parsed_to, leave.end_date)
            if overlap_end >= overlap_start:
                approved_leave_days += (overlap_end - overlap_start).days + 1

        rows.append({
            _("col_name", request): full_name,
            _("col_department", request): department_name or "-",
            _("lbl_report_worked_days", request): worked_days,
            _("lbl_report_approved_leaves", request): approved_leave_days,
            _("lbl_report_sick_days", request): sick_report_days,
            _("lbl_report_paid_sick_days", request): paid_sick_days,
            _("lbl_report_deducted_sick_days", request): deducted_sick_days,
            _("lbl_report_late_count", request): late_count,
            _("lbl_report_early_count", request): early_out_count,
            _("lbl_report_overtime_hours", request): overtime_hours,
        })

    rows.sort(key=lambda item: str(item.get(_("col_name", request), "")).lower())
    return rows, parsed_from, parsed_to


def generate_payroll_summary_file(format_type: str, rows: list, request: Request, from_date: date, to_date: date):
    output = io.BytesIO()
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    report_font_regular = arabic_font_regular if is_arabic else font_regular
    report_font_bold = arabic_font_bold if is_arabic else font_bold
    file_prefix = _("tab_payroll_report", request)
    safe_prefix = str(file_prefix or "Payroll_Report").replace("/", "_").replace("\\", "_").replace(" ", "_")

    if format_type == "excel":
        df = pd.DataFrame(rows)
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="PayrollSummary")
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{safe_prefix}_{from_date}_{to_date}.xlsx"
    elif format_type == "csv":
        df = pd.DataFrame(rows)
        df.to_csv(output, index=False, encoding='utf-8-sig')
        content_type = "text/csv"
        filename = f"{safe_prefix}_{from_date}_{to_date}.csv"
    else:
        doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=16, leftMargin=16, topMargin=18, bottomMargin=14)
        table_rows = [list(rows[0].keys())] if rows else [[_("col_name", request)]]
        for row in rows:
            table_rows.append([prep_text(value) for value in row.values()])
        column_widths = [120, 80, 52, 48, 48, 60, 60, 42, 42, 58][:len(table_rows[0])]
        table = Table(table_rows, repeatRows=1, colWidths=column_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), report_font_bold),
            ('FONTNAME', (0, 1), (-1, -1), report_font_regular),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('FONTSIZE', (0, 1), (-1, -1), 6.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#e2e8f0")),
        ]))
        doc.build([table])
        content_type = "application/pdf"
        filename = f"{safe_prefix}_{from_date}_{to_date}.pdf"

    output.seek(0)
    return output, content_type, filename

# ==========================================
# ⚙️ ÇOK DİLLİ VE ZIRHLI DOSYA ÜRETİCİSİ
# ==========================================
def generate_report_file(format_type: str, records: list, request: Request, from_date: date | None = None, to_date: date | None = None):
    output = io.BytesIO()
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    report_font_regular = arabic_font_regular if is_arabic else font_regular
    report_font_bold = arabic_font_bold if is_arabic else font_bold
    
    # 🌍 Çok Dilli Dosya ve Sekme Adlarını Çek
    file_prefix = _("file_attendance", request)
    sheet_name_raw = _("sheet_attendance", request)
    
    # 🔥 GÜVENLİK ZIRHI: Excel sekme adında yasaklı karakterleri sil ve max 31 harfe kırp!
    sheet_name_clean = re.sub(r'[\\/*?:\[\]]', '', str(sheet_name_raw))[:31]
    
    data = []
    for r in records:
        emp_name = f"{r.employee.first_name} {r.employee.last_name}" if r.employee else _("unknown_employee", request)
        translated_status = translate_status(r.status, request)
        
        data.append({
            _("col_date", request): r.date.strftime("%Y-%m-%d"),
            _("col_name", request): emp_name,
            _("col_check_in", request): r.check_in.strftime("%H:%M") if r.check_in else "-",
            _("col_check_out", request): r.check_out.strftime("%H:%M") if r.check_out else "-",
            _("col_total_hours", request): float(r.total_work_hours or 0),
            _("col_status", request): translated_status 
        })

    if format_type == "excel":
        df = pd.DataFrame(data)
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=sheet_name_clean) # 🔥 Güvenli Sekme Adı Kullanıldı
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{file_prefix}_{from_date or date.today()}_{to_date or date.today()}.xlsx" 

    elif format_type == "csv":
        df = pd.DataFrame(data)
        df.to_csv(output, index=False, encoding='utf-8-sig')
        content_type = "text/csv"
        filename = f"{file_prefix}_{from_date or date.today()}_{to_date or date.today()}.csv"

    elif format_type == "pdf":
        doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        elements = []
        
        table_data = [[
            prep_text(_("col_date", request)), 
            prep_text(_("col_name", request)), 
            prep_text(_("col_check_in", request)), 
            prep_text(_("col_check_out", request)), 
            prep_text(_("col_total_hours", request)), 
            prep_text(_("col_status", request))
        ]]
        
        for row in data:
            prepared_row = [prep_text(val) for val in row.values()]
            table_data.append(prepared_row)
            
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), 
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), report_font_bold),
            ('FONTNAME', (0,1), (-1,-1), report_font_regular),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")), 
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0"))     
        ]))
        
        elements.append(t)
        doc.build(elements)
        content_type = "application/pdf"
        filename = f"{file_prefix}_{from_date or date.today()}_{to_date or date.today()}.pdf"

    output.seek(0)
    return output, content_type, filename


@router.get("/export")
def export_attendance(
    request: Request,
    format: str = "excel",
    from_date: date | None = None,
    to_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "attendance.export_company", request)

    # 🔥 GÜVENLİK ZIRHI: Format kontrolünü en başa aldık
    if format not in ["excel", "csv", "pdf"]:
        raise HTTPException(status_code=400, detail=_("invalid_format", request))

    records_query = db.query(Attendance).options(joinedload(Attendance.employee))\
        .filter(Attendance.company_id == current_user["company_id"])
    if from_date:
        records_query = records_query.filter(Attendance.date >= from_date)
    if to_date:
        records_query = records_query.filter(Attendance.date <= to_date)
    records = records_query.order_by(Attendance.date.desc()).all()

    if not records:
        raise HTTPException(status_code=404, detail=_("no_records_to_export", request))

    # Hata yakalama (try-except) tuzağını kaldırdık, gerçek hatalar sunucuda görünecek
    output, content_type, filename = generate_report_file(format, records, request, from_date, to_date)
    
    # 🔥 GÜVENLİK ZIRHI: UTF-8 karakterli dosya isimleri için (Arapça, Türkçe, Almanca) tarayıcı koruması
    encoded_filename = quote(filename)

    return StreamingResponse(
        output,
        media_type=content_type,
        headers={
            # filename*=utf-8'' formatı, uluslararası karakterlerin bozulmadan inmesini sağlar
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"
        }
    )

def send_email_background(email_to: str, output: io.BytesIO, filename: str, content_type: str, request: Request):
    try:
        msg = EmailMessage()
        msg['Subject'] = f"{_('file_attendance', request)} - {_('email_report_subject', request)}"
        msg['From'] = EmailService._get_from_header()
        msg['To'] = email_to
        msg.set_content(_("email_report_body", request))

        msg.add_attachment(output.read(), maintype='application', subtype='octet-stream', filename=filename)

        with EmailService._open_smtp_connection() as server:
            server.send_message(msg)
            
    except Exception as e:
        print(f"E-Posta Gönderim Hatası: {e}")

@router.post("/email-report")
def email_attendance_report(
    data: EmailReportRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "attendance.export_company", request)

    if data.format not in ["excel", "csv", "pdf"]:
        raise HTTPException(status_code=400, detail=_("invalid_format", request))

    records_query = db.query(Attendance).options(joinedload(Attendance.employee))\
        .filter(Attendance.company_id == current_user["company_id"])
    if data.from_date:
        records_query = records_query.filter(Attendance.date >= data.from_date)
    if data.to_date:
        records_query = records_query.filter(Attendance.date <= data.to_date)
    records = records_query.order_by(Attendance.date.desc()).all()

    if not records:
        raise HTTPException(status_code=404, detail=_("no_records_to_export", request))

    output, content_type, filename = generate_report_file(data.format, records, request, data.from_date, data.to_date)
    background_tasks.add_task(send_email_background, data.email_to, output, filename, content_type, request)

    return {"message": _("email_sent_success", request).format(email=data.email_to)}


@router.get("/payroll-summary/export")
def export_payroll_summary(
    request: Request,
    format: str = "excel",
    from_date: date | None = None,
    to_date: date | None = None,
    department: str | None = None,
    query: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "attendance.export_company", request)
    if format not in ["excel", "csv", "pdf"]:
        raise HTTPException(status_code=400, detail=_("invalid_format", request))

    rows, parsed_from, parsed_to = _build_payroll_summary_rows(
        db,
        current_user,
        request,
        from_date,
        to_date,
        department,
        query,
    )
    if not rows:
        raise HTTPException(status_code=404, detail=_("no_records_to_export", request))

    output, content_type, filename = generate_payroll_summary_file(format, rows, request, parsed_from, parsed_to)
    encoded_filename = quote(filename)
    return StreamingResponse(
        output,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"},
    )
