import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Check,
  X,
  Send,
  Lock,
  FileCheck,
  CalendarCheck,
  ListFilter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, mockProjects } from '../services/api';
import type { OvertimeRequest, LeaveRequest, AttendanceExplanationRequest, AttendanceExplanationType, OvertimeType } from '../types';

export const RequestsWorkflow: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  const isSiteManager = currentRole === 'SITE_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isHrStaff = currentRole === 'HR_STAFF' || currentRole === 'HR_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isHrManager = currentRole === 'HR_MANAGER' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isStaffOnly = currentRole === 'SITE_ENGINEER' || currentRole === 'OFFICE_STAFF';
  const isSiteEngineer = currentRole === 'SITE_ENGINEER';

  const [activeTab, setActiveTab] = useState<'OT' | 'LEAVE' | 'EXPLANATION'>('OT');
  const [filterMyOnly, setFilterMyOnly] = useState(isStaffOnly);
  const [otList, setOtList] = useState<OvertimeRequest[]>([]);
  const [leaveList, setLeaveList] = useState<LeaveRequest[]>([]);
  const [explanationList, setExplanationList] = useState<AttendanceExplanationRequest[]>([]);

  // Modals
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [otForm, setOtForm] = useState({
    projectId: 1,
    workDate: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '22:00',
    otHours: 4,
    otType: 'WEEKDAY_150' as OvertimeType,
    multiplier: 1.5,
    reason: '',
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'ANNUAL' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    daysCount: 1,
    reason: '',
  });

  const [explanationForm, setExplanationForm] = useState({
    projectId: 1,
    targetDate: new Date().toISOString().split('T')[0],
    explanationType: 'MISSING_CHECKIN' as AttendanceExplanationType,
    suggestedCheckIn: '07:00',
    suggestedCheckOut: '17:00',
    reason: '',
  });

  useEffect(() => {
    loadAllRequests();
  }, []);

  const loadAllRequests = async () => {
    try {
      const [ots, leaves, explanations] = await Promise.all([
        api.getOvertimeRequests(),
        api.getLeaveRequests(),
        api.getAttendanceExplanations(),
      ]);
      setOtList(ots);
      setLeaveList(leaves);
      setExplanationList(explanations);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handlers for OT
  const handleApproveOt = async (id: number, role: 'SITE_MANAGER' | 'HR_MANAGER', approved: boolean) => {
    const updated = await api.approveOvertimeRequest(id, role, approved);
    setOtList(prev => prev.map(r => r.id === id ? updated : r));
    showToast(approved ? `Đã duyệt đơn OT #${id} thành công!` : `Đã từ chối đơn OT #${id}.`);
  };

  const handleCreateOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otForm.reason) {
      alert('Vui lòng nhập lý do làm thêm giờ (phục vụ nghiệm thu & hạch toán công trình).');
      return;
    }

    const created = await api.createOvertimeRequest({
      employeeId: user?.id || 6,
      projectId: Number(otForm.projectId),
      workDate: otForm.workDate,
      startTime: otForm.startTime,
      endTime: otForm.endTime,
      otHours: Number(otForm.otHours),
      otType: otForm.otType,
      multiplier: Number(otForm.multiplier),
      reason: otForm.reason,
    });

    setOtList(prev => [created, ...prev]);
    setIsOtModalOpen(false);
    showToast(`Đã tạo đơn đăng ký OT ${otForm.otHours} giờ thành công!`);
    setOtForm({
      projectId: 1,
      workDate: new Date().toISOString().split('T')[0],
      startTime: '18:00',
      endTime: '22:00',
      otHours: 4,
      otType: 'WEEKDAY_150',
      multiplier: 1.5,
      reason: '',
    });
  };

  // Handlers for Leave
  const handleApproveLeave = async (id: number, approved: boolean) => {
    const updated = await api.approveLeaveRequest(id, approved);
    setLeaveList(prev => prev.map(r => r.id === id ? updated : r));
    showToast(approved ? `Đã phê duyệt đơn nghỉ phép #${id}!` : `Đã từ chối đơn nghỉ phép #${id}.`);
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason) {
      alert('Vui lòng nhập lý do nghỉ phép.');
      return;
    }

    const created = await api.createLeaveRequest({
      employeeId: user?.id || 4,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      daysCount: Number(leaveForm.daysCount),
      reason: leaveForm.reason,
    });

    setLeaveList(prev => [created, ...prev]);
    setIsLeaveModalOpen(false);
    showToast(`Đã gửi đơn xin nghỉ phép ${leaveForm.daysCount} ngày thành công!`);
  };

  // Handlers for Explanations (UC-11 / BF-05)
  const handleApproveExplanation = async (id: number, level: 'SM' | 'HR', approved: boolean = true) => {
    const updated = await api.approveAttendanceExplanation(id, level, approved);
    setExplanationList(prev => prev.map(a => a.id === id ? updated : a));
    if (!approved) {
      showToast(level === 'SM' ? `Chỉ huy trưởng đã từ chối giải trình #${id}!` : `Phòng HR đã từ chối giải trình bù công #${id}!`);
    } else {
      showToast(level === 'SM' ? `Chỉ huy trưởng đã duyệt giải trình #${id}!` : `Phòng HR đã phê duyệt bù công #${id} thành công!`);
    }
  };

  const handleCreateExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanationForm.reason) {
      alert('Vui lòng nhập lý do giải trình chấm công.');
      return;
    }

    const created = await api.createAttendanceExplanation({
      employeeId: user?.id || 5,
      projectId: Number(explanationForm.projectId),
      targetDate: explanationForm.targetDate,
      explanationType: explanationForm.explanationType,
      suggestedCheckIn: explanationForm.suggestedCheckIn,
      suggestedCheckOut: explanationForm.suggestedCheckOut,
      reason: explanationForm.reason,
    });

    setExplanationList(prev => [created, ...prev]);
    setIsExplanationModalOpen(false);
    showToast(`Đã gửi đơn giải trình chấm công ngày ${explanationForm.targetDate} thành công!`);
  };

  // Context Diagram Actions:
  // 1. HR Staff: Prepare Timesheet Command -> Draft Timesheet Data
  const handlePrepareTimesheet = () => {
    showToast('Chuyên viên Nhân sự đã thực thi Lệnh Chuẩn Bị Bảng Công Nháp (Prepare Timesheet Command)! Dữ liệu chấm công đã sẵn sàng.');
  };

  // 2. HR Manager: Company Timesheet Lock Approval
  const handleLockTimesheet = () => {
    showToast('Trưởng phòng HR Nguyễn Thu Giang đã phê duyệt Khóa Bảng Công Toàn Công Ty Tháng 10/2026! Đã chuyển tiếp sang Kế toán.');
  };

  // 3. Site Manager: Site Timesheet Confirmation & Schedule
  const handleSiteConfirmTimesheet = () => {
    showToast('Chỉ huy trưởng Nguyễn Lê Gia Phát đã xác nhận Bảng Công Hiện Trường & Lịch Ca Công Trình Cấp 1!');
  };

  // Filtered lists if user toggles "Đơn của tôi" or is site engineer
  const displayedOtList = (filterMyOnly || isSiteEngineer)
    ? otList.filter(o => o.employeeId === user?.id || o.employeeCode === user?.employeeCode)
    : currentRole === 'SITE_MANAGER'
    ? otList.filter(o => o.projectId === 1 || o.projectName.includes('Nhật Tân'))
    : otList;

  const displayedLeaveList = (filterMyOnly || isSiteEngineer)
    ? leaveList.filter(l => l.employeeId === user?.id || l.employeeCode === user?.employeeCode)
    : leaveList;

  const displayedExpList = (filterMyOnly || isSiteEngineer)
    ? explanationList.filter(e => e.employeeId === user?.id || e.employeeCode === user?.employeeCode)
    : currentRole === 'SITE_MANAGER'
    ? explanationList.filter(e => e.projectId === 1 || (e.projectName && e.projectName.includes('Nhật Tân')))
    : explanationList;

  // KPI Calculations
  const pendingOtCount = otList.filter(r => r.status.startsWith('PENDING')).length;
  const totalOtHoursApproved = otList.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.otHours, 0);
  const pendingExpCount = explanationList.filter(a => a.status.startsWith('PENDING')).length;
  const approvedExpCount = explanationList.filter(a => a.status === 'APPROVED').length;
  const pendingLeaveCount = leaveList.filter(l => l.status === 'PENDING').length;
  const totalPendingCount = pendingOtCount + pendingExpCount + pendingLeaveCount;

  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Quản Lý Đơn Từ, Nghỉ Phép &amp; Tăng Ca OT (FE-05, FE-06 / BF-04, BF-05, BF-06)
          </h1>
          <p className="page-description">
            Quy trình phê duyệt đa cấp (Chỉ huy trưởng L1 &rarr; Trưởng phòng HR L2) cho Nghỉ phép (UC-10), Giải trình chấm công (UC-11) &amp; Làm thêm giờ OT (UC-13)
          </p>
        </div>

        <div className="header-actions">
          {/* Site Manager Action: Site Timesheet Confirmation */}
          {isSiteManager && (
            <button onClick={handleSiteConfirmTimesheet} className="btn btn-secondary">
              <CalendarCheck size={15} />
              <span>Xác Nhận Bảng Công CT (L1)</span>
            </button>
          )}

          {/* HR Staff Action: Prepare Timesheet Command */}
          {isHrStaff && (
            <button onClick={handlePrepareTimesheet} className="btn btn-secondary" style={{ color: '#047857', borderColor: '#a7f3d0' }}>
              <FileCheck size={15} />
              <span>Chuẩn Bị Bảng Công Nháp</span>
            </button>
          )}

          {/* HR Manager Action: Company Timesheet Lock Approval */}
          {isHrManager && (
            <button onClick={handleLockTimesheet} className="btn btn-primary" style={{ backgroundColor: '#047857' }}>
              <Lock size={15} />
              <span>Khóa Bảng Công Công Ty</span>
            </button>
          )}

          {/* Create Request Buttons */}
          {activeTab === 'OT' && (
            <button onClick={() => setIsOtModalOpen(true)} className="btn btn-primary">
              <Plus size={15} />
              <span>Đăng Ký Làm Thêm Giờ (OT)</span>
            </button>
          )}
          {activeTab === 'LEAVE' && (
            <button onClick={() => setIsLeaveModalOpen(true)} className="btn btn-primary">
              <Plus size={15} />
              <span>Lập Đơn Xin Nghỉ Phép</span>
            </button>
          )}
          {activeTab === 'EXPLANATION' && (
            <button onClick={() => setIsExplanationModalOpen(true)} className="btn btn-primary">
              <Plus size={15} />
              <span>Lập Đơn Giải Trình Chấm Công</span>
            </button>
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

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Đơn Chờ Phê Duyệt</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#b45309' }}>{totalPendingCount}</div>
          <div className="kpi-subtext">Gồm {pendingOtCount} OT, {pendingLeaveCount} phép &amp; {pendingExpCount} giải trình</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Giờ OT Đã Duyệt (Tháng 10)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <Calendar size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>
            {totalOtHoursApproved} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>giờ</span>
          </div>
          <div className="kpi-subtext">Hệ số trung bình: <span className="tabular-nums font-medium text-slate-700">1.75x</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đơn Giải Trình Đã Duyệt Bù Công</span>
            <div className="kpi-icon-wrap" style={{ color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <ClipboardCheck size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{approvedExpCount} / {explanationList.length}</div>
          <div className="kpi-subtext">Đã đối soát &amp; bù công vào Bảng tổng hợp</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tỷ Lệ Duyệt Đúng Hạn (SLA)</span>
            <div className="kpi-icon-wrap">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">98.5%</div>
          <div className="kpi-subtext">Thời gian phản hồi TB: <span className="tabular-nums font-medium text-slate-700">3.2 giờ</span></div>
        </div>
      </div>

      {/* 3. Tab Switcher & My Requests Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <button
            onClick={() => setActiveTab('OT')}
            className={`btn ${activeTab === 'OT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
          >
            <Clock size={15} />
            <span>Làm Thêm Giờ (OT Công Trường)</span>
            <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>{displayedOtList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('LEAVE')}
            className={`btn ${activeTab === 'LEAVE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
          >
            <Calendar size={15} />
            <span>Đơn Nghỉ Phép &amp; Nghỉ Bù</span>
            <span className="badge badge-slate" style={{ marginLeft: '0.4rem' }}>{displayedLeaveList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPLANATION')}
            className={`btn ${activeTab === 'EXPLANATION' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
          >
            <ClipboardCheck size={15} />
            <span>Đơn Giải Trình Chấm Công (UC-11)</span>
            <span className="badge badge-warning" style={{ marginLeft: '0.4rem' }}>{displayedExpList.length}</span>
          </button>
        </div>

        {isSiteEngineer ? (
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.85rem' }}>
            <Lock size={13} />
            <span>Đơn từ của tôi: {user?.fullName || 'Kỹ Sư'}</span>
          </span>
        ) : (
          <button
            onClick={() => setFilterMyOnly(!filterMyOnly)}
            className={`btn ${filterMyOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', gap: '0.4rem', height: '100%' }}
            title="Lọc chỉ hiển thị các đơn do tôi tạo"
          >
            <ListFilter size={14} />
            <span>{filterMyOnly ? 'Đang Lọc: Đơn Của Tôi' : 'Xem Tất Cả'}</span>
          </button>
        )}
      </div>

      {/* 4. Tab Content: Overtime Requests */}
      {activeTab === 'OT' && (
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '85px' }}>Mã Đơn</th>
                <th className="text-left">Kỹ Sư Đăng Ký</th>
                <th className="text-left">Công Trình Xây Lắp</th>
                <th className="text-center">Ngày &amp; Khung Giờ</th>
                <th className="text-center" style={{ width: '85px' }}>Số Giờ</th>
                <th className="text-center">Hệ Số Quy Đổi</th>
                <th className="text-left">Nội Dung Thi Công Cấp Bách</th>
                <th className="text-center">Cấp 1: CHT</th>
                <th className="text-center">Cấp 2: HR</th>
                <th className="text-center">Trạng Thái</th>
                <th className="text-right" style={{ width: '130px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {displayedOtList.map((ot) => (
                <tr key={ot.id}>
                  <td className="text-left font-mono font-medium text-slate-700">OT-{ot.id}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{ot.employeeName}</div>
                    <div className="text-xs font-mono text-slate-500">{ot.employeeCode}</div>
                  </td>
                  <td className="text-left text-slate-700">{ot.projectName}</td>
                  <td className="text-center">
                    <div className="font-mono tabular-nums text-xs font-medium text-slate-800">{ot.workDate}</div>
                    <div className="font-mono tabular-nums text-xs text-slate-500">{ot.startTime} - {ot.endTime}</div>
                  </td>
                  <td className="text-center font-bold tabular-nums text-slate-900">
                    {ot.otHours} h
                  </td>
                  <td className="text-center">
                    {ot.otType === 'WEEKDAY_150' && <span className="badge badge-info">150% Ngày Thường</span>}
                    {ot.otType === 'WEEKEND_200' && <span className="badge badge-warning">200% Cuối Tuần</span>}
                    {ot.otType === 'NIGHT_SHIFT_ADDITIONAL' && <span className="badge badge-primary">180% Đêm (22h-06h)</span>}
                    {ot.otType === 'HOLIDAY_300' && <span className="badge badge-danger">300% Ngày Lễ</span>}
                  </td>
                  <td className="text-left text-xs text-slate-700" style={{ maxWidth: '240px' }}>
                    {ot.reason}
                  </td>
                  <td className="text-center">
                    {ot.siteManagerApproval === 'APPROVED' ? (
                      <span className="badge badge-success"><Check size={11} /> Đã Duyệt</span>
                    ) : ot.siteManagerApproval === 'REJECTED' ? (
                      <span className="badge badge-danger"><X size={11} /> Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Chờ Duyệt</span>
                    )}
                  </td>
                  <td className="text-center">
                    {ot.hrApproval === 'APPROVED' ? (
                      <span className="badge badge-success"><Check size={11} /> Đã Duyệt</span>
                    ) : ot.hrApproval === 'REJECTED' ? (
                      <span className="badge badge-danger"><X size={11} /> Từ Chối</span>
                    ) : (
                      <span className="badge badge-slate">Chờ CHT duyệt</span>
                    )}
                  </td>
                  <td className="text-center">
                    {ot.status === 'APPROVED' ? (
                      <span className="badge badge-success">Hợp Lệ</span>
                    ) : ot.status === 'REJECTED' ? (
                      <span className="badge badge-danger">Bị Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Đang Xét Duyệt</span>
                    )}
                  </td>
                  <td className="text-right">
                    {ot.status !== 'APPROVED' && ot.status !== 'REJECTED' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {/* CHT duyệt Cấp 1 */}
                        {ot.siteManagerApproval === 'PENDING' && isSiteManager && (
                          <button
                            onClick={() => handleApproveOt(ot.id, 'SITE_MANAGER', true)}
                            className="btn btn-sm btn-primary"
                            title="Chỉ huy trưởng phê duyệt L1"
                            style={{ padding: '0.2rem 0.45rem' }}
                          >
                            <Check size={12} /> CHT Duyệt
                          </button>
                        )}

                        {/* HR duyệt Cấp 2 */}
                        {ot.siteManagerApproval === 'APPROVED' && ot.hrApproval === 'PENDING' && isHrStaff && (
                          <button
                            onClick={() => handleApproveOt(ot.id, 'HR_MANAGER', true)}
                            className="btn btn-sm btn-primary"
                            title="HR phê duyệt L2"
                            style={{ padding: '0.2rem 0.45rem', backgroundColor: '#059669' }}
                          >
                            <Check size={12} /> HR Duyệt
                          </button>
                        )}

                        {/* Nút từ chối */}
                        {((ot.siteManagerApproval === 'PENDING' && isSiteManager) || (ot.siteManagerApproval === 'APPROVED' && isHrStaff)) && (
                          <button
                            onClick={() => handleApproveOt(ot.id, ot.siteManagerApproval === 'PENDING' ? 'SITE_MANAGER' : 'HR_MANAGER', false)}
                            className="btn btn-sm btn-secondary"
                            title="Từ chối đơn"
                            style={{ padding: '0.2rem 0.45rem', color: '#b91c1c' }}
                          >
                            <X size={12} />
                          </button>
                        )}

                        {/* Nhân viên hoặc vai trò khác: Chỉ xem */}
                        {isStaffOnly && (
                          <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>Chỉ xem</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Tab Content: Leave Requests */}
      {activeTab === 'LEAVE' && (
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '85px' }}>Mã Đơn</th>
                <th className="text-left">Cán Bộ / Nhân Sự</th>
                <th className="text-center">Loại Nghỉ Phép</th>
                <th className="text-center">Thời Gian Nghỉ</th>
                <th className="text-center" style={{ width: '90px' }}>Số Ngày</th>
                <th className="text-left">Lý Do Đề Nghị</th>
                <th className="text-center">Trạng Thái</th>
                <th className="text-right" style={{ width: '130px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {displayedLeaveList.map((lv) => (
                <tr key={lv.id}>
                  <td className="text-left font-mono font-medium text-slate-700">NP-{lv.id}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{lv.employeeName}</div>
                    <div className="text-xs font-mono text-slate-500">{lv.employeeCode}</div>
                  </td>
                  <td className="text-center">
                    {lv.leaveType === 'ANNUAL' && <span className="badge badge-info">Phép Năm Thường Niên</span>}
                    {lv.leaveType === 'COMPENSATORY' && <span className="badge badge-warning">Nghỉ Bù Công Trường</span>}
                    {lv.leaveType === 'SICK' && <span className="badge badge-danger">Nghỉ Ốm Hưởng BHXH</span>}
                    {lv.leaveType === 'SPECIAL_PAID' && <span className="badge badge-primary">Việc Riêng Hưởng Lương</span>}
                  </td>
                  <td className="text-center font-mono tabular-nums text-xs text-slate-800">
                    {lv.startDate} &rarr; {lv.endDate}
                  </td>
                  <td className="text-center font-bold tabular-nums text-slate-900">
                    {lv.daysCount} ngày
                  </td>
                  <td className="text-left text-xs text-slate-700">
                    {lv.reason}
                  </td>
                  <td className="text-center">
                    {lv.status === 'APPROVED' ? (
                      <span className="badge badge-success"><CheckCircle2 size={11} /> Đã Duyệt</span>
                    ) : lv.status === 'REJECTED' ? (
                      <span className="badge badge-danger"><XCircle size={11} /> Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Chờ HR Phê Duyệt</span>
                    )}
                  </td>
                  <td className="text-right">
                    {lv.status === 'PENDING' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {(isHrStaff || isSiteManager) ? (
                          <>
                            <button
                              onClick={() => handleApproveLeave(lv.id, true)}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.2rem 0.45rem' }}
                            >
                              <Check size={12} /> Duyệt
                            </button>
                            <button
                              onClick={() => handleApproveLeave(lv.id, false)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '0.2rem 0.45rem', color: '#b91c1c' }}
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>Chỉ xem</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Tab Content: Attendance Explanation Requests (UC-11 / BF-05) */}
      {activeTab === 'EXPLANATION' && (
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '85px' }}>Mã Đơn</th>
                <th className="text-left">Kỹ Sư / Nhân Viên</th>
                <th className="text-left">Công Trình Xây Lắp</th>
                <th className="text-center">Ngày Cần Bù Công</th>
                <th className="text-center">Loại Sự Cố / Giải Trình</th>
                <th className="text-center">Giờ Đề Xuất</th>
                <th className="text-left">Lý Do Chi Tiết</th>
                <th className="text-center">Cấp 1: CHT</th>
                <th className="text-center">Cấp 2: HR</th>
                <th className="text-center">Trạng Thái</th>
                <th className="text-right" style={{ width: '150px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {displayedExpList.map((exp) => (
                <tr key={exp.id}>
                  <td className="text-left font-mono font-medium text-slate-700">GT-{exp.id}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{exp.employeeName}</div>
                    <div className="text-xs font-mono text-slate-500">{exp.employeeCode}</div>
                  </td>
                  <td className="text-left text-slate-700">{exp.projectName}</td>
                  <td className="text-center font-mono tabular-nums text-xs text-slate-700">
                    {exp.targetDate}
                  </td>
                  <td className="text-center">
                    {exp.explanationType === 'GPS_DEVIATION' ? (
                      <span className="badge badge-warning">Lệch Tọa Độ GPS</span>
                    ) : exp.explanationType === 'MISSING_CHECKOUT' ? (
                      <span className="badge badge-info">Quên Check-out</span>
                    ) : exp.explanationType === 'DEVICE_ERROR' ? (
                      <span className="badge badge-danger">Lỗi Thiết Bị</span>
                    ) : (
                      <span className="badge badge-slate">Quên Check-in</span>
                    )}
                  </td>
                  <td className="text-center font-mono tabular-nums text-xs text-slate-700">
                    {exp.suggestedCheckIn} - {exp.suggestedCheckOut}
                  </td>
                  <td className="text-left text-xs text-slate-700" style={{ maxWidth: '240px' }}>
                    {exp.reason}
                  </td>
                  <td className="text-center">
                    {exp.siteManagerApproval === 'APPROVED' ? (
                      <span className="badge badge-success">CHT Duyệt</span>
                    ) : exp.siteManagerApproval === 'REJECTED' ? (
                      <span className="badge badge-danger">CHT Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Chờ CHT</span>
                    )}
                  </td>
                  <td className="text-center">
                    {exp.hrApproval === 'APPROVED' ? (
                      <span className="badge badge-success">HR Duyệt</span>
                    ) : exp.hrApproval === 'REJECTED' ? (
                      <span className="badge badge-danger">HR Từ Chối</span>
                    ) : (
                      <span className="badge badge-warning">Chờ HR</span>
                    )}
                  </td>
                  <td className="text-center">
                    {exp.status === 'APPROVED' ? (
                      <span className="badge badge-success">Đã Bù Công</span>
                    ) : exp.status === 'REJECTED' ? (
                      <span className="badge badge-danger">Bác Bỏ</span>
                    ) : exp.status === 'PENDING_HR' ? (
                      <span className="badge badge-info">Chờ HR Duyệt</span>
                    ) : (
                      <span className="badge badge-warning">Chờ CHT Duyệt</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      {exp.siteManagerApproval === 'PENDING' && isSiteManager && (
                        <>
                          <button
                            onClick={() => handleApproveExplanation(exp.id, 'SM', true)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                            title="Chỉ huy trưởng duyệt L1"
                          >
                            <Check size={11} /> CHT Duyệt
                          </button>
                          <button
                            onClick={() => handleApproveExplanation(exp.id, 'SM', false)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem', color: '#b91c1c' }}
                            title="Chỉ huy trưởng từ chối giải trình"
                          >
                            <X size={11} />
                          </button>
                        </>
                      )}
                      {exp.siteManagerApproval === 'APPROVED' && exp.hrApproval === 'PENDING' && isHrStaff && (
                        <>
                          <button
                            onClick={() => handleApproveExplanation(exp.id, 'HR', true)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                            title="Trưởng phòng HR duyệt L2 & bù công"
                          >
                            <Check size={11} /> HR Bù Công
                          </button>
                          <button
                            onClick={() => handleApproveExplanation(exp.id, 'HR', false)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem', color: '#b91c1c' }}
                            title="Phòng HR từ chối bù công"
                          >
                            <X size={11} />
                          </button>
                        </>
                      )}
                      {isStaffOnly && (
                        <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>Chỉ xem</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Create OT Request */}
      {isOtModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsOtModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Đăng Ký Làm Thêm Giờ Hiện Trường (OT - FE-04)
                </h3>
                <span className="text-xs text-slate-500">Áp dụng hệ số tính lương theo Bộ luật Lao động 2026</span>
              </div>
              <Clock size={18} color="var(--color-primary)" />
            </div>

            <form onSubmit={handleCreateOt}>
              <div className="modal-body">
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Công Trình Đang Thi Công:
                  </label>
                  <select
                    className="form-select"
                    value={otForm.projectId}
                    onChange={(e) => setOtForm({ ...otForm, projectId: Number(e.target.value) })}
                  >
                    {mockProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Ngày Tăng Ca:
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={otForm.workDate}
                      onChange={(e) => setOtForm({ ...otForm, workDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Loại Ca &amp; Hệ Số:
                    </label>
                    <select
                      className="form-select"
                      value={otForm.otType}
                      onChange={(e) => {
                        const val = e.target.value as OvertimeType;
                        const mult = val === 'WEEKDAY_150' ? 1.5 : val === 'WEEKEND_200' ? 2.0 : val === 'HOLIDAY_300' ? 3.0 : 1.8;
                        setOtForm({ ...otForm, otType: val, multiplier: mult });
                      }}
                    >
                      <option value="WEEKDAY_150">Ngày Thường (Hệ số 150%)</option>
                      <option value="WEEKEND_200">Cuối Tuần Thứ 7 / CN (Hệ số 200%)</option>
                      <option value="NIGHT_SHIFT_ADDITIONAL">Ca Đêm 22h - 06h (Hệ số 180%)</option>
                      <option value="HOLIDAY_300">Ngày Lễ / Tết (Hệ số 300%)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="text-xs text-slate-500">Giờ bắt đầu:</span>
                    <input
                      type="time"
                      className="form-input"
                      value={otForm.startTime}
                      onChange={(e) => setOtForm({ ...otForm, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Giờ kết thúc:</span>
                    <input
                      type="time"
                      className="form-input"
                      value={otForm.endTime}
                      onChange={(e) => setOtForm({ ...otForm, endTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Tổng số giờ OT:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      className="form-input"
                      value={otForm.otHours}
                      onChange={(e) => setOtForm({ ...otForm, otHours: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Nội Dung Công Việc / Lý Do Cấp Bách (*):
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    required
                    placeholder="VD: Đổ bê tông dầm sàn tầng 14, kéo cáp nhịp K12..."
                    value={otForm.reason}
                    onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsOtModalOpen(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>Gửi Phê Duyệt Cấp 1 (Chỉ Huy Trưởng)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Leave Request */}
      {isLeaveModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Lập Đơn Xin Nghỉ Phép / Nghỉ Bù (BF-03)
                </h3>
                <span className="text-xs text-slate-500">Chế độ nghỉ phép chuẩn quy chế nội bộ Hải Minh</span>
              </div>
              <Calendar size={18} color="var(--color-primary)" />
            </div>

            <form onSubmit={handleCreateLeave}>
              <div className="modal-body">
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Chế Độ Nghỉ:
                  </label>
                  <select
                    className="form-select"
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  >
                    <option value="ANNUAL">Nghỉ Phép Năm (Hưởng nguyên lương)</option>
                    <option value="COMPENSATORY">Nghỉ Bù (Sau ca trực đêm công trường)</option>
                    <option value="SICK">Nghỉ Ốm Đau (Hưởng chế độ BHXH)</option>
                    <option value="SPECIAL_PAID">Việc Riêng Hưởng Lương (Kết hôn, hiếu hỉ)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="text-xs text-slate-500">Từ ngày:</span>
                    <input
                      type="date"
                      className="form-input"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Đến hết ngày:</span>
                    <input
                      type="date"
                      className="form-input"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="text-xs text-slate-500">Tổng số ngày nghỉ tính công:</span>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="form-input"
                    value={leaveForm.daysCount}
                    onChange={(e) => setLeaveForm({ ...leaveForm, daysCount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Lý Do Nghỉ (*):
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    required
                    placeholder="Nhập lý do chi tiết..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>Gửi Trưởng Phòng HR Phê Duyệt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Attendance Explanation Request (UC-11 / BF-05) */}
      {isExplanationModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsExplanationModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Lập Đơn Giải Trình Chấm Công &amp; Bù Công (UC-11 / BF-05)
                </h3>
                <span className="text-xs text-slate-500">Giải trình quên check-in/out, sai lệch GPS hoặc lỗi thiết bị hiện trường</span>
              </div>
              <ClipboardCheck size={18} color="var(--color-primary)" />
            </div>

            <form onSubmit={handleCreateExplanation}>
              <div className="modal-body">
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Công Trình Phân Công:
                  </label>
                  <select
                    className="form-select"
                    value={explanationForm.projectId}
                    onChange={(e) => setExplanationForm({ ...explanationForm, projectId: Number(e.target.value) })}
                  >
                    {mockProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Ngày Cần Điều Chỉnh (*):
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={explanationForm.targetDate}
                      onChange={(e) => setExplanationForm({ ...explanationForm, targetDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Loại Sự Cố (*):
                    </label>
                    <select
                      className="form-select"
                      value={explanationForm.explanationType}
                      onChange={(e) => setExplanationForm({ ...explanationForm, explanationType: e.target.value as any })}
                    >
                      <option value="MISSING_CHECKIN">Quên Check-in đầu ca</option>
                      <option value="MISSING_CHECKOUT">Quên Check-out cuối ca</option>
                      <option value="GPS_DEVIATION">Lệch GPS do địa hình/kết cấu</option>
                      <option value="DEVICE_ERROR">Lỗi ứng dụng / Camera</option>
                      <option value="OUTSIDE_ASSIGNMENT">Công tác đột xuất ngoài công trình</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Giờ Vào Đề Xuất:
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={explanationForm.suggestedCheckIn}
                      onChange={(e) => setExplanationForm({ ...explanationForm, suggestedCheckIn: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Giờ Ra Đề Xuất:
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={explanationForm.suggestedCheckOut}
                      onChange={(e) => setExplanationForm({ ...explanationForm, suggestedCheckOut: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Lý Do Giải Trình Chi Tiết (*):
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    required
                    placeholder="Mô tả cụ thể nguyên nhân quên chấm công, vị trí làm việc thực tế tại công trường..."
                    value={explanationForm.reason}
                    onChange={(e) => setExplanationForm({ ...explanationForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsExplanationModalOpen(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>Gửi Chỉ Huy Trưởng Thẩm Định (L1)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
