import os
import shutil
import ssl
import traceback
import string
import random
import io
import json
import urllib.request
import urllib.parse
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Request # 🎯 YENİ: Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func
from typing import List, Optional
from pydantic import BaseModel, validator
from app.core.email import EmailService

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

from app.core.database import get_db, SessionLocal
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password 
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz
from app.core.plan_features import ensure_plan_feature
from app.core.permissions import ensure_permission
from app.core.approval_routing import (
    can_user_approve_document,
    resolve_document_approvers,
    should_auto_approve,
)
from app.core.document_audit import log_document_action
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.core.scope import get_team_scoped_employee_ids
from app.api.report import format_text
from app.api.document import build_document_download_url

from app.models.employee import Employee, Position, Department, ProfileUpdateRequest
from app.models.company import Company
from app.models.document import EmployeeDocument
from app.models.asset_expense import Asset 
from app.models.asset_expense import Expense
from app.models.ats import Candidate
from app.models.training import TrainingParticipant, Training
from app.models.leave import LeaveRequest 
from app.models.helpdesk import Ticket
from app.models.mobile_device import MobileDevice
from app.models.checklist import LifecycleChecklistCompletion, LifecycleChecklistTemplate
from app.models.social import Kudos

from app.schemas.employee import (
    EmployeeCreate, EmployeeOut, EmployeeTerminate, EmployeeUpdate, 
    PositionCreate, PositionOut, PositionUpdate, EmployeeDocumentOut,
    DepartmentCreate, DepartmentOut, DepartmentUpdate 
)

router = APIRouter()
UPLOAD_DIR = "uploads" 
ALLOWED_EXTENSIONS = {"pdf", "jpeg", "jpg", "png", "doc", "docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# ==========================================
# 🇹🇷 TÜRKÇE FONT KURULUMU 
# ==========================================
FONT_DIR = "fonts"
os.makedirs(FONT_DIR, exist_ok=True)
regular_font_path = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
bold_font_path = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
amiri_regular_path = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
amiri_bold_path = os.path.join(FONT_DIR, "Amiri-Bold.ttf")

def ensure_fonts():
    if not os.path.exists(regular_font_path) or not os.path.exists(bold_font_path):
        print("⚠️ Uyarı: Font dosyaları eksik! PDF üretimi hata verebilir.")

ensure_fonts()

try:
    pdfmetrics.registerFont(TTFont('Roboto', regular_font_path))
    pdfmetrics.registerFont(TTFont('Roboto-Bold', bold_font_path))
    addMapping('Roboto', 0, 0, 'Roboto')       
    addMapping('Roboto', 1, 0, 'Roboto-Bold')
    if os.path.exists(amiri_regular_path) and os.path.exists(amiri_bold_path):
        pdfmetrics.registerFont(TTFont('EmployeeAmiri', amiri_regular_path))
        pdfmetrics.registerFont(TTFont('EmployeeAmiri-Bold', amiri_bold_path))
        addMapping('EmployeeAmiri', 0, 0, 'EmployeeAmiri')
        addMapping('EmployeeAmiri', 1, 0, 'EmployeeAmiri-Bold')
except Exception as e:
    print(f"Font Kayıt Hatası: {e}")

PDF_FONT_REGULAR = "Roboto" if "Roboto" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
PDF_FONT_BOLD = "Roboto-Bold" if "Roboto-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

# --- YARDIMCI FONKSİYONLAR ---
def generate_temp_password(length=8):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

def validate_file(file: UploadFile, request: Request):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=_("invalid_doc_format", request))
    
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=_("cv_size_limit", request))

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None

class DocStatusUpdate(BaseModel):
    status: str 

class TerminatePayload(BaseModel):
    exit_date: date

class ReviewProfileRequest(BaseModel):
    status: str 


class LifecycleDocumentRequest(BaseModel):
    kind: str


class LifecycleAccountCloseRequest(BaseModel):
    exit_date: Optional[date] = None


class LifecycleChecklistTemplateCreate(BaseModel):
    mode: str
    label: str
    detail: Optional[str] = None
    responsible_role: Optional[str] = None
    action_key: Optional[str] = None
    sort_order: Optional[int] = 0
    is_required: bool = True


class LifecycleChecklistToggleRequest(BaseModel):
    is_done: bool
    note: Optional[str] = None


class TerminationSettlementRow(BaseModel):
    label: str
    gross_amount: Optional[str] = ""
    legal_deduction: Optional[str] = ""
    net_amount: Optional[str] = ""
    special_deduction: Optional[str] = ""
    net_payment: Optional[str] = ""


class TerminationReleaseDraft(BaseModel):
    template_key: Optional[str] = "tr_release"
    employer_name: Optional[str] = ""
    employer_address: Optional[str] = ""
    employer_sgk_workplace_no: Optional[str] = ""
    employer_tax_number: Optional[str] = ""
    employee_name: Optional[str] = ""
    employee_social_security_no: Optional[str] = ""
    hire_date: Optional[str] = ""
    exit_date: Optional[str] = ""
    exit_reason: Optional[str] = ""
    exit_reason_note: Optional[str] = ""
    release_date: Optional[str] = ""
    intro_text: Optional[str] = ""
    settlement_text: Optional[str] = ""
    no_claim_text: Optional[str] = ""
    employee_contact_text: Optional[str] = ""
    payment_rows: List[TerminationSettlementRow]


OFFBOARDING_TEMPLATES = {
    "tr_release": {
        "title": "İbraname / İşten Ayrılış Mutabakatı",
        "subtitle": "TR / KKTC uyumlu klasik çıkış ve ibra metni",
        "heading": "İBRANAMEDİR",
        "intro_builder": lambda company_name, hire_date: (
            f"{hire_date} tarihinden itibaren çalışmakta olduğum "
            f"{company_name} işyerinden iş ilişkim sona erdiği için ayrılıyorum."
        ),
        "settlement_text": "Ayrıldığım tarihe kadar hak etmiş olduğum bütün ücret ve haklarımdan kalanını ayrıldığım esnada aşağıda gösterildiği şekilde aldım.",
        "no_claim_text": "İşyerimden hizmet akdimden ve yasal haklarımdan dolayı herhangi bir ayni, nakdi ya da sosyal hak alacağım kalmamıştır. Bu nedenle işyerimden maddi ve manevi herhangi bir talepte bulunmayacağım.",
        "contact_prompt": "Adres ve Telefon No",
        "requires_sgk": True,
    },
    "generic_clearance": {
        "title": "Final Settlement & Clearance Form",
        "subtitle": "Ülke bağımsız genel kapanış ve mutabakat formu",
        "heading": "FINAL SETTLEMENT & CLEARANCE",
        "intro_builder": lambda company_name, hire_date: (
            f"I have been employed at {company_name} since {hire_date}. My employment is ending and this form records the final settlement and handover status."
        ),
        "settlement_text": "The outstanding salary, benefits, unused leave and any additional payments are recorded below as part of the employee exit settlement.",
        "no_claim_text": "After the verified settlement and return of company property, no unpaid employment claim is expected to remain unless otherwise required by local law or a separate written agreement.",
        "contact_prompt": "Employee contact details / forwarding address",
        "requires_sgk": False,
    },
    "de_exit": {
        "title": "Austritt & Schlussabrechnung",
        "subtitle": "Almanya odaklı çıkış mutabakatı ve kapanış özeti",
        "heading": "AUSTRITT / SCHLUSSABRECHNUNG",
        "intro_builder": lambda company_name, hire_date: (
            f"Seit dem {hire_date} bin ich bei {company_name} beschäftigt. Mit meinem Austritt wird diese Schlussabrechnung und Freigabeübersicht erstellt."
        ),
        "settlement_text": "Offene Vergütungen, Resturlaubsansprüche, Zusatzleistungen und sonstige Zahlungen werden nachfolgend dokumentiert.",
        "no_claim_text": "Dieses Dokument dient als Austritts- und Abrechnungsübersicht. Rechtlich zwingende Ansprüche richten sich weiterhin nach dem anwendbaren Arbeitsrecht und ergänzenden Vereinbarungen.",
        "contact_prompt": "Adresse / Telefon / private E-Mail für Nachsendungen",
        "requires_sgk": False,
    },
}

LIFECYCLE_AUTO_ACTIONS = {
    "onboarding": {
        "ACCOUNT_OPENED": "Hesap açıldığında otomatik tamamla",
        "CONTRACT_STORED": "Sözleşme e-özlüğe kaydedildiğinde tamamla",
    },
    "offboarding": {
        "ACCOUNT_CLOSED": "Hesap kapatıldığında otomatik tamamla",
        "TERMINATION_STORED": "İşten ayrılış belgesi kaydedildiğinde tamamla",
    },
}


def _ensure_lifecycle_access(current_user: dict, request: Request, db: Session | None = None):
    ensure_permission(current_user, "lifecycle.manage_company", request)
    owns_session = db is None
    active_db = db or SessionLocal()
    try:
        ensure_plan_feature(current_user, "ops.lifecycle", request, active_db)
    finally:
        if owns_session:
            active_db.close()


def _get_company_employee(
    emp_id: int,
    db: Session,
    current_user: dict,
    request: Request,
):
    emp = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel),
    ).filter(
        Employee.id == emp_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    return emp


def _lifecycle_counts(db: Session, emp_id: int):
    total_documents = db.query(func.count(EmployeeDocument.id)).filter(EmployeeDocument.employee_id == emp_id).scalar() or 0
    pending_documents = db.query(func.count(EmployeeDocument.id)).filter(
        EmployeeDocument.employee_id == emp_id,
        EmployeeDocument.status == "PENDING"
    ).scalar() or 0
    contract_documents = db.query(func.count(EmployeeDocument.id)).filter(
        EmployeeDocument.employee_id == emp_id,
        EmployeeDocument.document_type == "SOZLESME"
    ).scalar() or 0
    termination_documents = db.query(func.count(EmployeeDocument.id)).filter(
        EmployeeDocument.employee_id == emp_id,
        EmployeeDocument.document_type == "ISTEN_CIKIS"
    ).scalar() or 0
    assigned_assets = db.query(func.count(Asset.id)).filter(
        Asset.employee_id == emp_id,
        Asset.status == "ASSIGNED"
    ).scalar() or 0
    pending_expenses = db.query(func.count(Expense.id)).filter(
        Expense.employee_id == emp_id,
        Expense.status == "PENDING"
    ).scalar() or 0
    pending_leaves = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.employee_id == emp_id,
        LeaveRequest.status == "PENDING"
    ).scalar() or 0
    open_tickets = db.query(func.count(Ticket.id)).filter(
        Ticket.created_by == emp_id,
        Ticket.status.in_(["AÇIK", "İŞLEMDE"])
    ).scalar() or 0
    active_devices = db.query(func.count(MobileDevice.id)).filter(
        MobileDevice.employee_id == emp_id,
        MobileDevice.is_active == True
    ).scalar() or 0
    return {
        "total_documents": total_documents,
        "pending_documents": pending_documents,
        "contract_documents": contract_documents,
        "termination_documents": termination_documents,
        "assigned_assets": assigned_assets,
        "pending_expenses": pending_expenses,
        "pending_leaves": pending_leaves,
        "open_tickets": open_tickets,
        "active_devices": active_devices,
    }


def _build_lifecycle_checklist(emp: Employee, counts: dict, mode: str):
    if mode == "offboarding":
        items = [
            {
                "id": "account_closed",
                "label": "Kullanıcı hesabı kapatıldı",
                "done": emp.status == "INACTIVE",
                "detail": "Hesap erişimi durdurulur, MFA ve mobil oturumlar pasifleştirilir.",
            },
            {
                "id": "exit_date",
                "label": "Çıkış tarihi tanımlandı",
                "done": bool(emp.exit_date),
                "detail": str(emp.exit_date) if emp.exit_date else "Henüz çıkış tarihi girilmedi.",
            },
            {
                "id": "termination_document",
                "label": "Çıkış belgesi oluşturuldu",
                "done": counts["termination_documents"] > 0,
                "detail": f"{counts['termination_documents']} belge",
            },
            {
                "id": "assets_returned",
                "label": "Zimmetler kapatıldı",
                "done": counts["assigned_assets"] == 0,
                "detail": f"{counts['assigned_assets']} aktif zimmet",
            },
            {
                "id": "finance_clearance",
                "label": "Açık izin ve masraf kalmadı",
                "done": counts["pending_expenses"] == 0 and counts["pending_leaves"] == 0,
                "detail": f"{counts['pending_leaves']} izin, {counts['pending_expenses']} masraf bekliyor",
            },
            {
                "id": "tickets_closed",
                "label": "Açık destek talepleri kapatıldı",
                "done": counts["open_tickets"] == 0,
                "detail": f"{counts['open_tickets']} açık talep",
            },
        ]
    else:
        items = [
            {
                "id": "org_assignment",
                "label": "Departman ve kadro ataması yapıldı",
                "done": bool(emp.department_id and emp.position_id),
                "detail": f"{emp.department_rel.name if emp.department_rel else 'Departman yok'} / {emp.position_rel.title if emp.position_rel else 'Kadro yok'}",
            },
            {
                "id": "account_ready",
                "label": "Kullanıcı hesabı hazır",
                "done": bool(emp.email and emp.hashed_password and emp.status == 'ACTIVE'),
                "detail": emp.email or "E-posta tanımlı değil",
            },
            {
                "id": "password_change",
                "label": "İlk giriş şifre değişimi bekleniyor",
                "done": bool(emp.require_password_change),
                "detail": emp.require_password_change and "Geçici şifre aktif" or "Şifre kalıcı hale gelmiş",
            },
            {
                "id": "contract_document",
                "label": "İş sözleşmesi oluşturuldu",
                "done": counts["contract_documents"] > 0,
                "detail": f"{counts['contract_documents']} belge",
            },
            {
                "id": "dossier_ready",
                "label": "Özlük evrakları toplandı",
                "done": counts["total_documents"] > 0,
                "detail": f"{counts['total_documents']} evrak, {counts['pending_documents']} bekleyen",
            },
            {
                "id": "device_login",
                "label": "İlk cihaz oturumu görüldü",
                "done": counts["active_devices"] > 0,
                "detail": f"{counts['active_devices']} cihaz kaydı",
            },
        ]

    completed = len([item for item in items if item["done"]])
    progress = int(round((completed / max(len(items), 1)) * 100))
    return items, progress


def _normalize_lifecycle_mode(mode: Optional[str]) -> str:
    return "offboarding" if str(mode).lower() == "offboarding" else "onboarding"


def _normalize_lifecycle_action(mode: str, action_key: Optional[str]) -> Optional[str]:
    if not action_key:
        return None
    normalized = str(action_key).strip().upper()
    return normalized if normalized in LIFECYCLE_AUTO_ACTIONS.get(mode, {}) else None


def _apply_lifecycle_action_completion(
    db: Session,
    emp: Employee,
    mode: str,
    action_key: str,
    actor_id: Optional[int],
):
    normalized_action = _normalize_lifecycle_action(mode, action_key)
    if not normalized_action:
        return

    templates = db.query(LifecycleChecklistTemplate).filter(
        LifecycleChecklistTemplate.company_id == emp.company_id,
        LifecycleChecklistTemplate.mode == mode,
        LifecycleChecklistTemplate.action_key == normalized_action,
    ).all()

    if not templates:
        return

    now = datetime.utcnow()
    for template in templates:
        completion = db.query(LifecycleChecklistCompletion).filter(
            LifecycleChecklistCompletion.template_id == template.id,
            LifecycleChecklistCompletion.employee_id == emp.id,
        ).first()
        if not completion:
            completion = LifecycleChecklistCompletion(
                template_id=template.id,
                employee_id=emp.id,
            )
            db.add(completion)
        completion.is_done = True
        completion.completed_at = now
        completion.completed_by = actor_id


def _build_custom_lifecycle_checklist(db: Session, emp: Employee, mode: str):
    templates = db.query(LifecycleChecklistTemplate).options(
        joinedload(LifecycleChecklistTemplate.completions)
        .joinedload(LifecycleChecklistCompletion.completer)
    ).filter(
        LifecycleChecklistTemplate.company_id == emp.company_id,
        LifecycleChecklistTemplate.mode == mode,
    ).order_by(LifecycleChecklistTemplate.sort_order.asc(), LifecycleChecklistTemplate.id.asc()).all()

    items = []
    for template in templates:
        completion = next((item for item in template.completions if item.employee_id == emp.id), None)
        completer_name = None
        if completion and completion.completer:
            completer_name = f"{completion.completer.first_name} {completion.completer.last_name}"
        items.append(
            {
                "id": f"template_{template.id}",
                "template_id": template.id,
                "label": template.label,
                "detail": template.detail or "Operasyonel süreç maddesi",
                "done": bool(completion and completion.is_done),
                "note": completion.note if completion else None,
                "responsible_role": template.responsible_role,
                "action_key": template.action_key,
                "is_required": template.is_required,
                "completed_at": completion.completed_at.isoformat() if completion and completion.completed_at else None,
                "completed_by_name": completer_name,
                "source": "template",
            }
        )
    return items


def _merge_lifecycle_checklists(db: Session, emp: Employee, counts: dict, mode: str):
    standard_items, _ = _build_lifecycle_checklist(emp, counts, mode)
    custom_items = _build_custom_lifecycle_checklist(db, emp, mode)
    combined = standard_items + custom_items
    completed = len([item for item in combined if item["done"]])
    progress = int(round((completed / max(len(combined), 1)) * 100))
    return {
        "standard": standard_items,
        "custom": custom_items,
        "combined": combined,
        "progress": progress,
    }


def _serialize_lifecycle_row(emp: Employee, counts: dict, mode: str, checklist_bundle: dict):
    checklist = checklist_bundle["combined"]
    progress = checklist_bundle["progress"]
    return {
        "id": emp.id,
        "name": f"{emp.first_name} {emp.last_name}",
        "email": emp.email,
        "role": emp.role,
        "status": emp.status,
        "department": emp.department_rel.name if emp.department_rel else "Departman yok",
        "position": emp.position_rel.title if emp.position_rel else "Kadro yok",
        "hire_date": str(emp.hire_date) if emp.hire_date else None,
        "exit_date": str(emp.exit_date) if emp.exit_date else None,
        "progress": progress,
        "counts": counts,
        "highlights": [item["label"] for item in checklist if not item["done"]][:3],
    }


def _get_lifecycle_employees(db: Session, current_user: dict, mode: str, search: Optional[str] = None):
    query = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel),
    ).filter(Employee.company_id == current_user["company_id"])

    if mode == "onboarding":
        query = query.filter(Employee.status == "ACTIVE").order_by(Employee.hire_date.desc(), Employee.id.desc())
    else:
        query = query.order_by(Employee.status.asc(), Employee.exit_date.desc(), Employee.id.desc())

    employees = query.all()
    if search:
        lowered = search.strip().lower()
        employees = [
            emp for emp in employees
            if lowered in " ".join([
                str(emp.first_name or ""),
                str(emp.last_name or ""),
                str(emp.email or ""),
                str(emp.role or ""),
                str(emp.department_rel.name if emp.department_rel else ""),
                str(emp.position_rel.title if emp.position_rel else ""),
            ]).lower()
        ]

    return employees


def _wrap_pdf_lines(pdf, lines, x_left=56, y_start=700, width=72, font_name=PDF_FONT_REGULAR, font_size=11, rtl=False):
    text = pdf.beginText()
    text.setTextOrigin(540 if rtl else x_left, y_start)
    text.setFont(font_name, font_size)
    line_height = font_size + 6
    for raw_line in lines:
        normalized = raw_line or ""
        chunks = [normalized[i:i + width] for i in range(0, len(normalized), width)] or [""]
        for chunk in chunks:
            if rtl:
                text.textLine(chunk)
            else:
                text.textLine(chunk)
        if not normalized:
            text.textLine("")
    pdf.drawText(text)


def _default_termination_rows():
    return [
        {"label": "Hakediş Ücreti", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "Fazla Mesai Ücreti", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "Kullanılmayan İzin Ücreti", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "Sosyal Haklar", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "İhbar Tazminatı", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "Kıdem Tazminatı", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
        {"label": "Toplam", "gross_amount": "", "legal_deduction": "", "net_amount": "", "special_deduction": "", "net_payment": ""},
    ]


def _get_offboarding_template(template_key: Optional[str]):
    normalized = str(template_key or "tr_release").strip().lower()
    return normalized, OFFBOARDING_TEMPLATES.get(normalized, OFFBOARDING_TEMPLATES["tr_release"])


def _build_termination_release_draft(emp: Employee, company: Optional[Company], template_key: Optional[str]) -> dict:
    normalized_key, template = _get_offboarding_template(template_key)
    exit_date_value = str(emp.exit_date or date.today())
    hire_date_value = str(emp.hire_date or "")
    employee_name = f"{emp.first_name} {emp.last_name}"
    company_name = company.name if company else "Company"
    return {
        "template_key": normalized_key,
        "employer_name": company.official_legal_name if company and company.official_legal_name else (company.name if company else ""),
        "employer_address": company.address if company and company.address else "",
        "employer_sgk_workplace_no": company.workplace_registration_no if company and getattr(company, "workplace_registration_no", None) else "",
        "employer_tax_number": company.tax_number if company and getattr(company, "tax_number", None) else "",
        "employee_name": employee_name,
        "employee_social_security_no": emp.social_security_no or "",
        "hire_date": hire_date_value,
        "exit_date": exit_date_value,
        "exit_reason": "",
        "exit_reason_note": "",
        "release_date": exit_date_value,
        "intro_text": template["intro_builder"](company_name, hire_date_value),
        "settlement_text": template["settlement_text"],
        "no_claim_text": template["no_claim_text"],
        "employee_contact_text": template["contact_prompt"],
        "payment_rows": _default_termination_rows(),
    }


def _build_termination_release_pdf(emp: Employee, company: Optional[Company], payload: TerminationReleaseDraft, request: Request):
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    regular_font = "EmployeeAmiri" if is_arabic and "EmployeeAmiri" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_REGULAR
    bold_font = "EmployeeAmiri-Bold" if is_arabic and "EmployeeAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_BOLD

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def fmt(text):
        return format_text(text, is_arabic, strip_html=True)

    normalized_key, template = _get_offboarding_template(payload.template_key)

    pdf.setTitle(f"Ibraname_{emp.first_name}_{emp.last_name}")
    pdf.setFont(bold_font, 18)
    pdf.drawString(56, height - 56, fmt(template["heading"]))

    y = height - 92
    pdf.setFont(bold_font, 12)
    pdf.drawString(56, y, fmt("İŞVERENİN"))
    y -= 22
    pdf.setFont(regular_font, 11)
    employer_lines = [
        f"Adı Soyadı / Unvanı: {payload.employer_name or ''}",
        f"Adresi: {payload.employer_address or ''}",
        f"SGK İşyeri Sicil Numarası: {payload.employer_sgk_workplace_no or ''}" if template["requires_sgk"] else "",
        f"Vergi Numarası: {payload.employer_tax_number or ''}" if payload.employer_tax_number else "",
        "",
        "İŞÇİNİN",
        f"Adı Soyadı: {payload.employee_name or ''}",
        f"SGK Sigorta Sicil Numarası: {payload.employee_social_security_no or ''}",
        f"İşe Başlama Tarihi: {payload.hire_date or ''}",
        f"İşten Ayrılış Tarihi: {payload.exit_date or ''}",
        f"İşten Ayrılış Nedeni: {(payload.exit_reason or '')}{(' - ' + payload.exit_reason_note) if payload.exit_reason_note else ''}",
        "",
        payload.intro_text or "",
        payload.settlement_text or "",
        payload.no_claim_text or "",
        "",
        f"İbra Tarihi: {payload.release_date or ''}",
    ]
    _wrap_pdf_lines(pdf, [fmt(line) for line in employer_lines], x_left=56, y_start=y, width=90, font_name=regular_font, font_size=11, rtl=is_arabic)

    y_table = 300
    pdf.setFont(bold_font, 10)
    headers = ["Ödemeler", "Brüt", "Yasal Kesinti", "Net", "Özel Kesinti", "Net Ödeme"]
    x_positions = [56, 190, 260, 350, 430, 510]
    for idx, header in enumerate(headers):
        pdf.drawString(x_positions[idx], y_table, fmt(header))

    pdf.setLineWidth(0.5)
    pdf.line(56, y_table - 4, width - 56, y_table - 4)
    pdf.setFont(regular_font, 9)
    row_y = y_table - 22
    for row in payload.payment_rows:
        values = [
            row.label,
            row.gross_amount,
            row.legal_deduction,
            row.net_amount,
            row.special_deduction,
            row.net_payment,
        ]
        for idx, value in enumerate(values):
            pdf.drawString(x_positions[idx], row_y, fmt(value or ""))
        row_y -= 18
        if row_y < 120:
            pdf.showPage()
            row_y = height - 72
            pdf.setFont(regular_font, 9)

    footer_y = max(row_y - 24, 90)
    pdf.setFont(regular_font, 11)
    _wrap_pdf_lines(
        pdf,
        [fmt(payload.employee_contact_text or "Adres ve Telefon No")],
        x_left=56,
        y_start=footer_y,
        width=90,
        font_name=regular_font,
        font_size=11,
        rtl=is_arabic,
    )
    pdf.setFont(bold_font, 11)
    pdf.drawString(56, max(footer_y - 46, 56), fmt("İBRA EDEN"))
    pdf.drawString(56, max(footer_y - 64, 40), fmt("Adı Soyadı / İmzası"))

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def _build_lifecycle_document_pdf(emp: Employee, company: Company, kind: str, request: Request):
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    regular_font = "EmployeeAmiri" if is_arabic and "EmployeeAmiri" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_REGULAR
    bold_font = "EmployeeAmiri-Bold" if is_arabic and "EmployeeAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_BOLD

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def fmt(text):
        return format_text(text, is_arabic, strip_html=True)

    pdf.setTitle(f"{kind}_{emp.first_name}_{emp.last_name}")
    pdf.setFont(bold_font, 18)
    heading = "İŞTEN AYRILIŞ / İBRANAME TASLAĞI" if kind == "termination" else "İŞ SÖZLEŞMESİ TASLAĞI"
    if is_arabic:
        pdf.drawRightString(width - 56, height - 56, fmt(heading))
    else:
        pdf.drawString(56, height - 56, fmt(heading))

    pdf.setFont(regular_font, 11)
    meta_lines = [
        f"Şirket: {company.name if company else '-'}",
        f"Personel: {emp.first_name} {emp.last_name}",
        f"E-posta: {emp.email or '-'}",
        f"Departman: {emp.department_rel.name if emp.department_rel else '-'}",
        f"Pozisyon: {emp.position_rel.title if emp.position_rel else '-'}",
        f"İşe giriş: {emp.hire_date or '-'}",
    ]
    if kind == "termination":
        meta_lines.append(f"Çıkış tarihi: {emp.exit_date or date.today()}")
    else:
        meta_lines.append(f"Aylık brüt ücret: {emp.gross_salary or '-'} {emp.salary_currency or ''}".strip())

    start_y = height - 100
    for index, line in enumerate(meta_lines):
        if is_arabic:
            pdf.drawRightString(width - 56, start_y - (index * 18), fmt(line))
        else:
            pdf.drawString(56, start_y - (index * 18), fmt(line))

    pdf.setFont(regular_font, 11)
    body_lines = []
    if kind == "termination":
        body_lines = [
            fmt("Bu belge, personelin işten ayrılış sürecinde kullanılmak üzere oluşturulan taslak metindir."),
            fmt("Şirket zimmetlerinin iadesi, açık masraf ve izin kayıtlarının kapatılması ile erişimlerin sonlandırılması bu süreçte doğrulanmalıdır."),
            fmt("Taraflar gerekli kontrolleri tamamladıktan sonra belge e-özlüğe kaydedilebilir veya imzaya sunulabilir."),
        ]
    else:
        body_lines = [
            fmt("Bu belge, personelin işe giriş süreci için oluşturulan sözleşme taslağıdır."),
            fmt("İşe giriş tarihi, görev unvanı, departman ve ücret bilgileri doğrulanarak imza sürecine alınmalıdır."),
            fmt("Belge üretildikten sonra e-özlüğe kaydedilebilir ve onboarding evrak setinin bir parçası olarak kullanılabilir."),
        ]

    _wrap_pdf_lines(
        pdf,
        body_lines,
        x_left=56,
        y_start=height - 240,
        width=78,
        font_name=regular_font,
        font_size=11,
        rtl=is_arabic,
    )

    pdf.setFont(bold_font, 12)
    signature_title = fmt("Onay / İmza Alanı")
    if is_arabic:
        pdf.drawRightString(width - 56, 180, signature_title)
    else:
        pdf.drawString(56, 180, signature_title)
    pdf.line(56, 120, 240, 120)
    pdf.line(width - 240, 120, width - 56, 120)
    pdf.setFont(regular_font, 10)
    pdf.drawString(56, 105, fmt("Şirket Yetkilisi"))
    pdf.drawRightString(width - 56, 105, fmt("Personel"))

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def _persist_generated_lifecycle_document(
    emp: Employee,
    kind: str,
    pdf_bytes: bytes,
    request: Request,
    db: Session,
):
    os.makedirs(os.path.join(UPLOAD_DIR, "documents"), exist_ok=True)
    safe_kind = "sozlesme" if kind == "contract" else "isten_cikis"
    file_name = f"{safe_kind}_{emp.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
    relative_path = f"/uploads/documents/{file_name}"
    absolute_path = os.path.join(UPLOAD_DIR, "documents", file_name)
    with open(absolute_path, "wb") as target:
        target.write(pdf_bytes)

    doc = EmployeeDocument(
        employee_id=emp.id,
        category="SISTEM",
        document_type="SOZLESME" if kind == "contract" else "ISTEN_CIKIS",
        file_name=file_name,
        file_path=relative_path,
        notes="Onboarding/Offboarding sürecinden sistem tarafından üretildi.",
        status="APPROVED",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

# ==========================================
# 🛡️ 1. ÇALIŞAN KİŞİSEL AYARLAR & PORTAL ROTALARI
# ==========================================

@router.put("/me/change-password")
def change_my_password(payload: ChangePasswordRequest, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == current_user["user_id"]).first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    if not verify_password(payload.old_password, emp.hashed_password):
        raise HTTPException(status_code=400, detail=_("incorrect_current_password", request))
    emp.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": _("password_updated", request)}

@router.put("/me/profile")
def request_my_profile_update(payload: UpdateProfileRequest, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == current_user["user_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    
    changes = {}
    if payload.phone is not None and payload.phone != emp.phone: 
        changes["phone"] = payload.phone
    if payload.address is not None and payload.address != emp.address: 
        changes["address"] = payload.address
        
    if not changes:
        return {"message": _("no_changes_detected", request)}
        
    new_req = ProfileUpdateRequest(
        employee_id=emp.id,
        changes_json=json.dumps(changes),
        status="PENDING"
    )
    db.add(new_req)
    db.commit()
    return {"message": _("profile_update_requested", request)}

@router.get("/me/portal")
def get_my_portal_data(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp_id = current_user["user_id"] 
    comp_id = current_user["company_id"]
    current_month = date.today().month
    current_year = date.today().year

    emp = db.query(Employee).options(
        joinedload(Employee.company),
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel)
    ).filter(Employee.id == emp_id, Employee.company_id == comp_id).first()
    
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == emp_id,
        LeaveRequest.status == "APPROVED",
        extract('year', LeaveRequest.start_date) == current_year
    ).all()
    used_days = sum(req.total_days for req in approved_leaves)

    assets = db.query(Asset).filter(Asset.employee_id == emp_id, Asset.status == "ASSIGNED").all()
    
    trainings = db.query(Training).join(TrainingParticipant, Training.id == TrainingParticipant.training_id)\
        .filter(TrainingParticipant.employee_id == emp_id, Training.status == "SCHEDULED", Training.training_date >= date.today())\
        .order_by(Training.training_date.asc()).all()

    documents = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp_id).all()
    received_kudos_count = db.query(Kudos).filter(Kudos.receiver_id == emp_id, Kudos.company_id == comp_id).count()
    sent_kudos_count = db.query(Kudos).filter(Kudos.sender_id == emp_id, Kudos.company_id == comp_id).count()
    all_active_emps = db.query(Employee).filter(Employee.company_id == comp_id, Employee.status == "ACTIVE").all()
    celebrations = []
    
    for e in all_active_emps:
        if e.id == emp_id: continue
        if e.birth_date and e.birth_date.month == current_month:
            celebrations.append({"type": "BIRTHDAY", "name": f"{e.first_name} {e.last_name}", "day": e.birth_date.day})
        if e.hire_date and e.hire_date.month == current_month and e.hire_date.year < current_year:
            years = current_year - e.hire_date.year
            celebrations.append({"type": "ANNIVERSARY", "name": f"{e.first_name} {e.last_name}", "day": e.hire_date.day, "years": years})

    celebrations.sort(key=lambda x: x["day"])

    return {
        "profile": {
            "id": emp.id, 
            "first_name": emp.first_name, 
            "last_name": emp.last_name, 
            "department": emp.department_rel.name if emp.department_rel else "Bilinmiyor", 
            "position": emp.position_rel.title if emp.position_rel else "Bilinmiyor", 
            "phone": emp.phone, 
            "address": emp.address
        },
        "leave": {"used_days": used_days},
        "assets": [{"id": a.id, "asset_name": a.asset_name, "category": a.category} for a in assets],
        "trainings": [
            {
                "id": t.id, 
                "title": t.title, 
                "training_date": t.training_date.isoformat() if t.training_date else None, 
                "date": t.training_date.strftime("%d.%m.%Y") if t.training_date else "-", 
                "time": t.training_time.strftime("%H:%M") if hasattr(t.training_time, "strftime") else str(t.training_time or "-")
            } for t in trainings
        ],
        "documents": [{"id": d.id, "file_name": d.file_name, "category": d.category, "status": d.status} for d in documents],
        "social": {
            "received_kudos_count": received_kudos_count,
            "sent_kudos_count": sent_kudos_count,
        },
        "celebrations": celebrations,
        "subscription": {
            "plan_code": getattr(emp.company, "plan_code", "PRO") if getattr(emp, "company", None) else "PRO"
        }
    }

# ==========================================
# 🛂 1.5. İK / ADMİN: PROFİL TALEPLERİ ONAY SİSTEMİ (YENİ)
# ==========================================
@router.get("/profile-requests")
def get_profile_requests(
    request: Request,
    status: str = "PENDING",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    requests = (
        db.query(ProfileUpdateRequest)
        .options(joinedload(ProfileUpdateRequest.employee))
        .join(Employee, ProfileUpdateRequest.employee_id == Employee.id)
        .filter(
            Employee.company_id == current_user["company_id"],
            ProfileUpdateRequest.status == status
        )
        .order_by(ProfileUpdateRequest.created_at.desc())
        .all()
    )

    result = []
    for r in requests:
        result.append({
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
            "changes": json.loads(r.changes_json),
            "status": r.status,
            "created_at": r.created_at.isoformat()
        })

    return result


@router.put("/profile-requests/{req_id}/status")
def review_profile_request(
    req_id: int,
    payload: ReviewProfileRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=_("request_not_found", request))

    emp = db.query(Employee).filter(
        Employee.id == req.employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not emp:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    if payload.status == "APPROVED":
        changes = json.loads(req.changes_json)
        for key, val in changes.items():
            if hasattr(emp, key):
                setattr(emp, key, val)

    req.status = payload.status
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user["user_id"]

    db.commit()
    return {"message": _("request_status_updated", request).format(status=payload.status)}


# ==========================================
# 📂 2. E-ÖZLÜK (EVRAK) YÖNETİMİ
# ==========================================

@router.post("/{emp_id}/document")
def upload_employee_document(
    request: Request,
    emp_id: int, category: str = Form(...), document_type: str = Form(...),
    expiry_date: Optional[date] = Form(None), notes: Optional[str] = Form(None),
    file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != emp_id:
        raise HTTPException(status_code=403, detail=_("upload_own_only", request))

    validate_file(file, request)

    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_filename = f"doc_{current_user['company_id']}_{emp_id}_{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    approvers = resolve_document_approvers(db, emp.company_id, emp)
    doc_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"

    new_doc = EmployeeDocument(
        employee_id=emp_id, category=category, document_type=document_type,
        file_name=file.filename, file_path=file_path, expiry_date=expiry_date, notes=notes, status=doc_status
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    log_document_action(
        db,
        company_id=emp.company_id,
        employee_id=emp.id,
        document_id=new_doc.id,
        actor_employee_id=current_user["user_id"],
        action="UPLOADED",
        new_status=doc_status,
        document_type=document_type,
        file_name=file.filename,
        detail=f"document_type={document_type}",
    )
    db.commit()
    if new_doc.status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.DOCUMENT_UPLOADED,
            {
                "company_id": emp.company_id,
                "entity_id": new_doc.id,
                "subject_employee_id": emp.id,
                "subject_employee_name": f"{emp.first_name} {emp.last_name}".strip(),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
            },
        )
    return {"message": _("doc_uploaded", request), "status": new_doc.status}

@router.put("/document/{doc_id}/status")
def update_document_status(doc_id: int, payload: DocStatusUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["HR", "ADMIN", "SUPERADMIN"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    doc = db.query(EmployeeDocument).options(joinedload(EmployeeDocument.employee)).filter(EmployeeDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail=_("doc_not_found", request))
    if not can_user_approve_document(db, doc, current_user, doc.employee):
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
    previous_status = doc.status
    doc.status = payload.status
    log_document_action(
        db,
        company_id=doc.employee.company_id if doc.employee else current_user["company_id"],
        employee_id=doc.employee_id,
        document_id=doc.id,
        actor_employee_id=current_user["user_id"],
        action="STATUS_UPDATED",
        previous_status=previous_status,
        new_status=payload.status,
        document_type=doc.document_type,
        file_name=doc.file_name,
        detail=(
            f"{doc.file_name or 'Evrak'} "
            f"{'onaylandı' if payload.status == 'APPROVED' else 'reddedildi'}"
        ),
    )
    db.commit()
    dispatch_push_event(
        db,
        PushEventType.DOCUMENT_APPROVED if payload.status == "APPROVED" else PushEventType.DOCUMENT_REJECTED,
        {
            "company_id": doc.employee.company_id if doc.employee else current_user["company_id"],
            "entity_id": doc.id,
            "subject_employee_id": doc.employee_id,
            "subject_employee_name": f"{doc.employee.first_name} {doc.employee.last_name}".strip() if doc.employee else None,
            "actor_employee_id": current_user["user_id"],
        },
    )
    return {"message": _("doc_status_updated", request).format(status=payload.status)}

@router.delete("/document/{doc_id}")
def delete_employee_document(doc_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail=_("doc_not_found", request))
    emp = db.query(Employee).filter(Employee.id == doc.employee_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    if current_user["role"] == "EMPLOYEE":
        if doc.employee_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail=_("delete_own_docs_only", request))
        if doc.status != "PENDING":
            raise HTTPException(status_code=403, detail=_("delete_own_docs_only", request))
    if os.path.exists(doc.file_path): os.remove(doc.file_path)
    log_document_action(
        db,
        company_id=emp.company_id,
        employee_id=emp.id,
        document_id=doc.id,
        actor_employee_id=current_user["user_id"],
        action="DELETED",
        previous_status=doc.status,
        document_type=doc.document_type,
        file_name=doc.file_name,
        detail="document_deleted",
    )
    db.delete(doc)
    db.commit()
    return {"message": _("doc_deleted", request)}

# ==========================================
# 🏢 3. DEPARTMAN YÖNETİMİ
# ==========================================
@router.post("/department", response_model=DepartmentOut)
def create_department(dept_in: DepartmentCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: 
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
    
    existing_dept = db.query(Department).filter(
        Department.company_id == current_user["company_id"],
        func.lower(Department.name) == func.lower(dept_in.name)
    ).first()
    
    if existing_dept:
        raise HTTPException(status_code=400, detail=_("dept_already_exists", request).format(dept_name=dept_in.name.upper()))

    new_dept = Department(company_id=current_user["company_id"], name=dept_in.name)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept

@router.get("/department/list", response_model=List[DepartmentOut])
def list_departments(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(Department).filter(Department.company_id == current_user["company_id"]).all()

@router.put("/department/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, payload: DepartmentUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: 
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
        
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == current_user["company_id"]).first()
    if not dept: 
        raise HTTPException(status_code=404, detail=_("dept_not_found", request))
        
    if payload.name:
        duplicate_check = db.query(Department).filter(
            Department.company_id == current_user["company_id"],
            func.lower(Department.name) == func.lower(payload.name),
            Department.id != dept_id 
        ).first()
        
        if duplicate_check:
            raise HTTPException(status_code=400, detail=_("dept_name_conflict", request).format(dept_name=payload.name.upper()))
            
        dept.name = payload.name
        
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/department/{dept_id}")
def delete_department(dept_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == current_user["company_id"]).first()
    if not dept: raise HTTPException(status_code=404, detail=_("dept_not_found", request))
    
    active_emps = db.query(Employee).filter(Employee.department_id == dept_id, Employee.status == "ACTIVE").count()
    if active_emps > 0: raise HTTPException(status_code=400, detail=_("dept_has_active_emps", request).format(count=active_emps))
    
    active_pos = db.query(Position).filter(Position.department_id == dept_id).count()
    if active_pos > 0: raise HTTPException(status_code=400, detail=_("dept_has_active_pos", request).format(count=active_pos))
    
    db.delete(dept)
    db.commit()
    return {"message": _("dept_deleted", request)}

# ==========================================
# 🎯 4. KADRO (POSITION) YÖNETİMİ
# ==========================================

@router.post("/position", response_model=PositionOut)
def create_position(position_in: PositionCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    
    new_position = Position(
        company_id=current_user["company_id"], 
        title=position_in.title, 
        department_id=position_in.department_id, 
        parent_id=position_in.parent_id
    )
    db.add(new_position)
    db.commit()
    db.refresh(new_position)
    return new_position

@router.put("/position/{pos_id}", response_model=PositionOut)
def update_position(pos_id: int, payload: PositionUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    pos = db.query(Position).filter(Position.id == pos_id, Position.company_id == current_user["company_id"]).first()
    if not pos: raise HTTPException(status_code=404, detail=_("position_not_found", request))
    
    update_data = payload.dict(exclude_unset=True)
    if "parent_id" in update_data and update_data["parent_id"] == pos.id: 
        raise HTTPException(status_code=400, detail=_("position_cannot_link_self", request))
        
    for key, value in update_data.items(): setattr(pos, key, value)
    db.commit()
    db.refresh(pos)
    return pos

@router.get("/position/list")
def list_positions(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    positions = db.query(Position).options(joinedload(Position.department_rel)).filter(Position.company_id == current_user["company_id"]).all()
    result = []
    for p in positions:
        result.append({
            "id": p.id,
            "title": p.title,
            "department_id": p.department_id,
            "department": p.department_rel.name if p.department_rel else "Bilinmiyor",
            "parent_id": p.parent_id,
            "company_id": p.company_id
        })
    return result

@router.delete("/position/{pos_id}")
def delete_position(pos_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    pos = db.query(Position).filter(Position.id == pos_id, Position.company_id == current_user["company_id"]).first()
    if not pos: raise HTTPException(status_code=404, detail=_("position_not_found", request))
    
    active_emps = db.query(Employee).filter(Employee.position_id == pos_id, Employee.status == "ACTIVE").count()
    if active_emps > 0: raise HTTPException(status_code=400, detail=_("position_has_active_emps", request).format(count=active_emps))
    
    child_positions = db.query(Position).filter(Position.parent_id == pos_id).count()
    if child_positions > 0: raise HTTPException(status_code=400, detail=_("position_has_child_pos", request))
    
    db.delete(pos)
    db.commit()
    return {"message": _("position_deleted", request)}

@router.get("/org-chart")
def get_organization_chart(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    company_id = current_user["company_id"]
    positions = db.query(Position).options(joinedload(Position.department_rel)).filter(Position.company_id == company_id).all()
    active_emps = db.query(Employee).options(
        joinedload(Employee.department_rel)
    ).filter(
        Employee.status == "ACTIVE",
        Employee.company_id == company_id
    ).all()
    
    emp_map = {}
    for emp in active_emps:
        if not emp.position_id:
            continue
        if emp.position_id not in emp_map: emp_map[emp.position_id] = []
        emp_map[emp.position_id].append({"id": emp.id, "first_name": emp.first_name, "last_name": emp.last_name})
    
    pos_dict = {
        pos.id: {
            "id": pos.id, 
            "title": pos.title, 
            "department": pos.department_rel.name if pos.department_rel else "Bilinmiyor", 
            "parent_id": pos.parent_id, 
            "is_vacant": len(emp_map.get(pos.id, [])) == 0, 
            "employees": emp_map.get(pos.id, []), 
            "subordinates": []
        } for pos in positions
    }
    
    org_chart = []
    for pos_id, pos_data in pos_dict.items():
        if pos_data["parent_id"] and pos_data["parent_id"] in pos_dict: pos_dict[pos_data["parent_id"]]["subordinates"].append(pos_data)
        else: org_chart.append(pos_data)

    unassigned_by_department = {}
    for emp in active_emps:
        if emp.position_id:
            continue
        dept_id = emp.department_id or 0
        if dept_id not in unassigned_by_department:
            unassigned_by_department[dept_id] = {
                "department_name": emp.department_rel.name if emp.department_rel else _("unspecified_department", request),
                "employees": [],
            }
        unassigned_by_department[dept_id]["employees"].append({
            "id": emp.id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
        })

    for dept_id, group in unassigned_by_department.items():
        org_chart.append({
            "id": -(900000 + int(dept_id or 0)),
            "title": _("org_unassigned_position", request),
            "department": group["department_name"],
            "parent_id": None,
            "is_vacant": False,
            "employees": group["employees"],
            "subordinates": [],
            "is_system_generated": True,
        })
    return org_chart

# ==========================================
# 👥 5. PERSONEL GENEL YÖNETİMİ (BAĞIMLI ROTALAR EN ALTTA)
# ==========================================

@router.post("/create", response_model=EmployeeOut)
def create_employee(payload: EmployeeCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR"]: 
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
    
    emp_data = payload.dict()

    if emp_data.get("first_name"):
        emp_data["first_name"] = str(emp_data["first_name"]).strip()
    if emp_data.get("last_name"):
        emp_data["last_name"] = str(emp_data["last_name"]).strip()
    if emp_data.get("email"):
        emp_data["email"] = str(emp_data["email"]).strip().lower()
    if emp_data.get("phone"):
        emp_data["phone"] = str(emp_data["phone"]).strip()
    if emp_data.get("emergency_contact_name"):
        emp_data["emergency_contact_name"] = str(emp_data["emergency_contact_name"]).strip()
    if emp_data.get("emergency_contact_relation"):
        emp_data["emergency_contact_relation"] = str(emp_data["emergency_contact_relation"]).strip()
    if emp_data.get("emergency_contact_phone"):
        emp_data["emergency_contact_phone"] = str(emp_data["emergency_contact_phone"]).strip()
    if emp_data.get("identity_no"):
        emp_data["identity_no"] = str(emp_data["identity_no"]).strip()
    if emp_data.get("bank_name"):
        emp_data["bank_name"] = str(emp_data["bank_name"]).strip()
    if emp_data.get("iban"):
        emp_data["iban"] = str(emp_data["iban"]).replace(" ", "").upper()
    if emp_data.get("account_holder_name"):
        emp_data["account_holder_name"] = str(emp_data["account_holder_name"]).strip()
    if emp_data.get("tax_id_number"):
        emp_data["tax_id_number"] = str(emp_data["tax_id_number"]).strip()
    if emp_data.get("work_authorization_type"):
        emp_data["work_authorization_type"] = str(emp_data["work_authorization_type"]).strip()
    if emp_data.get("work_authorization_no"):
        emp_data["work_authorization_no"] = str(emp_data["work_authorization_no"]).strip()
    if emp_data.get("visa_type"):
        emp_data["visa_type"] = str(emp_data["visa_type"]).strip()
    if emp_data.get("background_check_status"):
        emp_data["background_check_status"] = str(emp_data["background_check_status"]).strip()
    if emp_data.get("occupational_health_status"):
        emp_data["occupational_health_status"] = str(emp_data["occupational_health_status"]).strip()
    if emp_data.get("department_id") not in [None, ""]:
        emp_data["department_id"] = int(emp_data["department_id"])
    if emp_data.get("position_id") not in [None, ""]:
        emp_data["position_id"] = int(emp_data["position_id"])
    
    identity_no = emp_data.get("identity_no")
    email = emp_data.get("email")
    phone = emp_data.get("phone")
    
    if identity_no and db.query(Employee).filter(Employee.identity_no == identity_no).first():
        raise HTTPException(status_code=400, detail=_("identity_no_exists", request).format(val=identity_no))
            
    if email and db.query(Employee).filter(Employee.email == email).first():
        raise HTTPException(status_code=400, detail=_("email_exists", request).format(val=email))
            
    if phone and db.query(Employee).filter(Employee.phone == phone).first():
        raise HTTPException(status_code=400, detail=_("phone_exists", request).format(val=phone))

    candidate_id = emp_data.pop("candidate_id", None)
    emp_data["company_id"] = current_user["company_id"]

    if candidate_id:
        cand = db.query(Candidate).filter(
            Candidate.id == candidate_id,
            Candidate.company_id == current_user["company_id"]
        ).first()
        if not cand:
            raise HTTPException(status_code=404, detail=_("candidate_not_found", request))
        if cand.stage == "ISE_ALINDI":
            raise HTTPException(status_code=400, detail="Bu aday daha once ise alinmis.")
    
    for date_field in [
        "birth_date",
        "hire_date",
        "work_authorization_start_date",
        "work_authorization_expiry_date",
        "visa_expiry_date",
        "nda_signed_at",
        "handbook_ack_signed_at",
        "background_check_completed_at",
        "occupational_health_valid_until",
    ]:
        val = emp_data.get(date_field)
        if isinstance(val, str):
            if val.strip() == "" or val == "null": emp_data[date_field] = None
            else: emp_data[date_field] = datetime.strptime(val[:10], "%Y-%m-%d").date()

    emp = Employee(**emp_data)
    temp_pwd = generate_temp_password()
    emp.hashed_password = hash_password(temp_pwd)
    emp.require_password_change = True
    emp.otp_code = None
    emp.otp_expiry = None
    
    try:
        db.add(emp)
        db.flush() 
        if candidate_id:
            cand.stage = "ISE_ALINDI"
            try:
                existing_badges = json.loads(cand.workflow_badges or "[]")
                if not isinstance(existing_badges, list):
                    existing_badges = []
            except (TypeError, ValueError):
                existing_badges = []

            if "employee_record_created" not in existing_badges:
                existing_badges.append("employee_record_created")
            cand.workflow_badges = json.dumps(existing_badges)
        db.commit()
        db.refresh(emp)
        
        # ==========================================
        # 🚨 SİHİRLİ DOKUNUŞ: GERÇEK E-POSTA GÖNDERİMİ (Dile dokunulmadı)
        # ==========================================
        try:
            if emp.email:
                subject = f"Aramıza Hoş Geldin {emp.first_name}! (HRPro AI)"
                html_content = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                            <h2 style="color: #0ea5e9;">Aramıza Hoş Geldin, {emp.first_name.upper()}! 🎉</h2>
                            <p>Şirketimizin dijital İK portalı <strong>HRPro AI</strong> üzerinde hesabın başarıyla oluşturuldu.</p>
                            <p>Sisteme giriş yaparak kendi profilini, izinlerini, bordrolarını ve performans hedeflerini yönetebilirsin.</p>
                            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                                <p style="margin: 0;"><strong>Giriş E-Postan:</strong> {emp.email}</p>
                                <p style="margin: 0;"><strong>Geçici Şifren:</strong> <span style="font-size: 18px; font-weight: bold; color: #e11d48;">{temp_pwd}</span></p>
                            </div>
                            <p style="font-size: 12px; color: #64748b;"><em>Not: Güvenliğin için sisteme ilk girişinde "Hesabım" bölümünden şifreni değiştirmeni tavsiye ederiz.</em></p>
                            <br>
                            <p>Başarılar dileriz,<br><strong>İnsan Kaynakları Departmanı</strong></p>
                        </div>
                    </body>
                </html>
                """
                EmailService.send_email(to_email=emp.email, subject=subject, body_html=html_content)
            else:
                print("E-posta adresi olmadığı için mail gönderilmedi.")
        except Exception as mail_error:
            print(f"Personel oluşturuldu ancak hoş geldin maili gönderilemedi: {mail_error}")

        return emp
    except Exception as e:
        db.rollback() 
        raise HTTPException(status_code=400, detail=f"HATA: {str(e)}")

@router.get("/list") 
def get_employees(request: Request, status: Optional[str] = "ACTIVE", db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    
    query = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel)
    ).filter(
        Employee.status == status, 
        Employee.company_id == current_user["company_id"]
    )

    if current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(Employee.id.in_(employee_ids))

    employees = query.order_by(Employee.id.desc()).all()
    employee_ids = [emp.id for emp in employees]
    pending_document_counts = {}
    total_document_counts = {}
    if employee_ids:
        pending_rows = db.query(
            EmployeeDocument.employee_id,
            func.count(EmployeeDocument.id)
        ).filter(
            EmployeeDocument.employee_id.in_(employee_ids),
            EmployeeDocument.status == "PENDING"
        ).group_by(EmployeeDocument.employee_id).all()
        total_rows = db.query(
            EmployeeDocument.employee_id,
            func.count(EmployeeDocument.id)
        ).filter(
            EmployeeDocument.employee_id.in_(employee_ids)
        ).group_by(EmployeeDocument.employee_id).all()
        pending_document_counts = {employee_id: count for employee_id, count in pending_rows}
        total_document_counts = {employee_id: count for employee_id, count in total_rows}
    
    result = []
    for emp in employees:
        result.append({
            "id": emp.id, 
            "company_id": emp.company_id, 
            "position_id": emp.position_id,
            "department_id": emp.department_id,
            "first_name": emp.first_name, 
            "last_name": emp.last_name, 
            "email": emp.email,
            "phone": emp.phone or "", 
            "department": emp.department_rel.name if emp.department_rel else "Departmansız",
            "position": emp.position_rel.title if emp.position_rel else "Kadrosuz", 
            "hire_date": str(emp.hire_date) if emp.hire_date else "-", 
            "exit_date": str(emp.exit_date) if emp.exit_date else "-", 
            "status": emp.status,
            "pending_document_count": pending_document_counts.get(emp.id, 0),
            "document_count": total_document_counts.get(emp.id, 0),
            "has_documents": total_document_counts.get(emp.id, 0) > 0,
        })
    return result


@router.get("/lifecycle/overview")
def get_employee_lifecycle_overview(
    request: Request,
    mode: str = "onboarding",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_mode = _normalize_lifecycle_mode(mode)
    employees = _get_lifecycle_employees(db, current_user, normalized_mode, search)

    rows = []
    summary = {
        "total": 0,
        "accounts_ready": 0,
        "documents_ready": 0,
        "attention_needed": 0,
        "closed_accounts": 0,
    }

    for emp in employees:
        counts = _lifecycle_counts(db, emp.id)
        checklist_bundle = _merge_lifecycle_checklists(db, emp, counts, normalized_mode)
        progress = checklist_bundle["progress"]
        rows.append(_serialize_lifecycle_row(emp, counts, normalized_mode, checklist_bundle))
        summary["total"] += 1
        if normalized_mode == "onboarding":
            if emp.status == "ACTIVE" and emp.email and emp.hashed_password:
                summary["accounts_ready"] += 1
            if counts["contract_documents"] > 0 and counts["total_documents"] > 0:
                summary["documents_ready"] += 1
        else:
            if emp.status == "INACTIVE":
                summary["closed_accounts"] += 1
            if counts["termination_documents"] > 0:
                summary["documents_ready"] += 1

        if progress < 100:
            summary["attention_needed"] += 1

    return {
        "mode": normalized_mode,
        "summary": summary,
        "employees": rows,
    }


@router.get("/{emp_id}/lifecycle/detail")
def get_employee_lifecycle_detail(
    emp_id: int,
    request: Request,
    mode: str = "onboarding",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_mode = _normalize_lifecycle_mode(mode)
    emp = _get_company_employee(emp_id, db, current_user, request)
    counts = _lifecycle_counts(db, emp.id)
    checklist_bundle = _merge_lifecycle_checklists(db, emp, counts, normalized_mode)
    return {
        "mode": normalized_mode,
        "employee": _serialize_lifecycle_row(emp, counts, normalized_mode, checklist_bundle),
        "checklist": checklist_bundle["standard"],
        "custom_checklist": checklist_bundle["custom"],
        "progress": checklist_bundle["progress"],
        "actions": {
            "can_open_account": bool(emp.email),
            "can_close_account": emp.status == "ACTIVE",
            "can_generate_contract": normalized_mode == "onboarding",
            "can_generate_termination": normalized_mode == "offboarding",
        },
    }


@router.get("/lifecycle/checklist/templates")
def get_lifecycle_checklist_templates(
    request: Request,
    mode: str = "onboarding",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_mode = _normalize_lifecycle_mode(mode)
    templates = db.query(LifecycleChecklistTemplate).filter(
        LifecycleChecklistTemplate.company_id == current_user["company_id"],
        LifecycleChecklistTemplate.mode == normalized_mode,
    ).order_by(LifecycleChecklistTemplate.sort_order.asc(), LifecycleChecklistTemplate.id.asc()).all()
    return {
        "mode": normalized_mode,
        "items": [
            {
                "id": item.id,
                "label": item.label,
                "detail": item.detail,
                "responsible_role": item.responsible_role,
                "action_key": item.action_key,
                "sort_order": item.sort_order,
                "is_required": item.is_required,
            }
            for item in templates
        ],
        "available_actions": [
            {"key": key, "label": label}
            for key, label in LIFECYCLE_AUTO_ACTIONS.get(normalized_mode, {}).items()
        ],
    }


@router.post("/lifecycle/checklist/templates")
def create_lifecycle_checklist_template(
    payload: LifecycleChecklistTemplateCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_mode = _normalize_lifecycle_mode(payload.mode)
    normalized_action = _normalize_lifecycle_action(normalized_mode, payload.action_key)
    template = LifecycleChecklistTemplate(
        company_id=current_user["company_id"],
        mode=normalized_mode,
        label=payload.label.strip(),
        detail=(payload.detail or "").strip() or None,
        responsible_role=(payload.responsible_role or "").strip().upper() or None,
        action_key=normalized_action,
        sort_order=payload.sort_order or 0,
        is_required=bool(payload.is_required),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"message": "Checklist şablon maddesi eklendi.", "id": template.id}


@router.delete("/lifecycle/checklist/templates/{template_id}")
def delete_lifecycle_checklist_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    template = db.query(LifecycleChecklistTemplate).filter(
        LifecycleChecklistTemplate.id == template_id,
        LifecycleChecklistTemplate.company_id == current_user["company_id"],
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist şablon maddesi bulunamadı.")
    db.delete(template)
    db.commit()
    return {"message": "Checklist şablon maddesi silindi."}


@router.put("/{emp_id}/lifecycle/checklist/{template_id}")
def toggle_employee_lifecycle_checklist_item(
    emp_id: int,
    template_id: int,
    payload: LifecycleChecklistToggleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)
    template = db.query(LifecycleChecklistTemplate).filter(
        LifecycleChecklistTemplate.id == template_id,
        LifecycleChecklistTemplate.company_id == current_user["company_id"],
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist şablon maddesi bulunamadı.")

    completion = db.query(LifecycleChecklistCompletion).filter(
        LifecycleChecklistCompletion.template_id == template_id,
        LifecycleChecklistCompletion.employee_id == emp.id,
    ).first()

    if not completion:
        completion = LifecycleChecklistCompletion(
            template_id=template_id,
            employee_id=emp.id,
        )
        db.add(completion)

    completion.is_done = bool(payload.is_done)
    completion.note = (payload.note or "").strip() or None
    completion.completed_at = datetime.utcnow() if payload.is_done else None
    completion.completed_by = current_user["user_id"] if payload.is_done else None
    db.commit()
    return {"message": "Checklist maddesi güncellendi."}


@router.post("/{emp_id}/lifecycle/account/open")
def open_employee_account(
    emp_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)
    if not emp.email:
        raise HTTPException(status_code=400, detail="Hesap açmak için personelde e-posta tanımlı olmalı.")

    temp_pwd = generate_temp_password()
    emp.hashed_password = hash_password(temp_pwd)
    emp.status = "ACTIVE"
    emp.exit_date = None
    emp.mfa_enabled = True
    emp.require_password_change = True
    emp.otp_code = None
    emp.otp_expiry = None
    _apply_lifecycle_action_completion(db, emp, "onboarding", "ACCOUNT_OPENED", current_user["user_id"])
    db.commit()

    try:
        subject = f"HRPro AI | Hesabınız Açıldı - {emp.first_name} {emp.last_name}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
                <div style="max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #0f172a;">Hesabınız Kullanıma Açıldı</h2>
                    <p>Merhaba {emp.first_name},</p>
                    <p>İK sistemindeki kullanıcı hesabınız kullanıma açıldı. İlk girişinizde şifrenizi değiştirmeniz istenecektir.</p>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px;">
                        <p style="margin: 0 0 8px 0;"><strong>E-posta:</strong> {emp.email}</p>
                        <p style="margin: 0;"><strong>Geçici şifre:</strong> <span style="font-size: 18px; color: #be123c; font-weight: 700;">{temp_pwd}</span></p>
                    </div>
                </div>
            </body>
        </html>
        """
        EmailService.send_email(to_email=emp.email, subject=subject, body_html=html_content)
    except Exception as mail_error:
        print(f"Hesap açıldı ama bilgilendirme maili gönderilemedi: {mail_error}")
        print(f"\n[{datetime.now()}] 📧 KONSOL SIM: {emp.email} | Şifre: {temp_pwd}\n")

    return {
        "message": "Kullanıcı hesabı açıldı ve geçici şifre üretildi.",
    }


@router.post("/{emp_id}/lifecycle/account/close")
def close_employee_account(
    emp_id: int,
    payload: LifecycleAccountCloseRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)

    active_assets = db.query(Asset).filter(Asset.employee_id == emp_id, Asset.status == "ASSIGNED").count()
    if active_assets > 0:
        raise HTTPException(status_code=400, detail=_("emp_has_active_assets", request).format(count=active_assets))

    emp.status = "INACTIVE"
    emp.exit_date = payload.exit_date or date.today()
    emp.position_id = None
    emp.mfa_enabled = False
    emp.require_password_change = False
    emp.otp_code = None
    emp.otp_expiry = None

    db.query(MobileDevice).filter(MobileDevice.employee_id == emp.id).update({
        MobileDevice.is_active: False,
        MobileDevice.push_token: None,
    }, synchronize_session=False)

    _apply_lifecycle_action_completion(db, emp, "offboarding", "ACCOUNT_CLOSED", current_user["user_id"])
    db.commit()
    return {"message": f"{emp.first_name} {emp.last_name} hesabı kapatıldı ve personel arşive alındı."}


@router.get("/{emp_id}/lifecycle/document")
def download_lifecycle_document(
    emp_id: int,
    kind: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_kind = "termination" if str(kind).lower() == "termination" else "contract"
    emp = _get_company_employee(emp_id, db, current_user, request)
    company = db.query(Company).filter(Company.id == emp.company_id).first()
    pdf_bytes = _build_lifecycle_document_pdf(emp, company, normalized_kind, request)
    file_stub = "isten_cikis" if normalized_kind == "termination" else "is_sozlesmesi"
    filename = f"{file_stub}_{emp.first_name}_{emp.last_name}.pdf"
    quoted_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"},
    )


@router.post("/{emp_id}/lifecycle/document")
def create_lifecycle_document(
    emp_id: int,
    payload: LifecycleDocumentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    normalized_kind = "termination" if str(payload.kind).lower() == "termination" else "contract"
    emp = _get_company_employee(emp_id, db, current_user, request)
    company = db.query(Company).filter(Company.id == emp.company_id).first()
    pdf_bytes = _build_lifecycle_document_pdf(emp, company, normalized_kind, request)
    doc = _persist_generated_lifecycle_document(emp, normalized_kind, pdf_bytes, request, db)
    if normalized_kind == "contract":
        _apply_lifecycle_action_completion(db, emp, "onboarding", "CONTRACT_STORED", current_user["user_id"])
        db.commit()
    return {
        "message": "Belge üretildi ve e-özlüğe kaydedildi.",
        "document_id": doc.id,
        "file_path": build_document_download_url(doc.id),
        "download_url": build_document_download_url(doc.id),
    }


@router.get("/{emp_id}/lifecycle/termination-release/draft")
def get_termination_release_draft(
    emp_id: int,
    request: Request,
    template_key: str = "tr_release",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)
    company = db.query(Company).filter(Company.id == emp.company_id).first()
    return _build_termination_release_draft(emp, company, template_key)


@router.get("/lifecycle/offboarding-templates")
def get_offboarding_templates(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    return {
        "templates": [
            {
                "key": key,
                "title": meta["title"],
                "subtitle": meta["subtitle"],
                "requires_sgk": meta["requires_sgk"],
            }
            for key, meta in OFFBOARDING_TEMPLATES.items()
        ]
    }


@router.post("/{emp_id}/lifecycle/termination-release/pdf")
def download_termination_release_pdf(
    emp_id: int,
    payload: TerminationReleaseDraft,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)
    company = db.query(Company).filter(Company.id == emp.company_id).first()
    pdf_bytes = _build_termination_release_pdf(emp, company, payload, request)
    filename = f"ibraname_{emp.first_name}_{emp.last_name}.pdf"
    quoted_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"},
    )


@router.post("/{emp_id}/lifecycle/termination-release/store")
def store_termination_release_document(
    emp_id: int,
    payload: TerminationReleaseDraft,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_lifecycle_access(current_user, request)
    emp = _get_company_employee(emp_id, db, current_user, request)
    company = db.query(Company).filter(Company.id == emp.company_id).first()
    pdf_bytes = _build_termination_release_pdf(emp, company, payload, request)
    doc = _persist_generated_lifecycle_document(emp, "termination", pdf_bytes, request, db)
    doc.notes = json.dumps(payload.dict(), ensure_ascii=False)
    _apply_lifecycle_action_completion(db, emp, "offboarding", "TERMINATION_STORED", current_user["user_id"])
    db.commit()
    return {
        "message": "İbraname üretildi ve e-özlüğe kaydedildi.",
        "document_id": doc.id,
        "file_path": build_document_download_url(doc.id),
        "download_url": build_document_download_url(doc.id),
    }

@router.put("/terminate/{emp_id}")
def terminate_employee(emp_id: int, payload: TerminatePayload, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    
    active_assets = db.query(Asset).filter(Asset.employee_id == emp_id, Asset.status == "ASSIGNED").count()
    if active_assets > 0: raise HTTPException(status_code=400, detail=_("emp_has_active_assets", request).format(count=active_assets))

    emp.status = "INACTIVE"
    emp.exit_date = payload.exit_date
    emp.position_id = None
    emp.mfa_enabled = False
    emp.require_password_change = False
    emp.otp_code = None
    emp.otp_expiry = None
    db.query(MobileDevice).filter(MobileDevice.employee_id == emp.id).update({
        MobileDevice.is_active: False,
        MobileDevice.push_token: None,
    }, synchronize_session=False)
    db.commit()
    return {"message": _("emp_archived", request).format(name=f"{emp.first_name} {emp.last_name}")}

@router.delete("/{emp_id}")
def delete_employee_completely(emp_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    try:
        db.delete(emp)
        db.commit()
        return {"message": _("emp_deleted", request)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=_("emp_delete_foreign_key_error", request))

@router.post("/{emp_id}/reset-password")
def reset_employee_password(emp_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    temp_pwd = generate_temp_password()
    emp.hashed_password = hash_password(temp_pwd)
    emp.require_password_change = True
    emp.otp_code = None
    emp.otp_expiry = None
    db.commit()

    try:
        if emp.email:
            subject = f"CADRO | Şifreniz Sıfırlandı - {emp.first_name} {emp.last_name}"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
                    <div style="max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <h2 style="color: #0f172a;">Şifreniz Yenilendi</h2>
                        <p>Merhaba {emp.first_name},</p>
                        <p>Kullanıcı hesabınız için yeni bir geçici şifre oluşturuldu. Sisteme giriş yaptıktan sonra şifrenizi değiştirmeniz zorunludur.</p>
                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px;">
                            <p style="margin: 0 0 8px 0;"><strong>E-posta:</strong> {emp.email}</p>
                            <p style="margin: 0;"><strong>Geçici şifre:</strong> <span style="font-size: 18px; color: #be123c; font-weight: 700;">{temp_pwd}</span></p>
                        </div>
                    </div>
                </body>
            </html>
            """
            EmailService.send_email(to_email=emp.email, subject=subject, body_html=html_content)
    except Exception as mail_error:
        print(f"Şifre sıfırlandı ancak bilgilendirme maili gönderilemedi: {mail_error}")

    return {"message": "Şifre başarıyla sıfırlandı ve bilgilendirme e-postası gönderildi."}

@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != emp_id: raise HTTPException(status_code=403, detail=_("unauthorized", request))
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    return emp

@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, payload: EmployeeUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    if not emp: raise HTTPException(status_code=404, detail=_("employee_not_found", request))
    if emp.status == "INACTIVE":
        raise HTTPException(status_code=400, detail=_("inactive_employee_readonly", request))
    
    update_data = payload.dict(exclude_unset=True, exclude_none=True)
    
    if "identity_no" in update_data and update_data["identity_no"]:
        if db.query(Employee).filter(Employee.identity_no == update_data["identity_no"], Employee.id != emp_id).first():
            raise HTTPException(status_code=400, detail=_("identity_no_exists", request).format(val=update_data["identity_no"]))
            
    if "email" in update_data and update_data["email"]:
        if db.query(Employee).filter(Employee.email == update_data["email"], Employee.id != emp_id).first():
            raise HTTPException(status_code=400, detail=_("email_exists", request).format(val=update_data["email"]))
            
    if "phone" in update_data and update_data["phone"]:
        if db.query(Employee).filter(Employee.phone == update_data["phone"], Employee.id != emp_id).first():
            raise HTTPException(status_code=400, detail=_("phone_exists", request).format(val=update_data["phone"]))

    string_fields = [
        "first_name",
        "last_name",
        "phone",
        "identity_no",
        "emergency_contact_name",
        "emergency_contact_relation",
        "emergency_contact_phone",
        "bank_name",
        "account_holder_name",
        "tax_id_number",
        "work_authorization_type",
        "work_authorization_no",
        "visa_type",
        "background_check_status",
        "occupational_health_status",
    ]
    for field in string_fields:
        if field in update_data and isinstance(update_data[field], str):
            update_data[field] = update_data[field].strip()

    if "email" in update_data and isinstance(update_data["email"], str):
        update_data["email"] = update_data["email"].strip().lower()
    if "iban" in update_data and isinstance(update_data["iban"], str):
        update_data["iban"] = update_data["iban"].replace(" ", "").upper()

    for key, value in update_data.items(): setattr(emp, key, value)
    db.commit()
    db.refresh(emp)
    return emp

# ==========================================
# 📄 6. KAPSAMLI PERSONEL BİLGİ KARTI PDF (INFO CARD)
# ==========================================
@router.get("/{emp_id}/info-card")
def download_employee_info_card(
    emp_id: int, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"] and current_user["user_id"] != emp_id:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))
        
    emp = db.query(Employee).options(
        joinedload(Employee.department_rel),
        joinedload(Employee.position_rel)
    ).filter(Employee.id == emp_id, Employee.company_id == current_user["company_id"]).first()
    
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
        
    comp = db.query(Company).filter(Company.id == emp.company_id).first()
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    regular_font = "EmployeeAmiri" if is_arabic and "EmployeeAmiri" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_REGULAR
    bold_font = "EmployeeAmiri-Bold" if is_arabic and "EmployeeAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else PDF_FONT_BOLD

    def tr_text(key: str, **kwargs) -> str:
        raw = _(key, request).format(**kwargs) if kwargs else _(key, request)
        return format_text(raw, is_arabic, strip_html=True)

    children_list = []
    if emp.children_names:
        try:
            children_list = json.loads(emp.children_names)
            children_list = [name for name in children_list if isinstance(name, str) and name.strip()]
        except (json.JSONDecodeError, TypeError):
            children_list = []
    children_str = ", ".join(children_list) if children_list else "-"

    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4

    company_name = comp.name.upper() if comp else tr_text("employee_info_card_company_missing")
    job_title = emp.position_rel.title if emp.position_rel else tr_text("employee_info_card_position_missing")
    dept_title = emp.department_rel.name if emp.department_rel else tr_text("employee_info_card_department_missing")

    def draw_page_intro():
        c.setFillColorRGB(0.06, 0.09, 0.16)
        c.rect(0, height - 100, width, 100, fill=1)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(bold_font, 22)
        c.drawCentredString(width / 2, height - 50, company_name)
        c.setFont(regular_font, 12)
        c.drawCentredString(width / 2, height - 75, tr_text("employee_info_card_title"))

        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont(bold_font, 18)
        c.drawString(40, height - 140, format_text(f"{emp.first_name} {emp.last_name}".upper(), is_arabic))
        c.setFont(regular_font, 11)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(40, height - 160, format_text(f"{dept_title} | {job_title}".upper(), is_arabic))

    def draw_footer():
        c.setFont(regular_font, 8)
        c.setFillColorRGB(0.6, 0.6, 0.6)
        c.drawCentredString(
            width / 2,
            30,
            tr_text("employee_info_card_footer", datetime=datetime.now().strftime('%d.%m.%Y %H:%M'))
        )

    footer_safe_y = 110
    line_height = 18

    def ensure_space(lines_needed=1):
        nonlocal y_pos
        required = lines_needed * line_height
        if y_pos - required < footer_safe_y:
            draw_footer()
            c.showPage()
            draw_page_intro()
            y_pos = height - 200
            return True
        return False

    draw_page_intro()

    sections = [
        (tr_text("employee_info_card_section_personal"), [
            (tr_text("employee_info_card_label_identity_no"), emp.identity_no or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_nationality"), emp.nationality or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_gender"), emp.gender or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_birth_date"), emp.birth_date.strftime("%d.%m.%Y") if emp.birth_date else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_birth_place"), emp.birth_place or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_parents"), f"{emp.mother_name or tr_text('common_not_available')} / {emp.father_name or tr_text('common_not_available')}"),
            (tr_text("employee_info_card_label_marital_status"), tr_text("employee_info_card_married") if emp.is_married else tr_text("employee_info_card_single")),
            (tr_text("employee_info_card_label_spouse"), f"{emp.spouse_name or tr_text('common_not_available')} ({tr_text('employee_info_card_yes') if emp.spouse_works else tr_text('employee_info_card_no')})" if emp.is_married else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_children"), tr_text("employee_info_card_children_value", count=emp.children_count or 0, names=children_str)),
            (tr_text("employee_info_card_label_blood_type"), emp.blood_type or tr_text("employee_info_card_unknown")),
            (tr_text("employee_info_card_label_education"), emp.education_level or tr_text("common_not_available"))
        ]),
        (tr_text("employee_info_card_section_contact"), [
            (tr_text("employee_info_card_label_phone"), emp.phone or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_email"), emp.email or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_address"), (emp.address[:80] + "...") if emp.address and len(emp.address) > 80 else (emp.address or tr_text("common_not_available"))),
            (tr_text("employee_info_card_label_emergency_contact"), emp.emergency_contact_name or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_emergency_relation"), emp.emergency_contact_relation or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_emergency_phone"), emp.emergency_contact_phone or tr_text("common_not_available"))
        ]),
        (tr_text("employee_info_card_section_corporate"), [
            (tr_text("employee_info_card_label_hire_date"), emp.hire_date.strftime("%d.%m.%Y") if emp.hire_date else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_company_branch"), company_name),
            (tr_text("employee_info_card_label_org_position"), f"{dept_title} | {job_title}"),
            (tr_text("employee_info_card_label_social_security"), emp.social_security_no or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_provident_fund"), emp.provident_fund_no or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_bank_name"), emp.bank_name or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_account_holder"), emp.account_holder_name or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_iban"), emp.iban or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_tax_id"), emp.tax_id_number or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_work_auth_type"), emp.work_authorization_type or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_work_auth_no"), emp.work_authorization_no or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_work_auth_period"), (
                f"{emp.work_authorization_start_date.strftime('%d.%m.%Y') if emp.work_authorization_start_date else tr_text('common_not_available')} - "
                f"{emp.work_authorization_expiry_date.strftime('%d.%m.%Y') if emp.work_authorization_expiry_date else tr_text('common_not_available')}"
            )),
            (tr_text("employee_info_card_label_visa_type"), emp.visa_type or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_visa_expiry"), emp.visa_expiry_date.strftime("%d.%m.%Y") if emp.visa_expiry_date else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_nda_signed"), emp.nda_signed_at.strftime("%d.%m.%Y") if emp.nda_signed_at else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_handbook_ack"), emp.handbook_ack_signed_at.strftime("%d.%m.%Y") if emp.handbook_ack_signed_at else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_background_check"), emp.background_check_status or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_background_check_date"), emp.background_check_completed_at.strftime("%d.%m.%Y") if emp.background_check_completed_at else tr_text("common_not_available")),
            (tr_text("employee_info_card_label_occupational_health"), emp.occupational_health_status or tr_text("common_not_available")),
            (tr_text("employee_info_card_label_occupational_health_valid_until"), emp.occupational_health_valid_until.strftime("%d.%m.%Y") if emp.occupational_health_valid_until else tr_text("common_not_available"))
        ])
    ]

    y_pos = height - 200

    def draw_section_header(title):
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont(bold_font, 12)
        c.drawString(40, y_pos, title)
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.line(40, y_pos - 5, width - 40, y_pos - 5)

    for section_title, data_list in sections:
        ensure_space(3)
        draw_section_header(section_title)
        y_pos -= 25

        c.setFillColorRGB(0.2, 0.2, 0.2)
        for label, value in data_list:
            if ensure_space(1):
                draw_section_header(section_title)
                y_pos -= 25
                c.setFillColorRGB(0.2, 0.2, 0.2)

            c.setFont(bold_font, 10)
            c.drawString(40, y_pos, format_text(str(label), is_arabic))

            c.setFont(regular_font, 10)
            c.drawString(200, y_pos, format_text(str(value), is_arabic))
            y_pos -= line_height

        y_pos -= 12

    draw_footer()

    c.save()
    pdf_buffer.seek(0)

    safe_pdf_name = urllib.parse.quote(f"{_('employee_info_card_filename_prefix', request)}_{emp.first_name}_{emp.last_name}.pdf")

    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename*=utf-8''{safe_pdf_name}"}
    )
