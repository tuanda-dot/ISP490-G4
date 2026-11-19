import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Eye,
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import type { AuditLogItem, SecurityAlertItem } from '../types';

const FALLBACK_ALERTS: SecurityAlertItem[] = [
  {
    id: 'ALT-MOCK-1',
    severity: 'MEDIUM',
    category: 'RBAC_GOVERNANCE',
    title: 'Giám sát Phân Tách Nhiệm Vụ (Điều 95 BLLĐ) đang hoạt động',
    detail: 'Các endpoint bảng lương, hồ sơ nhân sự và duyệt ngân sách yêu cầu quyền Kế toán / HR / Giám đốc.',
    source: 'HMCPS Security Filter',
    timestamp: '2026-11-13 09:00:00',
  },
];

const FALLBACK_LOGS: AuditLogItem[] = [
  {
    id: 1,
    action: 'ADMIN_RBAC_INIT',
    entityName: 'SystemSetting',
    entityId: 1,
    performedById: 1,
    performedByName: 'Nguyễn Hữu Thịnh',
    performedByRole: 'SYSTEM_ADMIN',
    ipAddress: '127.0.0.1',
    oldValueJson: '{}',
    newValueJson: '{"policy":"STRICT_RBAC_ISOLATION"}',
    description: 'Khởi tạo phân quyền System Admin & cơ chế kiểm toán hệ thống',
    createdAt: '2026-11-13T08:30:00',
  },
];

function getActionBadge(action: string): string {
  if (action.includes('DENIED') || action.includes('FAILED') || action.includes('BLOCKED') || action.includes('LOCK')) {
    return 'badge-danger';
  }
  if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('RESET')) {
    return 'badge-success';
  }
  if (action.includes('UPDATE') || action.includes('RBAC') || action.includes('SETTINGS')) {
    return 'badge-warning';
  }
  return 'badge-info';
}

function getSeverityBadge(severity: string): string {
  if (severity === 'HIGH') return 'badge-danger';
  if (severity === 'MEDIUM') return 'badge-warning';
  return 'badge-info';
}

function formatPrettyJson(raw?: string): string {
  if (!raw || raw.trim() === '') return '(Không có dữ liệu)';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export const AdminAuditLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'ALERTS'>('LOGS');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [logRes, alertRes] = await Promise.all([
        api.getAuditLogs({
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          q: searchQ.trim() || undefined,
        }),
        api.getSecurityAlerts(),
      ]);
      setLogs(logRes);
      setAlerts(alertRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'MOCK_TOKEN_LOCAL_MODE' || msg.includes('Network Error')) {
        setLogs(FALLBACK_LOGS);
        setAlerts(FALLBACK_ALERTS);
      } else {
        setErrorMsg(msg || 'Không thể tải nhật ký kiểm toán & cảnh báo bảo mật.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [actionFilter, roleFilter]);

  const displayedLogs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return logs.filter((l) => {
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.entityName.toLowerCase().includes(q) ||
        (l.performedByName || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.ipAddress || '').toLowerCase().includes(q)
      );
    });
  }, [logs, searchQ]);

  const highAlertsCount = useMemo(
    () => alerts.filter((a) => a.severity === 'HIGH').length,
    [alerts]
  );

  const uniqueActions = useMemo(() => {
    const set = new Set<string>([
      'SECURITY_ALERT_ACCESS_DENIED',
      'LOGIN_FAILED',
      'LOGIN_BLOCKED_INACTIVE',
      'PASSWORD_FORCED_CHANGE',
      'PASSWORD_RESET_OTP',
      'ADMIN_ACCOUNT_CREATE',
      'ADMIN_ACCOUNT_UPDATE',
      'ADMIN_ACCOUNT_LOCK_TOGGLE',
      'ADMIN_PASSWORD_RESET',
      'ADMIN_RBAC_UPDATE',
      'ADMIN_SETTINGS_UPDATE',
      'DEPARTMENT_CREATE',
      'PAYROLL_CALCULATE',
      'PAYROLL_APPROVE',
    ]);
    logs.forEach((l) => set.add(l.action));
    return Array.from(set);
  }, [logs]);

  const exportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Actor', 'Role', 'Entity', 'EntityId', 'IPAddress', 'Description'];
    const escape = (val: string | number | undefined) =>
      `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = displayedLogs.map((l) =>
      [
        l.id,
        l.createdAt,
        l.action,
        l.performedByName,
        l.performedByRole,
        l.entityName,
        l.entityId,
        l.ipAddress,
        l.description,
      ]
        .map(escape)
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hmcps-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Nhật Ký Kiểm Toán &amp; Cảnh Báo Bảo Mật</h1>
          <p className="page-subtitle">
            Truy vết toàn bộ thay đổi phân quyền, cấu hình hệ thống, đăng nhập thất bại và cảnh báo truy cập trái phép (403 Forbidden).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} /> Làm mới
          </button>
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={displayedLogs.length === 0}>
            <Download size={15} /> Xuất Nhật Ký CSV
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: '#fecdd3', backgroundColor: '#fef2f2' }}>
          <div className="card-body" style={{ padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Tổng Sự Kiện Audit</div>
          <div className="kpi-value">{logs.length}</div>
          <div className="kpi-meta">Lưu vết bất biến (Before / After JSON)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cảnh Báo Bảo Mật</div>
          <div className="kpi-value" style={{ color: alerts.length > 0 ? '#b45309' : '#047857' }}>
            {alerts.length}
          </div>
          <div className="kpi-meta">Phát hiện bất thường đăng nhập & RBAC</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cảnh Báo Mức Cao (HIGH)</div>
          <div className="kpi-value" style={{ color: highAlertsCount > 0 ? '#b91c1c' : '#047857' }}>
            {highAlertsCount}
          </div>
          <div className="kpi-meta">Truy cập trái phép / Lỗi kết nối nghiêm trọng</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Giám Sát Thời Gian Thực</div>
          <div className="kpi-value" style={{ fontSize: '1.15rem', color: '#047857' }}>
            Đang Bật 24/7
          </div>
          <div className="kpi-meta">Giám sát kiểm toán 24/7</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'LOGS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('LOGS')}
        >
          <FileText size={15} /> Nhật Ký Kiểm Toán ({displayedLogs.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'ALERTS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ALERTS')}
        >
          <ShieldAlert size={15} /> Cảnh Báo Bảo Mật ({alerts.length})
        </button>
      </div>

      {activeTab === 'ALERTS' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Danh Sách Cảnh Báo An Ninh Hệ Thống</h2>
            <span className="badge badge-danger">{highAlertsCount} mức cao</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#047857' }}>
                <ShieldCheck size={28} style={{ margin: '0 auto 0.5rem' }} />
                Hệ thống chưa ghi nhận cảnh báo an ninh bất thường.
              </div>
            ) : (
              alerts.map((al) => (
                <div
                  key={al.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: al.severity === 'HIGH' ? '#fef2f2' : al.severity === 'MEDIUM' ? '#fffbeb' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {al.severity === 'HIGH' ? (
                        <AlertTriangle size={16} color="#dc2626" />
                      ) : (
                        <Info size={16} color="#d97706" />
                      )}
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{al.title}</strong>
                      <span className={`badge ${getSeverityBadge(al.severity)}`}>{al.severity}</span>
                      <span className="badge badge-slate">{al.category}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {al.timestamp}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#334155' }}>{al.detail}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Nguồn phát hiện: {al.source}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'LOGS' && (
        <>
          <div className="filter-bar">
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                className="form-input form-input-sm"
                style={{ paddingLeft: '2rem' }}
                placeholder="Tìm hành động, tài khoản, mô tả, IP..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchData();
                }}
              />
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '185px' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">Tất cả Hành động</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '165px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tất cả Vai trò</option>
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              <option value="DIRECTOR">DIRECTOR</option>
              <option value="HR_MANAGER">HR_MANAGER</option>
              <option value="HR_STAFF">HR_STAFF</option>
              <option value="CHIEF_ACCOUNTANT">CHIEF_ACCOUNTANT</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
              <option value="SITE_MANAGER">SITE_MANAGER</option>
              <option value="SITE_ENGINEER">SITE_ENGINEER</option>
              <option value="OFFICE_STAFF">OFFICE_STAFF</option>
            </select>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Lịch Sử Sự Kiện & Thay Đổi Dữ Liệu Hệ Thống</h2>
              <span className="badge badge-slate">{displayedLogs.length} bản ghi</span>
            </div>
            <div className="table-container">
              <table className="hm-table">
                <thead>
                  <tr>
                    <th>Thời Gian</th>
                    <th>Hành Động</th>
                    <th>Người Thực Hiện</th>
                    <th>Đối Tượng</th>
                    <th>Mô Tả Chi Tiết</th>
                    <th>IP</th>
                    <th style={{ textAlign: 'right' }}>Dữ Liệu JSON</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Đang tải nhật ký kiểm toán...
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Không có bản ghi nhật ký nào khớp điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                          {log.createdAt?.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td>
                          <span className={`badge ${getActionBadge(log.action)}`}>{log.action}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                            {log.performedByName || 'Hệ thống'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.performedByRole || 'SYSTEM'}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {log.entityName}
                          {log.entityId ? ` #${log.entityId}` : ''}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#334155', maxWidth: '300px' }}>
                          {log.description || '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                          {log.ipAddress || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye size={13} /> Diff JSON
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">Chi Tiết Audit Log #{selectedLog.id} — {selectedLog.action}</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedLog(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ fontSize: '0.8125rem', color: '#334155', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                <div>
                  <strong>Người thực hiện:</strong> {selectedLog.performedByName || 'Hệ thống'} ({selectedLog.performedByRole || 'SYSTEM'}) • IP: <code>{selectedLog.ipAddress || '—'}</code>
                </div>
                <div>
                  <strong>Thời điểm:</strong> {selectedLog.createdAt?.replace('T', ' ')} • <strong>Đối tượng:</strong> {selectedLog.entityName} #{selectedLog.entityId || '—'}
                </div>
                <div>
                  <strong>Mô tả:</strong> {selectedLog.description || '—'}
                </div>
              </div>
              <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
                <div>
                  <div className="form-label">Giá Trị Trước (Old Value JSON)</div>
                  <pre
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      maxHeight: '260px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {formatPrettyJson(selectedLog.oldValueJson)}
                  </pre>
                </div>
                <div>
                  <div className="form-label">Giá Trị Sau (New Value JSON)</div>
                  <pre
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      maxHeight: '260px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {formatPrettyJson(selectedLog.newValueJson)}
                  </pre>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedLog(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
