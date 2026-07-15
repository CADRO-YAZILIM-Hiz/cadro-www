import hashlib
import hmac
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.plan_features import (
    PLAN_BASIC,
    PLAN_ENTERPRISE,
    PLAN_PRO,
    normalize_plan_code,
)
from app.models.company import Company, SubscriptionStatus
from app.models.paddle_event import PaddleWebhookEvent
from app.models.subscription import Subscription
from app.services.onboarding_service import onboard_from_paddle


router = APIRouter()


def _parse_iso_datetime(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _parse_signature_header(signature_header: str) -> tuple[str, list[str]]:
    timestamp = None
    signatures: list[str] = []
    for part in signature_header.split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key == "ts":
            timestamp = value
        elif key == "h1":
            signatures.append(value)
    if not timestamp or not signatures:
        raise HTTPException(status_code=400, detail="Invalid Paddle-Signature header.")
    return timestamp, signatures


def _verify_paddle_signature(raw_body: bytes, signature_header: str | None) -> None:
    if not settings.PADDLE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Paddle webhook secret is not configured.")
    if not signature_header:
        raise HTTPException(status_code=400, detail="Missing Paddle-Signature header.")

    timestamp, signatures = _parse_signature_header(signature_header)
    try:
        signature_ts = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid Paddle webhook timestamp.") from exc

    current_ts = int(datetime.now(timezone.utc).timestamp())
    if abs(current_ts - signature_ts) > 300:
        raise HTTPException(status_code=400, detail="Paddle webhook timestamp is too old.")

    signed_payload = f"{timestamp}:{raw_body.decode('utf-8')}"
    expected_signature = hmac.new(
        settings.PADDLE_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected_signature, sig) for sig in signatures):
        raise HTTPException(status_code=400, detail="Paddle webhook signature verification failed.")


def _extract_price_ids(data: dict) -> list[str]:
    price_ids: list[str] = []
    for item in data.get("items", []) or []:
        price = item.get("price") or {}
        price_id = item.get("price_id") or price.get("id")
        if price_id:
            price_ids.append(str(price_id))
    return price_ids


def _plan_code_from_price_ids(price_ids: list[str]) -> str | None:
    for price_id in price_ids:
        if price_id in {settings.PADDLE_PRICE_BASIC_MONTHLY, settings.PADDLE_PRICE_BASIC_YEARLY}:
            return PLAN_BASIC
        if price_id in {settings.PADDLE_PRICE_PRO_MONTHLY, settings.PADDLE_PRICE_PRO_YEARLY}:
            return PLAN_PRO
        if price_id in {settings.PADDLE_PRICE_ENTERPRISE_MONTHLY, settings.PADDLE_PRICE_ENTERPRISE_YEARLY}:
            return PLAN_ENTERPRISE
    return None


def _subscription_status_from_paddle(status: str | None) -> SubscriptionStatus:
    normalized = str(status or "").strip().lower()
    if normalized == "trialing":
        return SubscriptionStatus.TRIAL
    if normalized == "active":
        return SubscriptionStatus.ACTIVE
    if normalized in {"past_due", "paused"}:
        return SubscriptionStatus.PAST_DUE
    if normalized in {"canceled", "inactive"}:
        return SubscriptionStatus.CANCELED
    return SubscriptionStatus.ACTIVE


def _resolve_company(db: Session, data: dict) -> Company | None:
    # 1. custom_data.company_id — en güvenilir yol (DUZELTME: raw_company_id tanımlandı)
    custom_data = data.get("custom_data") or {}
    raw_company_id = custom_data.get("company_id")
    if raw_company_id:
        try:
            company = db.query(Company).filter(Company.id == int(raw_company_id)).first()
            if company:
                return company
        except (ValueError, TypeError):
            pass

    # 2. customer email
    customer = data.get("customer") or {}
    customer_email = customer.get("email")
    if customer_email:
        company = db.query(Company).filter(Company.email == customer_email).first()
        if company:
            return company

    # 3. paddle_customer_id
    customer_id = data.get("customer_id")
    if customer_id:
        company = db.query(Company).filter(Company.paddle_customer_id == str(customer_id)).first()
        if company:
            return company

    # 4. paddle_subscription_id
    subscription_id = data.get("id") if str(data.get("id") or "").startswith("sub_") else None
    if subscription_id:
        company = db.query(Company).filter(Company.paddle_subscription_id == str(subscription_id)).first()
        if company:
            return company

    return None


def _upsert_subscription(db: Session, company: Company, plan_code: str, status: SubscriptionStatus, data: dict) -> None:
    subscription = db.query(Subscription).filter(Subscription.company_id == company.id).first()
    if subscription is None:
        subscription = Subscription(company_id=company.id)
        db.add(subscription)

    start_date = _parse_iso_datetime(data.get("started_at") or data.get("created_at"))
    next_billed_at = _parse_iso_datetime(data.get("next_billed_at"))

    subscription.plan = plan_code.title()
    subscription.status = status.value
    if start_date:
        subscription.start_date = start_date.date()
    if next_billed_at:
        subscription.expiry_date = next_billed_at.date()


def _process_subscription_event(db: Session, company: Company, data: dict) -> None:
    plan_code = _plan_code_from_price_ids(_extract_price_ids(data)) or normalize_plan_code(company.plan_code)
    status = _subscription_status_from_paddle(data.get("status"))

    company.plan_code = plan_code
    company.subscription_status = status
    company.is_active = status in {SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE}
    company.paddle_customer_id = str(data.get("customer_id") or getattr(company, "paddle_customer_id", "") or "")
    company.paddle_subscription_id = str(data.get("id") or getattr(company, "paddle_subscription_id", "") or "")

    price_ids = _extract_price_ids(data)
    if price_ids:
        company.paddle_price_id = price_ids[0]

    _upsert_subscription(db, company, plan_code, status, data)


def _process_transaction_event(company: Company, data: dict) -> None:
    plan_code = _plan_code_from_price_ids(_extract_price_ids(data))
    if plan_code:
        company.plan_code = plan_code
    customer_id = data.get("customer_id")
    transaction_id = data.get("id")
    if customer_id:
        company.paddle_customer_id = str(customer_id)
    if transaction_id:
        company.paddle_transaction_id = str(transaction_id)


def _process_adjustment_event(company: Company, data: dict) -> None:
    if str(data.get("status") or "").strip().lower() in {"approved", "processed"}:
        company.subscription_status = SubscriptionStatus.CANCELED
        company.is_active = False


# ==============================================================
# 🔔 WEBHOOK — Paddle her ödeme/abonelik olayında buraya POST atar
# URL: POST /paddle/webhook
# ==============================================================
@router.post("/webhook")
async def handle_paddle_webhook(
    request: Request,
    db: Session = Depends(get_db),
    paddle_signature: str | None = Header(default=None, alias="Paddle-Signature"),
):
    raw_body = await request.body()
    _verify_paddle_signature(raw_body, paddle_signature)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid Paddle webhook JSON payload.") from exc

    event_id = payload.get("event_id")
    event_type = payload.get("event_type")
    data = payload.get("data") or {}

    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Paddle webhook payload is missing event metadata.")

    # Duplicate event koruması
    existing_event = db.query(PaddleWebhookEvent).filter(PaddleWebhookEvent.event_id == event_id).first()
    if existing_event:
        return {"ok": True, "duplicate": True}

    company = _resolve_company(db, data)

    if not company:
        custom_data = data.get("custom_data") or {}
        fallback_company_id = custom_data.get("company_id")
        if fallback_company_id:
            try:
                company = db.query(Company).filter(Company.id == int(fallback_company_id)).first()
            except Exception:
                company = None

        if not company:
            customer = data.get("customer") or {}
            email = customer.get("email")
            if email:
                onboard_from_paddle(db, email)
                company = _resolve_company(db, data)

    event_row = PaddleWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        notification_id=payload.get("notification_id"),
        company_id=company.id if company else None,
        processing_status="received",
        occurred_at=_parse_iso_datetime(payload.get("occurred_at")),
        payload=raw_body.decode("utf-8"),
    )
    db.add(event_row)
    db.flush()

    try:
        if company:
            if event_type.startswith("subscription."):
                _process_subscription_event(db, company, data)
                # Onboarding sadece transaction.completed'da tetiklenir
            elif event_type.startswith("transaction."):
                _process_transaction_event(company, data)
            elif event_type.startswith("adjustment."):
                _process_adjustment_event(company, data)

        event_row.processing_status = "processed"
        event_row.processed_at = datetime.utcnow()
        db.commit()

        return {"ok": True, "company_id": company.id if company else None}

    except Exception as exc:
        db.rollback()
        failed_event = db.query(PaddleWebhookEvent).filter(PaddleWebhookEvent.event_id == event_id).first()
        if failed_event:
            failed_event.processing_status = "failed"
            failed_event.error_message = str(exc)
            failed_event.processed_at = datetime.utcnow()
            db.commit()
        raise HTTPException(status_code=500, detail="Paddle webhook processing failed.") from exc


# ==============================================================
# 📋 ABONELİK BİLGİSİ — Giriş yapmış kullanıcı kendi planını görür
# URL: GET /paddle/subscription
# ==============================================================
@router.get("/subscription")
def get_subscription_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Şirket bilgisi bulunamadı.")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı.")

    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()

    return {
        "plan_code": company.plan_code or "PRO",
        "subscription_status": company.subscription_status.value if company.subscription_status else "ACTIVE",
        "is_active": company.is_active,
        "paddle_subscription_id": company.paddle_subscription_id,
        "paddle_customer_id": company.paddle_customer_id,
        "paddle_price_id": company.paddle_price_id,
        "subscription": {
            "plan": subscription.plan,
            "status": subscription.status,
            "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
            "expiry_date": subscription.expiry_date.isoformat() if subscription.expiry_date else None,
        } if subscription else None,
    }
