import os
import re
import shutil
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.plan_features import normalize_plan_code
from app.core.permissions import ensure_permission
from app.models.company import Company, SubscriptionStatus
from app.models.employee import Employee

router = APIRouter()

UPLOAD_DIR = "uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 🎯 Logo yükleme için güvenli ve sınırlı tipler
ALLOWED_LOGO_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    official_legal_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_number: Optional[str] = None
    workplace_registration_no: Optional[str] = None
    plan_code: Optional[str] = None


class SettingsUpdate(BaseModel):
    it_responsible: Optional[int] = None
    hr_responsible: Optional[int] = None
    admin_responsible: Optional[int] = None
    payroll_officer_id: Optional[int] = None
    onboarding_responsible: Optional[int] = None
    offboarding_responsible: Optional[int] = None
    dossier_required_global: Optional[list[str]] = None
    dossier_required_tr: Optional[list[str]] = None
    dossier_required_kktc: Optional[list[str]] = None
    dossier_required_eu: Optional[list[str]] = None
    dossier_required_mena: Optional[list[str]] = None
    dossier_required_leadership: Optional[list[str]] = None
    dossier_alert_roles: Optional[list[str]] = None
    plan_code: Optional[str] = None


# ==========================================
# 🚀 PADDLE: ÖN KAYIT (INIT-CHECKOUT) ŞEMASI
# ==========================================
class InitCheckoutRequest(BaseModel):
    company_name: str
    email: EmailStr
    plan_code: str


def _loads_json_list(raw_value: Optional[str]) -> list[str]:
    if not raw_value:
        return []
    try:
        loaded = json.loads(raw_value)
        if isinstance(loaded, list):
            return [str(item).strip().upper() for item in loaded if str(item).strip()]
    except Exception:
        return []
    return []


# ==========================================
# 🛡️ YARDIMCI GÜVENLİK FONKSİYONLARI
# ==========================================
def sanitize_filename(filename: str) -> str:
    base_name = os.path.basename(filename or "logo")
    name, ext = os.path.splitext(base_name)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._") or "logo"
    safe_ext = re.sub(r"[^A-Za-z0-9.]", "", ext.lower())
    return f"{safe_name}{safe_ext}"


def validate_logo_upload(file: UploadFile, request: Request):
    if not file.filename:
        raise HTTPException(status_code=400, detail=_("invalid_doc_format", request))

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=_("invalid_doc_format", request))

    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_LOGO_SIZE:
        raise HTTPException(status_code=400, detail=_("doc_size_limit", request))

    return ext


# ==========================================
# 🚀 PADDLE: ÖN KAYIT (INIT-CHECKOUT) ENDPOINT'İ
# ==========================================
@router.post("/init-checkout")
def init_checkout(payload: InitCheckoutRequest, db: Session = Depends(get_db)):
    """
    Kullanıcı ödeme yapmadan hemen önce PENDING statüsünde bir şirket açar.
    Oluşan company_id, Paddle customData içine gömülmek üzere frontend'e dönülür.
    """
    clean_email = payload.email.strip().lower()

    # Aynı email ile kayıt var mı kontrol et
    existing = db.query(Company).filter(Company.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Bu e-posta adresi zaten kayıtlı. Giriş yapmak için app.cadro.io adresini kullanabilirsiniz."
        )

    # Aynı şirket adı var mı kontrol et
    existing_name = db.query(Company).filter(Company.name == payload.company_name.strip()).first()
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail="Bu şirket adı zaten kullanılıyor. Lütfen farklı bir şirket adı giriniz."
        )
    
    # Şirketi beklemede olarak aç
    new_company = Company(
        name=payload.company_name,
        email=clean_email,
        plan_code=normalize_plan_code(payload.plan_code),
        subscription_status=SubscriptionStatus.TRIAL,
        is_active=False
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    return {"company_id": new_company.id, "message": "Pending company created."}


@router.get("/list")
def get_companies(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    companies = db.query(Company).filter(Company.id == current_user["company_id"]).all()
    return companies


@router.get("/settings")
def get_settings(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "company.settings.manage", request)
    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail=_("company_not_found", request))

    return {
        "plan_code": normalize_plan_code(getattr(company, "plan_code", None)),
        "it_responsible": company.it_responsible,
        "hr_responsible": company.hr_responsible,
        "admin_responsible": company.admin_responsible,
        "payroll_officer_id": company.payroll_officer_id,
        "onboarding_responsible": company.onboarding_responsible,
        "offboarding_responsible": company.offboarding_responsible,
        "dossier_required_global": _loads_json_list(company.dossier_required_global),
        "dossier_required_tr": _loads_json_list(company.dossier_required_tr),
        "dossier_required_kktc": _loads_json_list(company.dossier_required_kktc),
        "dossier_required_eu": _loads_json_list(company.dossier_required_eu),
        "dossier_required_mena": _loads_json_list(company.dossier_required_mena),
        "dossier_required_leadership": _loads_json_list(company.dossier_required_leadership),
        "dossier_alert_roles": _loads_json_list(company.dossier_alert_roles),
    }


@router.put("/settings")
def update_settings(payload: SettingsUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "company.settings.manage", request)

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail=_("company_not_found", request))

    company.plan_code = normalize_plan_code(payload.plan_code or getattr(company, "plan_code", None))
    company.it_responsible = payload.it_responsible
    company.hr_responsible = payload.hr_responsible
    company.admin_responsible = payload.admin_responsible
    company.onboarding_responsible = payload.onboarding_responsible
    company.offboarding_responsible = payload.offboarding_responsible
    company.payroll_officer_id = payload.payroll_officer_id
    company.dossier_required_global = json.dumps(payload.dossier_required_global or [])
    company.dossier_required_tr = json.dumps(payload.dossier_required_tr or [])
    company.dossier_required_kktc = json.dumps(payload.dossier_required_kktc or [])
    company.dossier_required_eu = json.dumps(payload.dossier_required_eu or [])
    company.dossier_required_mena = json.dumps(payload.dossier_required_mena or [])
    company.dossier_required_leadership = json.dumps(payload.dossier_required_leadership or [])
    company.dossier_alert_roles = json.dumps(payload.dossier_alert_roles or [])
    db.commit()
    return {"message": _("settings_updated", request)}


@router.put("/settings/payroll-officer")
def set_payroll_officer(officer_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "company.settings.manage", request)

    company = db.query(Company).filter(Company.id == current_user["company_id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail=_("company_not_found", request))

    officer = db.query(Employee).filter(
        Employee.id == officer_id,
        Employee.company_id == current_user["company_id"]
    ).first()
    if not officer:
        raise HTTPException(status_code=404, detail=_("employee_not_found", request))

    company.payroll_officer_id = officer_id
    db.commit()
    return {"message": _("payroll_officer_assigned", request)}


@router.put("/{company_id}")
def update_company(company_id: int, payload: CompanyUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ensure_permission(current_user, "company.settings.manage", request)
    if current_user["company_id"] != company_id:
        raise HTTPException(status_code=403, detail=_("unauthorized", request))

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=_("company_not_found", request))

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "plan_code":
            value = normalize_plan_code(value)
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company


@router.post("/{company_id}/logo")
def upload_logo(
    company_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_permission(current_user, "company.settings.manage", request)

    company = db.query(Company).filter(
        Company.id == company_id,
        Company.id == current_user["company_id"]
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail=_("company_not_found", request))

    ext = validate_logo_upload(file, request)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    original_safe_name = sanitize_filename(file.filename)
    safe_filename = f"logo_{company_id}_{timestamp}_{original_safe_name.rsplit('.', 1)[0]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    if company.logo_url:
        old_file_path = company.logo_url.lstrip("/")
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception:
                pass

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    company.logo_url = f"/{file_path}"
    db.commit()
    return {"message": _("logo_uploaded", request), "logo_url": company.logo_url}