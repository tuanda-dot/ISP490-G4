import React, { useState, useMemo } from 'react';
import {
  ScanFace,
  MapPin,
  Clock,
  KeyRound,
  CheckCircle2,
  FileText,
  Calendar,
  Send,
  Sparkles,
  DollarSign,
  HelpCircle,
  X,
  Plus,
  Check,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const SiteEngineerPortal: React.FC = () => {
  const { user } = useAuth();
  const engineerName = user?.fullName || 'Trần Văn Trung';
  const engineerCode = user?.employeeCode || 'HM-006';

  // 1. Mobile Punch In/Out State (UC-07)
  const [gpsCoords] = useState<{ lat: number; lng: number; dist: number }>({
    lat: 21.0928,
    lng: 105.8191,
    dist: 42, // meters from bridge center
  });
  const [enteredOtp, setEnteredOtp] = useState('849201');
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [todayPunch, setTodayPunch] = useState<{ checkIn?: string; checkOut?: string }>({
    checkIn: '07:54:12',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Modals State
  const [activeModal, setActiveModal] = useState<'OT' | 'EXPLANATION' | 'LEAVE' | 'PAYSLIP' | 'COMPLAINT' | null>(null);

  // Form states
  const [otForm, setOtForm] = useState({
    date: '2026-10-21',
    startTime: '21:00',
    endTime: '03:00',
    hours: 6,
    reason: 'Trực kỹ thuật giám sát đổ bê tông dầm cầu nhịp chính K14 (Bê tông thương phẩm chống thấm).',
  });

  const [explanationForm, setExplanationForm] = useState({
    date: '2026-10-20',
    type: 'GPS_DEVIATION',
    suggestedIn: '07:30',
    suggestedOut: '17:15',
    reason: 'Khảo sát đáy trụ cầu dưới hố móng P3, dầm thép dày che chắn sóng GPS vệ tinh.',
  });

  const [leaveForm, setLeaveForm] = useState({
    type: 'ANNUAL',
    startDate: '2026-10-24',
    endDate: '2026-10-24',
    reason: 'Giải quyết công việc gia đình cá nhân.',
  });

  const [complaintText, setComplaintText] = useState('');

  // 3. Personal Timesheet Mock Data (UC-14)
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');

  const yearNum = parseInt(selectedYear, 10) || 2026;
  const monthNum = parseInt(selectedMonth, 10) || 10;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dayOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getDayOfWeek = (day: number) => {
    const date = new Date(yearNum, monthNum - 1, day);
    return dayOfWeekNames[date.getDay()];
  };

  const isWeekend = (day: number) => {
    const dow = getDayOfWeek(day);
    return dow === 'T7' || dow === 'CN';
  };

  const personalDays = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const weekend = isWeekend(d);
      const dow = getDayOfWeek(d);

      if (weekend) {
        list.push({ day: d, dow, symbol: '-', status: `Nghỉ cuối tuần (${dow})`, ot: 0, weekend: true });
      } else if (d === 18) {
        list.push({ day: d, dow, symbol: 'O', status: 'Làm thêm ca tối 4h', ot: 4, weekend: false });
      } else if (d === 21) {
        list.push({ day: d, dow, symbol: 'O', status: 'Ca đêm đổ bê tông 6h', ot: 6, weekend: false });
      } else if (d === 24) {
        list.push({ day: d, dow, symbol: 'P', status: 'Nghỉ phép năm (100% lương)', ot: 0, weekend: false });
      } else {
        list.push({ day: d, dow, symbol: 'X', status: 'Đủ ca chuẩn 8.0h', ot: 0, weekend: false });
      }
    }
    return list;
  }, [daysInMonth, yearNum, monthNum]);

  const validWorkDaysCount = useMemo(() => {
    return personalDays.filter(p => p.symbol === 'X' || p.symbol === 'P' || p.symbol === 'O').length;
  }, [personalDays]);

  // 4. Personal Requests Tracking
  const [myRequests, setMyRequests] = useState([
    {
      id: 101,
      type: 'Tăng Ca Ban Đêm (OT)',
      date: '2026-10-21',
      details: 'Ca đêm 21:00 - 03:00 (6 giờ • Hệ số 1.8x)',
      l1Status: 'PENDING',
      l2Status: 'WAITING_L1',
      status: 'Chờ CHT Duyệt Cấp 1',
    },
    {
      id: 201,
      type: 'Giải Trình Bù Công',
      date: '2026-10-18',
      details: 'Lệch GPS do dầm thép hố móng • Bù ca 07:30 - 17:15',
      l1Status: 'APPROVED',
      l2Status: 'PENDING',
      status: 'CHT Đã Duyệt L1 → Chờ HR L2',
    },
    {
      id: 301,
      type: 'Đơn Nghỉ Phép Năm',
      date: '2026-10-24',
      details: 'Nghỉ phép 1 ngày theo Điều 113 BLLĐ',
      l1Status: 'APPROVED',
      l2Status: 'APPROVED',
      status: 'Đã Duyệt Hợp Lệ Cấp 2',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform Field Punch (UC-07)
  const handlePerformPunch = async (action: 'CHECK_IN' | 'CHECK_OUT' | 'NIGHT_OT') => {
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      alert('Vui lòng nhập đúng mã Dynamic OTP 6 chữ số do Chỉ huy trưởng cấp!');
      return;
    }

    setIsFaceScanning(true);
    try {
      await api.faceIdCheckIn({
        employeeId: user?.id || 6,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        faceConfidenceScore: 98.6,
        faceCapturedBase64: 'data:image/jpeg;base64,site_engineer_face_capture',
        isLivenessVerified: true,
        locationName: 'Dự án Cầu Nhật Tân 2 (DA-NHATTAN2)',
        distanceMeters: gpsCoords.dist,
        inGeofence: true,
        checkInMethod: 'MOBILE_GPS_OTP',
      });
    } catch (e) {
      console.warn('Backend faceIdCheckIn error or fallback:', e);
    } finally {
      setIsFaceScanning(false);
    }

    const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (action === 'CHECK_IN') {
      setTodayPunch(prev => ({ ...prev, checkIn: currentTime }));
      showToast(`Quét Face ID & GPS thành công! Đã Check-in ca sáng lúc ${currentTime} (Độ lệch Geofence: 42m - Hợp lệ).`);
    } else if (action === 'CHECK_OUT') {
      setTodayPunch(prev => ({ ...prev, checkOut: currentTime }));
      showToast(`Quét Face ID & GPS thành công! Đã Check-out ca làm việc lúc ${currentTime}. Đã chốt đủ 8.0 giờ công.`);
    } else {
      showToast(`Đã Check-in Ca Tăng Ca Đêm Đổ Bê Tông lúc ${currentTime} thành công! Hệ số lương ca đêm 180%.`);
    }
  };

  // Submit OT
  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createOvertimeRequest({
        employeeId: user?.id || 6,
        projectId: 2,
        workDate: otForm.date,
        startTime: otForm.startTime,
        endTime: otForm.endTime,
        otHours: otForm.hours,
        otType: 'NIGHT_SHIFT_ADDITIONAL',
        multiplier: 1.8,
        reason: otForm.reason,
      });
    } catch (e) {
      console.warn('Backend createOvertimeRequest fallback:', e);
    }
    const newReq = {
      id: Date.now() % 1000,
      type: 'Tăng Ca Ban Đêm (OT)',
      date: otForm.date,
      details: `Ca đêm ${otForm.startTime} - ${otForm.endTime} (${otForm.hours} giờ • Hệ số 1.8x)`,
      l1Status: 'PENDING',
      l2Status: 'WAITING_L1',
      status: 'Chờ CHT Duyệt Cấp 1',
    };
    setMyRequests(prev => [newReq, ...prev]);
    setActiveModal(null);
    showToast(`Đã nộp Đơn đăng ký tăng ca đêm ${otForm.hours} giờ thành công! Đơn đã chuyển đến Chỉ huy trưởng.`);
  };

  // Submit Explanation
  const handleSubmitExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAttendanceExplanation({
        employeeId: user?.id || 6,
        projectId: 2,
        targetDate: explanationForm.date,
        explanationType: explanationForm.type as any,
        suggestedCheckIn: explanationForm.suggestedIn,
        suggestedCheckOut: explanationForm.suggestedOut,
        reason: explanationForm.reason,
      });
    } catch (e) {
      console.warn('Backend createAttendanceExplanation fallback:', e);
    }
    const newReq = {
      id: Date.now() % 1000,
      type: 'Giải Trình Bù Công',
      date: explanationForm.date,
      details: `Bù công ca ${explanationForm.suggestedIn} - ${explanationForm.suggestedOut}`,
      l1Status: 'PENDING',
      l2Status: 'WAITING_L1',
      status: 'Chờ CHT Duyệt Cấp 1',
    };
    setMyRequests(prev => [newReq, ...prev]);
    setActiveModal(null);
    showToast(`Đã nộp Đơn giải trình chấm công ngày ${explanationForm.date} thành công!`);
  };

  // Submit Leave
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLeaveRequest({
        employeeId: user?.id || 6,
        leaveType: leaveForm.type as any,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        daysCount: 1,
        reason: leaveForm.reason,
      });
    } catch (e) {
      console.warn('Backend createLeaveRequest fallback:', e);
    }
    const newReq = {
      id: Date.now() % 1000,
      type: 'Đơn Xin Nghỉ Phép',
      date: leaveForm.startDate,
      details: `Nghỉ phép ${leaveForm.startDate} đến ${leaveForm.endDate}`,
      l1Status: 'PENDING',
      l2Status: 'WAITING_L1',
      status: 'Chờ CHT Duyệt Cấp 1',
    };
    setMyRequests(prev => [newReq, ...prev]);
    setActiveModal(null);
    showToast(`Đã gửi đơn xin nghỉ phép ngày ${leaveForm.startDate} thành công!`);
  };

  // Submit Complaint
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText) return;
    setActiveModal(null);
    setComplaintText('');
    showToast('Đã gửi Ticket khiếu nại phiếu lương tháng 10/2026 thành công! Chuyên viên Kế toán sẽ phản hồi trong 24 giờ.');
  };

  return (
    <div className="page-wrapper">
      {/* 1. Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary">Phân Hệ Kỹ Sư Hiện Trường (Site Engineer Field Portal)</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Kỹ sư: <strong className="font-semibold text-slate-900">{engineerName}</strong> ({engineerCode})
            </span>
          </div>
          <h1 className="page-title">
            Bàn Làm Việc &amp; Tác Nghiệp Kỹ Sư Hiện Trường
          </h1>
          <p className="page-description">
            Cổng di động chuyên biệt: Điểm danh GPS + Dynamic OTP (UC-07), nộp đơn tăng ca đêm đổ bê tông (UC-13), giải trình bù công (UC-11), theo dõi bảng công 31 ngày (UC-14) và tra cứu phiếu lương E-Payslip (UC-24).
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => setActiveModal('PAYSLIP')} className="btn btn-secondary">
            <DollarSign size={15} color="#047857" />
            <span>Phiếu Lương E-Payslip (UC-24)</span>
          </button>
          <button onClick={() => setActiveModal('OT')} className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
            <Plus size={15} />
            <span>Đăng Ký OT Ban Đêm (UC-13)</span>
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

      {/* 2. Key Engineer KPIs */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Ngày Công Tích Lũy (Tháng 10)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>
            22.0 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 26 công</span>
          </div>
          <div className="kpi-subtext">Đạt 84.6% định mức &bull; 1 ngày phép năm</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Giờ Làm Thêm Ban Đêm (OT)</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#d97706' }}>
            10.0 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>giờ</span>
          </div>
          <div className="kpi-subtext">Hệ số 150% và 180% ca đêm đổ bê tông</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Phụ Cấp Lưu Động Công Trường</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono tabular-nums" style={{ color: '#2563eb' }}>
            2.500.000 đ
          </div>
          <div className="kpi-subtext">Được miễn thuế TNCN theo TT 111/2013</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Trạng Thái Đơn Từ Chờ Duyệt</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fef3c7' }}>
              <FileText size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#b45309' }}>
            {myRequests.filter(r => r.l2Status !== 'APPROVED').length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>đơn</span>
          </div>
          <div className="kpi-subtext">1 đơn chờ CHT L1 &bull; 1 đơn chờ HR L2</div>
        </div>
      </div>

      {/* 3. Field Mobile Check-In Terminal (UC-07) */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe',
        }}
      >
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScanFace size={20} color="#2563eb" />
              <span>Điểm Danh Di Động Hiện Trường (GPS + Dynamic OTP - UC-07)</span>
            </h2>
            <p className="card-subtitle">
              Xác thực kép tại công trường Cầu Nhật Tân 2: Nhận diện vị trí Geofence R=200m và kiểm tra khuôn mặt AI Liveness
            </p>
          </div>
          <span className="badge badge-success">GPS Tín Hiệu Mạnh (4 vệ tinh)</span>
        </div>

        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
          {/* Left: GPS & OTP Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Tọa Độ GPS Hiện Tại Của Bạn:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#047857" />
                <span className="font-mono font-semibold text-slate-800" style={{ fontSize: '0.875rem' }}>
                  {gpsCoords.lat}° N, {gpsCoords.lng}° E
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                  Cách tâm {gpsCoords.dist}m (Hợp lệ &le; 200m)
                </span>
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <KeyRound size={14} color="#d97706" />
                <span>Nhập Mã Dynamic OTP (Do Chỉ Huy Trưởng Cấp):</span>
              </label>
              <input
                type="text"
                className="form-input font-mono font-bold text-center"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                maxLength={6}
                style={{ fontSize: '1.25rem', letterSpacing: '0.2em', color: '#1e293b' }}
                placeholder="6 số OTP"
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Mã OTP được CHT cập nhật theo ca làm việc trên bảng tin công trường.
              </span>
            </div>

            {/* Today punch summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Check-in sáng: </span>
                <strong className="font-mono text-emerald-700">{todayPunch.checkIn || 'Chưa'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Check-out: </span>
                <strong className="font-mono text-slate-800">{todayPunch.checkOut || 'Chưa chốt'}</strong>
              </div>
            </div>
          </div>

          {/* Right: Camera AI Liveness & Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div
              style={{
                height: '140px',
                borderRadius: 'var(--radius-sm)',
                border: '2px dashed #93c5fd',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative',
              }}
            >
              {isFaceScanning ? (
                <>
                  <Sparkles size={28} color="#2563eb" className="animate-spin" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb' }}>
                    Đang quét AI Liveness &amp; Nhận diện khuôn mặt...
                  </span>
                </>
              ) : (
                <>
                  <ScanFace size={32} color="#047857" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>
                    Camera AI Sẵn Sàng Quét Khuôn Mặt Hiện Trường
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Bảo mật chống giả mạo ảnh chụp (Anti-spoofing certified)
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => handlePerformPunch('CHECK_IN')}
                disabled={isFaceScanning}
                className="btn btn-primary"
                style={{ backgroundColor: '#2563eb', justifyContent: 'center' }}
              >
                <span>Check-In Sáng (07:30)</span>
              </button>

              <button
                onClick={() => handlePerformPunch('CHECK_OUT')}
                disabled={isFaceScanning}
                className="btn btn-secondary"
                style={{ justifyContent: 'center', color: '#047857', borderColor: '#a7f3d0' }}
              >
                <span>Check-Out Chiều (17:00)</span>
              </button>

              <button
                onClick={() => handlePerformPunch('NIGHT_OT')}
                disabled={isFaceScanning}
                className="btn btn-primary"
                style={{ backgroundColor: '#d97706', justifyContent: 'center' }}
              >
                <span>Ca Đêm Bê Tông (22h)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Hub: Field Requests & 31-Day Timesheet */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Left: Quick Request Forms Portal */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="#2563eb" />
              <span>Cổng Nộp Đơn Nhanh Hiện Trường</span>
            </h3>
            <p className="card-subtitle">Gửi đơn trực tiếp tới Chỉ huy trưởng thẩm duyệt Cấp 1</p>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => setActiveModal('OT')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem', borderColor: '#fed7aa' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <div style={{ padding: '0.4rem', backgroundColor: '#fff7ed', borderRadius: '4px', color: '#ea580c' }}>
                  <Clock size={18} />
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                    1. Đăng Ký Làm Thêm Giờ Ban Đêm (OT - UC-13)
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Đổ bê tông dầm, kéo cáp dự ứng lực ca 22h - 06h (Hệ số 1.8x)
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </button>

            <button
              onClick={() => setActiveModal('EXPLANATION')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem', borderColor: '#bfdbfe' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <div style={{ padding: '0.4rem', backgroundColor: '#eff6ff', borderRadius: '4px', color: '#2563eb' }}>
                  <MapPin size={18} />
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                    2. Lập Đơn Giải Trình Bù Công (UC-11)
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Khắc phục sự cố lệch GPS hố móng sâu, hết pin, quên check-out
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </button>

            <button
              onClick={() => setActiveModal('LEAVE')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <div style={{ padding: '0.4rem', backgroundColor: '#f5f3ff', borderRadius: '4px', color: '#7c3aed' }}>
                  <Calendar size={18} />
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                    3. Lập Đơn Xin Nghỉ Phép / Nghỉ Bù (UC-10)
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Nghỉ phép năm hưởng 100% lương hoặc nghỉ bù sau ca trực đêm
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </button>
          </div>
        </div>

        {/* Right: Personal Dynamic Attendance Calendar Strip (UC-14) */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} color="#047857" />
                <span>Bảng Công {daysInMonth} Ngày Cá Nhân (Tháng {selectedMonth}/{selectedYear} - UC-14)</span>
              </h3>
              <p className="card-subtitle">Bấm vào ngày có sự cố để lập đơn giải trình hoặc đăng ký OT</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <select
                  className="form-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', minWidth: '85px' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m.toString()}>Tháng {m}</option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', minWidth: '70px' }}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <span className="badge badge-success">{validWorkDaysCount}.0 Công Hợp Lệ</span>
            </div>
          </div>

          <div style={{ padding: '0.85rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                textAlign: 'center',
                fontSize: '0.6875rem',
              }}
            >
              {personalDays.map((d) => (
                <div
                  key={d.day}
                  onClick={() => {
                    const dateStr = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
                    if (d.symbol === '-' || d.symbol === 'KL') {
                      setExplanationForm(prev => ({ ...prev, date: dateStr }));
                      setActiveModal('EXPLANATION');
                    } else if (d.symbol === 'O') {
                      showToast(`Ngày ${d.day}/${selectedMonth.padStart(2, '0')} (${d.dow}): Làm thêm ca tối ${d.ot} giờ (Đã được CHT ghi nhận).`);
                    } else {
                      showToast(`Ngày ${d.day}/${selectedMonth.padStart(2, '0')} (${d.dow}): Đi làm đủ ca chuẩn 8.0 giờ công (Check-in 07:54, Check-out 17:05).`);
                    }
                  }}
                  title={`Ngày ${d.day}/${selectedMonth.padStart(2, '0')}/${selectedYear} (${d.dow}): ${d.status}`}
                  style={{
                    padding: '0.4rem 0.2rem',
                    borderRadius: '4px',
                    backgroundColor:
                      d.symbol === 'X'
                        ? '#dcfce7'
                        : d.symbol === 'O'
                        ? '#fef3c7'
                        : d.symbol === 'P'
                        ? '#e0e7ff'
                        : '#f1f5f9',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, color: d.weekend ? '#ef4444' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}>
                    <span>{d.day < 10 ? `0${d.day}` : d.day}</span>
                    <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>({d.dow})</span>
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      color:
                        d.symbol === 'X'
                          ? '#15803d'
                          : d.symbol === 'O'
                          ? '#b45309'
                          : d.symbol === 'P'
                          ? '#4338ca'
                          : '#94a3b8',
                    }}
                  >
                    {d.symbol}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span><strong className="text-emerald-700">X</strong>: Đi làm đủ ca (8h)</span>
              <span><strong className="text-amber-700">O</strong>: Làm thêm ca đêm (OT)</span>
              <span><strong className="text-blue-700">P</strong>: Nghỉ phép năm</span>
              <span><strong className="text-slate-500">-</strong>: Nghỉ cuối tuần</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Personal Requests 2-Level Approval Tracker */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} color="#2563eb" />
            <span>Theo Dõi Tiến Trình Duyệt Đơn Hiện Trường 2 Cấp (Live Approval Tracker)</span>
          </h3>
          <p className="card-subtitle">
            Quy trình: Kỹ sư nộp đơn &rarr; Chỉ huy trưởng duyệt Cấp 1 (L1) &rarr; Trưởng phòng HR duyệt Cấp 2 (L2) &rarr; Bù công / Tính lương
          </p>
        </div>

        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left">Mã Đơn</th>
                <th className="text-left">Loại Yêu Cầu</th>
                <th className="text-center">Ngày Áp Dụng</th>
                <th className="text-left">Nội Dung Chi Tiết</th>
                <th className="text-center">Cấp 1: CHT Hiện Trường</th>
                <th className="text-center">Cấp 2: Trưởng Phòng HR</th>
                <th className="text-center">Trạng Thái Cuối Cùng</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((req) => (
                <tr key={req.id}>
                  <td className="font-mono font-medium text-slate-700">YC-{req.id}</td>
                  <td className="font-semibold text-slate-900">{req.type}</td>
                  <td className="text-center font-mono text-xs">{req.date}</td>
                  <td className="text-xs text-slate-700">{req.details}</td>
                  <td className="text-center">
                    {req.l1Status === 'APPROVED' ? (
                      <span className="badge badge-success"><Check size={11} /> CHT Đã Duyệt</span>
                    ) : req.l1Status === 'REJECTED' ? (
                      <span className="badge badge-danger"><X size={11} /> CHT Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Đang Chờ CHT</span>
                    )}
                  </td>
                  <td className="text-center">
                    {req.l2Status === 'APPROVED' ? (
                      <span className="badge badge-success"><Check size={11} /> HR Đã Duyệt</span>
                    ) : req.l2Status === 'WAITING_L1' ? (
                      <span className="badge badge-slate">Chờ CHT duyệt L1</span>
                    ) : (
                      <span className="badge badge-warning">Đang Chờ HR</span>
                    )}
                  </td>
                  <td className="text-center">
                    {req.l2Status === 'APPROVED' ? (
                      <span className="badge badge-success">Thành Công</span>
                    ) : (
                      <span className="badge badge-info">{req.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Overtime Request (UC-13) */}
      {activeModal === 'OT' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Đăng Ký Làm Thêm Giờ Ban Đêm (OT - UC-13)</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitOt}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ngày Làm Thêm Giờ:</label>
                  <input type="date" className="form-input" value={otForm.date} onChange={(e) => setOtForm({ ...otForm, date: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Giờ Bắt Đầu:</label>
                    <input type="time" className="form-input" value={otForm.startTime} onChange={(e) => setOtForm({ ...otForm, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ Kết Thúc:</label>
                    <input type="time" className="form-input" value={otForm.endTime} onChange={(e) => setOtForm({ ...otForm, endTime: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Số Giờ Đề Xuất (Ca đêm tính 180% lương):</label>
                  <input type="number" className="form-input" value={otForm.hours} onChange={(e) => setOtForm({ ...otForm, hours: Number(e.target.value) })} min={1} max={12} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nội Dung Thi Công Cấp Bách:</label>
                  <textarea className="form-textarea" rows={3} value={otForm.reason} onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">Đóng</button>
                <button type="submit" className="btn btn-primary">Gửi Đơn Cho CHT Duyệt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Attendance Explanation (UC-11) */}
      {activeModal === 'EXPLANATION' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Lập Đơn Giải Trình Bù Công (UC-11)</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitExplanation}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ngày Xảy Ra Sự Cố:</label>
                  <input type="date" className="form-input" value={explanationForm.date} onChange={(e) => setExplanationForm({ ...explanationForm, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Loại Sự Cố Hiện Trường:</label>
                  <select className="form-select" value={explanationForm.type} onChange={(e) => setExplanationForm({ ...explanationForm, type: e.target.value })}>
                    <option value="GPS_DEVIATION">Lệch Tọa Độ GPS Do Kết Cấu Dầm Thép Che Sóng</option>
                    <option value="DEVICE_ERROR">Điện Thoại Hết Pin / Hỏng Màn Hình Tại Công Trường</option>
                    <option value="MISSING_CHECKOUT">Quên Check-Out Do Ca Trực Khẩn Cấp Kéo Dài</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Giờ Vào Đề Xuất:</label>
                    <input type="time" className="form-input" value={explanationForm.suggestedIn} onChange={(e) => setExplanationForm({ ...explanationForm, suggestedIn: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ Ra Đề Xuất:</label>
                    <input type="time" className="form-input" value={explanationForm.suggestedOut} onChange={(e) => setExplanationForm({ ...explanationForm, suggestedOut: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lý Do Chi Tiết Cần Bù Công:</label>
                  <textarea className="form-textarea" rows={3} value={explanationForm.reason} onChange={(e) => setExplanationForm({ ...explanationForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">Đóng</button>
                <button type="submit" className="btn btn-primary">Gửi Đơn Giải Trình</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Leave Request (UC-10) */}
      {activeModal === 'LEAVE' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Lập Đơn Xin Nghỉ Phép Hiện Trường (UC-10)</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitLeave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Loại Nghỉ Phép:</label>
                  <select className="form-select" value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                    <option value="ANNUAL">Nghỉ Phép Năm (Hưởng 100% Lương - Đ113 BLLĐ)</option>
                    <option value="COMPENSATORY">Nghỉ Bù Sau Ca Đêm Đổ Bê Tông</option>
                    <option value="SICK">Nghỉ Ốm Hưởng Chế Độ BHXH</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Từ Ngày:</label>
                    <input type="date" className="form-input" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đến Ngày:</label>
                    <input type="date" className="form-input" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lý Do Nghỉ:</label>
                  <textarea className="form-textarea" rows={3} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">Đóng</button>
                <button type="submit" className="btn btn-primary">Gửi Đơn Xin Phép</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: E-Payslip (UC-24) */}
      {activeModal === 'PAYSLIP' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <DollarSign size={18} color="#047857" />
                  <span>Phiếu Lương Điện Tử Cá Nhân (E-Payslip - UC-24)</span>
                </h3>
                <span className="text-xs text-slate-500">Kỳ lương: Tháng 10/2026 &bull; Nhân viên: {engineerName} ({engineerCode})</span>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>1. Lương Hợp Đồng (Gross):</span>
                <span className="font-mono font-semibold">18.500.000 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>2. Phụ Cấp Lưu Động Công Trường (Miễn thuế TNCN):</span>
                <span className="font-mono font-semibold text-blue-700">2.500.000 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>3. Lương Làm Thêm Giờ Ca Đêm (10h OT • Hệ số 1.8x):</span>
                <span className="font-mono font-semibold text-amber-700">1.875.000 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>4. Tổng Thu Nhập Trước Thuế:</span>
                <span className="font-mono font-bold text-slate-900">22.875.000 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>5. Khấu Trừ BHXH, BHYT, BHTN (10.5%):</span>
                <span className="font-mono text-rose-600">- 1.942.500 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>6. Thuế TNCN Khấu Trừ:</span>
                <span className="font-mono text-rose-600">- 425.000 đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '4px', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#047857' }}>THỰC LĨNH CHUYỂN KHOẢN (NET):</span>
                <span className="font-mono font-bold text-emerald-800" style={{ fontSize: '1.125rem' }}>20.507.500 đ</span>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setActiveModal('COMPLAINT');
                }}
                className="btn btn-secondary"
                style={{ color: '#b91c1c', borderColor: '#fecaca', fontSize: '0.8125rem' }}
              >
                <HelpCircle size={14} />
                <span>Gửi Khiếu Nại / Thắc Mắc Lương</span>
              </button>
              <button onClick={() => setActiveModal(null)} className="btn btn-primary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Payroll Complaint Ticket (UC-24 / BF-09) */}
      {activeModal === 'COMPLAINT' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#b91c1c' }}>Khiếu Nại / Thắc Mắc Phiếu Lương (BF-09)</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitComplaint}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Gửi yêu cầu điều chỉnh sai sót ngày công, giờ làm thêm ca đêm hoặc các khoản phụ cấp công trường tới Chuyên viên Kế toán tiền lương.
                </div>
                <div className="form-group">
                  <label className="form-label">Nội Dung Thắc Mắc / Khiếu Nại:</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Ví dụ: Giờ OT ca đêm đổ bê tông ngày 21/10 của tôi là 6 giờ nhưng trên phiếu mới ghi nhận 4 giờ..."
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">Đóng</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#b91c1c' }}>
                  <Send size={14} />
                  <span>Gửi Ticket Khiếu Nại (BF-09)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SiteEngineerPortal;
