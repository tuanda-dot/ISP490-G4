import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  CheckCircle2,
  Download,
  Filter,
  Building,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  FileCode,
  FileText,
  X,
  ExternalLink,
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  Lock,
  AlertCircle,
  CalendarCheck,
  KeyRound,
  Check,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ExecutiveDashboardResponse } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const isStaff = currentRole === 'SITE_ENGINEER' || currentRole === 'OFFICE_STAFF';
  const isSiteManager = currentRole === 'SITE_MANAGER';

  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedProject, setSelectedProject] = useState('ALL');

  // Chart Tooltips State
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Accounting Vouchers Modal State
  const [showVouchersModal, setShowVouchersModal] = useState(false);

  // --- Site Engineer Interactive State ---
  const [engCheckInStatus, setEngCheckInStatus] = useState<'CHECKED_IN' | 'CHECKED_OUT'>('CHECKED_IN');
  const [engCheckInTime, setEngCheckInTime] = useState('07:52:14 AM');
  const [engCheckOutTime, setEngCheckOutTime] = useState<string | null>(null);
  const [engOtpInput] = useState('849 201');
  const [engPunching, setEngPunching] = useState(false);
  const [engToast, setEngToast] = useState<string | null>(null);
  const [showQuickOtModal, setShowQuickOtModal] = useState(false);
  const [showQuickExplainModal, setShowQuickExplainModal] = useState(false);
  const [showQuickLeaveModal, setShowQuickLeaveModal] = useState(false);
  const [showQuickPayslipModal, setShowQuickPayslipModal] = useState(false);
  const [quickOtForm, setQuickOtForm] = useState({
    shift: 'NIGHT_20_04',
    hours: 4,
    multiplier: 1.8,
    reason: 'Trực kỹ thuật kiểm tra độ võng và đổ bê tông dầm sàn K12 tháp Tây',
  });
  const [quickExplainForm, setQuickExplainForm] = useState({
    date: '2026-10-21',
    type: 'GPS_DEVIATION',
    reason: 'Làm việc dưới đáy hố móng B3, kết cấu cốt thép chắn sóng GPS vệ tinh.',
  });
  const [quickLeaveForm, setQuickLeaveForm] = useState({
    date: '2026-10-24',
    days: 1,
    reason: 'Giải quyết việc gia đình (đã bàn giao nhật ký trắc địa cho KS Trung)',
  });
  const [engRequests, setEngRequests] = useState([
    {
      id: 101,
      title: 'Đơn Tăng Ca OT Ban Đêm (Đổ Bê Tông K12)',
      hours: '4.0h (1.8x)',
      submittedAt: 'Hôm nay 09:30 AM',
      status: 'PENDING_L1',
      statusText: 'Chờ CHT Duyệt Cấp 1 (L1)',
      note: 'Dự án Cầu Nhật Tân 2 • Khối lượng nghiệm thu ca đêm',
    },
    {
      id: 102,
      title: 'Đơn Xin Nghỉ Phép Năm Ngày 24/10',
      hours: '1.0 ngày',
      submittedAt: 'Hôm qua 15:45 PM',
      status: 'APPROVED_L1',
      statusText: 'CHT đã duyệt L1 • Chờ HR L2',
      note: 'Trừ vào quỹ phép năm còn 10 ngày',
    },
    {
      id: 103,
      title: 'Đơn Làm Thêm Giờ OT Chủ Nhật 19/10',
      hours: '8.0h (2.0x)',
      submittedAt: '17/10/2026',
      status: 'APPROVED_L2',
      statusText: 'Đã Duyệt 2 Cấp (Hợp Lệ Tính Lương)',
      note: 'Đổ bê tông dầm trụ T4 • Đã chốt tính vào lương T10',
    },
  ]);

  // --- Site Manager Interactive State ---
  const [smOtp, setSmOtp] = useState('849 201');
  const [smTimesheetConfirmed, setSmTimesheetConfirmed] = useState(false);
  const [smToast, setSmToast] = useState<string | null>(null);
  const [showSmEmergencyModal, setShowSmEmergencyModal] = useState(false);
  const [smEmergencyForm, setSmEmergencyForm] = useState({
    employeeCode: 'HM-010',
    employeeName: 'Vũ Quốc Việt',
    shift: 'Ca Ngày (07:30 - 17:00)',
    checkInTime: '07:35',
    reason: 'Kỹ sư trắc địa làm việc dưới hố móng tầng hầm B3, kết cấu bê tông cốt thép dày che chắn sóng 4G/GPS.',
  });
  const [smRosterList, setSmRosterList] = useState([
    { id: 1, code: 'HM-005', name: 'Nguyễn Lê Gia Phát', role: 'Chỉ Huy Trưởng Công Trường', checkIn: '07:45 AM', coords: '21.0925° N, 105.8175° E', dist: 12, otp: '849 201', status: 'IN_GEOFENCE', note: 'Chỉ huy trưởng đúng ca' },
    { id: 2, code: 'HM-006', name: 'Trần Văn Trung', role: 'Kỹ Sư Kết Cấu Hiện Trường', checkIn: '07:52 AM', coords: '21.0926° N, 105.8173° E', dist: 18, otp: '849 201', status: 'IN_GEOFENCE', note: 'Hợp lệ trong bán kính 150m' },
    { id: 3, code: 'HM-007', name: 'Phạm Thành Nam', role: 'Kỹ Sư Cơ Điện MEP', checkIn: '07:50 AM', coords: '21.0924° N, 105.8177° E', dist: 25, otp: '849 201', status: 'IN_GEOFENCE', note: 'Hợp lệ trong bán kính 150m' },
    { id: 4, code: 'HM-008', name: 'Hoàng Thị Lan', role: 'Kỹ Sư Thí Nghiệm Vật Liệu', checkIn: '08:02 AM', coords: '21.0923° N, 105.8170° E', dist: 45, otp: '849 201', status: 'LATE', note: 'Muộn 2 phút (Ca 08:00)' },
    { id: 5, code: 'HM-010', name: 'Vũ Quốc Việt', role: 'Kỹ Sư Trắc Địa & Cao Độ', checkIn: '--:--', coords: 'Offline (Mất sóng)', dist: 0, otp: '--', status: 'MISSING', note: 'Sự cố mất sóng hố móng B3' },
  ]);
  const [smPendingL1Requests, setSmPendingL1Requests] = useState([
    {
      id: 201,
      empCode: 'HM-007',
      empName: 'Phạm Thành Nam',
      type: 'OT_NIGHT',
      title: 'Đăng Ký Làm Thêm Giờ (OT Ban Đêm)',
      details: '4 giờ trực ca đêm đổ bê tông cọc khoan nhồi dầm D3 (20:00 - 24:00 ngày 22/10) • Hệ số 1.8x',
      status: 'PENDING',
    },
    {
      id: 202,
      empCode: 'HM-006',
      empName: 'Trần Văn Trung',
      type: 'EXPLANATION',
      title: 'Đơn Giải Trình Quên Check-Out',
      details: 'Hết pin điện thoại vào cuối ca trực kiểm tra an toàn giàn giáo trên cao lúc 17:00 ngày 20/10.',
      status: 'PENDING',
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getExecutiveDashboard(Number(selectedMonth), Number(selectedYear));
        setData(res);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  const formatVND = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Dynamic calculations based on selected month
  const monthMultiplier = selectedMonth === '10' ? 1.0 : selectedMonth === '09' ? 0.985 : 0.962;

  const tk622 = Math.round((data?.costAllocationByAccount?.TK_622 || 175000000) * monthMultiplier);
  const tk627 = Math.round((data?.costAllocationByAccount?.TK_627 || 110000000) * monthMultiplier);
  const tk642 = Math.round((data?.costAllocationByAccount?.TK_642 || 60000000) * monthMultiplier);
  const totalCost = tk622 + tk627 + tk642;

  const pct622 = ((tk622 / totalCost) * 100).toFixed(1);
  const pct627 = ((tk627 / totalCost) * 100).toFixed(1);
  const pct642 = ((tk642 / totalCost) * 100).toFixed(1);

  // Bar Chart Data (TK 622, TK 627, TK 642: Salary vs Employer Insurance)
  const barChartAccounts = [
    {
      code: 'TK 622',
      name: 'Nhân công trực tiếp',
      salary: Math.round(tk622 * 0.8),
      insurance: Math.round(tk622 * 0.2),
      total: tk622,
      pct: pct622,
    },
    {
      code: 'TK 627',
      name: 'Sản xuất chung / Giám sát',
      salary: Math.round(tk627 * 0.8),
      insurance: Math.round(tk627 * 0.2),
      total: tk627,
      pct: pct627,
    },
    {
      code: 'TK 642',
      name: 'Chi phí quản lý văn phòng',
      salary: Math.round(tk642 * 0.8),
      insurance: Math.round(tk642 * 0.2),
      total: tk642,
      pct: pct642,
    },
  ];

  // 6-Month Trend Data (Million VND)
  const trendData = [
    { month: 'T05/26', gross: 310, net: 268 },
    { month: 'T06/26', gross: 318, net: 274 },
    { month: 'T07/26', gross: 325, net: 281 },
    { month: 'T08/26', gross: 332, net: 287 },
    { month: 'T09/26', gross: 340, net: 294 },
    { month: 'T10/26', gross: 345, net: 298.5 },
  ];

  // Project Cost Allocation Table Data
  const projectAllocations = [
    {
      code: 'DA-NHATTAN2',
      name: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      manager: 'Nguyễn Lê Gia Phát',
      tk622: Math.round(98000000 * monthMultiplier),
      tk627: Math.round(58000000 * monthMultiplier),
      tk642: 0,
      total: Math.round(156000000 * monthMultiplier),
      status: 'BALANCED',
    },
    {
      code: 'DA-LANDMARK',
      name: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
      manager: 'Hoàng Văn Long',
      tk622: Math.round(77000000 * monthMultiplier),
      tk627: Math.round(52000000 * monthMultiplier),
      tk642: 0,
      total: Math.round(129000000 * monthMultiplier),
      status: 'BALANCED',
    },
    {
      code: 'VP-TRUSO',
      name: 'Chi Phí Khối Văn Phòng & Ban Điều Hành',
      manager: 'Đoàn Anh Tuấn',
      tk622: 0,
      tk627: 0,
      tk642: Math.round(60000000 * monthMultiplier),
      total: Math.round(60000000 * monthMultiplier),
      status: 'BALANCED',
    },
  ];

  // Double-Entry Journal Vouchers List (Thông tư 200/2014/TT-BTC)
  const journalVouchers = [
    {
      id: 1,
      debit: '622',
      credit: '3341',
      projectCode: 'DA-NHATTAN2',
      description: `Lương nhân công trực tiếp Cầu Nhật Tân 2 kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(98000000 * monthMultiplier),
    },
    {
      id: 2,
      debit: '622',
      credit: '3341',
      projectCode: 'DA-LANDMARK',
      description: `Lương nhân công trực tiếp Landmark Hải Minh kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(77000000 * monthMultiplier),
    },
    {
      id: 3,
      debit: '627',
      credit: '3341',
      projectCode: 'DA-NHATTAN2',
      description: `Lương nhân sự giám sát & chỉ huy hiện trường kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(110000000 * monthMultiplier),
    },
    {
      id: 4,
      debit: '642',
      credit: '3341',
      projectCode: 'VP-TRUSO',
      description: `Chi phí lương khối văn phòng ban giám đốc kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(60000000 * monthMultiplier),
    },
    {
      id: 5,
      debit: '622, 627, 642',
      credit: '3383, 3384, 3386',
      projectCode: 'TOAN-CONG-TY',
      description: `Trích Bảo hiểm bắt buộc phần Doanh nghiệp trả (23.5%) kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(81075000 * monthMultiplier),
    },
    {
      id: 6,
      debit: '3341',
      credit: '3383, 3384, 3386',
      projectCode: 'TOAN-CONG-TY',
      description: `Khấu trừ Bảo hiểm phần Người lao động đóng (10.5%) kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(36225000 * monthMultiplier),
    },
    {
      id: 7,
      debit: '3341',
      credit: '3335',
      projectCode: 'TOAN-CONG-TY',
      description: `Khấu trừ Thuế TNCN lũy tiến phải nộp Nhà nước kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(10275000 * monthMultiplier),
    },
    {
      id: 8,
      debit: '3341',
      credit: '1121',
      projectCode: 'TOAN-CONG-TY',
      description: `Thanh toán chuyển khoản ngân hàng lương thực nhận (Net) kỳ T${selectedMonth}/${selectedYear}`,
      amount: Math.round(298500000 * monthMultiplier),
    },
  ];

  // Donut chart stroke calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const stroke622 = (Number(pct622) / 100) * circumference;
  const stroke627 = (Number(pct627) / 100) * circumference;
  const stroke642 = (Number(pct642) / 100) * circumference;

  // Export handlers
  const handleExportMisaXml = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AccountingJournalVouchers xmlns="http://misa.vn/amis/accounting">
  <Header>
    <Company>CÔNG TY CỔ PHẦN XÂY DỰNG HẢI MINH</Company>
    <TaxCode>0109988776</TaxCode>
    <VoucherType>PKT_LUONG</VoucherType>
    <PeriodMonth>${selectedMonth}</PeriodMonth>
    <PeriodYear>${selectedYear}</PeriodYear>
    <VoucherNo>PKT-${selectedYear}-${selectedMonth}-001</VoucherNo>
    <PostingDate>2026-10-31</PostingDate>
    <Status>BALANCED</Status>
    <TotalDebit>${totalCost + Math.round(81075000 * monthMultiplier)}</TotalDebit>
    <TotalCredit>${totalCost + Math.round(81075000 * monthMultiplier)}</TotalCredit>
  </Header>
  <JournalEntries>
    ${journalVouchers
      .map(
        (v) => `
    <Entry id="${v.id}">
      <DebitAccount>${v.debit}</DebitAccount>
      <CreditAccount>${v.credit}</CreditAccount>
      <Amount>${v.amount}</Amount>
      <ProjectCode>${v.projectCode}</ProjectCode>
      <Description>${v.description}</Description>
    </Entry>`
      )
      .join('')}
  </JournalEntries>
</AccountingJournalVouchers>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MISA_AMIS_Voucher_PKT-${selectedYear}-${selectedMonth}-001.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFastCsv = () => {
    const csvHeader = 'MA_CT,NGAY_CT,SO_CT,TK_NO,TK_CO,SO_TIEN,MA_VU_VIEC,DIEN_GIAI\n';
    const csvRows = journalVouchers
      .map(
        (v) =>
          `PKT,31/${selectedMonth}/${selectedYear},PKT-${selectedYear}-${selectedMonth}-001,"${v.debit}","${v.credit}",${v.amount},"${v.projectCode}","${v.description}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FAST_Cost_Allocation_PR-${selectedYear}-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Staff Persona Dashboard: Site Engineer & Office Staff Action Portal
  if (isStaff) {
    const isSite = currentRole === 'SITE_ENGINEER';

    const handleEngCheckIn = () => {
      setEngPunching(true);
      setTimeout(() => {
        setEngCheckInStatus('CHECKED_IN');
        setEngCheckInTime(new Date().toLocaleTimeString('vi-VN'));
        setEngPunching(false);
        setEngToast('Kỹ sư đã Check-In thành công bằng định vị GPS Geofence và Dynamic OTP ca làm việc (UC-07)!');
        setTimeout(() => setEngToast(null), 4000);
      }, 700);
    };

    const handleEngCheckOut = () => {
      setEngPunching(true);
      setTimeout(() => {
        setEngCheckInStatus('CHECKED_OUT');
        setEngCheckOutTime(new Date().toLocaleTimeString('vi-VN'));
        setEngPunching(false);
        setEngToast('Kỹ sư đã Check-Out ra ca thành công! Đã ghi nhận đủ 8.0 giờ công chuẩn ngày hôm nay.');
        setTimeout(() => setEngToast(null), 4000);
      }, 700);
    };

    const handleQuickOtSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickOtForm.reason.trim()) {
        alert('Vui lòng nhập lý do làm thêm giờ.');
        return;
      }
      const newReq = {
        id: Date.now(),
        title: `Đơn Tăng Ca OT Ban Đêm (${quickOtForm.hours}h - ${quickOtForm.multiplier}x)`,
        hours: `${quickOtForm.hours}.0h (${quickOtForm.multiplier}x)`,
        submittedAt: 'Vừa xong',
        status: 'PENDING_L1',
        statusText: 'Chờ CHT Duyệt Cấp 1 (L1)',
        note: quickOtForm.reason,
      };
      setEngRequests([newReq, ...engRequests]);
      setShowQuickOtModal(false);
      setEngToast(`Đã nộp Đơn Đăng Ký Tăng Ca OT (UC-13) đến Chỉ huy trưởng công trường thành công!`);
      setTimeout(() => setEngToast(null), 4000);
    };

    const handleQuickExplainSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickExplainForm.reason.trim()) {
        alert('Vui lòng nhập lý do giải trình.');
        return;
      }
      const newReq = {
        id: Date.now(),
        title: `Đơn Giải Trình Bù Công Ngày ${quickExplainForm.date}`,
        hours: 'Bù 8.0h công',
        submittedAt: 'Vừa xong',
        status: 'PENDING_L1',
        statusText: 'Chờ CHT Duyệt Cấp 1 (L1)',
        note: quickExplainForm.reason,
      };
      setEngRequests([newReq, ...engRequests]);
      setShowQuickExplainModal(false);
      setEngToast('Đã gửi Đơn Giải Trình Chấm Công (UC-11) đến Chỉ huy trưởng thành công!');
      setTimeout(() => setEngToast(null), 4000);
    };

    const handleQuickLeaveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickLeaveForm.reason.trim()) {
        alert('Vui lòng nhập lý do nghỉ phép.');
        return;
      }
      const newReq = {
        id: Date.now(),
        title: `Đơn Xin Nghỉ Phép Năm Ngày ${quickLeaveForm.date}`,
        hours: `${quickLeaveForm.days}.0 ngày`,
        submittedAt: 'Vừa xong',
        status: 'PENDING_L1',
        statusText: 'Chờ CHT Duyệt Cấp 1 (L1)',
        note: quickLeaveForm.reason,
      };
      setEngRequests([newReq, ...engRequests]);
      setShowQuickLeaveModal(false);
      setEngToast('Đã gửi Đơn Nghỉ Phép Năm (UC-10) đến Chỉ huy trưởng thành công!');
      setTimeout(() => setEngToast(null), 4000);
    };

    return (
      <div className="page-wrapper">
        {/* Toast Alert */}
        {engToast && (
          <div className="alert-banner alert-banner-success" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{engToast}</span>
            </div>
          </div>
        )}

        {/* 1. Page Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className={`badge ${isSite ? 'badge-primary' : 'badge-info'}`}>
                {isSite ? 'Kỹ Sư Hiện Trường (Mobile Site Engineer)' : 'Chuyên Viên Văn Phòng Tổng Công Ty'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Mã NV: <strong className="font-mono text-slate-800">{user?.employeeCode || 'HM-006'}</strong>
              </span>
              {isSite && (
                <span className="badge badge-secondary" style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                  Dự án: Cầu Nhật Tân 2 (DA-NHATTAN2)
                </span>
              )}
            </div>
            <h1 className="page-title">
              Cổng Tác Nghiệp Kỹ Sư Hiện Trường (Site Engineer Action Portal)
            </h1>
            <p className="page-description">
              Xin chào, <strong>{user?.fullName || 'Trần Văn Trung'}</strong> • Điểm danh di động GPS Geofence 1-chạm, nộp đơn tăng ca OT ca đêm và tra cứu phiếu lương E-Payslip bảo mật.
            </p>
          </div>

          <div className="header-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            {isSite && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQuickOtModal(true)}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
                >
                  <Plus size={15} />
                  <span>+ Đăng Ký OT Ban Đêm (UC-13)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickExplainModal(true)}
                  className="btn btn-secondary"
                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                >
                  <FileText size={15} />
                  <span>+ Giải Trình Bù Công (UC-11)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickLeaveModal(true)}
                  className="btn btn-secondary"
                >
                  <Calendar size={15} />
                  <span>+ Xin Nghỉ Phép (UC-10)</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowQuickPayslipModal(true)}
              className="btn btn-secondary"
              style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}
            >
              <Lock size={15} />
              <span>Tra Cứu E-Payslip (UC-24)</span>
            </button>
          </div>
        </div>

        {/* 2. Personal KPI Cards */}
        <div className="kpi-strip">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Ngày Công Lũy Kế T10</span>
              <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
                <CalendarCheck size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">24 / 26 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>ngày</span></div>
            <div className="kpi-subtext">Đạt <span className="font-semibold text-emerald-600">92.3%</span> định mức tháng • 0 ngày vắng</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tăng Ca OT Ghi Nhận</span>
              <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
                <Clock size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">{isSite ? '8.0' : '4.0'} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>giờ</span></div>
            <div className="kpi-subtext">Hưởng hệ số <span className="font-medium text-slate-700">{isSite ? '2.0x (Chủ Nhật đổ bê tông)' : '1.5x (Ngày thường)'}</span></div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Quỹ Nghỉ Phép Năm Còn</span>
              <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
                <Calendar size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">10 / 12 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>ngày</span></div>
            <div className="kpi-subtext">Đã sử dụng 2 ngày nghỉ phép hưởng 100% lương</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Phiếu Lương E-Payslip T10</span>
              <div className="kpi-icon-wrap" style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
                <Lock size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums" style={{ fontSize: '1.25rem', color: '#7c3aed' }}>ĐÃ SẴN SÀNG</div>
            <div className="kpi-subtext">Mã hóa riêng theo Đ.95 BLLĐ • Sẵn sàng tra cứu</div>
          </div>
        </div>

        {/* 3. Today's Attendance Real-Time Status & Interactive 1-Tap Punch */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Card: Điểm Danh Di Động GPS + Dynamic OTP 1-Chạm (UC-07) */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: engCheckInStatus === 'CHECKED_OUT' ? '#64748b' : '#10b981' }} />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Điểm Danh Ca Hôm Nay (21/10/2026)</h3>
              </div>
              <span className={`badge ${engCheckInStatus === 'CHECKED_OUT' ? 'badge-secondary' : 'badge-success'}`}>
                {engCheckInStatus === 'CHECKED_OUT' ? 'Đã Check-Out Ra Ca' : 'Đang Trong Ca Làm Việc'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thời gian Check-in Vào:</span>
                <span className="font-mono font-semibold text-emerald-700">{engCheckInTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thời gian Check-out Ra:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {engCheckOutTime ? engCheckOutTime : 'Chưa check-out (Dự kiến: 17:00 PM)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vị trí GPS thực tế:</span>
                <span className="font-mono text-slate-700">21.0925&deg; N, 105.8175&deg; E (Sai số 18m &lt; 150m R)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã Dynamic OTP nhập:</span>
                <span className="font-mono font-bold text-amber-700">{engOtpInput} &check;</span>
              </div>
            </div>

            {/* 1-Tap Punch Action Button */}
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              {engCheckInStatus === 'CHECKED_IN' ? (
                <button
                  type="button"
                  onClick={handleEngCheckOut}
                  disabled={engPunching}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', backgroundColor: '#d97706', borderColor: '#b45309' }}
                >
                  {engPunching ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang Xác Thực Sinh Trắc Liveness...</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} />
                      <span>Bấm Check-Out Ra Ca (17:00 PM)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEngCheckIn}
                  disabled={engPunching}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {engPunching ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang Quét AI Face ID &amp; GPS...</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} />
                      <span>Bấm Điểm Danh Lại Vào Ca (Check-In)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Card: Bảo Mật Phiếu Lương E-Payslip & Quick Verification */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fcfcfd', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} color="#7c3aed" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: '#4c1d95' }}>
                  Phiếu Lương Điện Tử Cá Nhân (E-Payslip)
                </h3>
              </div>
              <span className="badge badge-info" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                Bảo Mật Cấp 1
              </span>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Phiếu thanh toán thu nhập Tháng 10/2026 của bạn đã được đối soát đầy đủ phụ cấp công trình, tiền ăn ca, bảo hiểm và thuế TNCN theo Điều 95 Bộ luật Lao động.
            </p>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã số bảo mật tra cứu:</span>
                <span className="font-mono font-bold text-slate-800">PKT-2026-10-SEC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Chữ ký số phòng Kế toán:</span>
                <span className="font-mono text-emerald-600 font-medium">SHA-256 VERIFIED</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQuickPayslipModal(true)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', backgroundColor: '#7c3aed' }}
            >
              <Lock size={14} />
              <span>Mở Xem Chi Tiết Thu Nhập Của Bạn (UC-24)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 4. Recent Timesheet Log & Request Approvals Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {/* Table: Nhật ký chấm công gần nhất */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Nhật Ký Điểm Danh Gần Đây</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>5 ca gần nhất</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Tăng Ca</th>
                    <th>Xác Thực</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-slate-800">21/10 (Nay)</td>
                    <td className="font-mono text-emerald-600">{engCheckInTime}</td>
                    <td className="font-mono text-slate-700">{engCheckOutTime ? engCheckOutTime : 'Đang trong ca'}</td>
                    <td className="font-mono">-</td>
                    <td><span className="badge badge-success">GPS + OTP</span></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">20/10 (T2)</td>
                    <td className="font-mono text-slate-700">07:54 AM</td>
                    <td className="font-mono text-slate-700">17:05 PM</td>
                    <td className="font-mono">-</td>
                    <td><span className="badge badge-success">8.0h</span></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">19/10 (CN)</td>
                    <td className="font-mono text-slate-700">08:00 AM</td>
                    <td className="font-mono text-slate-700">17:00 PM</td>
                    <td className="font-mono font-bold text-amber-600">8.0h OT (2.0x)</td>
                    <td><span className="badge badge-warning">OT Đổ Bê Tông</span></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">18/10 (T7)</td>
                    <td className="font-mono text-slate-700">07:50 AM</td>
                    <td className="font-mono text-slate-700">17:10 PM</td>
                    <td className="font-mono">-</td>
                    <td><span className="badge badge-success">8.0h</span></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">17/10 (T6)</td>
                    <td className="font-mono text-slate-700">07:55 AM</td>
                    <td className="font-mono text-slate-700">17:02 PM</td>
                    <td className="font-mono">-</td>
                    <td><span className="badge badge-success">8.0h</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* List: Trạng Thái Đơn Từ Của Tôi */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Đơn Từ &amp; Yêu Cầu Của Tôi</h3>
              <span className="badge badge-info">{engRequests.length} Yêu cầu</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {engRequests.map((req) => (
                <div key={req.id} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>{req.title}</strong>
                    <span className={`badge ${req.status === 'APPROVED_L2' ? 'badge-success' : req.status === 'APPROVED_L1' ? 'badge-primary' : 'badge-warning'}`}>
                      {req.statusText}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {req.note} • Gửi: {req.submittedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal: Đăng Ký OT Ban Đêm (UC-13) */}
        {showQuickOtModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Đăng Ký Làm Thêm Giờ Hiện Trường (OT - UC-13)</h3>
                  <p className="modal-subtitle">Gửi yêu cầu làm thêm ca đêm đổ bê tông / kéo cáp đến Chỉ huy trưởng dự án duyệt Cấp 1</p>
                </div>
                <button onClick={() => setShowQuickOtModal(false)} className="btn-icon">&times;</button>
              </div>

              <form onSubmit={handleQuickOtSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                  <div className="form-group">
                    <label className="form-label">Dự Án Đăng Ký OT</label>
                    <input type="text" className="form-input" value="Cầu Nhật Tân 2 &amp; Nút Giao Vành Đai (DA-NHATTAN2)" disabled />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Khung Ca Làm Việc</label>
                      <select
                        className="form-select"
                        value={quickOtForm.shift}
                        onChange={(e) => setQuickOtForm({ ...quickOtForm, shift: e.target.value })}
                      >
                        <option value="NIGHT_20_04">Ca Đêm Đổ Bê Tông (20:00 - 04:00)</option>
                        <option value="EVENING_18_22">Ca Tối Tăng Cường (18:00 - 22:00)</option>
                        <option value="SUNDAY_ALLDAY">Ca Chủ Nhật (08:00 - 17:00)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Số Giờ Đăng Ký (h)</label>
                      <input
                        type="number"
                        className="form-input font-mono"
                        min={1}
                        max={8}
                        value={quickOtForm.hours}
                        onChange={(e) => setQuickOtForm({ ...quickOtForm, hours: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nội Dung Công Việc Đổ Bê Tông / Nghiệm Thu (*)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={quickOtForm.reason}
                      onChange={(e) => setQuickOtForm({ ...quickOtForm, reason: e.target.value })}
                      placeholder="Mô tả công việc hiện trường (đổ bê tông dầm, cọc khoan nhồi, trắc địa...)..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowQuickOtModal(false)} className="btn btn-secondary">Hủy Bỏ</button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#d97706' }}>
                    <Send size={15} />
                    <span>Gửi Chỉ Huy Trưởng Duyệt L1</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Giải Trình Bù Công (UC-11) */}
        {showQuickExplainModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Lập Đơn Giải Trình Bù Công (UC-11)</h3>
                  <p className="modal-subtitle">Giải trình quên check-in/out hoặc định vị GPS bị che chắn bởi kết cấu bê tông/sắt thép</p>
                </div>
                <button onClick={() => setShowQuickExplainModal(false)} className="btn-icon">&times;</button>
              </div>

              <form onSubmit={handleQuickExplainSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Ngày Cần Bù Công</label>
                      <input
                        type="date"
                        className="form-input font-mono"
                        value={quickExplainForm.date}
                        onChange={(e) => setQuickExplainForm({ ...quickExplainForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Lý Do Kỹ Thuật</label>
                      <select
                        className="form-select"
                        value={quickExplainForm.type}
                        onChange={(e) => setQuickExplainForm({ ...quickExplainForm, type: e.target.value })}
                      >
                        <option value="GPS_DEVIATION">Lệch GPS do dầm thép che khuất</option>
                        <option value="MISSING_CHECKOUT">Hết pin điện thoại cuối ca</option>
                        <option value="NETWORK_OUTAGE">Mất kết nối mạng 4G hố móng</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chi Tiết Giải Trình Kèm Xác Nhận Thực Tế (*)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={quickExplainForm.reason}
                      onChange={(e) => setQuickExplainForm({ ...quickExplainForm, reason: e.target.value })}
                      placeholder="Mô tả ca trực và vị trí làm việc để Chỉ huy trưởng đối chiếu nhật ký thi công..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowQuickExplainModal(false)} className="btn btn-secondary">Hủy Bỏ</button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
                    <Send size={15} />
                    <span>Gửi Đơn Giải Trình (L1)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Nghỉ Phép Năm (UC-10) */}
        {showQuickLeaveModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Đơn Xin Nghỉ Phép Năm (UC-10)</h3>
                  <p className="modal-subtitle">Quỹ phép năm còn lại: 10 / 12 ngày • Hưởng 100% lương theo BLLĐ</p>
                </div>
                <button onClick={() => setShowQuickLeaveModal(false)} className="btn-icon">&times;</button>
              </div>

              <form onSubmit={handleQuickLeaveSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Ngày Nghỉ</label>
                      <input
                        type="date"
                        className="form-input font-mono"
                        value={quickLeaveForm.date}
                        onChange={(e) => setQuickLeaveForm({ ...quickLeaveForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số Ngày Nghỉ</label>
                      <input
                        type="number"
                        className="form-input font-mono"
                        min={1}
                        max={5}
                        value={quickLeaveForm.days}
                        onChange={(e) => setQuickLeaveForm({ ...quickLeaveForm, days: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lý Do Xin Nghỉ (*)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={quickLeaveForm.reason}
                      onChange={(e) => setQuickLeaveForm({ ...quickLeaveForm, reason: e.target.value })}
                      placeholder="Lý do nghỉ việc gia đình / giải quyết công việc cá nhân..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowQuickLeaveModal(false)} className="btn btn-secondary">Hủy Bỏ</button>
                  <button type="submit" className="btn btn-primary">
                    <Send size={15} />
                    <span>Gửi CHT Duyệt Cấp 1</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Xem E-Payslip Cá Nhân (UC-24) */}
        {showQuickPayslipModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Phiếu Lương Điện Tử Cá Nhân (E-Payslip - UC-24)</h3>
                  <p className="modal-subtitle">Kỳ lương Tháng 10/2026 • Bảo mật theo Điều 95 Bộ luật Lao động</p>
                </div>
                <button onClick={() => setShowQuickPayslipModal(false)} className="btn-icon">&times;</button>
              </div>

              <div style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8125rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>Họ và tên: <strong>{user?.fullName || 'Trần Văn Trung'}</strong></div>
                    <div>Mã nhân viên: <strong className="font-mono">{user?.employeeCode || 'HM-006'}</strong></div>
                    <div>Chức danh: <strong>Kỹ Sư Kết Cấu Hiện Trường</strong></div>
                    <div>Đơn vị: <strong>Dự Án Cầu Nhật Tân 2</strong></div>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    I. CÁC KHOẢN THU NHẬP (GROSS)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Lương cơ bản ngày công thực tế (24/26 ngày):</span>
                    <strong className="font-mono">23.076.923 ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Phụ cấp lưu trú &amp; trách nhiệm công trường (TK 627):</span>
                    <strong className="font-mono text-emerald-700">+3.000.000 ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Tiền làm thêm giờ OT (8h Chủ Nhật x 2.0x):</span>
                    <strong className="font-mono text-blue-700">+2.403.846 ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Phụ cấp tiền ăn ca + xăng xe:</span>
                    <strong className="font-mono">+1.460.000 ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem' }}>
                    <strong>TỔNG THU NHẬP GROSS:</strong>
                    <strong className="font-mono text-slate-900">29.940.769 ₫</strong>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    II. CÁC KHOẢN TRÍCH NỘP &amp; KHẤU TRỪ
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Bảo hiểm bắt buộc NLĐ đóng (10.5%):</span>
                    <strong className="font-mono text-rose-700">-2.625.000 ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Thuế thu nhập cá nhân (TNCN lũy tiến):</span>
                    <strong className="font-mono text-amber-700">-1.245.000 ₫</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '6px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#065f46', textTransform: 'uppercase' }}>THỰC LĨNH CHUYỂN KHOẢN (NET)</strong>
                    <div style={{ fontSize: '0.75rem', color: '#047857' }}>Vietcombank • 00110045689xx</div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }} className="font-mono">
                    26.070.769 ₫
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Link to="/payroll" className="btn btn-secondary" onClick={() => setShowQuickPayslipModal(false)}>
                  Xem Trang Phiếu Lương Chi Tiết &rarr;
                </Link>
                <button type="button" onClick={() => setShowQuickPayslipModal(false)} className="btn btn-primary">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Site Manager Persona Dashboard: Site Commander Action Hub (UC-08, UC-15)
  if (isSiteManager) {
    const handleSmGenerateOtp = () => {
      const newCode = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
      setSmOtp(newCode);
      setSmToast(`Chỉ huy trưởng đã cấp phát thành công Mã Dynamic OTP ca làm việc mới: ${newCode} (UC-08)!`);
      setTimeout(() => setSmToast(null), 4000);
    };

    const handleSmApproveL1 = (reqId: number, isApproved: boolean) => {
      setSmPendingL1Requests(prev => prev.map(r => {
        if (r.id === reqId) {
          return { ...r, status: isApproved ? 'APPROVED' : 'REJECTED' };
        }
        return r;
      }));
      if (isApproved) {
        setSmToast(`Chỉ huy trưởng đã Phê Duyệt Cấp 1 (L1) đơn #${reqId}! Dữ liệu đã chuyển tiếp lên Trưởng phòng Nhân sự thẩm định L2.`);
      } else {
        setSmToast(`Chỉ huy trưởng đã Từ Chối đơn #${reqId}.`);
      }
      setTimeout(() => setSmToast(null), 4000);
    };

    const handleSmConfirmTimesheet = () => {
      setSmTimesheetConfirmed(true);
      setSmToast('Chỉ huy trưởng Nguyễn Lê Gia Phát đã xác nhận Bảng công dự án Cầu Nhật Tân 2 Cấp 1 (Site Timesheet Confirmation L1 - UC-15 / BF-07)! Đã đối chiếu 8/8 kỹ sư & 14 giờ OT với nhật ký thi công.');
      setTimeout(() => setSmToast(null), 5000);
    };

    const handleSmEmergencyPunchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!smEmergencyForm.reason.trim()) {
        alert('Vui lòng nhập lý do khẩn cấp tại hiện trường.');
        return;
      }
      setSmRosterList(prev => prev.map(item => {
        if (item.code === smEmergencyForm.employeeCode) {
          return {
            ...item,
            checkIn: smEmergencyForm.checkInTime + ' AM',
            status: 'IN_GEOFENCE',
            note: `CHT ghi nhận khẩn cấp: ${smEmergencyForm.reason.slice(0, 30)}...`,
          };
        }
        return item;
      }));
      setShowSmEmergencyModal(false);
      setSmToast(`Chỉ huy trưởng đã ghi nhận Điểm Danh Khẩn Cấp (UC-08) cho kỹ sư ${smEmergencyForm.employeeName} (${smEmergencyForm.employeeCode}) thành công!`);
      setTimeout(() => setSmToast(null), 4000);
    };

    const pendingCount = smPendingL1Requests.filter(r => r.status === 'PENDING').length;

    return (
      <div className="page-wrapper">
        {/* Toast Alert */}
        {smToast && (
          <div className="alert-banner alert-banner-success" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{smToast}</span>
            </div>
          </div>
        )}

        {/* 1. Page Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-secondary">Chỉ Huy Trưởng Công Trường (Site Commander)</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Dự án: <strong className="text-slate-800">Cầu Nhật Tân 2 &amp; Nút Giao Vành Đai (DA-NHATTAN2)</strong>
              </span>
            </div>
            <h1 className="page-title">
              Trung Tâm Chỉ Huy Hiện Trường &amp; Thẩm Định Chấm Công (UC-08, UC-15)
            </h1>
            <p className="page-description">
              Chỉ huy trưởng: <strong>{user?.fullName || 'Nguyễn Lê Gia Phát'}</strong> • Cấp phát Dynamic OTP ca làm việc, điểm danh bổ sung khẩn cấp, phê duyệt đơn từ Cấp 1 (L1) và xác nhận bảng công dự án.
            </p>
          </div>

          <div className="header-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSmGenerateOtp}
              className="btn btn-secondary"
            >
              <RefreshCw size={15} />
              <span>Sinh Mã OTP Mới (UC-08)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSmEmergencyModal(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
            >
              <Clock size={15} />
              <span>+ Điểm Danh Khẩn Cấp (UC-08)</span>
            </button>
            <button
              type="button"
              onClick={handleSmConfirmTimesheet}
              disabled={smTimesheetConfirmed}
              className="btn btn-primary"
              style={{ backgroundColor: smTimesheetConfirmed ? '#047857' : '#d97706', borderColor: smTimesheetConfirmed ? '#065f46' : '#b45309' }}
            >
              {smTimesheetConfirmed ? (
                <>
                  <Check size={15} />
                  <span>Đã Xác Nhận Bảng Công Dự Án (L1)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Xác Nhận Bảng Công CT (L1 - UC-15)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Site KPI Cards */}
        <div className="kpi-strip">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Quân Số Có Mặt Tại Dự Án</span>
              <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
                <Users size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">5 / 5 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>kỹ sư</span></div>
            <div className="kpi-subtext">Đạt <span className="font-semibold text-emerald-600">100%</span> quân số ca sáng • Giám sát thời gian thực</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Bán Kính Geofence GPS</span>
              <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
                <MapPin size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">150 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>mét</span></div>
            <div className="kpi-subtext">Tâm tọa độ: <span className="font-mono text-slate-700">21.0924&deg; N, 105.8174&deg; E</span></div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Mã Dynamic OTP Ca Sáng</span>
              <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
                <KeyRound size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums font-mono text-amber-600">{smOtp}</div>
            <div className="kpi-subtext">Hiệu lực: <span className="font-medium text-emerald-600">Còn 18 phút</span> (Có thể sinh mới)</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Đơn Cần Phê Duyệt Cấp 1 (L1)</span>
              <div className="kpi-icon-wrap" style={{ color: pendingCount > 0 ? '#dc2626' : '#047857', backgroundColor: pendingCount > 0 ? '#fef2f2' : '#ecfdf5' }}>
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums" style={{ color: pendingCount > 0 ? '#dc2626' : '#047857' }}>
              {pendingCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>đơn</span>
            </div>
            <div className="kpi-subtext">
              {pendingCount > 0 ? 'Có đơn tăng ca ca đêm và giải trình cần duyệt' : 'Đã xử lý toàn bộ hàng đợi Cấp 1'}
            </div>
          </div>
        </div>

        {/* 3. Live Site Attendance Roster with Interactive Emergency Punch Action */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                Bảng Giám Sát Quân Số Kỹ Sư Có Mặt Tại Dự Án Hôm Nay (21/10/2026)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Đối soát bán kính GPS Geofence tự động kết hợp mã Dynamic OTP từng ca (UC-08)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSmEmergencyModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <Clock size={13} />
              <span>+ Điểm Danh Khẩn Cấp (UC-08)</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ Tên Kỹ Sư</th>
                  <th>Vị Trí Công Việc</th>
                  <th>Giờ Check-in</th>
                  <th>Tọa Độ GPS</th>
                  <th>Độ Lệch Tâm</th>
                  <th>Mã OTP Nhập</th>
                  <th>Trạng Thái</th>
                  <th>Ghi Chú Nghiệp Vụ</th>
                </tr>
              </thead>
              <tbody>
                {smRosterList.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono font-semibold">{row.code}</td>
                    <td className="font-medium text-slate-900">{row.name}</td>
                    <td>{row.role}</td>
                    <td className="font-mono text-emerald-600 font-bold">
                      {row.checkIn !== '--:--' ? row.checkIn : <span className="text-slate-400">Chưa vào</span>}
                    </td>
                    <td className="font-mono text-slate-600">{row.coords}</td>
                    <td className="font-mono text-slate-700">{row.dist > 0 ? `${row.dist} mét` : '-'}</td>
                    <td className="font-mono text-emerald-600 font-bold">
                      {row.otp !== '--' ? `${row.otp} \u2713` : <span className="text-slate-400">-</span>}
                    </td>
                    <td>
                      {row.status === 'IN_GEOFENCE' ? (
                        <span className="badge badge-success">Trong Geofence</span>
                      ) : row.status === 'LATE' ? (
                        <span className="badge badge-warning">Muộn 2 phút</span>
                      ) : (
                        <span className="badge badge-secondary">Sự cố mất sóng</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Interactive Level 1 Approval Queue & Timesheet Confirmation Hub */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {/* List: Hàng đợi phê duyệt Cấp 1 (L1 Approval) có 2 nút hành động trực tiếp */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  Hàng Đợi Phê Duyệt Cấp 1 (Chỉ Huy Trưởng Duyệt L1)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Đơn từ chuyên môn sau khi CHT duyệt sẽ chuyển tiếp sang Trưởng phòng Nhân sự thẩm định Cấp 2
                </p>
              </div>
              <span className="badge badge-info">{pendingCount} Đơn Chờ</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {smPendingL1Requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: req.status === 'APPROVED' ? '#ecfdf5' : req.status === 'REJECTED' ? '#fef2f2' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${req.type === 'OT_NIGHT' ? 'badge-warning' : 'badge-info'}`}>
                        {req.type === 'OT_NIGHT' ? 'OT Ban Đêm' : 'Giải Trình Công'}
                      </span>
                      <strong style={{ fontSize: '0.8125rem' }}>{req.empName} ({req.empCode})</strong>
                    </div>
                    {req.status === 'APPROVED' && (
                      <span className="badge badge-success">Đã Duyệt L1 &bull; Chờ HR L2</span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="badge badge-danger">Đã Từ Chối Cấp 1</span>
                    )}
                    {req.status === 'PENDING' && (
                      <span className="badge badge-warning">Chờ CHT Duyệt L1</span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0' }}>
                    {req.details}
                  </p>

                  {req.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSmApproveL1(req.id, true)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        <Check size={13} />
                        <span>Duyệt Cấp 1 (L1)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSmApproveL1(req.id, false)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#b91c1c' }}
                      >
                        <X size={13} />
                        <span>Từ Chối</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card: Xác Nhận Bảng Công Dự Án Cấp 1 (L1 Site Timesheet Confirmation - UC-15 / BF-07) */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fcfcfd', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarCheck size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  Xác Nhận Bảng Công Công Trường Tháng 10/2026 (UC-15 / BF-07)
                </h3>
              </div>
              <span className={`badge ${smTimesheetConfirmed ? 'badge-success' : 'badge-warning'}`}>
                {smTimesheetConfirmed ? 'Đã Xác Nhận Cấp 1 (L1)' : 'Chờ CHT Xác Nhận L1'}
              </span>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
              Theo quy trình BF-07, Chỉ huy trưởng chịu trách nhiệm đối soát toàn bộ số công nhật, công ca và giờ làm thêm OT của lực lượng kỹ sư thuộc dự án <strong>Cầu Nhật Tân 2</strong> đối chiếu với nhật ký thi công hiện trường trước khi gửi lên Trưởng phòng HR.
            </p>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng kỹ sư thuộc dự án:</span>
                <strong className="font-mono">8 kỹ sư (100% quân số)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng giờ tăng ca OT đổ bê tông đêm:</span>
                <strong className="font-mono text-amber-700">14.0 giờ (Hệ số 1.8x/2.0x)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Đối soát nhật ký thi công:</span>
                <strong className="text-emerald-700 font-medium">Khớp 100% không phát sinh lỗi</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSmConfirmTimesheet}
              disabled={smTimesheetConfirmed}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', backgroundColor: smTimesheetConfirmed ? '#047857' : '#d97706' }}
            >
              {smTimesheetConfirmed ? (
                <>
                  <Check size={14} />
                  <span>Đã Xác Nhận &amp; Ký Số Cấp 1 (L1) - Gửi Lên HR</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Xác Nhận &amp; Ký Số Bảng Công Dự Án (L1 - UC-15)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal: Điểm Danh Bổ Sung Khẩn Cấp (UC-08) */}
        {showSmEmergencyModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '540px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Điểm Danh Bổ Sung Khẩn Cấp Tại Hiện Trường (UC-08)</h3>
                  <p className="modal-subtitle">Chỉ huy trưởng trực tiếp ghi nhận công cho kỹ sư gặp sự cố thiết bị/mất mạng tại công trường</p>
                </div>
                <button onClick={() => setShowSmEmergencyModal(false)} className="btn-icon">&times;</button>
              </div>

              <form onSubmit={handleSmEmergencyPunchSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                  <div className="form-group">
                    <label className="form-label">Dự Án Đang Thi Công</label>
                    <input type="text" className="form-input" value="Cầu Nhật Tân 2 &amp; Nút Giao Vành Đai (DA-NHATTAN2)" disabled />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chọn Kỹ Sư Cần Điểm Danh Khẩn Cấp</label>
                    <select
                      className="form-select"
                      value={smEmergencyForm.employeeCode}
                      onChange={(e) => {
                        const emp = smRosterList.find(r => r.code === e.target.value);
                        if (emp) {
                          setSmEmergencyForm({
                            ...smEmergencyForm,
                            employeeCode: emp.code,
                            employeeName: emp.name,
                          });
                        }
                      }}
                    >
                      {smRosterList.map(eng => (
                        <option key={eng.id} value={eng.code}>
                          {eng.code} - {eng.name} ({eng.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Khung Ca Làm Việc</label>
                      <select
                        className="form-select"
                        value={smEmergencyForm.shift}
                        onChange={(e) => setSmEmergencyForm({ ...smEmergencyForm, shift: e.target.value })}
                      >
                        <option value="Ca Ngày (07:30 - 17:00)">Ca Ngày (07:30 - 17:00)</option>
                        <option value="Ca Chiều (13:00 - 21:00)">Ca Chiều (13:00 - 21:00)</option>
                        <option value="Ca Đêm Đổ Bê Tông (20:00 - 04:00)">Ca Đêm Đổ Bê Tông (20:00 - 04:00)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Giờ Check-In Thực Tế</label>
                      <input
                        type="time"
                        className="form-input font-mono"
                        value={smEmergencyForm.checkInTime}
                        onChange={(e) => setSmEmergencyForm({ ...smEmergencyForm, checkInTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lý Do Khẩn Cấp Tại Hiện Trường (*)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={smEmergencyForm.reason}
                      onChange={(e) => setSmEmergencyForm({ ...smEmergencyForm, reason: e.target.value })}
                      placeholder="Mô tả sự cố (mất sóng, điện thoại hỏng, thi công hố móng kín...) để Chỉ huy trưởng ký bảo đảm..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowSmEmergencyModal(false)} className="btn btn-secondary">Hủy Bỏ</button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626' }}>
                    <CheckCircle2 size={15} />
                    <span>Xác Nhận &amp; Ký Điểm Danh Khẩn</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Executive Financial & Attendance Dashboard (Director, Chief Accountant, Accountant, HR Manager, Admin)
  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Tổng Quan Điều Hành Quỹ Lương &amp; Phân Bổ Chi Phí
          </h1>
          <p className="page-description">
            Kỳ quyết toán: Tháng {selectedMonth}/{selectedYear} • Mã kỳ: <span className="tabular-nums font-mono font-medium text-slate-700">PR-{selectedYear}-{selectedMonth}</span> • Khớp chuẩn kế toán MISA / FAST
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowVouchersModal(true)}>
            <FileText size={15} />
            <span>Sổ Bút Toán Kế Toán Kép</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExportFastCsv}>
            <Download size={15} />
            <span>Bảng Kê FAST (.csv)</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportMisaXml}>
            <FileCode size={15} />
            <span>Xuất XML MISA AMIS</span>
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Quỹ Lương Gross</span>
            <div className="kpi-icon-wrap">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">
            {formatVND(Math.round((data?.latestPayroll?.totalGrossSalary || 345000000) * monthMultiplier))}
          </div>
          <div className="kpi-subtext">
            Chuẩn công: <span className="tabular-nums font-medium text-slate-700">26</span> ngày • Trạng thái: <span className="badge badge-warning">Đã soát xét</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Thực Nhận (Net)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>
            {formatVND(Math.round((data?.latestPayroll?.totalNetSalary || 298500000) * monthMultiplier))}
          </div>
          <div className="kpi-subtext">
            Đã trừ BHXH NLĐ (<span className="tabular-nums">10.5%</span>) &amp; Thuế TNCN
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Chi Phí DN Đóng BHXH (23.5%)</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <Building size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#2563eb' }}>
            {formatVND(Math.round((data?.latestPayroll?.totalEmployerCost || 78200000) * monthMultiplier))}
          </div>
          <div className="kpi-subtext">
            BHXH <span className="tabular-nums">17%</span> + BHYT <span className="tabular-nums">3%</span> + BHTN <span className="tabular-nums">1%</span> + TNLĐ <span className="tabular-nums">0.5%</span> + CĐ <span className="tabular-nums">2%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Quy Mô Nhân Sự</span>
            <div className="kpi-icon-wrap">
              <Users size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">
            {data?.totalEmployees || 13} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>nhân sự</span>
          </div>
          <div className="kpi-subtext">
            <span className="tabular-nums font-medium text-slate-700">{data?.totalOfficeStaff || 7}</span> Văn Phòng • <span className="tabular-nums font-medium text-slate-700">{data?.totalSiteEngineers || 6}</span> Kỹ Sư Hiện Trường
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Bộ Lọc:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kỳ Lương:</label>
          <select
            className="form-select font-mono"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '115px' }}
          >
            <option value="10">Tháng 10</option>
            <option value="09">Tháng 09</option>
            <option value="08">Tháng 08</option>
          </select>
          <select
            className="form-select font-mono"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ width: '90px' }}
          >
            <option value="2026">2026</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dự Án / Đơn Vị:</label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="ALL">Toàn Bộ Doanh Nghiệp</option>
            <option value="DA-NHATTAN2">Cầu Nhật Tân 2</option>
            <option value="DA-LANDMARK">Landmark Hải Minh</option>
            <option value="VP-TRUSO">Khối Văn Phòng Trụ Sở</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success">
            <CheckCircle2 size={12} />
            <span>Kế toán cân đối 100% (Khớp TK 334 &amp; TK 338)</span>
          </span>
        </div>
      </div>

      {/* 4. BIỂU ĐỒ CHARTS CHUYÊN NGHIỆP CÓ TOOLTIP (Bar Chart & Donut Chart) */}
      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        {/* Chart 1: Bar Chart - Phân bổ chi phí theo 3 Tài khoản Xây dựng */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 size={16} color="var(--color-primary)" />
              <h2 className="card-title">Cơ Cấu Chi Phí Xây Lắp (TK 622, 627, 642)</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px', display: 'inline-block' }} />
                Tiền Lương Thô
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px', display: 'inline-block' }} />
                BHXH DN Đóng
              </span>
            </div>
          </div>

          <div className="card-body" style={{ position: 'relative' }}>
            {/* SVG Multi-series Bar Chart with Tooltip */}
            <div style={{ width: '100%', height: '220px', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 460 200" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                <line x1="45" y1="20" x2="440" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="65" x2="440" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="110" x2="440" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="155" x2="440" y2="155" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y-Axis Labels */}
                <text x="40" y="24" fill="#94a3b8" fontSize="10" textAnchor="end" className="tabular-nums">200tr</text>
                <text x="40" y="69" fill="#94a3b8" fontSize="10" textAnchor="end" className="tabular-nums">135tr</text>
                <text x="40" y="114" fill="#94a3b8" fontSize="10" textAnchor="end" className="tabular-nums">70tr</text>
                <text x="40" y="159" fill="#94a3b8" fontSize="10" textAnchor="end" className="tabular-nums">0</text>

                {/* 3 Account Bar Groups */}
                {barChartAccounts.map((acc, idx) => {
                  const groupX = 85 + idx * 125;
                  const salaryH = Math.round((acc.salary / 200000000) * 135);
                  const insuranceH = Math.round((acc.insurance / 200000000) * 135);
                  const isHovered = hoveredBarIndex === idx;

                  return (
                    <g
                      key={acc.code}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Highlight backdrop */}
                      {isHovered && (
                        <rect x={groupX - 10} y="15" width="90" height="145" rx="4" fill="rgba(37, 99, 235, 0.05)" />
                      )}

                      {/* Salary Bar (Blue) */}
                      <rect
                        x={groupX}
                        y={155 - salaryH}
                        width="32"
                        height={salaryH}
                        rx="3"
                        fill="#2563eb"
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Insurance Bar (Amber) */}
                      <rect
                        x={groupX + 38}
                        y={155 - insuranceH}
                        width="32"
                        height={insuranceH}
                        rx="3"
                        fill="#f59e0b"
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Top Total Label */}
                      <text
                        x={groupX + 35}
                        y={155 - Math.max(salaryH, insuranceH) - 6}
                        fill="#0f172a"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                        className="tabular-nums"
                      >
                        {formatVND(acc.total).replace(' ₫', ' đ')}
                      </text>

                      {/* X-Axis Account Label */}
                      <text x={groupX + 35} y="174" fill="#0f172a" fontSize="11" fontWeight="600" textAnchor="middle">
                        {acc.code}
                      </text>
                      <text x={groupX + 35} y="188" fill="#64748b" fontSize="9" textAnchor="middle">
                        {acc.pct}%
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip on Hover */}
              {hoveredBarIndex !== null && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '0.75rem',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {barChartAccounts[hoveredBarIndex].code} - {barChartAccounts[hoveredBarIndex].name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#2563eb' }}>
                    <span>Lương thô:</span>
                    <strong className="tabular-nums">{formatVND(barChartAccounts[hoveredBarIndex].salary)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#b45309' }}>
                    <span>BHXH DN:</span>
                    <strong className="tabular-nums">{formatVND(barChartAccounts[hoveredBarIndex].insurance)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Donut Chart - Tỷ trọng phân bổ chi phí xây dựng */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PieIcon size={16} color="var(--color-primary)" />
              <h2 className="card-title">Tỷ Trọng Quỹ Lương Xây Dựng</h2>
            </div>
            <span className="badge badge-success">Cân đối 100%</span>
          </div>

          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '220px' }}>
              {/* Donut Chart SVG */}
              <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                <svg width="180" height="180" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />

                  {/* TK 622 Slice (Blue) */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="18"
                    strokeDasharray={`${stroke622} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDonutIndex(0)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />

                  {/* TK 627 Slice (Amber) */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="18"
                    strokeDasharray={`${stroke627} ${circumference}`}
                    strokeDashoffset={-stroke622}
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDonutIndex(1)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />

                  {/* TK 642 Slice (Slate) */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="18"
                    strokeDasharray={`${stroke642} ${circumference}`}
                    strokeDashoffset={-(stroke622 + stroke627)}
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDonutIndex(2)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />

                  {/* Donut Center Display */}
                  <text x="70" y="66" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="700" className="tabular-nums">
                    {(totalCost / 1000000).toFixed(1)}M
                  </text>
                  <text x="70" y="80" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="500">
                    TỔNG CHI PHÍ
                  </text>
                </svg>
              </div>

              {/* Legend & Breakdown Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, paddingLeft: '1.25rem' }}>
                <div
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: hoveredDonutIndex === 0 ? '#eff6ff' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredDonutIndex(0)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>TK 622 - Nhân Công</span>
                    </div>
                    <span className="tabular-nums font-bold text-blue-600 text-xs">{pct622}%</span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '1.15rem' }} className="tabular-nums">
                    {formatVND(tk622)}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: hoveredDonutIndex === 1 ? '#fffbeb' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredDonutIndex(1)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>TK 627 - Giám Sát</span>
                    </div>
                    <span className="tabular-nums font-bold text-amber-600 text-xs">{pct627}%</span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '1.15rem' }} className="tabular-nums">
                    {formatVND(tk627)}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: hoveredDonutIndex === 2 ? '#f1f5f9' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredDonutIndex(2)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#64748b', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>TK 642 - Quản Lý VP</span>
                    </div>
                    <span className="tabular-nums font-bold text-slate-600 text-xs">{pct642}%</span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '1.15rem' }} className="tabular-nums">
                    {formatVND(tk642)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Biểu Đồ Vùng Xu Hướng 6 Tháng Qua (Area Chart) */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingUp size={16} color="var(--color-primary)" />
            <h2 className="card-title">Xu Hướng Tăng Trưởng Quỹ Lương 6 Tháng Gần Nhất (T05 - T10/2026)</h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Tăng trưởng ổn định theo tiến độ thi công công trình (+11.3%)
          </span>
        </div>

        <div className="card-body">
          <div style={{ width: '100%', height: '140px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 540 130" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <polygon
                points="50,75 140,65 230,55 320,46 410,36 500,30 500,110 50,110"
                fill="url(#trendGradient)"
              />

              {/* Baseline */}
              <line x1="50" y1="110" x2="500" y2="110" stroke="#e2e8f0" strokeWidth="1" />

              {/* Line path */}
              <polyline
                points="50,75 140,65 230,55 320,46 410,36 500,30"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {trendData.map((d, idx) => {
                const x = 50 + idx * 90;
                const y = 75 - idx * 9;
                const isHovered = hoveredTrendIndex === idx;

                return (
                  <g
                    key={d.month}
                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={isHovered ? 3 : 2}
                      style={{ transition: 'all 0.15s ease' }}
                    />
                    <text
                      x={x}
                      y={y - 10}
                      fill={isHovered ? '#2563eb' : '#0f172a'}
                      fontSize="10"
                      fontWeight={isHovered ? '700' : '600'}
                      textAnchor="middle"
                      className="tabular-nums"
                    >
                      {d.gross}M
                    </text>
                    <text x={x} y="122" fill="#64748b" fontSize="10" textAnchor="middle" className="tabular-nums">
                      {d.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 6. Bảng Phân Bổ Chi Phí Theo Dự Án (High Data Density Table) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Chi Tiết Phân Bổ Chi Phí Lương Theo Dự Án Xây Dựng (FE-14 / UC-27)</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Khớp 100% với Sổ cái tài khoản kế toán xây lắp
            </span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowVouchersModal(true)}>
            <ExternalLink size={13} />
            <span>Xem Bút Toán Nợ/Có</span>
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">Mã Dự Án</th>
                <th className="text-left">Tên Công Trình / Đơn Vị</th>
                <th className="text-left">Chỉ Huy Trưởng / Phụ Trách</th>
                <th className="text-right">TK 622 (Nhân Công)</th>
                <th className="text-right">TK 627 (Sản Xuất Chung)</th>
                <th className="text-right">TK 642 (Quản Lý VP)</th>
                <th className="text-right">Tổng Phân Bổ (VND)</th>
                <th className="text-center">Trạng Thái Hạch Toán</th>
              </tr>
            </thead>
            <tbody>
              {projectAllocations.map((p) => (
                <tr key={p.code}>
                  <td className="text-left font-mono font-medium text-slate-700">{p.code}</td>
                  <td className="text-left font-medium text-slate-900">{p.name}</td>
                  <td className="text-left text-slate-600 text-xs">{p.manager}</td>
                  <td className="text-right tabular-nums text-slate-700">{formatVND(p.tk622)}</td>
                  <td className="text-right tabular-nums text-slate-700">{formatVND(p.tk627)}</td>
                  <td className="text-right tabular-nums text-slate-700">{formatVND(p.tk642 || 0)}</td>
                  <td className="text-right tabular-nums font-semibold text-slate-900">{formatVND(p.total)}</td>
                  <td className="text-center">
                    <span className="badge badge-success">Đã hạch toán</span>
                  </td>
                </tr>
              ))}
              {/* Total Summary Row */}
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}>
                <td colSpan={3} className="text-left font-semibold text-slate-900">
                  TỔNG CỘNG PHÂN BỔ KỲ {selectedMonth}/{selectedYear}:
                </td>
                <td className="text-right tabular-nums text-slate-900">{formatVND(tk622)}</td>
                <td className="text-right tabular-nums text-slate-900">{formatVND(tk627)}</td>
                <td className="text-right tabular-nums text-slate-900">{formatVND(tk642)}</td>
                <td className="text-right tabular-nums font-bold" style={{ color: 'var(--color-primary)' }}>
                  {formatVND(totalCost)}
                </td>
                <td className="text-center">
                  <span className="badge badge-success">Cân đối 100%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL: Sổ Bút Toán Hạch Toán Kế Toán Kép (Double-Entry Journal Vouchers) */}
      {showVouchersModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '860px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-md)',
              margin: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  Sổ Bút Toán Hạch Toán Tiền Lương Kép (Thông Tư 200/2014/TT-BTC)
                </h2>
                <span className="text-xs text-slate-500">
                  Chứng từ số: <strong className="font-mono text-slate-700">PKT-{selectedYear}-{selectedMonth}-001</strong> • Kỳ quyết toán: Tháng {selectedMonth}/{selectedYear}
                </span>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                onClick={() => setShowVouchersModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge badge-success">
                  <CheckCircle2 size={12} />
                  <span>Tổng Phát Sinh Nợ = Tổng Phát Sinh Có (100% Cân Đối)</span>
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportFastCsv}>
                    <Download size={13} />
                    <span>Tải CSV Cho FAST</span>
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleExportMisaXml}>
                    <FileCode size={13} />
                    <span>Tải XML Cho MISA AMIS</span>
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-center">STT</th>
                      <th className="text-center">Tài Khoản Nợ</th>
                      <th className="text-center">Tài Khoản Có</th>
                      <th className="text-left">Diễn Giải Nghiệp Vụ Kế Toán</th>
                      <th className="text-center">Mã Vụ Việc / Công Trình</th>
                      <th className="text-right">Số Tiền (VND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalVouchers.map((v) => (
                      <tr key={v.id}>
                        <td className="text-center tabular-nums text-slate-500 text-xs">{v.id}</td>
                        <td className="text-center font-mono font-bold text-blue-700">{v.debit}</td>
                        <td className="text-center font-mono font-bold text-amber-700">{v.credit}</td>
                        <td className="text-left text-slate-900 font-medium text-xs">{v.description}</td>
                        <td className="text-center font-mono text-xs text-slate-600">{v.projectCode}</td>
                        <td className="text-right tabular-nums font-semibold text-slate-900">{formatVND(v.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                padding: '0.875rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button className="btn btn-secondary" onClick={() => setShowVouchersModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
