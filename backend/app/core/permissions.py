from fastapi import Depends, HTTPException, Request, status

from app.core.dependencies import get_current_user
from app.core.i18n import _


ROLE_PERMISSION_MATRIX = {
    "OWNER": {
        "executive.view_platform",
        "audit.view_tenant",
        "account.manage_self",
    },
    "EMPLOYEE": {
        "portal.view_workspace",
        "attendance.view_workspace",
        "leaves.view_workspace",
        "leave.create_own",
        "expenses.view_workspace",
        "expenses.view_self_only",
        "expense.create_own",
        "purchase_requests.view_workspace",
        "purchase_requests.create_own",
        "knowledge.view_workspace",
        "performance.view_workspace",
        "training.view_workspace",
        "assets.view_workspace",
        "org_chart.view_workspace",
        "helpdesk.view_workspace",
        "helpdesk.create_own",
        "dossier.view_workspace",
        "dossier.view_own",
        "dossier.upload_own",
    },
    "MANAGER": {
        "portal.view_workspace",
        "employees.view_workspace",
        "attendance.view_workspace",
        "attendance.export_company",
        "leaves.view_workspace",
        "leave.manage_company",
        "expenses.view_workspace",
        "expense.manage_company",
        "expense.export_company",
        "purchase_requests.view_workspace",
        "purchase_requests.create_own",
        "generic_requests.view_workspace",
        "generic_requests.process_company",
        "knowledge.view_workspace",
        "performance.view_workspace",
        "training.view_workspace",
        "assets.view_workspace",
        "org_chart.view_workspace",
        "helpdesk.view_workspace",
        "helpdesk.create_own",
        "helpdesk.process_team",
        "kpi.view_company",
    },
    "HR": {
        "dashboard.view_company",
        "employees.view_workspace",
        "ats.view_workspace",
        "attendance.view_workspace",
        "attendance.export_company",
        "leaves.view_workspace",
        "leave.manage_company",
        "expenses.view_workspace",
        "expense.manage_company",
        "expense.export_company",
        "purchase_requests.view_workspace",
        "purchase_requests.create_own",
        "generic_requests.view_workspace",
        "generic_requests.process_company",
        "knowledge.view_workspace",
        "knowledge.manage_company",
        "kpi.view_company",
        "kpi.manage_company",
        "performance.view_workspace",
        "training.view_workspace",
        "assets.view_workspace",
        "org_chart.view_workspace",
        "helpdesk.view_workspace",
        "helpdesk.create_own",
        "helpdesk.process_company",
        "locations.manage_company",
        "dossier.view_workspace",
        "dossier.view_company",
        "dossier.manage_company",
        "lifecycle.manage_company",
    },
    "ADMIN": {
        "dashboard.view_company",
        "employees.view_workspace",
        "ats.view_workspace",
        "attendance.view_workspace",
        "attendance.export_company",
        "leaves.view_workspace",
        "leave.manage_company",
        "expenses.view_workspace",
        "expense.manage_company",
        "expense.export_company",
        "purchase_requests.view_workspace",
        "purchase_requests.create_own",
        "purchase_requests.manage_company",
        "purchase_requests.convert_company",
        "generic_requests.view_workspace",
        "generic_requests.process_company",
        "knowledge.view_workspace",
        "knowledge.manage_company",
        "kpi.view_company",
        "kpi.manage_company",
        "performance.view_workspace",
        "training.view_workspace",
        "assets.view_workspace",
        "org_chart.view_workspace",
        "helpdesk.view_workspace",
        "helpdesk.create_own",
        "helpdesk.process_company",
        "locations.manage_company",
        "dossier.view_workspace",
        "dossier.view_company",
        "dossier.manage_company",
        "lifecycle.manage_company",
        "company.settings.manage",
    },
    "SUPERADMIN": {
        "dashboard.view_company",
        "employees.view_workspace",
        "ats.view_workspace",
        "attendance.view_workspace",
        "attendance.export_company",
        "leaves.view_workspace",
        "leave.manage_company",
        "expenses.view_workspace",
        "expense.manage_company",
        "expense.export_company",
        "purchase_requests.view_workspace",
        "purchase_requests.create_own",
        "purchase_requests.manage_company",
        "purchase_requests.convert_company",
        "generic_requests.view_workspace",
        "generic_requests.process_company",
        "knowledge.view_workspace",
        "knowledge.manage_company",
        "kpi.view_company",
        "kpi.manage_company",
        "performance.view_workspace",
        "training.view_workspace",
        "assets.view_workspace",
        "org_chart.view_workspace",
        "helpdesk.view_workspace",
        "helpdesk.create_own",
        "helpdesk.process_company",
        "locations.manage_company",
        "dossier.view_workspace",
        "dossier.view_company",
        "dossier.manage_company",
        "lifecycle.manage_company",
        "company.settings.manage",
        "billing.manage_company",
        "audit.view_tenant",
    },
}


def normalize_role(role: str | None) -> str:
    return str(role or "EMPLOYEE").upper()


def get_permissions(subject) -> set[str]:
    if isinstance(subject, dict):
        role = normalize_role(subject.get("role"))
    else:
        role = normalize_role(subject)
    return set(ROLE_PERMISSION_MATRIX.get(role, set()))


def has_permission(subject, permission: str | None) -> bool:
    if not permission:
        return True
    return permission in get_permissions(subject)


def ensure_permission(current_user: dict, permission: str, request: Request) -> dict:
    if not has_permission(current_user, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_("unauthorized", request),
        )
    return current_user


class PermissionChecker:
    def __init__(self, permission: str):
        self.permission = permission

    def __call__(self, request: Request, current_user: dict = Depends(get_current_user)):
        return ensure_permission(current_user, self.permission, request)


def permission_required(permission: str):
    checker = PermissionChecker(permission)

    def permission_checker(request: Request, current_user: dict = Depends(get_current_user)):
        return checker(request, current_user)

    return permission_checker
