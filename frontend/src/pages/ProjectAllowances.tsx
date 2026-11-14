import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Building2,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Layers,
  Scale,
  Calculator,
  Check,
  Clock
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, sharedState } from '../services/api';
import type { SiteProjectAllowanceConfig } from '../types';
import { canRoleAccessPath } from '../utils/rbac';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const getTodayIso = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTomorrowIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ProjectAllowances: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const canManageAllowances = ['HR_MANAGER', 'CHIEF_ACCOUNTANT', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  const defaultSiteProjectAllowances: Record<string, SiteProjectAllowanceConfig> = {
    'DA-NHATTAN2': {
      projectName: 'Dự Án Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      siteLodging: 3000000,
      hazard: 1500000,
      projectResponsibilitySM: 2000000,
      projectResponsibilityEng: 500000,
      nightShiftAllowance: 800000,
      applyMode: 'ACTIVE',
      status: 'ACTIVE',
      effectiveDate: '2026-10-01',
      autoScheduleTime: '00:00 (GMT+7)',
      securityPolicy: 'STRICT_DIEU_95_BLLD',
      version: 'v2026.1',
      updatedBy: 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: '01/10/2026 08:30:00',
      hasExplicitOverride: false,
      activeSnapshot: {
        siteLodging: 3000000,
        hazard: 1500000,
        projectResponsibilitySM: 2000000,
        projectResponsibilityEng: 500000,
        nightShiftAllowance: 800000,
      },
      engineers: [
        { code: 'HM-005', name: 'Nguyễn Lê Gia Phát', role: 'Chỉ Huy Trưởng', customLodging: 3000000, customHazard: 1500000, customResp: 2000000 },
        { code: 'HM-006', name: 'Trần Văn Trung', role: 'Kỹ Sư Giám Sát Kết Cấu', customLodging: 3000000, customHazard: 1500000, customResp: 500000 },
        { code: 'HM-008', name: 'Đặng Hoàng Nam', role: 'Kỹ Sư An Toàn HSE', customLodging: 3000000, customHazard: 1500000, customResp: 500000 },
        { code: 'HM-009', name: 'Bùi Thanh Tùng', role: 'Kỹ Sư Giám Sát Kết Cấu', customLodging: 3000000, customHazard: 1500000, customResp: 500000 },
      ],
    },
    'DA-LANDMARK': {
      projectName: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
      siteLodging: 2500000,
      hazard: 1200000,
      projectResponsibilitySM: 1500000,
      projectResponsibilityEng: 500000,
      nightShiftAllowance: 600000,
      applyMode: 'ACTIVE',
      status: 'ACTIVE',
      effectiveDate: '2026-10-01',
      autoScheduleTime: '00:00 (GMT+7)',
      securityPolicy: 'STRICT_DIEU_95_BLLD',
      version: 'v2026.1',
      updatedBy: 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: '01/10/2026 08:30:00',
      hasExplicitOverride: false,
      activeSnapshot: {
        siteLodging: 2500000,
        hazard: 1200000,
        projectResponsibilitySM: 1500000,
        projectResponsibilityEng: 500000,
        nightShiftAllowance: 600000,
      },
      engineers: [
        { code: 'HM-010', name: 'Vũ Đức Thắng', role: 'Kỹ Sư Cơ Điện (MEP)', customLodging: 2500000, customHazard: 1200000, customResp: 500000 },
        { code: 'HM-011', name: 'Ngô Quang Huy', role: 'Kỹ Sư Dự Toán & Khối Lượng QS', customLodging: 2500000, customHazard: 1200000, customResp: 500000 },
        { code: 'HM-014', name: 'Đặng Tuấn Tú', role: 'Kỹ Sư Hiện Trường Tập Sự', customLodging: 2500000, customHazard: 1200000, customResp: 0 },
      ],
    },
    'DA-CAOTOC-BN': {
      projectName: 'Gói Thầu 04 - Cao Tốc Bắc Nam (Diễn Châu - Bãi Vọt)',
      siteLodging: 3500000,
      hazard: 1800000,
      projectResponsibilitySM: 2200000,
      projectResponsibilityEng: 700000,
      nightShiftAllowance: 900000,
      applyMode: 'ACTIVE',
      status: 'ACTIVE',
      effectiveDate: '2026-10-01',
      autoScheduleTime: '00:00 (GMT+7)',
      securityPolicy: 'STRICT_DIEU_95_BLLD',
      version: 'v2026.1',
      updatedBy: 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: '01/10/2026 08:30:00',
      hasExplicitOverride: false,
      activeSnapshot: {
        siteLodging: 3500000,
        hazard: 1800000,
        projectResponsibilitySM: 2200000,
        projectResponsibilityEng: 700000,
        nightShiftAllowance: 900000,
      },
      engineers: [
        { code: 'HM-007', name: 'Phạm Thành Nam', role: 'Kỹ Sư Cơ Điện MEP', customLodging: 3500000, customHazard: 1800000, customResp: 700000 },
        { code: 'HM-012', name: 'Dương Văn Lâm', role: 'Kỹ Sư Trắc Địa Hiện Trường', customLodging: 3500000, customHazard: 1800000, customResp: 700000 },
        { code: 'HM-013', name: 'Trần Minh Quân', role: 'Kỹ Sư Vật Tư & Thiết Bị', customLodging: 3500000, customHazard: 1800000, customResp: 700000 },
      ],
    },
  };

  const [siteProjectAllowances, setSiteProjectAllowances] = useState<Record<string, SiteProjectAllowanceConfig>>(() =>
    sharedState.getSiteProjectAllowances(defaultSiteProjectAllowances)
  );
  const [selectedSiteProject, setSelectedSiteProject] = useState<'DA-NHATTAN2' | 'DA-LANDMARK' | 'DA-CAOTOC-BN'>('DA-NHATTAN2');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getBf10State().then(() => {
      const fromShared = sharedState.getSiteProjectAllowances();
      if (fromShared && Object.keys(fromShared).length > 0) {
        setSiteProjectAllowances(fromShared);
      }
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentProjCfg = siteProjectAllowances[selectedSiteProject] || defaultSiteProjectAllowances['DA-NHATTAN2'];

  const updateSelectedProjectDraft = (partial: Partial<SiteProjectAllowanceConfig>) => {
    setSiteProjectAllowances((prev) => ({
      ...prev,
      [selectedSiteProject]: {
        ...prev[selectedSiteProject],
        ...partial,
      },
    }));
  };

  // Step 4 (BF-10): Lưu & Kích Hoạt Cho Dự Án
  const handleSaveProjectAllowanceAllocation = async () => {
    if (!canManageAllowances) {
      alert('Bạn không có quyền thiết lập phụ cấp dự án! Quyền này thuộc HR Manager và Kế Toán Trưởng.');
      return;
    }
    const proj = siteProjectAllowances[selectedSiteProject];
    if (
      isNaN(Number(proj.siteLodging)) || Number(proj.siteLodging) < 0 ||
      isNaN(Number(proj.hazard)) || Number(proj.hazard) < 0 ||
      isNaN(Number(proj.projectResponsibilitySM)) || Number(proj.projectResponsibilitySM) < 0 ||
      isNaN(Number(proj.projectResponsibilityEng)) || Number(proj.projectResponsibilityEng) < 0
    ) {
      alert('Lỗi dữ liệu: Định mức phụ cấp dự án công trường (Lưu trú, Độc hại, Trách nhiệm) không được nhỏ hơn 0 VNĐ!');
      return;
    }

    const mode = proj.applyMode || 'ACTIVE';
    const todayIso = getTodayIso();
    const effDate = proj.effectiveDate || (mode === 'PENDING' ? getTomorrowIso() : todayIso);
    if (mode === 'PENDING' && effDate <= todayIso) {
      alert(
        `Lỗi hẹn giờ hiệu lực: Khi chọn hình thức "Hẹn giờ kích hoạt (Status: Pending)", Ngày hiệu lực (${effDate}) bắt buộc phải là ngày trong tương lai (> ${todayIso})!`
      );
      return;
    }

    const nowStr = new Date().toLocaleString('vi-VN');
    const updatedEngineers = (proj.engineers || []).map((eng) => ({
      ...eng,
      customLodging: Number(proj.siteLodging),
      customHazard: Number(proj.hazard),
      customResp: eng.role.includes('Chỉ Huy Trưởng')
        ? Number(proj.projectResponsibilitySM)
        : eng.role.includes('Tập Sự')
        ? 0
        : Number(proj.projectResponsibilityEng),
    }));

    const nextProjConfig: SiteProjectAllowanceConfig = {
      ...proj,
      siteLodging: Number(proj.siteLodging),
      hazard: Number(proj.hazard),
      projectResponsibilitySM: Number(proj.projectResponsibilitySM),
      projectResponsibilityEng: Number(proj.projectResponsibilityEng),
      applyMode: mode,
      status: mode,
      effectiveDate: effDate,
      autoScheduleTime: proj.autoScheduleTime || '00:00 (GMT+7)',
      securityPolicy: proj.securityPolicy || 'STRICT_DIEU_95_BLLD',
      version: 'v2026.2',
      updatedBy: user?.fullName || 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: nowStr,
      hasExplicitOverride: true,
      activeSnapshot:
        mode === 'ACTIVE'
          ? {
              siteLodging: Number(proj.siteLodging),
              hazard: Number(proj.hazard),
              projectResponsibilitySM: Number(proj.projectResponsibilitySM),
              projectResponsibilityEng: Number(proj.projectResponsibilityEng),
              nightShiftAllowance: Number(proj.nightShiftAllowance || 800000),
            }
          : proj.activeSnapshot,
      engineers: updatedEngineers,
    };

    const nextAllProjects = {
      ...siteProjectAllowances,
      [selectedSiteProject]: nextProjConfig,
    };

    setSiteProjectAllowances(nextAllProjects);
    sharedState.setSiteProjectAllowances(nextAllProjects);
    await api.saveBf10State({
      siteProjectAllowances: nextAllProjects,
      updatedBy: user?.fullName || 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: nowStr,
    });

    showToast(`Đã lưu và đồng bộ hạn mức phụ cấp đặc thù hiện trường cho dự án ${proj.projectName || selectedSiteProject}!`);
  };

  const handleActivateScheduledProjectNow = async () => {
    const proj = siteProjectAllowances[selectedSiteProject];
    const nowStr = new Date().toLocaleString('vi-VN');
    const todayIso = getTodayIso();

    const nextProjConfig: SiteProjectAllowanceConfig = {
      ...proj,
      status: 'ACTIVE',
      applyMode: 'ACTIVE',
      effectiveDate: todayIso,
      updatedBy: user?.fullName || 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: nowStr,
      activeSnapshot: {
        siteLodging: Number(proj.siteLodging),
        hazard: Number(proj.hazard),
        projectResponsibilitySM: Number(proj.projectResponsibilitySM),
        projectResponsibilityEng: Number(proj.projectResponsibilityEng),
        nightShiftAllowance: Number(proj.nightShiftAllowance || 800000),
      },
    };

    const nextAllProjects = {
      ...siteProjectAllowances,
      [selectedSiteProject]: nextProjConfig,
    };

    setSiteProjectAllowances(nextAllProjects);
    sharedState.setSiteProjectAllowances(nextAllProjects);
    await api.saveBf10State({
      siteProjectAllowances: nextAllProjects,
      updatedBy: user?.fullName || 'Nguyễn Thu Giang (Trưởng Phòng HR)',
      updatedAt: nowStr,
    });
    showToast(`Đã kích hoạt tức thời định mức phụ cấp cho dự án ${proj.projectName}!`);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <NavLink to="/payroll" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
              <ArrowLeft size={13} />
              <span>Bảng Lương 8 Cột</span>
            </NavLink>
            <span className="badge badge-primary">Chính Sách Phụ Cấp Công Trường</span>
            <span className="badge badge-success">Miễn Đóng BHXH (BLLĐ 2026)</span>
          </div>
          <h1 className="page-title">
            Quản Lý Phụ Cấp Công Trường &amp; Gán Dự Án
          </h1>
          <p className="page-description">
            Cấu hình định mức 7 loại phụ cấp đặc thù thi công công trình xây dựng (Lưu trú, Độc hại, Trách nhiệm gói thầu) cho nhóm Kỹ sư và Chỉ huy trưởng theo từng dự án
          </p>
        </div>

        <div className="header-actions">
          {canRoleAccessPath(currentRole, '/salary-formula') && (
            <NavLink to="/salary-formula" className="btn btn-secondary btn-sm">
              <Layers size={14} />
              <span>Xem Bộ Công Thức Lương</span>
            </NavLink>
          )}
          {canManageAllowances && (
            <button
              data-testid="btn-save-project-allowance"
              onClick={handleSaveProjectAllowanceAllocation}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#047857', borderColor: '#047857' }}
            >
              {currentProjCfg.applyMode === 'PENDING' ? <Clock size={14} /> : <Check size={14} />}
              <span>
                Lưu &amp; Kích Hoạt Cho Dự Án
                {currentProjCfg.applyMode === 'PENDING' ? ' (Hẹn Giờ Pending)' : ''}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation tabs (Phân hệ Quy Định & Định Mức Lương) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1rem',
          overflowX: 'auto',
        }}
      >
        <NavLink
          to="/compliance"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <Scale size={14} />
          <span>Chính Sách Luật LĐ &amp; BHXH</span>
        </NavLink>

        <NavLink
          to="/salary-scales"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <Layers size={14} />
          <span>Thang Bảng Lương Doanh Nghiệp</span>
        </NavLink>

        <NavLink
          to="/project-allowances"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <HardHat size={14} />
          <span>Phụ Cấp Công Trường &amp; Gán Dự Án</span>
        </NavLink>

        {canRoleAccessPath(currentRole, '/salary-formula') && (
          <NavLink
            to="/salary-formula"
            style={({ isActive }) => ({
              padding: '0.45rem 0.9rem',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 500,
              borderRadius: '6px',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : '#475569',
              backgroundColor: isActive ? '#2563eb' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            })}
          >
            <Calculator size={14} />
            <span>Bộ Công Thức Lương &amp; Sandbox Mô Phỏng</span>
          </NavLink>
        )}
      </div>

      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner Chính Sách Miễn Thuế & BHXH */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.8125rem',
          color: '#1e40af',
        }}
      >
        <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
        <div>
          <strong>Chính Sách Ưu Đãi Lao Động Xây Lắp (Thông tư 200 &amp; BLLĐ 2026):</strong> Các khoản phụ cấp lưu trú công trường, phụ cấp độc hại rung ồn và phụ cấp trách nhiệm công trình phục vụ trực tiếp cho hoạt động thi công hiện trường được <strong>MIỄN TRÍCH NỘP BHXH</strong> và tối ưu hóa thuế TNCN cho kỹ sư công trường.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BƯỚC 4, 5 & 6 (BF-10): GÁN PHỤ CẤP ĐẶC THÙ HIỆN TRƯỜNG & HẸN GIỜ HIỆU LỰC */}
      {/* ========================================================================= */}
      <div className="card" style={{ border: '1px solid #fed7aa', backgroundColor: '#fffdfa', marginBottom: '1.25rem' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #ffedd5', backgroundColor: '#fff7ed', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: '#fed7aa', color: '#c2410c' }}>
              <HardHat size={18} />
            </div>
            <div>
              <h3 className="card-title" style={{ color: '#9a3412', fontSize: '0.9375rem' }}>
                Bước 4: Gán Phụ Cấp Đặc Thù Hiện Trường Cho Kỹ Sư Theo Từng Dự Án
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ea580c', margin: 0 }}>
                HR Manager / KT Trưởng thiết lập định mức lưu trú, độc hại, trách nhiệm gói thầu &amp; chọn hình thức áp dụng ngay hoặc hẹn giờ kích hoạt tự động (TK 627)
              </p>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Live Cross-Actor Sync & Version Status Banner */}
          <div
            data-testid="bf10-project-version-banner"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: currentProjCfg.status === 'PENDING' ? '#fffbeb' : '#f0fdf4',
              border: currentProjCfg.status === 'PENDING' ? '1px solid #fcd34d' : '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span
                data-testid="bf10-status-badge"
                className={`badge ${currentProjCfg.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {currentProjCfg.status === 'PENDING'
                  ? `Status: Pending (Hẹn giờ hiệu lực: ${currentProjCfg.effectiveDate})`
                  : 'Status: Active (Đang áp dụng tức thời)'}
              </span>
              <span className="badge badge-info font-mono" style={{ fontSize: '0.75rem' }}>
                Phiên bản: {currentProjCfg.version || 'v2026.1'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#334155' }}>
                Cập nhật bởi: <strong>{currentProjCfg.updatedBy || 'Nguyễn Thu Giang (Trưởng Phòng HR)'}</strong> lúc{' '}
                <span className="font-mono text-xs">{currentProjCfg.updatedAt || '01/10/2026 08:30:00'}</span>
              </span>
            </div>

            {currentProjCfg.status === 'PENDING' && canManageAllowances && (
              <button
                onClick={handleActivateScheduledProjectNow}
                className="btn btn-sm btn-secondary"
                style={{ borderColor: '#16a34a', color: '#15803d', backgroundColor: '#ffffff' }}
              >
                <CheckCircle2 size={13} />
                <span>Kích Hoạt Ngay (Active)</span>
              </button>
            )}
          </div>

          {/* Project Picker */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', marginBottom: '1.15rem', padding: '0.85rem 1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="#b45309" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#78350f' }}>Chọn Công Trình / Dự Án:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedSiteProject('DA-NHATTAN2')}
                className={`btn btn-sm ${selectedSiteProject === 'DA-NHATTAN2' ? 'btn-primary' : 'btn-secondary'}`}
              >
                DA-NHATTAN2: Cầu Nhật Tân 2
              </button>
              <button
                onClick={() => setSelectedSiteProject('DA-LANDMARK')}
                className={`btn btn-sm ${selectedSiteProject === 'DA-LANDMARK' ? 'btn-primary' : 'btn-secondary'}`}
              >
                DA-LANDMARK: Tòa Tháp Landmark Hải Minh
              </button>
              <button
                onClick={() => setSelectedSiteProject('DA-CAOTOC-BN')}
                className={`btn btn-sm ${selectedSiteProject === 'DA-CAOTOC-BN' ? 'btn-primary' : 'btn-secondary'}`}
              >
                DA-CAOTOC-BN: Cao Tốc Bắc Nam
              </button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#92400e' }}>
              Dự án đang chọn: <strong>{currentProjCfg.projectName}</strong>
            </div>
          </div>

          {/* Allowance inputs for this project */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.9rem', marginBottom: '1.15rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>
                Phụ cấp Lưu trú công trường (VNĐ):
              </label>
              <input
                data-testid="input-project-lodging"
                type="number"
                min={0}
                step="100000"
                className="form-input tabular-nums font-semibold"
                disabled={!canManageAllowances}
                value={currentProjCfg.siteLodging}
                onChange={(e) => updateSelectedProjectDraft({ siteLodging: Number(e.target.value) })}
                style={{
                  width: '100%',
                  display: 'block',
                  backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>Miễn BHXH &amp; Miễn Thuế TNCN</span>
                <strong className="tabular-nums text-emerald-700">{formatVND(Number(currentProjCfg.siteLodging || 0))}</strong>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>
                Phụ cấp Độc hại / Nặng nhọc (VNĐ):
              </label>
              <input
                data-testid="input-project-hazard"
                type="number"
                min={0}
                step="100000"
                className="form-input tabular-nums font-semibold"
                disabled={!canManageAllowances}
                value={currentProjCfg.hazard}
                onChange={(e) => updateSelectedProjectDraft({ hazard: Number(e.target.value) })}
                style={{
                  width: '100%',
                  display: 'block',
                  backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>Thi công trên cao / hầm chui</span>
                <strong className="tabular-nums text-emerald-700">{formatVND(Number(currentProjCfg.hazard || 0))}</strong>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>
                Trách nhiệm Chỉ huy trưởng (VNĐ):
              </label>
              <input
                data-testid="input-project-resp-sm"
                type="number"
                min={0}
                step="100000"
                className="form-input tabular-nums font-semibold"
                disabled={!canManageAllowances}
                value={currentProjCfg.projectResponsibilitySM}
                onChange={(e) => updateSelectedProjectDraft({ projectResponsibilitySM: Number(e.target.value) })}
                style={{
                  width: '100%',
                  display: 'block',
                  backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>Chỉ huy công trường, an toàn</span>
                <strong className="tabular-nums text-blue-700">{formatVND(Number(currentProjCfg.projectResponsibilitySM || 0))}</strong>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>
                Trách nhiệm Kỹ sư hiện trường (VNĐ):
              </label>
              <input
                data-testid="input-project-resp-eng"
                type="number"
                min={0}
                step="100000"
                className="form-input tabular-nums font-semibold"
                disabled={!canManageAllowances}
                value={currentProjCfg.projectResponsibilityEng}
                onChange={(e) => updateSelectedProjectDraft({ projectResponsibilityEng: Number(e.target.value) })}
                style={{
                  width: '100%',
                  display: 'block',
                  backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>Kỹ sư giám sát / kết cấu / MEP</span>
                <strong className="tabular-nums text-blue-700">{formatVND(Number(currentProjCfg.projectResponsibilityEng || 0))}</strong>
              </div>
            </div>
          </div>

          {/* Decision Mode Selection */}
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.95rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                  Hình thức áp dụng phiên bản:
                </label>
                <select
                  data-testid="select-project-apply-mode"
                  className="form-select"
                  disabled={!canManageAllowances}
                  value={currentProjCfg.applyMode || 'ACTIVE'}
                  onChange={(e) => {
                    const mode = e.target.value as 'ACTIVE' | 'PENDING';
                    updateSelectedProjectDraft({
                      applyMode: mode,
                      status: mode,
                      effectiveDate:
                        mode === 'PENDING'
                          ? (!currentProjCfg.effectiveDate || currentProjCfg.effectiveDate <= getTodayIso()
                              ? getTomorrowIso()
                              : currentProjCfg.effectiveDate)
                          : getTodayIso(),
                    });
                  }}
                >
                  <option value="ACTIVE">Áp dụng ngay — Kích hoạt tức thời (Status: Active)</option>
                  <option value="PENDING">Hẹn giờ — Lưu trạng thái Chờ hiệu lực (Status: Pending)</option>
                </select>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                  Ngày hiệu lực (Effective Date):
                </label>
                <input
                  data-testid="input-project-effective-date"
                  type="date"
                  className="form-input"
                  disabled={!canManageAllowances}
                  value={currentProjCfg.effectiveDate || getTodayIso()}
                  onChange={(e) => updateSelectedProjectDraft({ effectiveDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Engineers Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Danh sách Kỹ sư công trường phân bổ vào dự án ({currentProjCfg.engineers?.length || 0} kỹ sư):
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hạch toán chi phí: <strong className="font-mono text-slate-800">TK 627</strong> (Miễn 100% BHXH)
            </span>
          </div>

          <div className="table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '95px' }}>Mã NV</th>
                  <th className="text-left">Họ và Tên</th>
                  <th className="text-left">Chức Danh Hiện Trường</th>
                  <th className="text-right" style={{ width: '140px' }}>PC Lưu Trú</th>
                  <th className="text-right" style={{ width: '140px' }}>PC Độc Hại</th>
                  <th className="text-right" style={{ width: '145px' }}>PC Trách Nhiệm</th>
                  <th className="text-right" style={{ width: '175px' }}>Tổng PC Dự Án (TK 627)</th>
                  <th className="text-center" style={{ width: '145px' }}>Trạng Thái Áp Dụng</th>
                </tr>
              </thead>
              <tbody>
                {(currentProjCfg.engineers || []).map((eng) => {
                  const totalEng = (eng.customLodging || 0) + (eng.customHazard || 0) + (eng.customResp || 0);
                  return (
                    <tr key={eng.code}>
                      <td className="text-left font-mono font-semibold text-xs text-blue-700">{eng.code}</td>
                      <td className="text-left font-semibold text-slate-800">{eng.name}</td>
                      <td className="text-left">
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{eng.role}</span>
                      </td>
                      <td className="text-right tabular-nums">{formatVND(eng.customLodging || 0)}</td>
                      <td className="text-right tabular-nums">{formatVND(eng.customHazard || 0)}</td>
                      <td className="text-right tabular-nums">{formatVND(eng.customResp || 0)}</td>
                      <td className="text-right tabular-nums font-bold text-emerald-700">{formatVND(totalEng)}</td>
                      <td className="text-center">
                        <span className={`badge ${currentProjCfg.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.6875rem' }}>
                          {currentProjCfg.status === 'PENDING' ? `Hẹn giờ (${currentProjCfg.effectiveDate})` : 'Đang hiệu lực'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
