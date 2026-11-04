import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../App';
import { type Role, ROLE_LABELS } from '../../types';

export const Header: React.FC = () => {
  const { user, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const personas: { role: Role; label: string; name: string }[] = [
    { role: 'SYSTEM_ADMIN', label: 'Quản Trị Hệ Thống (Admin)', name: 'Nguyễn Hữu Thịnh (ThinhNH)' },
    { role: 'DIRECTOR', label: 'Ban Giám Đốc (Director)', name: 'Lê Phúc Hà (HaLP)' },
    { role: 'HR_MANAGER', label: 'Trưởng Phòng HR (HR Manager)', name: 'Nguyễn Thu Giang (GiangNT)' },
    { role: 'HR_STAFF', label: 'Chuyên Viên HR (HR Staff)', name: 'Phạm Thị Mai (MaiPT)' },
    { role: 'CHIEF_ACCOUNTANT', label: 'Kế Toán Trưởng (Chief Acc.)', name: 'Đoàn Anh Tuấn (TuanDA)' },
    { role: 'ACCOUNTANT', label: 'Chuyên Viên Kế Toán (Accountant)', name: 'Hoàng Thị Lan (LanHT)' },
    { role: 'SITE_MANAGER', label: 'Chỉ Huy Trưởng CT (Site Manager)', name: 'Nguyễn Lê Gia Phát (PhatNLG)' },
    { role: 'SITE_ENGINEER', label: 'Kỹ Sư Công Trường (Site Eng.)', name: 'Trần Văn Trung (TrungTV)' },
    { role: 'OFFICE_STAFF', label: 'NV Văn Phòng (Office Staff)', name: 'Vũ Hải Đăng (DangVH)' },
  ];

  const currentRoleLabel = user?.role ? (ROLE_LABELS[user.role] || user.role) : 'Khách';

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 15,
      }}
    >
      {/* System Status & Brand Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-body)' }}>
            Hệ thống Quản lý Tiền lương &amp; Chấm công HMCPS
          </span>
        </div>
        <span style={{ color: 'var(--text-subtle)' }}>/</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Kỳ quyết toán: Tháng 10/2026
        </span>
      </div>

      {/* Right Controls: Quick Role Switcher & Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Persona Role Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <User size={14} color="var(--color-primary)" />
            <span>Vai trò: <strong style={{ color: 'var(--text-main)' }}>{currentRoleLabel}</strong></span>
            <ChevronDown size={12} color="var(--text-muted)" />
          </button>

          {showRoleMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                width: '300px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                padding: '0.5rem',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '0.35rem 0.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '0.25rem',
                  letterSpacing: '0.04em',
                }}
              >
                Chuyển Đổi Persona Kiểm Thử
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxHeight: '380px', overflowY: 'auto' }}>
                {personas.map((p) => (
                  <button
                    key={p.role}
                    onClick={() => {
                      quickLogin(p.role);
                      setShowRoleMenu(false);
                      navigate(getDefaultRouteForRole(p.role));
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: user?.role === p.role ? 'var(--color-primary-subtle)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: user?.role === p.role ? 'var(--color-primary)' : 'var(--text-main)',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      if (user?.role !== p.role) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (user?.role !== p.role) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div
          title="Thông báo hệ thống"
          style={{
            position: 'relative',
            cursor: 'pointer',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={16} color="var(--text-muted)" />
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
        </div>
      </div>
    </header>
  );
};
