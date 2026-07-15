from fastapi import APIRouter, Depends, HTTPException, Request # 🎯 YENİ: Request eklendi
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import os
import uuid
import qrcode
import urllib.parse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _ # 🌍 YENİ: Çeviri motoru eklendi
from app.core.plan_features import plan_feature_required
from app.core.permissions import ensure_permission
from app.api.report import format_text
from app.models.company import Location, Company
from app.schemas.location import LocationCreate, LocationOut

router = APIRouter(dependencies=[Depends(plan_feature_required("ops.locations"))])

# ==========================================
# 🇹🇷 TÜRKÇE FONT KURULUMU (GÜVENLİ HALE GETİRİLDİ)
# ==========================================
FONT_DIR = "fonts"
os.makedirs(FONT_DIR, exist_ok=True)
regular_font_path = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
bold_font_path = os.path.join(FONT_DIR, "Roboto-Bold.ttf")
amiri_regular_path = os.path.join(FONT_DIR, "Amiri-Regular.ttf")
amiri_bold_path = os.path.join(FONT_DIR, "Amiri-Bold.ttf")

def ensure_fonts():
    if not os.path.exists(regular_font_path) or not os.path.exists(bold_font_path):
        print("⚠️ Uyarı: Roboto font dosyaları 'fonts' klasöründe bulunamadı. Poster üretimi etkilenebilir.")

ensure_fonts()

try:
    pdfmetrics.registerFont(TTFont('Roboto', regular_font_path))
    pdfmetrics.registerFont(TTFont('Roboto-Bold', bold_font_path))
    addMapping('Roboto', 0, 0, 'Roboto')       
    addMapping('Roboto', 1, 0, 'Roboto-Bold')
    if os.path.exists(amiri_regular_path) and os.path.exists(amiri_bold_path):
        pdfmetrics.registerFont(TTFont('LocationAmiri', amiri_regular_path))
        pdfmetrics.registerFont(TTFont('LocationAmiri-Bold', amiri_bold_path))
        addMapping('LocationAmiri', 0, 0, 'LocationAmiri')
        addMapping('LocationAmiri', 1, 0, 'LocationAmiri-Bold')
except Exception as e:
    print(f"Font Kayıt Hatası: {e}")

# ==========================================
# 🏢 1. YENİ KONUM EKLE (SADECE YÖNETİCİ)
# ==========================================
@router.post("/", response_model=LocationOut)
def create_location(
    loc_in: LocationCreate, 
    request: Request, # 🌍 YENİ: Dil tespiti
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "locations.manage_company", request)

    secure_token = uuid.uuid4().hex[:16]

    new_loc = Location(
        company_id=current_user["company_id"],
        name=loc_in.name,
        address=loc_in.address,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        allowed_radius=loc_in.allowed_radius,
        qr_token=secure_token
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc

# ==========================================
# 📋 2. KONUMLARI LİSTELE
# ==========================================
@router.get("/", response_model=list[LocationOut])
def get_locations(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "locations.manage_company", request)
    return db.query(Location).filter(
        Location.company_id == current_user["company_id"],
        Location.is_active == True
    ).order_by(Location.id.desc()).all()

# ==========================================
# ✏️ 3. KONUM DÜZENLEME (SADECE YÖNETİCİ)
# ==========================================
@router.put("/{location_id}", response_model=LocationOut)
def update_location(
    location_id: int,
    loc_in: LocationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "locations.manage_company", request)

    location = db.query(Location).filter(
        Location.id == location_id, 
        Location.company_id == current_user["company_id"]
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=_("location_not_found", request))
        
    location.name = loc_in.name
    location.address = loc_in.address
    location.latitude = loc_in.latitude
    location.longitude = loc_in.longitude
    location.allowed_radius = loc_in.allowed_radius
    
    db.commit()
    db.refresh(location)
    return location

# ==========================================
# 🔄 4. YENİ YETENEK: QR KODU (TOKEN) SIFIRLAMA
# ==========================================
@router.put("/{location_id}/rotate-qr")
def rotate_qr_token(
    location_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "locations.manage_company", request)

    location = db.query(Location).filter(
        Location.id == location_id, 
        Location.company_id == current_user["company_id"]
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=_("location_not_found", request))
        
    location.qr_token = uuid.uuid4().hex[:16] 
    db.commit()
    
    return {"message": _("qr_rotated_success", request)}

# ==========================================
# 🗑️ 5. KONUM SİLME (SADECE YÖNETİCİ)
# ==========================================
@router.delete("/{location_id}")
def delete_location(
    location_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "locations.manage_company", request)

    location = db.query(Location).filter(
        Location.id == location_id, 
        Location.company_id == current_user["company_id"]
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=_("location_not_found", request))
        
    location.is_active = False
    db.commit()
    return {"message": _("location_archived", request)}

# =====================================================================
# 🖨️ 6. ŞANTİYE KAPISI İÇİN A4 QR POSTER ÜRETİCİ
# =====================================================================
@router.get("/{location_id}/qr-poster")
def download_qr_poster(
    location_id: int, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "locations.manage_company", request)

    location = db.query(Location).filter(
        Location.id == location_id, 
        Location.company_id == current_user["company_id"]
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=_("location_not_found", request))

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    is_arabic = "ar" in request.headers.get("Accept-Language", "tr").lower()
    regular_font = "LocationAmiri" if is_arabic and "LocationAmiri" in pdfmetrics.getRegisteredFontNames() else "Roboto"
    bold_font = "LocationAmiri-Bold" if is_arabic and "LocationAmiri-Bold" in pdfmetrics.getRegisteredFontNames() else "Roboto-Bold"

    def tr_text(key: str, **kwargs) -> str:
        raw = _(key, request).format(**kwargs) if kwargs else _(key, request)
        return format_text(raw, is_arabic, strip_html=True)

    current_token = location.qr_token if location.qr_token else "UNKNOWN_TOKEN"
    
    qr_data = f"LOC_ID:{location.id}|TOKEN:{current_token}"
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="white") 
    
    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4
    
    c.setFillColorRGB(0.06, 0.09, 0.16) 
    c.rect(0, height - 120, width, 120, fill=1)
    
    c.setFillColorRGB(1, 1, 1) 
    c.setFont(bold_font, 26)
    c.drawCentredString(width / 2, height - 70, format_text(str(company.name).upper(), is_arabic))

    c.setFillColorRGB(0.1, 0.1, 0.1)
    title_text = tr_text("location_pdf_title")
    title_font_size = 32
    while pdfmetrics.stringWidth(title_text, bold_font, title_font_size) > (width - 70) and title_font_size > 18:
        title_font_size -= 1
    c.setFont(bold_font, title_font_size)
    c.drawCentredString(width / 2, height - 200, title_text)
    
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.setFont(regular_font, 20)
    c.drawCentredString(width / 2, height - 240, format_text(str(location.name).upper(), is_arabic))

    qr_size = 350
    x_pos = (width - qr_size) / 2
    y_pos = height - 620
    c.drawImage(ImageReader(img_buffer), x_pos, y_pos, width=qr_size, height=qr_size)

    c.setFont(bold_font, 14)
    c.setFillColorRGB(0.8, 0.1, 0.1) 
    c.drawCentredString(width / 2, 180, tr_text("location_pdf_warning_radius", radius=location.allowed_radius))
    
    c.setFont(regular_font, 12)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(width / 2, 140, tr_text("location_pdf_step_1"))
    c.drawCentredString(width / 2, 115, tr_text("location_pdf_step_2"))
    c.drawCentredString(width / 2, 90, tr_text("location_pdf_step_3"))

    c.save()
    pdf_buffer.seek(0)
    
    safe_filename = urllib.parse.quote(f"{_('location_pdf_filename_prefix', request)}_{location.name}.pdf")

    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename*=utf-8''{safe_filename}"}
    )
