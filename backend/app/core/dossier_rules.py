from __future__ import annotations

import json
from datetime import date


TR_ALIASES = {"TR", "TURKEY", "TURKIYE", "TÜRKİYE", "TC", "T.C.", "TURK"}
KKTC_ALIASES = {
    "KKTC",
    "TRNC",
    "NORTHERN CYPRUS",
    "NORTH CYPRUS",
    "KUZEY KIBRIS",
    "K.K.T.C.",
}
EU_ALIASES = {
    "EU",
    "EUROPE",
    "GERMANY",
    "DE",
    "DEUTSCHLAND",
    "FRANCE",
    "ITALY",
    "SPAIN",
    "NETHERLANDS",
    "BELGIUM",
    "AUSTRIA",
    "SWEDEN",
    "FINLAND",
    "DENMARK",
    "POLAND",
    "ROMANIA",
    "BULGARIA",
    "PORTUGAL",
    "GREECE",
    "IRELAND",
    "CROATIA",
    "SLOVENIA",
    "SLOVAKIA",
    "CZECHIA",
    "HUNGARY",
    "LUXEMBOURG",
    "MALTA",
    "CYPRUS",
}
MENA_ALIASES = {
    "MENA",
    "MIDDLE EAST",
    "MIDDLE EAST & NORTH AFRICA",
    "UAE",
    "DUBAI",
    "ABU DHABI",
    "SAUDI",
    "SAUDI ARABIA",
    "QATAR",
    "KUWAIT",
    "OMAN",
    "BAHRAIN",
    "EGYPT",
    "JORDAN",
    "LEBANON",
    "MOROCCO",
    "TUNISIA",
    "ALGERIA",
}

LEADERSHIP_ROLES = {"MANAGER", "HR", "ADMIN", "SUPERADMIN"}


def _normalize_text(value: str | None) -> str:
    return (value or "").strip().upper()


def _json_list(raw_value) -> list[str]:
    if not raw_value:
        return []
    if isinstance(raw_value, list):
        return [_normalize_text(item) for item in raw_value if _normalize_text(item)]
    try:
        loaded = json.loads(raw_value)
        if isinstance(loaded, list):
            return [_normalize_text(item) for item in loaded if _normalize_text(item)]
    except Exception:
        return []
    return []


def resolve_country_profile(nationality: str | None) -> str:
    normalized = _normalize_text(nationality)
    if normalized in TR_ALIASES:
        return "TR"
    if normalized in KKTC_ALIASES:
        return "KKTC"
    if normalized in EU_ALIASES:
        return "EU"
    if normalized in MENA_ALIASES:
        return "MENA"
    return "GLOBAL"


def _days_until(value) -> int | None:
    if not value:
        return None
    today = date.today()
    return (value - today).days


def _is_foreign_worker(employee, country_profile: str) -> bool:
    return country_profile not in {"TR", "KKTC"} or any(
        [
            employee.work_authorization_type,
            employee.work_authorization_no,
            employee.work_authorization_expiry_date,
            employee.visa_type,
            employee.visa_expiry_date,
        ]
    )


def get_required_document_rules(employee, company=None) -> dict:
    country_profile = resolve_country_profile(getattr(employee, "nationality", None))
    role_profile = _normalize_text(getattr(employee, "role", None) or "EMPLOYEE")
    employee_status = _normalize_text(getattr(employee, "status", None) or "ACTIVE")
    is_foreign_worker = _is_foreign_worker(employee, country_profile)
    has_exit_flow = bool(getattr(employee, "exit_date", None)) or employee_status != "ACTIVE"
    is_new_starter = False
    if getattr(employee, "hire_date", None):
        is_new_starter = (date.today() - employee.hire_date).days <= 180

    default_sets = {
        "GLOBAL": ["KIMLIK", "SOZLESME", "BANKA_BILGISI", "SOSYAL_GUVENLIK_KAYDI", "HANDBOOK_ACK", "ISG_EGITIM"],
        "TR": ["KIMLIK", "SOZLESME", "BANKA_BILGISI", "VERGI_BELGESI", "SOSYAL_GUVENLIK_KAYDI", "HANDBOOK_ACK", "ISG_EGITIM"],
        "KKTC": ["KIMLIK", "SOZLESME", "BANKA_BILGISI", "VERGI_BELGESI", "SOSYAL_GUVENLIK_KAYDI", "HANDBOOK_ACK", "ISG_EGITIM"],
        "EU": ["KIMLIK", "SOZLESME", "BANKA_BILGISI", "SOSYAL_GUVENLIK_KAYDI", "HANDBOOK_ACK", "ISG_EGITIM"],
        "MENA": ["KIMLIK", "SOZLESME", "BANKA_BILGISI", "VERGI_BELGESI", "SOSYAL_GUVENLIK_KAYDI", "HANDBOOK_ACK", "ISG_EGITIM"],
    }
    profile_field_map = {
        "GLOBAL": "dossier_required_global",
        "TR": "dossier_required_tr",
        "KKTC": "dossier_required_kktc",
        "EU": "dossier_required_eu",
        "MENA": "dossier_required_mena",
    }
    reason_map = {
        "KIMLIK": "identity_core",
        "SOZLESME": "employment_contract",
        "BANKA_BILGISI": "payroll_setup",
        "SOSYAL_GUVENLIK_KAYDI": "social_security",
        "HANDBOOK_ACK": "policy_acknowledgement",
        "ISG_EGITIM": "occupational_health",
        "VERGI_BELGESI": "tax_profile",
        "NDA": "leadership_confidentiality",
        "BACKGROUND_CHECK": "leadership_screening",
        "ONBOARDING_CHECKLIST": "new_starter_completeness",
        "CALISMA_IZNI": "foreign_worker_authorization",
        "VIZE": "foreign_worker_visa",
        "IKAMET_BELGESI": "foreign_worker_residency",
        "ISTEN_CIKIS": "offboarding_termination",
        "EXIT_INTERVIEW": "offboarding_exit_interview",
        "OFFBOARDING_CHECKLIST": "offboarding_checklist",
    }

    rules: list[dict] = []

    raw_profile_docs = getattr(company, profile_field_map[country_profile], None) if company else None
    profile_documents = _json_list(raw_profile_docs) if raw_profile_docs is not None else default_sets[country_profile]

    for document_type in profile_documents:
        rules.append(
            {
                "document_type": document_type,
                "reason_code": reason_map.get(document_type, "company_required"),
                "country_profile": country_profile,
                "role_profile": role_profile,
            }
        )

    raw_leadership_docs = getattr(company, "dossier_required_leadership", None) if company else None
    leadership_documents = _json_list(raw_leadership_docs) if raw_leadership_docs is not None else []
    if raw_leadership_docs is None and role_profile in LEADERSHIP_ROLES:
        leadership_documents = ["NDA", "BACKGROUND_CHECK"]

    conditional_documents: list[tuple[str, str, bool]] = [
        ("ONBOARDING_CHECKLIST", "new_starter_completeness", is_new_starter and employee_status == "ACTIVE"),
        ("CALISMA_IZNI", "foreign_worker_authorization", is_foreign_worker),
        ("VIZE", "foreign_worker_visa", is_foreign_worker),
        ("IKAMET_BELGESI", "foreign_worker_residency", is_foreign_worker and country_profile in {"EU", "MENA", "GLOBAL"}),
        ("ISTEN_CIKIS", "offboarding_termination", has_exit_flow),
        ("EXIT_INTERVIEW", "offboarding_exit_interview", has_exit_flow),
        ("OFFBOARDING_CHECKLIST", "offboarding_checklist", has_exit_flow),
    ]

    if role_profile in LEADERSHIP_ROLES:
        conditional_documents.extend(
            [(document_type, reason_map.get(document_type, "leadership_required"), True) for document_type in leadership_documents]
        )

    seen_types = {rule["document_type"] for rule in rules}
    for document_type, reason_code, applies in conditional_documents:
        if not applies or document_type in seen_types:
            continue
        rules.append(
            {
                "document_type": document_type,
                "reason_code": reason_code,
                "country_profile": country_profile,
                "role_profile": role_profile,
            }
        )
        seen_types.add(document_type)

    return {
        "country_profile": country_profile,
        "role_profile": role_profile,
        "is_foreign_worker": is_foreign_worker,
        "rules": rules,
    }


def build_dossier_compliance_summary(employee, documents, company=None) -> dict:
    rule_bundle = get_required_document_rules(employee, company)
    active_documents = [doc for doc in documents if _normalize_text(getattr(doc, "status", None)) != "REJECTED"]

    documents_by_type: dict[str, list] = {}
    for document in active_documents:
        documents_by_type.setdefault(_normalize_text(document.document_type), []).append(document)

    expired_documents = []
    expiring_documents = []
    for document in active_documents:
        days_until = _days_until(getattr(document, "expiry_date", None))
        if days_until is None:
            continue
        item = {
            "id": document.id,
            "document_type": _normalize_text(document.document_type),
            "file_name": document.file_name,
            "expiry_date": document.expiry_date.isoformat() if document.expiry_date else None,
            "days_until": days_until,
        }
        if days_until < 0:
            expired_documents.append(item)
        elif days_until <= 30:
            expiring_documents.append(item)

    required_documents = []
    for rule in rule_bundle["rules"]:
        doc_type = rule["document_type"]
        docs_for_type = documents_by_type.get(doc_type, [])
        valid_docs = []
        expired_docs = []
        expiring_valid_docs = []

        for document in docs_for_type:
            days_until = _days_until(getattr(document, "expiry_date", None))
            if days_until is None or days_until >= 0:
                valid_docs.append(document)
                if days_until is not None and days_until <= 30:
                    expiring_valid_docs.append(document)
            else:
                expired_docs.append(document)

        chosen_document = None
        status = "MISSING"
        if valid_docs:
            valid_docs.sort(
                key=lambda item: (
                    item.expiry_date is None,
                    item.expiry_date or date.max,
                    item.upload_date or date.min,
                ),
                reverse=True,
            )
            chosen_document = valid_docs[0]
            status = "EXPIRING" if expiring_valid_docs else "READY"
        elif expired_docs:
            expired_docs.sort(
                key=lambda item: (
                    item.expiry_date or date.min,
                    item.upload_date or date.min,
                ),
                reverse=True,
            )
            chosen_document = expired_docs[0]
            status = "EXPIRED"

        required_documents.append(
            {
                **rule,
                "status": status,
                "matched_document_id": getattr(chosen_document, "id", None),
                "matched_expiry_date": chosen_document.expiry_date.isoformat() if getattr(chosen_document, "expiry_date", None) else None,
            }
        )

    missing_required_documents = [item for item in required_documents if item["status"] == "MISSING"]
    expired_required_documents = [item for item in required_documents if item["status"] == "EXPIRED"]
    expiring_required_documents = [item for item in required_documents if item["status"] == "EXPIRING"]
    completion_total = len(required_documents)
    completion_ready = len([item for item in required_documents if item["status"] in {"READY", "EXPIRING"}])
    completion_percent = round((completion_ready / completion_total) * 100) if completion_total else 100

    return {
        "profile": {
            "country_profile": rule_bundle["country_profile"],
            "role_profile": rule_bundle["role_profile"],
            "is_foreign_worker": rule_bundle["is_foreign_worker"],
            "employee_status": _normalize_text(getattr(employee, "status", None) or "ACTIVE"),
        },
        "summary": {
            "completion_total": completion_total,
            "completion_ready": completion_ready,
            "completion_percent": completion_percent,
            "missing_required_count": len(missing_required_documents),
            "expired_required_count": len(expired_required_documents),
            "expiring_required_count": len(expiring_required_documents),
            "expired_documents_count": len(expired_documents),
            "expiring_documents_count": len(expiring_documents),
            "alert_count": len(missing_required_documents) + len(expired_documents) + len(expiring_documents),
        },
        "required_documents": required_documents,
        "missing_required_documents": missing_required_documents,
        "expired_required_documents": expired_required_documents,
        "expiring_required_documents": expiring_required_documents,
        "expired_documents": expired_documents,
        "expiring_documents": expiring_documents,
    }


def get_dossier_alert_roles(company) -> list[str]:
    configured_roles = _json_list(getattr(company, "dossier_alert_roles", None)) if company else []
    return configured_roles or ["MANAGER", "HR", "ADMIN", "SUPERADMIN"]
