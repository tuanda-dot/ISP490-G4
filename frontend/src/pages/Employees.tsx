import React, { useEffect, useState } from 'react';
import {
  Search,
  AlertTriangle,
  ScanFace,
  CheckCircle,
  Plus,
  Eye,
  Camera,
  Download,
  Users,
  Building,
  HardHat,
  Clock,
  CheckCircle2,
  FileSignature
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, mockEmployees, mockExpiringContracts } from '../services/api';
import type { Employee, Contract, EmployeeType } from '../types';

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const canManageEmployees = ['HR_STAFF', 'HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);
  const isHR = canManageEmployees;

  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>(mockExpiringContracts);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | EmployeeType>('ALL');
  const [faceFilter, setFaceFilter] = useState<'ALL' | 'REGISTERED' | 'UNREGISTERED'>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renewContract, setRenewContract] = useState<Contract | null>(null);
  const [showFaceModal, setShowFaceModal] = useState<Employee | null>(null);
  const [faceEnrollSuccess, setFaceEnrollSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Employee Form State
  const [newEmpForm, setNewEmpForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    citizenId: '',
    departmentId: 1,
    employeeType: 'OFFICE_STAFF' as EmployeeType,
    position: 'Chuyên Viên Văn Phòng',
    baseSalary: 20000000,
    dependentsCount: 0,
    isUnionMember: true,
    contractType: 'OFFICIAL_DEFINITE',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '2027-10-31',
    siteLodgingAllowance: 3000000,
    hazardAllowance: 1500000,
  });

  // Contract Renewal Form State
  const [renewForm, setRenewForm] = useState({
    newEndDate: '2027-12-31',
    newBaseSalary: 26000000,
    appendixNumber: 'PL-01/HDLD-2026',
    newContractType: 'OFFICIAL_DEFINITE',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, expRes] = await Promise.all([
          api.getEmployees(),
          api.getExpiringContracts(30),
        ]);
        setEmployees(empRes);
        setExpiringContracts(expRes);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || emp.employeeType === typeFilter;
    const matchesFace =
      faceFilter === 'ALL' ||
      (faceFilter === 'REGISTERED' && emp.isFaceRegistered) ||
      (faceFilter === 'UNREGISTERED' && !emp.isFaceRegistered);

    return matchesSearch && matchesType && matchesFace;
  });

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleEnrollFace = async (empId: number) => {
    await api.registerFaceId(empId, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'vector_128_simulated');
    setFaceEnrollSuccess(true);
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, isFaceRegistered: true } : e))
    );
    showToast('Đã trích xuất đặc trưng Vector 128-d và lưu Face ID thành công!');
    setTimeout(() => {
      setFaceEnrollSuccess(false);
      setShowFaceModal(null);
    }, 1200);
  };

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpForm.fullName || !newEmpForm.email || !newEmpForm.citizenId) {
      alert('Vui lòng điền đầy đủ Họ tên, Email và Số CCCD/CMND.');
      return;
    }

    const created = await api.createEmployee({
      fullName: newEmpForm.fullName,
      email: newEmpForm.email,
      phone: newEmpForm.phone,
      citizenId: newEmpForm.citizenId,
      departmentId: Number(newEmpForm.departmentId),
      employeeType: newEmpForm.employeeType,
      position: newEmpForm.position,
      baseSalary: Number(newEmpForm.baseSalary),
      dependentsCount: Number(newEmpForm.dependentsCount),
      isUnionMember: newEmpForm.isUnionMember,
      hireDate: newEmpForm.contractStartDate,
      contractType: newEmpForm.contractType,
      contractEndDate: newEmpForm.contractEndDate,
    });

    setEmployees((prev) => [...prev, created]);
    setIsAddModalOpen(false);
    showToast(`Đã thêm mới nhân sự ${created.fullName} (${created.employeeCode}) thành công!`);

    // Reset form
    setNewEmpForm({
      fullName: '',
      email: '',
      phone: '',
      citizenId: '',
      departmentId: 1,
      employeeType: 'OFFICE_STAFF',
      position: 'Chuyên Viên Văn Phòng',
      baseSalary: 20000000,
      dependentsCount: 0,
      isUnionMember: true,
      contractType: 'OFFICIAL_DEFINITE',
      contractStartDate: new Date().toISOString().split('T')[0],
      contractEndDate: '2027-10-31',
      siteLodgingAllowance: 3000000,
      hazardAllowance: 1500000,
    });
  };

  const handleRenewContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewContract) return;

    await api.extendContract(renewContract.id, renewForm.newEndDate, Number(renewForm.newBaseSalary));

    // Remove from expiring list
    setExpiringContracts((prev) => prev.filter((c) => c.id !== renewContract.id));

    // Update employee salary in table
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === renewContract.employeeId ? { ...e, baseSalary: Number(renewForm.newBaseSalary) } : e
      )
    );

    setRenewContract(null);
    showToast(`Đã gia hạn hợp đồng ${renewContract.contractNumber} thành công đến ${renewForm.newEndDate}!`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Mã Nhân Viên',
      'Họ Và Tên',
      'Email Cơ Quan',
      'Số Điện Thoại',
      'Số CCCD / Định Danh',
      'Chức Danh',
      'Phân Khối',
      'Hạch Toán Kế Toán',
      'Lương Cơ Bản (VND)',
      'Số NPT',
      'Đoàn Viên',
      'Trạng Thái Face ID',
    ];

    const rows = employees.map((e) => [
      e.employeeCode,
      `"${e.fullName}"`,
      e.email,
      e.phone || '',
      `'${e.citizenId || ''}`,
      `"${e.position || ''}"`,
      e.employeeType === 'OFFICE_STAFF' ? 'Khối Văn Phòng' : 'Kỹ Sư Công Trường',
      e.employeeType === 'OFFICE_STAFF' ? 'TK 642' : 'TK 627',
      isHR ? e.baseSalary : '****** (Bảo mật HR)',
      isHR ? e.dependentsCount : '*',
      e.isUnionMember ? 'Có' : 'Không',
      e.isFaceRegistered ? 'Đã đăng ký' : 'Chưa đăng ký',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HMCPS_Danh_Sach_Nhan_Su_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công tệp danh sách nhân sự định dạng Excel/CSV!');
  };

  const totalOffice = employees.filter((e) => e.employeeType === 'OFFICE_STAFF').length;
  const totalSite = employees.filter((e) => e.employeeType === 'SITE_ENGINEER').length;

  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Quản Lý Hồ Sơ Nhân Sự &amp; Hợp Đồng Lao Động (FE-01 / UC-01 &rarr; UC-04)
          </h1>
          <p className="page-description">
            Cơ sở dữ liệu nhân sự tập trung, phân loại hạch toán chi phí TK 642 (Văn phòng) vs TK 627 (Công trường) và cảnh báo thời hạn HĐLĐ theo BLLĐ 2026
          </p>
        </div>

        <div className="header-actions">
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Xuất Excel / CSV</span>
          </button>
          {canManageEmployees && (
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
              <Plus size={15} />
              <span>Thêm Mới Nhân Viên (HR)</span>
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
            <span className="kpi-label">Tổng Quy Mô Nhân Lực</span>
            <div className="kpi-icon-wrap">
              <Users size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{employees.length}</div>
          <div className="kpi-subtext">
            Hợp đồng đang có hiệu lực: <span className="tabular-nums font-medium text-slate-700">{employees.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Khối Văn Phòng (TK 642)</span>
            <div className="kpi-icon-wrap" style={{ color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <Building size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{totalOffice}</div>
          <div className="kpi-subtext">
            Chiếm <span className="tabular-nums font-medium text-slate-700">{((totalOffice / employees.length) * 100).toFixed(1)}%</span> cơ cấu toàn công ty
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Kỹ Sư Hiện Trường (TK 627)</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
              <HardHat size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{totalSite}</div>
          <div className="kpi-subtext">
            Triển khai tại <span className="tabular-nums font-medium text-slate-700">3</span> đại dự án công trình
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">HĐ Sắp Hết Hạn (&le; 30 Ngày)</span>
            <div className="kpi-icon-wrap" style={{ color: '#b91c1c', backgroundColor: '#fef2f2' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#b91c1c' }}>
            {expiringContracts.length}
          </div>
          <div className="kpi-subtext">Cần ký gia hạn phụ lục hợp đồng</div>
        </div>
      </div>

      {/* Expiring Contracts Alert Banner (UC-03) */}
      {expiringContracts.length > 0 && (
        <div className="alert-banner alert-banner-warning">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <AlertTriangle size={18} color="#b45309" />
            <div>
              <strong>Cảnh báo thời hạn HĐLĐ (UC-03):</strong> Có <span className="tabular-nums font-semibold">{expiringContracts.length}</span> hợp đồng lao động sắp hết hạn trong vòng 30 ngày (
              {expiringContracts.map((c) => {
                const emp = employees.find((e) => e.id === c.employeeId);
                return `${emp ? emp.fullName : 'NV'} (${c.contractNumber}) - Hết hạn: ${c.endDate}`;
              }).join('; ')}).
            </div>
          </div>
          {canManageEmployees && (
            <button
              onClick={() => setRenewContract(expiringContracts[0])}
              className="btn btn-sm btn-secondary"
              style={{ backgroundColor: '#ffffff', color: '#b45309', borderColor: '#fde68a' }}
            >
              <FileSignature size={13} />
              <span>Ký Gia Hạn Hợp Đồng (HR)</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã NV, họ tên, email, chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phân Loại Khối:</label>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ minWidth: '160px' }}
          >
            <option value="ALL">Tất Cả ({employees.length})</option>
            <option value="OFFICE_STAFF">Văn Phòng ({totalOffice})</option>
            <option value="SITE_ENGINEER">Kỹ Sư Công Trường ({totalSite})</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trạng Thái Face ID:</label>
          <select
            className="form-select"
            value={faceFilter}
            onChange={(e) => setFaceFilter(e.target.value as any)}
            style={{ minWidth: '150px' }}
          >
            <option value="ALL">Tất Cả</option>
            <option value="REGISTERED">Đã Đăng Ký Face ID</option>
            <option value="UNREGISTERED">Chưa Có Dữ Liệu</option>
          </select>
        </div>
      </div>

      {/* 4. High Data Density Table */}
      <div className="table-container">
        <table className="hm-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: '90px' }}>Mã NV</th>
              <th className="text-left">Họ Và Tên</th>
              <th className="text-left">Chức Danh / Vị Trí</th>
              <th className="text-center">Phân Khối / Hạch Toán</th>
              <th className="text-right">Mức Lương Cơ Bản</th>
              <th className="text-center">Số NPT</th>
              <th className="text-center">Dữ Liệu Face ID</th>
              <th className="text-center">Trạng Thái</th>
              <th className="text-right" style={{ width: '140px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => {
              const hasExpiringContract = expiringContracts.some((c) => c.employeeId === emp.id);
              return (
                <tr key={emp.id}>
                  <td className="text-left font-mono font-medium text-slate-700">{emp.employeeCode}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{emp.fullName}</div>
                    <div className="text-xs text-slate-500">{emp.email}</div>
                  </td>
                  <td className="text-left text-slate-700">{emp.position || 'Nhân viên'}</td>
                  <td className="text-center">
                    {emp.employeeType === 'OFFICE_STAFF' ? (
                      <span className="badge badge-info">Văn Phòng (TK 642)</span>
                    ) : (
                      <span className="badge badge-warning">Kỹ Sư CT (TK 627)</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums font-medium text-slate-900">
                    {isHR ? (
                      formatVND(emp.baseSalary)
                    ) : (
                      <span className="badge badge-slate" title="Thông tin bảo mật cá nhân theo Điều 95 BLLĐ">
                        •••••••• ₫
                      </span>
                    )}
                  </td>
                  <td className="text-center tabular-nums text-slate-700">
                    {emp.dependentsCount}
                  </td>
                  <td className="text-center">
                    {emp.isFaceRegistered ? (
                      <span className="badge badge-success">
                        <CheckCircle size={11} /> Vector 128-d
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowFaceModal(emp)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.6875rem' }}
                      >
                        <Camera size={11} /> Quét Mặt
                      </button>
                    )}
                  </td>
                  <td className="text-center">
                    {hasExpiringContract ? (
                      <span className="badge badge-danger">Sắp hết hạn HĐ</span>
                    ) : (
                      <span className="badge badge-success">Đang công tác</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      {hasExpiringContract && (
                        <button
                          onClick={() => {
                            const target = expiringContracts.find((c) => c.employeeId === emp.id);
                            if (target) setRenewContract(target);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Gia hạn hợp đồng"
                          style={{ color: '#b45309' }}
                        >
                          <FileSignature size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="btn btn-secondary btn-sm"
                        title="Xem chi tiết hồ sơ & HĐLĐ"
                      >
                        <Eye size={12} /> Chi Tiết
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Add New Employee (UC-01) */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Thêm Mới Hồ Sơ Nhân Sự &amp; HĐLĐ Ban Đầu (UC-01)
                </h3>
                <span className="text-xs text-slate-500">Phân định rõ ràng hạch toán chi phí TK 642 vs TK 627</span>
              </div>
              <span className="badge badge-primary">Tuyển Dụng Mới</span>
            </div>

            <form onSubmit={handleAddEmployeeSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Họ và Tên Nhân Sự (*):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nguyễn Văn A"
                      required
                      value={newEmpForm.fullName}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Email Cơ Quan (*):
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="vanna@haiminh.vn"
                      required
                      value={newEmpForm.email}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Số CCCD / Định Danh (12 số) (*):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="001099xxxxxx"
                      required
                      maxLength={12}
                      value={newEmpForm.citizenId}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, citizenId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Số Điện Thoại Liên Lạc:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="0901234xxx"
                      value={newEmpForm.phone}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Phân Loại Khối Lao Động (*):
                    </label>
                    <select
                      className="form-select"
                      value={newEmpForm.employeeType}
                      onChange={(e) => setNewEmpForm({
                        ...newEmpForm,
                        employeeType: e.target.value as EmployeeType,
                        position: e.target.value === 'SITE_ENGINEER' ? 'Kỹ Sư Giám Sát Hiện Trường' : 'Chuyên Viên Văn Phòng',
                        departmentId: e.target.value === 'SITE_ENGINEER' ? 4 : 1,
                      })}
                    >
                      <option value="OFFICE_STAFF">Khối Văn Phòng Trụ Sở (TK 642)</option>
                      <option value="SITE_ENGINEER">Kỹ Sư Hiện Trường Công Trình (TK 627)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Chức Danh Công Tác:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={newEmpForm.position}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, position: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Mức Lương Cơ Bản (VNĐ/Tháng) (*):
                    </label>
                    <input
                      type="number"
                      step={500000}
                      className="form-input"
                      value={newEmpForm.baseSalary}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, baseSalary: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Người Phụ Thuộc (NPT):
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={newEmpForm.dependentsCount}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, dependentsCount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Thông Tin Hợp Đồng Lao Động Ban Đầu (BLLĐ 2026):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span className="text-xs text-slate-500">Loại HĐLĐ:</span>
                      <select
                        className="form-select"
                        value={newEmpForm.contractType}
                        onChange={(e) => setNewEmpForm({ ...newEmpForm, contractType: e.target.value })}
                      >
                        <option value="PROBATION">Thử việc (02 tháng)</option>
                        <option value="OFFICIAL_DEFINITE">Xác định thời hạn (12-36T)</option>
                        <option value="OFFICIAL_INDEFINITE">Không xác định thời hạn</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Ngày hiệu lực:</span>
                      <input
                        type="date"
                        className="form-input"
                        value={newEmpForm.contractStartDate}
                        onChange={(e) => setNewEmpForm({ ...newEmpForm, contractStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Ngày hết hạn:</span>
                      <input
                        type="date"
                        className="form-input"
                        value={newEmpForm.contractEndDate}
                        onChange={(e) => setNewEmpForm({ ...newEmpForm, contractEndDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {newEmpForm.employeeType === 'SITE_ENGINEER' && (
                  <div style={{ padding: '0.65rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: '0.4rem' }}>
                      Phụ Cấp Công Trường Đặc Thù (Miễn Đóng BHXH theo Luật BHXH 2024):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <span className="text-xs text-amber-900">Phụ cấp lưu trú:</span>
                        <input
                          type="number"
                          className="form-input"
                          value={newEmpForm.siteLodgingAllowance}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, siteLodgingAllowance: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-amber-900">Phụ cấp độc hại / nguy hiểm:</span>
                        <input
                          type="number"
                          className="form-input"
                          value={newEmpForm.hazardAllowance}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, hazardAllowance: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} />
                  <span>Lưu Hồ Sơ Nhân Sự</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Renew Contract (UC-03) */}
      {renewContract && (
        <div className="modal-backdrop" onClick={() => setRenewContract(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Ký Gia Hạn Hợp Đồng Lao Động (UC-03)
                </h3>
                <span className="text-xs text-slate-500">Mã hợp đồng: {renewContract.contractNumber}</span>
              </div>
              <span className="badge badge-warning">Gia Hạn HĐ</span>
            </div>

            <form onSubmit={handleRenewContractSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span className="text-xs text-slate-500">Nhân sự thụ hưởng:</span>
                    <div className="font-semibold text-slate-900">
                      {employees.find((e) => e.id === renewContract.employeeId)?.fullName || 'Cán bộ'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Ngày hết hạn hiện tại:</span>
                    <div className="font-mono tabular-nums font-semibold text-rose-700">{renewContract.endDate}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Loại Hợp Đồng Sau Gia Hạn:
                  </label>
                  <select
                    className="form-select"
                    value={renewForm.newContractType}
                    onChange={(e) => setRenewForm({ ...renewForm, newContractType: e.target.value })}
                  >
                    <option value="OFFICIAL_DEFINITE">HĐLĐ Có Thời Hạn (12-36 Tháng - Lần 2)</option>
                    <option value="OFFICIAL_INDEFINITE">HĐLĐ Không Xác Định Thời Hạn (Chuyển tiếp vô thời hạn)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Thời Hạn Mới (Ngày Hết Hạn):
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={renewForm.newEndDate}
                      onChange={(e) => setRenewForm({ ...renewForm, newEndDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                      Mức Lương Mới Điều Chỉnh:
                    </label>
                    <input
                      type="number"
                      step={500000}
                      className="form-input"
                      value={renewForm.newBaseSalary}
                      onChange={(e) => setRenewForm({ ...renewForm, newBaseSalary: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                    Số Phụ Lục HĐ Ký Kết Kèm Theo:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={renewForm.appendixNumber}
                    onChange={(e) => setRenewForm({ ...renewForm, appendixNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setRenewContract(null)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <FileSignature size={14} />
                  <span>Xác Nhận Ký Gia Hạn HĐLĐ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Employee Detail (UC-02) */}
      {selectedEmployee && (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Hồ Sơ Nhân Sự Chi Tiết: {selectedEmployee.fullName}
                </h3>
                <span className="text-xs text-slate-500">Mã định danh cán bộ: {selectedEmployee.employeeCode}</span>
              </div>
              <span className="badge badge-info">{selectedEmployee.employeeType === 'OFFICE_STAFF' ? 'Khối Văn Phòng' : 'Kỹ Sư Công Trường'}</span>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <div>
                  <span className="text-xs text-slate-500">Chức danh công việc:</span>
                  <div className="font-medium text-slate-900">{selectedEmployee.position}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Email cơ quan:</span>
                  <div className="font-medium text-slate-900">{selectedEmployee.email}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Số CCCD / CMND:</span>
                  <div className="font-medium text-slate-900 tabular-nums">{selectedEmployee.citizenId || '001099xxxxxx'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Lương cơ bản thỏa thuận:</span>
                  <div className="font-semibold text-slate-900 tabular-nums">
                    {isHR ? (
                      formatVND(selectedEmployee.baseSalary)
                    ) : (
                      <span className="badge badge-slate" title="Thông tin bảo mật cá nhân theo Điều 95 BLLĐ">
                        •••••••• ₫ (Bảo Mật HR)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Người phụ thuộc (NPT):</span>
                  <div className="font-medium text-slate-900 tabular-nums">
                    {isHR ? (
                      `${selectedEmployee.dependentsCount} người (-${formatVND(selectedEmployee.dependentsCount * 4400000)})`
                    ) : (
                      <span className="badge badge-slate">Bảo mật HR</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Tài khoản hạch toán:</span>
                  <div className="font-semibold text-slate-900">
                    {selectedEmployee.employeeType === 'OFFICE_STAFF' ? 'TK 642 (Chi phí QLDN)' : 'TK 627 (Chi phí SX chung)'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Đoàn viên công đoàn:</span>
                  <div className="font-medium text-slate-900">{selectedEmployee.isUnionMember ? 'Có (Trừ 1% lương BHXH)' : 'Không'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Trạng thái sinh trắc:</span>
                  <div className="font-medium text-slate-900">
                    {selectedEmployee.isFaceRegistered ? 'Đã lưu trữ Vector 128-d' : 'Chưa đăng ký'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedEmployee(null)} className="btn btn-secondary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Face ID Enrollment (UC-04) */}
      {showFaceModal && (
        <div className="modal-backdrop" onClick={() => setShowFaceModal(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Đăng Ký &amp; Trích Xuất Dữ Liệu Face ID (UC-04)
                </h3>
                <span className="text-xs text-slate-500">Nhân sự: {showFaceModal.fullName} ({showFaceModal.employeeCode})</span>
              </div>
              <ScanFace size={18} color="var(--color-primary)" />
            </div>

            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: '200px',
                  backgroundColor: '#0f172a',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '110px',
                    height: '140px',
                    borderRadius: '50%',
                    border: '1.5px dashed #38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  }}
                >
                  <Camera size={32} color="#38bdf8" />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  Căn chỉnh khuôn mặt vào giữa khung bầu dục
                </span>
              </div>

              {faceEnrollSuccess ? (
                <div style={{ color: '#047857', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-sm)' }}>
                  Đã trích xuất đặc trưng Vector 128-d và lưu hồ sơ thành công!
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Hệ thống sử dụng mạng nơ-ron MobileNet-V2 trích xuất 128 điểm ảnh sinh trắc học để phục vụ điểm danh web &amp; di động không lưu ảnh gốc.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowFaceModal(null)} className="btn btn-secondary">
                Hủy
              </button>
              <button onClick={() => handleEnrollFace(showFaceModal.id)} className="btn btn-primary" disabled={faceEnrollSuccess}>
                <Camera size={14} />
                <span>Chụp &amp; Lưu Sinh Trắc Học</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
