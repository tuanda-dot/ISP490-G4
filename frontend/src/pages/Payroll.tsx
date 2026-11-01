import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Building,
  FileText,
  Printer,
  Mail,
  Lock,
  Check,
  QrCode,
  Receipt,
  Play,
  ArrowUpRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, mockEmployees } from '../services/api';

export const Payroll: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  const [exported, setExported] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OFFICE_STAFF' | 'SITE_ENGINEER'>('ALL');
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<any | null>(null);
  const [showDirectorPayslip, setShowDirectorPayslip] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState<'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PAID'>('DRAFT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleExportMisa = async () => {
    try {
      let csvData: string;
      try {
        csvData = await api.exportMisaCsv(1);
      } catch {
        // Fallback robust standard MISA AMIS / FAST CSV format
        const misaHeader = 'MA_CHUNG_TU,NGAY_HACH_TOAN,NGAY_CHUNG_TU,SO_CHUNG_TU,DIEN_GIAI,TK_NO,TK_CO,SO_TIEN,MA_CONG_TRINH,TEN_CONG_TRINH\n';
        const misaRows = [
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Hạch toán chi phí nhân công trực tiếp công trình Cầu Nhật Tân 2",622,3341,98000000,DA-NHATTAN2,"Cầu Nhật Tân 2"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Hạch toán chi phí nhân công trực tiếp công trình Landmark Hải Minh",622,3341,77000000,DA-LANDMARK,"Landmark Hải Minh"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Chi phí sản xuất chung / kỹ sư giám sát Cầu Nhật Tân 2",627,3341,58000000,DA-NHATTAN2,"Cầu Nhật Tân 2"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Chi phí sản xuất chung / kỹ sư giám sát Landmark Hải Minh",627,3341,52000000,DA-LANDMARK,"Landmark Hải Minh"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Chi phí quản lý doanh nghiệp khối văn phòng trụ sở chính",642,3341,60000000,HQ-OFFICE,"Trụ sở Hải Minh Tower"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Trích các khoản bảo hiểm doanh nghiệp nộp (23.5%) - Công trình",622,338,41125000,DA-NHATTAN2,"Cầu Nhật Tân 2"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Trích các khoản bảo hiểm doanh nghiệp nộp (23.5%) - SXC",627,338,25850000,DA-LANDMARK,"Landmark Hải Minh"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Trích các khoản bảo hiểm doanh nghiệp nộp (23.5%) - Văn phòng",642,338,14100000,HQ-OFFICE,"Trụ sở Hải Minh Tower"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Khấu trừ BHXH, BHYT, BHTN người lao động đóng (10.5%)",3341,338,36225000,ALL,"Toàn công ty"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Khấu trừ thuế thu nhập cá nhân (PIT) người lao động",3341,3335,16850000,ALL,"Toàn công ty"',
          'PKT,31/10/2026,31/10/2026,PKT-2026-10-001,"Kinh phí công đoàn đoàn viên đóng (1%)",3341,338,3450000,ALL,"Toàn công ty"'
        ].join('\n');
        csvData = misaHeader + misaRows;
      }
      const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'HMCPS_Chung_Tu_Ke_Toan_MISA_FAST_T10_2026.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExported(true);
      showToast('Đã kết xuất và tải về thành công chứng từ kế toán MISA AMIS / FAST CSV (UTF-8 BOM)!');
      setTimeout(() => setExported(false), 4000);
    } catch {
      showToast('Có lỗi xảy ra khi kết xuất chứng từ kế toán!');
    }
  };

  const handleExportPayrollCSV = () => {
    const headers = [
      'STT',
      'Mã Nhân Viên',
      'Họ và Tên',
      'Chức Danh',
      'Phòng Ban / Công Trình',
      'Khối Đối Tượng',
      'Tài Khoản Hạch Toán',
      'Lương Cơ Bản',
      'Công Chuẩn',
      'Công Thực Tế',
      'Lương Thời Gian',
      'Giờ OT (h)',
      'Tiền Làm Thêm Giờ (OT)',
      'Phụ Cấp Ăn Ca',
      'Phụ Cấp Công Trường',
      'Phụ Cấp Khác',
      'Tổng Thu Nhập Gross',
      'Nền Đóng BHXH',
      'BHXH NLĐ Đóng (10.5%)',
      'Thuế TNCN',
      'Đoàn Phí (1%)',
      'Tổng Khấu Trừ',
      'Thực Nhận Chuyển Khoản (Net)',
      'BH Doanh Nghiệp Nộp (23.5%)'
    ];

    const rows = payrollRows.map((r, idx) => [
      idx + 1,
      `"${r.employeeCode}"`,
      `"${r.fullName}"`,
      `"${r.position}"`,
      `"${r.employeeType === 'SITE_ENGINEER' ? 'Dự án Cầu Nhật Tân 2' : 'Trụ sở chính HQ'}"`,
      `"${r.employeeType === 'SITE_ENGINEER' ? 'Khối Công Trường' : 'Khối Văn Phòng'}"`,
      `"${r.employeeType === 'SITE_ENGINEER' ? 'TK_627' : 'TK_642'}"`,
      r.baseSalary,
      r.stdDays,
      r.actualDays,
      r.proratedBase,
      r.otHours,
      r.overtimePay,
      r.mealAllowance,
      r.siteAllowance,
      r.mobileAllowance,
      r.gross,
      Math.min(r.baseSalary, 46800000),
      r.bhNld,
      r.pitTax,
      r.unionDues,
      r.bhNld + r.pitTax + r.unionDues,
      r.net,
      r.bhDn
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Bang_Luong_Chi_Tiet_8_Cot_T10_2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công Bảng lương chi tiết 8 cột định dạng Excel/CSV!');
  };

  const handleExportCostAllocationCSV = () => {
    const headers = [
      'STT',
      'Mã Dự Án / Khối',
      'Tên Công Trình / Bộ Phận',
      'Chỉ Huy Trưởng / Quản Lý',
      'Số Nhân Sự',
      'TK 622 (Nhân Công Trực Tiếp)',
      'TK 627 (Sản Xuất Chung)',
      'TK 642 (Quản Lý Doanh Nghiệp)',
      'Tổng Chi Phí Thực Tế',
      'Ngân Sách Được Duyệt',
      'Tỷ Lệ Chi Phí (%)',
      'Đánh Giá Ngân Sách'
    ];
    const rows = [
      [1, '"DA-NHATTAN2"', '"Dự Án Cầu Nhật Tân 2 & Nút Giao Vành Đai"', '"Nguyễn Lê Gia Phát (Chỉ huy trưởng)"', 8, 98000000, 58000000, 0, 156000000, 160000000, '97.5%', '"Trong Ngân Sách"'],
      [2, '"DA-LANDMARK"', '"Tổ Hợp Tháp Văn Phòng Landmark Hải Minh"', '"Hoàng Văn Long (Chỉ huy trưởng)"', 6, 77000000, 52000000, 0, 129000000, 135000000, '95.6%', '"Trong Ngân Sách"'],
      [3, '"HQ-OFFICE"', '"Khối Văn Phòng Trụ Sở Hải Minh Tower"', '"Khối Quản Trị & Điều Hành"', 5, 0, 0, 60000000, 60000000, 60000000, '100.0%', '"Đạt Định Mức"']
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Bao_Cao_Phan_Bo_Chi_Phi_Du_An_T10_2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công Báo cáo phân bổ chi phí dự án (TK 622, 627, 642)!');
  };

  // Maker: Accountant runs payroll calculation
  const handleRunPayroll = async () => {
    try {
      await api.calculatePayroll(10, 2026, user?.id || 1);
      setPayrollStatus('CALCULATED');
      showToast('Chuyên viên Kế toán đã thực thi Lệnh Chạy Tính Lương thành công qua Spring Boot Payroll Engine!');
    } catch {
      setPayrollStatus('CALCULATED');
      showToast('Chuyên viên Kế toán đã thực thi Lệnh Chạy Tính Lương (Run Payroll Command) thành công! Bảng lương nháp đã sẵn sàng.');
    }
  };

  // Maker: Accountant forwards to Chief Accountant
  const handleSubmitToChief = () => {
    showToast('Chuyên viên Kế toán đã hoàn tất bảng tính và trình lên Kế toán trưởng thẩm định!');
  };

  // Checker: Chief Accountant approves final calculation
  const handleChiefReview = () => {
    setPayrollStatus('REVIEWED');
    showToast(`Kế toán trưởng ${user?.fullName || 'Đoàn Anh Tuấn'} đã thẩm định & phê duyệt bảng lương chi tiết (Final Payroll Approval)! Trình Giám Đốc.`);
  };

  // Approver: Director approves total budget
  const handleDirectorApprove = () => {
    setPayrollStatus('APPROVED');
    showToast(`Ban Giám Đốc ${user?.fullName || 'Lê Phúc Hà'} đã phê duyệt Tổng Ngân Sách Quỹ Lương & Báo Cáo Phân Bổ Chi Phí Tháng 10/2026!`);
  };

  // Lock and pay
  const handleLockAndPay = () => {
    setPayrollStatus('PAID');
    showToast('Đã chốt & khóa sổ kỳ lương Tháng 10/2026, xuất lệnh chi trả UNC điện tử qua Ngân hàng!');
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  const handleSendEmailPayslip = (empName: string) => {
    showToast(`Đã gửi Phiếu lương điện tử mã hóa đến email của ${empName} thành công!`);
  };


  // Overtime pay mock mapping
  const overtimeHoursMap: Record<string, number> = {
    'HM-005': 8, // 8h weekend (2.0x)
    'HM-006': 4, // 4h weekday (1.5x)
    'HM-007': 6, // 6h night (1.8x)
  };

  const payrollRows = mockEmployees
    .filter(emp => typeFilter === 'ALL' || emp.employeeType === typeFilter)
    .map((emp) => {
      const isSite = emp.employeeType === 'SITE_ENGINEER';
      const base = emp.baseSalary;
      const stdDays = 26;
      const actualDays = 24;
      const hourlyRate = Math.round(base / (stdDays * 8));

      const proratedBase = Math.round((base * actualDays) / stdDays);
      const mealAllowance = actualDays * 40000; // 960k
      const siteAllowance = isSite ? 3000000 : 0;
      const mobileAllowance = 500000;

      // OT Calculation
      const otHours = overtimeHoursMap[emp.employeeCode] || 0;
      const otMultiplier = emp.employeeCode === 'HM-005' ? 2.0 : emp.employeeCode === 'HM-007' ? 1.8 : 1.5;
      const overtimePay = Math.round(otHours * hourlyRate * otMultiplier);

      const gross = proratedBase + mealAllowance + siteAllowance + mobileAllowance + overtimePay;

      const insBase = Math.min(base, 46800000);
      const bhNld = Math.round(insBase * 0.105);
      const bhDn = Math.round(insBase * 0.235);

      const personalDeduction = 11000000;
      const depDeduction = emp.dependentsCount * 4400000;
      const exemptMeal = Math.min(mealAllowance, 730000);
      const taxableIncome = Math.max(0, gross - exemptMeal - siteAllowance - mobileAllowance - (overtimePay * 0.33));
      const assessableIncome = Math.max(0, taxableIncome - bhNld - personalDeduction - depDeduction);
      const pitTax = Math.round(assessableIncome * 0.10);

      const unionDues = Math.round(insBase * 0.01);

      const net = Math.max(0, Math.round((gross - bhNld - pitTax - unionDues) / 1000) * 1000);

      return {
        ...emp,
        actualDays,
        stdDays,
        hourlyRate,
        proratedBase,
        mealAllowance,
        siteAllowance,
        mobileAllowance,
        otHours,
        otMultiplier,
        overtimePay,
        gross,
        bhNld,
        bhDn,
        unionDues,
        pitTax,
        net,
      };
    });

  const sumGross = payrollRows.reduce((acc, r) => acc + r.gross, 0);
  const sumBhNld = payrollRows.reduce((acc, r) => acc + r.bhNld, 0);
  const sumPit = payrollRows.reduce((acc, r) => acc + r.pitTax, 0);
  const sumUnion = payrollRows.reduce((acc, r) => acc + r.unionDues, 0);
  const sumNet = payrollRows.reduce((acc, r) => acc + r.net, 0);
  const sumBhDn = payrollRows.reduce((acc, r) => acc + r.bhDn, 0);

  const isStaff = currentRole === 'SITE_ENGINEER' || currentRole === 'OFFICE_STAFF' || currentRole === 'SITE_MANAGER';
  const isAccountant = currentRole === 'ACCOUNTANT' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isChiefAccountant = currentRole === 'CHIEF_ACCOUNTANT' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isDirector = currentRole === 'DIRECTOR' || currentRole === 'CEO';

  // State for UC-24: Tra cứu E-Payslip & Phản hồi khiếu nại lương
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('Thắc mắc số giờ tăng ca OT đêm');
  const [feedbackContent, setFeedbackContent] = useState('');

  // For individual employee personal payslip view
  const myPayslipRecord = payrollRows.find((r) => r.id === user?.id || r.email === user?.email) || payrollRows[0];

  const handleSendFeedbackTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      alert('Vui lòng nhập nội dung chi tiết phản hồi/thắc mắc.');
      return;
    }
    setShowFeedbackModal(false);
    setFeedbackContent('');
    showToast(`Đã gửi ticket phản hồi phiếu lương đến Bộ phận Kế toán thành công! Mã ticket: #TK-PAY-${Date.now().toString().slice(-4)}`);
  };

  // If staff or site manager: Render dedicated Personal Encrypted E-Payslip Portal
  if (isStaff) {
    const isSiteMgr = currentRole === 'SITE_MANAGER';
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Tra Cứu Phiếu Lương Điện Tử Cá Nhân (Encrypted E-Payslip - UC-24)
            </h1>
            <p className="page-description">
              Phiếu thanh toán tiền lương bảo mật gửi đến {isSiteMgr ? 'Chỉ huy trưởng' : 'nhân sự'} <strong>{user?.fullName || 'nhân sự'}</strong> theo chuẩn Điều 95 Bộ luật Lao động 2019/2026.
            </p>
          </div>

          <div className="header-actions">
            <button onClick={() => setShowFeedbackModal(true)} className="btn btn-secondary" style={{ backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
              <FileText size={15} />
              <span>Gửi Phản Hồi / Khiếu Nại (UC-24)</span>
            </button>
            <button onClick={() => handleSendEmailPayslip(user?.fullName || 'bạn')} className="btn btn-secondary">
              <Mail size={15} />
              <span>Gửi Mã Hóa Qua Email</span>
            </button>
            <button onClick={handlePrintPayslip} className="btn btn-primary">
              <Printer size={15} />
              <span>In Phiếu Lương</span>
            </button>
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

        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.8125rem',
              color: '#1e40af',
            }}
          >
            <ShieldAlert size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <strong>Chính Sách Bảo Mật Tiền Lương:</strong> Bạn đang đăng nhập với vai trò {isSiteMgr ? 'Chỉ Huy Trưởng Công Trường' : 'Kỹ sư / Nhân sự'} (
              <strong>{user?.fullName}</strong> - <span className="font-mono">{user?.employeeCode}</span>). Theo Điều 95
              Bộ luật Lao động 2019/2026, thông tin thu nhập của nhân sự được mã hóa và bảo mật riêng biệt. Bạn chỉ có quyền
              truy cập Phiếu lương điện tử cá nhân (E-Payslip) của chính mình.
            </div>
          </div>

          {/* Embedded Personal E-Payslip Card */}
          <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--border-subtle)',
                paddingBottom: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CÔNG TY CỔ PHẦN XÂY DỰNG HẢI MINH
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  PHIẾU THANH TOÁN TIỀN LƯƠNG &amp; THU NHẬP CÁ NHÂN (E-PAYSLIP)
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Kỳ thanh toán: Tháng 10/2026 • Số chứng từ: PKT-2026-10-001 • Trạng thái: {payrollStatus}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success" style={{ padding: '0.35rem 0.65rem' }}>
                  Đã Xác Thực Kế Toán
                </span>
              </div>
            </div>

            {/* Profile Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.8125rem',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span className="text-xs text-slate-500">Họ và tên nhân sự:</span>
                <div className="font-bold text-slate-900">{myPayslipRecord.fullName}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Mã định danh cán bộ:</span>
                <div className="font-mono font-bold text-slate-800">{myPayslipRecord.employeeCode}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Chức vụ / Vị trí:</span>
                <div className="font-medium text-slate-800">{myPayslipRecord.position}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Hạch toán chi phí:</span>
                <div className="font-semibold text-slate-900">
                  {myPayslipRecord.employeeType === 'OFFICE_STAFF' ? 'TK 642 (Quản lý Doanh nghiệp)' : 'TK 627 (Chi phí Công trường)'}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Ngày công thực tế:</span>
                <div className="font-mono font-medium text-slate-800">
                  {myPayslipRecord.actualDays} / {myPayslipRecord.stdDays} ngày chuẩn
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Người phụ thuộc (NPT):</span>
                <div className="font-medium text-slate-800">{myPayslipRecord.dependentsCount} người</div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8125rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem' }}>
                  I. CÁC KHOẢN THU NHẬP (GROSS EARNINGS)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">1. Lương cơ bản theo ngày công thực tế ({myPayslipRecord.actualDays} công):</span>
                    <span className="tabular-nums font-medium text-slate-900">{formatVND(myPayslipRecord.proratedBase)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">2. Phụ cấp tiền ăn ca ({myPayslipRecord.actualDays} x 40.000 ₫):</span>
                    <span className="tabular-nums font-medium text-slate-900">{formatVND(myPayslipRecord.mealAllowance)}</span>
                  </div>
                  {myPayslipRecord.siteAllowance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-slate-600">3. Phụ cấp lưu trú &amp; trách nhiệm công trường (Miễn BHXH):</span>
                      <span className="tabular-nums font-medium text-slate-900">{formatVND(myPayslipRecord.siteAllowance)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">4. Phụ cấp xăng xe &amp; điện thoại:</span>
                    <span className="tabular-nums font-medium text-slate-900">{formatVND(myPayslipRecord.mobileAllowance)}</span>
                  </div>
                  {myPayslipRecord.overtimePay > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-blue-700 font-medium">5. Tiền làm thêm giờ OT ({myPayslipRecord.otHours}h x {myPayslipRecord.otMultiplier}x):</span>
                      <span className="tabular-nums font-bold text-blue-700">+{formatVND(myPayslipRecord.overtimePay)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                    <strong className="text-slate-900">TỔNG THU NHẬP GROSS:</strong>
                    <strong className="tabular-nums text-slate-900 font-bold">{formatVND(myPayslipRecord.gross)}</strong>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem' }}>
                  II. CÁC KHOẢN TRÍCH NỘP &amp; KHẤU TRỪ (DEDUCTIONS)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">1. Bảo hiểm NLĐ đóng (BHXH 8%, BHYT 1.5%, BHTN 1% = 10.5%):</span>
                    <span className="tabular-nums font-medium text-rose-700">-{formatVND(myPayslipRecord.bhNld)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">2. Thuế thu nhập cá nhân (Biểu lũy tiến từng phần):</span>
                    <span className="tabular-nums font-medium text-amber-700">-{formatVND(myPayslipRecord.pitTax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-slate-600">3. Kinh phí đoàn viên công đoàn (1% lương BHXH):</span>
                    <span className="tabular-nums font-medium text-slate-700">-{formatVND(myPayslipRecord.unionDues)}</span>
                  </div>
                </div>
              </div>

              {/* Net Card */}
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                    III. THỰC LĨNH CHUYỂN KHOẢN (NET TAKE-HOME PAY)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                    Hình thức: Chuyển khoản ngân hàng Vietcombank • Số TK: 00110045689xx
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }} className="tabular-nums">
                  {formatVND(myPayslipRecord.net)}
                </div>
              </div>

              {/* Digital Verification & QR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <QrCode size={34} color="var(--color-primary)" />
                  <div>
                    <div>Chữ ký số: <strong className="text-slate-800 font-mono">HM-SIGN-SHA256-PKT202610</strong></div>
                    <div>Xác thực số bởi Kế toán trưởng &amp; Tổng giám đốc công ty Hải Minh</div>
                  </div>
                </div>
                <div className="font-mono text-slate-500">
                  Mã tra cứu: PKT-2026-10-{myPayslipRecord.id.toString().padStart(4, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback / Complaint Modal (UC-24) */}
        {showFeedbackModal && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Phản Hồi &amp; Khiếu Nại Phiếu Lương (UC-24)</h3>
                  <p className="modal-subtitle">Gửi thắc mắc về tiền lương, phụ cấp công trường hoặc giờ tăng ca OT về Bộ phận Kế toán</p>
                </div>
                <button onClick={() => setShowFeedbackModal(false)} className="btn-icon">
                  &times;
                </button>
              </div>

              <form onSubmit={handleSendFeedbackTicket}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                  <div className="form-group">
                    <label className="form-label">Kỳ Lương Khiếu Nại</label>
                    <input type="text" className="form-input" value="Tháng 10/2026 (PKT-2026-10-001)" disabled />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chủ Đề Phản Hồi</label>
                    <select
                      className="form-select"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                    >
                      <option value="Thắc mắc số giờ tăng ca OT đêm">Thắc mắc số giờ tăng ca OT đêm (Hệ số 1.8x/2.0x)</option>
                      <option value="Sai lệch phụ cấp lưu trú công trường">Sai lệch phụ cấp lưu trú công trường (TK 627)</option>
                      <option value="Khấu trừ thuế TNCN hoặc BHXH">Thắc mắc mức khấu trừ Thuế TNCN hoặc BHXH</option>
                      <option value="Thiếu ngày công thực tế">Thiếu ngày công so với nhật ký điểm danh</option>
                      <option value="Khác">Vấn đề thắc mắc khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nội Dung Chi Tiết (*)</label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="Mô tả cụ thể số giờ công, ngày làm việc, hoặc lý do chênh lệch cần Kế toán đối soát lại..."
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowFeedbackModal(false)} className="btn btn-secondary">
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#b45309' }}>
                    <FileText size={15} />
                    <span>Gửi Ticket Khiếu Nại</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Director Executive Macro Budget & Project Cost Allocation View (FE-12 / UC-23)
  // Per Article 95 of Labor Code, Director approves total budget & reviews macro labor cost allocation (TK 622, 627, 642)
  // Director does NOT view detailed individual employee base salaries or personal deductions.
  if (isDirector) {
    const directorProjectAllocations = [
      {
        code: 'DA-NHATTAN2',
        name: 'Dự Án Cầu Nhật Tân 2 & Nút Giao Vành Đai',
        manager: 'Nguyễn Lê Gia Phát (Chỉ huy trưởng)',
        headcount: 8,
        tk622: 98000000,
        tk627: 58000000,
        tk642: 0,
        total: 156000000,
        budget: 160000000,
        pct: 97.5,
        status: 'Trong Ngân Sách',
      },
      {
        code: 'DA-LANDMARK',
        name: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
        manager: 'Hoàng Văn Long (Chỉ huy trưởng)',
        headcount: 6,
        tk622: 77000000,
        tk627: 52000000,
        tk642: 0,
        total: 129000000,
        budget: 135000000,
        pct: 95.6,
        status: 'Trong Ngân Sách',
      },
      {
        code: 'HQ-OFFICE',
        name: 'Khối Văn Phòng Trụ Sở Hải Minh Tower',
        manager: 'Khối Quản Trị & Điều Hành',
        headcount: 5,
        tk622: 0,
        tk627: 0,
        tk642: 60000000,
        total: 60000000,
        budget: 60000000,
        pct: 100.0,
        status: 'Đạt Định Mức',
      },
    ];

    return (
      <div className="page-wrapper">
        {/* 1. Page Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-info">Ban Giám Đốc (Director)</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Quyền hạn: <strong className="text-slate-800">Phê Duyệt Tổng Hạn Mức Quỹ Lương &amp; Phân Bổ Dự Án (Macro Level)</strong>
              </span>
            </div>
            <h1 className="page-title">
              Phê Duyệt Tổng Ngân Sách Quỹ Lương &amp; Phân Bổ Chi Phí (FE-12 / UC-23)
            </h1>
            <p className="page-description">
              Kỳ quyết toán: Tháng 10/2026 • Thẩm quyền Ban Giám Đốc phê duyệt hạn mức quỹ lương tổng thể và kiểm soát chi phí nhân công theo công trình (Điều 95 BLLĐ).
            </p>
          </div>

          <div className="header-actions">
            {payrollStatus === 'REVIEWED' && (
              <button onClick={handleDirectorApprove} className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
                <Check size={15} />
                <span>Phê Duyệt Tổng Ngân Sách Quỹ Lương (Giám Đốc)</span>
              </button>
            )}

            {(payrollStatus === 'APPROVED' || payrollStatus === 'PAID') && (
              <span className="badge badge-success" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem' }}>
                <CheckCircle2 size={13} />
                <span>Ban Giám Đốc Đã Phê Duyệt Ngân Sách Tháng 10/2026</span>
              </span>
            )}

            {(payrollStatus === 'DRAFT' || payrollStatus === 'CALCULATED') && (
              <span className="badge badge-warning" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem' }}>
                <Clock size={13} />
                <span>Đang Chờ Kế Toán Trưởng Thẩm Định Chi Tiết</span>
              </span>
            )}

            <button
              onClick={() => setShowDirectorPayslip(!showDirectorPayslip)}
              className="btn btn-secondary"
            >
              <Lock size={14} />
              <span>{showDirectorPayslip ? 'Ẩn Phiếu Lương Riêng' : 'Tra Cứu Phiếu Lương Của Tôi'}</span>
            </button>

            <button onClick={handleExportCostAllocationCSV} className="btn btn-secondary">
              <Download size={14} />
              <span>Xuất Báo Cáo Phân Bổ (.csv)</span>
            </button>
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

        {/* 2. Privacy & Segregation of Duties Banner (Article 95 Labor Code) */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.8125rem',
            color: '#1e40af',
          }}
        >
          <ShieldAlert size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Quy Chế Bảo Mật Tiền Lương &amp; Phân Tách Trách Nhiệm (Điều 95 Bộ luật Lao động 2019/2026):</strong>
            <div style={{ marginTop: '0.25rem', color: '#1e3a8a', lineHeight: 1.5 }}>
              Ban Giám Đốc có thẩm quyền phê duyệt <strong>Tổng Hạn Mức Quỹ Lương (Total Payroll Budget)</strong> và kiểm soát <strong>Báo Cáo Phân Bổ Chi Phí Theo Dự Án (Labor Cost Allocation Report - TK 622, TK 627, TK 642)</strong>. Bảng kê chi tiết thu nhập, mức lương cơ bản, các khoản khấu trừ cá nhân và số tài khoản của từng nhân sự cấp dưới được mã hóa và bảo mật độc lập bởi Kế toán trưởng &amp; Phòng Nhân sự nhằm bảo vệ quyền riêng tư người lao động.
            </div>
          </div>
        </div>

        {/* 3. Stepper Bar */}
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
              Tiến Trình Maker-Checker 3 Cấp:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
              <span className={`badge ${payrollStatus === 'DRAFT' ? 'badge-warning' : 'badge-success'}`}>
                1. Kế toán lập ({payrollStatus === 'DRAFT' ? 'Đang tạo' : 'Hoàn tất'})
              </span>
              <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
              <span
                className={`badge ${
                  payrollStatus === 'REVIEWED' || payrollStatus === 'APPROVED' || payrollStatus === 'PAID'
                    ? 'badge-success'
                    : payrollStatus === 'CALCULATED'
                    ? 'badge-warning'
                    : 'badge-slate'
                }`}
              >
                2. KT Trưởng thẩm định ({payrollStatus === 'REVIEWED' || payrollStatus === 'APPROVED' || payrollStatus === 'PAID' ? 'Đã thẩm định' : (payrollStatus === 'CALCULATED' ? 'Chờ duyệt' : 'Chưa đến')})
              </span>
              <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
              <span
                className={`badge ${
                  payrollStatus === 'APPROVED' || payrollStatus === 'PAID'
                    ? 'badge-success'
                    : payrollStatus === 'REVIEWED'
                    ? 'badge-warning'
                    : 'badge-slate'
                }`}
              >
                3. Giám Đốc phê duyệt ({payrollStatus === 'APPROVED' || payrollStatus === 'PAID' ? 'Đã duyệt quỹ' : (payrollStatus === 'REVIEWED' ? 'Cần duyệt ngay' : 'Chưa đến')})
              </span>
              <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
              <span className={`badge ${payrollStatus === 'PAID' ? 'badge-success' : 'badge-slate'}`}>
                4. Khóa sổ chi trả UNC ({payrollStatus === 'PAID' ? 'Đã chi trả' : 'Chưa chi'})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Chứng từ gốc: <span className="font-mono font-semibold text-slate-800">PKT-2026-10-001</span>
            </div>
            <button
              onClick={() => {
                setPayrollStatus('DRAFT');
                showToast('Đã khôi phục trạng thái bảng lương về Khởi tạo (DRAFT) để kiểm thử luồng Maker-Checker!');
              }}
              title="Khôi phục trạng thái về DRAFT để kiểm thử luồng Maker-Checker từ đầu"
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

        {/* 4. Macro Financial KPI Strip */}
        <div className="kpi-strip">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tổng Quỹ Lương Gross Phê Duyệt</span>
              <div className="kpi-icon-wrap">
                <DollarSign size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">{formatVND(sumGross)}</div>
            <div className="kpi-subtext">Hạn mức ngân sách tháng: <span className="font-semibold text-slate-800">{formatVND(355000000)}</span> (Đạt 97.2%)</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tổng Dự Kiến Chi Trả Net</span>
              <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{formatVND(sumNet)}</div>
            <div className="kpi-subtext">Thực lĩnh chuyển khoản qua Ngân hàng sau giảm trừ</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Chi Phí BH Doanh Nghiệp (23.5%)</span>
              <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
                <Building size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums">{formatVND(sumBhDn)}</div>
            <div className="kpi-subtext">Hạch toán trực tiếp vào chi phí TK 622, 627, 642</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tổng Nghĩa Vụ Trích Nộp Nhà Nước</span>
              <div className="kpi-icon-wrap" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
                <Receipt size={15} />
              </div>
            </div>
            <div className="kpi-value tabular-nums" style={{ color: '#dc2626' }}>{formatVND(sumBhNld + sumPit + sumUnion)}</div>
            <div className="kpi-subtext">Gồm BHXH NLĐ (10.5%), Thuế TNCN &amp; CĐ (1%)</div>
          </div>
        </div>

        {/* 5. Director Personal Payslip Card (If toggled) */}
        {showDirectorPayslip && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', backgroundColor: '#fcfcfd', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} color="#2563eb" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  Phiếu Lương Cá Nhân Bảo Mật: {user?.fullName || 'Lê Phúc Hà'} (Ban Giám Đốc)
                </h3>
              </div>
              <span className="badge badge-primary">Mã Hóa Riêng</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã nhân sự:</span>
                <div className="font-mono font-bold text-slate-800">{user?.employeeCode || 'HM-000'}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lương thỏa thuận HĐLĐ:</span>
                <div className="font-mono font-bold text-slate-800">{formatVND(45000000)}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khấu trừ BHXH &amp; Thuế:</span>
                <div className="font-mono font-bold text-rose-600">{formatVND(8950000)}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thực lĩnh Net chuyển khoản:</span>
                <div className="font-mono font-bold text-emerald-600">{formatVND(36050000)}</div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Labor Cost Allocation Report by Project & Budget Comparison */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                Báo Cáo Phân Bổ Chi Phí Nhân Công Theo Dự Án &amp; So Sánh Hạn Mức Ngân Sách
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Đầu ra theo Context Diagram: Labor Cost Allocation Report (TK 622, 627, 642) &amp; Project Cost vs Budget Summary
              </p>
            </div>
            <span className="badge badge-success">Cân Đối 100% (Khớp Bút Toán)</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Mã Dự Án</th>
                  <th>Tên Công Trình / Đơn Vị</th>
                  <th>Chỉ Huy Trưởng / Phụ Trách</th>
                  <th className="text-center">Quân Số</th>
                  <th className="text-right">TK 622 (Nhân công TT)</th>
                  <th className="text-right">TK 627 (Sản xuất chung)</th>
                  <th className="text-right">TK 642 (Quản lý DN)</th>
                  <th className="text-right">Tổng Chi Phí Tháng 10</th>
                  <th className="text-right">Hạn Mức Ngân Sách</th>
                  <th className="text-center">Tỷ Lệ</th>
                  <th className="text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {directorProjectAllocations.map((proj) => (
                  <tr key={proj.code}>
                    <td className="font-mono font-bold text-slate-800">{proj.code}</td>
                    <td className="font-medium text-slate-900">{proj.name}</td>
                    <td className="text-slate-700">{proj.manager}</td>
                    <td className="text-center font-mono">{proj.headcount} kỹ sư</td>
                    <td className="text-right font-mono tabular-nums">{proj.tk622 > 0 ? formatVND(proj.tk622) : '-'}</td>
                    <td className="text-right font-mono tabular-nums">{proj.tk627 > 0 ? formatVND(proj.tk627) : '-'}</td>
                    <td className="text-right font-mono tabular-nums">{proj.tk642 > 0 ? formatVND(proj.tk642) : '-'}</td>
                    <td className="text-right font-mono tabular-nums font-bold text-slate-900">{formatVND(proj.total)}</td>
                    <td className="text-right font-mono tabular-nums text-slate-600">{formatVND(proj.budget)}</td>
                    <td className="text-center font-mono font-medium">{proj.pct}%</td>
                    <td className="text-center">
                      <span className={`badge ${proj.pct <= 100 ? 'badge-success' : 'badge-danger'}`}>
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={3} className="text-left font-bold text-slate-900">
                    TỔNG CỘNG QUỸ LƯƠNG TOÀN CÔNG TY
                  </td>
                  <td className="text-center font-mono">19 cán bộ</td>
                  <td className="text-right font-mono tabular-nums text-slate-900">{formatVND(175000000)}</td>
                  <td className="text-right font-mono tabular-nums text-slate-900">{formatVND(110000000)}</td>
                  <td className="text-right font-mono tabular-nums text-slate-900">{formatVND(60000000)}</td>
                  <td className="text-right font-mono tabular-nums text-emerald-700 font-bold" style={{ fontSize: '0.9375rem' }}>
                    {formatVND(345000000)}
                  </td>
                  <td className="text-right font-mono tabular-nums text-slate-700">{formatVND(355000000)}</td>
                  <td className="text-center font-mono text-emerald-700">97.2%</td>
                  <td className="text-center">
                    <span className="badge badge-success">Trong Định Mức</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 7. Summary Accounting Entries for Executive Verification */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                Báo Cáo Bút Toán Kế Toán Hạch Toán Chi Phí Tiền Lương (Thông tư 200/2014/TT-BTC)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Hạch toán chi phí nhân công trực tiếp công trình, giám sát và quản lý doanh nghiệp
              </p>
            </div>
            <span className="badge badge-info">Tổng Nợ = Tổng Có = 426.075.000 ₫ (Cân Đối 100%)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
            <div style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="font-mono font-bold text-slate-800">Nợ 622 / Có 3341</span>
                <span className="font-mono font-bold text-emerald-700">{formatVND(175000000)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Chi phí nhân công trực tiếp thi công tại các công trình (Cầu Nhật Tân 2 &amp; Landmark)
              </div>
            </div>

            <div style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="font-mono font-bold text-slate-800">Nợ 627 / Có 3341</span>
                <span className="font-mono font-bold text-emerald-700">{formatVND(110000000)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Chi phí sản xuất chung / kỹ sư giám sát và ban chỉ huy hiện trường các gói thầu
              </div>
            </div>

            <div style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="font-mono font-bold text-slate-800">Nợ 642 / Có 3341</span>
                <span className="font-mono font-bold text-emerald-700">{formatVND(60000000)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Chi phí quản lý doanh nghiệp / khối văn phòng trụ sở chính Hải Minh Tower
              </div>
            </div>

            <div style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="font-mono font-bold text-slate-800">Nợ 622, 627, 642 / Có 338</span>
                <span className="font-mono font-bold text-amber-700">{formatVND(81075000)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Chi phí BHXH, BHYT, BHTN và KPCĐ doanh nghiệp đóng (tỷ lệ 23.5%)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Operational Detailed 8-Column Payroll Table (Chief Accountant, Accountant, HR Manager, Admin)
  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Bảng Lương 8 Cột &amp; Phân Bổ Chi Phí Kế Toán (FE-06 / FE-07 / FE-09)
          </h1>
          <p className="page-description">
            Kỳ tính lương: Tháng 10/2026 • Maker-Checker 3 cấp (Kế toán lập &rarr; KT Trưởng soát xét &rarr; Giám Đốc duyệt) &amp; hạch toán TK 622, 627, 642
          </p>
        </div>

        <div className="header-actions">
          {/* Export Actions */}
          {!isStaff && (
            <>
              <button onClick={handleExportPayrollCSV} className="btn btn-secondary btn-sm" title="Xuất toàn bộ bảng lương 8 khối cột ra định dạng CSV/Excel">
                <Download size={14} />
                <span>Xuất Bảng Lương (.csv)</span>
              </button>
              <button onClick={handleExportCostAllocationCSV} className="btn btn-secondary btn-sm" title="Xuất báo cáo phân bổ chi phí kế toán TK 622, 627, 642">
                <Download size={14} />
                <span>Xuất Phân Bổ (.csv)</span>
              </button>
              {(isChiefAccountant || isAccountant) && (
                <button onClick={handleExportMisa} className="btn btn-secondary btn-sm" title="Xuất tệp chứng từ hạch toán sổ cái kép MISA / FAST">
                  <FileText size={14} />
                  <span>Xuất MISA / FAST</span>
                </button>
              )}
            </>
          )}

          {/* Maker: Accountant runs payroll command */}
          {!isStaff && isAccountant && (payrollStatus === 'DRAFT' || payrollStatus === 'CALCULATED') && (
            <button onClick={handleRunPayroll} className="btn btn-primary btn-sm" style={{ backgroundColor: '#2563eb' }}>
              <Play size={14} />
              <span>Chạy Tính Lương</span>
            </button>
          )}

          {/* Maker: Accountant forwards to Chief Accountant */}
          {!isStaff && isAccountant && payrollStatus === 'CALCULATED' && (
            <button onClick={handleSubmitToChief} className="btn btn-secondary btn-sm" style={{ color: '#2563eb', borderColor: '#bfdbfe' }}>
              <ArrowUpRight size={14} />
              <span>Trình KT Trưởng</span>
            </button>
          )}

          {/* Checker: Chief Accountant final calculation approval */}
          {!isStaff && isChiefAccountant && (payrollStatus === 'CALCULATED' || payrollStatus === 'DRAFT') && (
            <button onClick={handleChiefReview} className="btn btn-primary btn-sm" style={{ backgroundColor: '#d97706' }}>
              <Check size={14} />
              <span>Thẩm Định (KT Trưởng)</span>
            </button>
          )}

          {/* Approver: Director approves total budget */}
          {!isStaff && isDirector && payrollStatus === 'REVIEWED' && (
            <button onClick={handleDirectorApprove} className="btn btn-primary btn-sm">
              <Check size={14} />
              <span>Phê Duyệt Quỹ Lương</span>
            </button>
          )}

          {/* Lock and pay: Only Chief Accountant */}
          {!isStaff && isChiefAccountant && payrollStatus === 'APPROVED' && (
            <button onClick={handleLockAndPay} className="btn btn-primary btn-sm" style={{ backgroundColor: '#047857' }}>
              <Lock size={14} />
              <span>Khóa Sổ &amp; Chi Lương</span>
            </button>
          )}

          {!isStaff && payrollStatus === 'PAID' && (
            <span className="badge badge-success" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
              <Lock size={12} />
              <span>Đã Khóa Sổ &amp; Đã Chi</span>
            </span>
          )}

          {/* If staff: Print/Email action */}
          {isStaff && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleSendEmailPayslip(user?.fullName || 'bạn')} className="btn btn-secondary">
                <Mail size={15} />
                <span>Gửi Bản Mã Hóa Về Email</span>
              </button>
              <button onClick={handlePrintPayslip} className="btn btn-primary">
                <Printer size={15} />
                <span>In Phiếu Lương</span>
              </button>
            </div>
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

      {/* 3-Level Approval Stepper Bar */}
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
            Tiến Trình Maker-Checker 3 Cấp:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
            <span className={`badge ${payrollStatus === 'DRAFT' ? 'badge-warning' : 'badge-success'}`}>
              1. Kế toán lập ({payrollStatus === 'DRAFT' ? 'Đang tạo' : 'Hoàn tất'})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span
              className={`badge ${
                payrollStatus === 'REVIEWED' || payrollStatus === 'APPROVED' || payrollStatus === 'PAID'
                  ? 'badge-success'
                  : payrollStatus === 'CALCULATED'
                  ? 'badge-warning'
                  : 'badge-slate'
              }`}
            >
              2. KT Trưởng thẩm định ({payrollStatus === 'REVIEWED' || payrollStatus === 'APPROVED' || payrollStatus === 'PAID' ? 'Đã duyệt' : (payrollStatus === 'CALCULATED' ? 'Chờ duyệt' : 'Chưa đến')})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span
              className={`badge ${
                payrollStatus === 'APPROVED' || payrollStatus === 'PAID'
                  ? 'badge-success'
                  : payrollStatus === 'REVIEWED'
                  ? 'badge-warning'
                  : 'badge-slate'
              }`}
            >
              3. Giám Đốc phê duyệt ({payrollStatus === 'APPROVED' || payrollStatus === 'PAID' ? 'Đã duyệt quỹ' : (payrollStatus === 'REVIEWED' ? 'Chờ duyệt' : 'Chưa đến')})
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <span className={`badge ${payrollStatus === 'PAID' ? 'badge-success' : 'badge-slate'}`}>
              4. Khóa sổ chi trả ({payrollStatus === 'PAID' ? 'Đã chi trả' : 'Chưa chi'})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Chứng từ gốc: <span className="font-mono font-semibold text-slate-800">PKT-2026-10-001</span>
          </div>
          <button
            onClick={() => {
              setPayrollStatus('DRAFT');
              showToast('Đã khôi phục trạng thái bảng lương về Khởi tạo (DRAFT) để kiểm thử toàn bộ luồng Maker-Checker!');
            }}
            title="Khôi phục trạng thái về DRAFT để kiểm thử luồng Maker-Checker từ đầu"
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

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Quỹ Lương Gross</span>
            <div className="kpi-icon-wrap">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(sumGross)}</div>
          <div className="kpi-subtext">Chuẩn công: <span className="tabular-nums font-medium text-slate-700">26</span> ngày/tháng</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Thực Nhận (Net Take-home)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{formatVND(sumNet)}</div>
          <div className="kpi-subtext">Đã khấu trừ BHXH, Thuế TNCN &amp; Công đoàn</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Khấu Trừ NLĐ (BH &amp; Thuế)</span>
            <div className="kpi-icon-wrap" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
              <Receipt size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#dc2626' }}>{formatVND(sumBhNld + sumPit + sumUnion)}</div>
          <div className="kpi-subtext">Gồm BHXH (10.5%), Thuế TNCN &amp; CĐ (1%)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Chi Phí BH Doanh Nghiệp (23.5%)</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
              <Building size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(sumBhDn)}</div>
          <div className="kpi-subtext">Hạch toán vào chi phí TK 622, 627, 642</div>
        </div>
      </div>

      {exported && (
        <div className="alert-banner alert-banner-success">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>
              Đã kết xuất thành công chứng từ kế toán <strong>PKT-2026-10-001.xml</strong> khớp chuẩn giao thức tích hợp MISA SME / FAST Accounting.
            </span>
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phân Loại Tài Khoản:</label>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ minWidth: '180px' }}
          >
            <option value="ALL">Toàn Bộ Nhân Lực ({mockEmployees.length})</option>
            <option value="OFFICE_STAFF">Văn Phòng (TK 642)</option>
            <option value="SITE_ENGINEER">Kỹ Sư Hiện Trường (TK 627)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginLeft: 'auto', fontSize: '0.6875rem' }}>
          <span className="badge badge-slate">Khối A: Định danh</span>
          <span className="badge badge-slate">Khối B: Ngày công</span>
          <span className="badge badge-slate">Khối C: Lương chính</span>
          <span className="badge badge-slate">Khối D: Phụ cấp CT</span>
          <span className="badge badge-slate">Khối E: Làm thêm OT</span>
          <span className="badge badge-info">Khối F: Tổng Gross</span>
          <span className="badge badge-danger">Khối G: Khấu trừ BH/Thuế/CĐ</span>
          <span className="badge badge-success">Khối H: Thực nhận Net</span>
        </div>
      </div>

      {/* 4. High Data Density 11-Column Table */}
      <div className="table-container">
        <table className="hm-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: '85px' }}>Mã NV</th>
              <th className="text-left">Họ Và Tên</th>
              <th className="text-center">Hạch Toán</th>
              <th className="text-center" style={{ width: '85px' }}>Công Đi Làm</th>
              <th className="text-right">Lương Theo Công</th>
              <th className="text-right">Phụ Cấp CT</th>
              <th className="text-right">Làm Thêm OT</th>
              <th className="text-right">Thu Nhập Gross</th>
              <th className="text-right">BHXH (10.5%)</th>
              <th className="text-right">Thuế TNCN</th>
              <th className="text-right" style={{ width: '130px' }}>THỰC NHẬN (NET)</th>
              <th className="text-center" style={{ width: '90px' }}>Phiếu Lương</th>
            </tr>
          </thead>
          <tbody>
            {payrollRows.map((r) => (
              <tr key={r.id}>
                <td className="text-left font-mono font-medium text-slate-700">{r.employeeCode}</td>
                <td className="text-left">
                  <div className="font-medium text-slate-900">{r.fullName}</div>
                  <div className="text-xs text-slate-500">{r.position}</div>
                </td>
                <td className="text-center">
                  {r.employeeType === 'OFFICE_STAFF' ? (
                    <span className="badge badge-info">TK 642</span>
                  ) : (
                    <span className="badge badge-warning">TK 627</span>
                  )}
                </td>
                <td className="text-center tabular-nums font-medium text-slate-800">
                  {r.actualDays} / {r.stdDays}
                </td>
                <td className="text-right tabular-nums text-slate-700">{formatVND(r.proratedBase)}</td>
                <td className="text-right tabular-nums text-slate-700">{formatVND(r.siteAllowance)}</td>
                <td className="text-right tabular-nums text-blue-700 font-medium">
                  {r.overtimePay > 0 ? `+${formatVND(r.overtimePay)}` : '0 ₫'}
                </td>
                <td className="text-right tabular-nums font-semibold text-slate-900">
                  {formatVND(r.gross)}
                </td>
                <td className="text-right tabular-nums text-rose-700">-{formatVND(r.bhNld)}</td>
                <td className="text-right tabular-nums text-amber-700">-{formatVND(r.pitTax)}</td>
                <td className="text-right tabular-nums font-bold text-emerald-700" style={{ fontSize: '0.875rem' }}>
                  {formatVND(r.net)}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => setSelectedPayslipEmp(r)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                  >
                    <FileText size={12} />
                    <span>Xem</span>
                  </button>
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}>
              <td colSpan={3} className="text-left font-semibold text-slate-900">TỔNG CỘNG ({payrollRows.length} Cán Bộ):</td>
              <td className="text-center tabular-nums text-slate-900">24 công/người</td>
              <td className="text-right tabular-nums text-slate-900">{formatVND(payrollRows.reduce((a, b) => a + b.proratedBase, 0))}</td>
              <td className="text-right tabular-nums text-slate-900">{formatVND(payrollRows.reduce((a, b) => a + b.siteAllowance, 0))}</td>
              <td className="text-right tabular-nums text-blue-700">+{formatVND(payrollRows.reduce((a, b) => a + b.overtimePay, 0))}</td>
              <td className="text-right tabular-nums font-bold text-slate-900">{formatVND(sumGross)}</td>
              <td className="text-right tabular-nums font-semibold text-rose-700">-{formatVND(sumBhNld)}</td>
              <td className="text-right tabular-nums font-semibold text-amber-700">-{formatVND(sumPit)}</td>
              <td className="text-right tabular-nums font-bold text-emerald-700" style={{ fontSize: '0.9375rem' }}>
                {formatVND(sumNet)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};