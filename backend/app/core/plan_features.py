from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.models.company import Company


PLAN_BASIC = "BASIC"
PLAN_PRO = "PRO"
PLAN_ENTERPRISE = "ENTERPRISE"

PLAN_FEATURE_MATRIX = {
    PLAN_BASIC: {
        "core.dashboard",
        "core.portal",
        "core.people",
        "core.dossier",
        "core.attendance",
        "core.leave",
        "core.assets",
        "core.org_chart",
        "core.helpdesk",
        "core.billing",
        "core.settings",
        "core.executive",
    },
    PLAN_PRO: {
        "ops.ats",
        "ops.expenses",
        "ops.purchase_requests",
        "ops.generic_requests",
        "ops.knowledge",
        "ops.kpi",
        "ops.lifecycle",
        "ops.locations",
    },
    PLAN_ENTERPRISE: {
        "enterprise.performance",
        "enterprise.training",
    },
}


def normalize_plan_code(plan_code: str | None) -> str:
    normalized = str(plan_code or PLAN_PRO).strip().upper()
    if normalized not in {PLAN_BASIC, PLAN_PRO, PLAN_ENTERPRISE}:
        return PLAN_PRO
    return normalized


def get_plan_features(plan_code: str | None) -> set[str]:
    normalized = normalize_plan_code(plan_code)
    features: set[str] = set(PLAN_FEATURE_MATRIX[PLAN_BASIC])
    if normalized in {PLAN_PRO, PLAN_ENTERPRISE}:
        features.update(PLAN_FEATURE_MATRIX[PLAN_PRO])
    if normalized == PLAN_ENTERPRISE:
        features.update(PLAN_FEATURE_MATRIX[PLAN_ENTERPRISE])
    return features


def has_plan_feature(plan_code: str | None, feature: str | None) -> bool:
    if not feature:
        return True
    return feature in get_plan_features(plan_code)


def get_company_plan_code(db: Session, company_id: int | None) -> str:
    if not company_id:
        return PLAN_PRO
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return PLAN_PRO
    return normalize_plan_code(getattr(company, "plan_code", None))


def ensure_plan_feature(current_user: dict, feature: str, request: Request, db: Session) -> dict:
    plan_code = current_user.get("company_plan") or get_company_plan_code(db, current_user.get("company_id"))
    if not has_plan_feature(plan_code, feature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_("unauthorized", request),
        )
    return current_user


class PlanFeatureChecker:
    def __init__(self, feature: str):
        self.feature = feature

    def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user),
    ):
        return ensure_plan_feature(current_user, self.feature, request, db)


def plan_feature_required(feature: str):
    checker = PlanFeatureChecker(feature)

    def feature_checker(
        request: Request,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user),
    ):
        return checker(request, db, current_user)

    return feature_checker
