import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Settings,
  Mail,
  MessageSquare,
  MapPin,
  Camera,
  Smartphone,
  Shield,
  Save,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit3,
} from 'lucide-react';
import { api } from '../services/api';
import type { BiometricDeviceItem, SystemSettingsBundle } from '../types';

const DEFAULT_SETTINGS_FALLBACK: SystemSettingsBundle = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    senderEmail: 'hmcps-noreply@haiminh.vn',
    senderName: 'HMCPS Hệ Thống Tự Động',
    tlsEnabled: true,
    liveConfigured: false,
  },
  sms: {
    provider: 'Viettel / Twilio Brandname Gateway',
    apiEndpoint: 'https://sms-gateway.haiminh.vn/api/v1/otp',
    otpExpirySeconds: 300,
    maxOtpPerHour: 10,
    sandboxMode: true,
  },
  gps: {
    geocodingService: 'OpenStreetMap Nominatim + Haversine WGS-84',
    defaultGeofenceRadiusMeters: 200,
    minRadiusMeters: 50,
    maxRadiusMeters: 1000,
    strictAntiSpoofing: true,
    allowGraceMinutes: 10,
  },
  biometric: {
    confidenceThreshold: 0.85,
    livenessDetectionRequired: true,
    maxMismatchRetries: 3,
    logRetentionDays: 365,
  },
  security: {
    jwtExpiryHours: 24,
    minPasswordLength: 8,
    forceFirstLoginChange: true,
    maxFailedLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
    enforceArticle95SalaryIsolation: true,
  },
};

const DEFAULT_DEVICES_FALLBACK: BiometricDeviceItem[] = [
  {
    id: 1,
    deviceName: 'Kênh Camera Di Động iOS/Android — Trụ Sở Chính Hà Nội',
    deviceType: 'MOBILE_APP_CAMERA',
    ipAddress: 'camera-hq.haiminh.vn',
    port: 443,
    location: 'Toàn khu vực Trụ sở Hải Minh Hà Nội (GPS Geofence)',
    confidenceThreshold: 82,
    livenessEnabled: true,
    status: 'ONLINE',
  },
  {
    id: 2,
    deviceName: 'Cổng Chấm Công WebRTC Camera Trình Duyệt — Khối Văn Phòng',
    deviceType: 'MOBILE_WEB_WEBRTC',
    ipAddress: 'webrtc.haiminh.vn',
    port: 443,
    location: 'Thiết bị di động & Tablet nhân viên khối Văn phòng',
    confidenceThreshold: 85,
    livenessEnabled: true,
    status: 'ONLINE',
  },
  {
    id: 3,
    deviceName: 'Kênh Camera Di Động Công Trường — Dự Án Cầu Nhật Tân 2',
    deviceType: 'MOBILE_ANDROID_CAMERA',
    ipAddress: 'site-cam.nhattan2.haiminh.vn',
    port: 443,
    location: 'Kỹ sư công trường (Camera Di Động + GPS + OTP Chỉ huy trưởng)',
    confidenceThreshold: 78,
    livenessEnabled: true,
    status: 'ONLINE',
  },
];

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsBundle>(DEFAULT_SETTINGS_FALLBACK);
  const [devices, setDevices] = useState<BiometricDeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [testEmail, setTestEmail] = useState('admin.thinh@haiminh.vn');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDeviceItem | null>(null);
  const [savingDevice, setSavingDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    deviceName: '',
    deviceType: 'MOBILE_APP_CAMERA',
    ipAddress: 'mobile-cam.haiminh.vn',
    port: '443',
    location: '',
    confidenceThreshold: '80',
    livenessEnabled: true,
    status: 'ONLINE',
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfg, devs] = await Promise.all([api.getSystemSettings(), api.getBiometricDevices()]);
      setSettings(cfg);
      setDevices(devs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'MOCK_TOKEN_LOCAL_MODE' || msg.includes('Network Error')) {
        setSettings(DEFAULT_SETTINGS_FALLBACK);
        setDevices(DEFAULT_DEVICES_FALLBACK);
      } else {
        showFeedback('error', msg || 'Không thể tải cấu hình hệ thống.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSystemSettings(settings);
      setSettings(updated);
      showFeedback('success', 'Đã lưu toàn bộ Cấu hình Hệ thống (SMTP, SMS, GPS, Camera Face ID, Security) & ghi Audit Log.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu cấu hình hệ thống.';
      showFeedback('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail.trim()) {
      showFeedback('error', 'Vui lòng nhập email nhận kiểm thử SMTP.');
      return;
    }
    setTestingSmtp(true);
    try {
      const res = await api.testSmtpConnection(testEmail.trim());
      if (res.success) {
        showFeedback('success', `Kiểm thử SMTP [${res.channel}] tới ${res.to} thành công lúc ${res.timestamp}.`);
      } else {
        showFeedback('error', res.errorMessage || `SMTP [${res.channel}] kiểm thử thất bại.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm thử kết nối SMTP.';
      showFeedback('error', msg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const openAddDevice = () => {
    setEditingDevice(null);
    setDeviceForm({
      deviceName: '',
      deviceType: 'MOBILE_APP_CAMERA',
      ipAddress: 'mobile-cam.haiminh.vn',
      port: '443',
      location: 'Khu vực áp dụng GPS Geofence & Camera Di Động',
      confidenceThreshold: '80',
      livenessEnabled: true,
      status: 'ONLINE',
    });
    setShowDeviceModal(true);
  };

  const openEditDevice = (dev: BiometricDeviceItem) => {
    setEditingDevice(dev);
    setDeviceForm({
      deviceName: dev.deviceName,
      deviceType: dev.deviceType,
      ipAddress: dev.ipAddress,
      port: String(dev.port),
      location: dev.location || '',
      confidenceThreshold: String(dev.confidenceThreshold),
      livenessEnabled: dev.livenessEnabled,
      status: dev.status,
    });
    setShowDeviceModal(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForm.deviceName.trim() || !deviceForm.ipAddress.trim()) {
      showFeedback('error', 'Vui lòng nhập Tên thiết bị và Địa chỉ IP.');
      return;
    }
    setSavingDevice(true);
    try {
      const payload: Partial<BiometricDeviceItem> = {
        deviceName: deviceForm.deviceName.trim(),
        deviceType: deviceForm.deviceType,
        ipAddress: deviceForm.ipAddress.trim(),
        port: Number(deviceForm.port) || 443,
        location: deviceForm.location.trim(),
        confidenceThreshold: Number(deviceForm.confidenceThreshold) || 80,
        livenessEnabled: deviceForm.livenessEnabled,
        status: deviceForm.status,
      };
      if (editingDevice) {
        const updated = await api.updateBiometricDevice(editingDevice.id, payload);
        setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showFeedback('success', `Đã cập nhật kênh camera ${updated.deviceName}.`);
      } else {
        const created = await api.createBiometricDevice(payload);
        setDevices((prev) => [...prev, created]);
        showFeedback('success', `Đã thêm kênh camera chấm công ${created.deviceName}.`);
      }
      setShowDeviceModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu thông tin thiết bị.';
      showFeedback('error', msg);
    } finally {
      setSavingDevice(false);
    }
  };

  const handleDeleteDevice = async (dev: BiometricDeviceItem) => {
    if (!window.confirm(`Xác nhận gỡ bỏ kênh chấm công "${dev.deviceName}" (${dev.ipAddress})?`)) return;
    try {
      await api.deleteBiometricDevice(dev.id);
      setDevices((prev) => prev.filter((d) => d.id !== dev.id));
      showFeedback('success', `Đã gỡ kênh camera ${dev.deviceName}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gỡ kênh chấm công.';
      showFeedback('error', msg);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Cấu Hình Hệ Thống, Kết Nối &amp; Camera Di Động Face ID</h1>
          <p className="page-subtitle">
            Thiết lập thông số kỹ thuật cho Email Server (SMTP), SMS OTP Gateway, GPS Geofence, Kênh Camera Thiết Bị Di Động chấm công Face ID và Chính sách Bảo mật.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <NavLink to="/notification-templates" className="btn btn-primary btn-sm">
            <Mail size={14} /> Mẫu Phiếu Lương &amp; Thông Báo (UC-25)
          </NavLink>
          <button type="button" className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={15} /> Làm mới
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
              fontSize: '0.875rem',
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

      <form onSubmit={handleSaveSettings}>
        <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
          {/* 1. Email SMTP */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={17} color="#2563eb" />
                <h2 className="card-title">Email Server (SMTP Relay)</h2>
              </div>
              <span className={`badge ${settings.smtp.liveConfigured ? 'badge-success' : 'badge-warning'}`}>
                {settings.smtp.liveConfigured ? 'SMTP Live Ready' : 'Sandbox / Local Log'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.smtp.host}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...p.smtp, host: e.target.value } }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SMTP Port</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.smtp.port}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...p.smtp, port: Number(e.target.value) || 587 } }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sender Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={settings.smtp.senderEmail}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...p.smtp, senderEmail: e.target.value } }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sender Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.smtp.senderName}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...p.smtp, senderName: e.target.value } }))
                    }
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={settings.smtp.tlsEnabled}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, smtp: { ...p.smtp, tlsEnabled: e.target.checked } }))
                  }
                />
                Bật mã hóa STARTTLS bắt buộc (Port 587 / 465)
              </label>

              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <input
                  type="email"
                  className="form-input form-input-sm"
                  style={{ flex: '1 1 180px' }}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email nhận kiểm thử..."
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                >
                  <Send size={13} /> {testingSmtp ? 'Đang gửi...' : 'Kiểm Thử SMTP'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. SMS Gateway */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={17} color="#059669" />
                <h2 className="card-title">SMS Gateway (OTP Auth)</h2>
              </div>
              <span className={`badge ${settings.sms.sandboxMode ? 'badge-warning' : 'badge-success'}`}>
                {settings.sms.sandboxMode ? 'Sandbox Mode' : 'Production'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Nhà Cung Cấp (Brandname / API)</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.sms.provider}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, sms: { ...p.sms, provider: e.target.value } }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Endpoint Gửi OTP</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.sms.apiEndpoint}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, sms: { ...p.sms, apiEndpoint: e.target.value } }))
                  }
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Hiệu Lực OTP (giây)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.sms.otpExpirySeconds}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        sms: { ...p.sms, otpExpirySeconds: Number(e.target.value) || 300 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Giới Hạn OTP / Giờ</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.sms.maxOtpPerHour}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        sms: { ...p.sms, maxOtpPerHour: Number(e.target.value) || 10 },
                      }))
                    }
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <input
                  type="checkbox"
                  checked={settings.sms.sandboxMode}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, sms: { ...p.sms, sandboxMode: e.target.checked } }))
                  }
                />
                Chạy ở chế độ Sandbox (ghi log nội bộ không tốn cước SMS)
              </label>
            </div>
          </div>

          {/* 3. GPS Service */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={17} color="#d97706" />
                <h2 className="card-title">Dịch Vụ GPS & Geofence Policy</h2>
              </div>
              <span className={`badge ${settings.gps.strictAntiSpoofing ? 'badge-success' : 'badge-slate'}`}>
                {settings.gps.strictAntiSpoofing ? 'Anti-Spoofing Bật' : 'Thường'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Geocoding & Thuật Toán Khoảng Cách</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.gps.geocodingService}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, gps: { ...p.gps, geocodingService: e.target.value } }))
                  }
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Bán Kính Mặc Định (m)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gps.defaultGeofenceRadiusMeters}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        gps: { ...p.gps, defaultGeofenceRadiusMeters: Number(e.target.value) || 200 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Grace Đi Muộn (phút)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gps.allowGraceMinutes}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        gps: { ...p.gps, allowGraceMinutes: Number(e.target.value) || 10 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bán Kính Min (m)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gps.minRadiusMeters}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        gps: { ...p.gps, minRadiusMeters: Number(e.target.value) || 50 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bán Kính Max (m)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gps.maxRadiusMeters}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        gps: { ...p.gps, maxRadiusMeters: Number(e.target.value) || 1000 },
                      }))
                    }
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <input
                  type="checkbox"
                  checked={settings.gps.strictAntiSpoofing}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, gps: { ...p.gps, strictAntiSpoofing: e.target.checked } }))
                  }
                />
                Bật cảnh báo phát hiện giả lập vị trí (GPS Mock Location / Developer Mode)
              </label>
            </div>
          </div>

          {/* 4. Biometric & Security Policy */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={17} color="#7e22ce" />
                <h2 className="card-title">Camera Di Động Face ID AI &amp; Chính Sách Bảo Mật</h2>
              </div>
              <span className="badge badge-purple">Điều 95 Isolation</span>
            </div>
            <div className="card-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Ngưỡng Tin Cậy Face AI (0.50 - 0.99)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.5}
                    max={0.99}
                    className="form-input"
                    value={settings.biometric.confidenceThreshold}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        biometric: { ...p.biometric, confidenceThreshold: Number(e.target.value) || 0.85 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lưu Trữ Log Camera Face ID (ngày)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.biometric.logRetentionDays}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        biometric: { ...p.biometric, logRetentionDays: Number(e.target.value) || 365 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn Token JWT (giờ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.security.jwtExpiryHours}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        security: { ...p.security, jwtExpiryHours: Number(e.target.value) || 24 },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số Lần Sai MK Tối Đa</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.security.maxFailedLoginAttempts}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        security: { ...p.security, maxFailedLoginAttempts: Number(e.target.value) || 5 },
                      }))
                    }
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8125rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.biometric.livenessDetectionRequired}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        biometric: { ...p.biometric, livenessDetectionRequired: e.target.checked },
                      }))
                    }
                  />
                  Bắt buộc kiểm tra người thật 3D (Liveness Detection) trên Camera Di Động khi chấm công Face ID
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.security.forceFirstLoginChange}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        security: { ...p.security, forceFirstLoginChange: e.target.checked },
                      }))
                    }
                  />
                  Ép đổi mật khẩu ở lần đăng nhập đầu tiên với tài khoản mới cấp
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <input type="checkbox" checked={settings.security.enforceArticle95SalaryIsolation} disabled />
                  Cách ly dữ liệu bảng lương & thu nhập khỏi vai trò Admin (Điều 95 BLLĐ — Bắt buộc)
                </label>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving || loading}>
            <Save size={15} /> {saving ? 'Đang lưu cấu hình...' : 'Lưu Toàn Bộ Cấu Hình Hệ Thống'}
          </button>
        </div>
      </form>

      {/* 5. Mobile Camera Face ID Channels */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={17} color="#2563eb" />
            <h2 className="card-title">Quản Lý Kênh Camera Di Động Chấm Công Face ID</h2>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddDevice}>
            <Plus size={14} /> Thêm Kênh Camera
          </button>
        </div>
        <div
          style={{
            margin: '0.85rem 1.25rem 0',
            padding: '0.7rem 0.9rem',
            borderRadius: '8px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            color: '#0369a1',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Camera size={16} style={{ flexShrink: 0 }} />
          <span>
            Hệ thống HMCPS chấm công hoàn toàn qua <strong>camera trên thiết bị di động / trình duyệt WebRTC</strong> kết hợp GPS Geofence &amp; AI Liveness 3D (không sử dụng máy Face ID gắn tường hay máy quét vân tay vật lý).
          </span>
        </div>
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th>Tên Kênh Camera Di Động</th>
                <th>Nền Tảng / Giao Thức</th>
                <th>Endpoint Kết Nối (Host:Port)</th>
                <th>Phạm Vi / Khu Vực Áp Dụng</th>
                <th>Ngưỡng AI / Liveness</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                    Chưa có kênh camera di động Face ID nào được cấu hình.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{dev.deviceName}</td>
                    <td>
                      <span className="badge badge-info">{dev.deviceType}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {dev.ipAddress}:{dev.port}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#475569' }}>{dev.location || '—'}</td>
                    <td>
                      <span className="badge badge-slate">{dev.confidenceThreshold}%</span>{' '}
                      {dev.livenessEnabled && <span className="badge badge-purple">Liveness 3D</span>}
                    </td>
                    <td>
                      <span className={`badge ${dev.status === 'ONLINE' ? 'badge-success' : 'badge-danger'}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEditDevice(dev)}>
                          <Edit3 size={13} /> Sửa
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDeleteDevice(dev)}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeviceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="card-header">
              <h3 className="card-title">
                <Settings size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
                {editingDevice ? 'Cập Nhật Kênh Camera Di Động' : 'Đăng Ký Kênh Camera Di Động Mới'}
              </h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowDeviceModal(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveDevice} className="card-body">
              <div className="form-group">
                <label className="form-label">Tên Kênh Camera *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={deviceForm.deviceName}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceName: e.target.value }))}
                  placeholder="VD: Camera Di Động App Mobile — Công Trường 2"
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nền Tảng Camera</label>
                  <select
                    className="form-select"
                    value={deviceForm.deviceType}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, deviceType: e.target.value }))}
                  >
                    <option value="MOBILE_APP_CAMERA">MOBILE_APP_CAMERA (App Di Động iOS/Android)</option>
                    <option value="MOBILE_WEB_WEBRTC">MOBILE_WEB_WEBRTC (Camera Trình Duyệt Di Động)</option>
                    <option value="MOBILE_IOS_CAMERA">MOBILE_IOS_CAMERA (Camera iPhone/iPad)</option>
                    <option value="MOBILE_ANDROID_CAMERA">MOBILE_ANDROID_CAMERA (Camera Android)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng Thái Kết Nối</label>
                  <select
                    className="form-select"
                    value={deviceForm.status}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Host / Endpoint *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={deviceForm.ipAddress}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, ipAddress: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Port (HTTPS)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={deviceForm.port}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, port: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Phạm Vi Áp Dụng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deviceForm.location}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngưỡng Tin Cậy (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={99}
                    className="form-input"
                    value={deviceForm.confidenceThreshold}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, confidenceThreshold: e.target.value }))}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={deviceForm.livenessEnabled}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, livenessEnabled: e.target.checked }))}
                />
                Kích hoạt nhận diện Liveness 3D chống giả mạo ảnh
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeviceModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingDevice}>
                  {savingDevice ? 'Đang lưu...' : 'Lưu Kênh Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
