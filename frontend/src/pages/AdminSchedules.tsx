import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Archive,
  Bell,
  FileCode,
  Edit2,
  X,
  Save,
  Search,
  Check,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  Wf10OverviewResponse,
  Wf10ScheduledItem,
  Wf10SchedulerConfig,
  Wf10FieldSecurityPolicy,
} from '../types';

const ALL_BUSINESS_ROLES = [
  'HR_MANAGER',
  'HR_STAFF',
  'ACCOUNTANT',
  'CHIEF_ACCOUNTANT',
  'SITE_MANAGER',
  'DIRECTOR',
  'SYSTEM_ADMIN',
];

const ROLE_SHORT_LABELS: Record<string, string> = {
  HR_MANAGER: 'HR Manager',
  HR_STAFF: 'HR Staff',
  ACCOUNTANT: 'Accountant',
  CHIEF_ACCOUNTANT: 'Chief Acc.',
  SITE_MANAGER: 'Site Mgr',
  DIRECTOR: 'Director',
  SYSTEM_ADMIN: 'System Admin',
};

const MODULE_BADGE_MAP: Record<string, { label: string; badgeClass: string }> = {
  COMPLIANCE_RULE: { label: 'Tham số PL & BHXH', badgeClass: 'badge-primary' },
  SALARY_SCALE: { label: 'Thang bảng lương', badgeClass: 'badge-info' },
  ALLOWANCE_ITEM: { label: 'Danh mục phụ cấp', badgeClass: 'badge-warning' },
  SITE_PROJECT: { label: 'Phụ cấp công trường', badgeClass: 'badge-success' },
};

export const AdminSchedules: React.FC = () => {
  const [overview, setOverview] = useState<Wf10OverviewResponse | null>(null);
  const [schedulerDraft, setSchedulerDraft] = useState<Wf10SchedulerConfig | null>(null);
  const [securityDraft, setSecurityDraft] = useState<Wf10FieldSecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'schedule' | 'security' | 'integrity'>('schedule');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingItem, setEditingItem] = useState<Wf10ScheduledItem | null>(null);
  const [scheduleModalForm, setScheduleModalForm] = useState({
    effectiveDate: '',
    scheduledTime: '00:05',
    securityPolicy: 'STRICT_DIEU_95_BLLD',
    adminNote: '',
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminWf10Overview();
      setOverview(data);
      setSchedulerDraft({ ...data.schedulerConfig });
      setSecurityDraft(data.fieldSecurityPolicies.map((p) => ({ ...p, allowedRoles: [...p.allowedRoles] })));
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Không thể tải dữ liệu Lịch Trình Chính Sách.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const list = overview?.scheduledItems || [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((item) => {
      if (statusFilter !== 'ALL' && item.status.toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      return (
        item.itemKey.toLowerCase().includes(q) ||
        item.itemTitle.toLowerCase().includes(q) ||
        item.moduleLabel.toLowerCase().includes(q) ||
        item.updatedBy.toLowerCase().includes(q)
      );
    });
  }, [overview?.scheduledItems, statusFilter, searchTerm]);

  const handleSaveSchedulerConfig = async () => {
    if (!schedulerDraft) return;
    setSaving(true);
    try {
      await api.updateAdminWf10SchedulerConfig(schedulerDraft);
      notify('success', 'Đã lưu cấu hình Bộ Hẹn Giờ Tự Động & ghi Audit Log.');
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Lỗi khi lưu cấu hình bộ hẹn giờ.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDueActivations = async () => {
    setSaving(true);
    try {
      const res = await api.runAdminWf10DueActivations();
      if (res.activatedCount > 0) {
        notify(
          'success',
          `Hoàn tất: Đã kích hoạt ${res.activatedCount} cấu hình đến hạn, lưu Archive & phát thông báo Kế toán!`
        );
      } else {
        notify('success', `Đã quét hàng đợi lúc ${res.scannedAt}: hiện chưa có mục PENDING nào đến thời điểm kích hoạt.`);
      }
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Không thể chạy quét kích hoạt đến hạn.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditSchedule = (item: Wf10ScheduledItem) => {
    setEditingItem(item);
    setScheduleModalForm({
      effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
      scheduledTime: item.scheduledTime || schedulerDraft?.dailyExecutionTime || '00:05',
      securityPolicy: item.securityPolicy || 'STRICT_DIEU_95_BLLD',
      adminNote: item.adminNote || '',
    });
  };

  const handleSaveItemSchedule = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await api.updateAdminWf10ItemSchedule(editingItem.moduleType, editingItem.itemKey, scheduleModalForm);
      notify(
        'success',
        `Đã thiết lập lịch trình cho "${editingItem.itemKey}" — Kích hoạt tự động ngày ${scheduleModalForm.effectiveDate} lúc ${scheduleModalForm.scheduledTime}.`
      );
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Không thể cập nhật lịch trình hẹn giờ cho mục này.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateItemNow = async (item: Wf10ScheduledItem) => {
    setSaving(true);
    try {
      await api.activateAdminWf10ItemNow(item.moduleType, item.itemKey);
      notify(
        'success',
        `Đã kích hoạt theo lịch cho "${item.itemKey}" (Pending -> Active), lưu Archive & gửi thông báo sẵn sàng tới Kế toán!`
      );
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Lỗi khi kích hoạt phiên bản.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRoleAccess = (fieldKey: string, roleName: string) => {
    setSecurityDraft((prev) =>
      prev.map((row) => {
        if (row.fieldKey !== fieldKey) return row;
        const isLockedAdmin = roleName === 'SYSTEM_ADMIN' && row.classification !== 'GOVERNANCE_METADATA';
        if (isLockedAdmin) return row;
        const exists = row.allowedRoles.includes(roleName);
        const nextRoles = exists ? row.allowedRoles.filter((r) => r !== roleName) : [...row.allowedRoles, roleName];
        return { ...row, allowedRoles: nextRoles };
      })
    );
  };

  const handleUpdateSecurityField = (fieldKey: string, patch: Partial<Wf10FieldSecurityPolicy>) => {
    setSecurityDraft((prev) => prev.map((row) => (row.fieldKey === fieldKey ? { ...row, ...patch } : row)));
  };

  const handleSaveFieldSecurity = async () => {
    setSaving(true);
    try {
      await api.updateAdminWf10FieldSecurity(securityDraft);
      notify('success', 'Đã cập nhật Phân quyền & Bảo mật trường dữ liệu lương/BH mới.');
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Lỗi khi lưu chính sách bảo mật trường dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setSaving(true);
    try {
      const res = await api.verifyAdminWf10Integrity();
      notify(
        res.syntaxStatus === 'PASSED' ? 'success' : 'error',
        `Kiểm tra toàn vẹn cấu hình: Trạng thái ${res.syntaxStatus} — Checksum SHA-256: ${res.stateChecksum}`
      );
      await loadData();
    } catch (err: any) {
      notify('error', err?.response?.data?.message || 'Không thể chạy xác thực toàn vẹn cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markAdminWf10NotificationRead(id);
      await loadData();
    } catch {}
  };

  const summary = overview?.integritySummary;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary">Lịch Trình Tự Động &amp; Bảo Mật</span>
            <span className="badge badge-info">Điều 95 BLLĐ &amp; SoD Compliance</span>
          </div>
          <h1 className="page-title">Thiết Lập Hẹn Giờ Chính Sách &amp; Bảo Mật Dữ Liệu</h1>
          <p className="page-subtitle">
            Quản lý lịch trình cấu hình Pending từ HR Manager, phân quyền bảo mật trường dữ liệu lương/bảo hiểm mới, tự động kích hoạt khi đến hạn và giám sát toàn vẹn Audit Logs.
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading || saving}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleVerifyIntegrity} disabled={saving}>
            <ShieldCheck size={14} /> Xác Thực Toàn Vẹn
          </button>
          <button
            type="button"
            data-testid="btn-wf10-run-due"
            className="btn btn-primary btn-sm"
            onClick={handleRunDueActivations}
            disabled={saving}
          >
            <Play size={14} /> Quét &amp; Kích Hoạt Đến Hạn
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          className="alert-banner"
          style={{
            marginBottom: '1rem',
            backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderColor: toast.type === 'success' ? '#6ee7b7' : '#fca5a5',
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Swimlane Progress Ribbon */}
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          borderColor: '#bfdbfe',
        }}
      >
        <div className="card-body" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} /> QUY TRÌNH VẬN HÀNH HẸN GIỜ &amp; BẢO MẬT CẤU HÌNH
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.55rem' }}>
            {[
              { step: '1. HR Manager', desc: 'Đăng ký Pending + Ngày hiệu lực', tone: '#475569' },
              { step: '2. Hẹn Giờ Kích Hoạt', desc: 'System Admin đặt giờ & lịch tự động', tone: '#1d4ed8' },
              { step: '3. Bảo Mật Trường Dữ Liệu', desc: 'Phân quyền & che dữ liệu nhạy cảm', tone: '#7e22ce' },
              { step: '4. Kích Hoạt Tự Động', desc: 'Pending → Active & Báo Kế toán', tone: '#047857' },
              { step: '5. Kiểm Toán & Lưu Trữ', desc: 'Syntax Check, Archive & Checksum', tone: '#b45309' },
            ].map((node) => (
              <div
                key={node.step}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #dbeafe',
                  borderLeft: `3px solid ${node.tone}`,
                  borderRadius: '6px',
                  padding: '0.5rem 0.65rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: node.tone }}>{node.step}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>{node.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Cấu Hình Chờ Hẹn Giờ (Pending)</div>
          <div className="kpi-value" style={{ color: (summary?.pendingCount ?? 0) > 0 ? '#d97706' : '#0f172a' }}>
            {summary?.pendingCount ?? 0}
          </div>
          <div className="kpi-meta">Đăng ký lịch trình từ HR Manager</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Đến Hạn Kích Hoạt Ngay</div>
          <div className="kpi-value" style={{ color: (summary?.dueCount ?? 0) > 0 ? '#dc2626' : '#047857' }}>
            {summary?.dueCount ?? 0}
          </div>
          <div className="kpi-meta">Đã qua hoặc đúng ngày giờ hẹn</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Phiên Bản Đang Hoạt Động</div>
          <div className="kpi-value" style={{ color: '#1d4ed8' }}>{summary?.activeCount ?? 0}</div>
          <div className="kpi-meta">Đã đồng bộ &amp; phục vụ Bộ Công Thức</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Kho Archive &amp; Syntax Integrity</div>
          <div className="kpi-value" style={{ color: summary?.syntaxStatus === 'PASSED' ? '#047857' : '#d97706' }}>
            {summary?.archiveCount ?? 0} bản • {summary?.syntaxStatus || 'PASSED'}
          </div>
          <div className="kpi-meta font-mono" style={{ fontSize: '0.7rem' }}>
            SHA256: {summary?.stateChecksum || '—'}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.45rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1rem',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          data-testid="tab-wf10-schedule"
          onClick={() => setActiveTab('schedule')}
          className={`btn btn-sm ${activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Clock size={14} /> Hẹn Giờ &amp; Kích Hoạt
          {(summary?.pendingCount ?? 0) > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: '0.35rem' }}>{summary?.pendingCount}</span>
          )}
        </button>

        <button
          type="button"
          data-testid="tab-wf10-security"
          onClick={() => setActiveTab('security')}
          className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Lock size={14} /> Bảo Mật Trường Dữ Liệu
        </button>

        <button
          type="button"
          data-testid="tab-wf10-integrity"
          onClick={() => setActiveTab('integrity')}
          className={`btn btn-sm ${activeTab === 'integrity' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Archive size={14} /> Archive, Thông Báo &amp; Audit Logs
          {(summary?.unreadAdminNotifications ?? 0) > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: '0.35rem' }}>{summary?.unreadAdminNotifications}</span>
          )}
        </button>
      </div>

      {/* TAB 1: SCHEDULE TIMER & PENDING QUEUE */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Global Cron Scheduler Daemon Config Card */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={17} color="#1d4ed8" />
                <h2 className="card-title">Cấu Hình Bộ Hẹn Giờ Kích Hoạt Tự Động</h2>
              </div>
              <span className={`badge ${schedulerDraft?.autoActivationEnabled ? 'badge-success' : 'badge-warning'}`}>
                {schedulerDraft?.autoActivationEnabled ? 'Scheduler Tự Động: Đang Bật' : 'Scheduler: Tạm Tắt'}
              </span>
            </div>

            {schedulerDraft && (
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label className="form-label">Chế độ tự động kích hoạt</label>
                    <select
                      data-testid="select-wf10-auto-enabled"
                      className="form-select"
                      value={schedulerDraft.autoActivationEnabled ? 'true' : 'false'}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, autoActivationEnabled: e.target.value === 'true' })}
                    >
                      <option value="true">Tự động chuyển Pending → Active khi đến giờ</option>
                      <option value="false">Tạm dừng (Chỉ kích hoạt thủ công)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Giờ kích hoạt mặc định hàng ngày (HH:mm)</label>
                    <input
                      data-testid="input-wf10-daily-time"
                      type="time"
                      className="form-input font-mono"
                      value={schedulerDraft.dailyExecutionTime}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, dailyExecutionTime: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Chu kỳ quét hàng đợi (giây)</label>
                    <input
                      data-testid="input-wf10-polling-seconds"
                      type="number"
                      min={15}
                      max={3600}
                      className="form-input tabular-nums"
                      value={schedulerDraft.pollingIntervalSeconds}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, pollingIntervalSeconds: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Múi giờ chuẩn hệ thống</label>
                    <select
                      className="form-select"
                      value={schedulerDraft.timezone}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, timezone: e.target.value })}
                    >
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={schedulerDraft.autoArchivePrevious}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, autoArchivePrevious: e.target.checked })}
                    />
                    <span>Tự động lưu Archive phiên bản cũ trước khi kích hoạt</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={schedulerDraft.notifyAccountantOnActivate}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, notifyAccountantOnActivate: e.target.checked })}
                    />
                    <span>Tự động phát thông báo cho Kế toán khi cấu hình sẵn sàng</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={schedulerDraft.requireSyntaxCheckBeforeActivate}
                      onChange={(e) => setSchedulerDraft({ ...schedulerDraft, requireSyntaxCheckBeforeActivate: e.target.checked })}
                    />
                    <span>Kiểm tra cú pháp (Syntax Check) trước kích hoạt</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    <strong>Lần quét gần nhất:</strong> {schedulerDraft.lastScanAt} — <span>{schedulerDraft.lastRunSummary}</span>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-save-wf10-config"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveSchedulerConfig}
                    disabled={saving}
                  >
                    <Save size={14} /> Lưu Cấu Hình Hẹn Giờ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending & Active Registered Policies Queue */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={17} color="#047857" />
                <h2 className="card-title">Hàng Đợi Lịch Trình Chính Sách &amp; Phụ Cấp Đã Đăng Ký ({filteredItems.length})</h2>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['ALL', 'PENDING', 'ACTIVE'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f)}
                      className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Đang Hẹn Giờ (Pending)' : 'Đang Active'}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tìm mã, tên chính sách..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '1.9rem', minWidth: '190px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="hm-table">
                <thead>
                  <tr>
                    <th>Phân Hệ</th>
                    <th>Mã &amp; Tên Chính Sách (Metadata — Ẩn số tiền Điều 95)</th>
                    <th>Trạng Thái</th>
                    <th>Ngày &amp; Giờ Hẹn Hiệu Lực</th>
                    <th>Chính Sách Bảo Mật / Checksum</th>
                    <th className="text-right">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Chưa có bản ghi chính sách hoặc lịch trình hẹn giờ nào khớp bộ lọc. Khi HR Manager lưu cấu hình <strong>"Hẹn giờ (Pending)"</strong> ở Luật LĐ / Thang Lương / Phụ Cấp Dự Án, lịch trình sẽ tự động hiển thị tại đây.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const modMeta = MODULE_BADGE_MAP[item.moduleType] || { label: item.moduleLabel, badgeClass: 'badge-slate' };
                      const isPending = item.status === 'PENDING';
                      return (
                        <tr key={`${item.moduleType}-${item.itemKey}`}>
                          <td>
                            <span className={`badge ${modMeta.badgeClass}`}>{modMeta.label}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.83rem' }}>{item.itemTitle}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748b' }}>
                              <span className="badge badge-slate" style={{ fontSize: '0.67rem' }}>
                                <Lock size={10} /> {item.maskedAmountSummary}
                              </span>
                              <span>• Phiên bản: <strong>{item.version}</strong></span>
                              <span>• Cập nhật: {item.updatedBy}</span>
                            </div>
                            {item.adminNote && (
                              <div style={{ fontSize: '0.72rem', color: '#1d4ed8', marginTop: '0.15rem' }}>
                                Ghi chú lịch trình: {item.adminNote}
                              </div>
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className="badge badge-warning">PENDING (Chờ hẹn giờ)</span>
                                {item.dueNow && <span className="badge badge-danger">ĐẾN HẠN CHẠY NGAY</span>}
                              </div>
                            ) : (
                              <span className="badge badge-success">ACTIVE (Đang hiệu lực)</span>
                            )}
                          </td>
                          <td>
                            <div className="font-mono" style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>
                              {item.effectiveDate} • {item.scheduledTime}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.timezone}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7e22ce' }}>{item.securityPolicy}</div>
                            <div className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>SHA: {item.integrityChecksum}</div>
                          </td>
                          <td className="text-right">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditSchedule(item)}
                                title="Điều chỉnh ngày & giờ tự động kích hoạt"
                              >
                                <Edit2 size={13} /> Hẹn Giờ
                              </button>
                              {isPending && (
                                <button
                                  type="button"
                                  data-testid={`btn-activate-now-${item.itemKey}`}
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleActivateItemNow(item)}
                                  disabled={saving}
                                  style={{ backgroundColor: '#047857', borderColor: '#047857' }}
                                >
                                  <Play size={13} /> Kích Hoạt Ngay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIELD-LEVEL SECURITY & ACCESS CONTROL */}
      {activeTab === 'security' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={17} color="#7e22ce" />
              <h2 className="card-title">Phân Quyền Truy Cập &amp; Bảo Mật Trường Dữ Liệu Lương / Bảo Hiểm Mới</h2>
            </div>
            <button
              type="button"
              data-testid="btn-save-wf10-security"
              className="btn btn-primary btn-sm"
              onClick={handleSaveFieldSecurity}
              disabled={saving || securityDraft.length === 0}
            >
              <Save size={14} /> Lưu Chính Sách Bảo Mật Trường Dữ Liệu
            </button>
          </div>

          <div className="card-body">
            <div
              className="alert-banner"
              style={{
                marginBottom: '1rem',
                backgroundColor: '#faf5ff',
                borderColor: '#e9d5ff',
                color: '#6b21a8',
                fontSize: '0.8rem',
              }}
            >
              <ShieldCheck size={16} />{' '}
              <span>
                <strong>Nguyên tắc Phân Tách Nhiệm Vụ (Điều 95 BLLĐ 2019):</strong> System Admin cấu hình mặt nạ che dữ liệu (Field Masking), mức mã hóa và vai trò nghiệp vụ được phép truy cập trường chính sách/lương mới. System Admin bị khóa quyền đọc/sửa trực tiếp đối với mọi trường dữ liệu tiền lương &amp; định mức cá nhân.
              </span>
            </div>

            {securityDraft.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b' }}>
                Kết nối máy chủ Backend để quản lý danh sách chính sách bảo mật trường dữ liệu.
              </div>
            ) : (
              <div className="table-container">
                <table className="hm-table">
                  <thead>
                    <tr>
                      <th>Nhóm Trường Dữ Liệu Mới</th>
                      <th>Phân Loại &amp; Mã Hóa</th>
                      <th>Chế Độ Che Dữ Liệu (Masking)</th>
                      <th>Vai Trò Được Phép Truy Cập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityDraft.map((row) => (
                      <tr key={row.fieldKey}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{row.fieldLabel}</div>
                          <div className="font-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {row.fieldKey} • {row.moduleSource}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <span
                              className={`badge ${
                                row.classification === 'CONFIDENTIAL_SALARY'
                                  ? 'badge-danger'
                                  : row.classification === 'STATUTORY_POLICY'
                                  ? 'badge-warning'
                                  : 'badge-info'
                              }`}
                            >
                              {row.classification}
                            </span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={row.encryptionRequired}
                                onChange={(e) => handleUpdateSecurityField(row.fieldKey, { encryptionRequired: e.target.checked })}
                              />
                              <span>Mã hóa AES Snapshot</span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={row.maskingMode}
                            onChange={(e) => handleUpdateSecurityField(row.fieldKey, { maskingMode: e.target.value })}
                            style={{ minWidth: '175px', fontSize: '0.78rem' }}
                          >
                            <option value="FULL_CLEAR">Hiển thị đầy đủ cho vai trò hợp lệ</option>
                            <option value="MASKED_FOR_NON_OWNER">Ẩn số tiền ngoài chủ sở hữu (Điều 95)</option>
                            <option value="AGGREGATE_ONLY">Chỉ cho phép xem tổng hợp (Aggregate)</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {ALL_BUSINESS_ROLES.map((roleName) => {
                              const checked = row.allowedRoles.includes(roleName);
                              const lockedAdmin = roleName === 'SYSTEM_ADMIN' && row.classification !== 'GOVERNANCE_METADATA';
                              return (
                                <button
                                  key={roleName}
                                  type="button"
                                  disabled={lockedAdmin}
                                  onClick={() => handleToggleRoleAccess(row.fieldKey, roleName)}
                                  className={`btn btn-sm ${checked ? 'btn-primary' : 'btn-secondary'}`}
                                  title={lockedAdmin ? 'Bị chặn bởi Điều 95 BLLĐ & Phân Tách Quyền (SoD)' : `Bật/tắt quyền cho ${roleName}`}
                                  style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.7rem',
                                    opacity: lockedAdmin ? 0.45 : 1,
                                    cursor: lockedAdmin ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {lockedAdmin ? '🔒 Admin (Chặn)' : ROLE_SHORT_LABELS[roleName] || roleName}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ARCHIVE VAULT, NOTIFICATIONS & AUDIT INTEGRITY (STEP 8, 12-14) */}
      {activeTab === 'integrity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            {/* Notifications Panel */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={17} color="#1d4ed8" />
                  <h2 className="card-title">Thông Báo Vận Hành Hệ Thống</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleMarkNotificationRead('ALL')}
                >
                  Đọc tất cả
                </button>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '360px', overflowY: 'auto' }}>
                {(overview?.notifications || []).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Chưa có thông báo vận hành mới.</div>
                ) : (
                  (overview?.notifications || []).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: n.isRead ? '#ffffff' : '#eff6ff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{n.title}</strong>
                        <span className="badge badge-info" style={{ fontSize: '0.67rem' }}>{n.targetRole}</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.2rem' }}>{n.message}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
                        <span>{n.createdAt} {n.checksumSha256 ? `• SHA: ${n.checksumSha256}` : ''}</span>
                        {!n.isRead && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.1rem 0.45rem', fontSize: '0.68rem' }}
                            onClick={() => handleMarkNotificationRead(n.id)}
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Archive Vault Panel */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Archive size={17} color="#047857" />
                  <h2 className="card-title">Kho Lưu Trữ Phiên Bản Cũ (Archive)</h2>
                </div>
                <span className="badge badge-success">{overview?.archives?.length || 0} bản lưu</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '360px', overflowY: 'auto' }}>
                {(overview?.archives || []).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Chưa có bản chụp Archive lịch sử nào.</div>
                ) : (
                  (overview?.archives || []).map((arc) => (
                    <div
                      key={arc.archiveId}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #d1fae5',
                        backgroundColor: '#f0fdf4',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#065f46' }}>{arc.itemTitle}</strong>
                        <span className="badge badge-success">{arc.version} • {arc.syntaxCheckStatus}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '0.2rem' }}>{arc.reason}</div>
                      <div className="font-mono" style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>
                        {arc.archivedAt} • {arc.archivedBy} • SHA256: {arc.checksumSha256}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Audit Log Table for Scheduled Policies */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={17} color="#b45309" />
                <h2 className="card-title">Nhật Ký Kiểm Toán Hẹn Giờ &amp; Bảo Mật (System Audit Logs)</h2>
              </div>
              <span className="badge badge-info">{overview?.auditLogs?.length || 0} sự kiện kiểm toán</span>
            </div>
            <div className="table-container">
              <table className="hm-table">
                <thead>
                  <tr>
                    <th>Thời Gian</th>
                    <th>Mã Sự Kiện</th>
                    <th>Người / Dịch Vụ Thực Hiện</th>
                    <th>Chi Tiết Biến Động &amp; Checksum</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.auditLogs || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '1.25rem' }}>
                        Chưa có sự kiện lịch trình mới. Hãy lưu cấu hình hẹn giờ hoặc chạy Xác Thực Toàn Vẹn để ghi Audit Log đầu tiên.
                      </td>
                    </tr>
                  ) : (
                    (overview?.auditLogs || []).map((logItem, idx) => (
                      <tr key={logItem.id || idx}>
                        <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {(logItem.createdAt || '').replace('T', ' ').slice(0, 19)}
                        </td>
                        <td>
                          <span className="badge badge-primary">{logItem.action}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <strong>{logItem.performedByName || 'System Scheduler'}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{logItem.performedByRole || 'SYSTEM_ADMIN'}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#1e293b' }}>{logItem.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Scheduled Date/Time for a Specific Policy Item */}
      {editingItem && (
        <div className="modal-backdrop" onClick={() => setEditingItem(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Thiết Lập Lịch Trình Hẹn Giờ
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {editingItem.moduleLabel} • {editingItem.itemKey}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <strong>Cấu hình:</strong> {editingItem.itemTitle}
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Tuân thủ SoD: Quản trị viên chỉ điều chỉnh thời điểm kích hoạt &amp; chính sách bảo mật, không can thiệp con số tiền lương.
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="form-label">Ngày hiệu lực kích hoạt:</label>
                  <input
                    data-testid="modal-wf10-effective-date"
                    type="date"
                    className="form-input"
                    value={scheduleModalForm.effectiveDate}
                    onChange={(e) => setScheduleModalForm({ ...scheduleModalForm, effectiveDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giờ tự động kích hoạt (HH:mm):</label>
                  <input
                    data-testid="modal-wf10-scheduled-time"
                    type="time"
                    className="form-input font-mono"
                    value={scheduleModalForm.scheduledTime}
                    onChange={(e) => setScheduleModalForm({ ...scheduleModalForm, scheduledTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Chính sách bảo mật áp dụng khi Active:</label>
                <select
                  className="form-select"
                  value={scheduleModalForm.securityPolicy}
                  onChange={(e) => setScheduleModalForm({ ...scheduleModalForm, securityPolicy: e.target.value })}
                >
                  <option value="STRICT_DIEU_95_BLLD">STRICT_DIEU_95_BLLD — Bảo mật tuyệt đối lương/BH cá nhân</option>
                  <option value="ACCOUNTING_READONLY_MASKED">ACCOUNTING_READONLY_MASKED — Chỉ Kế toán &amp; HR đọc trực tiếp</option>
                  <option value="EXECUTIVE_AUDIT_LOCKED">EXECUTIVE_AUDIT_LOCKED — Ký số kiểm toán BGD &amp; KTT</option>
                </select>
              </div>

              <div>
                <label className="form-label">Ghi chú lịch trình quản trị:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Chạy tự động đầu kỳ lương tháng tới..."
                  value={scheduleModalForm.adminNote}
                  onChange={(e) => setScheduleModalForm({ ...scheduleModalForm, adminNote: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="modal-wf10-save-schedule"
                className="btn btn-primary"
                onClick={handleSaveItemSchedule}
                disabled={saving}
              >
                <Check size={15} /> Lưu Lịch Hẹn Kích Hoạt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
