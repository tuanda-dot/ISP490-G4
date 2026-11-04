import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HardHat,
  ScanFace,
  Calculator,
  ShieldCheck,
  LogOut,
  Building2,
  FileText,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const getNavItems = (role: string) => {
    if (role === 'SITE_MANAGER') {
      return [
        { to: '/site-management', label: 'Phân Hệ Quản Lý Hiện Trường', icon: HardHat },
        { to: '/timesheet', label: 'Bảng Công Dự Án (Duyệt L1)', icon: CalendarCheck },
        { to: '/requests', label: 'Duyệt Đơn Hiện Trường (L1)', icon: FileText },
        { to: '/face-checkin', label: 'Điểm Danh Khẩn Cấp & Roster', icon: ScanFace },
        { to: '/projects', label: 'Geofence Công Trình', icon: Building2 },
        { to: '/payroll', label: 'Phiếu Lương Của Tôi', icon: Calculator },
      ];
    }

    if (role === 'SITE_ENGINEER') {
      return [
        { to: '/engineer-portal', label: 'Cổng Tác Nghiệp Kỹ Sư', icon: HardHat },
        { to: '/face-checkin', label: 'Điểm Danh GPS & Dynamic OTP', icon: ScanFace },
        { to: '/timesheet', label: 'Bảng Chấm Công Của Tôi', icon: CalendarCheck },
        { to: '/requests', label: 'Cổng Nộp Đơn & Tăng Ca', icon: FileText },
        { to: '/payroll', label: 'Phiếu Lương E-Payslip', icon: Calculator },
      ];
    }

    if (role === 'OFFICE_STAFF') {
      return [
        { to: '/', label: 'Bàn Làm Việc Nhân Viên', icon: LayoutDashboard },
        { to: '/face-checkin', label: 'Chấm Công Face ID Web', icon: ScanFace },
        { to: '/timesheet', label: 'Bảng Công Cá Nhân', icon: CalendarCheck },
        { to: '/requests', label: 'Nộp Đơn Phép & OT', icon: FileText },
        { to: '/payroll', label: 'Phiếu Lương E-Payslip', icon: Calculator },
      ];
    }

    if (role === 'DIRECTOR' || role === 'CEO') {
      return [
        { to: '/', label: 'Dashboard Điều Hành Chi Phí', icon: LayoutDashboard },
        { to: '/employees', label: 'Hồ Sơ & HĐ Lao Động', icon: Users },
        { to: '/projects', label: 'Công Trình & Geofence', icon: HardHat },
        { to: '/face-checkin', label: 'Giám Sát Chấm Công', icon: ScanFace },
        { to: '/timesheet', label: 'Bảng Công Tập Trung', icon: CalendarCheck },
        { to: '/payroll', label: 'Duyệt Ngân Sách Quỹ Lương', icon: Calculator },
        { to: '/compliance', label: 'Quy Định & Pháp Lý Lương', icon: ShieldCheck },
      ];
    }

    // Default for HR, Accountants, Admins
    const allNavItems = [
      {
        to: '/',
        label: 'Tổng Quan Hệ Thống',
        icon: LayoutDashboard,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT'],
      },
      {
        to: '/employees',
        label: 'Hồ Sơ & HĐ Lao Động',
        icon: Users,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF'],
      },
      {
        to: '/projects',
        label: 'Công Trình & Geofence',
        icon: HardHat,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_STAFF', 'CHIEF_ACCOUNTANT'],
      },
      {
        to: '/face-checkin',
        label: 'Chấm Công Face ID Web',
        icon: ScanFace,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF'],
      },
      {
        to: '/timesheet',
        label: 'Bảng Công Tập Trung',
        icon: CalendarCheck,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT'],
      },
      {
        to: '/requests',
        label: 'Đơn Từ & Tăng Ca OT',
        icon: FileText,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT'],
      },
      {
        to: '/payroll',
        label: 'Bảng Lương & Chi Phí',
        icon: Calculator,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'HR_MANAGER'],
      },
      {
        to: '/compliance',
        label: 'Quy Định & Tuân Thủ',
        icon: ShieldCheck,
        roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR_MANAGER', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT'],
      },
    ];

    return allNavItems.filter((item) => item.roles.includes(role));
  };

  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const navItems = getNavItems(currentRole);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SYSTEM_ADMIN':
      case 'ADMIN':
        return <span className="badge badge-primary">Quản Trị Hệ Thống</span>;
      case 'DIRECTOR':
      case 'CEO':
        return <span className="badge badge-info">Ban Giám Đốc</span>;
      case 'HR_MANAGER':
        return <span className="badge badge-success">Trưởng Phòng HR</span>;
      case 'HR_STAFF':
        return <span className="badge badge-success" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>Chuyên Viên HR</span>;
      case 'CHIEF_ACCOUNTANT':
        return <span className="badge badge-warning">Kế Toán Trưởng</span>;
      case 'ACCOUNTANT':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>Chuyên Viên Kế Toán</span>;
      case 'SITE_MANAGER':
        return <span className="badge badge-secondary">Chỉ Huy Trưởng CT</span>;
      case 'SITE_ENGINEER':
        return <span className="badge badge-secondary" style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>Kỹ Sư Công Trường</span>;
      case 'OFFICE_STAFF':
        return <span className="badge badge-slate">NV Văn Phòng</span>;
      default:
        return <span className="badge badge-secondary">{role}</span>;
    }
  };

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}
        >
          <Building2 size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            HMCPS <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>2026</span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Hải Minh Construction Corp
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            color: 'var(--text-subtle)',
            fontWeight: 600,
            padding: '0 0.5rem 0.5rem',
            letterSpacing: '0.05em',
          }}
        >
          Phân Hệ Chức Năng
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-primary)' : 'var(--text-body)',
                  backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                  border: isActive ? '1px solid var(--color-primary-border)' : '1px solid transparent',
                  transition: 'background-color 0.15s ease',
                })}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Footer Profile */}
      <div
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: '#fafbfc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#e2e8f0',
              color: 'var(--text-body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            {user?.fullName ? user.fullName.charAt(0) : 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.fullName || 'Người dùng'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
              <span className="font-mono text-xs text-slate-500" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {user?.employeeCode}
              </span>
              {getRoleBadge(user?.role || 'ADMIN')}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center', color: '#b91c1c' }}
        >
          <LogOut size={14} />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </aside>
  );
};
