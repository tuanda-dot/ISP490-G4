import type { Employee, HalfDaySession, LeaveRequest, LeaveType } from '../types';

export const MAX_PAID_LEAVE_DAYS_PER_MONTH = 4;
export const MAX_SHORT_SICK_DAYS_PER_MONTH = 2;

export interface LeavePolicySpec {
  type: LeaveType;
  label: string;
  shortBadge: string;
  deductsAnnualQuota: boolean;
  deductLabel: string;
  paidByLabel: string;
  timesheetSymbol: string;
  lawRef: string;
  maxDaysPerRequest?: number;
  ruleDetail: string;
  requiredAttachmentLabel: string;
}

export const LEAVE_TYPE_ORDER: LeaveType[] = [
  'ANNUAL',
  'SPECIAL_PAID',
  'SICK_SHORT',
  'SICK_LONG',
  'PERSONAL_TRAVEL',
  'COMPENSATORY',
  'BAD_WEATHER',
  'UNPAID',
];

export const LEAVE_POLICY_MAP: Record<LeaveType, LeavePolicySpec> = {
  ANNUAL: {
    type: 'ANNUAL',
    label: 'Nghỉ Phép Tiêu Chuẩn (Hưởng Lương)',
    shortBadge: 'Phép Tiêu Chuẩn (≤4d/th)',
    deductsAnnualQuota: true,
    deductLabel: 'Tính vào trần 04 ngày/tháng & quỹ phép năm',
    paidByLabel: '100% lương công chuẩn (nếu tổng tháng ≤ 4 ngày)',
    timesheetSymbol: 'P / 0.5P',
    lawRef: 'Quy chế Hải Minh (02 phép + 02 dự phòng/tháng)',
    ruleDetail:
      'Mỗi nhân sự có tối đa 04 ngày nghỉ hưởng lương/tháng (02 ngày phép tiêu chuẩn + 02 ngày dự phòng). Nếu tổng ngày nghỉ có lương vượt quá 04 ngày/tháng, từ ngày thứ 5 sẽ không tính ngày công.',
    requiredAttachmentLabel: 'Đơn xin nghỉ phép có xác nhận bàn giao công việc / ảnh chụp đơn ký',
  },
  SPECIAL_PAID: {
    type: 'SPECIAL_PAID',
    label: 'Nghỉ Việc Khẩn Cấp / Gia Đình (Dự Phòng 02 Ngày)',
    shortBadge: 'Việc Khẩn Cấp / Gia Đình',
    deductsAnnualQuota: false,
    deductLabel: 'Tính vào trần 04 ngày/tháng (02 ngày dự phòng)',
    paidByLabel: '100% lương ngày công (tổng tháng ≤ 4 ngày)',
    timesheetSymbol: 'CĐ / 0.5CĐ',
    lawRef: 'Quy chế Hải Minh & Điều 115 BLLĐ 2019',
    maxDaysPerRequest: 4,
    ruleDetail:
      'Bao gồm 02 ngày dự phòng việc khẩn cấp / việc gia đình (cưới hỏi, ma chay, việc hiếu hỉ có lý do chính đáng). Hưởng nguyên lương nếu tổng ngày nghỉ hưởng lương trong tháng ≤ 04 ngày.',
    requiredAttachmentLabel: 'Giấy ĐKKH / Giấy chứng tử / Xác nhận lý do khẩn cấp gia đình',
  },
  SICK_SHORT: {
    type: 'SICK_SHORT',
    label: 'Nghỉ Ốm Ngắn Ngày (≤ 2 Ngày/Tháng)',
    shortBadge: 'Ốm Ngắn Ngày (CTY Trả)',
    deductsAnnualQuota: false,
    deductLabel: 'Công ty tự chi trả (không qua BHXH, gộp trần 4d/th)',
    paidByLabel: '100% lương (Công ty tự chi trả, không trừ lương)',
    timesheetSymbol: 'ÔP / 0.5ÔP',
    lawRef: 'Quy chế Phúc lợi Công ty Hải Minh',
    maxDaysPerRequest: 2,
    ruleDetail:
      'Nghỉ ốm ngắn ngày tối đa 02 ngày/tháng: Công ty tự chi trả, không làm thủ tục BHXH và không bị trừ lương (tính gộp trong hạn mức 04 ngày nghỉ hưởng lương/tháng). Hỗ trợ nghỉ nửa ngày Sáng/Chiều (0,5 công).',
    requiredAttachmentLabel: 'Đơn thuốc / Sổ khám bệnh / Tin nhắn xác nhận tình trạng sức khỏe',
  },
  SICK_LONG: {
    type: 'SICK_LONG',
    label: 'Nghỉ Ốm Dài Ngày (Nằm Viện / Điều Trị Dài Hạn)',
    shortBadge: 'Ốm Dài Ngày (TP 50% / NV 0%)',
    deductsAnnualQuota: false,
    deductLabel: 'TP/CHT: hưởng 50% lương CB • NV: 0% lương (không qua BHXH)',
    paidByLabel: 'Cấp Trưởng phòng / CHT: 50% lương CB • Cấp Nhân viên: 0% lương',
    timesheetSymbol: 'ÔD',
    lawRef: 'Quy chế Phúc lợi Công ty Hải Minh (Note OT)',
    ruleDetail:
      'Nghỉ ốm dài ngày, nằm viện, điều trị dài hạn (> 2 ngày/tháng, không qua BHXH): Cấp Trưởng phòng / Chỉ huy trưởng trở lên được hưởng 50% lương ngày công cơ bản; Cấp Nhân viên không tính lương những ngày nghỉ (Công đoàn & Công ty thăm hỏi riêng).',
    requiredAttachmentLabel: 'Giấy nhập viện / Giấy ra viện / Hồ sơ điều trị dài hạn',
  },
  PERSONAL_TRAVEL: {
    type: 'PERSONAL_TRAVEL',
    label: 'Nghỉ Đi Du Lịch / Việc Cá Nhân Giải Trí',
    shortBadge: 'Du Lịch / Cá Nhân (0 Lương)',
    deductsAnnualQuota: false,
    deductLabel: 'KHÔNG tính ngày công (lương theo ngày đi làm)',
    paidByLabel: '0% lương những ngày nghỉ (chỉ tính công ngày đi làm)',
    timesheetSymbol: 'K / 0.5K',
    lawRef: 'Quy chế Chấm công Công ty Hải Minh',
    ruleDetail:
      'Nghỉ đi du lịch hoặc việc cá nhân giải trí: Không tính ngày công cho những ngày nghỉ (lương chỉ tính trên số ngày thực tế đi làm, kể cả khi chưa hết 04 ngày phép/tháng).',
    requiredAttachmentLabel: 'Đơn xin nghỉ phép bàn giao công việc trước chuyến đi',
  },
  COMPENSATORY: {
    type: 'COMPENSATORY',
    label: 'Nghỉ Bù (Sau Trực Đêm Công Trường)',
    shortBadge: 'Nghỉ Bù Trực Đêm',
    deductsAnnualQuota: false,
    deductLabel: 'KHÔNG trừ hạn mức 4 ngày/tháng',
    paidByLabel: 'Đã quy đổi 1 buổi trực đêm = 1,5 công (nghỉ bù hôm sau)',
    timesheetSymbol: 'NBĐ / CT',
    lawRef: 'Quy chế Trực đêm Công trường Hải Minh',
    ruleDetail:
      'Nghỉ bù ngày hôm sau sau khi hoàn thành ca trực đêm công trường (22h00 - 05h00). Mỗi buổi trực đêm đã được tính 1,5 ngày công và nhân sự nghỉ phục hồi cả ngày hôm sau.',
    requiredAttachmentLabel: 'Lịch phân công trực đêm công trường đã được CHT duyệt',
  },
  BAD_WEATHER: {
    type: 'BAD_WEATHER',
    label: 'Ngừng Việc Thời Tiết Xấu Công Trường',
    shortBadge: 'Thời Tiết Xấu CT (Đ.99)',
    deductsAnnualQuota: false,
    deductLabel: 'KHÔNG trừ quỹ phép năm',
    paidByLabel: 'Lương ngừng việc ≥ Lương tối thiểu vùng (Công ty trả)',
    timesheetSymbol: 'CĐ / 0.5CĐ',
    lawRef: 'Khoản 3 Điều 99 BLLĐ 2019',
    ruleDetail:
      'Mưa bão, ngập lụt, thiên tai bất khả kháng buộc dừng thi công công trường. Không trừ phép; hưởng lương ngừng việc thỏa thuận ≥ lương tối thiểu vùng.',
    requiredAttachmentLabel: 'Biên bản xác nhận thời tiết xấu / Lệnh dừng thi công / Ảnh hiện trường',
  },
  SICK: {
    type: 'SICK',
    label: 'Nghỉ Ốm Ngắn Ngày (≤ 2 Ngày/Tháng)',
    shortBadge: 'Ốm Ngắn Ngày (CTY Trả)',
    deductsAnnualQuota: false,
    deductLabel: 'Công ty tự chi trả (không qua BHXH, gộp trần 4d/th)',
    paidByLabel: '100% lương (Công ty tự chi trả, không trừ lương)',
    timesheetSymbol: 'ÔP / 0.5ÔP',
    lawRef: 'Quy chế Phúc lợi Công ty Hải Minh',
    maxDaysPerRequest: 2,
    ruleDetail:
      'Nghỉ ốm ngắn ngày tối đa 02 ngày/tháng: Công ty tự chi trả, không làm thủ tục BHXH và không bị trừ lương.',
    requiredAttachmentLabel: 'Đơn thuốc / Giấy khám bệnh tại cơ sở y tế',
  },
  UNPAID: {
    type: 'UNPAID',
    label: 'Nghỉ Việc Riêng Không Hưởng Lương',
    shortBadge: 'Nghỉ Không Hưởng Lương',
    deductsAnnualQuota: false,
    deductLabel: 'KHÔNG trừ quỹ phép (0 ngày công)',
    paidByLabel: 'Không hưởng lương & phụ cấp ngày nghỉ',
    timesheetSymbol: 'K / 0.5K',
    lawRef: 'Khoản 2 & Khoản 3 Điều 115 BLLĐ 2019',
    ruleDetail:
      'Nghỉ không lương theo thỏa thuận hoặc phần ngày nghỉ vượt quá 04 ngày/tháng. Không tính ngày công hưởng lương cho những ngày này.',
    requiredAttachmentLabel: 'Đơn xin nghỉ không lương có xác nhận bàn giao công việc / giấy tờ lý do',
  },
};

export function isShortSickLeaveType(leaveType?: string | null): boolean {
  const key = (leaveType || '').toUpperCase();
  return key === 'SICK_SHORT' || key === 'SICK';
}

export function isUnpaidLeaveType(leaveType?: string | null): boolean {
  const key = (leaveType || '').toUpperCase();
  return key === 'UNPAID' || key === 'PERSONAL_TRAVEL' || key === 'SICK_LONG';
}

/**
 * Quy chế phúc lợi Công ty Hải Minh (Note OT.docx):
 * Nghỉ ốm dài ngày (SICK_LONG - nằm viện/điều trị dài hạn):
 * - Cấp Trưởng phòng / Chỉ huy trưởng trở lên: Hưởng 50% lương cơ bản theo ngày công.
 * - Cấp Nhân viên / Kỹ sư thường: 0% lương (Công đoàn & Công ty thăm hỏi riêng).
 */
export function isSickLongHalfPayEligible(emp?: Partial<Employee> | null): boolean {
  if (!emp) return false;
  if (emp.isDepartmentHead) return true;
  const r = String(emp.role || '').trim().toUpperCase().replace(/^ROLE_/, '');
  if (['HR_MANAGER', 'CHIEF_ACCOUNTANT', 'SITE_MANAGER', 'DIRECTOR', 'CEO'].includes(r)) {
    return true;
  }
  const p = String(emp.position || '').trim().toLowerCase();
  return (
    p.includes('trưởng phòng') ||
    p.includes('truong phong') ||
    p.includes('kế toán trưởng') ||
    p.includes('ke toan truong') ||
    p.includes('chỉ huy trưởng') ||
    p.includes('chi huy truong') ||
    p.includes('kỹ sư trưởng') ||
    p.includes('ky su truong') ||
    p.includes('giám đốc') ||
    p.includes('giam doc')
  );
}

export function getSickLongPayRate(emp?: Partial<Employee> | null): number {
  return isSickLongHalfPayEligible(emp) ? 0.5 : 0;
}

export function isMonthlyCappedPaidLeaveType(leaveType?: string | null): boolean {
  const key = (leaveType || '').toUpperCase();
  return key === 'ANNUAL' || key === 'SPECIAL_PAID' || isShortSickLeaveType(key);
}

export function getLeavePolicy(leaveType?: string | null): LeavePolicySpec {
  const key = (leaveType || 'ANNUAL').toUpperCase() as LeaveType;
  return LEAVE_POLICY_MAP[key] || LEAVE_POLICY_MAP.ANNUAL;
}

export const ALLOWED_LEAVE_ATTACHMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
export const MAX_LEAVE_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

export function validateLeaveAttachmentName(attachmentName?: string | null): { valid: boolean; error?: string } {
  const trimmed = (attachmentName || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      error:
        'Chưa đính kèm minh chứng! Bắt buộc tải lên tệp minh chứng (.pdf, .jpg, .png, .webp) trước khi gửi đơn xin nghỉ phép.',
    };
  }
  const lower = trimmed.toLowerCase();
  const hasAllowedExt = ALLOWED_LEAVE_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error: `Định dạng tệp minh chứng "${trimmed}" không hợp lệ! Chỉ chấp nhận PDF hoặc ảnh (${ALLOWED_LEAVE_ATTACHMENT_EXTENSIONS.join(', ')}).`,
    };
  }
  return { valid: true };
}

export function validateLeaveAttachmentFile(file: File | null | undefined): { valid: boolean; error?: string; fileName?: string } {
  if (!file) {
    return validateLeaveAttachmentName('');
  }
  if (file.size <= 0) {
    return { valid: false, error: `Tệp "${file.name}" bị rỗng (0 bytes). Vui lòng chọn minh chứng hợp lệ!` };
  }
  if (file.size > MAX_LEAVE_ATTACHMENT_BYTES) {
    return {
      valid: false,
      error: `Dung lượng tệp "${file.name}" vượt quá giới hạn 5 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)!`,
    };
  }
  const nameCheck = validateLeaveAttachmentName(file.name);
  if (!nameCheck.valid) return nameCheck;
  return { valid: true, fileName: file.name };
}

export interface AnnualLeaveQuotaSummary {
  baseDays: number;
  seniorityBonus: number;
  totalEntitled: number;
  usedApproved: number;
  pendingAnnual: number;
  totalUsedAndPending: number;
  remaining: number;
}

export function computeAnnualLeaveQuota(
  emp?: Partial<Employee> | null,
  leaveRequests: LeaveRequest[] = [],
  referenceYear: number = 2026
): AnnualLeaveQuotaSummary {
  const baseDays = 12;
  let seniorityBonus = 0;
  if (emp?.hireDate) {
    const hireYear = parseInt(String(emp.hireDate).split('-')[0], 10);
    if (!Number.isNaN(hireYear)) {
      const yearsWorked = Math.max(0, referenceYear - hireYear);
      seniorityBonus = Math.floor(yearsWorked / 5);
    }
  }
  const totalEntitled = baseDays + seniorityBonus;

  const isSameEmployee = (l: LeaveRequest) =>
    Boolean((emp?.id && l.employeeId === emp.id) || (emp?.employeeCode && l.employeeCode === emp.employeeCode));

  const usedApproved = leaveRequests
    .filter((l) => isSameEmployee(l) && l.leaveType === 'ANNUAL' && l.status === 'APPROVED')
    .reduce((sum, l) => sum + (Number(l.daysCount) || 0), 0);

  const pendingAnnual = leaveRequests
    .filter((l) => isSameEmployee(l) && l.leaveType === 'ANNUAL' && String(l.status || '').startsWith('PENDING'))
    .reduce((sum, l) => sum + (Number(l.daysCount) || 0), 0);

  const totalUsedAndPending = Number((usedApproved + pendingAnnual).toFixed(1));
  const remaining = Math.max(0, Number((totalEntitled - totalUsedAndPending).toFixed(1)));

  return {
    baseDays,
    seniorityBonus,
    totalEntitled,
    usedApproved: Number(usedApproved.toFixed(1)),
    pendingAnnual: Number(pendingAnnual.toFixed(1)),
    totalUsedAndPending,
    remaining,
  };
}

export const STATUTORY_HOLIDAY_MMDD = new Set(['01-01', '04-30', '05-01', '09-02']);

export const STATUTORY_HOLIDAY_MMDD_NAMES: Record<string, string> = {
  '01-01': 'Tết Dương Lịch (01/01)',
  '04-30': 'Ngày Chiến Thắng 30/4',
  '05-01': 'Ngày Quốc Tế Lao Động 01/5',
  '09-02': 'Ngày Quốc Khánh 02/9',
};

/**
 * Lịch Ngày Lễ / Tết chính thức theo năm (2025 - 2028) theo Điều 112 BLLĐ 2019:
 * gồm Tết Nguyên Đán Âm lịch, Giỗ Tổ Hùng Vương 10/3 ÂL, ngày liền kề Quốc Khánh & nghỉ bù.
 */
export const VIETNAM_PUBLIC_HOLIDAYS_BY_DATE: Record<string, string> = {
  // 2025
  '2025-01-28': 'Tết Nguyên Đán Ất Tỵ (29 Tết)',
  '2025-01-29': 'Tết Nguyên Đán Ất Tỵ (Mùng 1 Tết)',
  '2025-01-30': 'Tết Nguyên Đán Ất Tỵ (Mùng 2 Tết)',
  '2025-01-31': 'Tết Nguyên Đán Ất Tỵ (Mùng 3 Tết)',
  '2025-02-01': 'Tết Nguyên Đán Ất Tỵ (Mùng 4 Tết)',
  '2025-04-07': 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
  '2025-09-01': 'Nghỉ Lễ Quốc Khánh (Liền kề 02/9)',

  // 2026
  '2026-02-16': 'Tết Nguyên Đán Bính Ngọ (29 Tết)',
  '2026-02-17': 'Tết Nguyên Đán Bính Ngọ (Mùng 1 Tết)',
  '2026-02-18': 'Tết Nguyên Đán Bính Ngọ (Mùng 2 Tết)',
  '2026-02-19': 'Tết Nguyên Đán Bính Ngọ (Mùng 3 Tết)',
  '2026-02-20': 'Tết Nguyên Đán Bính Ngọ (Mùng 4 Tết)',
  '2026-04-26': 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
  '2026-04-27': 'Nghỉ Bù Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
  '2026-09-01': 'Nghỉ Lễ Quốc Khánh (Liền kề 02/9)',

  // 2027
  '2027-02-05': 'Tết Nguyên Đán Đinh Mùi (29 Tết)',
  '2027-02-06': 'Tết Nguyên Đán Đinh Mùi (Mùng 1 Tết)',
  '2027-02-07': 'Tết Nguyên Đán Đinh Mùi (Mùng 2 Tết)',
  '2027-02-08': 'Tết Nguyên Đán Đinh Mùi (Mùng 3 Tết)',
  '2027-02-09': 'Tết Nguyên Đán Đinh Mùi (Mùng 4 Tết)',
  '2027-02-10': 'Nghỉ Bù Tết Nguyên Đán Đinh Mùi',
  '2027-02-11': 'Nghỉ Bù Tết Nguyên Đán Đinh Mùi',
  '2027-04-16': 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
  '2027-05-03': 'Nghỉ Bù Ngày Quốc Tế Lao Động 01/5',
  '2027-09-03': 'Nghỉ Lễ Quốc Khánh (Liền kề 02/9)',

  // 2028
  '2028-01-03': 'Nghỉ Bù Tết Dương Lịch 01/01',
  '2028-01-25': 'Tết Nguyên Đán Mậu Thân (29 Tết)',
  '2028-01-26': 'Tết Nguyên Đán Mậu Thân (Mùng 1 Tết)',
  '2028-01-27': 'Tết Nguyên Đán Mậu Thân (Mùng 2 Tết)',
  '2028-01-28': 'Tết Nguyên Đán Mậu Thân (Mùng 3 Tết)',
  '2028-01-29': 'Tết Nguyên Đán Mậu Thân (Mùng 4 Tết)',
  '2028-04-04': 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
  '2028-09-03': 'Nghỉ Lễ Quốc Khánh (Liền kề 02/9)',
};

export function getStatutoryHolidayInfo(dateIso: string): { isHoliday: boolean; name?: string; lawRef?: string } {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { isHoliday: false };
  }
  const exactName = VIETNAM_PUBLIC_HOLIDAYS_BY_DATE[dateIso];
  if (exactName) {
    return { isHoliday: true, name: exactName, lawRef: 'Điều 112 BLLĐ 2019' };
  }
  const mmdd = dateIso.slice(5);
  const fixedName = STATUTORY_HOLIDAY_MMDD_NAMES[mmdd];
  if (fixedName) {
    return { isHoliday: true, name: fixedName, lawRef: 'Điều 112 BLLĐ 2019' };
  }
  return { isHoliday: false };
}

export function countStatutoryHolidayOverlap(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  let overlapHolidayCount = 0;
  const cur = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (getStatutoryHolidayInfo(iso).isHoliday && cur.getDay() !== 0) {
      overlapHolidayCount += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return overlapHolidayCount;
}

export interface MonthlyPaidLeaveSummary {
  maxMonthlyCap: number;
  maxShortSickCap: number;
  usedApproved: number;
  pendingMonthly: number;
  totalUsedAndPending: number;
  remainingMonthly: number;
  sickShortUsedOrPending: number;
  sickShortRemaining: number;
}

export function computeMonthlyPaidLeaveSummary(
  emp?: Partial<Employee> | null,
  leaveRequests: LeaveRequest[] = [],
  yearMonth: string = '2026-10'
): MonthlyPaidLeaveSummary {
  const isSameEmployee = (l: LeaveRequest) =>
    Boolean((emp?.id && l.employeeId === emp.id) || (emp?.employeeCode && l.employeeCode === emp.employeeCode));

  const monthLeaves = leaveRequests.filter(
    (l) => isSameEmployee(l) && l.status !== 'REJECTED' && String(l.startDate || '').startsWith(yearMonth)
  );

  const usedApproved = monthLeaves
    .filter((l) => l.status === 'APPROVED' && isMonthlyCappedPaidLeaveType(l.leaveType))
    .reduce((sum, l) => sum + (Number(l.daysCount) || 0), 0);

  const pendingMonthly = monthLeaves
    .filter((l) => String(l.status || '').startsWith('PENDING') && isMonthlyCappedPaidLeaveType(l.leaveType))
    .reduce((sum, l) => sum + (Number(l.daysCount) || 0), 0);

  const totalUsedAndPending = Number((usedApproved + pendingMonthly).toFixed(1));
  const remainingMonthly = Math.max(0, Number((MAX_PAID_LEAVE_DAYS_PER_MONTH - totalUsedAndPending).toFixed(1)));

  const sickShortUsedOrPending = Number(
    monthLeaves
      .filter((l) => isShortSickLeaveType(l.leaveType))
      .reduce((sum, l) => sum + (Number(l.daysCount) || 0), 0)
      .toFixed(1)
  );
  const sickShortRemaining = Math.max(0, Number((MAX_SHORT_SICK_DAYS_PER_MONTH - sickShortUsedOrPending).toFixed(1)));

  return {
    maxMonthlyCap: MAX_PAID_LEAVE_DAYS_PER_MONTH,
    maxShortSickCap: MAX_SHORT_SICK_DAYS_PER_MONTH,
    usedApproved: Number(usedApproved.toFixed(1)),
    pendingMonthly: Number(pendingMonthly.toFixed(1)),
    totalUsedAndPending,
    remainingMonthly,
    sickShortUsedOrPending,
    sickShortRemaining,
  };
}

export interface ValidateLeaveSubmissionInput {
  employee?: Partial<Employee> | null;
  leaveType: LeaveType;
  halfDaySession?: HalfDaySession;
  startDate: string;
  endDate: string;
  daysCount: number;
  rawWorkingDays: number;
  reason: string;
  attachmentName?: string;
  existingLeaves: LeaveRequest[];
  todayIso: string;
}

export function validateLeaveSubmission(
  input: ValidateLeaveSubmissionInput
): {
  valid: true;
  normalizedDaysCount: number;
  overlapHolidayCount: number;
  quota: AnnualLeaveQuotaSummary;
  monthlyQuota: MonthlyPaidLeaveSummary;
  exceedsMonthlyPaidCap?: boolean;
} | { valid: false; error: string } {
  const {
    employee,
    leaveType,
    halfDaySession = 'FULL_DAY',
    startDate,
    endDate,
    daysCount,
    rawWorkingDays,
    reason,
    attachmentName,
    existingLeaves,
    todayIso,
  } = input;

  if (!reason || !reason.trim()) {
    return { valid: false, error: 'Lỗi: Vui lòng nhập lý do xin nghỉ phép hợp lệ (không được chỉ chứa khoảng trắng).' };
  }

  const attCheck = validateLeaveAttachmentName(attachmentName);
  if (!attCheck.valid) {
    return { valid: false, error: attCheck.error! };
  }

  if (!startDate || !endDate) {
    return { valid: false, error: 'Vui lòng chọn đầy đủ Từ ngày và Đến hết ngày!' };
  }

  if (startDate < todayIso) {
    return { valid: false, error: 'Lỗi (TC 23): Ngày bắt đầu xin nghỉ phép không được chọn ngày trong quá khứ!' };
  }

  if (endDate < startDate) {
    return { valid: false, error: `Lỗi thời gian nghỉ: Ngày kết thúc (${endDate}) không được nhỏ hơn Từ ngày (${startDate})!` };
  }

  const isHalfDay = halfDaySession === 'MORNING' || halfDaySession === 'AFTERNOON';
  if (isHalfDay && startDate !== endDate) {
    return {
      valid: false,
      error: 'Nghỉ nửa ngày (Buổi sáng / Buổi chiều = 0,5 ngày công) chỉ áp dụng khi Từ ngày trùng Đến ngày!',
    };
  }

  const normalizedDaysCount = isHalfDay ? 0.5 : daysCount;

  const overlapHolidayCount = countStatutoryHolidayOverlap(startDate, endDate);
  if (rawWorkingDays <= 0) {
    return { valid: false, error: 'Lỗi: Khoảng ngày nghỉ đã chọn rơi vào Chủ Nhật (0 ngày làm việc) hoặc không hợp lệ!' };
  }
  if (normalizedDaysCount <= 0 && overlapHolidayCount > 0) {
    return {
      valid: false,
      error: 'Thông báo BF-06: Toàn bộ khoảng ngày đã chọn trùng với ngày Lễ/Tết được hưởng nguyên lương cơ bản theo Điều 112 BLLĐ, không cần gửi đơn trừ phép!',
    };
  }
  if (normalizedDaysCount <= 0) {
    return { valid: false, error: 'Số ngày nghỉ tính công phải lớn hơn 0!' };
  }

  const overlappingLeave = existingLeaves.find((l) => {
    const sameEmp = Boolean(
      (employee?.id && l.employeeId === employee.id) || (employee?.employeeCode && l.employeeCode === employee.employeeCode)
    );
    if (!sameEmp || l.status === 'REJECTED') return false;
    const datesOverlap = l.startDate <= endDate && l.endDate >= startDate;
    if (!datesOverlap) return false;
    const existingSession = (l.halfDaySession || 'FULL_DAY').toUpperCase();
    if (
      (halfDaySession === 'MORNING' && existingSession === 'AFTERNOON') ||
      (halfDaySession === 'AFTERNOON' && existingSession === 'MORNING')
    ) {
      return false;
    }
    return true;
  });
  if (overlappingLeave) {
    return {
      valid: false,
      error: `Lỗi trùng lịch (BF-06 Bước 4): Khoảng ngày ${startDate} → ${endDate} trùng với đơn nghỉ phép #NP-${overlappingLeave.id} (${overlappingLeave.startDate} → ${overlappingLeave.endDate})!`,
    };
  }

  const policy = getLeavePolicy(leaveType);
  if (policy.maxDaysPerRequest && normalizedDaysCount > policy.maxDaysPerRequest && !isShortSickLeaveType(leaveType)) {
    return {
      valid: false,
      error: `Vượt hạn mức ${policy.lawRef}: Chế độ "${policy.label}" tối đa ${policy.maxDaysPerRequest} ngày/lần (đang chọn ${normalizedDaysCount} ngày).`,
    };
  }

  const ym = startDate.slice(0, 7);
  const monthlyQuota = computeMonthlyPaidLeaveSummary(employee, existingLeaves, ym);
  if (isShortSickLeaveType(leaveType) && normalizedDaysCount > monthlyQuota.sickShortRemaining + 1e-6) {
    return {
      valid: false,
      error: `Vượt hạn mức Nghỉ ốm ngắn ngày (${monthlyQuota.sickShortUsedOrPending}/${MAX_SHORT_SICK_DAYS_PER_MONTH} ngày trong tháng ${ym}). Nếu điều trị dài hạn / nằm viện (> 2 ngày/tháng), vui lòng chọn "Nghỉ ốm dài ngày (Không tính lương)"!`,
    };
  }

  const quota = computeAnnualLeaveQuota(employee, existingLeaves);
  if (policy.deductsAnnualQuota && normalizedDaysCount > quota.remaining) {
    return {
      valid: false,
      error: `Vượt Quỹ Phép Năm (${policy.lawRef}): Quỹ phép năm hiện chỉ còn ${quota.remaining}/${quota.totalEntitled} ngày, không đủ cho đơn xin nghỉ ${normalizedDaysCount} ngày! Vui lòng giảm số ngày hoặc chọn "Nghỉ Không Hưởng Lương".`,
    };
  }

  const exceedsMonthlyPaidCap =
    isMonthlyCappedPaidLeaveType(leaveType) && normalizedDaysCount > monthlyQuota.remainingMonthly + 1e-6;

  return {
    valid: true,
    normalizedDaysCount,
    overlapHolidayCount,
    quota,
    monthlyQuota,
    exceedsMonthlyPaidCap,
  };
}
