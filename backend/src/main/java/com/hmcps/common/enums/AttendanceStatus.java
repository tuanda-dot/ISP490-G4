package com.hmcps.common.enums;

/**
 * Trạng thái chấm công (Hybrid Attendance):
 * - GPS_VERIFIED: Kỹ sư công trường chấm công hợp lệ bằng Mobile GPS Geofencing + Daily OTP
 * - BIOMETRIC_VERIFIED: Nhân viên văn phòng chấm công thành công qua Máy quét vân tay / FaceID ZKTeco
 * - MANUAL_ADJUSTED: Được HR/Chỉ huy trưởng điều chỉnh bổ sung (có giải trình hợp lệ)
 * - INVALID_GEOFENCE: Bị từ chối do ngoài bán kính công trường
 * - INVALID_OTP: Bị từ chối do sai mã OTP của công trường trong ngày
 */
public enum AttendanceStatus {
    FACE_ID_GPS_VERIFIED, // Xác thực kép/tam trùng kết hợp Face ID AI và GPS Geofencing (cả Văn phòng & Công trường)
    GPS_VERIFIED,
    FACE_ID_VERIFIED,
    BIOMETRIC_VERIFIED,
    MANUAL_ADJUSTED,
    INVALID_GEOFENCE,
    INVALID_OTP
}
