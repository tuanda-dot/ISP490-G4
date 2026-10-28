import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Radio,
  KeyRound,
  Plus,
  RefreshCw,
  HardHat,
  Download,
  Search,
  Building,
  Check,
  Copy,
  Share2,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit3,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockProjects, mockEngineerAssignments, mockEmployees, api } from '../services/api';
import type { Project, DailySiteOtp, EngineerAssignment } from '../types';

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const Projects: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  // Role permissions per Context Diagram
  const canConfigProject = ['DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);
  const canGenerateOtp = ['SITE_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);
  const canAssignEngineer = ['HR_STAFF', 'HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProject, setSelectedProject] = useState<Project>(mockProjects[0]);
  const [assignments, setAssignments] = useState<EngineerAssignment[]>(mockEngineerAssignments);
  const [activeOtp, setActiveOtp] = useState<DailySiteOtp>({
    id: 1,
    projectId: 1,
    otpCode: '886699',
    generatedDate: new Date().toISOString().split('T')[0],
    expiresAt: '23:59:59',
    status: 'ACTIVE',
  });
  const [generating, setGenerating] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // New Project Form State
  const [newProject, setNewProject] = useState<Partial<Project>>({
    code: '',
    name: '',
    address: '',
    latitude: 21.0285,
    longitude: 105.8542,
    geofenceRadiusMeters: 200,
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2027-12-31',
  });

  // Assign Engineer Form State
  const [assignForm, setAssignForm] = useState({
    employeeId: 8,
    roleOnSite: 'Kỹ sư Giám sát Kết cấu',
    assignedDate: new Date().toISOString().split('T')[0],
  });

  // Geofence Test Ping State (Interactive test point relative to project center)
  const [testOffsetMeters, setTestOffsetMeters] = useState({ x: 45, y: -60 });

  // Countdown timer to midnight (23:59:59)
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diff = midnight.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate simulated test ping coordinates
  const simulatedLat = selectedProject.latitude + (testOffsetMeters.y / 111111);
  const simulatedLon = selectedProject.longitude + (testOffsetMeters.x / (111111 * Math.cos((selectedProject.latitude * Math.PI) / 180)));
  const calculatedDistance = calculateHaversineDistance(
    simulatedLat,
    simulatedLon,
    selectedProject.latitude,
    selectedProject.longitude
  );
  const isWithinGeofence = calculatedDistance <= selectedProject.geofenceRadiusMeters;

  // Handlers
  const handleGenerateOtp = async (projId: number) => {
    setGenerating(true);
    try {
      const otp = await api.generateOtp(projId, 5); // 5: chihuytruong.phat
      setActiveOtp(otp);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyOtp = () => {
    if (activeOtp) {
      navigator.clipboard.writeText(activeOtp.otpCode);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const handleShareZalo = () => {
    const shareText = `[HMCPS - CÔNG TRƯỜNG HẢI MINH]\nCông trình: ${selectedProject.name} (${selectedProject.code})\nMã OTP Điểm Danh Ngày ${activeOtp.generatedDate}: ${activeOtp.otpCode}\nHiệu lực: đến 23:59:59 hôm nay.\nLưu ý: Kỹ sư phải có mặt trong bán kính ${selectedProject.geofenceRadiusMeters}m của dự án để check-in.`;
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.code) return;
    const created = await api.createProject(newProject);
    setProjects(prev => [...prev, created]);
    setSelectedProject(created);
    setShowAddProjectModal(false);
    setNewProject({
      code: '',
      name: '',
      address: '',
      latitude: 21.0285,
      longitude: 105.8542,
      geofenceRadiusMeters: 200,
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-12-31',
    });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updateProject(selectedProject.id, selectedProject);
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setSelectedProject(updated);
    setShowEditProjectModal(false);
  };

  const handleAssignEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await api.assignEngineer(selectedProject.id, {
      employeeId: assignForm.employeeId,
      roleOnSite: assignForm.roleOnSite,
      assignedDate: assignForm.assignedDate,
    });
    setAssignments(prev => [...prev, created]);
    setShowAssignModal(false);
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedEngineers = assignments.filter(
    a => a.projectId === selectedProject.id && a.status === 'ACTIVE'
  );

  const handleExportProjectsCSV = () => {
    const headers = [
      'STT',
      'Mã Dự Án',
      'Tên Công Trình',
      'Địa Chỉ Thi Công',
      'Vĩ Độ (Latitude)',
      'Kinh Độ (Longitude)',
      'Bán Kính Geofence (m)',
      'Ngày Bắt Đầu',
      'Ngày Dự Kiến Hoàn Thành',
      'Trạng Thái',
      'Số Kỹ Sư Điều Động'
    ];
    const rows = projects.map((p, idx) => {
      const engCount = assignments.filter(a => a.projectId === p.id).length;
      return [
        idx + 1,
        `"${p.code}"`,
        `"${p.name}"`,
        `"${p.address}"`,
        p.latitude,
        p.longitude,
        p.geofenceRadiusMeters,
        `"${p.startDate}"`,
        `"${p.endDate || ''}"`,
        `"${p.status === 'ACTIVE' ? 'Đang thi công' : 'Tạm dừng'}"`,
        engCount
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Danh_Muc_Cong_Trinh_Geofence_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const siteEngineersList = mockEmployees.filter(e => e.employeeType === 'SITE_ENGINEER');

  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Quản Lý Công Trình &amp; Thiết Lập GPS Geofence
          </h1>
          <p className="page-description">
            Thiết lập tọa độ địa lý công trường, kiểm tra bán kính an toàn Geofence (Haversine), phát mã Daily Site OTP và phân công kỹ sư thi công hiện trường (FE-02)
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExportProjectsCSV}>
            <Download size={15} />
            <span>Xuất Danh Sách (.csv)</span>
          </button>
          {canConfigProject && (
            <button className="btn btn-primary" onClick={() => setShowAddProjectModal(true)}>
              <Plus size={15} />
              <span>Thêm Dự Án Mới (Director)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Công Trình Đang Thi Công</span>
            <div className="kpi-icon-wrap">
              <Building size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{projects.filter(p => p.status === 'ACTIVE').length}</div>
          <div className="kpi-subtext">
            Đã cấu hình tọa độ Geofence: <span className="tabular-nums font-medium text-slate-700">{projects.length}/{projects.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Bán Kính Geofence TB</span>
            <div className="kpi-icon-wrap">
              <MapPin size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">
            {Math.round(projects.reduce((acc, p) => acc + (p.geofenceRadiusMeters || 0), 0) / (projects.length || 1))} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>mét</span>
          </div>
          <div className="kpi-subtext">
            Phạm vi từ <span className="tabular-nums font-medium text-slate-700">150m</span> đến <span className="tabular-nums font-medium text-slate-700">500m</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Kỹ Sư Hiện Trường</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
              <HardHat size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">
            {assignments.filter(a => a.status === 'ACTIVE').length} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>kỹ sư</span>
          </div>
          <div className="kpi-subtext">
            Được phân công trực tiếp tại <span className="tabular-nums font-medium text-slate-700">{projects.length}</span> công trường
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Daily Site OTP Hôm Nay</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <KeyRound size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>
            Đang Hiệu Lực
          </div>
          <div className="kpi-subtext">
            Tự hủy sau: <span className="tabular-nums font-mono font-medium text-emerald-700">{timeRemaining || '23:59:59'}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã dự án (DA-...), tên công trình, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trạng Thái:</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="ALL">Tất Cả Trạng Thái</option>
            <option value="ACTIVE">Đang Thi Công</option>
            <option value="COMPLETED">Đã Hoàn Thành</option>
            <option value="SUSPENDED">Tạm Dừng</option>
          </select>
        </div>
      </div>

      {/* 4. Projects Master-Detail Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Left Column: Projects Card List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Danh Sách Công Trình ({filteredProjects.length})
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Nhấp vào thẻ để xem cấu hình Geofence
            </span>
          </div>

          {filteredProjects.map((proj) => {
            const isSelected = selectedProject.id === proj.id;
            const assignedCount = assignments.filter(a => a.projectId === proj.id && a.status === 'ACTIVE').length;

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className="card"
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-primary-subtle)' : '#ffffff',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-500">{proj.code}</span>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {proj.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span className="badge badge-warning tabular-nums">
                      R = {proj.geofenceRadiusMeters}m
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.4rem', height: '24px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(proj);
                        setShowEditProjectModal(true);
                      }}
                      title="Chỉnh sửa công trình"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <MapPin size={13} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.address}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                  <span className="tabular-nums font-mono">
                    Tâm: {proj.latitude.toFixed(4)}° N, {proj.longitude.toFixed(4)}° E
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="tabular-nums font-medium text-slate-600">
                      {assignedCount} kỹ sư
                    </span>
                    <span className="badge badge-success">
                      {proj.status === 'ACTIVE' ? 'Đang thi công' : proj.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Geofence Radar, Daily Site OTP, On-site Engineers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card 1: Technical Geofence Radar & Interactive Haversine Calculator */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Cấu Hình Vùng Geofence: {selectedProject.name}</h2>
                <span className="text-xs text-slate-500">
                  Tâm dự án: <span className="tabular-nums font-mono text-slate-700">{selectedProject.latitude}° N, {selectedProject.longitude}° E</span> • Bán kính hợp lệ: <span className="tabular-nums font-semibold text-blue-600">±{selectedProject.geofenceRadiusMeters}m</span>
                </span>
              </div>
              <span className="badge badge-success">
                <Radio size={11} /> Định Vị Hoạt Động
              </span>
            </div>

            <div className="card-body">
              {/* Interactive Radar Visualizer */}
              <div
                style={{
                  height: '220px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'crosshair',
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left - (rect.width / 2);
                  const clickY = e.clientY - rect.top - (rect.height / 2);
                  // Scale: 1px = (geofenceRadius / 70) meters
                  const scale = (selectedProject.geofenceRadiusMeters || 200) / 70;
                  setTestOffsetMeters({
                    x: Math.round(clickX * scale),
                    y: Math.round(-clickY * scale),
                  });
                }}
                title="Nhấp vào bất kỳ điểm nào trên sơ đồ để kiểm thử khoảng cách GPS điện thoại công nhân"
              >
                {/* Background Grid Lines */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />

                {/* Outer concentric reference ring */}
                <div
                  style={{
                    position: 'absolute',
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    border: '1px dotted #cbd5e1',
                  }}
                />

                {/* Geofence Ring (Scale to 140px diameter) */}
                <div
                  style={{
                    position: 'absolute',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    border: isWithinGeofence ? '1.5px dashed #2563eb' : '1.5px dashed #dc2626',
                    backgroundColor: isWithinGeofence ? 'rgba(37, 99, 235, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                    <div className="text-xs font-semibold" style={{ color: isWithinGeofence ? '#1d4ed8' : '#b91c1c' }}>
                      VÙNG HỢP LỆ
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      R = {selectedProject.geofenceRadiusMeters}m
                    </div>
                  </div>
                </div>

                {/* Center Pin (Project Center) */}
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    border: '2px solid #ffffff',
                    position: 'absolute',
                    zIndex: 2,
                    boxShadow: '0 0 0 2px #93c5fd',
                  }}
                  title="Tọa độ tâm dự án (Project Center)"
                />

                {/* Simulated Worker Location (Test Ping Pin) */}
                {(() => {
                  const scale = (selectedProject.geofenceRadiusMeters || 200) / 70;
                  const pixelX = testOffsetMeters.x / scale;
                  const pixelY = -testOffsetMeters.y / scale;

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(50% + ${pixelX}px - 7px)`,
                        top: `calc(50% + ${pixelY}px - 7px)`,
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: isWithinGeofence ? '#10b981' : '#ef4444',
                        border: '2px solid #ffffff',
                        zIndex: 3,
                        boxShadow: isWithinGeofence ? '0 0 0 3px rgba(16, 185, 129, 0.4)' : '0 0 0 3px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.1s ease',
                      }}
                      title={`Vị trí kiểm thử: Cách tâm ${calculatedDistance}m`}
                    />
                  );
                })()}

                {/* Helper hint */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '8px',
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Nhấp chuột trên sơ đồ để thử nghiệm vị trí GPS di động của kỹ sư
                </div>
              </div>

              {/* Real-time Haversine Audit Result Strip */}
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isWithinGeofence ? 'var(--badge-success-bg)' : 'var(--badge-danger-bg)',
                  border: isWithinGeofence ? '1px solid var(--badge-success-border)' : '1px solid var(--badge-danger-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isWithinGeofence ? (
                    <CheckCircle2 size={16} color="var(--badge-success-text)" />
                  ) : (
                    <AlertTriangle size={16} color="var(--badge-danger-text)" />
                  )}
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: isWithinGeofence ? 'var(--badge-success-text)' : 'var(--badge-danger-text)' }}>
                      {isWithinGeofence ? 'HỢP LỆ TRONG VÙNG GEOFENCE' : 'CẢNH BÁO: NGOÀI BÁN KÍNH CHO PHÉP'}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      Tọa độ test: <span className="tabular-nums font-mono">{simulatedLat.toFixed(5)}° N, {simulatedLon.toFixed(5)}° E</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="tabular-nums font-bold" style={{ fontSize: '1rem', color: isWithinGeofence ? 'var(--badge-success-text)' : 'var(--badge-danger-text)' }}>
                    {calculatedDistance}m
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Giới hạn: <span className="tabular-nums">&lt; {selectedProject.geofenceRadiusMeters}m</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <span>• Thuật toán: <strong>Haversine Great-Circle</strong> (Bán kính $R = 6.371.000m$)</span>
                <span>• Sai số GPS thiết bị di động: <strong className="tabular-nums text-slate-700">&lt; 20m</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2: Daily Site OTP Panel for Site Manager (UC-05) */}
          <div className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} color="#b45309" />
                <div>
                  <h3 className="card-title">Mã OTP Điểm Danh Trong Ngày (Daily Site OTP)</h3>
                  <span className="text-xs text-slate-500">
                    Chỉ huy trưởng sinh mã tại công trường • Kỹ sư phải có mặt trong vùng Geofence
                  </span>
                </div>
              </div>

              {canGenerateOtp ? (
                <button
                  onClick={() => handleGenerateOtp(selectedProject.id)}
                  className="btn btn-secondary btn-sm"
                  disabled={generating}
                >
                  <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                  <span>{generating ? 'Đang tạo...' : 'Sinh Mã Mới (CHT)'}</span>
                </button>
              ) : (
                <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>
                  Do CHT Cung Cấp
                </span>
              )}
            </div>

            <div className="card-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Mã OTP Hiệu Lực Ngày {activeOtp.generatedDate}:
                  </span>
                  <div
                    className="tabular-nums font-mono font-bold text-slate-900"
                    style={{ fontSize: '2rem', letterSpacing: '0.25em', lineHeight: 1.2, marginTop: '2px' }}
                  >
                    {activeOtp.otpCode}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  <span className="badge badge-success">Đang Hoạt Động</span>
                  <div className="text-xs text-slate-500">
                    Tự hủy sau: <span className="tabular-nums font-mono font-medium text-amber-700">{timeRemaining || '23:59:59'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Daily Site OTP */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyOtp}
                  style={{ flex: 1, minWidth: '130px' }}
                >
                  {copiedOtp ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                  <span>{copiedOtp ? 'Đã Sao Chép!' : 'Sao Chép Mã OTP'}</span>
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleShareZalo}
                  style={{ flex: 1, minWidth: '130px' }}
                >
                  {copiedShare ? <Check size={14} color="#047857" /> : <Share2 size={14} />}
                  <span>{copiedShare ? 'Đã Sao Chép Lời Nhắn!' : 'Chia Sẻ Zalo/SMS'}</span>
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowQrModal(true)}
                  style={{ flex: 1, minWidth: '130px' }}
                >
                  <QrCode size={14} />
                  <span>Xem Mã QR Dán Cổng</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Assigned Engineers Table (UC-05) */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Kỹ Sư Hiện Trường Đang Phân Công ({selectedEngineers.length})</h3>
                <span className="text-xs text-slate-500">
                  Danh sách kỹ sư được điều động trực tiếp tại dự án {selectedProject.name}
                </span>
              </div>

              {canAssignEngineer ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAssignModal(true)}
                >
                  <UserPlus size={13} />
                  <span>Điều Động Kỹ Sư (HR)</span>
                </button>
              ) : (
                <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>
                  Phòng HR Điều Động
                </span>
              )}
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Kỹ Sư Hiện Trường</th>
                    <th className="text-left">Vai Trò Tại Công Trường</th>
                    <th className="text-center">Ngày Điều Động</th>
                    <th className="text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEngineers.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        Chưa có kỹ sư nào được điều động tới dự án này.
                      </td>
                    </tr>
                  ) : (
                    selectedEngineers.map((assign) => (
                      <tr key={assign.id}>
                        <td className="text-left">
                          <div className="font-medium text-slate-900">{assign.employeeName}</div>
                          <div className="text-xs text-slate-500 font-mono">{assign.employeeCode}</div>
                        </td>
                        <td className="text-left font-medium text-slate-700">
                          {assign.roleOnSite}
                        </td>
                        <td className="text-center tabular-nums text-slate-600 font-mono text-xs">
                          {assign.assignedDate}
                        </td>
                        <td className="text-center">
                          <span className="badge badge-success">Đang làm việc</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Thêm Dự Án Mới */}
      {showAddProjectModal && (
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
              maxWidth: '560px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Thêm Công Trình / Dự Án Mới
              </h2>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                onClick={() => setShowAddProjectModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Mã Dự Án (DA-...) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: DA-CAUTHE-02"
                    className="form-input font-mono"
                    value={newProject.code || ''}
                    onChange={(e) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Bán Kính Geofence (mét) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={2000}
                    className="form-input tabular-nums"
                    value={newProject.geofenceRadiusMeters || 200}
                    onChange={(e) => setNewProject({ ...newProject, geofenceRadiusMeters: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Tên Công Trình / Gói Thầu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Gói thầu xây dựng Cầu Thạch Hãn 2"
                  className="form-input"
                  value={newProject.name || ''}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Địa Chỉ Công Trường *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Xã Triệu Độ, Huyện Triệu Phong, Tỉnh Quảng Trị"
                  className="form-input"
                  value={newProject.address || ''}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Vĩ Độ Tâm (Latitude) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    className="form-input tabular-nums font-mono"
                    value={newProject.latitude || 21.0285}
                    onChange={(e) => setNewProject({ ...newProject, latitude: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Kinh Độ Tâm (Longitude) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    className="form-input tabular-nums font-mono"
                    value={newProject.longitude || 105.8542}
                    onChange={(e) => setNewProject({ ...newProject, longitude: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Ngày Khởi Công
                  </label>
                  <input
                    type="date"
                    className="form-input font-mono"
                    value={newProject.startDate || ''}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Ngày Hoàn Thành Dự Kiến
                  </label>
                  <input
                    type="date"
                    className="form-input font-mono"
                    value={newProject.endDate || ''}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddProjectModal(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu &amp; Kích Hoạt Dự Án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Điều Động Kỹ Sư Hiện Trường (UC-05) */}
      {showAssignModal && (
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
              maxWidth: '500px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Điều Động Kỹ Sư: {selectedProject.code}
              </h2>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                onClick={() => setShowAssignModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAssignEngineer}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Chọn Kỹ Sư Hiện Trường *
                </label>
                <select
                  className="form-select"
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: Number(e.target.value) })}
                  style={{ width: '100%' }}
                >
                  {siteEngineersList.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.fullName} ({eng.employeeCode}) - {eng.position}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Vai Trò / Trách Nhiệm Tại Dự Án *
                </label>
                <select
                  className="form-select"
                  value={assignForm.roleOnSite}
                  onChange={(e) => setAssignForm({ ...assignForm, roleOnSite: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="Chỉ huy phó công trường">Chỉ huy phó công trường</option>
                  <option value="Kỹ sư Giám sát Kết cấu">Kỹ sư Giám sát Kết cấu</option>
                  <option value="Kỹ sư Cơ điện (MEP)">Kỹ sư Cơ điện (MEP)</option>
                  <option value="Cán bộ An toàn Lao động (HSE)">Cán bộ An toàn Lao động (HSE)</option>
                  <option value="Kỹ sư Dự toán & Khối lượng QS">Kỹ sư Dự toán & Khối lượng QS</option>
                  <option value="Kỹ sư Trắc địa Hiện trường">Kỹ sư Trắc địa Hiện trường</option>
                  <option value="Kỹ sư Vật tư & Thiết bị">Kỹ sư Vật tư & Thiết bị</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Ngày Bắt Đầu Điều Động *
                </label>
                <input
                  type="date"
                  required
                  className="form-input font-mono"
                  value={assignForm.assignedDate}
                  onChange={(e) => setAssignForm({ ...assignForm, assignedDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác Nhận Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Chỉnh Sửa Dự Án */}
      {showEditProjectModal && (
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
              maxWidth: '520px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Chỉnh Sửa Dự Án: {selectedProject.code}
              </h2>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                onClick={() => setShowEditProjectModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateProject}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Tên Công Trình
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Địa Chỉ
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedProject.address || ''}
                  onChange={(e) => setSelectedProject({ ...selectedProject, address: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Bán Kính Geofence (m)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    className="form-input tabular-nums font-mono"
                    value={selectedProject.geofenceRadiusMeters}
                    onChange={(e) => setSelectedProject({ ...selectedProject, geofenceRadiusMeters: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Trạng Thái
                  </label>
                  <select
                    className="form-select"
                    value={selectedProject.status}
                    onChange={(e) => setSelectedProject({ ...selectedProject, status: e.target.value as 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' })}
                    style={{ width: '100%' }}
                  >
                    <option value="ACTIVE">Đang Thi Công</option>
                    <option value="COMPLETED">Đã Hoàn Thành</option>
                    <option value="SUSPENDED">Tạm Dừng</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditProjectModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Cập Nhật Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QR Code Trực Quan Để Dán Cửa Lán Trại */}
      {showQrModal && (
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
              maxWidth: '380px',
              padding: '1.5rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge badge-primary font-mono">{selectedProject.code}</span>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.4rem', height: '24px' }}
                onClick={() => setShowQrModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {selectedProject.name}
            </div>
            <p className="text-xs text-slate-500" style={{ marginBottom: '1rem' }}>
              Quét mã QR bằng App Chấm công Mobile để xác thực Daily Site OTP
            </p>

            {/* High-Resolution SVG QR Code Matrix */}
            <div
              style={{
                width: '190px',
                height: '190px',
                margin: '0 auto 1rem auto',
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="166" height="166" viewBox="0 0 166 166" fill="none">
                {/* Corner Finder Square Top-Left */}
                <rect x="2" y="2" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="8" y="8" width="34" height="34" rx="4" fill="#ffffff" />
                <rect x="15" y="15" width="20" height="20" rx="3" fill="#0f172a" />

                {/* Corner Finder Square Top-Right */}
                <rect x="118" y="2" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="124" y="8" width="34" height="34" rx="4" fill="#ffffff" />
                <rect x="131" y="15" width="20" height="20" rx="3" fill="#0f172a" />

                {/* Corner Finder Square Bottom-Left */}
                <rect x="2" y="118" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="8" y="124" width="34" height="34" rx="4" fill="#ffffff" />
                <rect x="15" y="131" width="20" height="20" rx="3" fill="#0f172a" />

                {/* Data Grid Bits Simulated */}
                <rect x="58" y="10" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="10" width="10" height="10" fill="#0f172a" />
                <rect x="98" y="10" width="10" height="10" fill="#0f172a" />
                <rect x="58" y="26" width="10" height="10" fill="#0f172a" />
                <rect x="86" y="26" width="10" height="10" fill="#0f172a" />
                <rect x="58" y="42" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="42" width="10" height="10" fill="#0f172a" />
                <rect x="98" y="42" width="10" height="10" fill="#0f172a" />

                {/* Middle Data Bars */}
                <rect x="10" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="26" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="42" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="58" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="58" width="18" height="18" rx="3" fill="#2563eb" />
                <rect x="98" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="122" y="58" width="10" height="10" fill="#0f172a" />
                <rect x="146" y="58" width="10" height="10" fill="#0f172a" />

                <rect x="10" y="74" width="10" height="10" fill="#0f172a" />
                <rect x="34" y="74" width="10" height="10" fill="#0f172a" />
                <rect x="106" y="74" width="10" height="10" fill="#0f172a" />
                <rect x="130" y="74" width="10" height="10" fill="#0f172a" />

                <rect x="10" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="26" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="58" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="98" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="122" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="146" y="90" width="10" height="10" fill="#0f172a" />

                {/* Bottom-Right Data Bits */}
                <rect x="58" y="118" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="118" width="10" height="10" fill="#0f172a" />
                <rect x="98" y="118" width="10" height="10" fill="#0f172a" />
                <rect x="122" y="118" width="10" height="10" fill="#0f172a" />
                <rect x="58" y="134" width="10" height="10" fill="#0f172a" />
                <rect x="90" y="134" width="10" height="10" fill="#0f172a" />
                <rect x="114" y="134" width="10" height="10" fill="#0f172a" />
                <rect x="138" y="134" width="10" height="10" fill="#0f172a" />
                <rect x="74" y="150" width="10" height="10" fill="#0f172a" />
                <rect x="98" y="150" width="10" height="10" fill="#0f172a" />
                <rect x="130" y="150" width="10" height="10" fill="#0f172a" />
              </svg>
            </div>

            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
              <div className="text-xs text-slate-500">Mã OTP Hôm Nay:</div>
              <div className="tabular-nums font-mono font-bold text-slate-900" style={{ fontSize: '1.375rem', letterSpacing: '0.2em' }}>
                {activeOtp.otpCode}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                alert('Đang gửi lệnh in phiếu QR Code ra máy in công trường Hải Minh');
              }}
            >
              In Phiếu Dán Cổng Công Trường
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
