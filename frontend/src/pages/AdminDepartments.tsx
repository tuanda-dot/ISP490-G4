import React, { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import type { DepartmentItem } from '../types';

const FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 1,
    code: 'DEPT-BOD',
    name: 'Ban Giám Đốc & Điều Hành',
    address: 'Tầng 12, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội',
    latitude: 21.0285,
    longitude: 105.7829,
    geofenceRadiusMeters: 200,
    description: 'Khối lãnh đạo phê duyệt ngân sách & định hướng chiến lược.',
  },
  {
    id: 2,
    code: 'DEPT-HR',
    name: 'Phòng Nhân Sự & Tiền Lương',
    address: 'Tầng 8, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội',
    latitude: 21.0285,
    longitude: 105.7829,
    geofenceRadiusMeters: 200,
    description: 'Quản lý hồ sơ lao động, hợp đồng và bảng công văn phòng.',
  },
  {
    id: 3,
    code: 'DEPT-ACC',
    name: 'Phòng Kế Toán & Tài Chính',
    address: 'Tầng 9, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội',
    latitude: 21.0285,
    longitude: 105.7829,
    geofenceRadiusMeters: 200,
    description: 'Vận hành kỳ lương, bóc tách chi phí dự án và hạch toán MISA/FAST.',
  },
  {
    id: 4,
    code: 'DEPT-SITE',
    name: 'Khối Thi Công Công Trường',
    address: 'Ban Điều Hành Dự Án Công Trường Hải Minh',
    latitude: 21.0925,
    longitude: 105.8175,
    geofenceRadiusMeters: 150,
    description: 'Chỉ huy trưởng và đội ngũ kỹ sư trực tiếp thi công tại hiện trường.',
  },
];

export const AdminDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    latitude: '21.0285',
    longitude: '105.7829',
    geofenceRadiusMeters: '200',
    description: '',
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'MOCK_TOKEN_LOCAL_MODE' || msg.includes('Network Error')) {
        setDepartments(FALLBACK_DEPARTMENTS);
      } else {
        showFeedback('error', msg || 'Không thể tải danh sách phòng ban.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setForm({
      code: '',
      name: '',
      address: 'Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội',
      latitude: '21.0285',
      longitude: '105.7829',
      geofenceRadiusMeters: '200',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setForm({
      code: dept.code || '',
      name: dept.name || '',
      address: dept.address || '',
      latitude: dept.latitude !== undefined && dept.latitude !== null ? String(dept.latitude) : '21.0285',
      longitude: dept.longitude !== undefined && dept.longitude !== null ? String(dept.longitude) : '105.7829',
      geofenceRadiusMeters:
        dept.geofenceRadiusMeters !== undefined && dept.geofenceRadiusMeters !== null
          ? String(dept.geofenceRadiusMeters)
          : '200',
      description: dept.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Mã phòng ban và Tên phòng ban.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<DepartmentItem> = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        geofenceRadiusMeters: form.geofenceRadiusMeters ? Number(form.geofenceRadiusMeters) : 200,
        description: form.description.trim() || undefined,
      };
      if (editingDept) {
        const updated = await api.updateDepartment(editingDept.id, payload);
        setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showFeedback('success', `Đã cập nhật phòng ban ${updated.name} (${updated.code}).`);
      } else {
        const created = await api.createDepartment(payload);
        setDepartments((prev) => [...prev, created]);
        showFeedback('success', `Đã tạo mới phòng ban ${created.name} (${created.code}).`);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu thông tin phòng ban.';
      showFeedback('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (!window.confirm(`Xác nhận xóa phòng ban "${dept.name}" (${dept.code})?`)) return;
    try {
      await api.deleteDepartment(dept.id);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
      showFeedback('success', `Đã xóa phòng ban ${dept.code}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa phòng ban.';
      showFeedback('error', msg);
    }
  };

  const avgRadius = departments.length
    ? Math.round(departments.reduce((acc, d) => acc + (d.geofenceRadiusMeters || 200), 0) / departments.length)
    : 200;

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Cơ Cấu Phòng Ban &amp; Tọa Độ Geofence Trụ Sở</h1>
          <p className="page-subtitle">
            Thiết lập đơn vị tổ chức, địa chỉ làm việc và bán kính định vị GPS chuẩn WGS-84 phục vụ gắn kết tài khoản người dùng.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchDepartments} disabled={loading}>
            <RefreshCw size={15} /> Làm mới
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={15} /> Thêm Phòng Ban
          </button>
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
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: toast.type === 'success' ? '#047857' : '#b91c1c',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{toast.text}</span>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setToast(null)}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Tổng Số Phòng Ban</div>
          <div className="kpi-value">{departments.length}</div>
          <div className="kpi-meta">Đơn vị thuộc HMCPS 2026</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bán Kính Geofence TB</div>
          <div className="kpi-value">{avgRadius} m</div>
          <div className="kpi-meta">Chuẩn vùng an toàn chấm công HQ</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Hệ Quy Chiếu GPS</div>
          <div className="kpi-value" style={{ fontSize: '1.15rem', color: '#1d4ed8' }}>
            WGS-84
          </div>
          <div className="kpi-meta">Haversine Great-Circle</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Danh Sách Đơn Vị Tổ Chức & Trụ Sở</h2>
          <span className="badge badge-info">{departments.length} phòng ban</span>
        </div>
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th>Mã ĐV</th>
                <th>Tên Phòng Ban & Mô Tả</th>
                <th>Trưởng Phòng Duy Nhất</th>
                <th>Địa Chỉ Làm Việc</th>
                <th>Tọa Độ WGS-84 & Geofence</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Đang tải cơ cấu phòng ban...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Chưa có phòng ban nào được thiết lập.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>
                        {dept.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building2 size={15} color="#2563eb" /> {dept.name}
                      </div>
                      {dept.description && (
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {dept.description}
                        </div>
                      )}
                    </td>
                    <td>
                      {dept.managerName ? (
                        <div style={{ fontSize: '0.8125rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{dept.managerName}</div>
                          {dept.managerCode && (
                            <span className="badge badge-info" style={{ fontSize: '0.68rem', fontFamily: 'monospace', marginTop: '2px' }}>
                              {dept.managerCode} • 1 Trưởng phòng
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>Chưa gán Trưởng phòng</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} color="#64748b" />
                        <span>{dept.address || 'Chưa cập nhật địa chỉ'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0f172a' }}>
                        <Compass size={13} style={{ display: 'inline', marginRight: '0.3rem' }} />
                        {dept.latitude ?? 21.0285}, {dept.longitude ?? 105.7829}
                      </div>
                      <span className="badge badge-success" style={{ marginTop: '0.25rem' }}>
                        Bán kính {dept.geofenceRadiusMeters ?? 200}m
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEditModal(dept)}>
                          <Edit3 size={13} /> Sửa
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(dept)}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">
                {editingDept ? `Chỉnh Sửa Phòng Ban — ${editingDept.code}` : 'Thêm Phòng Ban Mới'}
              </h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="card-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Mã Phòng Ban *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="VD: DEPT-IT"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên Phòng Ban *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Phòng Hạ Tầng & CNTT"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Địa Chỉ Làm Việc</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Vĩ Độ (Latitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={form.latitude}
                    onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kinh Độ (Longitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={form.longitude}
                    onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bán Kính Geofence (mét)</label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  className="form-input"
                  value={form.geofenceRadiusMeters}
                  onChange={(e) => setForm((p) => ({ ...p, geofenceRadiusMeters: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mô Tả Chức Năng</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingDept ? 'Lưu Thay Đổi' : 'Tạo Phòng Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
