import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, ArrowRight, KeyRound, User, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export const Login: React.FC = () => {
  const { login, quickLogin, mustChangePassword, forceChangePassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force Change Password State
  const [currentPass, setCurrentPass] = useState('Password123@');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    setLoading(true);
    try {
      await forceChangePassword(currentPass, newPass);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts: {
    role: Role;
    title: string;
    email: string;
    name: string;
    tag: string;
    tagColor: string;
    isPreAuth?: boolean;
  }[] = [
    { role: 'SYSTEM_ADMIN', title: 'System Admin', email: 'admin.thinh@haiminh.vn', name: 'Nguyễn Hữu Thịnh (ThinhNH)', tag: 'Admin', tagColor: '#6366f1' },
    { role: 'DIRECTOR', title: 'Ban Giám Đốc', email: 'ceo.ha@haiminh.vn', name: 'Lê Phúc Hà (HaLP)', tag: 'Director', tagColor: '#0284c7' },
    { role: 'HR_MANAGER', title: 'Trưởng Phòng HR', email: 'hr.giang@haiminh.vn', name: 'Nguyễn Thu Giang (GiangNT)', tag: 'HR Manager', tagColor: '#059669' },
    { role: 'HR_STAFF', title: 'Chuyên Viên HR', email: 'hrstaff.mai@haiminh.vn', name: 'Phạm Thị Mai (MaiPT)', tag: 'HR Staff', tagColor: '#10b981' },
    { role: 'CHIEF_ACCOUNTANT', title: 'Kế Toán Trưởng', email: 'ketoantruong.tuan@haiminh.vn', name: 'Đoàn Anh Tuấn (TuanDA)', tag: 'Chief Acc.', tagColor: '#d97706' },
    { role: 'ACCOUNTANT', title: 'Chuyên Viên Kế Toán', email: 'ketoan.lan@haiminh.vn', name: 'Hoàng Thị Lan (LanHT)', tag: 'Accountant', tagColor: '#f59e0b' },
    { role: 'SITE_MANAGER', title: 'Chỉ Huy Trưởng CT', email: 'chihuytruong.phat@haiminh.vn', name: 'Nguyễn Lê Gia Phát (PhatNLG)', tag: 'Site Manager', tagColor: '#8b5cf6' },
    { role: 'SITE_ENGINEER', title: 'Kỹ Sư Công Trường', email: 'kysu.trung@haiminh.vn', name: 'Trần Văn Trung (TrungTV)', tag: 'Site Engineer', tagColor: '#ea580c' },
    { role: 'OFFICE_STAFF', title: 'NV Văn Phòng', email: 'vanphong.dang@haiminh.vn', name: 'Vũ Hải Đăng (DangVH)', tag: 'Office Staff', tagColor: '#0d9488' },
    { role: 'SITE_ENGINEER', title: 'Tân Kỹ Sư (PreAuth)', email: 'newbie.engineer@haiminh.vn', name: 'Đặng Tuấn Tú', tag: 'Ép Đổi MK', tagColor: '#e11d48', isPreAuth: true },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: '960px', width: '100%', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '2rem' }}>
        {/* Left: Branding & Quick Persona Switch */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Building2 size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                HMCPS <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>PORTAL</span>
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Hệ Thống Quản Lý Tiền Lương &amp; Chấm Công Xây Dựng Hải Minh
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
              <User size={16} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Đăng Nhập Nhanh Theo Thành Viên Dự Án (1-Click)
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
              Chọn một vai trò bên dưới để kiểm tra luồng phân quyền và số liệu tương ứng:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', maxHeight: '310px', overflowY: 'auto', paddingRight: '2px' }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={async () => {
                    setError(null);
                    if (acc.isPreAuth) {
                      await login(acc.email, 'Password123@');
                    } else {
                      await quickLogin(acc.role);
                      navigate('/');
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.5rem 0.65rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                    border: acc.isPreAuth ? '1px dashed #f43f5e' : '1px solid var(--border-subtle)',
                    backgroundColor: acc.isPreAuth ? '#fff1f2' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: acc.isPreAuth ? '#be123c' : 'var(--text-main)' }}>
                      {acc.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: `${acc.tagColor}15`,
                        color: acc.tagColor,
                        border: `1px solid ${acc.tagColor}35`,
                      }}
                    >
                      {acc.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="#047857" /> Chuẩn BLLĐ 2026
            </span>
            <span>•</span>
            <span>Face ID AI Liveness</span>
            <span>•</span>
            <span>GPS Strict Geofence</span>
          </div>
        </div>

        {/* Right: Login Card / Force Change Password */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {!mustChangePassword ? (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Đăng Nhập Hệ Thống
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Sử dụng tài khoản doanh nghiệp @haiminh.vn được cấp
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecdd3',
                    color: '#b91c1c',
                    fontSize: '0.8125rem',
                    marginBottom: '1rem',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Doanh Nghiệp</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin.thinh@haiminh.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Mật Khẩu</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', cursor: 'pointer' }}>
                    Quên mật khẩu?
                  </span>
                </div>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mật khẩu mặc định: <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>Password123@</code>
              </div>
            </form>
          ) : (
            /* Force Change Password Form (UC-23) */
            <form onSubmit={handleForceChangePassword}>
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem',
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Đổi Mật Khẩu Lần Đầu (UC-23)
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Yêu cầu an ninh: Vui lòng cập nhật mật khẩu cá nhân mới trước khi vào hệ thống
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecdd3',
                    color: '#b91c1c',
                    fontSize: '0.8125rem',
                    marginBottom: '0.875rem',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới (Chuẩn an toàn doanh nghiệp)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Nhập mật khẩu mới..."
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              {/* Password Strength Meter & Checklist */}
              {newPass.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.625rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Độ Mạnh Mật Khẩu:</span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color:
                          [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 5
                            ? '#047857'
                            : [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 3
                            ? '#b45309'
                            : '#b91c1c',
                      }}
                    >
                      {[newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 5
                        ? 'Rất Mạnh (Đạt Chuẩn)'
                        : [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 3
                        ? 'Trung Bình'
                        : 'Yếu'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${([newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length / 5) * 100}%`,
                        backgroundColor:
                          [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 5
                            ? '#10b981'
                            : [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /[0-9]/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length >= 3
                            ? '#f59e0b'
                            : '#ef4444',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', fontSize: '0.6875rem' }}>
                    <span style={{ color: newPass.length >= 8 ? '#047857' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {newPass.length >= 8 ? <Check size={11} /> : '•'} Tối thiểu 8 ký tự
                    </span>
                    <span style={{ color: /[A-Z]/.test(newPass) ? '#047857' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {/[A-Z]/.test(newPass) ? <Check size={11} /> : '•'} Chứa chữ hoa (A-Z)
                    </span>
                    <span style={{ color: /[0-9]/.test(newPass) ? '#047857' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {/[0-9]/.test(newPass) ? <Check size={11} /> : '•'} Chứa chữ số (0-9)
                    </span>
                    <span style={{ color: /[^A-Za-z0-9]/.test(newPass) ? '#047857' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {/[^A-Za-z0-9]/.test(newPass) ? <Check size={11} /> : '•'} Ký tự đặc biệt (@#$...)
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu & Truy Cập'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
