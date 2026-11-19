import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock,
  KeyRound,
  Edit3,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Save,
  ShieldAlert,
  Mail,
} from 'lucide-react';
import { api, sharedState } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  AdminAccountItem,
  DepartmentItem,
  RbacMatrixRow,
} from '../types';

const ROLE_OPTIONS: Array<{ value: string; label: string; badgeClass: string }> = [
  { value: 'SYSTEM_ADMIN', label: 'Quản trị hệ thống (System Admin)', badgeClass: 'badge-purple' },
  { value: 'DIRECTOR', label: 'Ban Giám Đốc (Director)', badgeClass: 'badge-primary' },
  { value: 'HR_MANAGER', label: 'Trưởng phòng Nhân sự (HR Manager)', badgeClass: 'badge-success' },
  { value: 'HR_STAFF', label: 'Chuyên viên Nhân sự (HR Staff)', badgeClass: 'badge-info' },
  { value: 'CHIEF_ACCOUNTANT', label: 'Kế toán trưởng (Chief Accountant)', badgeClass: 'badge-warning' },
  { value: 'ACCOUNTANT', label: 'Chuyên viên Kế toán (Accountant)', badgeClass: 'badge-warning' },
  { value: 'SITE_MANAGER', label: 'Chỉ huy trưởng CT (Site Manager)', badgeClass: 'badge-info' },
  { value: 'SITE_ENGINEER', label: 'Kỹ sư Công trường (Site Engineer)', badgeClass: 'badge-slate' },
  { value: 'OFFICE_STAFF', label: 'Nhân viên Văn phòng (Office Staff)', badgeClass: 'badge-slate' },
];

const RBAC_ROLES = [
  { key: 'SYSTEM_ADMIN', short: 'SysAdmin' },
  { key: 'DIRECTOR', short: 'Director' },
  { key: 'HR_MANAGER', short: 'HR Mgr' },
  { key: 'HR_STAFF', short: 'HR Staff' },
  { key: 'CHIEF_ACCOUNTANT', short: 'Chief Acc' },
  { key: 'ACCOUNTANT', short: 'Accountant' },
  { key: 'SITE_MANAGER', short: 'Site Mgr' },
  { key: 'SITE_ENGINEER', short: 'Engineer' },
  { key: 'OFFICE_STAFF', short: 'Office' },
] as const;

const BASE_ACCESS_LEVELS = [
  'DENIED',
  'READ',
  'SELF',
  'SELF_SITE',
  'SELF_PAYSLIP',
  'SUBMIT',
  'READ_SITE',
  'READ_SUMMARY',
  'ASSIGN',
  'PREPARE',
  'CONFIRM_L1',
  'LOCK_L2',
  'PROCESS_L2',
  'APPROVE_L1',
  'APPROVE_L2',
  'APPROVE',
  'APPROVE_CHECKER',
  'APPROVE_REJECT',
  'EXPLAIN_ADJUST',
  'MAKER_RUN',
  'CHECKER_REVIEW',
  'CONFIG_MAKER',
  'CONFIG_POLICY',
  'MANAGE_FACE',
  'SITE_OPS',
  'OTP_SITE',
  'HR_METRICS',
  'SITE_METRICS',
  'CONFIGURE',
  'FULL',
] as const;

const PROTECTED_SOD_MODULES = new Set([
  'EMP_PROFILE',
  'PROJECT_GIS',
  'ATTENDANCE',
  'REQUESTS_WF',
  'TIMESHEET_LOCK',
  'POLICY_FORMULA',
  'PAYROLL_ENGINE',
  'BUDGET_APPROVAL',
  'EXEC_DASHBOARD',
]);

const DEFAULT_FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  { id: 1, code: 'DEPT-BOD', name: 'Ban Giám Đốc & Điều Hành' },
  { id: 2, code: 'DEPT-HR', name: 'Phòng Nhân Sự & Tiền Lương' },
  { id: 3, code: 'DEPT-ACC', name: 'Phòng Kế Toán & Tài Chính' },
  { id: 4, code: 'DEPT-SITE', name: 'Khối Thi Công Công Trường' },
];

const DEFAULT_FALLBACK_RBAC: RbacMatrixRow[] = [
  {
    moduleCode: 'ADMIN_GOV',
    moduleName: 'Quản trị Tài khoản, Phòng ban, Settings & Audit Logs',
    SYSTEM_ADMIN: 'FULL',
    DIRECTOR: 'DENIED',
    HR_MANAGER: 'DENIED',
    HR_STAFF: 'DENIED',
    CHIEF_ACCOUNTANT: 'DENIED',
    ACCOUNTANT: 'DENIED',
    SITE_MANAGER: 'DENIED',
    SITE_ENGINEER: 'DENIED',
    OFFICE_STAFF: 'DENIED',
  },
  {
    moduleCode: 'DEPT_READ',
    moduleName: 'Tra cứu Danh mục Phòng ban (Read-only)',
    SYSTEM_ADMIN: 'FULL',
    DIRECTOR: 'READ',
    HR_MANAGER: 'READ',
    HR_STAFF: 'READ',
    CHIEF_ACCOUNTANT: 'READ',
    ACCOUNTANT: 'READ',
    SITE_MANAGER: 'READ',
    SITE_ENGINEER: 'READ',
    OFFICE_STAFF: 'READ',
  },
  {
    moduleCode: 'EMP_PROFILE',
    moduleName: 'Hồ sơ Nhân sự, HĐLĐ & Điều động Dự án',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'READ',
    HR_MANAGER: 'APPROVE',
    HR_STAFF: 'FULL',
    CHIEF_ACCOUNTANT: 'DENIED',
    ACCOUNTANT: 'DENIED',
    SITE_MANAGER: 'READ_SITE',
    SITE_ENGINEER: 'SELF',
    OFFICE_STAFF: 'SELF',
  },
  {
    moduleCode: 'PROJECT_GIS',
    moduleName: 'Cấu hình Công trình & GPS Geofence',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'FULL',
    HR_MANAGER: 'READ',
    HR_STAFF: 'ASSIGN',
    CHIEF_ACCOUNTANT: 'READ',
    ACCOUNTANT: 'DENIED',
    SITE_MANAGER: 'OTP_SITE',
    SITE_ENGINEER: 'READ_SITE',
    OFFICE_STAFF: 'DENIED',
  },
  {
    moduleCode: 'ATTENDANCE',
    moduleName: 'Chấm công Camera Di Động (Face ID AI), GPS + OTP & Bổ sung khẩn cấp',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'READ',
    HR_MANAGER: 'READ',
    HR_STAFF: 'MANAGE_FACE',
    CHIEF_ACCOUNTANT: 'SELF',
    ACCOUNTANT: 'SELF',
    SITE_MANAGER: 'SITE_OPS',
    SITE_ENGINEER: 'SELF_SITE',
    OFFICE_STAFF: 'SELF',
  },
  {
    moduleCode: 'REQUESTS_WF',
    moduleName: 'Đơn Nghỉ phép, OT & Giải trình Chấm công',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'DENIED',
    HR_MANAGER: 'APPROVE_L2',
    HR_STAFF: 'PROCESS_L2',
    CHIEF_ACCOUNTANT: 'SELF',
    ACCOUNTANT: 'SELF',
    SITE_MANAGER: 'APPROVE_L1',
    SITE_ENGINEER: 'SUBMIT',
    OFFICE_STAFF: 'SUBMIT',
  },
  {
    moduleCode: 'TIMESHEET_LOCK',
    moduleName: 'Tổng hợp Bảng công & Khóa Sổ 3 Cấp',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'READ',
    HR_MANAGER: 'LOCK_L2',
    HR_STAFF: 'PREPARE',
    CHIEF_ACCOUNTANT: 'READ',
    ACCOUNTANT: 'READ',
    SITE_MANAGER: 'CONFIRM_L1',
    SITE_ENGINEER: 'SELF',
    OFFICE_STAFF: 'SELF',
  },
  {
    moduleCode: 'POLICY_FORMULA',
    moduleName: 'Tham số Pháp lý 2026, Thang lương & Công thức',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'READ',
    HR_MANAGER: 'CONFIG_POLICY',
    HR_STAFF: 'READ',
    CHIEF_ACCOUNTANT: 'APPROVE_CHECKER',
    ACCOUNTANT: 'CONFIG_MAKER',
    SITE_MANAGER: 'DENIED',
    SITE_ENGINEER: 'DENIED',
    OFFICE_STAFF: 'DENIED',
  },
  {
    moduleCode: 'PAYROLL_ENGINE',
    moduleName: 'Chạy Tính Lương 8 Cột & Bóc Tách Chi Phí MISA',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'READ_SUMMARY',
    HR_MANAGER: 'SELF_PAYSLIP',
    HR_STAFF: 'SELF_PAYSLIP',
    CHIEF_ACCOUNTANT: 'CHECKER_REVIEW',
    ACCOUNTANT: 'MAKER_RUN',
    SITE_MANAGER: 'SELF_PAYSLIP',
    SITE_ENGINEER: 'SELF_PAYSLIP',
    OFFICE_STAFF: 'SELF_PAYSLIP',
  },
  {
    moduleCode: 'BUDGET_APPROVAL',
    moduleName: 'Phê Duyệt Tổng Ngân Sách Quỹ Lương',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'APPROVE_REJECT',
    HR_MANAGER: 'DENIED',
    HR_STAFF: 'DENIED',
    CHIEF_ACCOUNTANT: 'EXPLAIN_ADJUST',
    ACCOUNTANT: 'DENIED',
    SITE_MANAGER: 'DENIED',
    SITE_ENGINEER: 'DENIED',
    OFFICE_STAFF: 'DENIED',
  },
  {
    moduleCode: 'EXEC_DASHBOARD',
    moduleName: 'Dashboard Điều hành Chi phí & Báo cáo Tổng hợp',
    SYSTEM_ADMIN: 'DENIED',
    DIRECTOR: 'FULL',
    HR_MANAGER: 'HR_METRICS',
    HR_STAFF: 'READ',
    CHIEF_ACCOUNTANT: 'FULL',
    ACCOUNTANT: 'FULL',
    SITE_MANAGER: 'SITE_METRICS',
    SITE_ENGINEER: 'DENIED',
    OFFICE_STAFF: 'DENIED',
  },
];

function getRoleMeta(role?: string) {
  return (
    ROLE_OPTIONS.find((r) => r.value === role) || {
      value: role || 'OFFICE_STAFF',
      label: role || 'Chưa phân vai trò',
      badgeClass: 'badge-slate',
    }
  );
}

export const AdminAccounts: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'RBAC'>('ACCOUNTS');
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [rbacMatrix, setRbacMatrix] = useState<RbacMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRbac, setSavingRbac] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Toast / Error
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Account Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    departmentId: '',
    position: 'Chuyên Viên Văn Phòng',
    employeeType: 'OFFICE_STAFF',
    role: 'OFFICE_STAFF',
    tempPassword: 'Password123@',
    sendEmail: false,
  });

  // Edit Access Modal
  const [editingAccount, setEditingAccount] = useState<AdminAccountItem | null>(null);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [editForm, setEditForm] = useState({
    role: 'OFFICE_STAFF',
    departmentId: '',
    position: '',
    employeeType: 'OFFICE_STAFF',
  });

  // Reset Password Modal
  const [resetAccount, setResetAccount] = useState<AdminAccountItem | null>(null);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [resetForm, setResetForm] = useState({
    tempPassword: 'Password123@',
    sendEmail: true,
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const loadFallbackData = () => {
    const mockEmps = sharedState.getEmployees();
    const mapped: AdminAccountItem[] = mockEmps.map((e, idx) => ({
      id: e.id || idx + 1,
      employeeCode: e.employeeCode || `HM-${String(idx + 1).padStart(3, '0')}`,
      fullName: e.fullName,
      email: e.email,
      phone: e.phone,
      departmentId: idx % 4 === 0 ? 1 : idx % 4 === 1 ? 2 : idx % 4 === 2 ? 3 : 4,
      departmentName:
        (e as unknown as { departmentName?: string; department?: { name?: string } }).departmentName ||
        (e as unknown as { department?: { name?: string } }).department?.name ||
        DEFAULT_FALLBACK_DEPARTMENTS[idx % 4].name,
      position: e.position || 'Nhân sự',
      employeeType: e.employeeType || 'OFFICE_STAFF',
      role: (e as unknown as { role?: string }).role || (e.employeeType === 'SITE_ENGINEER' ? 'SITE_ENGINEER' : 'OFFICE_STAFF'),
      normalizedRole:
        ((e as unknown as { role?: string }).role as AdminAccountItem['normalizedRole']) ||
        (e.employeeType === 'SITE_ENGINEER' ? 'SITE_ENGINEER' : 'OFFICE_STAFF'),
      status: (e.status as AdminAccountItem['status']) || 'ACTIVE',
      mustChangePassword: Boolean((e as unknown as { mustChangePassword?: boolean }).mustChangePassword),
      isFaceRegistered: Boolean(e.isFaceRegistered),
    }));
    setAccounts(mapped);
    setDepartments(DEFAULT_FALLBACK_DEPARTMENTS);
    setRbacMatrix(DEFAULT_FALLBACK_RBAC);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [accs, depts, matrix] = await Promise.all([
        api.getAdminAccounts(),
        api.getDepartments(),
        api.getRbacMatrix(),
      ]);
      setAccounts(accs);
      setDepartments(depts);
      setRbacMatrix(matrix);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'MOCK_TOKEN_LOCAL_MODE' || message.includes('Network Error')) {
        loadFallbackData();
      } else {
        showFeedback('error', message || 'Không thể tải danh sách tài khoản quản trị.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === 'ACTIVE').length;
    const locked = accounts.filter((a) => a.status === 'LOCKED' || a.status === 'INACTIVE').length;
    const pendingPwd = accounts.filter((a) => a.mustChangePassword).length;
    return { total, active, locked, pendingPwd };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      const matchesQ =
        !q ||
        acc.fullName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.employeeCode.toLowerCase().includes(q) ||
        (acc.departmentName || '').toLowerCase().includes(q);
      const roleVal = acc.normalizedRole || acc.role;
      const matchesRole = roleFilter === 'ALL' || roleVal === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && acc.status === 'ACTIVE') ||
        (statusFilter === 'LOCKED' && acc.status !== 'ACTIVE');
      return matchesQ && matchesRole && matchesStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Họ tên và Email đăng nhập.');
      return;
    }
    setCreating(true);
    try {
      const created = await api.createAdminAccount({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : undefined,
        position: createForm.position.trim() || undefined,
        employeeType: createForm.employeeType,
        role: createForm.role,
        tempPassword: createForm.tempPassword.trim() || undefined,
        sendEmail: createForm.sendEmail,
      });
      setAccounts((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        departmentId: '',
        position: 'Chuyên Viên Văn Phòng',
        employeeType: 'OFFICE_STAFF',
        role: 'OFFICE_STAFF',
        tempPassword: 'Password123@',
        sendEmail: false,
      });
      showFeedback('success', `Đã cấp tài khoản ${created.employeeCode} (${created.email}) thành công.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo tài khoản.';
      showFeedback('error', msg);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (acc: AdminAccountItem) => {
    setEditingAccount(acc);
    setEditForm({
      role: acc.normalizedRole || acc.role || 'OFFICE_STAFF',
      departmentId: acc.departmentId ? String(acc.departmentId) : '',
      position: acc.position || '',
      employeeType: acc.employeeType || 'OFFICE_STAFF',
    });
  };

  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setUpdatingAccess(true);
    try {
      const updated = await api.updateAdminAccountAccess(editingAccount.id, {
        role: editForm.role,
        departmentId: editForm.departmentId ? Number(editForm.departmentId) : undefined,
        position: editForm.position.trim() || undefined,
        employeeType: editForm.employeeType,
      });
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditingAccount(null);
      showFeedback('success', `Đã cập nhật vai trò RBAC cho ${updated.fullName}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật phân quyền.';
      showFeedback('error', msg);
    } finally {
      setUpdatingAccess(false);
    }
  };

  const handleToggleStatus = async (acc: AdminAccountItem) => {
    try {
      const updated = await api.toggleAdminAccountStatus(acc.id);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showFeedback(
        'success',
        updated.status === 'ACTIVE'
          ? `Đã mở khóa tài khoản ${updated.email}.`
          : `Đã khóa quyền truy cập tài khoản ${updated.email}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thay đổi trạng thái tài khoản.';
      showFeedback('error', msg);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAccount) return;
    setResettingPwd(true);
    try {
      const res = await api.resetAdminAccountPassword(resetAccount.id, {
        tempPassword: resetForm.tempPassword.trim() || undefined,
        sendEmail: resetForm.sendEmail,
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === resetAccount.id ? { ...a, mustChangePassword: true } : a))
      );
      setResetAccount(null);
      showFeedback('success', res.message || 'Đã đặt lại mật khẩu tạm thời và yêu cầu đổi mật khẩu.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.';
      showFeedback('error', msg);
    } finally {
      setResettingPwd(false);
    }
  };

  const handleMatrixCellChange = (moduleCode: string, roleKey: string, nextValue: string) => {
    setRbacMatrix((prev) =>
      prev.map((row) => (row.moduleCode === moduleCode ? { ...row, [roleKey]: nextValue } : row))
    );
  };

  const handleSaveRbacMatrix = async () => {
    setSavingRbac(true);
    try {
      const saved = await api.updateRbacMatrix(rbacMatrix);
      setRbacMatrix(saved);
      window.dispatchEvent(new Event('hmcps-rbac-updated'));
      showFeedback('success', 'Đã lưu Ma trận Phân quyền RBAC & kích hoạt thực thi động tức thì trên toàn hệ thống.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu Ma trận RBAC.';
      showFeedback('error', msg);
    } finally {
      setSavingRbac(false);
    }
  };

  const handleResetRbacMatrix = async () => {
    setSavingRbac(true);
    try {
      const restored = await api.resetRbacMatrix();
      setRbacMatrix(restored);
      window.dispatchEvent(new Event('hmcps-rbac-updated'));
      showFeedback('success', 'Đã khôi phục Ma trận Phân quyền RBAC về cấu hình chuẩn hệ thống.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể khôi phục Ma trận RBAC.';
      showFeedback('error', msg);
    } finally {
      setSavingRbac(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Quản Trị Tài Khoản & Ma Trận Phân Quyền RBAC</h1>
          <p className="page-subtitle">
            Cấp tài khoản, gán vai trò người dùng, khóa/mở quyền đăng nhập và cấu hình ma trận truy cập phân hệ.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={15} /> Làm mới
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={15} /> Cấp Tài Khoản Mới
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
              gap: '0.75rem',
              color: toast.type === 'success' ? '#047857' : '#b91c1c',
              fontSize: '0.875rem',
              fontWeight: 500,
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

      {/* Article 95 & SoD Notice */}
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          borderColor: '#bfdbfe',
        }}
      >
        <div
          className="card-body"
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.8125rem',
            color: '#1e3a8a',
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#1d4ed8' }} />
          <div>
            <strong>Nguyên Tắc Phân Tách Nhiệm Vụ (Segregation of Duties — Điều 95 BLLĐ):</strong>{' '}
            Vai trò <code>SYSTEM_ADMIN</code> chỉ quản trị tài khoản, phòng ban, phân quyền RBAC và cấu hình kỹ thuật;
            mức lương, số tài khoản ngân hàng, phụ cấp và bảng lương nhân viên được cách ly hoàn toàn.
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'ACCOUNTS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ACCOUNTS')}
        >
          <Users size={15} /> Tài Khoản Hệ Thống ({accounts.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'RBAC' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('RBAC')}
        >
          <ShieldCheck size={15} /> Ma Trận Phân Quyền RBAC
        </button>
      </div>

      {activeTab === 'ACCOUNTS' && (
        <>
          <div className="kpi-strip">
            <div className="kpi-card">
              <div className="kpi-label">Tổng Tài Khoản</div>
              <div className="kpi-value">{stats.total}</div>
              <div className="kpi-meta">Danh sách định danh người dùng</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Đang Hoạt Động</div>
              <div className="kpi-value" style={{ color: '#047857' }}>
                {stats.active}
              </div>
              <div className="kpi-meta">Trạng thái ACTIVE hợp lệ</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Đang Bị Khóa</div>
              <div className="kpi-value" style={{ color: stats.locked > 0 ? '#b91c1c' : '#475569' }}>
                {stats.locked}
              </div>
              <div className="kpi-meta">Chặn đăng nhập & token API</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Chờ Đổi MK Lần Đầu</div>
              <div className="kpi-value" style={{ color: '#b45309' }}>
                {stats.pendingPwd}
              </div>
              <div className="kpi-meta">Bắt buộc đổi khi đăng nhập</div>
            </div>
          </div>

          <div className="filter-bar">
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
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
                placeholder="Tìm theo mã NV, họ tên, email, phòng ban..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '180px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tất cả Vai trò (RBAC)</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa / Ngưng</option>
            </select>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Danh Sách Tài Khoản & Phân Quyền Truy Cập</h2>
              <span className="badge badge-slate">Hiển thị {filteredAccounts.length} tài khoản</span>
            </div>
            <div className="table-container">
              <table className="hm-table">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Người Dùng & Email</th>
                    <th>Phòng Ban / Chức Danh</th>
                    <th>Vai Trò RBAC</th>
                    <th>Trạng Thái & Bảo Mật</th>
                    <th style={{ textAlign: 'right' }}>Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Đang tải danh sách tài khoản hệ thống...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Không có tài khoản nào phù hợp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const roleMeta = getRoleMeta(acc.normalizedRole || acc.role);
                      const isSelf = user?.email?.toLowerCase() === acc.email.toLowerCase();
                      const isLocked = acc.status !== 'ACTIVE';
                      return (
                        <tr key={acc.id}>
                          <td>
                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{acc.employeeCode}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {acc.fullName}{' '}
                              {isSelf && <span className="badge badge-primary">Bạn</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{acc.email}</div>
                            {acc.phone && (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>SĐT: {acc.phone}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{acc.departmentName || 'Chưa gán phòng ban'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {acc.position || '—'} • {acc.employeeType === 'SITE_ENGINEER' ? 'Công trường' : 'Văn phòng'}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${roleMeta.badgeClass}`}>{roleMeta.label}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span className={`badge ${isLocked ? 'badge-danger' : 'badge-success'}`}>
                                {isLocked ? 'Đã Khóa' : 'Hoạt Động'}
                              </span>
                              {acc.mustChangePassword && (
                                <span className="badge badge-warning">Ép đổi MK</span>
                              )}
                              {acc.isFaceRegistered && (
                                <span className="badge badge-info">Đã ĐK Face ID</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                title="Sửa Vai trò & Phòng ban"
                                onClick={() => openEditModal(acc)}
                              >
                                <Edit3 size={13} /> Vai trò
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                title="Đặt lại mật khẩu tạm"
                                onClick={() => {
                                  setResetAccount(acc);
                                  setResetForm({ tempPassword: 'Password123@', sendEmail: true });
                                }}
                              >
                                <KeyRound size={13} /> Đổi MK
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${isLocked ? 'btn-primary' : 'btn-danger'}`}
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? 'Không thể tự khóa tài khoản của chính mình'
                                    : isLocked
                                    ? 'Mở khóa tài khoản'
                                    : 'Khóa tài khoản'
                                }
                                onClick={() => handleToggleStatus(acc)}
                              >
                                {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                                {isLocked ? 'Mở' : 'Khóa'}
                              </button>
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
        </>
      )}

      {activeTab === 'RBAC' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className="card-title">Ma Trận Phân Quyền RBAC Theo Vai Trò</h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                Hệ thống tự động chặn gán quyền tài chính/bảng lương/nhân sự cho <code>SYSTEM_ADMIN</code> (Segregation of Duties).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetRbacMatrix}
                disabled={savingRbac}
              >
                <RotateCcw size={14} /> Khôi Phục Ma Trận Chuẩn
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveRbacMatrix}
                disabled={savingRbac}
              >
                <Save size={14} /> {savingRbac ? 'Đang lưu...' : 'Lưu Ma Trận RBAC'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}>Phân Hệ Chức Năng</th>
                  {RBAC_ROLES.map((r) => (
                    <th key={r.key} style={{ textAlign: 'center', minWidth: '108px' }}>
                      {r.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbacMatrix.map((row) => {
                  const isSoDProtected = PROTECTED_SOD_MODULES.has(row.moduleCode);
                  return (
                    <tr key={row.moduleCode}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.moduleName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {row.moduleCode}
                          {isSoDProtected && (
                            <span className="badge badge-warning" style={{ marginLeft: '0.4rem' }}>
                              SoD Chặn SysAdmin
                            </span>
                          )}
                        </div>
                      </td>
                      {RBAC_ROLES.map((r) => {
                        const val = row[r.key] || 'DENIED';
                        const isDenied = val === 'DENIED' || val === 'NONE';
                        const lockedForAdmin =
                          r.key === 'SYSTEM_ADMIN' && (isSoDProtected || row.moduleCode === 'ADMIN_GOV');
                        const levelOptions = BASE_ACCESS_LEVELS.includes(val as (typeof BASE_ACCESS_LEVELS)[number])
                          ? BASE_ACCESS_LEVELS
                          : ([...BASE_ACCESS_LEVELS, val] as const);
                        return (
                          <td key={r.key} style={{ textAlign: 'center' }}>
                            <select
                              className="form-select form-select-sm"
                              aria-label={`${row.moduleCode}-${r.key}`}
                              value={val}
                              disabled={lockedForAdmin}
                              title={
                                lockedForAdmin
                                  ? row.moduleCode === 'ADMIN_GOV'
                                    ? 'Không thể tự thu hồi quyền quản trị của SYSTEM_ADMIN'
                                    : 'Bắt buộc DENIED theo quy tắc Segregation of Duties & Điều 95 BLLĐ'
                                  : undefined
                              }
                              onChange={(e) => handleMatrixCellChange(row.moduleCode, r.key, e.target.value)}
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: !isDenied ? 600 : 400,
                                backgroundColor: isDenied
                                  ? '#f8fafc'
                                  : val === 'FULL' || val.includes('APPROVE') || val.includes('MAKER') || val.includes('CHECKER') || val.includes('LOCK')
                                  ? '#eff6ff'
                                  : '#ecfdf5',
                                color: isDenied ? '#64748b' : '#0f172a',
                              }}
                            >
                              {levelOptions.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">Cấp Tài Khoản Người Dùng Mới</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowCreateModal(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="card-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Họ và Tên *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="VD: Nguyễn Văn Minh"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Đăng Nhập *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="minh.nv@haiminh.vn"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số Điện Thoại (SMS OTP)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="0901234567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phòng Ban</label>
                  <select
                    className="form-select"
                    value={createForm.departmentId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, departmentId: e.target.value }))}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vai Trò RBAC *</label>
                  <select
                    className="form-select"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Khối Làm Việc</label>
                  <select
                    className="form-select"
                    value={createForm.employeeType}
                    onChange={(e) => setCreateForm((p) => ({ ...p, employeeType: e.target.value }))}
                  >
                    <option value="OFFICE_STAFF">Khối Văn Phòng (OFFICE_STAFF)</option>
                    <option value="SITE_ENGINEER">Khối Công Trường (SITE_ENGINEER)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chức Danh Công Tác</label>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.position}
                    onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật Khẩu Tạm Lần Đầu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.tempPassword}
                    onChange={(e) => setCreateForm((p) => ({ ...p, tempPassword: e.target.value }))}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={createForm.sendEmail}
                  onChange={(e) => setCreateForm((p) => ({ ...p, sendEmail: e.target.checked }))}
                />
                <Mail size={14} /> Gửi thông tin kích hoạt qua Email SMTP ngay sau khi tạo
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Xác Nhận Cấp Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Access Modal */}
      {editingAccount && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">Cập Nhật Vai Trò & Phòng Ban — {editingAccount.employeeCode}</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingAccount(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveAccess} className="card-body">
              <div style={{ marginBottom: '0.85rem', fontSize: '0.825rem', color: '#475569' }}>
                Tài khoản: <strong>{editingAccount.fullName}</strong> ({editingAccount.email})
              </div>
              <div className="form-group">
                <label className="form-label">Vai Trò RBAC</label>
                <select
                  className="form-select"
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phòng Ban Trực Thuộc</label>
                <select
                  className="form-select"
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm((p) => ({ ...p, departmentId: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên / Chưa chọn --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Chức Danh</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.position}
                    onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Khối Làm Việc</label>
                  <select
                    className="form-select"
                    value={editForm.employeeType}
                    onChange={(e) => setEditForm((p) => ({ ...p, employeeType: e.target.value }))}
                  >
                    <option value="OFFICE_STAFF">Văn Phòng</option>
                    <option value="SITE_ENGINEER">Công Trường</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAccount(null)}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingAccess}>
                  {updatingAccess ? 'Đang lưu...' : 'Lưu Phân Quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetAccount && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">Đặt Lại Mật Khẩu Tạm — {resetAccount.employeeCode}</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setResetAccount(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleConfirmResetPassword} className="card-body">
              <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.75rem' }}>
                Cấp mật khẩu tạm cho <strong>{resetAccount.fullName}</strong> ({resetAccount.email}).
                Người dùng sẽ bị ép đổi mật khẩu ngay ở lần đăng nhập kế tiếp.
              </p>
              <div className="form-group">
                <label className="form-label">Mật Khẩu Tạm Mới</label>
                <input
                  type="text"
                  className="form-input"
                  value={resetForm.tempPassword}
                  onChange={(e) => setResetForm((p) => ({ ...p, tempPassword: e.target.value }))}
                  placeholder="Password123@"
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={resetForm.sendEmail}
                  onChange={(e) => setResetForm((p) => ({ ...p, sendEmail: e.target.checked }))}
                />
                Gửi thông báo mật khẩu tạm qua Email SMTP
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResetAccount(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={resettingPwd}>
                  {resettingPwd ? 'Đang xử lý...' : 'Xác Nhận Đặt Lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
