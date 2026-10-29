import React, { useState, useEffect, useRef } from 'react';
import {
  ScanFace,
  MapPin,
  CheckCircle2,
  Camera,
  RefreshCw,
  Clock,
  Radio,
  Building2,
  HardHat,
  KeyRound,
  Activity,
  History,
  Smartphone,
  SwitchCamera,
  Navigation,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, mockProjects } from '../services/api';
import type { AttendanceRecord, Project } from '../types';
import { InteractiveMap } from '../components/InteractiveMap';

interface LocationPreset {
  name: string;
  distance: number;
  lat: number;
  lng: number;
  status: 'VALID' | 'WARNING' | 'BLOCKED';
  description: string;
}

// Hàm tính khoảng cách trắc địa Haversine theo mét
function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const FaceCheckIn: React.FC = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mode: Office HQ vs Construction Site vs Site Monitor (Auto-detect from Actor Role)
  const isSiteManager = user?.role === 'SITE_MANAGER';
  const isSiteEngineer = user?.role === 'SITE_ENGINEER';
  const initialMode = isSiteManager ? 'SITE_MONITOR' : isSiteEngineer ? 'SITE' : 'OFFICE';

  const [attendanceMode, setAttendanceMode] = useState<'OFFICE' | 'SITE' | 'SITE_MONITOR'>(initialMode);
  const [selectedProject, setSelectedProject] = useState<Project>(mockProjects[0]);
  const [siteOtpInput, setSiteOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // State for UC-08: Điểm danh bổ sung khẩn cấp của Chỉ huy trưởng
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyToast, setEmergencyToast] = useState<string | null>(null);
  const [emergencyForm, setEmergencyForm] = useState({
    employeeId: 10,
    employeeName: 'Vũ Quốc Việt',
    employeeCode: 'HM-010',
    shift: 'DAY',
    checkInTime: '07:35',
    reason: 'Kỹ sư trắc địa làm việc dưới hố móng tầng hầm B3, kết cấu bê tông cốt thép dày che chắn sóng 4G/GPS. Chỉ huy trưởng trực tiếp xác nhận tại hiện trường.',
  });

  // Mock live site roster for UC-08
  const [siteRoster, setSiteRoster] = useState([
    {
      id: 5,
      employeeCode: 'HM-005',
      employeeName: 'Nguyễn Lê Gia Phát',
      position: 'Chỉ Huy Trưởng Công Trường',
      checkInTime: '07:45 AM',
      gpsCoords: '21.0925° N, 105.8175° E',
      distance: 12,
      otpCode: '849 201',
      status: 'PRESENT',
      method: 'MOBILE_GPS_OTP',
      note: 'Chỉ huy trưởng đúng ca',
    },
    {
      id: 6,
      employeeCode: 'HM-006',
      employeeName: 'Trần Văn Trung',
      position: 'Kỹ Sư Kết Cấu Hiện Trường',
      checkInTime: '07:52 AM',
      gpsCoords: '21.0926° N, 105.8173° E',
      distance: 18,
      otpCode: '849 201',
      status: 'PRESENT',
      method: 'MOBILE_GPS_OTP',
      note: 'Trong bán kính Geofence',
    },
    {
      id: 7,
      employeeCode: 'HM-007',
      employeeName: 'Phạm Thành Nam',
      position: 'Kỹ Sư Cơ Điện MEP',
      checkInTime: '07:50 AM',
      gpsCoords: '21.0924° N, 105.8177° E',
      distance: 25,
      otpCode: '849 201',
      status: 'PRESENT',
      method: 'MOBILE_GPS_OTP',
      note: 'Trong bán kính Geofence',
    },
    {
      id: 8,
      employeeCode: 'HM-008',
      employeeName: 'Hoàng Thị Lan',
      position: 'Kỹ Sư Thí Nghiệm Vật Liệu',
      checkInTime: '08:02 AM',
      gpsCoords: '21.0923° N, 105.8170° E',
      distance: 45,
      otpCode: '849 201',
      status: 'LATE',
      method: 'MOBILE_GPS_OTP',
      note: 'Muộn 2 phút (Ca 08:00)',
    },
    {
      id: 10,
      employeeCode: 'HM-010',
      employeeName: 'Vũ Quốc Việt',
      position: 'Kỹ Sư Trắc Địa & Cao Độ',
      checkInTime: '--:--',
      gpsCoords: 'Đang offline',
      distance: 0,
      otpCode: '--',
      status: 'MISSING',
      method: 'NONE',
      note: 'Sự cố mất sóng hố móng B3',
    },
  ]);

  // Hardware Camera & Face Capture State (Laptop Webcam & Smartphone)
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Hardware Geolocation & Live GPS State (Laptop & Smartphone GPS)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [realDeviceGps, setRealDeviceGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsMode, setGpsMode] = useState<'REAL_DEVICE' | 'PRESET_SIM'>('REAL_DEVICE');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Audit location simulator presets
  const officePresets: LocationPreset[] = [
    { name: 'Bàn làm việc Tầng 18', distance: 32, lat: 21.028511, lng: 105.854444, status: 'VALID', description: 'Trong tâm bán kính (R=100m)' },
    { name: 'Sảnh Tầng 1 Tòa Nhà', distance: 78, lat: 21.028820, lng: 105.854650, status: 'VALID', description: 'Gần ranh giới cho phép' },
    { name: 'Cà phê đối diện cổng', distance: 135, lat: 21.029410, lng: 105.855210, status: 'WARNING', description: 'Vượt ranh giới Geofence' },
    { name: 'Tại nhà riêng', distance: 3850, lat: 21.042100, lng: 105.812300, status: 'BLOCKED', description: 'Cách xa trụ sở 3.8km - Bị chặn' },
  ];

  const [activePreset, setActivePreset] = useState<LocationPreset>(officePresets[0]);
  const [currentDistance, setCurrentDistance] = useState<number>(32);

  // Liveness verification workflow states
  const [livenessStep, setLivenessStep] = useState<number>(0); // 0: Idle, 1: Nhìn thẳng, 2: Chớp mắt, 3: Nghiêng đầu 15deg, 4: Done
  const [verifying, setVerifying] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState<AttendanceRecord | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);

  // Office HQ Reference: Hải Minh Tower (21.028511, 105.854444, R = 100m)
  const officeCoords = { lat: 21.028511, lng: 105.854444, radius: 100 };

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach((track) => track.stop());
      }
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCamera(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Chưa cấp quyền Camera hoặc thiết bị không có camera khả dụng.');
    }
  };

  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const fetchRealGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Thiết bị của bạn không hỗ trợ Geolocation API.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        setRealDeviceGps({ lat, lng, accuracy });
        setGpsLocation({ lat, lng, accuracy });

        const target = attendanceMode === 'OFFICE'
          ? officeCoords
          : { lat: selectedProject.latitude, lng: selectedProject.longitude };
        const dist = calculateHaversineMeters(lat, lng, target.lat, target.lng);
        setCurrentDistance(dist);
      },
      (err) => {
        setIsLocating(false);
        console.warn('GPS location error:', err);
        // Fallback to preset if GPS denied
        handleSelectPreset(officePresets[0]);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // 1. Khởi động Camera thật từ Laptop Webcam hoặc Mobile Camera
    startCamera(facingMode);

    // 2. Lấy tọa độ GPS thật của Laptop / Điện thoại
    fetchRealGpsLocation();

    // 3. Tải lịch sử chấm công
    api.getAttendanceHistory().then((logs) => {
      setRecentLogs(logs);
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSelectPreset = (preset: LocationPreset) => {
    setActivePreset(preset);
    setCurrentDistance(preset.distance);
    setGpsLocation({
      lat: preset.lat,
      lng: preset.lng,
      accuracy: 8,
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setGpsMode('PRESET_SIM');
    const target = attendanceMode === 'OFFICE'
      ? officeCoords
      : { lat: selectedProject.latitude, lng: selectedProject.longitude };
    const dist = calculateHaversineMeters(lat, lng, target.lat, target.lng);
    setCurrentDistance(dist);
    setGpsLocation({ lat, lng, accuracy: 5 });
  };

  const handleModeChange = (mode: 'OFFICE' | 'SITE' | 'SITE_MONITOR') => {
    setAttendanceMode(mode);
    setAttendanceResult(null);
    setOtpError(null);
    const target = mode === 'OFFICE'
      ? officeCoords
      : { lat: selectedProject.latitude, lng: selectedProject.longitude };

    if (gpsMode === 'REAL_DEVICE' && realDeviceGps) {
      const dist = calculateHaversineMeters(realDeviceGps.lat, realDeviceGps.lng, target.lat, target.lng);
      setCurrentDistance(dist);
      setGpsLocation(realDeviceGps);
    } else if (mode === 'OFFICE') {
      handleSelectPreset(officePresets[0]);
    } else if (mode === 'SITE') {
      setCurrentDistance(45);
      setGpsLocation({
        lat: selectedProject.latitude + 0.0003,
        lng: selectedProject.longitude + 0.0003,
        accuracy: 12,
      });
    }
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyForm.reason.trim()) {
      alert('Vui lòng nhập lý do điểm danh khẩn cấp tại hiện trường.');
      return;
    }

    // Update roster record
    setSiteRoster(prev => prev.map(item => {
      if (item.employeeCode === emergencyForm.employeeCode) {
        return {
          ...item,
          checkInTime: emergencyForm.checkInTime + ' AM',
          status: 'PRESENT',
          method: 'EMERGENCY_SM_PUNCH',
          note: `CHT điểm danh khẩn cấp: ${emergencyForm.reason.slice(0, 32)}...`,
        };
      }
      return item;
    }));

    // Add to recent audit logs
    const newRecord: AttendanceRecord = {
      id: Date.now(),
      employeeId: emergencyForm.employeeId,
      employeeCode: emergencyForm.employeeCode,
      employeeName: emergencyForm.employeeName,
      workDate: new Date().toISOString().split('T')[0],
      checkInTime: emergencyForm.checkInTime + ':00',
      locationName: `${selectedProject.name} (Điểm danh khẩn cấp CHT)`,
      faceConfidenceScore: 100,
      inGeofence: true,
      distanceMeters: 0,
      checkInMethod: 'MANUAL',
      status: 'PRESENT',
      deviceFingerprint: `Chỉ huy trưởng: ${user?.fullName || 'Nguyễn Lê Gia Phát'} (Xác thực L1)`,
    };
    setRecentLogs(prev => [newRecord, ...prev]);

    setShowEmergencyModal(false);
    setEmergencyToast(`Chỉ huy trưởng đã thực hiện thành công lệnh Điểm Danh Khẩn Cấp (UC-08) cho kỹ sư ${emergencyForm.employeeName} (${emergencyForm.employeeCode})!`);
    setTimeout(() => setEmergencyToast(null), 4000);
  };

  const handleCheckIn = async () => {
    // If site mode, validate OTP first
    if (attendanceMode === 'SITE') {
      if (!siteOtpInput || siteOtpInput.trim().length !== 6) {
        setOtpError('Vui lòng nhập đủ 6 chữ số Mã OTP điểm danh công trường do Chỉ huy trưởng cung cấp.');
        return;
      }
      setOtpError(null);
    }

    // Geofence check
    const allowedRadius = attendanceMode === 'OFFICE' ? officeCoords.radius : selectedProject.geofenceRadiusMeters;
    if (currentDistance > allowedRadius * 1.5) {
      alert(`[CHẶN ĐIỂM DANH] Vị trí của bạn cách điểm quy định ${currentDistance}m (Vượt quá bán kính cho phép ${allowedRadius}m). Hệ thống từ chối ghi nhận.`);
      return;
    }

    // Chụp ảnh khuôn mặt thực tế từ video stream
    let capturedBase64 = 'data:image/jpeg;base64,simulated_ai_face_capture';
    if (videoRef.current && hasCamera) {
      const snap = captureFrame();
      if (snap) {
        capturedBase64 = snap;
        setCapturedSnapshot(snap);
      }
    }

    setVerifying(true);
    setAttendanceResult(null);

    // 3-Phase Liveness Simulation
    setLivenessStep(1); // Bước 1: Nhìn thẳng
    await new Promise((r) => setTimeout(r, 650));
    setLivenessStep(2); // Bước 2: Chớp mắt
    await new Promise((r) => setTimeout(r, 650));
    setLivenessStep(3); // Bước 3: Nghiêng đầu
    await new Promise((r) => setTimeout(r, 650));
    setLivenessStep(4); // Hoàn thành

    try {
      const isInside = currentDistance <= allowedRadius;
      const targetName = attendanceMode === 'OFFICE'
        ? 'Trụ Sở Hải Minh Tower (P.1802)'
        : `${selectedProject.name} (${selectedProject.code})`;

      const res = await api.faceIdCheckIn({
        employeeId: user?.id || 1,
        latitude: gpsLocation?.lat || officeCoords.lat,
        longitude: gpsLocation?.lng || officeCoords.lng,
        faceConfidenceScore: 98.8,
        faceCapturedBase64: capturedBase64,
        isLivenessVerified: true,
        locationName: targetName,
        distanceMeters: currentDistance,
        inGeofence: isInside,
        checkInMethod: attendanceMode === 'OFFICE' ? 'FACE_ID' : 'MOBILE_GPS_OTP',
      });

      res.employeeName = user?.fullName || 'Lê Phúc Hà';
      setAttendanceResult(res);

      // Refresh recent logs
      const updatedLogs = await api.getAttendanceHistory();
      setRecentLogs(updatedLogs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setVerifying(false);
      setTimeout(() => setLivenessStep(0), 1200);
    }
  };

  const allowedRadius = attendanceMode === 'OFFICE' ? officeCoords.radius : selectedProject.geofenceRadiusMeters;
  const isDistanceValid = currentDistance <= allowedRadius;

  return (
    <div className="page-wrapper">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Điểm Danh Sinh Trắc Học Face ID &amp; Đối Soát GPS Geofence (FE-03 / UC-07, UC-08)
          </h1>
          <p className="page-description">
            Hệ thống nhận diện khuôn mặt AI Liveness kết hợp đối soát tọa độ Haversine thời gian thực, ngăn chặn giả mạo vị trí và điểm danh từ xa
          </p>
        </div>

        <div className="header-actions">
          <span className="badge badge-success">
            <Radio size={12} />
            <span>Strict Geofence Radar: Đang Kích Hoạt</span>
          </span>
        </div>
      </div>

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Thiết Bị Camera &amp; Cảm Biến</span>
            <div className="kpi-icon-wrap">
              <Camera size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.15rem' }}>{hasCamera ? 'Sẵn Sàng' : 'Mô Phỏng Trực Tuyến'}</div>
          <div className="kpi-subtext">Độ phân giải: <span className="tabular-nums font-medium text-slate-700">640x480</span> • 30 FPS</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Mạng Nơ-ron AI Liveness</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <ScanFace size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>98.8%</div>
          <div className="kpi-subtext">Thuật toán: <span className="font-medium text-slate-700">MobileNet-V2 (128-d Vector)</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Khoảng Cách Tới Tâm Radar</span>
            <div className="kpi-icon-wrap" style={{ color: isDistanceValid ? '#1d4ed8' : '#b91c1c', backgroundColor: isDistanceValid ? '#eff6ff' : '#fef2f2' }}>
              <MapPin size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: isDistanceValid ? 'inherit' : '#b91c1c' }}>
            {currentDistance} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>mét</span>
          </div>
          <div className="kpi-subtext">
            Bán kính quy định: <span className="tabular-nums font-medium text-slate-700">{allowedRadius}m</span> ({isDistanceValid ? 'Hợp lệ' : 'Ngoài phạm vi'})
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Thời Gian Máy Chủ Chấm Công</span>
            <div className="kpi-icon-wrap">
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums font-mono" style={{ fontSize: '1.25rem' }}>
            {new Date().toLocaleTimeString('vi-VN')}
          </div>
          <div className="kpi-subtext">Đồng bộ máy chủ NTP Hải Minh (GMT+7)</div>
        </div>
      </div>

      {/* Emergency Toast Banner */}
      {emergencyToast && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{emergencyToast}</span>
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => handleModeChange('OFFICE')}
          className={`btn ${attendanceMode === 'OFFICE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
        >
          <Building2 size={16} />
          <span>Văn Phòng Trụ Sở (Face ID AI - TK 642)</span>
        </button>
        <button
          onClick={() => handleModeChange('SITE')}
          className={`btn ${attendanceMode === 'SITE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
        >
          <HardHat size={16} />
          <span>Kỹ Sư Hiện Trường (GPS &amp; Dynamic OTP - UC-07)</span>
        </button>
        <button
          onClick={() => handleModeChange('SITE_MONITOR')}
          className={`btn ${attendanceMode === 'SITE_MONITOR' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.75rem', justifyContent: 'center', backgroundColor: attendanceMode === 'SITE_MONITOR' ? '#d97706' : undefined, color: attendanceMode === 'SITE_MONITOR' ? '#ffffff' : undefined }}
        >
          <ScanFace size={16} />
          <span>Chỉ Huy Trưởng (Giám Sát Quân Số &amp; Điểm Danh Khẩn - UC-08)</span>
        </button>
      </div>

      {/* Mode: SITE_MONITOR (Site Commander Attendance Control Hub - UC-08) */}
      {attendanceMode === 'SITE_MONITOR' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Top Control Strip */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge badge-secondary">Ban Chỉ Huy Hiện Trường</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{selectedProject.name} ({selectedProject.code})</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Bán kính Geofence: <strong>{selectedProject.geofenceRadiusMeters}m</strong> • Mã OTP ca sáng: <strong className="font-mono text-amber-600">849 201</strong> • Quân số ca: <strong className="text-emerald-700">4 / 5 kỹ sư có mặt (80%)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(true)}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                >
                  <Clock size={15} />
                  <span>+ Điểm Danh Bổ Sung Khẩn Cấp (UC-08)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Site Roster Table */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardHat size={16} color="var(--color-primary)" />
                <h3 className="card-title">Danh Sách Kỹ Sư Công Trường &amp; Trạng Thái Điểm Danh Hôm Nay</h3>
              </div>
              <span className="badge badge-info">Theo Dõi Thời Gian Thực (Live Roster)</span>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="hm-table">
                <thead>
                  <tr>
                    <th className="text-left">Mã NV</th>
                    <th className="text-left">Họ Tên Kỹ Sư</th>
                    <th className="text-left">Vị Trí Công Việc</th>
                    <th className="text-center">Giờ Check-in</th>
                    <th className="text-left">Tọa Độ GPS Thực Tế</th>
                    <th className="text-center">Khoảng Cách</th>
                    <th className="text-center">Mã OTP Nhập</th>
                    <th className="text-center">Phương Thức</th>
                    <th className="text-center">Trạng Thái</th>
                    <th className="text-center">Thao Tác CHT</th>
                  </tr>
                </thead>
                <tbody>
                  {siteRoster.map((eng) => (
                    <tr key={eng.id}>
                      <td className="font-mono font-semibold">{eng.employeeCode}</td>
                      <td className="font-medium text-slate-900">{eng.employeeName}</td>
                      <td>{eng.position}</td>
                      <td className="text-center font-mono font-bold text-slate-800">
                        {eng.checkInTime !== '--:--' ? (
                          <span className="text-emerald-600">{eng.checkInTime}</span>
                        ) : (
                          <span className="text-slate-400">Chưa vào ca</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-slate-600">{eng.gpsCoords}</td>
                      <td className="text-center tabular-nums">
                        {eng.distance > 0 ? (
                          <span className="font-medium text-slate-800">{eng.distance} m</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-center font-mono font-bold">
                        {eng.otpCode !== '--' ? (
                          <span className="text-emerald-600">{eng.otpCode} &check;</span>
                        ) : (
                          <span className="text-slate-400">Chưa nhập</span>
                        )}
                      </td>
                      <td className="text-center">
                        {eng.method === 'EMERGENCY_SM_PUNCH' ? (
                          <span className="badge badge-danger">Điểm danh khẩn L1</span>
                        ) : eng.method === 'MOBILE_GPS_OTP' ? (
                          <span className="badge badge-success">GPS + OTP</span>
                        ) : (
                          <span className="badge badge-secondary">Chưa ghi nhận</span>
                        )}
                      </td>
                      <td className="text-center">
                        {eng.status === 'PRESENT' ? (
                          <span className="badge badge-success">Có mặt</span>
                        ) : eng.status === 'LATE' ? (
                          <span className="badge badge-warning">Muộn</span>
                        ) : (
                          <span className="badge badge-secondary">Vắng mặt / Sự cố</span>
                        )}
                      </td>
                      <td className="text-center">
                        {eng.status === 'MISSING' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmergencyForm({
                                employeeId: eng.id,
                                employeeName: eng.employeeName,
                                employeeCode: eng.employeeCode,
                                shift: 'DAY',
                                checkInTime: '07:35',
                                reason: 'Kỹ sư trắc địa mất sóng 4G đáy hố móng B3. Chỉ huy trưởng xác nhận thực tế.',
                              });
                              setShowEmergencyModal(true);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            + Điểm Danh Khẩn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emergency Punch Modal (UC-08) */}
          {showEmergencyModal && (
            <div className="modal-backdrop">
              <div className="modal-content" style={{ maxWidth: '540px' }}>
                <div className="modal-header">
                  <div>
                    <h3 className="modal-title">Điểm Danh Bổ Sung Khẩn Cấp Tại Hiện Trường (UC-08)</h3>
                    <p className="modal-subtitle">Chỉ huy trưởng trực tiếp ghi nhận công cho kỹ sư gặp sự cố thiết bị/mất sóng tại công trường</p>
                  </div>
                  <button onClick={() => setShowEmergencyModal(false)} className="btn-icon">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleEmergencySubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
                    <div className="form-group">
                      <label className="form-label">Dự Án Đang Thi Công</label>
                      <input type="text" className="form-input" value={`${selectedProject.name} (${selectedProject.code})`} disabled />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Chọn Kỹ Sư Cần Điểm Danh Khẩn Cấp</label>
                      <select
                        className="form-select"
                        value={emergencyForm.employeeCode}
                        onChange={(e) => {
                          const emp = siteRoster.find(r => r.employeeCode === e.target.value);
                          if (emp) {
                            setEmergencyForm(prev => ({
                              ...prev,
                              employeeId: emp.id,
                              employeeName: emp.employeeName,
                              employeeCode: emp.employeeCode,
                            }));
                          }
                        }}
                      >
                        {siteRoster.map(eng => (
                          <option key={eng.id} value={eng.employeeCode}>
                            {eng.employeeCode} - {eng.employeeName} ({eng.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Khung Ca Làm Việc</label>
                        <select
                          className="form-select"
                          value={emergencyForm.shift}
                          onChange={(e) => setEmergencyForm(prev => ({ ...prev, shift: e.target.value }))}
                        >
                          <option value="DAY">Ca Sáng Chuẩn (07:30 - 17:00)</option>
                          <option value="AFTERNOON">Ca Chiều Tiến Độ (13:00 - 21:00)</option>
                          <option value="NIGHT">Ca Đêm Đổ Bê Tông (20:00 - 04:00)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Giờ Check-In Thực Tế</label>
                        <input
                          type="time"
                          className="form-input font-mono"
                          value={emergencyForm.checkInTime}
                          onChange={(e) => setEmergencyForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Lý Do Khẩn Cấp Tại Hiện Trường (*)</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={emergencyForm.reason}
                        onChange={(e) => setEmergencyForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Mô tả sự cố (mất sóng, điện thoại hỏng, thi công hố móng kín...) để Chỉ huy trưởng ký bảo đảm..."
                        required
                      />
                    </div>

                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.75rem', fontSize: '0.75rem', color: '#92400e' }}>
                      <strong>Xác nhận Cấp 1 (L1):</strong> Thao tác này sẽ ghi nhận vào nhật ký kiểm toán hệ thống (Audit Trail - UC-28) dưới danh nghĩa Chỉ huy trưởng <strong>{user?.fullName || 'Nguyễn Lê Gia Phát'}</strong> và được gửi đối soát lên Phòng Nhân sự.
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={() => setShowEmergencyModal(false)} className="btn btn-secondary">
                      Hủy Bỏ
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626' }}>
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận &amp; Ký Điểm Danh Khẩn</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Terminal Grid for OFFICE & SITE modes */
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Left: Biometric Camera & AI Liveness Terminal */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ScanFace size={16} color="var(--color-primary)" />
                <h2 className="card-title">Màn Hình Thu Nhận Sinh Trắc Học</h2>
              </div>
              <span className={`badge ${verifying ? 'badge-warning' : 'badge-info'}`}>
                {verifying ? 'Đang Phân Tích Liveness...' : 'Anti-Spoofing Active'}
              </span>
            </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Camera Box with Biometric Reticle */}
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                height: '290px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#0f172a',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
              }}
            >
              {hasCamera ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                    }}
                  >
                    <Camera size={32} color="#94a3b8" />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                    Webcam Terminal Giả Lập
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {cameraError || 'Môi trường mô phỏng MobileNet-V2 sinh trắc học'}
                  </div>
                </div>
              )}

              {/* Minimalist Biometric Face Target Frame */}
              <div
                style={{
                  position: 'absolute',
                  width: '170px',
                  height: '220px',
                  borderRadius: '50%',
                  border: verifying ? '2px solid #10b981' : '1.5px dashed #38bdf8',
                  boxShadow: verifying ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Facial Landmark Points */}
                <div style={{ position: 'relative', width: '120px', height: '150px' }}>
                  <div style={{ position: 'absolute', left: '25px', top: '40px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: verifying ? '#10b981' : '#38bdf8' }} />
                  <div style={{ position: 'absolute', right: '25px', top: '40px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: verifying ? '#10b981' : '#38bdf8' }} />
                  <div style={{ position: 'absolute', left: '57px', top: '75px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: verifying ? '#10b981' : '#38bdf8' }} />
                  <div style={{ position: 'absolute', left: '40px', top: '110px', width: '40px', height: '2px', backgroundColor: verifying ? '#10b981' : '#38bdf8' }} />
                </div>
              </div>

              {/* Liveness Step HUD Overlay */}
              {verifying && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={14} className="animate-spin" color="#38bdf8" />
                    <span>
                      {livenessStep === 1 && 'Bước 1/3: Giữ yên, nhìn thẳng vào tâm camera...'}
                      {livenessStep === 2 && 'Bước 2/3: Chớp mắt tự nhiên để xác thực sinh thể...'}
                      {livenessStep === 3 && 'Bước 3/3: Nghiêng nhẹ đầu kiểm tra chiều sâu 3D...'}
                      {livenessStep === 4 && 'Đã xác thực thành công vector sinh trắc học!'}
                    </span>
                  </div>
                  <span className="tabular-nums font-mono text-emerald-400 font-semibold">
                    {livenessStep * 25}%
                  </span>
                </div>
              )}
            </div>

            {/* Camera Controls for Laptop & Smartphone */}
            <div style={{ width: '100%', maxWidth: '440px', display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={toggleCameraFacingMode}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.6875rem', padding: '0.35rem 0.6rem' }}
                  title="Chuyển đổi giữa Camera trước và Camera sau trên điện thoại"
                >
                  <SwitchCamera size={13} />
                  <span>Đổi Camera ({facingMode === 'user' ? 'Trước' : 'Sau'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snap = captureFrame();
                    if (snap) {
                      setCapturedSnapshot(snap);
                    }
                  }}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.6875rem', padding: '0.35rem 0.6rem' }}
                  title="Chụp khung hình thực tế từ thiết bị"
                >
                  <Camera size={13} />
                  <span>Chụp Thử Frame</span>
                </button>
              </div>

              {capturedSnapshot && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: '#047857' }}>
                  <img src={capturedSnapshot} alt="Snapshot Preview" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #10b981' }} />
                  <span>Đã bắt frame</span>
                </div>
              )}
            </div>

            {/* Site Mode Project & OTP Selector */}
            {attendanceMode === 'SITE' && (
              <div style={{ width: '100%', maxWidth: '440px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'block' }}>
                    Chọn Công Trình Đang Thi Công:
                  </label>
                  <select
                    className="form-select"
                    value={selectedProject.id}
                    onChange={(e) => {
                      const proj = mockProjects.find(p => p.id === Number(e.target.value));
                      if (proj) {
                        setSelectedProject(proj);
                        setGpsLocation({ lat: proj.latitude, lng: proj.longitude, accuracy: 10 });
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {mockProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) • Bán kính {p.geofenceRadiusMeters}m
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Mã OTP Công Trường Hôm Nay (6 Số):
                    </label>
                    <button
                      type="button"
                      onClick={() => setSiteOtpInput('849201')}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.6875rem', cursor: 'pointer', padding: 0 }}
                    >
                      (Điền nhanh: 849201)
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      maxLength={6}
                      className="form-input"
                      placeholder="Nhập 6 số do Chỉ huy trưởng cấp..."
                      value={siteOtpInput}
                      onChange={(e) => setSiteOtpInput(e.target.value.replace(/\D/g, ''))}
                      style={{ width: '100%', paddingLeft: '2rem', letterSpacing: '0.15em', fontWeight: 600 }}
                    />
                  </div>
                  {otpError && (
                    <div style={{ color: '#b91c1c', fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                      {otpError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleCheckIn}
                disabled={verifying || (!isDistanceValid && currentDistance > allowedRadius * 1.5)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
              >
                {verifying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang Xử Lý Vector Sinh Trắc &amp; Tọa Độ GPS...</span>
                  </>
                ) : (
                  <>
                    <ScanFace size={16} />
                    <span>Xác Nhận Điểm Danh {attendanceMode === 'OFFICE' ? 'Văn Phòng' : 'Công Trường'}</span>
                  </>
                )}
              </button>
              <div className="text-xs text-slate-500 text-center">
                Yêu cầu nhìn thẳng, không đeo kính râm hoặc khẩu trang kín khi thực hiện chấm công
              </div>
            </div>
          </div>
        </div>

        {/* Right: GPS Location Simulator & Verification Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* GPS Geofence Radar & Interactive Live Map Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="var(--color-primary)" />
                <h3 className="card-title">Bản Đồ GPS Geofence Radar Thời Gian Thực</h3>
              </div>
              <span className={`badge ${isDistanceValid ? 'badge-success' : 'badge-danger'}`}>
                {isDistanceValid ? 'Trong Vùng Hợp Lệ' : 'Vượt Quá Bán Kính'}
              </span>
            </div>

            <div className="card-body">
              {/* GPS Source Toggle: Real Device vs Demo Presets */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setGpsMode('REAL_DEVICE');
                    fetchRealGpsLocation();
                  }}
                  className={`btn btn-sm ${gpsMode === 'REAL_DEVICE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                >
                  <Smartphone size={13} />
                  <span>Dùng GPS Thật (Thiết Bị)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGpsMode('PRESET_SIM')}
                  className={`btn btn-sm ${gpsMode === 'PRESET_SIM' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                >
                  <Navigation size={13} />
                  <span>Vị Trí Mẫu (Presets)</span>
                </button>
              </div>

              {/* Real GPS Info Strip */}
              {gpsMode === 'REAL_DEVICE' ? (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.75rem', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>GPS Thiết Bị:</strong> {realDeviceGps ? `${realDeviceGps.lat.toFixed(5)}° N, ${realDeviceGps.lng.toFixed(5)}° E (±${realDeviceGps.accuracy}m)` : 'Đang lấy tọa độ vệ tinh...'}
                  </div>
                  <button
                    type="button"
                    onClick={fetchRealGpsLocation}
                    disabled={isLocating}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                  >
                    <RefreshCw size={11} className={isLocating ? 'animate-spin' : undefined} />
                    <span>Làm mới GPS</span>
                  </button>
                </div>
              ) : (
                /* Presets Button Group for Audit & Testing */
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Chọn Nhanh Tọa Độ Thử Nghiệm Haversine:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {officePresets.map((preset) => {
                      const isSelected = activePreset.name === preset.name;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => handleSelectPreset(preset)}
                          type="button"
                          style={{
                            padding: '0.45rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                            backgroundColor: isSelected ? 'var(--color-primary-subtle)' : '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? 'var(--color-primary)' : 'var(--text-main)' }}>
                            {preset.name}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }} className="tabular-nums">
                            {preset.distance}m • {preset.status === 'VALID' ? 'Hợp lệ' : preset.status === 'WARNING' ? 'Cảnh báo' : 'Bị chặn'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interactive OpenStreetMap Leaflet Component */}
              <div style={{ marginBottom: '0.75rem' }}>
                <InteractiveMap
                  userLocation={gpsLocation}
                  targetLocation={{
                    lat: attendanceMode === 'OFFICE' ? officeCoords.lat : selectedProject.latitude,
                    lng: attendanceMode === 'OFFICE' ? officeCoords.lng : selectedProject.longitude,
                    name: attendanceMode === 'OFFICE' ? 'Trụ Sở Hải Minh Tower (P.1802)' : selectedProject.name,
                    radiusMeters: allowedRadius,
                  }}
                  distanceMeters={currentDistance}
                  isInGeofence={isDistanceValid}
                  onMapClick={(lat, lng) => handleMapClick(lat, lng)}
                  height="260px"
                />
              </div>

              {/* Live Location Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.3rem' }}>
                  <span className="text-slate-500">Tọa độ đang dùng:</span>
                  <span className="tabular-nums font-mono font-medium text-slate-900">
                    {gpsLocation ? `${gpsLocation.lat.toFixed(5)}° N, ${gpsLocation.lng.toFixed(5)}° E` : 'Đang dò GPS...'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.3rem' }}>
                  <span className="text-slate-500">Địa điểm đối soát:</span>
                  <span className="font-medium text-slate-900">
                    {attendanceMode === 'OFFICE' ? 'Hải Minh Tower (Cầu Giấy, Hà Nội)' : selectedProject.name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.3rem' }}>
                  <span className="text-slate-500">Khoảng cách tới tâm:</span>
                  <span className={`tabular-nums font-semibold ${isDistanceValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {currentDistance} mét (Cho phép: &le; {allowedRadius}m)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-slate-500">Chống gian lận vị trí:</span>
                  <span className="badge badge-slate">Đã Kiểm Thức Haversine</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Result Card */}
          {attendanceResult && (
            <div className="card" style={{ borderLeft: '3px solid #10b981' }}>
              <div className="card-header" style={{ backgroundColor: '#ecfdf5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={16} color="#047857" />
                  <h3 className="card-title" style={{ color: '#047857' }}>Chấm Công Thành Công</h3>
                </div>
                <span className="badge badge-success">Ghi Nhận Cơ Sở Dữ Liệu</span>
              </div>

              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span className="text-xs text-slate-500">Cán bộ nhân viên:</span>
                    <div className="font-semibold text-slate-900">{attendanceResult.employeeName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Thời gian điểm danh:</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900">{attendanceResult.checkInTime}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Địa điểm xác thực:</span>
                    <div className="font-medium text-slate-800">{attendanceResult.locationName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Độ tin cậy sinh trắc:</span>
                    <div className="font-semibold tabular-nums text-emerald-700">{attendanceResult.faceConfidenceScore}% (Passed)</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Phương thức:</span>
                    <div className="text-slate-700">{attendanceResult.checkInMethod === 'FACE_ID' ? 'Face ID AI + GPS' : 'GPS + Site OTP'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Tài khoản hạch toán:</span>
                    <div className="font-medium text-slate-900">{attendanceMode === 'OFFICE' ? 'TK 642 (Quản lý DN)' : 'TK 627 (Chi phí CT)'}</div>
                  </div>
                </div>

                {/* Display Captured Real Face Snapshot from Device */}
                {capturedSnapshot && (
                  <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={capturedSnapshot}
                      alt="Ảnh chụp thực tế từ camera"
                      style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover', border: '1.5px solid #2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check size={12} color="#10b981" />
                        <span>Ảnh Chụp Thực Tế Từ Camera Thiết Bị</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        Đã trích xuất đặc trưng sinh trắc học &amp; lưu chứng chỉ kiểm toán (Audit Trail)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 4. Live Attendance Feed Table (High Density Enterprise) */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <History size={16} color="var(--color-primary)" />
            <h3 className="card-title">Nhật Ký Điểm Danh Gần Đây Toàn Công Ty (Real-time Audit Log)</h3>
          </div>
          <span className="badge badge-info">
            <span className="tabular-nums">{recentLogs.length}</span> Bản ghi hôm nay
          </span>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '85px' }}>Thời Gian</th>
                <th className="text-left">Mã &amp; Họ Tên Nhân Sự</th>
                <th className="text-left">Địa Điểm / Dự Án</th>
                <th className="text-center" style={{ width: '120px' }}>Khoảng Cách</th>
                <th className="text-center" style={{ width: '110px' }}>Độ Tin Cậy AI</th>
                <th className="text-center">Phương Thức</th>
                <th className="text-center" style={{ width: '100px' }}>Trạng Thái</th>
                <th className="text-left">Thiết Bị Điểm Danh</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="text-left font-mono tabular-nums font-semibold text-slate-800">
                    {log.checkInTime}
                  </td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{log.employeeName}</div>
                    <div className="text-xs font-mono text-slate-500">{log.employeeCode}</div>
                  </td>
                  <td className="text-left text-slate-700">
                    {log.locationName || 'Trụ Sở Hải Minh Tower'}
                  </td>
                  <td className="text-center tabular-nums">
                    <span className={`font-medium ${log.inGeofence ? 'text-slate-800' : 'text-rose-700'}`}>
                      {log.distanceMeters || 32} m
                    </span>
                  </td>
                  <td className="text-center tabular-nums text-emerald-700 font-semibold">
                    {log.faceConfidenceScore ? `${log.faceConfidenceScore}%` : '98.5%'}
                  </td>
                  <td className="text-center">
                    {log.checkInMethod === 'FACE_ID' ? (
                      <span className="badge badge-info">Face ID Web</span>
                    ) : (
                      <span className="badge badge-warning">GPS + OTP</span>
                    )}
                  </td>
                  <td className="text-center">
                    {log.status === 'PRESENT' ? (
                      <span className="badge badge-success">Đúng giờ</span>
                    ) : log.status === 'LATE' ? (
                      <span className="badge badge-warning">Đi muộn</span>
                    ) : (
                      <span className="badge badge-secondary">{log.status}</span>
                    )}
                  </td>
                  <td className="text-left text-xs font-mono text-slate-500">
                    {log.deviceFingerprint || 'Chrome / Win11'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
