import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Users,
  Search,
  Lock,
  Check,
  FileCheck,
  Building,
  HardHat,
  Sparkles,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, mockEmployees } from '../services/api';
import type { Employee } from '../types';

interface DayAttendance {
  day: number;
  symbol: 'X' | 'X/2' | 'P' | 'O' | 'Ro' | 'KL' | 'V' | '-';
  otHours?: number;
  checkIn?: string;
  checkOut?: string;
  method?: string;
  location?: string;
  note?: string;
}

interface EmployeeTimesheetRow {
  employee: Employee;
  projectCode: string;
  projectName: string;
  days: Record<number, DayAttendance>;
  actualDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  totalWorkDays: number;
  otWeekdayHours: number;
  otWeekendHours: number;
  otNightHours: number;
  totalOtHours: number;
  status: 'VERIFIED' | 'PENDING_L1' | 'LOCKED';
}

export const Timesheet: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  // Role permissions based on Context Diagram
  const isHrStaff = currentRole === 'HR_STAFF' || currentRole === 'HR_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isHrManager = currentRole === 'HR_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isSiteManager = currentRole === 'SITE_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isStaff = currentRole === 'SITE_ENGINEER' || currentRole === 'OFFICE_STAFF';
  const isSiteEngineer = currentRole === 'SITE_ENGINEER';

  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedProject, setSelectedProject] = useState(currentRole === 'SITE_MANAGER' ? 'DA-NHATTAN2' : 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OFFICE_STAFF' | 'SITE_ENGINEER'>('ALL');
  const [filterMyOnly, setFilterMyOnly] = useState(isStaff || isSiteEngineer);

  // Workflow State: DRAFT -> PREPARED -> SITE_CONFIRMED -> LOCKED
  const [timesheetStatus, setTimesheetStatus] = useState<'DRAFT' | 'PREPARED' | 'SITE_CONFIRMED' | 'LOCKED'>('DRAFT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedCell, setSelectedCell] = useState<{
    employee: Employee;
    attendance: DayAttendance;
    dayNumber: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic Month & Year parsing
  const yearNum = parseInt(selectedYear, 10) || 2026;
  const monthNum = parseInt(selectedMonth, 10) || 10;

  // Real days in the selected month (e.g. 31 for Oct, 30 for Nov, 28/29 for Feb)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dayOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Helper to determine day of week for any selected month/year/day
  const getDayOfWeek = (day: number) => {
    const date = new Date(yearNum, monthNum - 1, day);
    return dayOfWeekNames[date.getDay()];
  };

  const isWeekend = (day: number) => {
    const dow = getDayOfWeek(day);
    return dow === 'T7' || dow === 'CN';
  };

  // Calculate actual standard working days (excluding Sundays) in this specific month
  const standardWorkDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(yearNum, monthNum - 1, d);
      if (date.getDay() !== 0) count++; // excluding Sunday
    }
    return count;
  }, [daysInMonth, yearNum, monthNum]);

  // Generate mock attendance row for an employee
  const generateEmployeeTimesheet = (emp: Employee): EmployeeTimesheetRow => {
    const isSite = emp.employeeType === 'SITE_ENGINEER';
    const isSpecialOT = emp.employeeCode === 'HM-005' || emp.employeeCode === 'HM-007' || emp.employeeCode === 'HM-010';
    const hasLeave = emp.employeeCode === 'HM-001' || emp.employeeCode === 'HM-006' || emp.employeeCode === 'HM-015';
    const hasSick = emp.employeeCode === 'HM-017';

    let projectCode = 'HQ-OFFICE';
    let projectName = 'Trụ sở chính Hải Minh Tower';

    if (isSite) {
      if (emp.id % 2 === 0) {
        projectCode = 'DA-LANDMARK';
        projectName = 'Tháp Văn Phòng Landmark';
      } else {
        projectCode = 'DA-NHATTAN2';
        projectName = 'Cầu Nhật Tân 2';
      }
    }

    const days: Record<number, DayAttendance> = {};
    let actualDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let sickLeaveDays = 0;
    let otWeekdayHours = 0;
    let otWeekendHours = 0;
    let otNightHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const weekend = isWeekend(d);
      const dow = getDayOfWeek(d);

      if (weekend) {
        // Special Sunday OT for site engineers on middle Sunday
        const isMiddleSunday = dow === 'CN' && d >= 8 && d <= 18 && isSpecialOT;
        if (isMiddleSunday) {
          days[d] = {
            day: d,
            symbol: 'O',
            otHours: 8,
            checkIn: '08:00',
            checkOut: '17:00',
            method: isSite ? 'GPS Geofence + Dynamic OTP' : 'Face ID HQ',
            location: isSite ? 'Công trường Cầu Nhật Tân 2' : 'Trụ sở Tầng 6',
            note: 'Đổ bê tông dầm cầu ca Chủ Nhật (Hệ số 2.0x)',
          };
          otWeekendHours += 8;
        } else {
          days[d] = {
            day: d,
            symbol: '-',
            note: `Nghỉ cuối tuần (${dow})`,
          };
        }
      } else {
        // Weekday logic
        if (d === 24 && hasLeave) {
          days[d] = {
            day: d,
            symbol: 'P',
            checkIn: '-',
            checkOut: '-',
            note: 'Nghỉ phép năm hưởng nguyên lương (Đơn đã duyệt L2)',
          };
          paidLeaveDays += 1;
        } else if (d === 15 && hasSick) {
          days[d] = {
            day: d,
            symbol: 'Ro',
            checkIn: '-',
            checkOut: '-',
            note: 'Nghỉ ốm theo chế độ BHXH (Có giấy viện C)',
          };
          sickLeaveDays += 1;
        } else if (d === 18 && emp.employeeCode === 'HM-006') {
          // Weekday OT 4h
          days[d] = {
            day: d,
            symbol: 'O',
            otHours: 4,
            checkIn: '07:54',
            checkOut: '21:30',
            method: 'GPS Geofence + OTP',
            location: 'Dự án Landmark',
            note: 'Làm thêm ca tối trắc địa móng (Hệ số 1.5x)',
          };
          actualDays += 1;
          otWeekdayHours += 4;
        } else if (d === 21 && emp.employeeCode === 'HM-007') {
          // Night OT
          days[d] = {
            day: d,
            symbol: 'O',
            otHours: 6,
            checkIn: '20:00',
            checkOut: '02:00',
            method: 'GPS Geofence + OTP',
            location: 'Cầu Nhật Tân 2',
            note: 'Trực kỹ thuật kéo cáp ban đêm (Hệ số 1.8x)',
          };
          actualDays += 1;
          otNightHours += 6;
        } else {
          // Standard full work day (8h)
          days[d] = {
            day: d,
            symbol: 'X',
            checkIn: '07:52',
            checkOut: '17:05',
            method: isSite ? 'GPS Geofence + Dynamic OTP' : 'Camera AI Face ID HQ',
            location: isSite ? 'Hiện trường công trình' : 'Trụ sở chính Tầng 6',
            note: 'Điểm danh đủ ca chuẩn 8.0 giờ',
          };
          actualDays += 1;
        }
      }
    }

    const totalWorkDays = actualDays + paidLeaveDays;
    const totalOtHours = otWeekdayHours + otWeekendHours + otNightHours;

    return {
      employee: emp,
      projectCode,
      projectName,
      days,
      actualDays,
      paidLeaveDays,
      unpaidLeaveDays,
      sickLeaveDays,
      totalWorkDays,
      otWeekdayHours,
      otWeekendHours,
      otNightHours,
      totalOtHours,
      status: timesheetStatus === 'LOCKED' ? 'LOCKED' : timesheetStatus === 'SITE_CONFIRMED' ? 'VERIFIED' : 'PENDING_L1',
    };
  };

  const allTimesheetRows: EmployeeTimesheetRow[] = useMemo(() => {
    return mockEmployees.map(generateEmployeeTimesheet);
  }, [mockEmployees, daysInMonth, yearNum, monthNum, timesheetStatus]);

  // Filter rows
  const filteredRows = allTimesheetRows.filter((row) => {
    if ((filterMyOnly || isSiteEngineer) && user) {
      return (
        row.employee.id === user.id ||
        row.employee.email === user.email ||
        row.employee.employeeCode === user.employeeCode
      );
    }
    if (filterType !== 'ALL' && row.employee.employeeType !== filterType) {
      return false;
    }
    if (selectedProject !== 'ALL' && row.projectCode !== selectedProject) {
      return false;
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchName = row.employee.fullName.toLowerCase().includes(q);
      const matchCode = row.employee.employeeCode.toLowerCase().includes(q);
      const matchPos = (row.employee.position || '').toLowerCase().includes(q);
      return matchName || matchCode || matchPos;
    }
    return true;
  });

  // Calculate Summary KPI metrics
  const totalEmployeesCount = allTimesheetRows.length;
  const totalActualDaysSum = allTimesheetRows.reduce((acc, r) => acc + r.actualDays, 0);
  const totalOtHoursSum = allTimesheetRows.reduce((acc, r) => acc + r.totalOtHours, 0);
  const totalPaidLeaveSum = allTimesheetRows.reduce((acc, r) => acc + r.paidLeaveDays, 0);

  // Workflow Handlers
  // 1. HR Staff prepares draft timesheet command
  const handlePrepareTimesheet = () => {
    setTimesheetStatus('PREPARED');
    showToast('Chuyên viên Nhân sự Phạm Thị Mai đã thực thi Lệnh Tổng Hợp Bảng Công Nháp (Prepare Timesheet Command)!');
  };

  // 2. Site Manager confirms site attendance (Level 1)
  const handleSiteConfirm = async () => {
    try {
      await api.confirmTimesheetBySiteManager(1, user?.id || 7);
    } catch (e) {
      console.warn('Backend sync failed, updating local state:', e);
    }
    setTimesheetStatus('SITE_CONFIRMED');
    showToast(`Chỉ huy trưởng ${user?.fullName || 'Nguyễn Lê Gia Phát'} đã xác nhận bảng công công trường Cấp 1 (Site Timesheet Confirmation L1)!`);
  };

  // 3. HR Manager approves and locks company-wide timesheet (Level 2)
  const handleCompanyLock = async () => {
    try {
      await api.lockAndTriggerPayroll(monthNum, yearNum, user?.id || 5);
    } catch (e) {
      console.warn('Backend sync failed, updating local state:', e);
    }
    setTimesheetStatus('LOCKED');
    showToast(`Trưởng phòng Nhân sự ${user?.fullName || 'Nguyễn Thu Giang'} đã phê duyệt Khóa Bảng Công Toàn Công Ty Cấp 2! Đã tự động kích hoạt tính lương cho Kế toán.`);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Mã NV',
      'Họ Và Tên',
      'Chức Vị',
      'Đơn Vị / Dự Án',
      'Phân Khối',
      ...Array.from({ length: daysInMonth }, (_, i) => `Ngày ${i + 1 < 10 ? '0' + (i + 1) : i + 1} (${getDayOfWeek(i + 1)})`),
      'Công Thực Tế',
      'Nghỉ Phép (P)',
      'Tổng Công Tính Lương',
      'Giờ OT Thường',
      'Giờ OT Cuối Tuần',
      'Giờ OT Đêm',
      'Tổng Giờ OT',
      'Trạng Thái Khóa'
    ];

    const rows = filteredRows.map((r) => [
      r.employee.employeeCode,
      `"${r.employee.fullName}"`,
      `"${r.employee.position || ''}"`,
      `"${r.projectName}"`,
      r.employee.employeeType === 'OFFICE_STAFF' ? 'Khối Văn Phòng' : 'Kỹ Sư Công Trường',
      ...Array.from({ length: daysInMonth }, (_, i) => r.days[i + 1]?.symbol || '-'),
      r.actualDays,
      r.paidLeaveDays,
      r.totalWorkDays,
      r.otWeekdayHours,
      r.otWeekendHours,
      r.otNightHours,
      r.totalOtHours,
      r.status === 'LOCKED' ? 'Đã Khóa L2' : r.status === 'VERIFIED' ? 'Đã Duyệt L1' : 'Bản Nháp'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Bang_Tong_Hop_Cham_Cong_T${selectedMonth.padStart(2, '0')}_${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công bảng tổng hợp công định dạng Excel/CSV!');
  };

  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary">Phân Hệ Chấm Công Lõi (FE-07 / UC-14 &rarr; UC-16)</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Mã kỳ công: <strong className="font-mono text-slate-800">TS-{selectedYear}-{selectedMonth.padStart(2, '0')}</strong>
            </span>
          </div>
          <h1 className="page-title">
            {isSiteEngineer
              ? `Bảng Chấm Công ${daysInMonth} Ngày Của Tôi (Kỹ Sư Hiện Trường - UC-14)`
              : currentRole === 'SITE_MANAGER'
              ? `Bảng Chấm Công Dự Án & Thẩm Định Hiện Trường (Cấp 1 - UC-15)`
              : `Bảng Tổng Hợp Chấm Công Tập Trung ${daysInMonth} Ngày (Timesheet Consolidation)`}
          </h1>
          <p className="page-description">
            {isSiteEngineer
              ? `Kỳ công: Tháng ${selectedMonth}/${selectedYear} (${daysInMonth} ngày) • Theo dõi ngày công thực tế, giờ làm thêm OT và giải trình chấm công của bạn.`
              : currentRole === 'SITE_MANAGER'
              ? `Kỳ công: Tháng ${selectedMonth}/${selectedYear} (${daysInMonth} ngày) • Thẩm định dữ liệu công trường Cầu Nhật Tân 2 trước khi ký xác nhận Cấp 1.`
              : `Kỳ công: Tháng ${selectedMonth}/${selectedYear} (${daysInMonth} ngày) • Chuẩn định mức: ${standardWorkDaysCount} ngày công • Cơ chế thẩm định & khóa bảng công 2 cấp (Chỉ huy trưởng CT → Trưởng phòng HR).`}
          </p>
        </div>

        <div className="header-actions">
          {/* Site Engineer: quick action */}
          {isSiteEngineer && (
            <button
              onClick={() => showToast('Để tạo đơn giải trình bù công, bạn có thể click trực tiếp vào ô ngày trên lịch làm việc bên dưới!')}
              className="btn btn-primary"
              style={{ backgroundColor: '#2563eb' }}
            >
              <FileCheck size={15} />
              <span>Hướng Dẫn Giải Trình Bù Công (UC-11)</span>
            </button>
          )}

          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Xuất Excel / CSV</span>
          </button>

          {/* HR Staff action: Prepare draft timesheet command */}
          {isHrStaff && timesheetStatus === 'DRAFT' && (
            <button onClick={handlePrepareTimesheet} className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
              <Sparkles size={15} />
              <span>Chuẩn Bị Bảng Công Nháp (HR)</span>
            </button>
          )}

          {/* Site Manager action: Verify site timesheet (Level 1) */}
          {isSiteManager && (timesheetStatus === 'PREPARED' || timesheetStatus === 'DRAFT') && (
            <button onClick={handleSiteConfirm} className="btn btn-primary" style={{ backgroundColor: '#d97706' }}>
              <Check size={15} />
              <span>Xác Nhận Bảng Công CT (CHT L1 - UC-15)</span>
            </button>
          )}

          {/* HR Manager action: Lock company timesheet (Level 2) */}
          {isHrManager && timesheetStatus === 'SITE_CONFIRMED' && (
            <button onClick={handleCompanyLock} className="btn btn-primary" style={{ backgroundColor: '#047857' }}>
              <Lock size={15} />
              <span>Khóa Bảng Công Toàn Công Ty (HR L2)</span>
            </button>
          )}

          {timesheetStatus === 'LOCKED' && (
            <span className="badge badge-success" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem' }}>
              <Lock size={13} />
              <span>Đã Khóa Bảng Công Tháng {selectedMonth}/{selectedYear}</span>
            </span>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Stepper Bar (2-Level Timesheet Lock Workflow) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: 600 }}>
            Tiến Trình Chốt Bảng Công 2 Cấp (BF-07):
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
            <span className={`badge ${timesheetStatus === 'DRAFT' ? 'badge-warning' : 'badge-success'}`}>
              1. Thu thập Face ID &amp; GPS ({timesheetStatus === 'DRAFT' ? 'Đang gom' : 'Hoàn tất'})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span
              className={`badge ${
                timesheetStatus === 'SITE_CONFIRMED' || timesheetStatus === 'LOCKED'
                  ? 'badge-success'
                  : timesheetStatus === 'PREPARED'
                  ? 'badge-warning'
                  : 'badge-slate'
              }`}
            >
              2. CHT xác nhận công trường ({timesheetStatus === 'SITE_CONFIRMED' || timesheetStatus === 'LOCKED' ? 'Đã duyệt L1' : (timesheetStatus === 'PREPARED' ? 'Chờ duyệt L1' : 'Chưa đến')})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span className={`badge ${timesheetStatus === 'LOCKED' ? 'badge-success' : 'badge-slate'}`}>
              3. TP Nhân sự khóa công ty ({timesheetStatus === 'LOCKED' ? 'Đã khóa L2' : 'Chưa khóa'})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span className={`badge ${timesheetStatus === 'LOCKED' ? 'badge-success' : 'badge-slate'}`}>
              4. Chuyển Kế toán tính lương (FE-10)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mã bảng công: <span className="font-mono font-semibold text-slate-800">BC-{selectedYear}-{selectedMonth.padStart(2, '0')}-CONSOL</span>
          </div>
          <button
            onClick={() => {
              setTimesheetStatus('DRAFT');
              showToast('Đã khôi phục trạng thái bảng công về Bản Nháp (DRAFT) để kiểm thử chu trình khóa công!');
            }}
            title="Khôi phục trạng thái về DRAFT để kiểm thử luồng từ đầu"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ↺ Reset Demo
          </button>
        </div>
      </div>

      {/* 3. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Quy Mô Chấm Công</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <Users size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{totalEmployeesCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>nhân sự</span></div>
          <div className="kpi-subtext">Gồm 11 Kỹ sư CT &bull; 8 Khối Văn phòng HQ</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Ngày Công Thực Tế</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <FileCheck size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{totalActualDaysSum} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>công</span></div>
          <div className="kpi-subtext">Đạt <span className="font-semibold text-emerald-600">93.4%</span> định mức chuẩn 26 ngày</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Giờ Làm Thêm OT</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#d97706' }}>{totalOtHoursSum} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>giờ</span></div>
          <div className="kpi-subtext">Hưởng hệ số 150%, 200% &amp; 180% theo quy định</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Ngày Nghỉ Phép Năm</span>
            <div className="kpi-icon-wrap" style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
              <Calendar size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{totalPaidLeaveSum} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>ngày</span></div>
          <div className="kpi-subtext">Được tính 100% lương theo Điều 113 BLLĐ</div>
        </div>
      </div>

      {/* 4. Filter Bar */}
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã NV, họ tên, chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kỳ Công:</label>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ minWidth: '95px' }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m.toString()}>Tháng {m}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ minWidth: '85px' }}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        {isSiteEngineer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <span className="badge badge-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={13} />
              <span>Bảo mật cá nhân: {user?.fullName || 'Kỹ Sư Hiện Trường'} ({user?.employeeCode || 'HM-006'})</span>
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dự Án / Công Trình:</label>
              <select
                className="form-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                <option value="ALL">Tất Cả Dự Án &amp; Khối HQ</option>
                <option value="HQ-OFFICE">Trụ Sở Chính HQ (TK 642)</option>
                <option value="DA-NHATTAN2">Dự Án Cầu Nhật Tân 2 (TK 627)</option>
                <option value="DA-LANDMARK">Tháp Landmark Hải Minh (TK 627)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phân Khối:</label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{ minWidth: '150px' }}
              >
                <option value="ALL">Tất Cả Khối</option>
                <option value="OFFICE_STAFF">Văn Phòng HQ (8)</option>
                <option value="SITE_ENGINEER">Kỹ Sư Hiện Trường (11)</option>
              </select>
            </div>

            <button
              onClick={() => setFilterMyOnly(!filterMyOnly)}
              className={`btn btn-sm ${filterMyOnly ? 'btn-primary' : 'btn-secondary'}`}
              title="Lọc chỉ xem bảng công của chính tôi"
            >
              <span>{filterMyOnly ? 'Đang Xem: Bản Thân' : 'Xem Của Tôi'}</span>
            </button>
          </>
        )}
      </div>

      {/* 5. Timesheet Legend Bar (Chú Thích Ký Hiệu Chấm Công Tiêu Chuẩn) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Ký Hiệu Chấm Công:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-work">X</span>
            <span style={{ color: 'var(--text-body)' }}>Đi làm đủ ca (8h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-half">X/2</span>
            <span style={{ color: 'var(--text-body)' }}>Nửa ca (4h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-leave">P</span>
            <span style={{ color: 'var(--text-body)' }}>Phép năm (100% lương)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-ot">O</span>
            <span style={{ color: 'var(--text-body)' }}>Làm thêm giờ (OT)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-sick">Ro</span>
            <span style={{ color: 'var(--text-body)' }}>Nghỉ ốm BHXH</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-unpaid">KL</span>
            <span style={{ color: 'var(--text-body)' }}>Không lương</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-absent">V</span>
            <span style={{ color: 'var(--text-body)' }}>Vắng mặt</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="timesheet-cell-badge cell-weekend">-</span>
            <span style={{ color: 'var(--text-muted)' }}>Cuối tuần</span>
          </div>
        </div>
      </div>

      {/* 6. High-Density 31-Day Matrix Grid Table */}
      <div className="timesheet-grid-container" style={{ marginBottom: '1.5rem', maxHeight: '620px' }}>
        <table className="timesheet-table">
          <thead>
            <tr>
              <th className="sticky-col-code">Mã NV</th>
              <th className="sticky-col-name">Họ Và Tên</th>
              <th style={{ minWidth: '130px', textAlign: 'left', paddingLeft: '0.5rem' }}>Đơn Vị / Dự Án</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dow = getDayOfWeek(dayNum);
                const weekend = isWeekend(dayNum);
                return (
                  <th
                    key={dayNum}
                    style={{
                      backgroundColor: weekend ? '#f1f5f9' : '#f8fafc',
                      color: weekend ? '#64748b' : 'var(--text-body)',
                      fontWeight: weekend ? 700 : 600,
                      minWidth: '28px',
                    }}
                  >
                    <div>{dayNum < 10 ? `0${dayNum}` : dayNum}</div>
                    <div style={{ fontSize: '0.625rem', color: weekend ? '#ef4444' : '#64748b' }}>{dow}</div>
                  </th>
                );
              })}
              <th style={{ minWidth: '55px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700 }}>Công TT</th>
              <th style={{ minWidth: '50px', backgroundColor: '#eff6ff', color: '#1e40af' }}>Phép</th>
              <th style={{ minWidth: '60px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 700 }}>Tổng Tính</th>
              <th style={{ minWidth: '55px', backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 700 }}>Giờ OT</th>
              <th style={{ minWidth: '85px' }}>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.employee.id}>
                <td className="sticky-col-code font-mono font-medium text-slate-800">
                  {row.employee.employeeCode}
                </td>
                <td className="sticky-col-name font-medium text-slate-900">
                  <div style={{ lineHeight: 1.2 }}>{row.employee.fullName}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{row.employee.position || 'Cán bộ'}</div>
                </td>
                <td style={{ textAlign: 'left', paddingLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {row.employee.employeeType === 'OFFICE_STAFF' ? (
                      <Building size={11} color="#0284c7" />
                    ) : (
                      <HardHat size={11} color="#d97706" />
                    )}
                    <span style={{ fontSize: '0.6875rem' }}>{row.projectName}</span>
                  </div>
                </td>

                {/* 31 Days Matrix Cells */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dayAtt = row.days[dayNum];
                  const weekend = isWeekend(dayNum);

                  let badgeClass = 'cell-work';
                  if (dayAtt?.symbol === 'P') badgeClass = 'cell-leave';
                  else if (dayAtt?.symbol === 'O') badgeClass = 'cell-ot';
                  else if (dayAtt?.symbol === 'Ro') badgeClass = 'cell-sick';
                  else if (dayAtt?.symbol === 'KL') badgeClass = 'cell-unpaid';
                  else if (dayAtt?.symbol === 'V') badgeClass = 'cell-absent';
                  else if (dayAtt?.symbol === 'X/2') badgeClass = 'cell-half';
                  else if (dayAtt?.symbol === '-') badgeClass = 'cell-weekend';

                  return (
                    <td
                      key={dayNum}
                      style={{ backgroundColor: weekend ? '#fafbfc' : 'transparent', padding: '2px' }}
                      onClick={() =>
                        dayAtt &&
                        setSelectedCell({
                          employee: row.employee,
                          attendance: dayAtt,
                          dayNumber: dayNum,
                        })
                      }
                    >
                      <span
                        className={`timesheet-cell-badge ${badgeClass}`}
                        title={dayAtt?.note || `Ngày ${dayNum}: ${dayAtt?.symbol}`}
                      >
                        {dayAtt?.symbol === 'O' ? `${dayAtt.otHours}h` : dayAtt?.symbol || '-'}
                      </span>
                    </td>
                  );
                })}

                {/* Summary Metrics */}
                <td className="font-mono font-bold text-slate-800" style={{ backgroundColor: '#f0fdf4' }}>
                  {row.actualDays}.0
                </td>
                <td className="font-mono text-blue-700" style={{ backgroundColor: '#eff6ff' }}>
                  {row.paidLeaveDays > 0 ? `${row.paidLeaveDays}.0` : '-'}
                </td>
                <td className="font-mono font-bold text-emerald-700" style={{ backgroundColor: '#ecfdf5', fontSize: '0.8125rem' }}>
                  {row.totalWorkDays}.0
                </td>
                <td className="font-mono font-bold text-amber-700" style={{ backgroundColor: '#fffbeb' }}>
                  {row.totalOtHours > 0 ? `${row.totalOtHours}h` : '-'}
                </td>
                <td>
                  <span
                    className={`badge ${
                      timesheetStatus === 'LOCKED'
                        ? 'badge-success'
                        : timesheetStatus === 'SITE_CONFIRMED'
                        ? 'badge-info'
                        : 'badge-warning'
                    }`}
                    style={{ fontSize: '0.625rem', padding: '0.2rem 0.4rem' }}
                  >
                    {timesheetStatus === 'LOCKED'
                      ? 'Đã Khóa L2'
                      : timesheetStatus === 'SITE_CONFIRMED'
                      ? 'CHT Duyệt L1'
                      : 'Bản Nháp'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7. Modal: Day Attendance Verification Details (UC-15) */}
      {selectedCell && (
        <div className="modal-backdrop" onClick={() => setSelectedCell(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Chi Tiết Điểm Danh Ngày {selectedCell.dayNumber < 10 ? `0${selectedCell.dayNumber}` : selectedCell.dayNumber}/{selectedMonth.padStart(2, '0')}/{selectedYear} ({getDayOfWeek(selectedCell.dayNumber)})
                </h3>
                <span className="text-xs text-slate-500">
                  Nhân sự: <strong>{selectedCell.employee.fullName}</strong> ({selectedCell.employee.employeeCode})
                </span>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Ký hiệu ghi nhận:</span>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2563eb' }}>
                    {selectedCell.attendance.symbol} ({selectedCell.attendance.symbol === 'X' ? 'Đi làm đủ ca 8h' : selectedCell.attendance.symbol === 'O' ? `Làm thêm ${selectedCell.attendance.otHours}h OT` : selectedCell.attendance.symbol === 'P' ? 'Nghỉ phép năm' : 'Nghỉ ca'})
                  </div>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Trạng thái xác thực:</span>
                  <div>
                    <span className="badge badge-success">Hợp Lệ 100%</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian Check-in:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedCell.attendance.checkIn || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian Check-out:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedCell.attendance.checkOut || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phương thức xác thực:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{selectedCell.attendance.method || 'Tự động tổng hợp'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Địa điểm ghi nhận:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{selectedCell.attendance.location || 'Tại trụ sở / Công trường'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Diễn giải / Ghi chú ca:</span>
                  <span style={{ color: 'var(--text-body)' }}>{selectedCell.attendance.note || 'Không có ghi chú'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {isSiteEngineer && (
                  <>
                    <button
                      onClick={() => {
                        const day = selectedCell.dayNumber;
                        setSelectedCell(null);
                        showToast(`Đã ghi nhận yêu cầu: Đơn giải trình bù công cho ngày ${day}/${selectedMonth.padStart(2, '0')}/${selectedYear} đã được chuyển đến CHT duyệt Cấp 1!`);
                      }}
                      className="btn btn-sm btn-primary"
                      style={{ backgroundColor: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <FileText size={13} /> Nộp Đơn Giải Trình Ngày {selectedCell.dayNumber}
                    </button>
                    <button
                      onClick={() => {
                        const day = selectedCell.dayNumber;
                        setSelectedCell(null);
                        showToast(`Đã ghi nhận yêu cầu: Đơn làm thêm giờ OT ca ngày ${day}/${selectedMonth.padStart(2, '0')}/${selectedYear} đã được chuyển đến CHT duyệt Cấp 1!`);
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Clock size={13} /> Đăng Ký OT Ngày {selectedCell.dayNumber}
                    </button>
                  </>
                )}

                {currentRole === 'SITE_MANAGER' && (
                  <button
                    onClick={() => {
                      const empName = selectedCell.employee.fullName;
                      const day = selectedCell.dayNumber;
                      setSelectedCell(null);
                      showToast(`Chỉ huy trưởng đã ký xác nhận Điểm Danh Khẩn Cấp (Emergency Punch UC-08) cho ${empName} ngày ${day}/${selectedMonth.padStart(2, '0')}/${selectedYear}!`);
                    }}
                    className="btn btn-sm btn-primary"
                    style={{ backgroundColor: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <AlertTriangle size={13} /> Điểm Danh Bổ Sung Khẩn Cấp (UC-08)
                  </button>
                )}
              </div>

              <button onClick={() => setSelectedCell(null)} className="btn btn-secondary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
