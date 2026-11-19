import type {
  Department,
  Employee,
  EvaluationCAction,
  EvaluationGrade,
  EvaluationRewardChoice,
  PerformanceEvaluationRecord,
} from '../types';

export const SIX_MONTH_A_STREAK_TARGET = 6;
export const MAX_A_REWARDS_PER_YEAR = 2;
export const DEFAULT_SIX_MONTH_A_BONUS_VND = 3_000_000;
export const GRADE_C_DEFAULT_PCT = 0.7;

export interface EvaluationGradeSpec {
  grade: EvaluationGrade;
  label: string;
  shortDesc: string;
  ruleSummary: string;
  defaultPct: number;
  badgeColor: string;
  badgeBg: string;
}

export const EVALUATION_GRADE_MAP: Record<EvaluationGrade, EvaluationGradeSpec> = {
  A: {
    grade: 'A',
    label: 'Loại A — Tích cực, hiệu quả cao',
    shortDesc: '100% HQCV • Tích lũy chuỗi 6 tháng A',
    ruleSummary:
      'Đạt 6 tháng liên tiếp Loại A được xét tăng lương hoặc cộng thưởng cố định (mặc định 3.000.000đ/đợt vào tháng thứ 7, tối đa 2 lần/năm).',
    defaultPct: 1.0,
    badgeColor: '#047857',
    badgeBg: '#ecfdf5',
  },
  B: {
    grade: 'B',
    label: 'Loại B — Đạt yêu cầu',
    shortDesc: 'Giữ nguyên lương (0 thưởng thêm / 0 trừ)',
    ruleSummary:
      'Đạt yêu cầu công việc hàng tháng, giữ nguyên mức lương hiện hưởng (ngắt chuỗi tích lũy Loại A nếu trước đó đang có).',
    defaultPct: 1.0,
    badgeColor: '#1d4ed8',
    badgeBg: '#eff6ff',
  },
  C: {
    grade: 'C',
    label: 'Loại C — Thái độ / hiệu suất kém',
    shortDesc: 'Nhắc nhở hoặc Giảm trừ theo quy định',
    ruleSummary:
      'Bắt buộc ghi rõ lý do và chọn Nhắc nhở kiểm điểm hoặc Giảm trừ theo quy định (giảm % HQCV hoặc trừ khoản phạt quy định vào kỳ lương).',
    defaultPct: GRADE_C_DEFAULT_PCT,
    badgeColor: '#b91c1c',
    badgeBg: '#fef2f2',
  },
};

function normalizeRoleUpper(raw?: string): string {
  const r = String(raw || '').trim().toUpperCase().replace(/^ROLE_/, '');
  if (r === 'ADMIN') return 'SYSTEM_ADMIN';
  if (r === 'PAYROLL_ACCOUNTANT') return 'ACCOUNTANT';
  if (r === 'HR_OFFICER') return 'HR_STAFF';
  return r;
}

export function isManagerEvaluatorRole(
  user?: Partial<Employee> | null,
  departments: Department[] = []
): boolean {
  if (!user) return false;
  const r = normalizeRoleUpper(user.role);
  if (r === 'SYSTEM_ADMIN' || r === 'DIRECTOR' || r === 'CEO') return false;
  if (
    r === 'SITE_MANAGER' ||
    r === 'HR_MANAGER' ||
    r === 'CHIEF_ACCOUNTANT'
  ) {
    return true;
  }
  if (user.isDepartmentHead) return true;
  return Boolean(user.id && departments.some((d) => d.managerId === user.id));
}

export function canEvaluatorGradeTarget(
  evaluator?: Partial<Employee> | null,
  target?: Partial<Employee> | null,
  departments: Department[] = []
): { allowed: boolean; reason?: string } {
  if (!evaluator || !target) {
    return { allowed: false, reason: 'Thiếu thông tin người đánh giá hoặc nhân sự.' };
  }
  if (
    (evaluator.id && target.id && evaluator.id === target.id) ||
    (evaluator.employeeCode && target.employeeCode && evaluator.employeeCode === target.employeeCode)
  ) {
    return { allowed: false, reason: 'Khóa SoD: Không thể tự đánh giá xếp loại cho chính mình.' };
  }
  const role = normalizeRoleUpper(evaluator.role);
  if (role === 'SYSTEM_ADMIN') {
    return { allowed: false, reason: 'System Admin không có quyền đánh giá nhân sự.' };
  }
  if (role === 'DIRECTOR' || role === 'CEO') {
    return { allowed: false, reason: 'Ban Giám đốc không thực hiện chức năng đánh giá xếp loại nhân sự.' };
  }
  const dept = departments.find((d) => d.id === target.departmentId);
  const isDeptHeadOfTarget = Boolean(dept && evaluator.id && dept.managerId === evaluator.id);

  if (!isManagerEvaluatorRole(evaluator, departments)) {
    return {
      allowed: false,
      reason: 'Chỉ Trưởng phòng hoặc Kỹ sư trưởng (Chỉ huy trưởng) được phép đánh giá xếp loại.',
    };
  }

  const posLower = String(evaluator.position || '').toLowerCase();
  const isSiteMgr =
    role === 'SITE_MANAGER' ||
    posLower.includes('chỉ huy trưởng') ||
    posLower.includes('kỹ sư trưởng');
  if (isSiteMgr) {
    const isSiteTarget =
      target.employeeType === 'SITE_ENGINEER' &&
      (isDeptHeadOfTarget ||
        (evaluator.departmentId != null && target.departmentId === evaluator.departmentId) ||
        !dept?.managerId);
    return isSiteTarget
      ? { allowed: true }
      : { allowed: false, reason: 'Kỹ sư trưởng chỉ đánh giá kỹ sư công trường thuộc Ban QLDA, không đánh giá nhân viên văn phòng phòng ban khác.' };
  }

  if (target.employeeType === 'SITE_ENGINEER') {
    return {
      allowed: false,
      reason: 'Trưởng phòng ban không được đánh giá kỹ sư công trường (chỉ đánh giá nhân viên thuộc phòng ban mình).',
    };
  }

  const sameDeptManaged =
    dept?.managerId != null
      ? evaluator.id != null && dept.managerId === evaluator.id
      : evaluator.departmentId != null && evaluator.departmentId === target.departmentId;

  return sameDeptManaged
    ? { allowed: true }
    : { allowed: false, reason: 'Trưởng phòng nào chỉ được đánh giá nhân viên thuộc phòng ban đó, không được đánh giá phòng ban khác.' };
}

function hasRewardGranted(ev?: PerformanceEvaluationRecord | null): boolean {
  if (!ev) return false;
  return ev.rewardChoice === 'FIXED_BONUS' || ev.rewardChoice === 'SALARY_RAISE';
}

function stepPrevPeriod(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Đếm số tháng liên tiếp đạt Loại A ngay trước kỳ (year, month).
 */
export function computeConsecutiveAStreakBefore(
  history: PerformanceEvaluationRecord[],
  year: number,
  month: number
): number {
  const byKey = new Map<string, PerformanceEvaluationRecord>();
  for (const ev of history) {
    byKey.set(periodKey(ev.evalYear, ev.evalMonth), ev);
  }
  let cur = stepPrevPeriod(year, month);
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const found = byKey.get(periodKey(cur.year, cur.month));
    if (!found || found.grade !== 'A') break;
    streak += 1;
    cur = stepPrevPeriod(cur.year, cur.month);
  }
  return streak;
}

/**
 * Đếm số tháng Loại A liên tiếp kể từ lần xét thưởng / tăng lương gần nhất đến trước kỳ (year, month).
 */
export function computeUnrewardedAStreakBefore(
  history: PerformanceEvaluationRecord[],
  year: number,
  month: number
): number {
  const byKey = new Map<string, PerformanceEvaluationRecord>();
  for (const ev of history) {
    byKey.set(periodKey(ev.evalYear, ev.evalMonth), ev);
  }
  let cur = stepPrevPeriod(year, month);
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const found = byKey.get(periodKey(cur.year, cur.month));
    if (!found || found.grade !== 'A') break;
    streak += 1;
    if (hasRewardGranted(found)) break;
    cur = stepPrevPeriod(cur.year, cur.month);
  }
  return streak;
}

export function computeYearlyARewardsUsed(
  history: PerformanceEvaluationRecord[],
  year: number,
  excludeMonth?: number
): number {
  return history.filter(
    (ev) =>
      ev.evalYear === year &&
      (excludeMonth == null || ev.evalMonth !== excludeMonth) &&
      hasRewardGranted(ev)
  ).length;
}

export function isEligibleForSixMonthAReward(
  history: PerformanceEvaluationRecord[],
  year: number,
  month: number
): { eligible: boolean; unrewardedStreakBefore: number; yearlyUsed: number } {
  const unrewardedStreakBefore = computeUnrewardedAStreakBefore(history, year, month);
  const yearlyUsed = computeYearlyARewardsUsed(history, year, month);
  return {
    eligible:
      unrewardedStreakBefore >= SIX_MONTH_A_STREAK_TARGET && yearlyUsed < MAX_A_REWARDS_PER_YEAR,
    unrewardedStreakBefore,
    yearlyUsed,
  };
}

export function getDefaultEvaluationPctForGrade(
  grade: EvaluationGrade,
  cActionType: EvaluationCAction = 'NONE'
): number {
  if (grade === 'A' || grade === 'B') return 1.0;
  return cActionType === 'DEDUCTION' ? GRADE_C_DEFAULT_PCT : 1.0;
}

export interface ValidateEvaluationInput {
  attitudeScore: number;
  performanceScore: number;
  grade: EvaluationGrade;
  evaluationPct?: number;
  rewardChoice?: EvaluationRewardChoice;
  rewardBonusAmount?: number;
  salaryRaiseAmount?: number;
  cActionType?: EvaluationCAction;
  deductionAmount?: number;
  comment: string;
  eligibleForSixMonthReward: boolean;
  yearlyRewardsUsedBeforeThisMonth: number;
  evalYear: number;
}

export function validateMonthlyEvaluationSubmission(
  input: ValidateEvaluationInput
): { valid: true; normalizedPct: number; normalizedBonus: number; normalizedRaise: number; normalizedDeduction: number } | { valid: false; error: string } {
  const {
    attitudeScore,
    performanceScore,
    grade,
    evaluationPct,
    rewardChoice = 'NONE',
    rewardBonusAmount = 0,
    salaryRaiseAmount = 0,
    cActionType = 'NONE',
    deductionAmount = 0,
    comment,
    eligibleForSixMonthReward,
    yearlyRewardsUsedBeforeThisMonth,
    evalYear,
  } = input;

  if (!Number.isFinite(attitudeScore) || attitudeScore < 1 || attitudeScore > 10) {
    return { valid: false, error: 'Điểm Thái độ làm việc phải trong khoảng 1 đến 10!' };
  }
  if (!Number.isFinite(performanceScore) || performanceScore < 1 || performanceScore > 10) {
    return { valid: false, error: 'Điểm Hiệu suất công việc phải trong khoảng 1 đến 10!' };
  }

  if (rewardChoice !== 'NONE') {
    if (grade === 'C') {
      return { valid: false, error: 'Không thể áp dụng thưởng chuỗi 6 tháng A khi xếp loại C!' };
    }
    if (!eligibleForSixMonthReward) {
      return {
        valid: false,
        error: 'Nhân sự chưa tích lũy đủ 6 tháng liên tiếp Loại A chưa xét thưởng trước kỳ này!',
      };
    }
    if (yearlyRewardsUsedBeforeThisMonth >= MAX_A_REWARDS_PER_YEAR) {
      return {
        valid: false,
        error: `Đã đạt giới hạn tối đa ${MAX_A_REWARDS_PER_YEAR} đợt thưởng / xét tăng lương trong năm ${evalYear}!`,
      };
    }
    if (rewardChoice === 'FIXED_BONUS') {
      const bonus = rewardBonusAmount > 0 ? rewardBonusAmount : DEFAULT_SIX_MONTH_A_BONUS_VND;
      return {
        valid: true,
        normalizedPct: 1.0,
        normalizedBonus: bonus,
        normalizedRaise: 0,
        normalizedDeduction: 0,
      };
    }
    if (rewardChoice === 'SALARY_RAISE') {
      if (!Number.isFinite(salaryRaiseAmount) || salaryRaiseAmount <= 0) {
        return { valid: false, error: 'Vui lòng nhập mức tăng lương cơ bản (> 0 VNĐ)!' };
      }
      return {
        valid: true,
        normalizedPct: 1.0,
        normalizedBonus: 0,
        normalizedRaise: salaryRaiseAmount,
        normalizedDeduction: 0,
      };
    }
  }

  if (grade === 'B') {
    return {
      valid: true,
      normalizedPct: 1.0,
      normalizedBonus: 0,
      normalizedRaise: 0,
      normalizedDeduction: 0,
    };
  }

  if (grade === 'C') {
    if (cActionType !== 'REMINDER' && cActionType !== 'DEDUCTION') {
      return {
        valid: false,
        error: 'Khi xếp Loại C, vui lòng chọn Nhắc nhở hoặc Giảm trừ theo quy định!',
      };
    }
    if (!comment || !comment.trim()) {
      return {
        valid: false,
        error: 'Khi xếp Loại C, bắt buộc nhập rõ nhận xét lý do nhắc nhở hoặc giảm trừ!',
      };
    }
    if (cActionType === 'DEDUCTION') {
      const pct = evaluationPct != null && evaluationPct >= 0 ? evaluationPct : GRADE_C_DEFAULT_PCT;
      const ded = Math.max(0, Number(deductionAmount) || 0);
      if (ded <= 0 && pct >= 1) {
        return {
          valid: false,
          error: 'Vui lòng nhập mức tiền giảm trừ (> 0 VNĐ) hoặc tỷ lệ HQCV < 100% khi chọn Giảm trừ!',
        };
      }
      return {
        valid: true,
        normalizedPct: pct,
        normalizedBonus: 0,
        normalizedRaise: 0,
        normalizedDeduction: ded,
      };
    }
    return {
      valid: true,
      normalizedPct: 1.0,
      normalizedBonus: 0,
      normalizedRaise: 0,
      normalizedDeduction: 0,
    };
  }

  return {
    valid: true,
    normalizedPct: 1.0,
    normalizedBonus: 0,
    normalizedRaise: 0,
    normalizedDeduction: 0,
  };
}
