import io
import os
import urllib.parse
from datetime import date
from typing import List

import arabic_reshaper
from bidi.algorithm import get_display
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.fonts import addMapping
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.models.asset_expense import Asset
from app.models.company import Company
from app.models.employee import Employee

router = APIRouter()


class DynamicReportRequest(BaseModel):
    columns: List[str]
    title: str = "Personel Raporu"


FONT_DIR = os.getenv("FONT_DIR", "fonts")
os.makedirs(FONT_DIR, exist_ok=True)

regular_font_path = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
bold_font_path = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
amiri_regular_path = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
amiri_bold_path = os.path.join(FONT_DIR, "Amiri-Bold.ttf")

try:
    if os.path.exists(regular_font_path):
        pdfmetrics.registerFont(TTFont("Roboto", regular_font_path))
        pdfmetrics.registerFont(TTFont("Roboto-Bold", bold_font_path))
        addMapping("Roboto", 0, 0, "Roboto")
        addMapping("Roboto", 1, 0, "Roboto-Bold")

    if os.path.exists(amiri_regular_path):
        pdfmetrics.registerFont(TTFont("Amiri", amiri_regular_path))
        pdfmetrics.registerFont(TTFont("Amiri-Bold", amiri_bold_path))
        addMapping("Amiri", 0, 0, "Amiri")
        addMapping("Amiri", 1, 0, "Amiri-Bold")
except Exception as e:
    print(f"Font Hatası: {e}")


def format_text(text: str, is_arabic: bool, strip_html: bool = False) -> str:
    if not text:
        return ""

    text = str(text)

    if is_arabic:
        if strip_html:
            text = text.replace("<b>", "").replace("</b>", "").replace("<br/>", "\n")

        reshaped_text = arabic_reshaper.reshape(text)
        bidi_text = get_display(reshaped_text)

        if strip_html:
            bidi_text = bidi_text.replace("\n", "<br/>")

        return bidi_text

    return text


def get_employee_position_title(emp: Employee, request: Request) -> str:
    if getattr(emp, "position_rel", None) and emp.position_rel.title:
        return emp.position_rel.title
    return _("employment_certificate_default_position", request)


def get_employee_department_title(emp: Employee) -> str:
    if getattr(emp, "department_rel", None) and emp.department_rel.name:
        return emp.department_rel.name
    return "-"


def get_header_elements(company: Company, request: Request, is_arabic: bool, font_bold: str):
    elements = []
    logo_img = None
    new_width, new_height = 0, 0

    logo_path = company.logo_url
    if logo_path:
        # Path traversal koruması
        logo_path = os.path.normpath(logo_path).lstrip('/')
        if '..' in logo_path or not logo_path.startswith('uploads/'):
            logo_path = None
        try:
            img_reader = ImageReader(logo_path)
            orig_width, orig_height = img_reader.getSize()
            target_max_height_mm = 50 * mm
            new_height = target_max_height_mm
            new_width = new_height * (orig_width / float(orig_height))
            logo_img = Image(logo_path, width=new_width, height=new_height)
        except Exception:
            pass

    title_style = ParagraphStyle("CompanyTitle", fontName=font_bold, fontSize=18, textColor=colors.darkblue)
    if is_arabic:
        title_style.alignment = 2

    formatted_company_name = format_text(company.name.upper(), is_arabic)
    company_name_p = Paragraph(formatted_company_name, title_style)

    if logo_img:
        header_table = Table([[logo_img, company_name_p]], colWidths=[new_width, "*"])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (0, 0), "LEFT"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT" if is_arabic else "LEFT"),
            ("LEFTPADDING", (1, 0), (1, 0), 15 * mm),
        ]))
        elements.append(header_table)
    else:
        title_style.alignment = 1
        elements.append(Paragraph(formatted_company_name, title_style))

    elements.append(Spacer(1, 2 * mm))
    return elements


def create_footer(company: Company, request: Request, is_arabic: bool, font_reg: str, is_landscape: bool = False):
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.lightgrey)
        canvas.setLineWidth(0.5)
        page_width = landscape(A4)[0] if is_landscape else A4[0]
        canvas.line(40, 50, page_width - 40, 50)

        parts = []
        if getattr(company, "address", None):
            parts.append(company.address)
        if getattr(company, "phone", None):
            parts.append(_("common_phone_label", request).format(phone=company.phone))
        if getattr(company, "email", None):
            parts.append(_("common_email_label", request).format(email=company.email))

        footer_text = "  |  ".join(parts)
        footer_text = format_text(footer_text, is_arabic)

        try:
            canvas.setFont(font_reg, 8)
        except Exception:
            canvas.setFont("Helvetica", 8)

        canvas.setFillColor(colors.gray)
        canvas.drawCentredString(page_width / 2.0, 35, footer_text)
        canvas.restoreState()

    return footer


@router.get("/employment-certificate/{emp_id}")
def export_employment_certificate(emp_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != emp_id:
        raise HTTPException(status_code=403, detail=_("employment_certificate_forbidden", request))

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    emp = (
        db.query(Employee)
        .options(joinedload(Employee.position_rel))
        .filter(Employee.id == emp_id, Employee.company_id == company.id)
        .first()
    )

    if not emp:
        raise HTTPException(status_code=404, detail=_("employment_certificate_employee_not_found", request))

    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    font_reg = "Amiri" if is_arabic else "Roboto"
    font_bold = "Amiri-Bold" if is_arabic else "Roboto-Bold"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=60)
    elements = get_header_elements(company, request, is_arabic, font_bold)

    elements.append(Spacer(1, 30))

    center_heading = ParagraphStyle("CenterHeading", fontName=font_bold, fontSize=14, alignment=2 if is_arabic else 1)
    body_style = ParagraphStyle("BodyText", fontName=font_reg, fontSize=12, leading=18, alignment=2 if is_arabic else 4)

    heading_text = format_text(_("employment_certificate_heading", request), is_arabic)
    elements.append(Paragraph(heading_text, center_heading))
    elements.append(Spacer(1, 30))

    hire_date_str = emp.hire_date.strftime("%d.%m.%Y") if emp.hire_date else "-"
    position_title = get_employee_position_title(emp, request)
    identity_str = emp.identity_no if emp.identity_no else _("employment_certificate_missing_identity_no", request)

    raw_content = _("employment_certificate_body", request).format(
        company_name=company.name,
        identity_no=identity_str,
        full_name=f"{emp.first_name} {emp.last_name}",
        hire_date=hire_date_str,
        position_title=position_title
    )
    formatted_content = format_text(raw_content, is_arabic, strip_html=True)
    elements.append(Paragraph(formatted_content, body_style))
    elements.append(Spacer(1, 50))

    raw_sig = _("employment_certificate_signature_block", request).format(company_name=company.name)
    formatted_sig = format_text(raw_sig, is_arabic, strip_html=True)
    elements.append(Paragraph(formatted_sig, ParagraphStyle("Sig", fontName=font_bold, fontSize=12, alignment=0)))

    footer_func = create_footer(company, request, is_arabic, font_reg)
    doc.build(elements, onFirstPage=footer_func, onLaterPages=footer_func)

    buffer.seek(0)
    safe_filename = urllib.parse.quote(f"Certificate_{emp.last_name}.pdf")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )


@router.get("/asset-assignment/{asset_id}")
def export_asset_assignment_pdf(asset_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.company_id == company.id).first()

    if not asset or not asset.employee_id:
        raise HTTPException(status_code=404, detail=_("asset_assignment_not_found", request))
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != asset.employee_id:
        raise HTTPException(status_code=403, detail=_("asset_assignment_forbidden", request))

    emp = (
        db.query(Employee)
        .options(joinedload(Employee.department_rel), joinedload(Employee.position_rel))
        .filter(Employee.id == asset.employee_id)
        .first()
    )

    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    font_reg = "Amiri" if is_arabic else "Roboto"
    font_bold = "Amiri-Bold" if is_arabic else "Roboto-Bold"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=60)
    elements = get_header_elements(company, request, is_arabic, font_bold)

    title_style = ParagraphStyle("CenterTitle", fontName=font_bold, fontSize=16, alignment=1, spaceAfter=20)
    sub_title_style = ParagraphStyle(
        "SubTitle",
        fontName=font_bold,
        fontSize=12,
        spaceAfter=8,
        textColor=colors.HexColor("#1e293b"),
        alignment=2 if is_arabic else 0
    )

    elements.append(Paragraph(format_text(_("asset_assignment_heading", request), is_arabic), title_style))
    elements.append(Paragraph(format_text(_("asset_assignment_section_employee_info", request), is_arabic), sub_title_style))

    id_label = _("dynamic_report_column_identity_no", request)
    dept_title = get_employee_department_title(emp)
    position_title = get_employee_position_title(emp, request)

    emp_data = [
        [
            format_text(_("asset_assignment_employee_full_name", request), is_arabic),
            format_text(f"{emp.first_name} {emp.last_name}", is_arabic),
            format_text(id_label, is_arabic),
            format_text(emp.identity_no or "-", is_arabic)
        ],
        [
            format_text(_("asset_assignment_employee_department_position", request), is_arabic),
            format_text(f"{dept_title} / {position_title}", is_arabic),
            format_text(_("asset_assignment_employee_contact", request), is_arabic),
            format_text(emp.phone or "-", is_arabic)
        ]
    ]

    if is_arabic:
        emp_data = [row[::-1] for row in emp_data]

    t_emp = Table(emp_data, colWidths=[110, 140, 110, 140])
    t_emp.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_reg),
        ("FONTNAME", (2 if is_arabic else 0, 0), (3 if is_arabic else 0, -1), font_bold),
        ("FONTNAME", (0 if is_arabic else 2, 0), (1 if is_arabic else 2, -1), font_bold),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT" if is_arabic else "LEFT"),
    ]))
    elements.append(t_emp)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(format_text(_("asset_assignment_section_asset_info", request), is_arabic), sub_title_style))
    cond = getattr(asset, "condition_on_assign", _("asset_assignment_asset_default_condition", request))
    date_str = asset.given_date.strftime("%d.%m.%Y") if getattr(asset, "given_date", None) else date.today().strftime("%d.%m.%Y")

    asset_data = [
        [format_text(_("asset_assignment_asset_type", request), is_arabic), format_text(getattr(asset, "category", "-"), is_arabic)],
        [format_text(_("asset_assignment_asset_brand_model", request), is_arabic), format_text(getattr(asset, "asset_name", "-"), is_arabic)],
        [format_text(_("asset_assignment_asset_serial_no", request), is_arabic), format_text(getattr(asset, "serial_no", "-"), is_arabic)],
        [format_text(_("asset_assignment_asset_delivery_date", request), is_arabic), format_text(date_str, is_arabic)],
        [format_text(_("asset_assignment_asset_condition", request), is_arabic), format_text(cond, is_arabic)]
    ]

    if is_arabic:
        asset_data = [row[::-1] for row in asset_data]

    t_asset = Table(asset_data, colWidths=[130, 370] if not is_arabic else [370, 130])
    t_asset.setStyle(TableStyle([
        ("FONTNAME", (1 if is_arabic else 0, 0), (1 if is_arabic else 0, -1), font_bold),
        ("FONTNAME", (0 if is_arabic else 1, 0), (0 if is_arabic else 1, -1), font_reg),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT" if is_arabic else "LEFT"),
    ]))
    elements.append(t_asset)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(format_text(_("asset_assignment_section_terms", request), is_arabic), sub_title_style))
    legal_text = format_text(_("asset_assignment_legal_text", request), is_arabic, strip_html=True)
    elements.append(Paragraph(
        legal_text,
        ParagraphStyle("Legal", fontName=font_reg, fontSize=10, leading=16, alignment=2 if is_arabic else 4)
    ))
    elements.append(Spacer(1, 40))

    sig_data = [
        [format_text(_("asset_assignment_signature_delivered_by", request), is_arabic), format_text(_("asset_assignment_signature_received_by", request), is_arabic)],
        [format_text(_("asset_assignment_signature_full_name", request) + " .................", is_arabic), format_text(_("asset_assignment_signature_full_name", request) + f" {emp.first_name} {emp.last_name}", is_arabic)],
        [format_text(_("asset_assignment_signature_date", request) + " ..../..../20....", is_arabic), format_text(_("asset_assignment_signature_date", request) + f" {date.today().strftime('%d.%m.%Y')}", is_arabic)],
        [format_text(_("asset_assignment_signature", request), is_arabic), format_text(_("asset_assignment_signature", request), is_arabic)]
    ]

    if is_arabic:
        sig_data = [row[::-1] for row in sig_data]

    t_sig = Table(sig_data, colWidths=[250, 250])
    t_sig.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTNAME", (0, 1), (-1, -1), font_reg),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT" if is_arabic else "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
    ]))
    elements.append(t_sig)

    footer_func = create_footer(company, request, is_arabic, font_reg)
    doc.build(elements, onFirstPage=footer_func, onLaterPages=footer_func)

    buffer.seek(0)
    safe_filename = urllib.parse.quote(f"Asset_Handover_{emp.last_name}.pdf")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )


@router.post("/dynamic")
def export_dynamic_pdf(payload: DynamicReportRequest, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail=_("dynamic_report_forbidden", request))

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    employees = (
        db.query(Employee)
        .options(joinedload(Employee.department_rel), joinedload(Employee.position_rel))
        .filter(Employee.company_id == company.id, Employee.status == "ACTIVE")
        .order_by(Employee.first_name)
        .all()
    )

    if not payload.columns:
        raise HTTPException(status_code=400, detail=_("dynamic_report_min_one_column", request))

    is_landscape = len(payload.columns) > 5
    page_format = landscape(A4) if is_landscape else A4

    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    font_reg = "Amiri" if is_arabic else "Roboto"
    font_bold = "Amiri-Bold" if is_arabic else "Roboto-Bold"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=page_format, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=60)
    elements = get_header_elements(company, request, is_arabic, font_bold)

    heading_style = ParagraphStyle("Heading2", fontName=font_bold, fontSize=14, spaceAfter=10, alignment=2 if is_arabic else 0)
    normal_style = ParagraphStyle("Normal", fontName=font_reg, fontSize=10, alignment=2 if is_arabic else 0)

    elements.append(Paragraph(format_text(payload.title.upper(), is_arabic), heading_style))
    date_label = _("dynamic_report_date_label", request).format(date=date.today().strftime("%d.%m.%Y"))
    elements.append(Paragraph(format_text(date_label, is_arabic), normal_style))
    elements.append(Spacer(1, 20))

    translated_columns = []
    for col in payload.columns:
        if col == "Ad Soyad":
            translated_columns.append(format_text(_("dynamic_report_column_full_name", request), is_arabic))
        elif col == "TC/Kimlik No":
            translated_columns.append(format_text(_("dynamic_report_column_identity_no", request), is_arabic))
        elif col == "Departman":
            translated_columns.append(format_text(_("dynamic_report_column_department", request), is_arabic))
        elif col == "Kadro":
            translated_columns.append(format_text(_("dynamic_report_column_position", request), is_arabic))
        elif col == "Kan Grubu":
            translated_columns.append(format_text(_("dynamic_report_column_blood_type", request), is_arabic))
        elif col == "Telefon":
            translated_columns.append(format_text(_("dynamic_report_column_phone", request), is_arabic))
        elif col == "E-Posta":
            translated_columns.append(format_text(_("dynamic_report_column_email", request), is_arabic))
        elif col == "İşe Giriş":
            translated_columns.append(format_text(_("dynamic_report_column_hire_date", request), is_arabic))
        elif col == "Eğitim":
            translated_columns.append(format_text(_("dynamic_report_column_education", request), is_arabic))
        elif col == "Uyruk":
            translated_columns.append(format_text(_("dynamic_report_column_nationality", request), is_arabic))
        else:
            translated_columns.append(format_text(col, is_arabic))

    if is_arabic:
        translated_columns.reverse()

    table_data = [translated_columns]

    for emp in employees:
        dept_title = get_employee_department_title(emp)
        position_title = get_employee_position_title(emp, request)

        row = []
        for col in payload.columns:
            if col == "Ad Soyad":
                row.append(format_text(f"{emp.first_name} {emp.last_name}", is_arabic))
            elif col == "TC/Kimlik No":
                row.append(format_text(emp.identity_no or "-", is_arabic))
            elif col == "Departman":
                row.append(format_text(dept_title, is_arabic))
            elif col == "Kadro":
                row.append(format_text(position_title, is_arabic))
            elif col == "Kan Grubu":
                row.append(format_text(emp.blood_type or "-", is_arabic))
            elif col == "Telefon":
                row.append(format_text(emp.phone or "-", is_arabic))
            elif col == "E-Posta":
                row.append(format_text(emp.email or "-", is_arabic))
            elif col == "İşe Giriş":
                row.append(format_text(emp.hire_date.strftime("%d.%m.%Y") if emp.hire_date else "-", is_arabic))
            elif col == "Eğitim":
                row.append(format_text(emp.education_level or "-", is_arabic))
            elif col == "Uyruk":
                row.append(format_text(emp.nationality or "-", is_arabic))
            else:
                row.append("-")

        if is_arabic:
            row.reverse()

        table_data.append(row)

    usable_width = page_format[0] - 60
    col_width = usable_width / len(payload.columns)

    t = Table(table_data, colWidths=[col_width] * len(payload.columns))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT" if is_arabic else "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTNAME", (0, 1), (-1, -1), font_reg),
        ("FONTSIZE", (0, 0), (-1, -1), 9 if is_landscape else 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("WORDWRAP", (0, 0), (-1, -1), True),
    ]))

    elements.append(t)
    footer_func = create_footer(company, request, is_arabic, font_reg, is_landscape)
    doc.build(elements, onFirstPage=footer_func, onLaterPages=footer_func)

    buffer.seek(0)
    safe_filename = urllib.parse.quote(f"Report_{date.today()}.pdf")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )
