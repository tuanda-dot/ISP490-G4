import React, { useState, useEffect } from 'react';
import {
  Layers,
  Scale,
  Building2,
  Edit2,
  X,
  Search,
  Filter,
  ArrowLeft,
  HardHat,
  Calculator,
  Info
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, sharedState } from '../services/api';
import type { SalaryScaleGrade } from '../types';
import { canRoleAccessPath } from '../utils/rbac';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const SalaryScales: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const canManageSalaryScales = ['HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  const defaultSalaryScales: SalaryScaleGrade[] = [
    // Khối Văn Phòng HQ (TK 642)
    {
      id: 1,
      scaleCode: 'VP-QL-01',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1 (Mới bổ nhiệm)',
      baseSalary: 25000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ (2.5M) bắt buộc đóng BHXH',
      description: 'Áp dụng cho Trưởng phòng HR, Kế toán trưởng, Giám đốc Dự án',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 2,
      scaleCode: 'VP-QL-02',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 2,
      levelName: 'Bậc 2 (Thâm niên 2-4 năm)',
      baseSalary: 28500000,
      coefficient: 1.14,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ (2.5M) bắt buộc đóng BHXH',
      description: 'Quản lý có năng lực điều hành xuất sắc, hoàn thành KPI trên 95%',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 3,
      scaleCode: 'VP-QL-03',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 3,
      levelName: 'Bậc 3 (Chuyên gia cao cấp / Lãnh đạo)',
      baseSalary: 32000000,
      coefficient: 1.28,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ đóng BHXH (áp trần 46.8M)',
      description: 'Lãnh đạo phòng ban chiến lược với hơn 5 năm cống hiến',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 4,
      scaleCode: 'VP-CV-01',
      scaleName: 'Chuyên Viên Chính Văn Phòng (HR, Kế Toán Tổng Hợp)',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 16000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Chuyên viên thực hiện độc lập mảng nghiệp vụ chuyên sâu',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 5,
      scaleCode: 'VP-CV-02',
      scaleName: 'Chuyên Viên Chính Văn Phòng (HR, Kế Toán Tổng Hợp)',
      category: 'OFFICE',
      level: 2,
      levelName: 'Bậc 2',
      baseSalary: 18500000,
      coefficient: 1.156,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Chuyên viên chính có trên 3 năm kinh nghiệm',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 6,
      scaleCode: 'VP-NV-01',
      scaleName: 'Chuyên Viên / Nhân Viên Hành Chính Nghiệp Vụ',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 10000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Nhân viên lễ tân, hành chính, văn thư lưu trữ',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    // Khối Kỹ Sư Hiện Trường Công Trường (TK 627)
    {
      id: 7,
      scaleCode: 'CT-CHT-01',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1 (Công trình cấp II-III)',
      baseSalary: 26000000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng điều hành dự án dưới 150 tỷ đồng',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 8,
      scaleCode: 'CT-CHT-02',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 2,
      levelName: 'Bậc 2 (Đại dự án cấp I, trên 150 tỷ)',
      baseSalary: 30000000,
      coefficient: 1.154,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng điều hành Cầu Nhật Tân 2, Landmark Hải Minh',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 9,
      scaleCode: 'CT-CHT-03',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 3,
      levelName: 'Bậc 3 (Chỉ huy trưởng cấp Tập đoàn)',
      baseSalary: 35000000,
      coefficient: 1.346,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng các công trình trọng điểm quốc gia',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 10,
      scaleCode: 'CT-KS-01',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1 (Kỹ sư giám sát tiêu chuẩn)',
      baseSalary: 12000000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư trực tiếp bám hiện trường, chỉ đạo các tổ đội thi công',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 11,
      scaleCode: 'CT-KS-02',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 2,
      levelName: 'Bậc 2 (Kỹ sư kinh nghiệm 2-4 năm)',
      baseSalary: 14500000,
      coefficient: 1.208,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư an toàn HSE chính, Kỹ sư kết cấu trưởng gói thầu',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 12,
      scaleCode: 'CT-KS-03',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 3,
      levelName: 'Bậc 3 (Kỹ sư thâm niên cao)',
      baseSalary: 17000000,
      coefficient: 1.417,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Chủ trì thiết kế hiện trường, xử lý sự cố kết cấu phức tạp',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
    {
      id: 13,
      scaleCode: 'CT-TAPSU-01',
      scaleName: 'Kỹ Sư Hiện Trường Mới Ra Trường (Tập Sự)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 8500000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư thực tập và kỹ sư tốt nghiệp loại khá/giỏi năm đầu',
      status: 'ACTIVE',
      effectiveDate: '2026-01-01',
    },
  ];

  const [salaryScales, setSalaryScales] = useState<SalaryScaleGrade[]>(() =>
    sharedState.getSalaryScales(defaultSalaryScales)
  );

  const [editingScale, setEditingScale] = useState<SalaryScaleGrade | null>(null);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'OFFICE' | 'SITE'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getBf10State().then(() => {
      setSalaryScales(sharedState.getSalaryScales(defaultSalaryScales));
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveScale = () => {
    if (!canManageSalaryScales) {
      alert('Bạn không có quyền chỉnh sửa thang bảng lương! Quyền này thuộc Trưởng Phòng Nhân Sự.');
      return;
    }
    if (!editingScale) return;

    if (!editingScale.scaleName || !editingScale.scaleName.trim() || !editingScale.levelName || !editingScale.levelName.trim()) {
      alert('Lỗi: Tên ngạch lương và Bậc lương không được để trống!');
      return;
    }
    if (isNaN(Number(editingScale.baseSalary)) || Number(editingScale.baseSalary) < 5310000) {
      alert('Vi phạm pháp luật lao động: Mức lương cơ bản theo ngạch bậc không được thấp hơn mức lương tối thiểu Vùng I (5.310.000 VNĐ/tháng theo NĐ 74/2024/NĐ-CP)!');
      return;
    }

    const updated = salaryScales.map((s) => (s.id === editingScale.id ? { ...editingScale } : s));
    setSalaryScales(updated);
    sharedState.setSalaryScales(updated);
    api.saveBf10State({ salaryScales: updated });
    setEditingScale(null);
    showToast(`Đã lưu cập nhật bậc lương ${editingScale.scaleCode} thành công!`);
  };

  const filteredScales = salaryScales.filter((s) => {
    const matchesCategory = filterCategory === 'ALL' || s.category === filterCategory;
    const matchesSearch =
      s.scaleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scaleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.levelName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const officeScalesCount = salaryScales.filter((s) => s.category === 'OFFICE').length;
  const siteScalesCount = salaryScales.filter((s) => s.category === 'SITE').length;

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
            <span className="badge badge-primary">Quy Chuẩn Thang Lương Doanh Nghiệp</span>
            <span className="badge badge-success">Áp Sàn Vùng I (5.310.000đ)</span>
          </div>
          <h1 className="page-title">
            Hệ Thống Thang Bảng Lương &amp; Ngạch Bậc Chuẩn Doanh Nghiệp
          </h1>
          <p className="page-description">
            Quản trị 13 ngạch bậc lương chuẩn phân ngạch Chi phí Quản lý DN (TK 642) vs Chi phí Sản xuất Chung / Nhân công Công trường (TK 627 / 622)
          </p>
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

      {/* KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            TỔNG SỐ NGẠCH BẬC LƯƠNG
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>
            {salaryScales.length} ngạch bậc
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Văn phòng: {officeScalesCount} • Hiện trường: {siteScalesCount}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            MỨC LƯƠNG NGẠCH CAO NHẤT
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857' }}>
            35.000.000 đ
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Bậc 3 Chỉ Huy Trưởng Cấp Tập Đoàn (CT-CHT-03)
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            MỨC LƯƠNG NGẠCH KHỞI ĐIỂM
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309' }}>
            8.500.000 đ
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Cao hơn sàn Vùng I 60.1% (&gt; 5.31M)
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            TUÂN THỦ PHÁP LUẬT LAO ĐỘNG
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
            100% ĐẠT CHUẨN
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Căn cứ NĐ 74/2024/NĐ-CP &amp; Luật BHXH 2024
          </div>
        </div>
      </div>

      {/* Info Banner when user has read-only access */}
      {!canManageSalaryScales && (
        <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Info size={14} color="#64748b" />
          <span>Chế độ xem thang bảng lương ngạch bậc chuẩn (TK 642 vs TK 627). Quyền cấu hình và cập nhật thuộc về <strong>Trưởng Phòng Nhân Sự (HR Manager)</strong> &amp; Quản trị viên.</span>
        </div>
      )}

      {/* Note Banner */}
      <div className="alert-banner alert-banner-info" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Building2 size={18} color="#2563eb" />
          <div style={{ fontSize: '0.8125rem' }}>
            <strong>Quy tắc đóng BHXH theo ngạch bậc (Luật BHXH 2024 &amp; BLLĐ 2019):</strong>
            <div style={{ marginTop: '0.15rem', color: 'var(--text-body)' }}>
              • <strong>Khối Văn Phòng (TK 642):</strong> Nền đóng BHXH = Lương cơ bản theo bậc + Phụ cấp chức vụ quản lý + Phụ cấp thâm niên (kẹp trần 46.8M).<br />
              • <strong>Khối Kỹ Sư Hiện Trường (TK 627):</strong> Nền đóng BHXH = <em>Lương cơ bản theo bậc duy nhất!</em> Toàn bộ phụ cấp lưu trú công trường (3M), độc hại nguy hiểm (1.5M), phụ cấp trách nhiệm dự án (2M) được <strong>miễn 100% bảo hiểm</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} />
              <span>Phân ngạch:</span>
            </span>
            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`btn btn-sm ${filterCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Tất Cả ({salaryScales.length})
              </button>
              <button
                onClick={() => setFilterCategory('OFFICE')}
                className={`btn btn-sm ${filterCategory === 'OFFICE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Văn Phòng TK 642 ({officeScalesCount})
              </button>
              <button
                onClick={() => setFilterCategory('SITE')}
                className={`btn btn-sm ${filterCategory === 'SITE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Hiện Trường TK 627 ({siteScalesCount})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Tìm mã ngạch, tên chức danh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem', fontSize: '0.8125rem', width: '240px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Salary Scales Table */}
      <div className="card">
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '110px' }}>Mã Ngạch</th>
                <th className="text-left">Tên Ngạch &amp; Vị Trí Công Việc</th>
                <th className="text-center" style={{ width: '140px' }}>Khối / Hạch Toán</th>
                <th className="text-center" style={{ width: '100px' }}>Bậc Lương</th>
                <th className="text-right" style={{ width: '160px' }}>Lương Cơ Bản</th>
                <th className="text-center" style={{ width: '80px' }}>Hệ Số</th>
                <th className="text-left">Nguyên Tắc Đóng BHXH</th>
                {canManageSalaryScales && <th className="text-center" style={{ width: '80px' }}>Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredScales.map((scale) => (
                <tr key={scale.id}>
                  <td className="text-left font-mono text-xs font-semibold text-slate-800">{scale.scaleCode}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{scale.scaleName}</div>
                    <div className="text-xs text-slate-500">{scale.description}</div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${scale.category === 'OFFICE' ? 'badge-primary' : 'badge-warning'}`}>
                      {scale.category === 'OFFICE' ? 'Văn Phòng (TK 642)' : 'Công Trường (TK 627)'}
                    </span>
                  </td>
                  <td className="text-center font-medium text-slate-800">
                    <div>{scale.levelName}</div>
                    {scale.status === 'PENDING' && (
                      <span className="badge badge-warning" style={{ fontSize: '0.625rem', marginTop: '0.2rem' }}>
                        Chờ HL: {scale.effectiveDate}
                      </span>
                    )}
                  </td>
                  <td className="text-right tabular-nums font-bold text-slate-900" style={{ fontSize: '0.875rem' }}>
                    {formatVND(scale.baseSalary)}
                  </td>
                  <td className="text-center tabular-nums font-mono text-slate-700">{scale.coefficient.toFixed(2)}</td>
                  <td className="text-left text-xs">
                    <span className={scale.category === 'OFFICE' ? 'text-blue-700 font-medium' : 'text-emerald-700 font-medium'}>
                      {scale.insuranceRule}
                    </span>
                  </td>
                  {canManageSalaryScales && (
                    <td className="text-center">
                      <button
                        onClick={() => setEditingScale({ ...scale })}
                        className="btn btn-sm btn-secondary"
                        title="Chỉnh sửa bậc lương này"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chỉnh Sửa Ngạch Bậc Lương */}
      {editingScale && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#2563eb" />
                <h3 className="modal-title">Chỉnh Sửa Ngạch Bậc Lương: {editingScale.scaleCode}</h3>
              </div>
              <button onClick={() => setEditingScale(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="form-label font-semibold">Tên Ngạch Lương:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingScale.scaleName}
                  onChange={(e) => setEditingScale({ ...editingScale, scaleName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label font-semibold">Bậc Lương:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingScale.levelName}
                    onChange={(e) => setEditingScale({ ...editingScale, levelName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label font-semibold">Mức Lương Cơ Bản (VNĐ):</label>
                  <input
                    type="number"
                    min="5310000"
                    step="100000"
                    className="form-input"
                    value={editingScale.baseSalary}
                    onChange={(e) => setEditingScale({ ...editingScale, baseSalary: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Tối thiểu Vùng I: 5.310.000 VNĐ
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label font-semibold">Hệ Số Lương:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    className="form-input"
                    value={editingScale.coefficient}
                    onChange={(e) => setEditingScale({ ...editingScale, coefficient: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="form-label font-semibold">Tài Khoản Hạch Toán:</label>
                  <select
                    className="form-select"
                    value={editingScale.accountCode}
                    onChange={(e) => setEditingScale({ ...editingScale, accountCode: e.target.value as any })}
                  >
                    <option value="TK_642">TK 642 — Chi phí quản lý doanh nghiệp (Văn phòng)</option>
                    <option value="TK_627">TK 627 — Chi phí sản xuất chung (Công trường)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label font-semibold">Nguyên Tắc Đóng BHXH:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingScale.insuranceRule}
                  onChange={(e) => setEditingScale({ ...editingScale, insuranceRule: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label font-semibold">Mô Tả Tiêu Chuẩn Năng Lực:</label>
                <textarea
                  rows={2}
                  className="form-input"
                  value={editingScale.description}
                  onChange={(e) => setEditingScale({ ...editingScale, description: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingScale(null)} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button onClick={handleSaveScale} className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
