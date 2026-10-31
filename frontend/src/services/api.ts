import axios from 'axios';
import type {
  LoginResponse,
  ExecutiveDashboardResponse,
  Employee,
  Project,
  Contract,
  DailySiteOtp,
  AttendanceRecord,
  EngineerAssignment,
  OvertimeRequest,
  LeaveRequest,
  AttendanceExplanationRequest,
  Role
} from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request interceptor: Attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hmcps_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto logout if on login screen
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('hmcps_access_token');
        localStorage.removeItem('hmcps_user');
      }
    }
    return Promise.reject(error);
  }
);

// Fallback Mock Data matching DataInitializer for robust standalone demo
export const mockDashboardData: ExecutiveDashboardResponse = {
  latestPayroll: {
    id: 1,
    payrollCode: 'PR-2026-10',
    month: 10,
    year: 2026,
    standardWorkDays: 26,
    status: 'REVIEWED',
    totalGrossSalary: 345000000,
    totalNetSalary: 298500000,
    totalEmployerCost: 78200000,
    isAccountingBalanced: true,
    accountingVoucherNo: 'PKT-2026-10-001',
  },
  totalEmployees: 13,
  totalOfficeStaff: 7,
  totalSiteEngineers: 6,
  totalActiveProjects: 3,
  costAllocationByAccount: {
    TK_622: 175000000, // Chi phí Nhân công trực tiếp thi công
    TK_627: 110000000, // Chi phí Nhân sự giám sát / Ban chỉ huy công trường
    TK_642: 60000000,  // Chi phí Quản lý doanh nghiệp / Khối văn phòng
  },
  totalCostAllocated: 345000000,
  isBalanced: true,
};

export const mockEmployees: Employee[] = [
  {
    id: 1,
    employeeCode: 'HM-001',
    fullName: 'Lê Phúc Hà',
    email: 'ceo.ha@haiminh.vn',
    phone: '0901234567',
    citizenId: '001099000001',
    position: 'Tổng Giám Đốc',
    departmentId: 1,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 60000000,
    dependentsCount: 1,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2020-01-01',
  },
  {
    id: 2,
    employeeCode: 'HM-002',
    fullName: 'Đoàn Anh Tuấn',
    email: 'ketoantruong.tuan@haiminh.vn',
    phone: '0901234568',
    citizenId: '001099000002',
    position: 'Kế Toán Trưởng',
    departmentId: 2,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 45000000,
    dependentsCount: 2,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2021-03-15',
  },
  {
    id: 3,
    employeeCode: 'HM-003',
    fullName: 'Nguyễn Hữu Thịnh',
    email: 'admin.thinh@haiminh.vn',
    phone: '0901234569',
    citizenId: '001099000003',
    position: 'Quản Trị Hệ Thống (System Admin)',
    departmentId: 1,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 35000000,
    dependentsCount: 0,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2022-05-10',
  },
  {
    id: 4,
    employeeCode: 'HM-004',
    fullName: 'Nguyễn Thu Giang',
    email: 'hr.giang@haiminh.vn',
    phone: '0901234570',
    citizenId: '001099000004',
    position: 'Trưởng Phòng Nhân Sự',
    departmentId: 3,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 32000000,
    dependentsCount: 1,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2021-08-01',
  },
  {
    id: 5,
    employeeCode: 'HM-005',
    fullName: 'Nguyễn Lê Gia Phát',
    email: 'chihuytruong.phat@haiminh.vn',
    phone: '0901234571',
    citizenId: '001099000005',
    position: 'Chỉ Huy Trưởng Công Trường',
    departmentId: 4,
    employeeType: 'SITE_ENGINEER',
    baseSalary: 38000000,
    dependentsCount: 1,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2022-01-15',
  },
  {
    id: 6,
    employeeCode: 'HM-006',
    fullName: 'Trần Văn Trung',
    email: 'kysu.trung@haiminh.vn',
    phone: '0901234572',
    citizenId: '001099000006',
    position: 'Kỹ Sư Kết Cấu Hiện Trường',
    departmentId: 4,
    employeeType: 'SITE_ENGINEER',
    baseSalary: 25000000,
    dependentsCount: 0,
    isUnionMember: true,
    isFaceRegistered: false,
    status: 'ACTIVE',
    hireDate: '2023-04-10',
  },
  {
    id: 7,
    employeeCode: 'HM-007',
    fullName: 'Phạm Thành Nam',
    email: 'kysu.nam@haiminh.vn',
    phone: '0901234573',
    citizenId: '001099000007',
    position: 'Kỹ Sư Cơ Điện MEP',
    departmentId: 4,
    employeeType: 'SITE_ENGINEER',
    baseSalary: 24000000,
    dependentsCount: 1,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2023-07-01',
  },
  {
    id: 15,
    employeeCode: 'HM-015',
    fullName: 'Phạm Thị Mai',
    email: 'hrstaff.mai@haiminh.vn',
    phone: '0901234588',
    citizenId: '001099000015',
    position: 'Chuyên Viên Nhân Sự & Phân Ca',
    departmentId: 3,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 22000000,
    dependentsCount: 0,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2024-02-15',
  },
  {
    id: 16,
    employeeCode: 'HM-016',
    fullName: 'Hoàng Thị Lan',
    email: 'ketoan.lan@haiminh.vn',
    phone: '0901234589',
    citizenId: '001099000016',
    position: 'Chuyên Viên Kế Toán Tiền Lương (Maker)',
    departmentId: 2,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 23000000,
    dependentsCount: 1,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2023-11-01',
  },
  {
    id: 17,
    employeeCode: 'HM-017',
    fullName: 'Vũ Hải Đăng',
    email: 'vanphong.dang@haiminh.vn',
    phone: '0901234590',
    citizenId: '001099000017',
    position: 'Chuyên Viên Kỹ Thuật Khối Văn Phòng',
    departmentId: 1,
    employeeType: 'OFFICE_STAFF',
    baseSalary: 21000000,
    dependentsCount: 0,
    isUnionMember: true,
    isFaceRegistered: true,
    status: 'ACTIVE',
    hireDate: '2024-05-10',
  },
];

export const mockProjects: Project[] = [
  {
    id: 1,
    code: 'DA-NHATTAN2',
    name: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
    address: 'Bắc Từ Liêm & Đông Anh, Hà Nội',
    latitude: 21.092789,
    longitude: 105.819445,
    geofenceRadiusMeters: 200,
    siteManagerId: 5,
    startDate: '2026-01-10',
    endDate: '2027-12-30',
    status: 'ACTIVE',
  },
  {
    id: 2,
    code: 'DA-LANDMARK',
    name: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
    address: 'Khu Đô Thị Tây Hồ Tây, Tây Hồ, Hà Nội',
    latitude: 21.055812,
    longitude: 105.795244,
    geofenceRadiusMeters: 150,
    siteManagerId: 5,
    startDate: '2025-06-01',
    endDate: '2027-06-01',
    status: 'ACTIVE',
  },
  {
    id: 3,
    code: 'DA-CAOTOC-BN',
    name: 'Gói Thầu 04 - Cao Tốc Bắc Nam (Đoạn Diễn Châu - Bãi Vọt)',
    address: 'Hà Tĩnh - Nghệ An',
    latitude: 18.673891,
    longitude: 105.681112,
    geofenceRadiusMeters: 500,
    siteManagerId: 5,
    startDate: '2025-09-15',
    endDate: '2026-12-31',
    status: 'ACTIVE',
  },
];

export const mockEngineerAssignments: EngineerAssignment[] = [
  {
    id: 1,
    employeeId: 5,
    employeeName: 'Nguyễn Lê Gia Phát',
    employeeCode: 'HM-005',
    projectId: 1,
    roleOnSite: 'Chỉ huy trưởng',
    assignedDate: '2026-01-01',
    status: 'ACTIVE',
  },
  {
    id: 2,
    employeeId: 8,
    employeeName: 'Đặng Hoàng Nam',
    employeeCode: 'HM-008',
    projectId: 1,
    roleOnSite: 'Kỹ sư An toàn Lao động (HSE)',
    assignedDate: '2026-02-01',
    status: 'ACTIVE',
  },
  {
    id: 3,
    employeeId: 9,
    employeeName: 'Bùi Thanh Tùng',
    employeeCode: 'HM-009',
    projectId: 1,
    roleOnSite: 'Kỹ sư Giám sát Kết cấu',
    assignedDate: '2026-02-15',
    status: 'ACTIVE',
  },
  {
    id: 4,
    employeeId: 6,
    employeeName: 'Hoàng Văn Long',
    employeeCode: 'HM-006',
    projectId: 2,
    roleOnSite: 'Chỉ huy trưởng',
    assignedDate: '2025-06-01',
    status: 'ACTIVE',
  },
  {
    id: 5,
    employeeId: 10,
    employeeName: 'Vũ Đức Thắng',
    employeeCode: 'HM-010',
    projectId: 2,
    roleOnSite: 'Kỹ sư Cơ điện (MEP)',
    assignedDate: '2025-07-01',
    status: 'ACTIVE',
  },
  {
    id: 6,
    employeeId: 11,
    employeeName: 'Ngô Quang Huy',
    employeeCode: 'HM-011',
    projectId: 2,
    roleOnSite: 'Kỹ sư Dự toán & Khối lượng QS',
    assignedDate: '2025-08-01',
    status: 'ACTIVE',
  },
  {
    id: 7,
    employeeId: 12,
    employeeName: 'Dương Văn Lâm',
    employeeCode: 'HM-012',
    projectId: 3,
    roleOnSite: 'Kỹ sư Trắc địa Hiện trường',
    assignedDate: '2025-09-15',
    status: 'ACTIVE',
  },
  {
    id: 8,
    employeeId: 13,
    employeeName: 'Trần Minh Quân',
    employeeCode: 'HM-013',
    projectId: 3,
    roleOnSite: 'Kỹ sư Vật tư & Thiết bị',
    assignedDate: '2025-10-01',
    status: 'ACTIVE',
  },
];

export const mockExpiringContracts: Contract[] = [
  {
    id: 10,
    contractNumber: 'HDLD-HM-2025/089',
    employeeId: 6,
    contractType: 'OFFICIAL_DEFINITE',
    startDate: '2025-11-15',
    endDate: '2026-11-14',
    baseSalary: 25000000,
    insuranceFlag: 'FULL',
    taxFlag: 'PROGRESSIVE',
    status: 'ACTIVE',
  },
  {
    id: 11,
    contractNumber: 'HDLD-HM-2026/012',
    employeeId: 7,
    contractType: 'PROBATION',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    baseSalary: 20400000,
    insuranceFlag: 'FULL',
    taxFlag: 'PROGRESSIVE',
    status: 'ACTIVE',
  },
];

export const mockAttendanceHistory: AttendanceRecord[] = [
  {
    id: 101,
    employeeId: 1,
    employeeCode: 'HM-001',
    employeeName: 'Lê Phúc Hà',
    workDate: '2026-10-21',
    checkInTime: '07:45:12',
    status: 'PRESENT',
    checkInMethod: 'FACE_ID',
    locationName: 'Trụ Sở Hải Minh Tower (P.1802)',
    distanceMeters: 32,
    inGeofence: true,
    faceConfidenceScore: 99.4,
    deviceFingerprint: 'MacBookPro / Safari 18.2',
  },
  {
    id: 102,
    employeeId: 5,
    employeeCode: 'HM-005',
    employeeName: 'Nguyễn Lê Gia Phát',
    workDate: '2026-10-21',
    checkInTime: '06:55:04',
    status: 'PRESENT',
    checkInMethod: 'MOBILE_GPS_OTP',
    locationName: 'Cầu Nhật Tân 2 (Trạm Chỉ Huy)',
    distanceMeters: 45,
    inGeofence: true,
    faceConfidenceScore: 98.2,
    deviceFingerprint: 'iPhone 15 Pro / iOS 18',
  },
  {
    id: 103,
    employeeId: 6,
    employeeCode: 'HM-006',
    employeeName: 'Trần Văn Trung',
    workDate: '2026-10-21',
    checkInTime: '07:05:22',
    status: 'PRESENT',
    checkInMethod: 'MOBILE_GPS_OTP',
    locationName: 'Tháp Landmark Hải Minh',
    distanceMeters: 62,
    inGeofence: true,
    faceConfidenceScore: 97.6,
    deviceFingerprint: 'Samsung Galaxy S24 / Android 15',
  },
  {
    id: 104,
    employeeId: 7,
    employeeCode: 'HM-007',
    employeeName: 'Phạm Thành Nam',
    workDate: '2026-10-21',
    checkInTime: '07:15:30',
    status: 'PRESENT',
    checkInMethod: 'MOBILE_GPS_OTP',
    locationName: 'Cầu Nhật Tân 2 (Gói Kỹ Thuật)',
    distanceMeters: 78,
    inGeofence: true,
    faceConfidenceScore: 98.8,
    deviceFingerprint: 'Xiaomi 14 / Android 14',
  },
  {
    id: 105,
    employeeId: 2,
    employeeCode: 'HM-002',
    employeeName: 'Đoàn Anh Tuấn',
    workDate: '2026-10-21',
    checkInTime: '07:50:18',
    status: 'PRESENT',
    checkInMethod: 'FACE_ID',
    locationName: 'Trụ Sở Hải Minh Tower (P.1802)',
    distanceMeters: 28,
    inGeofence: true,
    faceConfidenceScore: 99.1,
    deviceFingerprint: 'ThinkPad T14 / Win 11 Chrome',
  },
  {
    id: 106,
    employeeId: 3,
    employeeCode: 'HM-003',
    employeeName: 'Nguyễn Hữu Thịnh',
    workDate: '2026-10-21',
    checkInTime: '08:03:42',
    status: 'LATE',
    checkInMethod: 'FACE_ID',
    locationName: 'Trụ Sở Hải Minh Tower (P.1802)',
    distanceMeters: 38,
    inGeofence: true,
    faceConfidenceScore: 98.9,
    deviceFingerprint: 'Dell XPS 15 / Win 11 Edge',
  },
];

export const mockOvertimeRequests: OvertimeRequest[] = [
  {
    id: 1,
    employeeId: 6,
    employeeCode: 'HM-006',
    employeeName: 'Trần Văn Trung',
    projectId: 2,
    projectName: 'Tổ Hợp Tháp Landmark Hải Minh',
    workDate: '2026-10-21',
    startTime: '18:00',
    endTime: '22:00',
    otHours: 4,
    otType: 'WEEKDAY_150',
    multiplier: 1.5,
    reason: 'Đổ bê tông dầm sàn tầng 14 tháp Landmark qua đêm, yêu cầu giám sát liên tục.',
    siteManagerApproval: 'APPROVED',
    hrApproval: 'PENDING',
    status: 'PENDING_HR',
    createdAt: '2026-10-21 09:30',
  },
  {
    id: 2,
    employeeId: 7,
    employeeCode: 'HM-007',
    employeeName: 'Phạm Thành Nam',
    projectId: 1,
    projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
    workDate: '2026-10-22',
    startTime: '22:00',
    endTime: '04:00',
    otHours: 6,
    otType: 'NIGHT_SHIFT_ADDITIONAL',
    multiplier: 1.8,
    reason: 'Kéo cáp dự ứng lực khoang nhịp K12 ban đêm để tránh giãn nở nhiệt.',
    siteManagerApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    status: 'APPROVED',
    createdAt: '2026-10-20 16:15',
  },
  {
    id: 3,
    employeeId: 5,
    employeeCode: 'HM-005',
    employeeName: 'Nguyễn Lê Gia Phát',
    projectId: 1,
    projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
    workDate: '2026-10-18',
    startTime: '08:00',
    endTime: '17:00',
    otHours: 8,
    otType: 'WEEKEND_200',
    multiplier: 2.0,
    reason: 'Trực chỉ huy cứu hộ đê bao & an toàn thi công trụ cầu ngày Chủ Nhật.',
    siteManagerApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    status: 'APPROVED',
    createdAt: '2026-10-17 14:00',
  },
  {
    id: 4,
    employeeId: 6,
    employeeCode: 'HM-006',
    employeeName: 'Trần Văn Trung',
    projectId: 2,
    projectName: 'Tổ Hợp Tháp Landmark Hải Minh',
    workDate: '2026-10-23',
    startTime: '18:00',
    endTime: '21:00',
    otHours: 3,
    otType: 'WEEKDAY_150',
    multiplier: 1.5,
    reason: 'Khảo sát trắc địa tim trục dầm thép tầng chuyển kết cấu.',
    siteManagerApproval: 'PENDING',
    hrApproval: 'PENDING',
    status: 'PENDING_SM',
    createdAt: '2026-10-21 11:20',
  },
];

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 1,
    employeeId: 4,
    employeeCode: 'HM-004',
    employeeName: 'Nguyễn Thu Giang',
    leaveType: 'ANNUAL',
    startDate: '2026-10-27',
    endDate: '2026-10-28',
    daysCount: 2,
    reason: 'Nghỉ phép thường niên theo quy định công ty.',
    status: 'APPROVED',
    createdAt: '2026-10-20 08:30',
  },
  {
    id: 2,
    employeeId: 6,
    employeeCode: 'HM-006',
    employeeName: 'Trần Văn Trung',
    leaveType: 'COMPENSATORY',
    startDate: '2026-10-24',
    endDate: '2026-10-24',
    daysCount: 1,
    reason: 'Nghỉ bù sau ca trực đổ bê tông đêm 21/10 tại công trường Landmark.',
    status: 'PENDING',
    createdAt: '2026-10-21 10:00',
  },
  {
    id: 3,
    employeeId: 7,
    employeeCode: 'HM-007',
    employeeName: 'Phạm Thành Nam',
    leaveType: 'SICK',
    startDate: '2026-10-15',
    endDate: '2026-10-16',
    daysCount: 2,
    reason: 'Khám sức khỏe và điều trị tại bệnh viện (đã nộp giấy nghỉ hưởng BHXH).',
    status: 'APPROVED',
    createdAt: '2026-10-14 17:00',
  },
];

export const mockAttendanceExplanations: AttendanceExplanationRequest[] = [
  {
    id: 1,
    employeeId: 5,
    employeeCode: 'HM-005',
    employeeName: 'Nguyễn Lê Gia Phát',
    projectId: 1,
    projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
    targetDate: '2026-10-18',
    explanationType: 'GPS_DEVIATION',
    suggestedCheckIn: '07:05',
    suggestedCheckOut: '17:15',
    reason: 'Thi công đổ bê tông mố trụ dưới chân cầu, tín hiệu GPS vệ tinh bị che khuất bởi kết cấu dầm thép.',
    siteManagerApproval: 'APPROVED',
    hrApproval: 'PENDING',
    status: 'PENDING_HR',
    createdAt: '2026-10-18 18:30',
  },
  {
    id: 2,
    employeeId: 6,
    employeeCode: 'HM-006',
    employeeName: 'Trần Văn Trung',
    projectId: 2,
    projectName: 'Tổ Hợp Tháp Landmark Hải Minh',
    targetDate: '2026-10-19',
    explanationType: 'MISSING_CHECKOUT',
    suggestedCheckIn: '07:30',
    suggestedCheckOut: '17:00',
    reason: 'Hết pin điện thoại vào cuối ca trực do kiểm tra an toàn giàn giáo liên tục trên tầng cao.',
    siteManagerApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    status: 'APPROVED',
    createdAt: '2026-10-20 08:15',
  },
  {
    id: 3,
    employeeId: 7,
    employeeCode: 'HM-007',
    employeeName: 'Phạm Thành Nam',
    projectId: 1,
    projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
    targetDate: '2026-10-20',
    explanationType: 'DEVICE_ERROR',
    suggestedCheckIn: '07:00',
    suggestedCheckOut: '17:00',
    reason: 'Ứng dụng camera gặp lỗi tải Face ID khi mất kết nối 4G tại khu vực bãi đúc dầm.',
    siteManagerApproval: 'PENDING',
    hrApproval: 'PENDING',
    status: 'PENDING_SM',
    createdAt: '2026-10-20 18:00',
  },
];

// Service Calls
export const api = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const res = await apiClient.post<{ data: LoginResponse }>('/v1/auth/login', { email, password });
      return res.data.data;
    } catch {
      if (email === 'newbie.engineer@haiminh.vn' || email === 'tanbinh.kysu@haiminh.vn') {
        return {
          accessToken: 'mock_preauth_token_777',
          refreshToken: '',
          tokenType: 'PreAuth',
          mustChangePassword: true,
          employeeId: 14,
          employeeCode: 'HM-014',
          fullName: 'Đặng Tuấn Tú (Tân Kỹ Sư)',
          email: 'newbie.engineer@haiminh.vn',
          role: 'SITE_ENGINEER',
          message: 'Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên (PreAuth Token).',
        };
      }

      // Fallback matching seed data
      const matched = mockEmployees.find((e) => e.email === email);
      if (matched && password === 'Password123@') {
        let role: Role = 'OFFICE_STAFF';
        if (matched.email.startsWith('admin')) {
          role = 'SYSTEM_ADMIN';
        } else if (matched.email.startsWith('ceo') || matched.email.startsWith('director')) {
          role = 'DIRECTOR';
        } else if (matched.email === 'ketoantruong.tuan@haiminh.vn') {
          role = 'CHIEF_ACCOUNTANT';
        } else if (matched.email.startsWith('ketoan')) {
          role = 'ACCOUNTANT';
        } else if (matched.email === 'hr.giang@haiminh.vn') {
          role = 'HR_MANAGER';
        } else if (matched.email.startsWith('hr')) {
          role = 'HR_STAFF';
        } else if (matched.email.startsWith('chihuy')) {
          role = 'SITE_MANAGER';
        } else if (matched.email.startsWith('kysu') || matched.email.startsWith('newbie')) {
          role = 'SITE_ENGINEER';
        } else {
          role = 'OFFICE_STAFF';
        }

        return {
          accessToken: 'mock_jwt_token_' + matched.id,
          refreshToken: 'mock_refresh_token_' + matched.id,
          tokenType: 'Bearer',
          mustChangePassword: false,
          employeeId: matched.id,
          employeeCode: matched.employeeCode,
          fullName: matched.fullName,
          email: matched.email,
          role,
          message: 'Đăng nhập thành công',
        };
      }
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }
  },

  forceChangePassword: async (currentPassword: string, newPassword: string): Promise<LoginResponse> => {
    try {
      const res = await apiClient.post<{ data: LoginResponse }>('/v1/auth/force-change-password', {
        currentPassword,
        newPassword,
      });
      return res.data.data;
    } catch {
      return {
        accessToken: 'mock_jwt_token_activated_user',
        refreshToken: 'mock_refresh_token_activated_user',
        tokenType: 'Bearer',
        mustChangePassword: false,
        employeeId: 14,
        employeeCode: 'HM-014',
        fullName: 'Đặng Tuấn Tú (Tân Kỹ Sư)',
        email: 'newbie.engineer@haiminh.vn',
        role: 'SITE_ENGINEER',
        message: 'Đổi mật khẩu thành công. Tài khoản đã được kích hoạt hoàn toàn.',
      };
    }
  },

  // Dashboard
  getExecutiveDashboard: async (month?: number, year?: number): Promise<ExecutiveDashboardResponse> => {
    try {
      const res = await apiClient.get<ExecutiveDashboardResponse>('/dashboard/executive', {
        params: { month, year },
      });
      return res.data;
    } catch {
      return mockDashboardData;
    }
  },

  // Employees
  getEmployees: async (departmentId?: number): Promise<Employee[]> => {
    try {
      const res = await apiClient.get<Employee[]>('/employees', {
        params: { departmentId },
      });
      return res.data;
    } catch {
      return mockEmployees;
    }
  },

  getExpiringContracts: async (days = 30): Promise<Contract[]> => {
    try {
      const res = await apiClient.get<Contract[]>('/employees/contracts/expiring', {
        params: { daysThreshold: days },
      });
      return res.data;
    } catch {
      return mockExpiringContracts;
    }
  },

  registerFaceId: async (employeeId: number, faceImageUrl: string, faceEmbedding: string) => {
    try {
      const res = await apiClient.post(`/employees/${employeeId}/register-face`, {
        faceImageUrl,
        faceEmbedding,
      });
      return res.data;
    } catch {
      return { success: true, message: 'Đăng ký Face ID thành công (demo)' };
    }
  },

  // Projects & Geofence
  getProjects: async (): Promise<Project[]> => {
    try {
      const res = await apiClient.get<Project[]>('/projects');
      return res.data;
    } catch {
      return mockProjects;
    }
  },

  createProject: async (projectData: Partial<Project>): Promise<Project> => {
    try {
      const res = await apiClient.post<Project>('/projects', projectData);
      return res.data;
    } catch {
      const newProj: Project = {
        id: Date.now(),
        code: projectData.code || `DA-${Date.now().toString().slice(-4)}`,
        name: projectData.name || 'Dự án mới',
        address: projectData.address || '',
        latitude: projectData.latitude || 21.0285,
        longitude: projectData.longitude || 105.8542,
        geofenceRadiusMeters: projectData.geofenceRadiusMeters || 200,
        status: (projectData.status as 'ACTIVE' | 'COMPLETED' | 'SUSPENDED') || 'ACTIVE',
        siteManagerId: projectData.siteManagerId || 5,
        startDate: projectData.startDate || new Date().toISOString().split('T')[0],
        endDate: projectData.endDate || '',
      };
      mockProjects.push(newProj);
      return newProj;
    }
  },

  updateProject: async (id: number, projectData: Partial<Project>): Promise<Project> => {
    try {
      const res = await apiClient.put<Project>(`/projects/${id}`, projectData);
      return res.data;
    } catch {
      const idx = mockProjects.findIndex(p => p.id === id);
      if (idx !== -1) {
        mockProjects[idx] = { ...mockProjects[idx], ...projectData };
        return mockProjects[idx];
      }
      throw new Error('Project not found');
    }
  },

  getAssignedEngineers: async (projectId: number): Promise<EngineerAssignment[]> => {
    try {
      const res = await apiClient.get<EngineerAssignment[]>(`/projects/${projectId}/engineers`);
      return res.data;
    } catch {
      return mockEngineerAssignments.filter(a => a.projectId === projectId && a.status === 'ACTIVE');
    }
  },

  assignEngineer: async (
    projectId: number,
    data: { employeeId: number; roleOnSite: string; assignedDate: string }
  ): Promise<EngineerAssignment> => {
    try {
      const res = await apiClient.post<EngineerAssignment>(`/projects/${projectId}/assign`, data);
      return res.data;
    } catch {
      const emp = mockEmployees.find(e => e.id === data.employeeId);
      const newAssign: EngineerAssignment = {
        id: Date.now(),
        projectId,
        employeeId: data.employeeId,
        employeeName: emp ? emp.fullName : `Kỹ sư #${data.employeeId}`,
        employeeCode: emp ? emp.employeeCode : `HM-${data.employeeId}`,
        roleOnSite: data.roleOnSite,
        assignedDate: data.assignedDate,
        status: 'ACTIVE',
      };
      mockEngineerAssignments.push(newAssign);
      return newAssign;
    }
  },

  // Attendance
  getAttendanceHistory: async (employeeId?: number): Promise<AttendanceRecord[]> => {
    try {
      const res = await apiClient.get<AttendanceRecord[]>('/attendance/history', {
        params: { employeeId },
      });
      return res.data;
    } catch {
      if (employeeId) {
        return mockAttendanceHistory.filter(r => r.employeeId === employeeId);
      }
      return mockAttendanceHistory;
    }
  },

  faceIdCheckIn: async (data: {
    employeeId: number;
    latitude: number;
    longitude: number;
    faceConfidenceScore: number;
    faceCapturedBase64: string;
    isLivenessVerified: boolean;
    locationName?: string;
    distanceMeters?: number;
    inGeofence?: boolean;
    checkInMethod?: 'FACE_ID' | 'MOBILE_GPS_OTP' | 'MANUAL';
  }): Promise<AttendanceRecord> => {
    try {
      const res = await apiClient.post<AttendanceRecord>('/attendance/face-id/check-in', data);
      return res.data;
    } catch {
      const emp = mockEmployees.find(e => e.id === data.employeeId);
      const isGeofenceOk = data.inGeofence !== undefined ? data.inGeofence : (data.distanceMeters ? data.distanceMeters <= 100 : true);
      const newRecord: AttendanceRecord = {
        id: Date.now(),
        employeeId: data.employeeId,
        employeeCode: emp ? emp.employeeCode : `HM-00${data.employeeId}`,
        employeeName: emp ? emp.fullName : 'Cán bộ nhân viên',
        workDate: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toLocaleTimeString('vi-VN'),
        status: isGeofenceOk ? 'PRESENT' : 'LATE',
        checkInMethod: data.checkInMethod || 'FACE_ID',
        latitude: data.latitude,
        longitude: data.longitude,
        inGeofence: isGeofenceOk,
        distanceMeters: data.distanceMeters || 32,
        locationName: data.locationName || 'Trụ Sở Hải Minh Tower (P.1802)',
        deviceFingerprint: navigator.userAgent.includes('Windows') ? 'Win11 Workstation / Chrome 126' : 'Mobile Web Client',
        faceConfidenceScore: data.faceConfidenceScore,
      };
      mockAttendanceHistory.unshift(newRecord);
      return newRecord;
    }
  },

  verifySiteOtp: async (projectId: number, otpCode: string): Promise<{ valid: boolean; message: string }> => {
    try {
      const res = await apiClient.post<{ valid: boolean; message: string }>('/attendance/otp/verify', {
        projectId,
        otpCode,
      });
      return res.data;
    } catch {
      // In standalone demo, accept 6-digit number or specific known codes
      if (otpCode.length === 6 && /^\d+$/.test(otpCode)) {
        return { valid: true, message: 'Mã OTP công trường chính xác và còn hiệu lực.' };
      }
      return { valid: false, message: 'Mã OTP không đúng hoặc đã hết hạn (chỉ có giá trị trong ngày).' };
    }
  },

  generateOtp: async (projectId: number, siteManagerId: number): Promise<DailySiteOtp> => {
    try {
      const res = await apiClient.post<DailySiteOtp>('/attendance/otp/generate', {
        projectId,
        siteManagerId,
      });
      return res.data;
    } catch {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        id: Date.now(),
        projectId,
        otpCode: randomCode,
        generatedDate: new Date().toISOString().split('T')[0],
        expiresAt: new Date(Date.now() + 3600000).toLocaleTimeString('vi-VN'),
        status: 'ACTIVE',
      };
    }
  },

  createEmployee: async (empData: Partial<Employee> & {
    contractType?: string;
    contractDurationMonths?: number;
    contractEndDate?: string;
  }): Promise<Employee> => {
    try {
      const res = await apiClient.post<Employee>('/employees', empData);
      return res.data;
    } catch {
      const nextId = mockEmployees.length + 1;
      const code = `HM-${nextId.toString().padStart(3, '0')}`;
      const newEmp: Employee = {
        id: nextId,
        employeeCode: empData.employeeCode || code,
        fullName: empData.fullName || 'Nhân viên mới',
        email: empData.email || `nhanvien.${nextId}@haiminh.vn`,
        phone: empData.phone || '0901234599',
        citizenId: empData.citizenId || '001099000099',
        position: empData.position || (empData.employeeType === 'SITE_ENGINEER' ? 'Kỹ Sư Hiện Trường' : 'Chuyên Viên Văn Phòng'),
        departmentId: empData.departmentId || (empData.employeeType === 'SITE_ENGINEER' ? 4 : 1),
        employeeType: empData.employeeType || 'OFFICE_STAFF',
        baseSalary: empData.baseSalary || 20000000,
        dependentsCount: empData.dependentsCount || 0,
        isUnionMember: empData.isUnionMember !== undefined ? empData.isUnionMember : true,
        isFaceRegistered: empData.isFaceRegistered || false,
        status: 'ACTIVE',
        hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
      };
      mockEmployees.push(newEmp);

      // Create matching initial contract
      const newContract: Contract = {
        id: Date.now(),
        contractNumber: `HDLD-HM-2026/${nextId.toString().padStart(3, '0')}`,
        employeeId: nextId,
        contractType: (empData.contractType as any) || 'OFFICIAL_DEFINITE',
        startDate: newEmp.hireDate || new Date().toISOString().split('T')[0],
        endDate: empData.contractEndDate || '2027-10-31',
        baseSalary: newEmp.baseSalary,
        insuranceFlag: 'FULL',
        taxFlag: 'PROGRESSIVE',
        status: 'ACTIVE',
      };
      mockExpiringContracts.push(newContract);

      return newEmp;
    }
  },

  extendContract: async (contractId: number, newEndDate: string, newBaseSalary?: number): Promise<Contract> => {
    try {
      const res = await apiClient.put<Contract>(`/employees/contracts/${contractId}/extend`, {
        newEndDate,
        newBaseSalary,
      });
      return res.data;
    } catch {
      const idx = mockExpiringContracts.findIndex(c => c.id === contractId);
      if (idx !== -1) {
        mockExpiringContracts[idx].endDate = newEndDate;
        if (newBaseSalary) {
          mockExpiringContracts[idx].baseSalary = newBaseSalary;
          const emp = mockEmployees.find(e => e.id === mockExpiringContracts[idx].employeeId);
          if (emp) emp.baseSalary = newBaseSalary;
        }
        return mockExpiringContracts[idx];
      }
      throw new Error('Contract not found');
    }
  },

  // Overtime Requests (FE-04 / BF-04)
  getOvertimeRequests: async (employeeId?: number, projectId?: number): Promise<OvertimeRequest[]> => {
    try {
      const res = await apiClient.get<OvertimeRequest[]>('/requests/overtime', {
        params: { employeeId, projectId },
      });
      return res.data;
    } catch {
      let list = mockOvertimeRequests;
      if (employeeId) list = list.filter(r => r.employeeId === employeeId);
      if (projectId) list = list.filter(r => r.projectId === projectId);
      return list;
    }
  },

  createOvertimeRequest: async (data: Partial<OvertimeRequest>): Promise<OvertimeRequest> => {
    try {
      const res = await apiClient.post<OvertimeRequest>('/requests/overtime', data);
      return res.data;
    } catch {
      const emp = mockEmployees.find(e => e.id === data.employeeId);
      const proj = mockProjects.find(p => p.id === data.projectId);
      const newOt: OvertimeRequest = {
        id: Date.now(),
        employeeId: data.employeeId || 6,
        employeeCode: emp ? emp.employeeCode : 'HM-006',
        employeeName: emp ? emp.fullName : 'Kỹ sư hiện trường',
        projectId: data.projectId || 2,
        projectName: proj ? proj.name : 'Dự án công trình',
        workDate: data.workDate || new Date().toISOString().split('T')[0],
        startTime: data.startTime || '18:00',
        endTime: data.endTime || '22:00',
        otHours: data.otHours || 4,
        otType: data.otType || 'WEEKDAY_150',
        multiplier: data.multiplier || 1.5,
        reason: data.reason || 'Thi công tăng ca tiến độ công trình',
        siteManagerApproval: 'PENDING',
        hrApproval: 'PENDING',
        status: 'PENDING_SM',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      mockOvertimeRequests.unshift(newOt);
      return newOt;
    }
  },

  approveOvertimeRequest: async (
    id: number,
    role: 'SITE_MANAGER' | 'HR_MANAGER',
    approved: boolean
  ): Promise<OvertimeRequest> => {
    try {
      const res = await apiClient.put<OvertimeRequest>(`/requests/overtime/${id}/approve`, { role, approved });
      return res.data;
    } catch {
      const idx = mockOvertimeRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        if (!approved) {
          mockOvertimeRequests[idx].status = 'REJECTED';
          if (role === 'SITE_MANAGER') mockOvertimeRequests[idx].siteManagerApproval = 'REJECTED';
          else mockOvertimeRequests[idx].hrApproval = 'REJECTED';
        } else {
          if (role === 'SITE_MANAGER') {
            mockOvertimeRequests[idx].siteManagerApproval = 'APPROVED';
            mockOvertimeRequests[idx].status = 'PENDING_HR';
          } else {
            mockOvertimeRequests[idx].hrApproval = 'APPROVED';
            mockOvertimeRequests[idx].status = 'APPROVED';
          }
        }
        return mockOvertimeRequests[idx];
      }
      throw new Error('Overtime request not found');
    }
  },

  // Leave Requests (FE-04 / BF-03)
  getLeaveRequests: async (employeeId?: number): Promise<LeaveRequest[]> => {
    try {
      const res = await apiClient.get<LeaveRequest[]>('/requests/leave', { params: { employeeId } });
      return res.data;
    } catch {
      if (employeeId) return mockLeaveRequests.filter(r => r.employeeId === employeeId);
      return mockLeaveRequests;
    }
  },

  createLeaveRequest: async (data: Partial<LeaveRequest>): Promise<LeaveRequest> => {
    try {
      const res = await apiClient.post<LeaveRequest>('/requests/leave', data);
      return res.data;
    } catch {
      const emp = mockEmployees.find(e => e.id === data.employeeId);
      const newLeave: LeaveRequest = {
        id: Date.now(),
        employeeId: data.employeeId || 4,
        employeeCode: emp ? emp.employeeCode : 'HM-004',
        employeeName: emp ? emp.fullName : 'Cán bộ nhân viên',
        leaveType: data.leaveType || 'ANNUAL',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date().toISOString().split('T')[0],
        daysCount: data.daysCount || 1,
        reason: data.reason || 'Nghỉ giải quyết việc cá nhân',
        status: 'PENDING',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      mockLeaveRequests.unshift(newLeave);
      return newLeave;
    }
  },

  approveLeaveRequest: async (id: number, approved: boolean): Promise<LeaveRequest> => {
    try {
      const res = await apiClient.put<LeaveRequest>(`/requests/leave/${id}/approve`, { approved });
      return res.data;
    } catch {
      const idx = mockLeaveRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        mockLeaveRequests[idx].status = approved ? 'APPROVED' : 'REJECTED';
        return mockLeaveRequests[idx];
      }
      throw new Error('Leave request not found');
    }
  },

  // Attendance Explanation Requests (UC-11 / BF-05)
  getAttendanceExplanations: async (projectId?: number): Promise<AttendanceExplanationRequest[]> => {
    try {
      const res = await apiClient.get<AttendanceExplanationRequest[]>('/attendance/explanations', { params: { projectId } });
      return res.data;
    } catch {
      if (projectId) return mockAttendanceExplanations.filter(a => a.projectId === projectId);
      return mockAttendanceExplanations;
    }
  },

  createAttendanceExplanation: async (data: Partial<AttendanceExplanationRequest>): Promise<AttendanceExplanationRequest> => {
    try {
      const res = await apiClient.post<AttendanceExplanationRequest>('/attendance/explanations', data);
      return res.data;
    } catch {
      const emp = mockEmployees.find(e => e.id === data.employeeId);
      const proj = mockProjects.find(p => p.id === data.projectId);
      const newExp: AttendanceExplanationRequest = {
        id: Date.now(),
        employeeId: data.employeeId || 5,
        employeeCode: emp ? emp.employeeCode : 'HM-005',
        employeeName: emp ? emp.fullName : 'Kỹ sư hiện trường',
        projectId: data.projectId || 1,
        projectName: proj ? proj.name : 'Dự án công trình',
        targetDate: data.targetDate || new Date().toISOString().split('T')[0],
        explanationType: data.explanationType || 'MISSING_CHECKIN',
        suggestedCheckIn: data.suggestedCheckIn || '07:00',
        suggestedCheckOut: data.suggestedCheckOut || '17:00',
        reason: data.reason || 'Giải trình quên chấm công / lỗi thiết bị',
        siteManagerApproval: 'PENDING',
        hrApproval: 'PENDING',
        status: 'PENDING_SM',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      mockAttendanceExplanations.unshift(newExp);
      return newExp;
    }
  },

  approveAttendanceExplanation: async (id: number, level: 'SM' | 'HR', approved: boolean = true): Promise<AttendanceExplanationRequest> => {
    try {
      const res = await apiClient.put<AttendanceExplanationRequest>(`/attendance/explanations/${id}/approve`, { level, approved });
      return res.data;
    } catch {
      const idx = mockAttendanceExplanations.findIndex(a => a.id === id);
      if (idx !== -1) {
        if (!approved) {
          if (level === 'SM') {
            mockAttendanceExplanations[idx].siteManagerApproval = 'REJECTED';
          } else {
            mockAttendanceExplanations[idx].hrApproval = 'REJECTED';
          }
          mockAttendanceExplanations[idx].status = 'REJECTED';
        } else {
          if (level === 'SM') {
            mockAttendanceExplanations[idx].siteManagerApproval = 'APPROVED';
            mockAttendanceExplanations[idx].status = 'PENDING_HR';
          } else {
            mockAttendanceExplanations[idx].hrApproval = 'APPROVED';
            mockAttendanceExplanations[idx].status = 'APPROVED';
          }
        }
        return mockAttendanceExplanations[idx];
      }
      throw new Error('Explanation not found');
    }
  },

  // Monthly Timesheets (FE-07 / UC-14 -> UC-16)
  getMonthlyTimesheets: async (month: number, year: number): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>('/timesheets', {
        params: { month, year },
      });
      return res.data;
    } catch {
      return [];
    }
  },

  confirmTimesheetBySiteManager: async (id: number, siteManagerId: number): Promise<any> => {
    try {
      const res = await apiClient.post<any>(`/timesheets/${id}/confirm`, { siteManagerId });
      return res.data;
    } catch {
      return { success: true, message: 'Đã xác nhận bảng công công trường Cấp 1' };
    }
  },

  lockTimesheetByHrManager: async (id: number, hrManagerId: number): Promise<any> => {
    try {
      const res = await apiClient.post<any>(`/timesheets/${id}/lock`, { hrManagerId });
      return res.data;
    } catch {
      return { success: true, message: 'Đã khóa bảng công toàn công ty Cấp 2' };
    }
  },

  // Lock Month & Trigger Payroll (FE-05 -> FE-06)
  lockAndTriggerPayroll: async (month: number, year: number, hrManagerId: number): Promise<any> => {
    try {
      const res = await apiClient.post<any>('/timesheets/lock-and-payroll', { month, year, hrManagerId });
      return res.data;
    } catch {
      return { success: true, message: 'Đã khóa bảng công và kích hoạt tính lương' };
    }
  },

  // Payroll Engine (FE-06 / FE-10)
  getPayrollPeriods: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>('/payroll/periods');
      return res.data;
    } catch {
      return [
        {
          id: 1,
          payrollCode: 'PR-2026-10',
          month: 10,
          year: 2026,
          standardWorkDays: 26,
          status: 'REVIEWED',
          totalGrossSalary: 345000000,
          totalNetSalary: 298500000,
          totalEmployerCost: 78200000,
        }
      ];
    }
  },

  getPayrollItems: async (payrollId: number): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>(`/payroll/${payrollId}/items`);
      return res.data;
    } catch {
      return [];
    }
  },

  calculatePayroll: async (month: number, year: number, operatorUserId: number): Promise<any> => {
    try {
      const res = await apiClient.post<any>('/payroll/calculate', { month, year, operatorUserId });
      return res.data;
    } catch {
      return {
        id: 1,
        payrollCode: `PR-${year}-${String(month).padStart(2, '0')}`,
        month,
        year,
        standardWorkDays: 26,
        status: 'CALCULATED',
        totalGrossSalary: 345000000,
        totalNetSalary: 298500000,
        totalEmployerCost: 78200000,
      };
    }
  },

  getCostAllocations: async (payrollId: number): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>(`/payroll/${payrollId}/cost-allocations`);
      return res.data;
    } catch {
      return [];
    }
  },

  getAccountingVouchers: async (payrollId: number): Promise<any> => {
    try {
      const res = await apiClient.get<any>(`/payroll/${payrollId}/accounting-vouchers`);
      return res.data;
    } catch {
      return null;
    }
  },

  exportMisaCsv: async (payrollId: number): Promise<string> => {
    try {
      const res = await apiClient.get<string>(`/payroll/${payrollId}/export-misa-csv`, {
        responseType: 'text'
      });
      return res.data;
    } catch {
      return "SoChungTu,NgayChungTu,NgayHachToan,DienGiai,TKNo,TKCo,SoTien,MaDoiTuong,MaCongTrinh\nPKT-2026-10-001,2026-10-31,2026-10-31,Chi phi nhan cong truc tiep thi cong TK 622,622,3341,175000000,,DA-NHATTAN2\nPKT-2026-10-001,2026-10-31,2026-10-31,Chi phi quan ly ban chi huy cong truong TK 627,627,3341,110000000,,DA-LANDMARK\nPKT-2026-10-001,2026-10-31,2026-10-31,Chi phi quan ly doanh nghiep khoi van phong TK 642,642,3341,60000000,,";
    }
  },

  // Payslips
  getMyPayslips: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>('/payslips/my');
      return res.data;
    } catch {
      return [];
    }
  },
};
