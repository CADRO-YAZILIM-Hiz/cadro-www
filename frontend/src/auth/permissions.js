const PLAN_BASIC = 'BASIC';
const PLAN_PRO = 'PRO';
const PLAN_ENTERPRISE = 'ENTERPRISE';

const ROLE_PERMISSIONS = {
  OWNER: [
    'executive.view_platform',
    'audit.view_tenant',
    'account.manage_self',
  ],
  EMPLOYEE: [
    'portal.view_workspace',
    'attendance.view_workspace',
    'leaves.view_workspace',
    'leave.create_own',
    'expenses.view_workspace',
    'expenses.view_self_only',
    'expense.create_own',
    'purchase_requests.view_workspace',
    'purchase_requests.create_own',
    'knowledge.view_workspace',
    'performance.view_workspace',
    'training.view_workspace',
    'assets.view_workspace',
    'org_chart.view_workspace',
    'helpdesk.view_workspace',
    'helpdesk.create_own',
    'dossier.view_workspace',
    'dossier.view_own',
    'dossier.upload_own',
  ],
  MANAGER: [
    'portal.view_workspace',
    'employees.view_workspace',
    'attendance.view_workspace',
    'attendance.export_company',
    'leaves.view_workspace',
    'leave.manage_company',
    'expenses.view_workspace',
    'expense.manage_company',
    'expense.export_company',
    'purchase_requests.view_workspace',
    'purchase_requests.create_own',
    'generic_requests.view_workspace',
    'generic_requests.process_company',
    'knowledge.view_workspace',
    'performance.view_workspace',
    'training.view_workspace',
    'assets.view_workspace',
    'org_chart.view_workspace',
    'helpdesk.view_workspace',
    'helpdesk.create_own',
    'helpdesk.process_team',
    'kpi.view_company',
  ],
  HR: [
    'portal.view_workspace',
    'dashboard.view_company',
    'employees.view_workspace',
    'ats.view_workspace',
    'attendance.view_workspace',
    'attendance.export_company',
    'leaves.view_workspace',
    'leave.manage_company',
    'expenses.view_workspace',
    'expense.manage_company',
    'expense.export_company',
    'purchase_requests.view_workspace',
    'purchase_requests.create_own',
    'generic_requests.view_workspace',
    'generic_requests.process_company',
    'knowledge.view_workspace',
    'knowledge.manage_company',
    'kpi.view_company',
    'kpi.manage_company',
    'performance.view_workspace',
    'training.view_workspace',
    'assets.view_workspace',
    'org_chart.view_workspace',
    'helpdesk.view_workspace',
    'helpdesk.create_own',
    'helpdesk.process_company',
    'locations.manage_company',
    'dossier.view_workspace',
    'dossier.view_company',
    'dossier.manage_company',
    'lifecycle.manage_company',
  ],
  ADMIN: [
    'portal.view_workspace',
    'dashboard.view_company',
    'employees.view_workspace',
    'ats.view_workspace',
    'attendance.view_workspace',
    'attendance.export_company',
    'leaves.view_workspace',
    'leave.manage_company',
    'expenses.view_workspace',
    'expense.manage_company',
    'expense.export_company',
    'purchase_requests.view_workspace',
    'purchase_requests.create_own',
    'purchase_requests.manage_company',
    'purchase_requests.convert_company',
    'generic_requests.view_workspace',
    'generic_requests.process_company',
    'knowledge.view_workspace',
    'knowledge.manage_company',
    'kpi.view_company',
    'kpi.manage_company',
    'performance.view_workspace',
    'training.view_workspace',
    'assets.view_workspace',
    'org_chart.view_workspace',
    'helpdesk.view_workspace',
    'helpdesk.create_own',
    'helpdesk.process_company',
    'locations.manage_company',
    'dossier.view_workspace',
    'dossier.view_company',
    'dossier.manage_company',
    'lifecycle.manage_company',
    'company.settings.manage',
    'support.contact_vendor',
  ],
  SUPERADMIN: [
    'portal.view_workspace',
    'dashboard.view_company',
    'employees.view_workspace',
    'ats.view_workspace',
    'attendance.view_workspace',
    'attendance.export_company',
    'leaves.view_workspace',
    'leave.manage_company',
    'expenses.view_workspace',
    'expense.manage_company',
    'expense.export_company',
    'purchase_requests.view_workspace',
    'purchase_requests.create_own',
    'purchase_requests.manage_company',
    'purchase_requests.convert_company',
    'generic_requests.view_workspace',
    'generic_requests.process_company',
    'knowledge.view_workspace',
    'knowledge.manage_company',
    'kpi.view_company',
    'kpi.manage_company',
    'performance.view_workspace',
    'training.view_workspace',
    'assets.view_workspace',
    'org_chart.view_workspace',
    'helpdesk.view_workspace',
    'helpdesk.create_own',
    'helpdesk.process_company',
    'locations.manage_company',
    'dossier.view_workspace',
    'dossier.view_company',
    'dossier.manage_company',
    'lifecycle.manage_company',
    'company.settings.manage',
    'billing.manage_company',
    'audit.view_tenant',
    'support.contact_vendor',
  ],
};

const PLAN_FEATURE_MATRIX = {
  [PLAN_BASIC]: [
    'core.dashboard',
    'core.portal',
    'core.people',
    'core.dossier',
    'core.attendance',
    'core.leave',
    'core.assets',
    'core.org_chart',
    'core.helpdesk',
    'core.support_center',
    'core.billing',
    'core.settings',
    'core.executive',
  ],
  [PLAN_PRO]: [
    'ops.ats',
    'ops.expenses',
    'ops.purchase_requests',
    'ops.generic_requests',
    'ops.knowledge',
    'ops.kpi',
    'ops.lifecycle',
    'ops.locations',
  ],
  [PLAN_ENTERPRISE]: [
    'enterprise.performance',
    'enterprise.training',
  ],
};

export const ROUTE_PERMISSION_MAP = {
  '/dashboard': 'dashboard.view_company',
  '/portal': 'portal.view_workspace',
  '/employees': 'employees.view_workspace',
  '/ats': 'ats.view_workspace',
  '/e-dossier': 'dossier.view_workspace',
  '/locations': 'locations.manage_company',
  '/settings': 'company.settings.manage',
  '/billing': 'billing.manage_company',
  '/onboarding': 'lifecycle.manage_company',
  '/attendance': 'attendance.view_workspace',
  '/leaves': 'leaves.view_workspace',
  '/expenses': 'expenses.view_workspace',
  '/purchase-requests': 'purchase_requests.view_workspace',
  '/request-forms': 'generic_requests.view_workspace',
  '/knowledge-base': 'knowledge.view_workspace',
  '/kpi-statistics': 'kpi.view_company',
  '/my-expenses': 'expenses.view_self_only',
  '/performance': 'performance.view_workspace',
  '/training': 'training.view_workspace',
  '/assets': 'assets.view_workspace',
  '/org-chart': 'org_chart.view_workspace',
  '/helpdesk': 'helpdesk.view_workspace',
  '/executive-console': 'executive.view_platform',
  '/executive-console/overview': 'executive.view_platform',
  '/executive-console/revenue': 'executive.view_platform',
  '/executive-console/companies': 'executive.view_platform',
  '/executive-console/risks': 'executive.view_platform',
  '/executive-console/messages': 'executive.view_platform',
  '/account-security': 'account.manage_self',
  '/support-center': 'support.contact_vendor',
};

export const ROUTE_FEATURE_MAP = {
  '/dashboard': 'core.dashboard',
  '/portal': 'core.portal',
  '/employees': 'core.people',
  '/ats': 'ops.ats',
  '/e-dossier': 'core.dossier',
  '/locations': 'ops.locations',
  '/settings': 'core.settings',
  '/billing': 'core.billing',
  '/onboarding': 'ops.lifecycle',
  '/attendance': 'core.attendance',
  '/leaves': 'core.leave',
  '/expenses': 'ops.expenses',
  '/purchase-requests': 'ops.purchase_requests',
  '/request-forms': 'ops.generic_requests',
  '/knowledge-base': 'ops.knowledge',
  '/kpi-statistics': 'ops.kpi',
  '/my-expenses': 'ops.expenses',
  '/performance': 'enterprise.performance',
  '/training': 'enterprise.training',
  '/assets': 'core.assets',
  '/org-chart': 'core.org_chart',
  '/helpdesk': 'core.helpdesk',
  '/executive-console': 'core.executive',
  '/executive-console/overview': 'core.executive',
  '/executive-console/revenue': 'core.executive',
  '/executive-console/companies': 'core.executive',
  '/executive-console/risks': 'core.executive',
  '/executive-console/messages': 'core.executive',
  '/account-security': 'core.executive',
  '/support-center': 'core.support_center',
};

export const normalizeRole = (role) => (role || 'EMPLOYEE').toUpperCase();

export const normalizePlanCode = (planCode) => {
  const normalized = (planCode || PLAN_PRO).toUpperCase();
  if (![PLAN_BASIC, PLAN_PRO, PLAN_ENTERPRISE].includes(normalized)) {
    return PLAN_PRO;
  }
  return normalized;
};

export const getStoredPlanCode = () => normalizePlanCode(localStorage.getItem('company_plan'));

export const getPermissionsForRole = (role) => ROLE_PERMISSIONS[normalizeRole(role)] || [];

export const getPlanFeatures = (planCode) => {
  const normalized = normalizePlanCode(planCode);
  const features = new Set(PLAN_FEATURE_MATRIX[PLAN_BASIC]);
  if (normalized === PLAN_PRO || normalized === PLAN_ENTERPRISE) {
    PLAN_FEATURE_MATRIX[PLAN_PRO].forEach((feature) => features.add(feature));
  }
  if (normalized === PLAN_ENTERPRISE) {
    PLAN_FEATURE_MATRIX[PLAN_ENTERPRISE].forEach((feature) => features.add(feature));
  }
  return [...features];
};

export const hasPermission = (role, permission) => {
  if (!permission) {
    return true;
  }
  return getPermissionsForRole(role).includes(permission);
};

export const hasAnyPermission = (role, permissions = []) => {
  if (!permissions?.length) {
    return true;
  }
  return permissions.some((permission) => hasPermission(role, permission));
};

export const hasPlanFeature = (planCode, feature) => {
  if (!feature) {
    return true;
  }
  return getPlanFeatures(planCode).includes(feature);
};

export const canAccessPath = (role, path, planCode = getStoredPlanCode()) => {
  const permission = ROUTE_PERMISSION_MAP[path];
  if (!permission) {
    return false;
  }
  if (!hasPermission(role, permission)) {
    return false;
  }
  return hasPlanFeature(planCode, ROUTE_FEATURE_MAP[path]);
};

export const getDefaultAuthorizedRoute = (role, planCode = getStoredPlanCode()) => {
  const candidates = ['/executive-console/overview', '/account-security', '/dashboard', '/portal', '/employees', '/attendance', '/helpdesk'];
  const matched = candidates.find((path) => canAccessPath(role, path, planCode));
  return matched || '/login';
};
