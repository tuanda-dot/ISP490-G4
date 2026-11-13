import type { Role } from '../types';

export const normalizeRoleName = (rawRole?: string): Role => {
  const r = (rawRole || '').replace(/^ROLE_/, '').trim();
  if (r === 'ADMIN' || r === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (r === 'DIRECTOR' || r === 'CEO' || r === 'SUPERVISOR') return 'DIRECTOR';
  if (r === 'CHIEF_ACCOUNTANT') return 'CHIEF_ACCOUNTANT';
  if (r === 'PAYROLL_ACCOUNTANT' || r === 'ACCOUNTANT') return 'ACCOUNTANT';
  if (r === 'HR_MANAGER') return 'HR_MANAGER';
  if (r === 'HR_OFFICER' || r === 'HR_STAFF') return 'HR_STAFF';
  if (r === 'SITE_MANAGER') return 'SITE_MANAGER';
  if (r === 'SITE_ENGINEER') return 'SITE_ENGINEER';
  if (r === 'OFFICE_STAFF') return 'OFFICE_STAFF';
  return (r as Role) || 'OFFICE_STAFF';
};

export const ROUTE_ALLOWED_ROLES: Record<string, Role[]> = {
  '/site-management': ['SITE_MANAGER', 'SYSTEM_ADMIN', 'ADMIN', 'DIRECTOR', 'CEO'],
  '/engineer-portal': ['SITE_ENGINEER', 'SITE_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'],
  '/employees': ['HR_STAFF', 'HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN', 'DIRECTOR', 'CEO'],
  '/projects': ['SITE_MANAGER', 'HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/compliance': ['HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/salary-scales': ['HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/project-allowances': ['HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/salary-formula': ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'HR_MANAGER', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/payroll-tickets': ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'HR_MANAGER', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/cost-allocation': ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/accounting-vouchers': ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
  '/requests': ['HR_MANAGER', 'HR_STAFF', 'SITE_MANAGER', 'SITE_ENGINEER', 'OFFICE_STAFF', 'ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'],
};

export const getDefaultRouteForRole = (role?: Role | string): string => {
  const normalized = normalizeRoleName(role);
  switch (normalized) {
    case 'SITE_MANAGER':
      return '/site-management';
    case 'SITE_ENGINEER':
      return '/engineer-portal';
    case 'HR_STAFF':
    case 'HR_MANAGER':
      return '/employees';
    case 'CHIEF_ACCOUNTANT':
    case 'ACCOUNTANT':
      return '/payroll';
    case 'OFFICE_STAFF':
    case 'DIRECTOR':
    case 'SYSTEM_ADMIN':
    default:
      return '/';
  }
};

export const canRoleAccessPath = (role: Role | string | undefined, pathname: string): boolean => {
  const normalized = normalizeRoleName(role);
  if (!normalized) return false;
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/') {
    return !['SITE_MANAGER', 'SITE_ENGINEER'].includes(normalized);
  }
  if (['/face-checkin', '/check-in', '/timesheet', '/payroll'].includes(cleanPath)) {
    return true;
  }
  const allowed = ROUTE_ALLOWED_ROLES[cleanPath];
  if (allowed) {
    return allowed.includes(normalized);
  }
  return false;
};

