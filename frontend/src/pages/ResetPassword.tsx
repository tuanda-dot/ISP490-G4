import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = (searchParams.get('token') || '').trim();

  const [verifying, setVerifying] = useState(Boolean(token));
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(
    token ? null : 'Đường dẫn đặt lại mật khẩu không hợp lệ (thiếu mã xác thực token).'
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    api
      .verifyResetToken(token)
      .then((res) => {
        if (cancelled) return;
        setVerifiedEmail(res.email);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setVerifyError(
          err?.message || 'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setVerifying(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (newPassword.length < 8) {
      setSubmitError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSubmitError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resetPassword({
        resetToken: token,
        email: verifiedEmail || undefined,
        newPassword,
        confirmPassword,
      });
      setDoneMessage(
        res.message ||
          'Đặt lại mật khẩu thành công. Anh/Chị có thể đăng nhập bằng mật khẩu mới ngay bây giờ.'
      );
    } catch (err: any) {
      setSubmitError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '1.75rem',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.9rem',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Đặt Lại Mật Khẩu HMCPS
            </h1>
            <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', margin: 0 }}>
              Công Ty TNHH Đầu Tư Xây Dựng &amp; Phát Triển Hải Minh
            </p>
          </div>
        </div>

        {verifying && (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            Đang xác thực đường dẫn đặt lại mật khẩu...
          </div>
        )}

        {!verifying && verifyError && !doneMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              data-testid="reset-link-error"
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: '8px',
                color: 'var(--color-danger)',
                fontSize: '0.84375rem',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{verifyError}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <ArrowLeft size={16} />
              <span>Quay lại Đăng nhập &amp; gửi lại link</span>
            </button>
          </div>
        )}

        {!verifying && !verifyError && !doneMessage && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {verifiedEmail && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldCheck size={16} />
                <span>
                  Tài khoản xác thực: <strong data-testid="reset-verified-email">{verifiedEmail}</strong>
                </span>
              </div>
            )}

            {submitError && (
              <div
                data-testid="reset-submit-error"
                style={{
                  padding: '0.65rem 0.75rem',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  borderRadius: '6px',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                }}
              >
                {submitError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Mật khẩu mới (tối thiểu 8 ký tự)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  data-testid="reset-new-password"
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  aria-label="Hiện/ẩn mật khẩu mới"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Xác nhận mật khẩu mới
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  data-testid="reset-confirm-password"
                  type={showConfirmPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((v) => !v)}
                  aria-label="Hiện/ẩn xác nhận mật khẩu"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              data-testid="reset-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {submitting ? 'Đang lưu mật khẩu mới...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <ArrowLeft size={15} />
              <span>Quay lại trang Đăng nhập</span>
            </button>
          </form>
        )}

        {doneMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              data-testid="reset-success-banner"
              style={{
                padding: '0.9rem',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: '8px',
                color: 'var(--color-success)',
                fontSize: '0.875rem',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{doneMessage}</span>
            </div>
            <button
              data-testid="reset-go-login-btn"
              type="button"
              onClick={() =>
                navigate('/login', { state: { prefilledEmail: verifiedEmail || '' } })
              }
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <span>Đăng nhập bằng mật khẩu mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
