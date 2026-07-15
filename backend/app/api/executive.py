import json
import os
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.permissions import ensure_permission
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.employee import Employee
from app.models.subscription import Subscription

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_DIR = BACKEND_ROOT / "uploads"
STATIC_DIR = BACKEND_ROOT / "static"
OPS_ALERTS_PATH = BACKEND_ROOT / "ops_alerts.json"
OWNER_NOTES_PATH = BACKEND_ROOT / "owner_company_notes.json"
PLAN_PRICING_TRY = {
    "BASIC": {"base": 2990, "included": 20, "overage": 95},
    "PRO": {"base": 6990, "included": 25, "overage": 175},
    "ENTERPRISE": {"base": 14900, "included": 100, "overage": 0},
}


def _resolve_sqlite_db_path() -> Path | None:
    database_url = str(getattr(settings, "DATABASE_URL", "") or "")
    if not database_url.startswith("sqlite:///"):
        return None
    raw_path = database_url.replace("sqlite:///", "", 1)
    return Path(raw_path)


class ExecutiveCompanyMetaUpdate(BaseModel):
    owner_note: str | None = None
    owner_tag: str | None = None
    last_contact_at: str | None = None
    next_follow_up_at: str | None = None
    last_contact_result: str | None = None


def _safe_file_size(path: Path) -> int:
    try:
        return path.stat().st_size if path.exists() else 0
    except Exception:
        return 0


def _safe_dir_size(path: Path) -> int:
    total = 0
    if not path.exists():
        return 0
    try:
        for file_path in path.rglob("*"):
            if file_path.is_file():
                total += file_path.stat().st_size
    except Exception:
        return total
    return total


def _serialize_alert(source: str, severity: str, title: str, message: str, created_at: str | None = None):
    return {
        "source": source,
        "severity": severity,
        "title": title,
        "message": message,
        "created_at": created_at or datetime.utcnow().isoformat(),
    }


def _normalize_plan_code(value: str | None) -> str:
    return (value or "PRO").upper()


def _estimate_mrr_try(plan_code: str, active_employee_count: int) -> int:
    config = PLAN_PRICING_TRY.get(_normalize_plan_code(plan_code), PLAN_PRICING_TRY["PRO"])
    extra_users = max(0, (active_employee_count or 0) - config["included"])
    return int(config["base"] + (extra_users * config["overage"]))


def _calculate_change_percent(current_value: int | float, previous_value: int | float) -> float:
    current_number = float(current_value or 0)
    previous_number = float(previous_value or 0)
    if previous_number <= 0:
      return 100.0 if current_number > 0 else 0.0
    return round(((current_number - previous_number) / previous_number) * 100, 1)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
    except Exception:
        return None


def _parse_iso_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value[:10])
    except Exception:
        return None


def _load_external_alerts() -> list[dict]:
    if not OPS_ALERTS_PATH.exists():
        return []
    try:
        payload = json.loads(OPS_ALERTS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []

    if isinstance(payload, list):
        result = []
        for item in payload:
            if isinstance(item, dict):
                result.append(
                    _serialize_alert(
                        item.get("source", "HOSTING"),
                        item.get("severity", "info"),
                        item.get("title", "Harici Uyarı"),
                        item.get("message", ""),
                        item.get("created_at"),
                    )
                )
        return result
    return []


def _load_owner_company_meta() -> dict[str, dict]:
    if not OWNER_NOTES_PATH.exists():
        return {}
    try:
        payload = json.loads(OWNER_NOTES_PATH.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _save_owner_company_meta(payload: dict[str, dict]) -> None:
    OWNER_NOTES_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


@router.get("/overview")
def get_executive_overview(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "executive.view_platform", request)

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)
    previous_30d_start = now - timedelta(days=60)
    previous_30d_end = last_30d
    day_labels = [(now - timedelta(days=offset)).date().isoformat() for offset in range(6, -1, -1)]

    companies = db.query(Company).order_by(Company.name.asc()).all()
    try:
        subscriptions = db.query(Subscription).all()
    except Exception:
        subscriptions = []
    subscription_by_company: dict[int, Subscription] = {}
    for subscription in subscriptions:
        existing = subscription_by_company.get(subscription.company_id)
        if not existing or (subscription.id or 0) > (existing.id or 0):
            subscription_by_company[subscription.company_id] = subscription

    employee_counts = {
        company_id: {"total": total or 0, "active": active or 0}
        for company_id, total, active in db.query(
            Employee.company_id,
            func.count(Employee.id),
            func.sum(case((Employee.status == "ACTIVE", 1), else_=0)),
        ).group_by(Employee.company_id).all()
    }
    responsible_employee_ids = set()
    for company in companies:
        for employee_id in [
            getattr(company, "admin_responsible", None),
            getattr(company, "hr_responsible", None),
            getattr(company, "payroll_officer_id", None),
        ]:
            if employee_id:
                responsible_employee_ids.add(employee_id)

    employees_by_id = {
        employee.id: employee
        for employee in db.query(Employee).filter(Employee.id.in_(responsible_employee_ids)).all()
    } if responsible_employee_ids else {}

    company_rows = []
    plan_counter = Counter()
    mrr_counter = Counter()
    expiring_trials = 0

    request_counts_30d = {
        company_id: count or 0
        for company_id, count in db.query(AuditLog.company_id, func.count(AuditLog.id))
        .filter(AuditLog.created_at >= last_30d, AuditLog.company_id.isnot(None))
        .group_by(AuditLog.company_id)
        .all()
    }
    request_counts_previous_30d = {
        company_id: count or 0
        for company_id, count in db.query(AuditLog.company_id, func.count(AuditLog.id))
        .filter(
            AuditLog.created_at >= previous_30d_start,
            AuditLog.created_at < previous_30d_end,
            AuditLog.company_id.isnot(None),
        )
        .group_by(AuditLog.company_id)
        .all()
    }
    last_activity_by_company = {
        company_id: last_activity
        for company_id, last_activity in db.query(
            AuditLog.company_id,
            func.max(AuditLog.created_at),
        )
        .filter(AuditLog.company_id.isnot(None))
        .group_by(AuditLog.company_id)
        .all()
    }
    active_companies_last_30d = {
        company_id
        for company_id, in db.query(AuditLog.company_id)
        .filter(AuditLog.created_at >= last_30d, AuditLog.company_id.isnot(None))
        .distinct()
        .all()
    }
    active_companies_previous_30d = {
        company_id
        for company_id, in db.query(AuditLog.company_id)
        .filter(
            AuditLog.created_at >= previous_30d_start,
            AuditLog.created_at < previous_30d_end,
            AuditLog.company_id.isnot(None),
        )
        .distinct()
        .all()
    }
    owner_company_meta = _load_owner_company_meta()
    upgrade_candidates = []
    payment_risk_companies = []
    downgrade_risk_companies = []
    current_period_mrr = 0
    previous_period_mrr = 0

    for company in companies:
        sub = subscription_by_company.get(company.id)
        counts = employee_counts.get(company.id, {"total": 0, "active": 0})
        plan_code = _normalize_plan_code(getattr(company, "plan_code", None) or getattr(sub, "plan", None) or "PRO")
        plan_counter[plan_code] += 1
        estimated_mrr_try = _estimate_mrr_try(plan_code, counts["active"])
        mrr_counter[plan_code] += estimated_mrr_try
        request_count_30d = request_counts_30d.get(company.id, 0)

        subscription_start = sub.start_date.isoformat() if sub and sub.start_date else None
        subscription_end = sub.expiry_date.isoformat() if sub and sub.expiry_date else (
            company.trial_ends_at.isoformat() if company.trial_ends_at else None
        )

        if company.trial_ends_at and company.subscription_status == "TRIAL":
            remaining_days = (company.trial_ends_at - now).days
            if remaining_days <= 7:
                expiring_trials += 1
        else:
            remaining_days = None

        primary_contact = None
        for contact_id, contact_role in [
            (getattr(company, "admin_responsible", None), "Şirket Temsilcisi"),
            (getattr(company, "hr_responsible", None), "İK Temsilcisi"),
            (getattr(company, "payroll_officer_id", None), "Bordro Temsilcisi"),
        ]:
            employee = employees_by_id.get(contact_id)
            if employee:
                full_name = f"{employee.first_name} {employee.last_name}".strip()
                primary_contact = {
                    "employee_id": employee.id,
                    "name": full_name,
                    "role": contact_role,
                    "email": employee.email or company.email,
                    "phone": employee.phone or company.phone,
                }
                break

        primary_email = (primary_contact or {}).get("email") or company.email
        primary_phone = (primary_contact or {}).get("phone") or company.phone
        owner_meta = owner_company_meta.get(str(company.id), {})
        last_activity_at = last_activity_by_company.get(company.id)
        contact_subject = f"CADRO | {company.name} abonelik ve kullanım takibi"
        contact_body = (
            f"Merhaba {((primary_contact or {}).get('name') or company.name)},%0D%0A%0D%0A"
            "CADRO kullanımınız ve abonelik durumunuzla ilgili kısa bir değerlendirme paylaşmak istiyorum.%0D%0A%0D%0A"
            "Uygun olduğunuzda dönüş yapabilirsiniz.%0D%0A%0D%0A"
            "Teşekkürler."
        )
        mailto_url = f"mailto:{primary_email}?subject={contact_subject}&body={contact_body}" if primary_email else None
        recovery_subject = f"CADRO | {company.name} için yeniden değerlendirme"
        recovery_body = (
            f"Merhaba {((primary_contact or {}).get('name') or company.name)},%0D%0A%0D%0A"
            "CADRO kullanımınızı yeniden değerlendirmek ve ihtiyaçlarınıza uygun bir plan önermek isterim.%0D%0A%0D%0A"
            "Uygun olduğunuzda kısa bir görüşme planlayabiliriz.%0D%0A%0D%0A"
            "Teşekkürler."
        )
        recovery_mailto_url = f"mailto:{primary_email}?subject={recovery_subject}&body={recovery_body}" if primary_email else None

        recommendation = None
        recommendation_reason = None
        if plan_code == "BASIC" and (counts["active"] >= 18 or request_count_30d >= 900):
            recommendation = "PRO"
            if counts["active"] >= 18:
                recommendation_reason = "Aktif kişi sayısı Basic sınırına yaklaştı."
            else:
                recommendation_reason = "Son 30 gündeki kullanım hacmi Pro için uygun görünüyor."
        elif plan_code == "PRO" and (counts["active"] >= 60 or request_count_30d >= 2500):
            recommendation = "ENTERPRISE"
            if counts["active"] >= 60:
                recommendation_reason = "Aktif kişi hacmi Enterprise ihtiyaç sinyali veriyor."
            else:
                recommendation_reason = "Yoğun işlem trafiği daha gelişmiş yönetim katmanı gerektiriyor."

        usage_score = min(
            100,
            int(
                ((counts["active"] or 0) * 1.5)
                + min(60, (request_count_30d or 0) / 15)
            ),
        )
        if recommendation == "ENTERPRISE":
            upsell_probability = "YUKSEK"
        elif recommendation == "PRO":
            upsell_probability = "ORTA"
        elif request_count_30d >= 300:
            upsell_probability = "IZLENIYOR"
        else:
            upsell_probability = "DUSUK"

        status_upper = str(company.subscription_status.value if company.subscription_status else (sub.status if sub else "UNKNOWN")).upper()
        is_passive_company = (not company.is_active) or status_upper in {"PAST_DUE", "CANCELED"}
        if is_passive_company:
            if last_activity_at and last_activity_at >= now - timedelta(days=45):
                recovery_candidate = "YUKSEK"
                recovery_reason = "Son kullanım tarihi yakın. Geri kazanım şansı yüksek."
            elif last_activity_at and last_activity_at >= now - timedelta(days=120):
                recovery_candidate = "ORTA"
                recovery_reason = "Yakın dönemde kullanım var. Teklif ve temasla geri kazanılabilir."
            else:
                recovery_candidate = "DUSUK"
                recovery_reason = "Uzun süredir kullanım görünmüyor."
        else:
            recovery_candidate = None
            recovery_reason = None

        if is_passive_company:
            if plan_code == "ENTERPRISE":
                recovery_offer = "Pro ile yeniden başlatma + yakın takip görüşmesi"
            elif plan_code == "PRO":
                recovery_offer = "Pro yeniden aktivasyon + ilk ay kullanım desteği"
            else:
                recovery_offer = "Basic yeniden aktivasyon teklifi"
        else:
            recovery_offer = None

        follow_up_at = _parse_iso_date(owner_meta.get("next_follow_up_at"))
        should_call_this_week = bool(
            is_passive_company and (
                (follow_up_at and now.date() <= follow_up_at.date() <= (now + timedelta(days=7)).date())
                or (not follow_up_at and recovery_candidate == "YUKSEK")
            )
        )

        company_row = {
            "id": company.id,
            "name": company.name,
            "official_legal_name": company.official_legal_name,
            "plan_code": plan_code,
            "subscription_status": status_upper,
            "subscription_start_date": subscription_start,
            "subscription_end_date": subscription_end,
            "remaining_trial_days": remaining_days,
            "employee_count": counts["total"],
            "active_employee_count": counts["active"],
            "request_count_30d": request_count_30d,
            "estimated_mrr_try": estimated_mrr_try,
            "suggested_next_plan": recommendation,
            "upgrade_reason": recommendation_reason,
            "primary_contact": primary_contact,
            "contact_email": primary_email,
            "contact_phone": primary_phone,
            "mailto_url": mailto_url,
            "recovery_mailto_url": recovery_mailto_url,
            "owner_note": owner_meta.get("owner_note", ""),
            "owner_tag": owner_meta.get("owner_tag", ""),
            "last_contact_at": owner_meta.get("last_contact_at"),
            "next_follow_up_at": owner_meta.get("next_follow_up_at"),
            "last_contact_result": owner_meta.get("last_contact_result", ""),
            "last_activity_at": last_activity_at.isoformat() if last_activity_at else None,
            "usage_score": usage_score,
            "upsell_probability": upsell_probability,
            "recovery_candidate": recovery_candidate,
            "recovery_reason": recovery_reason,
            "last_used_plan": plan_code,
            "recovery_offer": recovery_offer,
            "should_call_this_week": should_call_this_week,
            "email": company.email,
            "website": company.website,
            "is_active": company.is_active,
        }
        company_rows.append(company_row)
        if recommendation:
            upgrade_candidates.append({
                "company_id": company.id,
                "company_name": company.name,
                "current_plan": plan_code,
                "suggested_plan": recommendation,
                "active_employee_count": counts["active"],
                "request_count_30d": request_count_30d,
                "estimated_mrr_try": estimated_mrr_try,
                "reason": recommendation_reason,
            })

        if company.id in active_companies_last_30d:
            current_period_mrr += estimated_mrr_try
        if company.id in active_companies_previous_30d:
            previous_period_mrr += estimated_mrr_try

        if status_upper in {"PAST_DUE", "CANCELED"} or (
            status_upper == "TRIAL" and remaining_days is not None and remaining_days <= 7
        ):
            if status_upper == "PAST_DUE":
                payment_reason = "Ödeme gecikmesi görünüyor."
            elif status_upper == "CANCELED":
                payment_reason = "Abonelik iptal statüsünde."
            else:
                payment_reason = "Deneme süresi bitişe yaklaştı."
            payment_risk_companies.append({
                "company_id": company.id,
                "company_name": company.name,
                "plan_code": plan_code,
                "subscription_status": company_row["subscription_status"],
                "subscription_end_date": subscription_end,
                "estimated_mrr_try": estimated_mrr_try,
                "reason": payment_reason,
            })

        low_usage = request_count_30d < 60
        low_growth = request_count_30d <= request_counts_previous_30d.get(company.id, 0)
        if plan_code == "PRO" and counts["active"] <= 8 and low_usage and low_growth:
            downgrade_risk_companies.append({
                "company_id": company.id,
                "company_name": company.name,
                "plan_code": plan_code,
                "estimated_mrr_try": estimated_mrr_try,
                "request_count_30d": request_count_30d,
                "request_count_previous_30d": request_counts_previous_30d.get(company.id, 0),
                "reason": "Pro pakete göre düşük aktif kişi ve düşük kullanım sinyali var.",
            })
        elif plan_code == "ENTERPRISE" and counts["active"] <= 25 and request_count_30d < 180 and low_growth:
            downgrade_risk_companies.append({
                "company_id": company.id,
                "company_name": company.name,
                "plan_code": plan_code,
                "estimated_mrr_try": estimated_mrr_try,
                "request_count_30d": request_count_30d,
                "request_count_previous_30d": request_counts_previous_30d.get(company.id, 0),
                "reason": "Enterprise kullanım yoğunluğu son dönemde belirgin biçimde düşük görünüyor.",
            })

    request_count_24h = db.query(func.count(AuditLog.id)).filter(AuditLog.created_at >= last_24h).scalar() or 0
    request_count_7d = db.query(func.count(AuditLog.id)).filter(AuditLog.created_at >= last_7d).scalar() or 0
    unique_users_24h = db.query(func.count(func.distinct(AuditLog.actor_employee_id))).filter(
        AuditLog.created_at >= last_24h,
        AuditLog.actor_employee_id.isnot(None),
    ).scalar() or 0
    active_companies_24h = db.query(func.count(func.distinct(AuditLog.company_id))).filter(
        AuditLog.created_at >= last_24h,
        AuditLog.company_id.isnot(None),
    ).scalar() or 0

    top_endpoints = [
        {"path": path or "-", "count": count}
        for path, count in db.query(AuditLog.path, func.count(AuditLog.id))
        .filter(AuditLog.created_at >= last_24h)
        .group_by(AuditLog.path)
        .order_by(func.count(AuditLog.id).desc())
        .limit(5)
        .all()
    ]

    traffic_rows_7d = db.query(
        func.date(AuditLog.created_at).label("day"),
        func.count(AuditLog.id),
        func.count(func.distinct(AuditLog.actor_employee_id)),
        func.count(func.distinct(AuditLog.company_id)),
    ).filter(AuditLog.created_at >= last_7d).group_by(func.date(AuditLog.created_at)).all()
    traffic_by_day = {
        str(day): {
            "request_count": request_count or 0,
            "active_users": active_users or 0,
            "active_companies": active_companies or 0,
        }
        for day, request_count, active_users, active_companies in traffic_rows_7d
    }

    error_rows_7d = db.query(
        func.date(AuditLog.created_at).label("day"),
        func.count(AuditLog.id),
    ).filter(AuditLog.created_at >= last_7d, AuditLog.status_code >= 500).group_by(func.date(AuditLog.created_at)).all()
    errors_by_day = {str(day): count or 0 for day, count in error_rows_7d}

    external_alerts = _load_external_alerts()
    external_alerts_by_day: dict[str, list[dict]] = defaultdict(list)
    for alert in external_alerts:
        parsed = _parse_iso_datetime(alert.get("created_at"))
        if parsed and parsed >= last_7d:
            external_alerts_by_day[parsed.date().isoformat()].append(alert)

    customer_trend_7d = []
    critical_timeline_7d = []
    for day_label in day_labels:
        traffic = traffic_by_day.get(day_label, {})
        day_external_alerts = external_alerts_by_day.get(day_label, [])
        customer_trend_7d.append({
            "date": day_label,
            "request_count": traffic.get("request_count", 0),
            "active_users": traffic.get("active_users", 0),
            "active_companies": traffic.get("active_companies", 0),
        })
        critical_timeline_7d.append({
            "date": day_label,
            "critical_error_count": errors_by_day.get(day_label, 0),
            "external_alert_count": len(day_external_alerts),
            "alerts": day_external_alerts,
        })

    sqlite_db_path = _resolve_sqlite_db_path()
    db_size = _safe_file_size(sqlite_db_path) if sqlite_db_path else 0
    uploads_size = _safe_dir_size(UPLOADS_DIR)
    static_size = _safe_dir_size(STATIC_DIR)
    app_storage = db_size + uploads_size + static_size
    disk_total, disk_used, disk_free = shutil.disk_usage(BACKEND_ROOT)

    alerts: list[dict] = []
    if disk_free < 20 * 1024 * 1024 * 1024:
        alerts.append(_serialize_alert("SYSTEM", "warning", "Düşük boş alan", "Sunucu diskinde 20 GB altına düşen boş alan tespit edildi."))
    if expiring_trials > 0:
        alerts.append(_serialize_alert("SUBSCRIPTION", "info", "Deneme süresi yaklaşan şirketler", f"{expiring_trials} şirketin deneme süresi 7 gün içinde sona eriyor."))
    expired_companies = [row for row in company_rows if str(row["subscription_status"]).upper() in {"EXPIRED", "CANCELED", "PAST_DUE"}]
    if expired_companies:
        alerts.append(_serialize_alert("SUBSCRIPTION", "warning", "Riskli abonelik durumu", f"{len(expired_companies)} şirkette ödeme veya abonelik riski görünüyor."))

    alerts.extend(external_alerts)
    upgrade_candidates.sort(key=lambda item: (item["suggested_plan"] != "PRO", -item["active_employee_count"], -item["request_count_30d"]))
    payment_risk_companies.sort(key=lambda item: item["estimated_mrr_try"], reverse=True)
    downgrade_risk_companies.sort(key=lambda item: item["estimated_mrr_try"], reverse=True)
    company_rows.sort(key=lambda row: (-row["estimated_mrr_try"], row["name"].lower()))
    passive_companies = [row for row in company_rows if (not row["is_active"]) or row["subscription_status"] in {"PAST_DUE", "CANCELED"}]
    passive_call_list = [row for row in passive_companies if row.get("should_call_this_week")]

    return {
        "summary": {
            "total_companies": len(company_rows),
            "total_employees": sum(row["employee_count"] for row in company_rows),
            "active_employees": sum(row["active_employee_count"] for row in company_rows),
            "passive_companies": len(passive_companies),
            "basic_companies": plan_counter.get("BASIC", 0),
            "pro_companies": plan_counter.get("PRO", 0),
            "enterprise_companies": plan_counter.get("ENTERPRISE", 0),
            "estimated_monthly_revenue_try": sum(mrr_counter.values()),
            "basic_mrr_try": mrr_counter.get("BASIC", 0),
            "pro_mrr_try": mrr_counter.get("PRO", 0),
            "enterprise_mrr_try": mrr_counter.get("ENTERPRISE", 0),
            "upgrade_candidate_count": len(upgrade_candidates),
            "payment_risk_count": len(payment_risk_companies),
            "downgrade_risk_count": len(downgrade_risk_companies),
            "mrr_change_percent_30d": _calculate_change_percent(current_period_mrr, previous_period_mrr),
            "passive_call_count": len(passive_call_list),
        },
        "companies": company_rows,
        "upgrade_candidates": upgrade_candidates,
        "payment_risk_companies": payment_risk_companies,
        "downgrade_risk_companies": downgrade_risk_companies,
        "platform_usage": {
            "database_bytes": db_size,
            "uploads_bytes": uploads_size,
            "static_bytes": static_size,
            "app_storage_bytes": app_storage,
            "disk_total_bytes": disk_total,
            "disk_used_bytes": disk_used,
            "disk_free_bytes": disk_free,
        },
        "traffic": {
            "request_count_24h": request_count_24h,
            "request_count_7d": request_count_7d,
            "active_users_24h": unique_users_24h,
            "active_companies_24h": active_companies_24h,
            "top_endpoints_24h": top_endpoints,
            "customer_trend_7d": customer_trend_7d,
            "critical_timeline_7d": critical_timeline_7d,
        },
        "alerts": alerts,
        "notes": {
            "external_alert_feed": "Sistem dışı hosting veya cloud uyarıları için backend/ops_alerts.json dosyası kullanılabilir.",
            "traffic_definition": "Trafik verisi uygulamanın audit log hacmi üzerinden hesaplanır; dış sağlayıcı bant genişliği entegrasyonu ayrı bağlanmalıdır.",
        },
    }


@router.put("/company-notes/{company_id}")
def update_company_meta(
    company_id: int,
    payload: ExecutiveCompanyMetaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "executive.view_platform", request)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return {"message": _("company_not_found", request)}

    current_payload = _load_owner_company_meta()
    company_key = str(company_id)
    company_meta = current_payload.get(company_key, {})

    owner_note = (payload.owner_note or "").strip()
    owner_tag = (payload.owner_tag or "").strip().upper()
    last_contact_at = (payload.last_contact_at or "").strip() or None
    next_follow_up_at = (payload.next_follow_up_at or "").strip() or None
    last_contact_result = (payload.last_contact_result or "").strip()

    company_meta["owner_note"] = owner_note[:1000]
    company_meta["owner_tag"] = owner_tag[:64]
    company_meta["last_contact_at"] = last_contact_at
    company_meta["next_follow_up_at"] = next_follow_up_at
    company_meta["last_contact_result"] = last_contact_result[:300]
    current_payload[company_key] = company_meta
    _save_owner_company_meta(current_payload)

    return {
        "message": "Şirket takip notu kaydedildi.",
        "company_id": company_id,
        "owner_note": company_meta["owner_note"],
        "owner_tag": company_meta["owner_tag"],
        "last_contact_at": company_meta["last_contact_at"],
        "next_follow_up_at": company_meta["next_follow_up_at"],
        "last_contact_result": company_meta["last_contact_result"],
    }
