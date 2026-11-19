import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  MessageSquare,
  Bell,
  Save,
  RotateCcw,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type { NotificationTemplateBundle } from '../types';

const DEFAULT_TEMPLATE_BUNDLE: NotificationTemplateBundle = {
  payslipEmail: {
    subject: '[Hải Minh ERP] Phiếu lương cá nhân kỳ {Period} — {FullName} ({EmployeeCode})',
    senderDisplayName: 'Phòng Kế toán & Nhân sự — Công ty Cổ phần Hải Minh',
    requireTwoSignatures: true,
    htmlTemplate: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden">
  <div style="background:#1e3a8a;color:#ffffff;padding:16px 20px">
    <h2 style="margin:0;font-size:18px">CÔNG TY CỔ PHẦN HẢI MINH — PHIẾU LƯƠNG KỲ {Period}</h2>
    <p style="margin:4px 0 0;font-size:12px;opacity:0.9">Định mức ngày công chuẩn: {StandardDays} ngày/tháng • Bảo mật Điều 95 BLLĐ</p>
  </div>
  <div style="padding:18px 20px;color:#0f172a;font-size:13px">
    <p>Kính gửi: <strong>{FullName}</strong> ({EmployeeCode}) — Chức vụ: <strong>{Position}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:6px;border-bottom:1px solid #e2e8f0">Công hưởng lương / Công chuẩn</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right"><strong>{ActualDays} / {StandardDays} công</strong></td></tr>
      <tr><td style="padding:6px;border-bottom:1px solid #e2e8f0">Tổng lương &amp; phụ cấp (Gross)</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right">{GrossSalary}</td></tr>
      <tr><td style="padding:6px;border-bottom:1px solid #e2e8f0">Trích đóng BHXH NLĐ (10,5%)</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;color:#b91c1c">-{InsuranceEmployee}</td></tr>
      <tr><td style="padding:6px;border-bottom:1px solid #e2e8f0">Thuế TNCN khấu trừ</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;color:#b91c1c">-{PitTax}</td></tr>
      <tr style="background:#f0fdf4"><td style="padding:8px;font-weight:700;color:#166534">THỰC LĨNH CHUYỂN KHOẢN (NET)</td><td style="padding:8px;text-align:right;font-weight:700;font-size:15px;color:#166534">{NetSalary}</td></tr>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:12px;color:#475569">
      <div><strong>Người lao động</strong><br/><em>(Ký xác nhận)</em></div>
      <div style="text-align:right"><strong>Kế toán trưởng</strong><br/><em>(Đã ký duyệt số)</em></div>
    </div>
  </div>
</div>`,
  },
  smsOtp: {
    enabled: true,
    template: '[HAI MINH ERP] Ma OTP xac thuc diem danh tai {ProjectName}: {OtpCode}. Hieu luc den {ExpiresAt}. Khong chia se ma nay.',
    maxLength: 160,
  },
  schedule: {
    autoSendOnDirectorApproval: true,
    monthlyDispatchDay: 5,
    dispatchTime: '09:00',
    enableEmailChannel: true,
    enableInAppChannel: true,
    enableSmsChannel: true,
    reminderBeforePaydayHours: 24,
  },
  smtpLive: false,
};

const PAYSLIP_PLACEHOLDERS = [
  { token: '{FullName}', desc: 'Họ tên NV' },
  { token: '{EmployeeCode}', desc: 'Mã NV' },
  { token: '{Position}', desc: 'Chức vụ' },
  { token: '{Period}', desc: 'Kỳ lương' },
  { token: '{ActualDays}', desc: 'Công thực tế' },
  { token: '{StandardDays}', desc: 'Công chuẩn (22.5)' },
  { token: '{GrossSalary}', desc: 'Tổng Gross' },
  { token: '{InsuranceEmployee}', desc: 'BHXH 10.5%' },
  { token: '{PitTax}', desc: 'Thuế TNCN' },
  { token: '{NetSalary}', desc: 'Thực lĩnh Net' },
];

const SMS_PLACEHOLDERS = [
  { token: '{ProjectName}', desc: 'Tên dự án' },
  { token: '{OtpCode}', desc: 'Mã OTP 6 số' },
  { token: '{ExpiresAt}', desc: 'Giờ hết hạn' },
];

const SAMPLE_PREVIEW_VALUES: Record<string, string> = {
  '{FullName}': 'Phạm Văn Thịnh',
  '{EmployeeCode}': 'HM-012',
  '{Position}': 'Chuyên viên Phòng Kế hoạch KT',
  '{Period}': '04/2026',
  '{ActualDays}': '21.5',
  '{StandardDays}': '22.5',
  '{GrossSalary}': '22.560.000 đ',
  '{InsuranceEmployee}': '1.890.000 đ',
  '{PitTax}': '520.000 đ',
  '{NetSalary}': '20.150.000 đ',
  '{ProjectName}': 'Cau Nhat Tan 2',
  '{OtpCode}': '482915',
  '{ExpiresAt}': '08:15',
};

export function sanitizeTemplateHtmlPreview(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

export function validateNotificationBundle(bundle: NotificationTemplateBundle): string | null {
  const html = bundle.payslipEmail?.htmlTemplate || '';
  const subject = (bundle.payslipEmail?.subject || '').trim();
  if (!subject) {
    return 'Tiêu đề Email Phiếu lương không được để trống!';
  }
  if (!html.includes('{FullName}') || !html.includes('{NetSalary}')) {
    return 'Mẫu HTML Phiếu lương bắt buộc phải chứa đầy đủ 2 biến động {FullName} và {NetSalary}!';
  }
  const sms = (bundle.smsOtp?.template || '').trim();
  if (!sms || !sms.includes('{OtpCode}')) {
    return 'Mẫu tin nhắn SMS OTP bắt buộc phải chứa biến {OtpCode}!';
  }
  const day = bundle.schedule?.monthlyDispatchDay ?? 5;
  if (day < 1 || day > 28) {
    return 'Ngày phát hành phiếu lương định kỳ phải nằm trong khoảng từ ngày 1 đến ngày 28 hàng tháng!';
  }
  return null;
}

export const NotificationTemplates: React.FC = () => {
  const [bundle, setBundle] = useState<NotificationTemplateBundle>(DEFAULT_TEMPLATE_BUNDLE);
  const [activeTab, setActiveTab] = useState<'EMAIL' | 'SMS' | 'SCHEDULE'>('EMAIL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [testEmail, setTestEmail] = useState('ketoan.hmcps@haiminh.vn');
  const [sendingTest, setSendingTest] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getNotificationTemplates()
      .then((res) => {
        if (active && res && res.payslipEmail) {
          setBundle(res);
        }
      })
      .catch(() => {
        if (active) setBundle(DEFAULT_TEMPLATE_BUNDLE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const renderedPreviewHtml = useMemo(() => {
    let html = sanitizeTemplateHtmlPreview(bundle.payslipEmail.htmlTemplate);
    for (const [k, v] of Object.entries(SAMPLE_PREVIEW_VALUES)) {
      html = html.split(k).join(v);
    }
    return html;
  }, [bundle.payslipEmail.htmlTemplate]);

  const renderedPreviewSubject = useMemo(() => {
    let s = bundle.payslipEmail.subject || '';
    for (const [k, v] of Object.entries(SAMPLE_PREVIEW_VALUES)) {
      s = s.split(k).join(v);
    }
    return s;
  }, [bundle.payslipEmail.subject]);

  const renderedSmsPreview = useMemo(() => {
    let s = bundle.smsOtp.template || '';
    for (const [k, v] of Object.entries(SAMPLE_PREVIEW_VALUES)) {
      s = s.split(k).join(v);
    }
    return s;
  }, [bundle.smsOtp.template]);

  const hasDiacriticsInSms = /[^\x20-\x7E]/.test(bundle.smsOtp.template || '');
  const smsLength = (bundle.smsOtp.template || '').length;

  const insertPayslipToken = (token: string) => {
    setBundle((prev) => ({
      ...prev,
      payslipEmail: {
        ...prev.payslipEmail,
        htmlTemplate: `${prev.payslipEmail.htmlTemplate} ${token}`,
      },
    }));
  };

  const insertSmsToken = (token: string) => {
    setBundle((prev) => ({
      ...prev,
      smsOtp: {
        ...prev.smsOtp,
        template: `${prev.smsOtp.template} ${token}`,
      },
    }));
  };

  const handleSave = async () => {
    const err = validateNotificationBundle(bundle);
    if (err) {
      showFeedback('error', err);
      return;
    }
    setSaving(true);
    try {
      const sanitizedBundle: NotificationTemplateBundle = {
        ...bundle,
        payslipEmail: {
          ...bundle.payslipEmail,
          htmlTemplate: sanitizeTemplateHtmlPreview(bundle.payslipEmail.htmlTemplate),
        },
      };
      const saved = await api.updateNotificationTemplates(sanitizedBundle);
      setBundle(saved);
      showFeedback('success', 'Đã lưu Cấu hình Mẫu Phiếu lương HTML, SMS OTP & Lịch Phát hành Tự động thành công!');
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : 'Không thể lưu cấu hình mẫu thông báo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Khôi phục toàn bộ Mẫu Phiếu lương HTML, SMS OTP và Lịch gửi về chuẩn Công ty Hải Minh?')) {
      setBundle(DEFAULT_TEMPLATE_BUNDLE);
      showFeedback('success', 'Đã nạp lại bộ mẫu chuẩn Hải Minh (nhấn "Lưu Cấu Hình Mẫu" để áp dụng).');
    }
  };

  const handleTestSend = async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      showFeedback('error', 'Vui lòng nhập địa chỉ email hợp lệ để gửi mẫu phiếu lương thử nghiệm.');
      return;
    }
    const err = validateNotificationBundle(bundle);
    if (err) {
      showFeedback('error', err);
      return;
    }
    setSendingTest(true);
    try {
      const res = await api.testSendNotificationTemplate({
        toEmail: testEmail.trim(),
        subject: bundle.payslipEmail.subject,
        htmlTemplate: sanitizeTemplateHtmlPreview(bundle.payslipEmail.htmlTemplate),
      });
      if (res.success) {
        showFeedback(
          'success',
          `Đã gửi Email mẫu Phiếu lương thử nghiệm qua [${res.channel}] tới ${res.to} lúc ${res.timestamp}!`
        );
      } else {
        showFeedback('error', res.errorMessage || 'Gửi thử nghiệm thất bại.');
      }
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : 'Không thể gửi email mẫu thử nghiệm.');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary">UC-25 • Truyền Thông &amp; Phiếu Lương</span>
            <span className="badge badge-success">Chống XSS &bull; Chuẩn 22,5 Công &bull; 2 Chữ Ký</span>
          </div>
          <h1 className="page-title">Cấu Hình Mẫu Phiếu Lương &amp; Kênh Thông Báo</h1>
          <p className="page-description">
            Quản lý mẫu Email E-Payslip HTML, mẫu SMS OTP điểm danh công trường và lịch phát hành phiếu lương tự động sau khi Giám đốc phê duyệt.
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRestoreDefaults} disabled={loading}>
            <RotateCcw size={14} /> Khôi Phục Mẫu Chuẩn
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
            <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu Cấu Hình Mẫu'}
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
              color: toast.type === 'success' ? '#047857' : '#b91c1c',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              <span>{toast.text}</span>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setToast(null)}>
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.45rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('EMAIL')}
          className={`btn btn-sm ${activeTab === 'EMAIL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
        >
          <Mail size={14} /> 1. Mẫu Email &amp; Phiếu Lương HTML
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SMS')}
          className={`btn btn-sm ${activeTab === 'SMS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
        >
          <MessageSquare size={14} /> 2. Mẫu Tin Nhắn SMS OTP
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE')}
          className={`btn btn-sm ${activeTab === 'SCHEDULE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
        >
          <Bell size={14} /> 3. Kênh Thông Báo &amp; Lịch Gửi Tự Động
        </button>
      </div>

      {/* TAB 1: EMAIL & HTML PAYSLIP */}
      {activeTab === 'EMAIL' && (
        <div className="grid-cols-2" style={{ gap: '1rem', alignItems: 'start' }}>
          {/* Editor Column */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="#2563eb" />
                <h2 className="card-title">Trình Soạn Thảo Mẫu Phiếu Lương HTML</h2>
              </div>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={12} /> Lọc XSS Tự Động
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Tiêu Đề Email (*)</label>
                <input
                  type="text"
                  className="form-input"
                  value={bundle.payslipEmail.subject}
                  onChange={(e) =>
                    setBundle((p) => ({
                      ...p,
                      payslipEmail: { ...p.payslipEmail, subject: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên Hiển Thị Người Gửi</label>
                <input
                  type="text"
                  className="form-input"
                  value={bundle.payslipEmail.senderDisplayName}
                  onChange={(e) =>
                    setBundle((p) => ({
                      ...p,
                      payslipEmail: { ...p.payslipEmail, senderDisplayName: e.target.value },
                    }))
                  }
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <input
                  type="checkbox"
                  checked={bundle.payslipEmail.requireTwoSignatures}
                  onChange={(e) =>
                    setBundle((p) => ({
                      ...p,
                      payslipEmail: { ...p.payslipEmail, requireTwoSignatures: e.target.checked },
                    }))
                  }
                />
                Bắt buộc khung 02 chữ ký chuẩn Hải Minh (Người lao động &amp; Kế toán trưởng)
              </label>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={13} color="#2563eb" /> Biến Động (Nhấn để chèn vào mẫu — bắt buộc có {'{FullName}'} &amp; {'{NetSalary}'}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {PAYSLIP_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.token}
                      type="button"
                      className="badge badge-info"
                      style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                      onClick={() => insertPayslipToken(ph.token)}
                      title={`Chèn ${ph.token} (${ph.desc})`}
                    >
                      {ph.token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nội Dung HTML Phiếu Lương (*)</label>
                <textarea
                  rows={12}
                  className="form-input"
                  style={{ fontFamily: 'Consolas, monospace', fontSize: '0.76rem', lineHeight: 1.45 }}
                  value={bundle.payslipEmail.htmlTemplate}
                  onChange={(e) =>
                    setBundle((p) => ({
                      ...p,
                      payslipEmail: { ...p.payslipEmail, htmlTemplate: e.target.value },
                    }))
                  }
                />
              </div>

              {/* Test Send Box */}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  Kiểm Thử Gửi Email Mẫu Phiếu Lương (SMTP Live / Sandbox):
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    className="form-input form-input-sm"
                    style={{ flex: '1 1 200px' }}
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="nhap.email@haiminh.vn"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleTestSend}
                    disabled={sendingTest}
                  >
                    <Send size={13} /> {sendingTest ? 'Đang gửi...' : 'Gửi Email Mẫu Thử Nghiệm'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={16} color="#059669" />
                <h2 className="card-title">Xem Trước Phiếu Lương Thực Tế (Live Preview)</h2>
              </div>
              <span className="badge badge-info">Dữ liệu mẫu: 21,5 / 22,5 công</span>
            </div>
            <div className="card-body">
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '0.85rem',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <strong>Từ:</strong> {bundle.payslipEmail.senderDisplayName}
                </div>
                <div>
                  <strong>Tiêu đề:</strong> {renderedPreviewSubject}
                </div>
              </div>

              <div
                data-testid="payslip-template-live-preview"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  backgroundColor: '#ffffff',
                  overflowX: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMS OTP TEMPLATE */}
      {activeTab === 'SMS' && (
        <div className="grid-cols-2" style={{ gap: '1rem', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={16} color="#059669" />
                <h2 className="card-title">Cấu Hình Nội Dung SMS OTP Điểm Danh Công Trường</h2>
              </div>
              <span className={`badge ${bundle.smsOtp.enabled ? 'badge-success' : 'badge-slate'}`}>
                {bundle.smsOtp.enabled ? 'Đang bật' : 'Đã tắt'}
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={bundle.smsOtp.enabled}
                  onChange={(e) =>
                    setBundle((p) => ({ ...p, smsOtp: { ...p.smsOtp, enabled: e.target.checked } }))
                  }
                />
                Kích hoạt gửi tin nhắn SMS OTP cho Kỹ sư công trường khi mất GPS / điểm danh dự phòng
              </label>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Biến động SMS (Bắt buộc có {'{OtpCode}'}):
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {SMS_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.token}
                      type="button"
                      className="badge badge-success"
                      style={{ cursor: 'pointer', border: 'none', fontSize: '0.72rem' }}
                      onClick={() => insertSmsToken(ph.token)}
                    >
                      {ph.token} ({ph.desc})
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Nội Dung Tin Nhắn SMS (*)</label>
                  <span
                    className={`badge ${smsLength > bundle.smsOtp.maxLength ? 'badge-danger' : 'badge-info'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {smsLength} / {bundle.smsOtp.maxLength} ký tự
                  </span>
                </div>
                <textarea
                  rows={4}
                  className="form-input"
                  value={bundle.smsOtp.template}
                  onChange={(e) =>
                    setBundle((p) => ({ ...p, smsOtp: { ...p.smsOtp, template: e.target.value } }))
                  }
                />
                {hasDiacriticsInSms && (
                  <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '0.35rem' }}>
                    Lưu ý: Tin nhắn chứa tiếng Việt có dấu (UCS-2) sẽ giới hạn 70 ký tự / 1 SMS. Khuyến nghị dùng tiếng Việt không dấu để tối ưu cước Brandname.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Xem Trước Trên Điện Thoại Nhân Viên</h2>
            </div>
            <div className="card-body">
              <div
                style={{
                  maxWidth: '340px',
                  margin: '0 auto',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '1rem',
                }}
              >
                <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem' }}>
                  HAI MINH ERP &bull; Brandname SMS
                </div>
                <div
                  data-testid="sms-template-live-preview"
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#0f172a',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '14px 14px 14px 4px',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                >
                  {renderedSmsPreview}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.45rem', textAlign: 'right' }}>
                  Vừa xong &bull; 1 tin nhắn chuẩn GSM
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHANNELS & SCHEDULE */}
      {activeTab === 'SCHEDULE' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#2563eb" />
              <h2 className="card-title">Kênh Phát Hành &amp; Lịch Gửi Phiếu Lương Tự Động</h2>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  1. Kênh Thông Báo Kích Hoạt
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem' }}>
                  <input
                    type="checkbox"
                    checked={bundle.schedule.enableEmailChannel}
                    onChange={(e) =>
                      setBundle((p) => ({
                        ...p,
                        schedule: { ...p.schedule, enableEmailChannel: e.target.checked },
                      }))
                    }
                  />
                  Gửi Email Phiếu lương (SMTP Relay kèm HTML bảo mật Điều 95 BLLĐ)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem' }}>
                  <input
                    type="checkbox"
                    checked={bundle.schedule.enableInAppChannel}
                    onChange={(e) =>
                      setBundle((p) => ({
                        ...p,
                        schedule: { ...p.schedule, enableInAppChannel: e.target.checked },
                      }))
                    }
                  />
                  Thông báo trực tiếp trên Cổng Nội Bộ (In-App Notification Bell)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem' }}>
                  <input
                    type="checkbox"
                    checked={bundle.schedule.enableSmsChannel}
                    onChange={(e) =>
                      setBundle((p) => ({
                        ...p,
                        schedule: { ...p.schedule, enableSmsChannel: e.target.checked },
                      }))
                    }
                  />
                  Kênh SMS Brandname (OTP Công trường &amp; Cảnh báo khẩn)
                </label>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  2. Quy Tắc Phát Hành Định Kỳ
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem' }}>
                  <input
                    type="checkbox"
                    checked={bundle.schedule.autoSendOnDirectorApproval}
                    onChange={(e) =>
                      setBundle((p) => ({
                        ...p,
                        schedule: { ...p.schedule, autoSendOnDirectorApproval: e.target.checked },
                      }))
                    }
                  />
                  Tự động phát hành Phiếu lương ngay khi Ban Giám Đốc nhấn Phê Duyệt Bảng Lương
                </label>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Ngày Phát Hành Định Kỳ (1–28)</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      className="form-input"
                      value={bundle.schedule.monthlyDispatchDay}
                      onChange={(e) =>
                        setBundle((p) => ({
                          ...p,
                          schedule: { ...p.schedule, monthlyDispatchDay: Number(e.target.value) || 5 },
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ Phát Hành Tự Động</label>
                    <input
                      type="time"
                      className="form-input"
                      value={bundle.schedule.dispatchTime}
                      onChange={(e) =>
                        setBundle((p) => ({
                          ...p,
                          schedule: { ...p.schedule, dispatchTime: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nhắc Kiểm Tra Bảng Công Trước Ngày Chi Lương (giờ)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className="form-input"
                    value={bundle.schedule.reminderBeforePaydayHours}
                    onChange={(e) =>
                      setBundle((p) => ({
                        ...p,
                        schedule: { ...p.schedule, reminderBeforePaydayHours: Number(e.target.value) || 24 },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
