import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Copy,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  HardHat,
  Building2,
} from 'lucide-react';
import { useAuth, normalizeRole } from '../context/AuthContext';
import { api } from '../services/api';
import type { Employee, Project, ShiftItem, ShiftTypeCode, WorkScheduleItem } from '../types';

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7 (Sáng)', 'Chủ Nhật'];

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const getMondayOfWeek = (refDate: Date): Date => {
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const addDays = (base: Date, offset: number): Date => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + offset);
  return d;
};

const getShiftTypeBadge = (shiftType: ShiftTypeCode) => {
  switch (shiftType) {
    case 'NIGHT_SHIFT':
      return { label: 'Ca Đêm', bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' };
    case 'OVERTIME_SHIFT':
      return { label: 'Ca Tăng Ca', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
    default:
      return { label: 'Ca Ngày', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' };
  }
};

export const ShiftScheduling: React.FC = () => {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || 'OFFICE_STAFF');
  const canManageShifts = role === 'HR_STAFF' || role === 'HR_MANAGER';
  const canAssignSchedule = role === 'HR_STAFF' || role === 'HR_MANAGER' || role === 'SITE_MANAGER';

  const [activeTab, setActiveTab] = useState<'ROSTER' | 'CATALOG'>('ROSTER');
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [selectedMobileDayIdx, setSelectedMobileDayIdx] = useState<number>(() => {
    const dow = new Date().getDay();
    return dow === 0 ? 6 : dow - 1;
  });

  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState<'ALL' | 'OFFICE_STAFF' | 'SITE_ENGINEER'>('ALL');
  const [projectFilter, setProjectFilter] = useState<number>(0);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cell Quick-Assign Modal
  const [cellModal, setCellModal] = useState<{
    employee: Employee;
    workDate: string;
    existing?: WorkScheduleItem;
  } | null>(null);
  const [cellShiftId, setCellShiftId] = useState<number>(0);
  const [cellProjectId, setCellProjectId] = useState<number>(0);

  // Batch Assign Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchEmpIds, setBatchEmpIds] = useState<number[]>([]);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [batchShiftId, setBatchShiftId] = useState<number>(0);
  const [batchProjectId, setBatchProjectId] = useState<number>(0);

  // Shift Catalog Add/Edit Modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    shiftType: 'DAY_SHIFT' as ShiftTypeCode,
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 60,
    multiplier: 1.0,
  });

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => formatIsoDate(addDays(weekStart, i)));
  }, [weekStart]);

  const startIso = weekDates[0];
  const endIso = weekDates[6];

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [shiftList, empList, projList, schedList] = await Promise.all([
        api.getShifts(),
        api.getEmployees(),
        api.getProjects(),
        api.getWorkSchedules({
          startDate: startIso,
          endDate: endIso,
          projectId: projectFilter > 0 ? projectFilter : undefined,
        }),
      ]);
      setShifts(shiftList);
      setEmployees(empList.filter((e) => !['DIRECTOR', 'CEO'].includes(normalizeRole(e.role || ''))));
      setProjects(projList);
      setSchedules(schedList);
      if (shiftList.length > 0 && batchShiftId === 0) {
        setBatchShiftId(shiftList[0].id);
      }
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Không thể tải dữ liệu phân ca làm việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [startIso, endIso, projectFilter]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, WorkScheduleItem>();
    for (const s of schedules) {
      map.set(`${s.employeeId}_${s.workDate}`, s);
    }
    return map;
  }, [schedules]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (role === 'SITE_MANAGER' && e.employeeType !== 'SITE_ENGINEER') return false;
      if (empTypeFilter !== 'ALL' && e.employeeType !== empTypeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const hit =
          (e.fullName || '').toLowerCase().includes(q) ||
          (e.employeeCode || '').toLowerCase().includes(q) ||
          (e.position || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [employees, empTypeFilter, searchTerm, role]);

  const scheduledEmpCount = useMemo(() => {
    const set = new Set<number>();
    for (const s of schedules) {
      if (filteredEmployees.some((e) => e.id === s.employeeId)) {
        set.add(s.employeeId);
      }
    }
    return set.size;
  }, [schedules, filteredEmployees]);

  // Open cell editor
  const openCellAssign = (emp: Employee, workDate: string) => {
    if (!canAssignSchedule) return;
    const existing = scheduleMap.get(`${emp.id}_${workDate}`);
    setCellModal({ employee: emp, workDate, existing });
    setCellShiftId(existing?.shiftId || shifts[0]?.id || 0);
    setCellProjectId(existing?.projectId || (emp.employeeType === 'SITE_ENGINEER' ? projects[0]?.id || 0 : 0));
  };

  const handleSaveCellAssign = async () => {
    if (!cellModal || !cellShiftId) return;
    try {
      await api.assignWorkSchedules({
        employeeIds: [cellModal.employee.id],
        workDates: [cellModal.workDate],
        shiftId: cellShiftId,
        projectId: cellProjectId > 0 ? cellProjectId : null,
      });
      setCellModal(null);
      await fetchAll();
      showFeedback('success', `Đã phân ca cho ${cellModal.employee.fullName} ngày ${formatDisplayDate(cellModal.workDate)}.`);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Lỗi phân ca làm việc.');
    }
  };

  const handleClearCellSchedule = async () => {
    if (!cellModal?.existing) return;
    try {
      await api.deleteWorkSchedule(cellModal.existing.id);
      setCellModal(null);
      await fetchAll();
      showFeedback('success', `Đã xóa lịch ca của ${cellModal.employee.fullName} ngày ${formatDisplayDate(cellModal.workDate)}.`);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Không thể gỡ ca làm việc.');
    }
  };

  // Batch Assign
  const openBatchModal = () => {
    setBatchEmpIds(filteredEmployees.slice(0, 5).map((e) => e.id));
    setBatchDates(weekDates.slice(0, 6)); // Mon - Sat morning (22.5 std days/month cadence)
    setBatchShiftId(shifts[0]?.id || 0);
    setBatchProjectId(projectFilter);
    setShowBatchModal(true);
  };

  const handleBatchAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchEmpIds.length === 0 || batchDates.length === 0 || !batchShiftId) {
      showFeedback('error', 'Vui lòng chọn ít nhất 01 nhân sự, 01 ngày làm việc và khung ca áp dụng.');
      return;
    }
    try {
      const res = await api.assignWorkSchedules({
        employeeIds: batchEmpIds,
        workDates: batchDates,
        shiftId: batchShiftId,
        projectId: batchProjectId > 0 ? batchProjectId : null,
      });
      setShowBatchModal(false);
      await fetchAll();
      showFeedback('success', `Phân ca hàng loạt thành công: Đã cập nhật ${res.assignedCount} lượt phân ca trong tuần!`);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Phân ca hàng loạt thất bại.');
    }
  };

  // Copy Template to Next Week
  const handleCopyToNextWeek = async () => {
    const nextMon = formatIsoDate(addDays(weekStart, 7));
    try {
      const res = await api.copyWorkScheduleTemplate({
        sourceStartDate: startIso,
        sourceEndDate: endIso,
        targetStartDate: nextMon,
        projectId: projectFilter > 0 ? projectFilter : undefined,
        overwriteExisting: true,
      });
      if (res.copiedCount === 0) {
        showFeedback('error', 'Tuần hiện tại chưa có lịch phân ca để sao chép sang tuần sau.');
        return;
      }
      setWeekStart(addDays(weekStart, 7));
      showFeedback(
        'success',
        `Đã sao chép mẫu lịch phân ca thành công (${res.copiedCount} lượt ca) sang tuần bắt đầu từ ${formatDisplayDate(nextMon)}!`
      );
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Sao chép lịch phân ca mẫu thất bại.');
    }
  };

  // Shift Catalog CRUD
  const openAddShift = () => {
    setEditingShift(null);
    setShiftForm({
      code: '',
      name: '',
      shiftType: 'DAY_SHIFT',
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 60,
      multiplier: 1.0,
    });
    setShowShiftModal(true);
  };

  const openEditShift = (sh: ShiftItem) => {
    setEditingShift(sh);
    setShiftForm({
      code: sh.code,
      name: sh.name,
      shiftType: sh.shiftType,
      startTime: sh.startTime,
      endTime: sh.endTime,
      breakMinutes: sh.breakMinutes,
      multiplier: sh.multiplier,
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.code.trim() || !shiftForm.name.trim()) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Mã khung ca và Tên khung ca.');
      return;
    }
    try {
      if (editingShift) {
        await api.updateShift(editingShift.id, {
          ...shiftForm,
          code: shiftForm.code.trim().toUpperCase(),
          name: shiftForm.name.trim(),
        });
        showFeedback('success', `Đã cập nhật khung ca [${shiftForm.code.trim().toUpperCase()}].`);
      } else {
        await api.createShift({
          ...shiftForm,
          code: shiftForm.code.trim().toUpperCase(),
          name: shiftForm.name.trim(),
        });
        showFeedback('success', `Đã thêm mới khung ca [${shiftForm.code.trim().toUpperCase()}].`);
      }
      setShowShiftModal(false);
      await fetchAll();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Không thể lưu khung ca.');
    }
  };

  const handleDeleteShift = async (sh: ShiftItem) => {
    if (!window.confirm(`Xác nhận xóa khung ca "${sh.name}" (${sh.code})?`)) return;
    try {
      await api.deleteShift(sh.id);
      await fetchAll();
      showFeedback('success', `Đã xóa khung ca [${sh.code}].`);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Không thể xóa khung ca này.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary">UC-12 • Phân Ca Làm Việc</span>
            <span className="badge badge-success">Công chuẩn thống nhất: 22,5 ngày/tháng</span>
          </div>
          <h1 className="page-title">Quản Lý Khung Ca &amp; Lập Lịch Phân Ca</h1>
          <p className="page-description">
            Thiết lập danh mục khung giờ ca làm việc chuẩn và phân ca theo tuần (Roster Matrix) cho cả khối Văn phòng và Kỹ sư Công trường.
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={14} /> Làm mới
          </button>
          {canAssignSchedule && activeTab === 'ROSTER' && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyToNextWeek}>
                <Copy size={14} /> Sao Chép Mẫu → Tuần Sau
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={openBatchModal}>
                <Plus size={14} /> Phân Ca Hàng Loạt
              </button>
            </>
          )}
          {canManageShifts && activeTab === 'CATALOG' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddShift}>
              <Plus size={14} /> Thêm Khung Ca Mới
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            borderColor: toast.type === 'success' ? '#a7f3d0' : '#fecdd3',
            backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          }}
        >
          <div
            className="card-body"
            style={{
              padding: '0.7rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: toast.type === 'success' ? '#047857' : '#b91c1c',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              <span>{toast.text}</span>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setToast(null)}>
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Danh Mục Khung Ca</div>
          <div className="kpi-value">{shifts.length} ca</div>
          <div className="kpi-meta">Ca ngày, ca đêm, công trường, OT</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Lượt Phân Ca Tuần Này</div>
          <div className="kpi-value text-blue-700">{schedules.length} lượt</div>
          <div className="kpi-meta">
            {formatDisplayDate(startIso)} → {formatDisplayDate(endIso)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Nhân Sự Đã Xếp Lịch</div>
          <div className="kpi-value text-emerald-700">
            {scheduledEmpCount} / {filteredEmployees.length}
          </div>
          <div className="kpi-meta">Đang hiển thị theo bộ lọc</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ngày Công Chuẩn Tháng</div>
          <div className="kpi-value">22,5 ngày</div>
          <div className="kpi-meta">Thứ 2 – Thứ 6 (1,0) &bull; Sáng T7 (0,5)</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.45rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`btn btn-sm ${activeTab === 'ROSTER' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
        >
          <CalendarDays size={14} /> Ma Trận Phân Ca Tuần (Roster Matrix)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CATALOG')}
          className={`btn btn-sm ${activeTab === 'CATALOG' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
        >
          <Clock size={14} /> Danh Mục Khung Ca ({shifts.length})
        </button>
      </div>

      {activeTab === 'ROSTER' ? (
        <div className="card">
          {/* Toolbar */}
          <div
            className="card-header"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                &larr; Tuần trước
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
              >
                Tuần này
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                Tuần sau &rarr;
              </button>
              <span className="badge badge-info" style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}>
                Tuần: {formatDisplayDate(startIso)} – {formatDisplayDate(endIso)}/{endIso.slice(0, 4)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
              <div className="mobile-full-input" style={{ position: 'relative', flex: '1 1 180px' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  className="form-input form-input-sm mobile-full-input"
                  style={{ paddingLeft: '1.9rem', width: '100%' }}
                  placeholder="Tìm mã NV / họ tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {role !== 'SITE_MANAGER' && (
                <select
                  className="form-select form-input-sm mobile-full-input"
                  style={{ width: '155px' }}
                  value={empTypeFilter}
                  onChange={(e) => setEmpTypeFilter(e.target.value as 'ALL' | 'OFFICE_STAFF' | 'SITE_ENGINEER')}
                >
                  <option value="ALL">Tất cả khối</option>
                  <option value="OFFICE_STAFF">Khối Văn phòng</option>
                  <option value="SITE_ENGINEER">Kỹ sư Công trường</option>
                </select>
              )}

              <select
                className="form-select form-input-sm mobile-full-input"
                style={{ width: '190px' }}
                value={projectFilter}
                onChange={(e) => setProjectFilter(Number(e.target.value))}
              >
                <option value={0}>Tất cả dự án / Trụ sở</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Day-Card View (Hiển thị gọn đẹp trên điện thoại <= 767px) */}
          <div className="mobile-only-block" style={{ padding: '0.75rem' }} data-testid="shift-mobile-day-view">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '0.25rem',
                marginBottom: '0.75rem',
              }}
            >
              {weekDates.map((iso, idx) => {
                const isSelected = idx === selectedMobileDayIdx;
                const shortDay = idx === 6 ? 'CN' : `T${idx + 2}`;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedMobileDayIdx(idx)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.4rem 0.15rem',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #1d4ed8' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#1d4ed8' : idx === 6 ? '#fff5f5' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      minHeight: '46px',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{shortDay}</span>
                    <span style={{ fontSize: '0.62rem', opacity: isSelected ? 0.92 : 0.75 }}>
                      {formatDisplayDate(iso)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748b', fontSize: '0.82rem' }}>
                  Không tìm thấy nhân sự phù hợp bộ lọc hiện tại.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const targetIso = weekDates[selectedMobileDayIdx] || weekDates[0];
                  const item = scheduleMap.get(`${emp.id}_${targetIso}`);
                  const st = item ? getShiftTypeBadge(item.shiftType) : null;
                  return (
                    <div
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.65rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.fullName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                          <span className="font-mono">{emp.employeeCode}</span>
                          <span>&bull;</span>
                          <span>{emp.employeeType === 'SITE_ENGINEER' ? 'Công trường' : 'Văn phòng'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canAssignSchedule}
                        onClick={() => openCellAssign(emp, targetIso)}
                        style={{
                          minHeight: '40px',
                          minWidth: '108px',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: item ? `1px solid ${st?.border}` : '1px dashed #94a3b8',
                          backgroundColor: item ? st?.bg : '#f8fafc',
                          color: item ? st?.color : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          cursor: canAssignSchedule ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                      >
                        {item ? (
                          <div>
                            <div>{item.shiftCode}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 500 }}>
                              {item.startTime}–{item.endTime}
                            </div>
                          </div>
                        ) : (
                          <span>+ Gán ca</span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Desktop Matrix Table */}
          <div className="table-container desktop-only-block" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '200px' }}>Nhân Sự &amp; Khối</th>
                  {weekDates.map((iso, idx) => (
                    <th
                      key={iso}
                      className="text-center"
                      style={{
                        minWidth: '115px',
                        backgroundColor: idx === 5 ? '#fffbeb' : idx === 6 ? '#fef2f2' : undefined,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{DAY_LABELS[idx]}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{formatDisplayDate(iso)}</div>
                    </th>
                  ))}
                  <th className="text-center" style={{ minWidth: '80px' }}>
                    Tổng Ca
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center" style={{ padding: '2rem', color: '#64748b' }}>
                      Không tìm thấy nhân sự phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    let rowCount = 0;
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{emp.fullName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {emp.employeeCode}
                            </span>
                            {emp.employeeType === 'SITE_ENGINEER' ? (
                              <span
                                className="badge badge-warning"
                                style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <HardHat size={10} /> Công trường
                              </span>
                            ) : (
                              <span
                                className="badge badge-info"
                                style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Building2 size={10} /> Văn phòng
                              </span>
                            )}
                          </div>
                        </td>

                        {weekDates.map((iso, idx) => {
                          const item = scheduleMap.get(`${emp.id}_${iso}`);
                          if (item) rowCount += 1;
                          const badgeStyle = item ? getShiftTypeBadge(item.shiftType) : null;
                          return (
                            <td
                              key={iso}
                              className="text-center"
                              style={{
                                padding: '0.35rem',
                                backgroundColor: idx === 6 ? '#fff5f5' : idx === 5 ? '#fffdf2' : undefined,
                              }}
                            >
                              <button
                                type="button"
                                disabled={!canAssignSchedule}
                                onClick={() => openCellAssign(emp, iso)}
                                title={
                                  canAssignSchedule
                                    ? `Nhấn để phân ca cho ${emp.fullName} ngày ${formatDisplayDate(iso)}`
                                    : 'Chế độ chỉ xem'
                                }
                                style={{
                                  width: '100%',
                                  minHeight: '44px',
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.3rem',
                                  cursor: canAssignSchedule ? 'pointer' : 'default',
                                  border: item ? `1px solid ${badgeStyle?.border}` : '1px dashed #cbd5e1',
                                  backgroundColor: item ? badgeStyle?.bg : 'transparent',
                                  color: item ? badgeStyle?.color : '#94a3b8',
                                  fontSize: '0.7rem',
                                  textAlign: 'center',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {item ? (
                                  <>
                                    <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{item.shiftCode}</div>
                                    <div style={{ fontSize: '0.64rem', opacity: 0.88 }}>
                                      {item.startTime}–{item.endTime}
                                    </div>
                                    {item.projectCode && (
                                      <div style={{ fontSize: '0.6rem', fontWeight: 600 }}>{item.projectCode}</div>
                                    )}
                                  </>
                                ) : (
                                  <span>{idx === 6 ? 'Nghỉ CN' : '+ Gán ca'}</span>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        <td className="text-center">
                          <span className={`badge ${rowCount > 0 ? 'badge-success' : 'badge-slate'}`}>
                            {rowCount} ca
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: SHIFT CATALOG */
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} color="#2563eb" />
              <h2 className="card-title">Danh Mục Khung Ca Làm Việc Chuẩn HMCPS</h2>
            </div>
            <span className="badge badge-info">Áp dụng cho Chấm công &amp; Tính lương 22,5 công</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Ca</th>
                  <th>Tên Khung Ca</th>
                  <th className="text-center">Phân Loại</th>
                  <th className="text-center">Khung Giờ</th>
                  <th className="text-center">Nghỉ Giữa Ca</th>
                  <th className="text-center">Hệ Số Lương</th>
                  {canManageShifts && <th className="text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody>
                {shifts.map((sh) => {
                  const st = getShiftTypeBadge(sh.shiftType);
                  return (
                    <tr key={sh.id}>
                      <td className="font-mono font-bold text-slate-900">{sh.code}</td>
                      <td className="font-medium text-slate-800">{sh.name}</td>
                      <td className="text-center">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="text-center font-mono">
                        {sh.startTime} &rarr; {sh.endTime}
                      </td>
                      <td className="text-center">{sh.breakMinutes} phút</td>
                      <td className="text-center font-bold text-blue-700">&times;{sh.multiplier}</td>
                      {canManageShifts && (
                        <td className="text-right">
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditShift(sh)}
                              title="Chỉnh sửa khung ca"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleDeleteShift(sh)}
                              title="Xóa khung ca"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Quick Cell Assign */}
      {cellModal && (
        <div className="modal-overlay" onClick={() => setCellModal(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Phân Ca: {cellModal.employee.fullName} ({formatDisplayDate(cellModal.workDate)})
              </h3>
              <button type="button" className="btn-icon" onClick={() => setCellModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Khung Ca Làm Việc (*)</label>
                <select
                  className="form-select"
                  value={cellShiftId}
                  onChange={(e) => setCellShiftId(Number(e.target.value))}
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} ({s.startTime}–{s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Công Trường / Địa Điểm (Tùy chọn)</label>
                <select
                  className="form-select"
                  value={cellProjectId}
                  onChange={(e) => setCellProjectId(Number(e.target.value))}
                >
                  <option value={0}>Trụ sở Văn phòng HQ</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              {cellModal.existing ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={handleClearCellSchedule}
                >
                  <Trash2 size={13} /> Gỡ Ca Này
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCellModal(null)}>
                  Hủy
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveCellAssign}>
                  Lưu Phân Ca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Assign */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={17} color="#2563eb" /> Phân Ca Hàng Loạt Trong Tuần
              </h3>
              <button type="button" className="btn-icon" onClick={() => setShowBatchModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleBatchAssignSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Khung Ca Áp Dụng (*)</label>
                    <select
                      className="form-select"
                      value={batchShiftId}
                      onChange={(e) => setBatchShiftId(Number(e.target.value))}
                    >
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.code}] {s.name} ({s.startTime}–{s.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Công Trường / Trụ Sở</label>
                    <select
                      className="form-select"
                      value={batchProjectId}
                      onChange={(e) => setBatchProjectId(Number(e.target.value))}
                    >
                      <option value={0}>Trụ sở Văn phòng HQ</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn Các Ngày Trong Tuần ({batchDates.length} ngày)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {weekDates.map((iso, idx) => {
                      const checked = batchDates.includes(iso);
                      return (
                        <label
                          key={iso}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.55rem',
                            borderRadius: '6px',
                            border: checked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: checked ? '#eff6ff' : '#ffffff',
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setBatchDates((prev) => [...prev, iso]);
                              else setBatchDates((prev) => prev.filter((x) => x !== iso));
                            }}
                          />
                          <span>
                            {DAY_LABELS[idx]} ({formatDisplayDate(iso)})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Chọn Nhân Sự ({batchEmpIds.length}/{filteredEmployees.length})
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => setBatchEmpIds(filteredEmployees.map((e) => e.id))}
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => setBatchEmpIds([])}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      maxHeight: '190px',
                      overflowY: 'auto',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '0.35rem',
                    }}
                  >
                    {filteredEmployees.map((emp) => {
                      const checked = batchEmpIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setBatchEmpIds((prev) => [...prev, emp.id]);
                              else setBatchEmpIds((prev) => prev.filter((id) => id !== emp.id));
                            }}
                          />
                          <span>
                            <strong>{emp.employeeCode}</strong> — {emp.fullName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Xác Nhận Phân Ca ({batchEmpIds.length * batchDates.length} lượt)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Shift Catalog */}
      {showShiftModal && (
        <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingShift ? `Chỉnh Sửa Khung Ca [${editingShift.code}]` : 'Thêm Khung Ca Mới'}</h3>
              <button type="button" className="btn-icon" onClick={() => setShowShiftModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveShift}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Mã Khung Ca (*)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: CA_SANG_T7"
                      value={shiftForm.code}
                      onChange={(e) => setShiftForm((p) => ({ ...p, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loại Ca (*)</label>
                    <select
                      className="form-select"
                      value={shiftForm.shiftType}
                      onChange={(e) => setShiftForm((p) => ({ ...p, shiftType: e.target.value as ShiftTypeCode }))}
                    >
                      <option value="DAY_SHIFT">Ca Ngày</option>
                      <option value="NIGHT_SHIFT">Ca Đêm</option>
                      <option value="OVERTIME_SHIFT">Ca Tăng Ca (OT)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Khung Ca (*)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Ca Hành Chính Sáng Thứ 7 (0,5 công)"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Giờ Bắt Đầu</label>
                    <input
                      type="time"
                      className="form-input"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm((p) => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ Kết Thúc</label>
                    <input
                      type="time"
                      className="form-input"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm((p) => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nghỉ Giữa Ca (phút)</label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      className="form-input"
                      value={shiftForm.breakMinutes}
                      onChange={(e) => setShiftForm((p) => ({ ...p, breakMinutes: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hệ Số Ca</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={3.0}
                      className="form-input"
                      value={shiftForm.multiplier}
                      onChange={(e) => setShiftForm((p) => ({ ...p, multiplier: Number(e.target.value) || 1.0 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShiftModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingShift ? 'Cập Nhật Khung Ca' : 'Tạo Khung Ca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
