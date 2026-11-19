import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  CalendarCheck,
  Calculator,
  FileText,
  HardHat,
  CalendarDays,
  Users,
  Layers,
  KeyRound,
  Settings,
  ShieldAlert,
  Menu,
  Building2,
  FileCode,
} from 'lucide-react';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { canRoleAccessPath } from '../../utils/rbac';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

interface MobileTabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  highlight?: boolean;
}

const getRolePrimaryTabs = (role: string): MobileTabItem[] => {
  switch (role) {
    case 'SITE_ENGINEER':
      return [
        { to: '/engineer-portal', label: 'Hiện trường', icon: HardHat },
        { to: '/face-checkin', label: 'Điểm danh', icon: ScanFace, highlight: true },
        { to: '/timesheet', label: 'Bảng công', icon: CalendarCheck },
        { to: '/payroll', label: 'Phiếu lương', icon: Calculator },
      ];
    case 'SITE_MANAGER':
      return [
        { to: '/site-management', label: 'Điều hành', icon: HardHat },
        { to: '/face-checkin', label: 'Quân số', icon: ScanFace, highlight: true },
        { to: '/shift-scheduling', label: 'Phân ca', icon: CalendarDays },
        { to: '/requests', label: 'Duyệt đơn', icon: FileText },
      ];
    case 'OFFICE_STAFF':
      return [
        { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
        { to: '/face-checkin', label: 'Face ID', icon: ScanFace, highlight: true },
        { to: '/timesheet', label: 'Bảng công', icon: CalendarCheck },
        { to: '/payroll', label: 'Phiếu lương', icon: Calculator },
      ];
    case 'HR_MANAGER':
    case 'HR_STAFF':
      return [
        { to: '/employees', label: 'Nhân sự', icon: Users },
        { to: '/shift-scheduling', label: 'Phân ca', icon: CalendarDays },
        { to: '/timesheet', label: 'Bảng công', icon: CalendarCheck },
        { to: '/requests', label: 'Đơn từ', icon: FileText },
      ];
    case 'CHIEF_ACCOUNTANT':
    case 'ACCOUNTANT':
      return [
        { to: '/payroll', label: 'Bảng lương', icon: Calculator, highlight: true },
        { to: '/timesheet', label: 'Bảng công', icon: CalendarCheck },
        { to: '/salary-formula', label: 'Công thức', icon: FileCode },
        { to: '/cost-allocation', label: 'Phân bổ', icon: Layers },
      ];
    case 'DIRECTOR':
    case 'CEO':
      return [
        { to: '/', label: 'Điều hành', icon: LayoutDashboard },
        { to: '/payroll', label: 'Quỹ lương', icon: Calculator, highlight: true },
        { to: '/projects', label: 'Công trình', icon: Building2 },
        { to: '/cost-allocation', label: 'Chi phí', icon: Layers },
      ];
    case 'SYSTEM_ADMIN':
    case 'ADMIN':
      return [
        { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
        { to: '/admin/accounts', label: 'Tài khoản', icon: KeyRound },
        { to: '/admin/settings', label: 'Cấu hình', icon: Settings },
        { to: '/admin/audit-logs', label: 'Audit Log', icon: ShieldAlert },
      ];
    default:
      return [
        { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
        { to: '/face-checkin', label: 'Face ID', icon: ScanFace, highlight: true },
        { to: '/timesheet', label: 'Bảng công', icon: CalendarCheck },
        { to: '/payroll', label: 'Phiếu lương', icon: Calculator },
      ];
  }
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu, isMenuOpen }) => {
  const { user, modulePermissions } = useAuth();
  const currentRole = normalizeRole(user?.role || 'OFFICE_STAFF');

  const tabs = getRolePrimaryTabs(currentRole).filter((tab) =>
    tab.to === '/' ? true : canRoleAccessPath(currentRole, tab.to, modulePermissions)
  );

  return (
    <nav className="mobile-bottom-nav no-print" aria-label="Điều hướng nhanh di động">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? 'is-active' : ''} ${tab.highlight ? 'is-highlight' : ''}`
            }
          >
            <span className="mobile-bottom-nav-icon">
              <Icon size={19} />
            </span>
            <span className="mobile-bottom-nav-label">{tab.label}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        className={`mobile-bottom-nav-item ${isMenuOpen ? 'is-active' : ''}`}
        aria-label="Mở toàn bộ danh mục"
        aria-expanded={isMenuOpen}
      >
        <span className="mobile-bottom-nav-icon">
          <Menu size={19} />
        </span>
        <span className="mobile-bottom-nav-label">Danh mục</span>
      </button>
    </nav>
  );
};
