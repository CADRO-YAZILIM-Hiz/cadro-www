from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr, TypeAdapter, field_validator
from datetime import date, datetime, timedelta, timezone
import json
import os
import random
import re

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.i18n import _
from app.core.email import EmailService
from app.models.employee import Employee, Position, Department
from app.models.company import Company, SubscriptionStatus
from app.models.subscription import Subscription
from app.services.mobile_device_service import bind_mobile_device_to_employee

router = APIRouter()
email_adapter = TypeAdapter(EmailStr)


class VerifyMFARequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str):
        return str(email_adapter.validate_python(value.strip().lower()))


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str):
        return str(email_adapter.validate_python(value.strip().lower()))


class ResetPasswordConfirm(BaseModel):
    email: str
    code: str
    new_password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str):
        return str(email_adapter.validate_python(value.strip().lower()))


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ==========================================
# 🚀 PADDLE: ŞİFRE BELİRLEME (SETUP) ŞEMASI
# Paddle ödeme sonrası maile gelen OTP ile şifre belirleme
# ==========================================
class SetupPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str):
        return str(email_adapter.validate_python(value.strip().lower()))


def _utcnow_naive() -> datetime:
    return datetime.utcnow()


def _to_naive_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def validate_password_strength(password: str):
    if len(password) < 8:
        return False, "password_too_short"
    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"\d", password):
        return False, "password_too_weak"
    if not re.search(r"[@$!%*?&]", password):
        return False, "password_no_special_char"
    return True, None


def build_token_response(user: Employee, *, deactivated_device_count: int = 0):
    company_plan = "PRO"
    if getattr(user, "company", None):
        company_plan = getattr(user.company, "plan_code", "PRO") or "PRO"

    token_data = {
        "sub": str(user.email),
        "user_id": user.id,
        "company_id": user.company_id,
        "role": user.role,
        "company_plan": company_plan,
    }
    access_token = create_access_token(subject=json.dumps(token_data))
    refresh_token = create_refresh_token(subject=json.dumps(token_data))

    response = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "company_plan": company_plan,
        "name": f"{user.first_name} {user.last_name}",
        "user_id": user.id,
        "require_password_change": user.require_password_change,
    }

    if deactivated_device_count > 0:
        response["deactivated_device_count"] = deactivated_device_count

    return response


def ensure_company_subscription_access(user: Employee, request: Request, db: Session):
    """
    OWNER ve SUPERADMIN rolleri her zaman geçer.
    Diğer roller için şirketin aktif aboneliği olması gerekir.
    """
    if user.role in {"OWNER", "SUPERADMIN"}:
        return

    company = getattr(user, "company", None)
    if not company:
        raise HTTPException(status_code=403, detail=_(  "subscription_company_missing", request))

    company_status = getattr(company, "subscription_status", None)

    # İptal edilmiş veya gecikmiş abonelik
    if company_status == SubscriptionStatus.CANCELED:
        raise HTTPException(status_code=403, detail=_(  "subscription_inactive", request))

    # Deneme süresi dolmuş
    if company_status == SubscriptionStatus.TRIAL and company.trial_ends_at:
        if company.trial_ends_at < datetime.utcnow():
            raise HTTPException(status_code=403, detail=_(  "subscription_trial_expired", request))

    # Subscription tablosundan son kaydı kontrol et
    latest_subscription = (
        db.query(Subscription)
        .filter(Subscription.company_id == company.id)
        .order_by(Subscription.expiry_date.desc().nullslast(), Subscription.id.desc())
        .first()
    )

    if latest_subscription:
        latest_status = str(getattr(latest_subscription, "status", "") or "").strip().upper()
        expiry_date = getattr(latest_subscription, "expiry_date", None)
        if latest_status in {"EXPIRED", "CANCELED"}:
            raise HTTPException(status_code=403, detail=_(  "subscription_inactive", request))
        if expiry_date and expiry_date < datetime.utcnow().date():
            raise HTTPException(status_code=403, detail=_(  "subscription_expired", request))


# ==============================================================
# 🔐 LOGIN — Sadece mevcut üyeler giriş yapabilir
# Deneme/kayıt akışı YOKTUR. Tüm kullanıcılar Paddle üzerinden gelir.
# ==============================================================
@router.post("/login")
async def login(
    request: Request,
    background_tasks: BackgroundTasks,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    raw_form = await request.form()
    mobile_device_id = str(raw_form.get("device_id") or "").strip()
    mobile_device_name = str(raw_form.get("device_name") or "").strip() or None
    mobile_device_platform = str(raw_form.get("device_platform") or "").strip() or None
    mobile_push_token = str(raw_form.get("push_token") or "").strip() or None

    clean_email = form_data.username.strip().lower()
    user = db.query(Employee).options(joinedload(Employee.company)).filter(Employee.email == clean_email).first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail=_(  "invalid_credentials", request))

    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail=_(  "account_suspended", request))

    ensure_company_subscription_access(user, request, db)

    if user.mfa_enabled and not mobile_device_id:
        otp_code = str(random.randint(100000, 999999))
        user.otp_code = otp_code
        user.otp_expiry = _utcnow_naive() + timedelta(minutes=10)
        db.commit()

        if os.getenv("EMAIL_DEBUG_TO_TERMINAL", "0") == "1":
            print(f"[OTP DEBUG] email={user.email} code={otp_code}", flush=True)

        background_tasks.add_task(EmailService.send_otp_email, user.email, otp_code)

        return {
            "mfa_required": True,
            "require_mfa": True,
            "email": user.email,
            "message": _(  "mfa_code_sent", request)
        }

    deactivated_device_count = 0
    if mobile_device_id:
        _, deactivated_device_count = bind_mobile_device_to_employee(
            db,
            company_id=user.company_id,
            employee_id=user.id,
            device_id=mobile_device_id,
            device_name=mobile_device_name,
            device_platform=mobile_device_platform,
            push_token=mobile_push_token,
        )
        db.commit()

    return build_token_response(user, deactivated_device_count=deactivated_device_count)


@router.post("/verify-mfa")
def verify_mfa(payload: VerifyMFARequest, request: Request, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(Employee).options(joinedload(Employee.company)).filter(Employee.email == clean_email).first()

    if not user or not user.otp_code or user.otp_code != payload.code.strip():
        raise HTTPException(status_code=400, detail=_(  "invalid_mfa_code", request))

    otp_expiry = _to_naive_utc(user.otp_expiry)
    if not otp_expiry or _utcnow_naive() > otp_expiry:
        raise HTTPException(status_code=400, detail=_(  "mfa_code_expired", request))

    user.otp_code = None
    user.otp_expiry = None
    db.commit()

    return build_token_response(user)


@router.post("/refresh")
def refresh_access_token(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    try:
        from jose import jwt, JWTError
        token_payload = jwt.decode(
            payload.refresh_token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM", "HS256")]
        )
    except Exception:
        raise HTTPException(status_code=401, detail=_(  "err_token_expired", request))

    if token_payload.get("token_type") != "refresh":
        raise HTTPException(status_code=401, detail=_(  "err_invalid_token", request))

    subject = token_payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail=_(  "err_invalid_token", request))

    try:
        token_data = json.loads(subject) if isinstance(subject, str) and subject.startswith("{") else {}
    except Exception:
        token_data = {}

    user_id = token_data.get("user_id") or token_payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail=_(  "err_invalid_token", request))

    user = db.query(Employee).options(joinedload(Employee.company)).filter(Employee.id == int(user_id)).first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail=_(  "err_invalid_token", request))

    return build_token_response(user)


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    clean_email = payload.email.strip().lower()
    user = db.query(Employee).filter(Employee.email == clean_email).first()

    if user:
        otp_code = str(random.randint(100000, 999999))
        user.otp_code = otp_code
        user.otp_expiry = _utcnow_naive() + timedelta(minutes=20)
        db.commit()

        if os.getenv("EMAIL_DEBUG_TO_TERMINAL", "0") == "1":
            print(f"[RESET OTP DEBUG] email={user.email} code={otp_code}", flush=True)

        background_tasks.add_task(EmailService.send_password_reset_email, user.email, otp_code)

    return {"message": _(  "reset_email_sent_if_exists", request)}


@router.post("/reset-password")
def reset_password_confirm(data: ResetPasswordConfirm, request: Request, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    user = db.query(Employee).filter(Employee.email == clean_email).first()

    if not user or not user.otp_code or user.otp_code != data.code.strip():
        raise HTTPException(status_code=400, detail=_(  "invalid_mfa_code", request))

    otp_expiry = _to_naive_utc(user.otp_expiry)
    if not otp_expiry or _utcnow_naive() > otp_expiry:
        raise HTTPException(status_code=400, detail=_(  "mfa_code_expired", request))

    user.hashed_password = hash_password(data.new_password)
    user.otp_code = None
    user.otp_expiry = None
    user.require_password_change = False
    db.commit()

    return {"message": _(  "msg_password_updated", request)}


# ==========================================
# 🚀 PADDLE: ŞİFRE BELİRLEME (SETUP)
# Paddle ödemesi sonrası gelen OTP kodu ile şifre belirlenir.
# URL: POST /auth/setup-password
# ==========================================
@router.post("/setup-password")
def setup_password(payload: SetupPasswordRequest, request: Request, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(Employee).options(joinedload(Employee.company)).filter(Employee.email == clean_email).first()

    if not user or not user.otp_code or user.otp_code != payload.otp_code:
        raise HTTPException(status_code=400, detail=_(  "invalid_mfa_code", request))

    otp_expiry = _to_naive_utc(user.otp_expiry)
    if not otp_expiry or _utcnow_naive() > otp_expiry:
        raise HTTPException(status_code=400, detail=_(  "mfa_code_expired", request))

    is_strong, error_key = validate_password_strength(payload.new_password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=_(error_key, request))

    user.hashed_password = hash_password(payload.new_password)
    user.otp_code = None
    user.otp_expiry = None
    user.require_password_change = False
    user.status = "ACTIVE"

    if user.company and not user.company.is_active:
        user.company.is_active = True

    db.commit()

    return build_token_response(user)
