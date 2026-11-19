import type { Employee } from '../types';

export const REGIONAL_MIN_WAGE_VUNG_1 = 5_310_000;

export const FIXED_BASE_SALARY_RULES = {
  OFFICE_STAFF: 18_000_000,
  SITE_ENGINEER: 18_000_000,
  HR_STAFF: 22_000_000,
  ACCOUNTANT: 22_000_000,
  SITE_CHIEF_ENGINEER: 25_000_000,
} as const;

export interface FixedBaseSalaryRule {
  tierKey: keyof typeof FIXED_BASE_SALARY_RULES;
  roleLabel: string;
  fixedSalary: number;
}

const formatVNDPlain = (amount: number): string =>
  new Intl.NumberFormat('vi-VN').format(Math.round(amount));

export function normalizeRoleUpper(rawRole?: string): string {
  return String(rawRole || '')
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '');
}

export function isSiteChiefEngineerRoleOrPosition(role?: string, position?: string): boolean {
  const r = normalizeRoleUpper(role);
  const p = String(position || '').trim().toLowerCase();
  return (
    r === 'SITE_MANAGER' ||
    p.includes('chỉ huy trưởng') ||
    p.includes('chi huy truong') ||
    p.includes('kỹ sư trưởng') ||
    p.includes('ky su truong')
  );
}

export function isDepartmentHeadOrExecutive(
  role?: string,
  position?: string,
  isDepartmentHead?: boolean
): boolean {
  if (isSiteChiefEngineerRoleOrPosition(role, position)) {
    return false;
  }
  if (isDepartmentHead) return true;
  const r = normalizeRoleUpper(role);
  if (['DIRECTOR', 'CEO', 'HR_MANAGER', 'CHIEF_ACCOUNTANT', 'ADMIN', 'SYSTEM_ADMIN'].includes(r)) {
    return true;
  }
  const p = String(position || '').trim().toLowerCase();
  return (
    p.includes('trưởng phòng') ||
    p.includes('truong phong') ||
    p.includes('kế toán trưởng') ||
    p.includes('ke toan truong') ||
    p.includes('tổng giám đốc') ||
    p.includes('giám đốc') ||
    p.includes('quản trị hệ thống') ||
    p.includes('quản trị viên')
  );
}

export function resolveFixedBaseSalaryPolicy(
  input?: Partial<Pick<Employee, 'role' | 'position' | 'employeeType' | 'isDepartmentHead'>> | null
): FixedBaseSalaryRule | null {
  if (!input) return null;
  const r = normalizeRoleUpper(input.role);
  const p = String(input.position || '').trim().toLowerCase();

  // 1. Kỹ sư trưởng / Chỉ huy trưởng công trường: 25 triệu VNĐ
  if (isSiteChiefEngineerRoleOrPosition(r, input.position)) {
    return {
      tierKey: 'SITE_CHIEF_ENGINEER',
      roleLabel: 'Kỹ sư trưởng / Chỉ huy trưởng công trường',
      fixedSalary: FIXED_BASE_SALARY_RULES.SITE_CHIEF_ENGINEER,
    };
  }

  // Các vai trò quản lý cấp cao / Admin miễn lương không ép mức cố định 18/22/25M
  if (isDepartmentHeadOrExecutive(r, input.position, input.isDepartmentHead)) {
    return null;
  }

  // 2. Nhân viên HR: 22 triệu VNĐ
  if (
    r === 'HR_STAFF' ||
    r === 'HR_OFFICER' ||
    p.includes('nhân sự') ||
    p.includes('nhan su') ||
    p.includes('hr staff') ||
    p.includes('c&b')
  ) {
    return {
      tierKey: 'HR_STAFF',
      roleLabel: 'Nhân viên HR',
      fixedSalary: FIXED_BASE_SALARY_RULES.HR_STAFF,
    };
  }

  // 3. Nhân viên Kế Toán: 22 triệu VNĐ
  if (
    r === 'ACCOUNTANT' ||
    r === 'PAYROLL_ACCOUNTANT' ||
    p.includes('kế toán') ||
    p.includes('ke toan') ||
    p.includes('accountant')
  ) {
    return {
      tierKey: 'ACCOUNTANT',
      roleLabel: 'Nhân viên Kế Toán',
      fixedSalary: FIXED_BASE_SALARY_RULES.ACCOUNTANT,
    };
  }

  // 4. Kỹ sư công trường: 18 triệu VNĐ
  if (
    r === 'SITE_ENGINEER' ||
    input.employeeType === 'SITE_ENGINEER' ||
    p.includes('kỹ sư') ||
    p.includes('ky su')
  ) {
    return {
      tierKey: 'SITE_ENGINEER',
      roleLabel: 'Kỹ sư công trường',
      fixedSalary: FIXED_BASE_SALARY_RULES.SITE_ENGINEER,
    };
  }

  // 5. Nhân viên văn phòng: 18 triệu VNĐ
  if (r === 'OFFICE_STAFF' || input.employeeType === 'OFFICE_STAFF') {
    return {
      tierKey: 'OFFICE_STAFF',
      roleLabel: 'Nhân viên văn phòng',
      fixedSalary: FIXED_BASE_SALARY_RULES.OFFICE_STAFF,
    };
  }

  return null;
}

export function getDefaultBaseSalaryForPosition(
  input?: Partial<Pick<Employee, 'role' | 'position' | 'employeeType' | 'isDepartmentHead'>> | null
): number {
  const fixed = resolveFixedBaseSalaryPolicy(input);
  if (fixed) return fixed.fixedSalary;
  const r = normalizeRoleUpper(input?.role);
  if (r === 'HR_MANAGER') return 32_000_000;
  if (r === 'ADMIN' || r === 'SYSTEM_ADMIN') return 35_000_000;
  if (r === 'CHIEF_ACCOUNTANT') return 45_000_000;
  if (r === 'DIRECTOR' || r === 'CEO') return 60_000_000;
  return FIXED_BASE_SALARY_RULES.OFFICE_STAFF;
}

export function validateBaseSalaryForRole(
  salaryNum: number,
  input?: Partial<Pick<Employee, 'role' | 'position' | 'employeeType' | 'isDepartmentHead'>> | null
): { valid: true } | { valid: false; error: string } {
  if (!Number.isFinite(salaryNum) || salaryNum < REGIONAL_MIN_WAGE_VUNG_1) {
    return {
      valid: false,
      error:
        'Mức lương cơ bản không hợp lệ! Không được thấp hơn Lương tối thiểu Vùng I theo quy định pháp luật hiện hành (5.310.000 VNĐ/tháng).',
    };
  }
  const fixed = resolveFixedBaseSalaryPolicy(input);
  if (fixed && Math.round(salaryNum) !== fixed.fixedSalary) {
    return {
      valid: false,
      error: `Ràng buộc quy chế lương cơ bản Hải Minh: [${fixed.roleLabel}] bắt buộc áp dụng mức lương cơ bản cố định ${formatVNDPlain(fixed.fixedSalary)} VNĐ (không thể đặt ${formatVNDPlain(salaryNum)} VNĐ)!`,
    };
  }
  return { valid: true };
}
