import os
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

# --- 🎯 PDF için Gelişmiş ReportLab Kütüphaneleri ---
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# --- Veritabanı ve Modeller ---
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.api.report import format_text
from app.models.asset_expense import Asset
from app.models.company import Company
from app.models.employee import Employee

router = APIRouter()
FONT_DIR = "fonts"
REGULAR_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
AMIRI_REGULAR_PATH = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
AMIRI_BOLD_PATH = os.path.join(FONT_DIR, "Amiri-Bold.ttf")

try:
    if os.path.exists(REGULAR_FONT_PATH) and os.path.exists(BOLD_FONT_PATH):
        pdfmetrics.registerFont(TTFont("AssetRoboto", REGULAR_FONT_PATH))
        pdfmetrics.registerFont(TTFont("AssetRoboto-Bold", BOLD_FONT_PATH))
    if os.path.exists(AMIRI_REGULAR_PATH) and os.path.exists(AMIRI_BOLD_PATH):
        pdfmetrics.registerFont(TTFont("AssetAmiri", AMIRI_REGULAR_PATH))
        pdfmetrics.registerFont(TTFont("AssetAmiri-Bold", AMIRI_BOLD_PATH))
except Exception as font_error:
    print(f"Asset PDF font registration warning: {font_error}")


# ==========================================
# 📦 PYDANTIC ŞEMALARI
# ==========================================
class AssetBulkCreatePayload(BaseModel):
    asset_name: str
    category: str
    condition_on_assign: Optional[str] = None
    description: Optional[str] = None
    employee_id: Optional[int] = None
    given_date: Optional[date] = None
    quantity: int = 1
    serial_numbers: Optional[List[str]] = []


class AssetAssign(BaseModel):
    asset_id: int
    employee_id: int
    condition_on_assign: Optional[str] = "Sağlam / Çalışır Durumda"


# YENİ: Zimmet İade Şeması
class AssetReturn(BaseModel):
    asset_id: int
    return_condition: str = "Sağlam İade Edildi"
    new_status: str = "AVAILABLE"  # AVAILABLE, IN_REPAIR, RETIRED (Hurda)


class AssetStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


# ==========================================
# 🛡️ YARDIMCI FONKSİYONLAR
# ==========================================
def get_employee_role_title(employee: Employee) -> str:
    """
    Personelin görev/rol bilgisini yeni ilişki yapısına göre çözer.
    Eski düz alan isimlerine bağımlılığı azaltır.
    """
    if getattr(employee, "position_rel", None) and employee.position_rel.title:
        return employee.position_rel.title
    return employee.role or "-"


def _normalize_legacy_value(value: Optional[str]) -> str:
    return (
        (value or "")
        .strip()
        .lower()
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ı", "i")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def localize_asset_value(raw_value: Optional[str], request: Request, fallback_key: Optional[str] = None) -> str:
    normalized = _normalize_legacy_value(raw_value)
    if not normalized:
        return _(fallback_key, request) if fallback_key else "-"

    value_map = {
        "elektronik cihazlar": _("cat_electronics", request),
        "arac / ulasim": _("cat_vehicles", request),
        "arac/ulasim": _("cat_vehicles", request),
        "arac": _("cat_vehicles", request),
        "ulasim": _("cat_vehicles", request),
        "mobilya / ofis": _("cat_furniture", request),
        "ofis malzemesi": _("cat_furniture", request),
        "lisans / dijital": _("cat_digital", request),
        "saha ekipmani": _("cat_other", request),
        "diger": _("cat_other", request),
        "sifir": _("condition_new", request),
        "saglam / calisir durumda": _("condition_working", request),
        "saglam iade alindi": _("default_return_note", request),
        "demo varlik kaydi": _("asset_demo_record_note", request),
    }
    return value_map.get(normalized, raw_value or "-")


# ==========================================
# 📄 KURUMSAL PDF OLUŞTURUCU
# ==========================================
def generate_asset_pdf(asset, employee, company, request: Request):
    doc_dir = "uploads/documents"
    os.makedirs(doc_dir, exist_ok=True)

    filename = f"Zimmet_{asset.id}_{employee.id}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
    filepath = os.path.join(doc_dir, filename)

    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    if is_arabic and "AssetAmiri" in pdfmetrics.getRegisteredFontNames():
        font_regular = "AssetAmiri"
        font_bold = "AssetAmiri-Bold" if "AssetAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else "AssetAmiri"
    else:
        font_regular = "AssetRoboto" if "AssetRoboto" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
        font_bold = "AssetRoboto-Bold" if "AssetRoboto-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm
    )
    elements = []

    title_style = ParagraphStyle(name="TitleStyle", fontName=font_bold, fontSize=16, alignment=1, spaceAfter=20)
    text_style = ParagraphStyle(name="TextStyle", fontName=font_regular, fontSize=10, leading=15, spaceAfter=8)
    section_style = ParagraphStyle(name="SectionStyle", fontName=font_bold, fontSize=10, leading=15, spaceAfter=8)
    cell_label_style = ParagraphStyle(name="CellLabelStyle", fontName=font_bold, fontSize=9, leading=12)
    cell_value_style = ParagraphStyle(name="CellValueStyle", fontName=font_regular, fontSize=9, leading=12, wordWrap="CJK")
    signature_title_style = ParagraphStyle(name="SignatureTitleStyle", fontName=font_bold, fontSize=10, leading=13, alignment=1)
    signature_line_style = ParagraphStyle(name="SignatureLineStyle", fontName=font_regular, fontSize=9, leading=12, alignment=1, wordWrap="CJK")

    def tr_text(key: str, **kwargs) -> str:
        raw = _(key, request).format(**kwargs) if kwargs else _(key, request)
        return format_text(raw, is_arabic, strip_html=True)

    unknown_value = tr_text("common_not_available")

    # --- BAŞLIK ---
    elements.append(Paragraph(tr_text("asset_pdf_title"), title_style))
    elements.append(Spacer(1, 0.5 * cm))

    # --- A. PERSONEL BİLGİLERİ TABLOSU ---
    elements.append(Paragraph(tr_text("asset_pdf_section_employee"), section_style))
    emp_data = [
        [
            Paragraph(tr_text("asset_assignment_employee_full_name"), cell_label_style),
            Paragraph(format_text(f"{employee.first_name} {employee.last_name}", is_arabic), cell_value_style),
            Paragraph(tr_text("asset_pdf_label_date"), cell_label_style),
            Paragraph(datetime.now().strftime("%d/%m/%Y"), cell_value_style),
        ],
        [
            Paragraph(tr_text("asset_pdf_label_role"), cell_label_style),
            Paragraph(format_text(get_employee_role_title(employee), is_arabic), cell_value_style),
            Paragraph(tr_text("asset_pdf_label_email"), cell_label_style),
            Paragraph(format_text(employee.email or unknown_value, is_arabic), cell_value_style),
        ]
    ]
    emp_table = Table(emp_data, colWidths=[3.3 * cm, 5.7 * cm, 2.2 * cm, 5.8 * cm])
    emp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("BACKGROUND", (2, 0), (2, -1), colors.whitesmoke),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey)
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 1 * cm))

    # --- B. EKİPMAN BİLGİLERİ TABLOSU ---
    elements.append(Paragraph(tr_text("asset_pdf_section_asset"), section_style))
    asset_data = [
        [Paragraph(tr_text("asset_pdf_label_asset_name"), cell_label_style), Paragraph(format_text(asset.asset_name or unknown_value, is_arabic), cell_value_style)],
        [Paragraph(tr_text("asset_pdf_label_category"), cell_label_style), Paragraph(format_text(localize_asset_value(asset.category, request, "common_not_available"), is_arabic), cell_value_style)],
        [Paragraph(tr_text("asset_pdf_label_serial"), cell_label_style), Paragraph(format_text(asset.serial_no or unknown_value, is_arabic), cell_value_style)],
        [Paragraph(tr_text("asset_pdf_label_condition"), cell_label_style), Paragraph(format_text(localize_asset_value(asset.condition_on_assign, request, "asset_assignment_asset_default_condition"), is_arabic), cell_value_style)],
        [Paragraph(tr_text("asset_pdf_label_notes"), cell_label_style), Paragraph(format_text(localize_asset_value(asset.description, request, "common_not_available"), is_arabic), cell_value_style)]
    ]
    asset_table = Table(asset_data, colWidths=[4.5 * cm, 12.5 * cm])
    asset_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey)
    ]))
    elements.append(asset_table)
    elements.append(Spacer(1, 1 * cm))

    # --- C. KURALLAR VE ŞARTLAR ---
    elements.append(Paragraph(tr_text("asset_pdf_section_terms"), section_style))
    terms = "<br/><br/>".join([
        tr_text("asset_pdf_terms_1"),
        tr_text("asset_pdf_terms_2"),
        tr_text("asset_pdf_terms_3"),
        tr_text("asset_pdf_terms_4"),
    ])
    elements.append(Paragraph(terms, text_style))
    elements.append(Spacer(1, 1.5 * cm))

    # --- İMZALAR ---
    sig_data = [
        [
            Paragraph(tr_text("asset_pdf_signature_delivered"), signature_title_style),
            Paragraph(tr_text("asset_pdf_signature_received"), signature_title_style),
        ],
        [
            Paragraph("___________________________", signature_line_style),
            Paragraph(
                f"___________________________<br/>{format_text(f'{employee.first_name} {employee.last_name}', is_arabic)}",
                signature_line_style
            ),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[8.5 * cm, 8.5 * cm])
    sig_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 1), (-1, 1), 22),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return filepath


# ==========================================
# 📊 İSTATİSTİK ROTALARI
# ==========================================
@router.get("/stats")
def get_asset_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    company_id = current_user["company_id"]
    total = db.query(Asset).filter(Asset.company_id == company_id).count()
    available = db.query(Asset).filter(Asset.company_id == company_id, Asset.status == "AVAILABLE").count()
    assigned = db.query(Asset).filter(Asset.company_id == company_id, Asset.status == "ASSIGNED").count()
    in_repair = db.query(Asset).filter(Asset.company_id == company_id, Asset.status == "IN_REPAIR").count()
    return {"total": total, "available": available, "assigned": assigned, "in_repair": in_repair}


# ==========================================
# 💻 ZİMMET (ASSET) ROTALARI
# ==========================================

# 1. PERSONELİN KENDİ ZİMMETLERİNİ GÖRMESİ
@router.get("/employee/{employee_id}")
def get_employee_assets(employee_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Personel sadece kendi zimmetlerini görebilir (Admin herkesi görebilir)
    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != employee_id:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    return db.query(Asset).filter(
        Asset.employee_id == employee_id,
        Asset.company_id == current_user["company_id"]
    ).all()


# 2. PERSONELİN TESLİM ONAYI VERMESİ
@router.put("/{asset_id}/acknowledge")
def acknowledge_asset(asset_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == current_user["company_id"]
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Zimmet bulunamadı.")

    # Güvenlik: Sadece cihazın atandığı kişi onaylayabilir
    if current_user["role"] == "EMPLOYEE" and asset.employee_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Sadece size atanan cihazları onaylayabilirsiniz.")

    asset.is_acknowledged = True
    db.commit()
    return {"message": "Zimmet başarıyla teslim alındı olarak işaretlendi."}


# 3. TÜM CİHAZLARI VE ZİMMETLERİ LİSTELEME
@router.get("/")
@router.get("/list")
def get_all_assets(status: Optional[str] = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    query = db.query(Asset).options(joinedload(Asset.employee)).filter(
        Asset.company_id == current_user["company_id"]
    )
    if status:
        query = query.filter(Asset.status == status)
    return query.order_by(Asset.id.desc()).all()


# 4. YENİ CİHAZ (VEYA ÇOKLU CİHAZ) EKLEME
@router.post("/bulk-create")
@router.post("/")
def create_assets(payload: AssetBulkCreatePayload, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    company_id = current_user["company_id"]
    new_records = []

    loop_count = len(payload.serial_numbers) if payload.serial_numbers else payload.quantity
    if loop_count < 1:
        loop_count = 1

    for i in range(loop_count):
        current_serial = payload.serial_numbers[i] if payload.serial_numbers and i < len(payload.serial_numbers) else None

        new_asset = Asset(
            company_id=company_id,
            asset_name=payload.asset_name,
            category=payload.category,
            serial_no=current_serial,
            condition_on_assign=payload.condition_on_assign,
            description=payload.description,
            status="AVAILABLE",
            is_acknowledged=False,
            is_returned=False
        )
        db.add(new_asset)
        new_records.append(new_asset)

    db.commit()
    return {"message": f"{len(new_records)} adet ekipman başarıyla stoğa eklendi."}


@router.put("/{asset_id}/status")
def update_asset_status(asset_id: int, payload: AssetStatusUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == current_user["company_id"]
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı.")

    allowed_statuses = {"AVAILABLE", "IN_REPAIR", "RETIRED"}
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Geçersiz durum.")

    if asset.status == "ASSIGNED":
        raise HTTPException(status_code=400, detail="Zimmetli ekipman bu ekrandan doğrudan durum değiştiremez.")

    asset.status = payload.status
    if payload.note:
        status_note = f"\n[Durum Güncelleme: {datetime.now().strftime('%d/%m/%Y %H:%M')} - {payload.status} - {payload.note}]"
        asset.description = (asset.description or "") + status_note
    db.commit()
    return {"message": f"Ekipman durumu {payload.status} olarak güncellendi."}


# 5. PERSONELE ZİMMET ATAMA VE PDF ÇIKARMA
@router.post("/assign")
def assign_asset(req: AssetAssign, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN", "HR", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    company_id = current_user["company_id"]

    asset = db.query(Asset).filter(
        Asset.id == req.asset_id,
        Asset.company_id == company_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı.")

    # Güvenlik: Sadece boşta olan cihazlar atanabilir
    if asset.status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Bu cihaz şu anda boşta (AVAILABLE) değil. Atama yapılamaz.")

    emp = db.query(Employee).options(joinedload(Employee.position_rel)).filter(
        Employee.id == req.employee_id,
        Employee.company_id == company_id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Personel bulunamadı.")

    company = db.query(Company).filter(Company.id == company_id).first()

    try:
        generate_asset_pdf(asset, emp, company, request)
        asset.employee_id = req.employee_id
        asset.status = "ASSIGNED"
        asset.condition_on_assign = req.condition_on_assign
        asset.is_acknowledged = False
        asset.is_returned = False
        asset.return_date = None
        asset.given_date = date.today()  # Atama tarihi kaydedilir
        db.commit()
        return {"message": "Ekipman personele zimmetlendi ve PDF oluşturuldu."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Zimmetleme hatası: {str(e)}")


# 🌟 YENİ 6. ZİMMETİ İADE ALMA (Return)
@router.post("/return")
def return_asset(req: AssetReturn, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    asset = db.query(Asset).filter(
        Asset.id == req.asset_id,
        Asset.company_id == current_user["company_id"]
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı.")

    if asset.status != "ASSIGNED" or not asset.employee_id:
        raise HTTPException(status_code=400, detail="Bu cihaz şu an kimseye zimmetli değil.")

    # Zimmeti düş ve statüyü güncelle (AVAILABLE, IN_REPAIR, RETIRED vb.)
    asset.employee_id = None
    asset.status = req.new_status
    asset.is_acknowledged = False
    asset.is_returned = True
    asset.return_date = date.today()

    # İade kondisyonunu description'a ekle (Loglama mantığı)
    return_note = f"\n[İade: {datetime.now().strftime('%d/%m/%Y')} - Durum: {req.return_condition}]"
    asset.description = (asset.description or "") + return_note

    db.commit()
    return {"message": f"Cihaz iade alındı ve statüsü {req.new_status} olarak güncellendi."}


# 7. PDF İNDİRME
@router.get("/download-pdf/{asset_id}")
def download_asset_pdf(asset_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == current_user["company_id"]
    ).first()

    if not asset or not asset.employee_id:
        raise HTTPException(status_code=404, detail="Böyle bir zimmet kaydı bulunamadı.")

    if current_user["role"] == "EMPLOYEE" and current_user["user_id"] != asset.employee_id:
        raise HTTPException(status_code=403, detail="Sadece size atanan zimmet PDF'ini görüntüleyebilirsiniz.")

    employee = db.query(Employee).options(joinedload(Employee.position_rel)).filter(
        Employee.id == asset.employee_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Personel bulunamadı.")

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı.")

    try:
        matched_file = generate_asset_pdf(asset, employee, company, request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF oluşturulamadı: {str(exc)}")

    return FileResponse(
        path=matched_file,
        filename=f"Zimmet_{asset.asset_name}.pdf",
        media_type="application/pdf"
    )
