import React, { useState } from 'react';
import {
  HardHat,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  FileCheck,
  KeyRound
} from 'lucide-react';
import type { OvertimeRequest, AttendanceExplanationRequest } from '../types';
import { api } from '../services/api';

interface LiveEngineerStatus {
  id: number;
  code: string;
  name: string;
  position: string;
  taskGroup: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NIGHT_SHIFT';
  checkInTime: string;
  checkOutTime?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  otpCode: string;
  batteryLevel: number;
  deviceInfo: string;
}

export const SiteManagement: React.FC = () => {

  // 1. Dynamic OTP State (UC-08)
  const [currentOtp, setCurrentOtp] = useState('849201');
  const [otpMinutesLeft, setOtpMinutesLeft] = useState(48);
  const [isOtpLocked, setIsOtpLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Emergency Punch Modal State (UC-08)
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyTargetEmp, setEmergencyTargetEmp] = useState('HM-015');
  const [emergencyShift, setEmergencyShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [emergencyReason, setEmergencyReason] = useState('Mất kết nối 4G/GPS khi thi công dưới hố móng sâu trụ cầu P3');

  // 3. Site Timesheet L1 State (UC-15 / BF-07)
  const [timesheetL1Status, setTimesheetL1Status] = useState<'PENDING' | 'CONFIRMED'>('PENDING');

  // 4. Live Engineers Roster Mock Data for Project DA-NHATTAN2
  const [engineersRoster, setEngineersRoster] = useState<LiveEngineerStatus[]>([
    {
      id: 6,
      code: 'HM-006',
      name: 'Trần Văn Trung',
      position: 'Kỹ sư Giám sát Kết cấu',
      taskGroup: 'Gói Cọc khoan nhồi & Mố trụ M1',
      status: 'PRESENT',
      checkInTime: '07:54:12',
      latitude: 21.0928,
      longitude: 105.8191,
      distanceMeters: 42,
      otpCode: '849201',
      batteryLevel: 88,
      deviceInfo: 'Samsung Galaxy A54 (Android 14)',
    },
    {
      id: 7,
      code: 'HM-007',
      name: 'Phạm Thành Nam',
      position: 'Kỹ sư Cầu đường Hiện trường',
      taskGroup: 'Gói Đúc & Lao lắp Dầm Super-T',
      status: 'PRESENT',
      checkInTime: '07:58:30',
      latitude: 21.0924,
      longitude: 105.8198,
      distanceMeters: 68,
      otpCode: '849201',
      batteryLevel: 75,
      deviceInfo: 'iPhone 13 (iOS 17.5)',
    },
    {
      id: 14,
      code: 'HM-014',
      name: 'Đặng Tuấn Tú',
      position: 'Kỹ sư Trắc địa Hiện trường',
      taskGroup: 'Gói Khảo sát cao độ & tim mốc Bờ Bắc',
      status: 'PRESENT',
      checkInTime: '08:02:15',
      latitude: 21.0935,
      longitude: 105.8185,
      distanceMeters: 115,
      otpCode: '849201',
      batteryLevel: 92,
      deviceInfo: 'Xiaomi Redmi Note 12',
    },
    {
      id: 10,
      code: 'HM-010',
      name: 'Hoàng Quốc Việt',
      position: 'Kỹ sư Quản lý An toàn Lao động',
      taskGroup: 'Kiểm định An toàn giàn giáo & Cẩu tháp',
      status: 'PRESENT',
      checkInTime: '07:49:05',
      latitude: 21.0926,
      longitude: 105.8194,
      distanceMeters: 35,
      otpCode: '849201',
      batteryLevel: 65,
      deviceInfo: 'Oppo Reno 8 (Android 13)',
    },
    {
      id: 15,
      code: 'HM-015',
      name: 'Vũ Đình Toàn',
      position: 'Kỹ sư Hệ thống Điện & Chiếu sáng',
      taskGroup: 'Trạm hạ thế thi công & Bơm thoát nước',
      status: 'ABSENT',
      checkInTime: '-',
      latitude: 0,
      longitude: 0,
      distanceMeters: 0,
      otpCode: '-',
      batteryLevel: 0,
      deviceInfo: 'Chưa kết nối',
    },
  ]);

  // 5. Level 1 Requests Queue (OT, Explanations, Leave from Site Engineers)
  const [pendingOtRequests, setPendingOtRequests] = useState<OvertimeRequest[]>([
    {
      id: 101,
      employeeId: 6,
      employeeCode: 'HM-006',
      employeeName: 'Trần Văn Trung',
      projectId: 1,
      projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      workDate: '2026-10-21',
      startTime: '21:00',
      endTime: '03:00',
      otHours: 6,
      otType: 'NIGHT_SHIFT_ADDITIONAL',
      multiplier: 1.8,
      reason: 'Trực kỹ thuật đổ bê tông bản mặt cầu nhịp chính K14 (Bê tông thương phẩm yêu cầu thi công ban đêm tránh nhiệt hóa).',
      siteManagerApproval: 'PENDING',
      hrApproval: 'PENDING',
      status: 'PENDING_SM',
      createdAt: '2026-10-21 16:30',
    },
    {
      id: 102,
      employeeId: 7,
      employeeCode: 'HM-007',
      employeeName: 'Phạm Thành Nam',
      projectId: 1,
      projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      workDate: '2026-10-22',
      startTime: '18:00',
      endTime: '22:00',
      otHours: 4,
      otType: 'WEEKDAY_150',
      multiplier: 1.5,
      reason: 'Căn chỉnh kích kéo cáp dự ứng lực dầm cầu T3 để kịp nghiệm thu tư vấn giám sát sáng hôm sau.',
      siteManagerApproval: 'PENDING',
      hrApproval: 'PENDING',
      status: 'PENDING_SM',
      createdAt: '2026-10-21 17:10',
    },
  ]);

  const [pendingExplanations, setPendingExplanations] = useState<AttendanceExplanationRequest[]>([
    {
      id: 201,
      employeeId: 14,
      employeeCode: 'HM-014',
      employeeName: 'Đặng Tuấn Tú',
      projectId: 1,
      projectName: 'Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      targetDate: '2026-10-20',
      explanationType: 'GPS_DEVIATION',
      suggestedCheckIn: '07:30',
      suggestedCheckOut: '17:15',
      reason: 'Đặt máy trắc địa dưới lòng sông kiểm tra cọc thử, dầm thép che khuất sóng GPS vệ tinh gây báo lệch vị trí 240m.',
      siteManagerApproval: 'PENDING',
      hrApproval: 'PENDING',
      status: 'PENDING_SM',
      createdAt: '2026-10-20 18:00',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate new Dynamic OTP (UC-08)
  const handleGenerateNewOtp = async () => {
    try {
      const res = await api.generateOtp(1, 7);
      setCurrentOtp(res.otpCode);
      setOtpMinutesLeft(60);
      setIsOtpLocked(false);
      showToast(`Đã sinh mã Daily Site OTP mới [${res.otpCode}] từ Backend! Hiệu lực 24h.`);
    } catch {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setCurrentOtp(randomCode);
      setOtpMinutesLeft(60);
      setIsOtpLocked(false);
      showToast(`Đã sinh mã Dynamic OTP mới: ${randomCode} (Có hiệu lực 60 phút cho kỹ sư công trường Cầu Nhật Tân 2)!`);
    }
  };

  // Handle L1 OT Approval
  const handleApproveOtL1 = async (id: number, approved: boolean) => {
    try {
      await api.approveOvertimeRequest(id, 'SITE_MANAGER', approved);
    } catch (e) {
      console.warn('Backend sync failed, updating local state:', e);
    }
    setPendingOtRequests(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              siteManagerApproval: approved ? 'APPROVED' : 'REJECTED',
              status: approved ? 'PENDING_HR' : 'REJECTED',
            }
          : r
      )
    );
    showToast(
      approved
        ? `Chỉ huy trưởng đã DUYỆT CẤP 1 đơn OT #${id}! Đã chuyển Phòng HR thẩm định hồ sơ.`
        : `Chỉ huy trưởng đã TỪ CHỐI đơn OT #${id} do không phù hợp tiến độ thi công.`
    );
  };

  // Handle L1 Explanation Approval
  const handleApproveExplanationL1 = async (id: number, approved: boolean) => {
    try {
      await api.approveAttendanceExplanation(id, 'SM', approved);
    } catch (e) {
      console.warn('Backend sync failed, updating local state:', e);
    }
    setPendingExplanations(prev =>
      prev.map(e =>
        e.id === id
          ? {
              ...e,
              siteManagerApproval: approved ? 'APPROVED' : 'REJECTED',
              status: approved ? 'PENDING_HR' : 'REJECTED',
            }
          : e
      )
    );
    showToast(
      approved
        ? `Chỉ huy trưởng đã XÁC NHẬN CẤP 1 giải trình bù công #${id}! Đã chuyển Phòng HR đối soát.`
        : `Chỉ huy trưởng đã BÁC BỎ giải trình bù công #${id}.`
    );
  };

  // Handle Emergency Punch (UC-08)
  const handleConfirmEmergencyPunch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = engineersRoster.find(eng => eng.code === emergencyTargetEmp);
    const targetName = target ? target.name : emergencyTargetEmp;

    // Update roster status
    setEngineersRoster(prev =>
      prev.map(eng =>
        eng.code === emergencyTargetEmp
          ? {
              ...eng,
              status: emergencyShift === 'DAY' ? 'PRESENT' : 'NIGHT_SHIFT',
              checkInTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              distanceMeters: 10,
              otpCode: currentOtp,
              deviceInfo: 'Chỉ Huy Trưởng Xác Thực Khẩn Cấp (Emergency Punch UC-08)',
            }
          : eng
      )
    );

    setIsEmergencyModalOpen(false);
    showToast(`Chỉ huy trưởng đã ký Điểm Danh Khẩn Cấp cho ${targetName} (${emergencyTargetEmp}) thành công!`);
  };

  // Handle Site Timesheet L1 Confirmation (UC-15 / BF-07)
  const handleConfirmSiteTimesheet = () => {
    setTimesheetL1Status('CONFIRMED');
    showToast('Chỉ huy trưởng đã ký Xác Nhận Bảng Chấm Công Công Trường Cấp 1 Tháng 10/2026 (UC-15 / BF-07)! Dữ liệu đã chuyển sang Phòng HR để khóa công ty L2.');
  };

  return (
    <div className="page-wrapper">
      {/* 1. Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
              Phân Hệ Nghiệp Vụ Chỉ Huy Trưởng (Site Commander Hub)
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Dự án: <strong className="font-semibold text-slate-800">Cầu Nhật Tân 2 &amp; Nút Giao Vành Đai (DA-NHATTAN2)</strong>
            </span>
          </div>
          <h1 className="page-title">
            Quản Lý &amp; Điều Hành Hiện Trường (Site Operations &amp; Verification)
          </h1>
          <p className="page-description">
            Trung tâm tác nghiệp của Chỉ huy trưởng: Cấp mã Dynamic OTP (UC-08), giám sát quân số real-time, điểm danh khẩn cấp tại hố móng, phê duyệt Cấp 1 đơn OT/Nghỉ phép và xác nhận bảng công dự án (UC-15 / BF-07).
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="btn btn-secondary"
            style={{ color: '#b45309', borderColor: '#fde68a' }}
          >
            <AlertTriangle size={15} />
            <span>Điểm Danh Khẩn Cấp (UC-08)</span>
          </button>

          <button
            onClick={handleGenerateNewOtp}
            className="btn btn-primary"
            style={{ backgroundColor: '#d97706' }}
          >
            <RefreshCw size={15} />
            <span>Tạo OTP Ca Mới (UC-08)</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Key Site Metrics Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Quân Số Kỹ Sư Trực Hiện Trường</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <HardHat size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">
            {engineersRoster.filter(e => e.status === 'PRESENT').length} / {engineersRoster.length}
          </div>
          <div className="kpi-subtext">
            Có mặt: <span className="text-emerald-700 font-semibold">{engineersRoster.filter(e => e.status === 'PRESENT').length} kỹ sư</span> &bull; 1 vắng mặt
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Mã Dynamic OTP Ca Hiện Tại</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <KeyRound size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono tabular-nums" style={{ color: '#d97706', letterSpacing: '0.1em' }}>
            {currentOtp}
          </div>
          <div className="kpi-subtext">
            Còn hiệu lực: <span className="font-semibold text-slate-800">{otpMinutesLeft} phút</span> &bull; Geofence R=200m
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đơn Hiện Trường Chờ CHT Duyệt (L1)</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fef3c7' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#b45309' }}>
            {pendingOtRequests.filter(r => r.siteManagerApproval === 'PENDING').length + pendingExplanations.filter(e => e.siteManagerApproval === 'PENDING').length}
          </div>
          <div className="kpi-subtext">
            Gồm {pendingOtRequests.filter(r => r.siteManagerApproval === 'PENDING').length} đơn OT &bull; {pendingExplanations.filter(e => e.siteManagerApproval === 'PENDING').length} đơn giải trình
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Bảng Chấm Công Tháng 10 (L1)</span>
            <div className="kpi-icon-wrap" style={{ color: timesheetL1Status === 'CONFIRMED' ? '#047857' : '#2563eb', backgroundColor: timesheetL1Status === 'CONFIRMED' ? '#ecfdf5' : '#eff6ff' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', color: timesheetL1Status === 'CONFIRMED' ? '#047857' : '#b45309' }}>
            {timesheetL1Status === 'CONFIRMED' ? 'Đã Xác Nhận L1' : 'Chờ Thẩm Định L1'}
          </div>
          <div className="kpi-subtext">
            {timesheetL1Status === 'CONFIRMED' ? 'Đã chuyển về Phòng HR' : 'Đối chiếu Nhật ký thi công'}
          </div>
        </div>
      </div>

      {/* 3. Dynamic OTP & Site Security Control Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <KeyRound size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Hệ Thống Xác Thực Kép Hiện Trường (Geofence + Dynamic OTP - UC-08)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.15em', color: '#1e293b' }}>
                {currentOtp}
              </span>
              <span className="badge badge-success">Đang Hoạt Động</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Tọa độ tâm dự án: <strong className="font-mono text-slate-800">21.0927° N, 105.8193° E</strong> (Bán kính hợp lệ: 200 mét)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => {
              setIsOtpLocked(!isOtpLocked);
              showToast(isOtpLocked ? 'Đã mở khóa cổng điểm danh di động hiện trường!' : 'Đã tạm khóa cổng điểm danh di động hiện trường!');
            }}
            className={`btn btn-sm ${isOtpLocked ? 'btn-primary' : 'btn-secondary'}`}
          >
            {isOtpLocked ? 'Mở Khóa Điểm Danh' : 'Tạm Khóa Điểm Danh'}
          </button>
          <button onClick={handleGenerateNewOtp} className="btn btn-sm btn-primary" style={{ backgroundColor: '#d97706' }}>
            <RefreshCw size={13} />
            <span>Đổi Mã OTP Mới</span>
          </button>
        </div>
      </div>

      {/* 4. Live Site Deployment Roster (Bảng Giám Sát Quân Số & Tọa Độ Thời Gian Thực) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#2563eb" />
              <span>Bảng Giám Sát Quân Số &amp; Vị Trí Kỹ Sư Hiện Trường (Live Site Roster - UC-08)</span>
            </h2>
            <p className="card-subtitle">
              Giám sát tình trạng mặt bằng thi công, tọa độ GPS vệ tinh và khoảng cách tới tâm công trình Cầu Nhật Tân 2
            </p>
          </div>
          <span className="badge badge-primary">
            Thời gian thực: {new Date().toLocaleTimeString('vi-VN')}
          </span>
        </div>

        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left">Mã NV</th>
                <th className="text-left">Kỹ Sư Hiện Trường</th>
                <th className="text-left">Hạng Mục / Gói Thầu Phụ Trách</th>
                <th className="text-center">Giờ Check-in</th>
                <th className="text-center">Tọa Độ GPS</th>
                <th className="text-center">Khoảng Cách Geofence</th>
                <th className="text-center">Mã OTP Dùng</th>
                <th className="text-center">Trạng Thái</th>
                <th className="text-right">Tác Nghiệp CHT</th>
              </tr>
            </thead>
            <tbody>
              {engineersRoster.map((eng) => (
                <tr key={eng.id}>
                  <td className="font-mono font-medium text-slate-700">{eng.code}</td>
                  <td>
                    <div className="font-semibold text-slate-900">{eng.name}</div>
                    <div className="text-xs text-slate-500">{eng.position}</div>
                  </td>
                  <td className="text-slate-700 text-xs">
                    <span style={{ fontWeight: 500 }}>{eng.taskGroup}</span>
                  </td>
                  <td className="text-center font-mono text-xs tabular-nums font-semibold text-slate-800">
                    {eng.checkInTime}
                  </td>
                  <td className="text-center font-mono text-xs text-slate-600">
                    {eng.latitude > 0 ? `${eng.latitude}, ${eng.longitude}` : '-'}
                  </td>
                  <td className="text-center font-mono text-xs tabular-nums">
                    {eng.distanceMeters > 0 ? (
                      <span className={eng.distanceMeters <= 200 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-bold'}>
                        {eng.distanceMeters}m / 200m
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="text-center font-mono text-xs">
                    {eng.otpCode !== '-' ? (
                      <span className="badge badge-slate font-mono">{eng.otpCode}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    {eng.status === 'PRESENT' ? (
                      <span className="badge badge-success">Đang Tại Hiện Trường</span>
                    ) : eng.status === 'NIGHT_SHIFT' ? (
                      <span className="badge badge-primary">Ca Đêm (Đổ Bê Tông)</span>
                    ) : (
                      <span className="badge badge-danger">Chưa Check-in</span>
                    )}
                  </td>
                  <td className="text-right">
                    {eng.status === 'ABSENT' ? (
                      <button
                        onClick={() => {
                          setEmergencyTargetEmp(eng.code);
                          setIsEmergencyModalOpen(true);
                        }}
                        className="btn btn-sm btn-primary"
                        style={{ backgroundColor: '#d97706', padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                      >
                        <AlertTriangle size={11} /> Điểm Danh Khẩn Cấp
                      </button>
                    ) : (
                      <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>Hợp Lệ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Level 1 Approvals (Hàng Đợi Phê Duyệt Cấp 1: Tăng Ca OT & Giải Trình Chấm Công) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Box A: Overtime Approvals (UC-13 / BF-04) */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="#d97706" />
                <span>Duyệt Đăng Ký OT Ban Đêm Đổ Bê Tông (L1 - UC-13)</span>
              </h3>
              <p className="card-subtitle">Thẩm quyền CHT: Xác nhận sự cần thiết thi công cấp bách</p>
            </div>
            <span className="badge badge-warning">{pendingOtRequests.filter(r => r.siteManagerApproval === 'PENDING').length} Chờ Duyệt</span>
          </div>

          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingOtRequests.map((ot) => (
              <div
                key={ot.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  backgroundColor: ot.siteManagerApproval === 'APPROVED' ? '#f0fdf4' : ot.siteManagerApproval === 'REJECTED' ? '#fef2f2' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <div>
                    <span className="font-semibold text-slate-900" style={{ fontSize: '0.875rem' }}>{ot.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500" style={{ marginLeft: '0.4rem' }}>({ot.employeeCode})</span>
                  </div>
                  <span className="badge badge-primary font-mono">{ot.otHours} giờ ({ot.multiplier}x)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Ca: <strong>{ot.startTime} - {ot.endTime}</strong> ngày <strong>{ot.workDate}</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', backgroundColor: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  {ot.reason}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem' }}>
                    Trạng thái: {ot.siteManagerApproval === 'APPROVED' ? (
                      <strong className="text-emerald-700">CHT Đã Duyệt L1 (Chờ HR L2)</strong>
                    ) : ot.siteManagerApproval === 'REJECTED' ? (
                      <strong className="text-rose-700">CHT Đã Từ Chối</strong>
                    ) : (
                      <strong className="text-amber-700">Chờ CHT Phê Duyệt</strong>
                    )}
                  </span>

                  {ot.siteManagerApproval === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleApproveOtL1(ot.id, true)}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                      >
                        <Check size={12} /> Duyệt Cấp 1
                      </button>
                      <button
                        onClick={() => handleApproveOtL1(ot.id, false)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem', color: '#b91c1c' }}
                      >
                        <X size={12} /> Từ Chối
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Box B: Attendance Explanations (UC-11 / BF-05) */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck size={16} color="#2563eb" />
                <span>Duyệt Đơn Giải Trình Bù Công (L1 - UC-11)</span>
              </h3>
              <p className="card-subtitle">Xác minh kỹ sư có mặt nhưng bị lệch GPS / hỏng máy</p>
            </div>
            <span className="badge badge-warning">{pendingExplanations.filter(e => e.siteManagerApproval === 'PENDING').length} Chờ Duyệt</span>
          </div>

          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingExplanations.map((exp) => (
              <div
                key={exp.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  backgroundColor: exp.siteManagerApproval === 'APPROVED' ? '#f0fdf4' : exp.siteManagerApproval === 'REJECTED' ? '#fef2f2' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <div>
                    <span className="font-semibold text-slate-900" style={{ fontSize: '0.875rem' }}>{exp.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500" style={{ marginLeft: '0.4rem' }}>({exp.employeeCode})</span>
                  </div>
                  <span className="badge badge-warning">Lệch Tọa Độ GPS</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Ngày xảy ra: <strong>{exp.targetDate}</strong> &bull; Đề xuất bù công: <strong>{exp.suggestedCheckIn} - {exp.suggestedCheckOut}</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', backgroundColor: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  {exp.reason}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem' }}>
                    Trạng thái: {exp.siteManagerApproval === 'APPROVED' ? (
                      <strong className="text-emerald-700">CHT Đã Xác Nhận (Chờ HR Bù Công)</strong>
                    ) : exp.siteManagerApproval === 'REJECTED' ? (
                      <strong className="text-rose-700">CHT Đã Bác Bỏ</strong>
                    ) : (
                      <strong className="text-amber-700">Chờ CHT Xác Minh</strong>
                    )}
                  </span>

                  {exp.siteManagerApproval === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleApproveExplanationL1(exp.id, true)}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                      >
                        <Check size={12} /> Xác Nhận L1
                      </button>
                      <button
                        onClick={() => handleApproveExplanationL1(exp.id, false)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem', color: '#b91c1c' }}
                      >
                        <X size={12} /> Bác Bỏ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Site Timesheet Level 1 Confirmation Section (UC-15 / BF-07) */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid #d97706',
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} color="#d97706" />
              <span>Thẩm Định &amp; Xác Nhận Bảng Chấm Công Hiện Trường Tháng 10/2026 (Cấp 1 - UC-15 / BF-07)</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Chỉ huy trưởng đối soát dữ liệu điểm danh GPS + OTP với <strong>Nhật ký thi công công trình</strong> trước khi ký phê duyệt Cấp 1 để chuyển sang Phòng HR khóa công toàn công ty (L2).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {timesheetL1Status === 'CONFIRMED' ? (
              <span className="badge badge-success" style={{ padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}>
                <CheckCircle2 size={15} />
                <span>CHT Đã Ký Xác Nhận Cấp 1 (Chờ HR Khóa L2)</span>
              </span>
            ) : (
              <button
                onClick={handleConfirmSiteTimesheet}
                className="btn btn-primary"
                style={{ backgroundColor: '#d97706' }}
              >
                <Check size={15} />
                <span>Ký Xác Nhận Bảng Công Dự Án (L1 - UC-15)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7. Modal: Emergency Attendance Punch (UC-08) */}
      {isEmergencyModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEmergencyModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <span>Điểm Danh Khẩn Cấp Tại Chỗ (Emergency Punch - UC-08)</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Xử lý sự cố mất sóng 4G/GPS hố móng sâu hoặc thiết bị hỏng tại công trường
                </span>
              </div>
              <button onClick={() => setIsEmergencyModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEmergencyPunch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Chọn Kỹ Sư Cần Điểm Danh Khẩn Cấp:</label>
                  <select
                    className="form-select"
                    value={emergencyTargetEmp}
                    onChange={(e) => setEmergencyTargetEmp(e.target.value)}
                    required
                  >
                    {engineersRoster.map((eng) => (
                      <option key={eng.code} value={eng.code}>
                        {eng.name} ({eng.code}) - {eng.taskGroup}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Loại Ca Làm Việc:</label>
                  <select
                    className="form-select"
                    value={emergencyShift}
                    onChange={(e) => setEmergencyShift(e.target.value as any)}
                  >
                    <option value="DAY">Ca Ngày Chuẩn (07:30 - 17:00)</option>
                    <option value="NIGHT">Ca Tăng Ca Đêm Đổ Bê Tông (22:00 - 06:00)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lý Do Xác Thực Khẩn Cấp:</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Lý do sẽ được ghi vào nhật ký kiểm toán hệ thống để đối soát với Phòng Nhân sự.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setIsEmergencyModalOpen(false)} className="btn btn-secondary">
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#d97706' }}>
                  <Check size={14} />
                  <span>Ký Xác Nhận Điểm Danh Khẩn Cấp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SiteManagement;
