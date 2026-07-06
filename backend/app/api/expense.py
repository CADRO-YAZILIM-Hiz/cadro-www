import io
import os
import re
import shutil
import uuid
from email.message import EmailMessage
from urllib.parse import quote

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, BackgroundTasks # 🎯 YENİ: Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from app.core.database import get_db
from app.core.dependencies import get_current_user 
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz
from app.core.email import EmailService # ✅ YENİ: Sınıf olarak import edildi
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission, has_permission
from app.core.config import settings
from app.core.approval_routing import (
    can_user_approve_expense,
    resolve_expense_approvers,
    should_auto_approve,
)
from app.core.push_dispatcher import dispatch_push_event
from app.core.push_events import PushEventType
from app.core.scope import get_team_scoped_employee_ids
from app.models.asset_expense import Expense
from app.models.employee import Employee

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.expenses"))])
UPLOAD_DIR = "uploads/expenses"
EXPORT_FORMATS = {"excel", "csv", "pdf"}

FONT_DIR = "fonts"
os.makedirs(FONT_DIR, exist_ok=True)
regular_font_path = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
bold_font_path = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
font_regular = 'Helvetica'
font_bold = 'Helvetica-Bold'

try:
    if os.path.exists(regular_font_path) and os.path.exists(bold_font_path):
        pdfmetrics.registerFont(TTFont('ExpenseFont', regular_font_path))
        pdfmetrics.registerFont(TTFont('ExpenseFont-Bold', bold_font_path))
        font_regular = 'ExpenseFont'
        font_bold = 'ExpenseFont-Bold'
except Exception as exc:
    print(f"Expense report font registration error: {exc}")

# --- GÜVENLİK AYARLARI ---
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB Sınırı

class ExpenseStatusUpdate(BaseModel):
    status: str 
    rejection_reason: Optional[str] = None


class ExpenseEmailReportRequest(BaseModel):
    email_to: EmailStr
    format: str = "pdf"
    status: Optional[str] = None
    query: Optional[str] = None
    employee_id: Optional[int] = None
    category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


def _build_expense_query(
    db: Session,
    current_user: dict,
    query_text: Optional[str] = None,
    employee_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    query = db.query(Expense).options(joinedload(Expense.employee)).filter(
        Expense.company_id == current_user["company_id"]
    )

    if current_user["role"] == "EMPLOYEE":
        query = query.filter(Expense.employee_id == current_user["user_id"])
    elif current_user["role"] == "MANAGER":
        employee_ids = get_team_scoped_employee_ids(db, current_user)
        query = query.filter(Expense.employee_id.in_(employee_ids))

    if query_text:
        normalized = f"%{query_text.strip()}%"
        query = query.filter(
            or_(
                Expense.employee.has(
                    or_(
                        Employee.first_name.ilike(normalized),
                        Employee.last_name.ilike(normalized),
                        Employee.email.ilike(normalized),
                    )
                ),
                Expense.category.ilike(normalized),
                Expense.description.ilike(normalized),
            )
        )

    if employee_id:
        query = query.filter(Expense.employee_id == employee_id)

    if category:
        query = query.filter(Expense.category == category)

    if start_date:
        query = query.filter(Expense.expense_date >= start_date)

    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    return query


def _get_visible_expenses(
    db: Session,
    current_user: dict,
    status: Optional[str] = None,
    query_text: Optional[str] = None,
    employee_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    query = _build_expense_query(db, current_user, query_text, employee_id, category, start_date, end_date)

    if status:
        query = query.filter(Expense.status == status)

    expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()

    if current_user["role"] in ["MANAGER", "HR", "ADMIN", "SUPERADMIN"] and status == "PENDING":
        expenses = [
            exp for exp in expenses
            if can_user_approve_expense(db, exp, current_user, exp.employee)
        ]

    return expenses


def _get_expense_summary(
    db: Session,
    current_user: dict,
    query_text: Optional[str] = None,
    employee_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    pending_items = _get_visible_expenses(db, current_user, "PENDING", query_text, employee_id, category, start_date, end_date)
    approved_items = _get_visible_expenses(db, current_user, "APPROVED", query_text, employee_id, category, start_date, end_date)
    rejected_items = _get_visible_expenses(db, current_user, "REJECTED", query_text, employee_id, category, start_date, end_date)

    def summarize(items):
        totals_by_currency = {}
        for item in items:
            currency = item.currency or "TRY"
            totals_by_currency[currency] = float(totals_by_currency.get(currency, 0)) + float(item.amount or 0)
        return {
            "count": len(items),
            "total_amount": float(sum(float(item.amount or 0) for item in items)),
            "totals_by_currency": totals_by_currency,
        }

    return {
        "pending": summarize(pending_items),
        "approved": summarize(approved_items),
        "rejected": summarize(rejected_items),
    }


def _expense_status_label(expense: Expense, request: Request) -> str:
    if expense.is_paid:
        return _("expense_paid_label", request)
    status_map = {
        "PENDING": _("expense_status_pending", request),
        "APPROVED": _("expense_status_approved", request),
        "REJECTED": _("expense_status_rejected", request),
    }
    return status_map.get(str(expense.status or "").upper(), expense.status or "-")


def _expense_paid_label(expense: Expense, request: Request) -> str:
    return _("lbl_yes", request) if expense.is_paid else _("lbl_no", request)


def _generate_expense_report_file(format_type: str, expenses: list, request: Request):
    output = io.BytesIO()
    file_prefix = _("file_expense", request)
    sheet_name = re.sub(r'[\\/*?:\\[\\]]', '', _("sheet_expense", request))[:31]
    totals_by_currency = {}

    data = []
    for exp in expenses:
        employee_name = "-"
        if exp.employee:
            employee_name = f"{exp.employee.first_name} {exp.employee.last_name}".strip()
        currency = exp.currency or "TRY"
        totals_by_currency[currency] = float(totals_by_currency.get(currency, 0)) + float(exp.amount or 0)
        data.append({
            _("col_date", request): exp.expense_date.strftime("%Y-%m-%d") if exp.expense_date else "-",
            _("col_name", request): employee_name,
            _("col_category", request): exp.category or "-",
            _("col_description", request): exp.description or "-",
            _("col_amount", request): float(exp.amount or 0),
            _("col_currency", request): currency,
            _("col_status", request): _expense_status_label(exp, request),
            _("col_paid", request): _expense_paid_label(exp, request),
        })

    if format_type == "excel":
        footer_rows = []
        for currency, total_amount in totals_by_currency.items():
            footer_rows.append({
                _("col_date", request): "",
                _("col_name", request): "",
                _("col_category", request): "",
                _("col_description", request): _("report_total_for_currency", request).format(currency=currency),
                _("col_amount", request): float(total_amount),
                _("col_currency", request): currency,
                _("col_status", request): "",
                _("col_paid", request): "",
            })
        df = pd.DataFrame([*data, *footer_rows])
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=sheet_name)
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{file_prefix}_{date.today()}.xlsx"
    elif format_type == "csv":
        footer_rows = []
        for currency, total_amount in totals_by_currency.items():
            footer_rows.append({
                _("col_date", request): "",
                _("col_name", request): "",
                _("col_category", request): "",
                _("col_description", request): _("report_total_for_currency", request).format(currency=currency),
                _("col_amount", request): float(total_amount),
                _("col_currency", request): currency,
                _("col_status", request): "",
                _("col_paid", request): "",
            })
        df = pd.DataFrame([*data, *footer_rows])
        df.to_csv(output, index=False, encoding='utf-8-sig')
        content_type = "text/csv"
        filename = f"{file_prefix}_{date.today()}.csv"
    else:
        table_rows = [list(data[0].keys())] if data else [[
            _("col_date", request),
            _("col_name", request),
            _("col_category", request),
            _("col_description", request),
            _("col_amount", request),
            _("col_currency", request),
            _("col_status", request),
            _("col_paid", request),
        ]]
        for row in data:
            table_rows.append([str(value) for value in row.values()])
        if totals_by_currency:
            table_rows.append([""] * 8)
            for currency, total_amount in totals_by_currency.items():
                table_rows.append([
                    "",
                    "",
                    "",
                    _("report_total_for_currency", request).format(currency=currency),
                    f"{total_amount:.2f}",
                    currency,
                    "",
                    "",
                ])

        doc = SimpleDocTemplate(
            output,
            pagesize=landscape(A4),
            rightMargin=24,
            leftMargin=24,
            topMargin=24,
            bottomMargin=18,
        )
        table = Table(table_rows, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), font_bold),
            ('FONTNAME', (0, 1), (-1, -1), font_regular),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#e2e8f0")),
        ]))
        doc.build([table])
        content_type = "application/pdf"
        filename = f"{file_prefix}_{date.today()}.pdf"

    output.seek(0)
    return output, content_type, filename


def _send_expense_report_email(email_to: str, output: io.BytesIO, filename: str, request: Request):
    if EmailService._should_log_to_terminal(email_to):
        EmailService._log_email_to_terminal(
            email_to,
            _("expense_report_subject", request),
            _("expense_report_body", request).replace("\n", "<br/>"),
        )
        return

    message = EmailMessage()
    message["Subject"] = _("expense_report_subject", request)
    message["From"] = settings.SMTP_USER
    message["To"] = email_to
    message.set_content(_("expense_report_body", request))
    message.add_attachment(
        output.read(),
        maintype="application",
        subtype="octet-stream",
        filename=filename,
    )

    with EmailService._open_smtp_connection() as server:
        server.send_message(message)

# ==========================================
# 1. 🎯 FİŞ YÜKLEME VE AKILLI ONAY BİLDİRİMİ
# ==========================================
@router.post("/")
def create_expense(
    request: Request, # 🌍 YENİ: Dil tespiti
    employee_id: int = Form(...),
    amount: float = Form(...),
    currency: str = Form("TRY"),
    category: str = Form(...),
    description: str = Form(None),
    expense_date: date = Form(...),
    file: UploadFile = File(None), 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_id"] != employee_id and not has_permission(current_user, "expense.manage_company"):
        raise HTTPException(status_code=403, detail=_("expense_own_only", request))

    emp = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))
        
    receipt_url = None
    if file:
        ext = file.filename.split('.')[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=_("expense_invalid_file", request))
        
        file.file.seek(0, os.SEEK_END)
        if file.file.tell() > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=_("expense_file_size_limit", request))
        file.file.seek(0)

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        safe_filename = f"receipt_{emp.company_id}_{emp.id}_{uuid.uuid4().hex[:8]}.{ext}"
        receipt_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(receipt_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        receipt_url = f"/{receipt_path}"

    approvers = resolve_expense_approvers(db, emp.company_id, emp)
    initial_status = "APPROVED" if should_auto_approve(current_user, approvers) else "PENDING"
            
    new_exp = Expense(
        company_id=emp.company_id,
        employee_id=emp.id,
        amount=amount,
        currency=currency,
        category=category,
        description=description,
        expense_date=expense_date,
        status=initial_status,
        is_paid=False
    )
    
    if hasattr(new_exp, 'receipt_url'):
        new_exp.receipt_url = receipt_url
        
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)

    if initial_status == "PENDING":
        dispatch_push_event(
            db,
            PushEventType.EXPENSE_CREATED,
            {
                "company_id": emp.company_id,
                "entity_id": new_exp.id,
                "subject_employee_id": emp.id,
                "subject_employee_name": f"{emp.first_name} {emp.last_name}".strip(),
                "actor_employee_id": current_user["user_id"],
                "approver_employee_ids": [approver.id for approver in approvers],
                "amount_label": f"{amount} {currency}",
            },
        )

    # 📧 E-POSTA BİLDİRİMLERİ
    if initial_status == "PENDING":
        for approver in approvers:
            if not approver.email:
                continue
            html = f"""<h3 style="color:#0ea5e9;">Yeni Masraf Onayınızı Bekliyor 💳</h3>
            <p><strong>{emp.first_name} {emp.last_name}</strong>, {amount} {currency} tutarında bir {category} masrafı beyan etti.</p>
            <p>Lütfen sisteme giriş yaparak fişi/faturayı inceleyin.</p>"""
            EmailService.send_operational_email(approver.email, "Masraf Onayı Bekleniyor", html)

    msg = _("expense_created_pending", request) if initial_status == "PENDING" else _("expense_auto_approved", request)
    return {"message": msg}

# ==========================================
# 2. TÜM MASRAFLARI LİSTELE
# ==========================================
@router.get("/")
@router.get("/list")
def get_expenses(request: Request, status: str = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "expenses.view_workspace", request)
    return _get_visible_expenses(
        db,
        current_user,
        status=status,
        query_text=request.query_params.get("query"),
        employee_id=int(request.query_params["employee_id"]) if request.query_params.get("employee_id") else None,
        category=request.query_params.get("category"),
        start_date=date.fromisoformat(request.query_params["start_date"]) if request.query_params.get("start_date") else None,
        end_date=date.fromisoformat(request.query_params["end_date"]) if request.query_params.get("end_date") else None,
    )


@router.get("/export")
def export_expenses(
    request: Request,
    format: str = "excel",
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "expense.export_company", request)
    if format not in EXPORT_FORMATS:
        raise HTTPException(status_code=400, detail=_("invalid_format", request))

    start_date = date.fromisoformat(request.query_params["start_date"]) if request.query_params.get("start_date") else None
    end_date = date.fromisoformat(request.query_params["end_date"]) if request.query_params.get("end_date") else None
    expenses = _get_visible_expenses(
        db,
        current_user,
        status=status,
        query_text=request.query_params.get("query"),
        employee_id=int(request.query_params["employee_id"]) if request.query_params.get("employee_id") else None,
        category=request.query_params.get("category"),
        start_date=start_date,
        end_date=end_date,
    )
    if not expenses:
        raise HTTPException(status_code=404, detail=_("no_records_to_export", request))

    output, content_type, filename = _generate_expense_report_file(format, expenses, request)
    encoded_filename = quote(filename)
    return StreamingResponse(
        output,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"},
    )


@router.get("/summary")
def expense_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "expenses.view_workspace", request)
    start_date = date.fromisoformat(request.query_params["start_date"]) if request.query_params.get("start_date") else None
    end_date = date.fromisoformat(request.query_params["end_date"]) if request.query_params.get("end_date") else None
    return _get_expense_summary(
        db,
        current_user,
        query_text=request.query_params.get("query"),
        employee_id=int(request.query_params["employee_id"]) if request.query_params.get("employee_id") else None,
        category=request.query_params.get("category"),
        start_date=start_date,
        end_date=end_date,
    )


@router.post("/email-report")
def email_expense_report(
    data: ExpenseEmailReportRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "expense.export_company", request)
    if data.format not in EXPORT_FORMATS:
        raise HTTPException(status_code=400, detail=_("invalid_format", request))

    expenses = _get_visible_expenses(
        db,
        current_user,
        status=data.status,
        query_text=data.query,
        employee_id=data.employee_id,
        category=data.category,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    if not expenses:
        raise HTTPException(status_code=404, detail=_("no_records_to_export", request))

    output, _, filename = _generate_expense_report_file(data.format, expenses, request)
    background_tasks.add_task(_send_expense_report_email, data.email_to, output, filename, request)
    return {"message": _("email_sent_success", request).format(email=data.email_to)}

# ==========================================
# 4. MASRAF ONAYLA / REDDET
# ==========================================
@router.put("/{expense_id}/status")
def update_expense_status(expense_id: int, req: ExpenseStatusUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "expense.manage_company", request)
        
    query = db.query(Expense).options(joinedload(Expense.employee)).filter(
        Expense.id == expense_id,
        Expense.company_id == current_user["company_id"]
    )
        
    exp = query.first()
    if not exp:
        raise HTTPException(status_code=404, detail=_("expense_not_found", request))
    
    if exp.is_paid:
        raise HTTPException(status_code=400, detail=_("expense_already_paid", request))
        
    if exp.employee_id == current_user["user_id"] and req.status == "APPROVED":
        if current_user["role"] != "SUPERADMIN":
            raise HTTPException(status_code=400, detail=_("expense_cannot_approve_own", request))

    if not can_user_approve_expense(db, exp, current_user, exp.employee):
        raise HTTPException(status_code=403, detail=_("expense_unauthorized_approve", request))

    exp.status = req.status
    
    if req.status == "REJECTED":
        if req.rejection_reason and hasattr(exp, 'rejection_reason'):
            exp.rejection_reason = req.rejection_reason
        db.commit()
        dispatch_push_event(
            db,
            PushEventType.EXPENSE_REJECTED,
            {
                "company_id": exp.company_id,
                "entity_id": exp.id,
                "subject_employee_id": exp.employee_id,
                "subject_employee_name": f"{exp.employee.first_name} {exp.employee.last_name}".strip() if exp.employee else None,
                "actor_employee_id": current_user["user_id"],
            },
        )
        if exp.employee and exp.employee.email:
            html = f"""<h3 style="color:#e11d48;">Masrafınız Reddedildi ❌</h3>
            <p>{exp.amount} {exp.currency} tutarındaki {exp.category} masrafınız reddedilmiştir.</p>"""
            EmailService.send_operational_email(exp.employee.email, "Masraf Talebi Reddedildi", html) # ✅ DÜZELTİLDİ
            
    elif req.status == "APPROVED":
        db.commit()
        dispatch_push_event(
            db,
            PushEventType.EXPENSE_APPROVED,
            {
                "company_id": exp.company_id,
                "entity_id": exp.id,
                "subject_employee_id": exp.employee_id,
                "subject_employee_name": f"{exp.employee.first_name} {exp.employee.last_name}".strip() if exp.employee else None,
                "actor_employee_id": current_user["user_id"],
            },
        )
        if exp.employee and exp.employee.email:
            html = f"""<h3 style="color:#10b981;">Masrafınız Onaylandı! 💳</h3>
            <p>Tebrikler! {exp.amount} {exp.currency} tutarındaki {exp.category} masrafınız onaylanmıştır.</p>"""
            EmailService.send_operational_email(exp.employee.email, "Masrafınız Onaylandı! 🎉", html) # ✅ DÜZELTİLDİ

    return {"message": _("expense_status_updated", request).format(status=req.status)}

# ==========================================
# 5. MASRAF İPTAL ETME / SİLME
# ==========================================
@router.delete("/{expense_id}")
def delete_expense(expense_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "expenses.view_workspace", request)
    exp = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.company_id == current_user["company_id"]
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail=_("expense_not_found", request))
        
    if current_user["role"] == "EMPLOYEE" and exp.employee_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail=_("expense_delete_own_only", request))

    if exp.status == "APPROVED" or exp.is_paid:
        raise HTTPException(status_code=400, detail=_("expense_cannot_delete_approved", request))

    if hasattr(exp, 'receipt_url') and exp.receipt_url:
        file_path = exp.receipt_url.lstrip("/")
        if os.path.exists(file_path):
            try: os.remove(file_path)
            except: pass 

    db.delete(exp)
    db.commit()
    return {"message": _("expense_deleted", request)}
