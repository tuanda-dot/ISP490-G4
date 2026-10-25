export type Role =
  | 'SYSTEM_ADMIN'
  | 'ADMIN'
  | 'DIRECTOR'
  | 'CEO'
  | 'HR_MANAGER'
  | 'HR_STAFF'
  | 'CHIEF_ACCOUNTANT'
  | 'ACCOUNTANT'
  | 'SITE_MANAGER'
  | 'SITE_ENGINEER'
  | 'OFFICE_STAFF';

export type EmployeeType = 'OFFICE_STAFF' | 'SITE_ENGINEER';
export type ContractType = 'OFFICIAL_DEFINITE' | 'OFFICIAL_INDEFINITE' | 'PROBATION' | 'EXPERT_CONSULTANT';
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type PayrollStatus = 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PAID';

export interface UserPrincipal {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  employeeCode: string;
  employeeType: EmployeeType;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer' | 'PreAuth';
  mustChangePassword: boolean;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: Role;
  message: string;
}

export interface Payroll {
  id: number;
  payrollCode: string;
  month: number;
  year: number;
  standardWorkDays: number;
  status: PayrollStatus;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalEmployerCost: number;
  isAccountingBalanced: boolean;
  accountingVoucherNo?: string;
}

export interface ExecutiveDashboardResponse {
  latestPayroll: Payroll | null;
  totalEmployees: number;
  totalOfficeStaff: number;
  totalSiteEngineers: number;
  totalActiveProjects: number;
  costAllocationByAccount: {
    TK_622?: number;
    TK_627?: number;
    TK_642?: number;
    [key: string]: number | undefined;
  };
  totalCostAllocated: number;
  isBalanced: boolean;
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  citizenId?: string;
  position?: string;
  departmentId?: number;
  employeeType: EmployeeType;
  baseSalary: number;
  dependentsCount: number;
  isUnionMember: boolean;
  isFaceRegistered: boolean;
  faceImageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  hireDate?: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  siteManagerId?: number;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
}

export interface Contract {
  id: number;
  contractNumber: string;
  employeeId: number;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  insuranceFlag: string;
  taxFlag: string;
  status: ContractStatus;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  workDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'OVERTIME';
  checkInMethod: 'FACE_ID' | 'MOBILE_GPS_OTP' | 'MANUAL';
  latitude?: number;
  longitude?: number;
  inGeofence: boolean;
  distanceMeters?: number;
  locationName?: string;
  deviceFingerprint?: string;
  faceConfidenceScore?: number;
}

export interface DailySiteOtp {
  id: number;
  projectId: number;
  otpCode: string;
  generatedDate: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface EngineerAssignment {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  projectId: number;
  roleOnSite: string; // Chỉ huy phó, Kỹ sư giám sát kết cấu, Kỹ sư MEP, Cán bộ an toàn HSE, Kỹ sư QS
  assignedDate: string;
  releaseDate?: string;
  status: 'ACTIVE' | 'RELEASED';
}

export type OvertimeType = 'WEEKDAY_150' | 'WEEKEND_200' | 'HOLIDAY_300' | 'NIGHT_SHIFT_ADDITIONAL';
export type RequestApprovalStatus = 'PENDING_SM' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  projectId: number;
  projectName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  otHours: number;
  otType: OvertimeType;
  multiplier: number;
  reason: string;
  siteManagerApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  hrApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: RequestApprovalStatus;
  createdAt: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  leaveType: 'ANNUAL' | 'COMPENSATORY' | 'SICK' | 'SPECIAL_PAID' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export type AttendanceExplanationType = 'MISSING_CHECKIN' | 'MISSING_CHECKOUT' | 'GPS_DEVIATION' | 'DEVICE_ERROR' | 'OUTSIDE_ASSIGNMENT';

export interface AttendanceExplanationRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  projectId?: number;
  projectName?: string;
  targetDate: string;
  explanationType: AttendanceExplanationType;
  suggestedCheckIn?: string;
  suggestedCheckOut?: string;
  reason: string;
  evidenceUrl?: string;
  siteManagerApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  hrApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: RequestApprovalStatus;
  createdAt: string;
}

export interface ComplianceRuleItem {
  id: number;
  ruleKey: string;
  ruleName: string;
  ruleValue: number | string;
  unit: string;
  effectiveDate: string;
  legalReference: string;
  description: string;
  category: 'INSURANCE' | 'TAX' | 'LABOR_LAW' | 'OVERTIME';
  isActive: boolean;
}

export interface SalaryScaleGrade {
  id: number;
  scaleCode: string;
  scaleName: string;
  category: 'OFFICE' | 'SITE';
  level: number;
  levelName: string;
  baseSalary: number;
  coefficient: number;
  accountCode: 'TK_642' | 'TK_627';
  insuranceRule: string;
  description: string;
}

export interface SalaryAllowanceItem {
  id: number;
  code: string;
  name: string;
  componentType: 'ALLOWANCE' | 'BONUS' | 'DEDUCTION';
  amount: number;
  applicableScope: 'ALL' | 'OFFICE_STAFF' | 'SITE_ENGINEER';
  isInsuranceBase: boolean;
  isTaxable: boolean;
  isProratedByDays: boolean;
  defaultAccountCode: 'TK_622' | 'TK_627' | 'TK_642';
  legalBasis: string;
  isActive: boolean;
  note: string;
}

export interface FormulaSimulationResult {
  employeeCode: string;
  fullName: string;
  position: string;
  employeeType: EmployeeType;
  accountCode: 'TK_642' | 'TK_627';
  baseSalary: number;
  standardDays: number;
  actualDays: number;
  timeSalary: number;
  otWeekdayHours: number;
  otWeekendHours: number;
  otPay: number;
  allowanceTotal: number;
  allowances: { name: string; amount: number; isTaxable: boolean; isInsurance: boolean }[];
  grossSalary: number;
  insuranceBase: number;
  insuranceCapped: boolean;
  employeeInsurance: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
    total: number;
  };
  employerInsurance: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
    tnldBnn: number;
    unionFee: number;
    total: number;
  };
  personalDeduction: number;
  dependentsCount: number;
  dependentDeduction: number;
  taxableIncome: number;
  pitTax: number;
  unionDues: number;
  netSalary: number;
  totalCompanyCost: number;
}
