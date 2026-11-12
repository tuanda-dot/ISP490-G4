package com.hmcps.controller;

import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.service.BiometricAttendanceService;
import com.hmcps.service.GpsAttendanceService;
import com.hmcps.service.GpsAttendanceService.GpsCheckInRequest;
import com.hmcps.service.GpsAttendanceService.GpsCheckInResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final GpsAttendanceService gpsAttendanceService;
    private final BiometricAttendanceService biometricAttendanceService;

    @Data
    public static class GenerateOtpRequest {
        private Long projectId;
        private Long siteManagerId;
    }

    @Data
    public static class CheckOutRequest {
        private Long employeeId;
        private Double latitude;
        private Double longitude;
    }

    @Data
    public static class IngestBiometricRequest {
        private Long deviceId;
        private Integer biometricUserId;
        private LocalDateTime timestamp;
        private String verifyType;
    }

    /**
     * Chỉ huy trưởng (Site Manager) sinh mã OTP Động theo ngày cho công trình (FE-03)
     */
    @PostMapping("/otp/generate")
    public ResponseEntity<DailySiteOtp> generateDailyOtp(
            @RequestBody(required = false) GenerateOtpRequest request,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long siteManagerId,
            @RequestParam(required = false) Long managerId) {
        Long resolvedProjectId = request != null && request.getProjectId() != null
                ? request.getProjectId()
                : (projectId != null ? projectId : 1L);
        Long resolvedManagerId = request != null && request.getSiteManagerId() != null
                ? request.getSiteManagerId()
                : (siteManagerId != null ? siteManagerId : (managerId != null ? managerId : 5L));
        DailySiteOtp otp = gpsAttendanceService.generateDailySiteOtp(resolvedProjectId, resolvedManagerId);
        return ResponseEntity.ok(otp);
    }

    /**
     * Kỹ sư công trường Check-in bằng Mobile GPS Geofencing + Daily OTP
     */
    @PostMapping("/gps-checkin")
    public ResponseEntity<GpsCheckInResult> gpsCheckIn(@RequestBody GpsCheckInRequest request) {
        GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Kỹ sư công trường Check-out kết thúc ca làm việc
     */
    @PostMapping("/gps-checkout")
    public ResponseEntity<Attendance> gpsCheckOut(@RequestBody CheckOutRequest request) {
        Attendance att = gpsAttendanceService.checkOutWithGps(request.getEmployeeId(), request.getLatitude(), request.getLongitude());
        return ResponseEntity.ok(att);
    }

    /**
     * Nạp log sinh trắc học từ máy chấm công ZKTeco / Kiosk FaceID (Khối Văn phòng)
     */
    @PostMapping("/biometric/ingest")
    public ResponseEntity<String> ingestBiometricPunch(@RequestBody IngestBiometricRequest request) {
        biometricAttendanceService.ingestBiometricLog(
                request.getDeviceId(), request.getBiometricUserId(), request.getTimestamp(), request.getVerifyType());
        return ResponseEntity.ok("Biometric log recorded successfully.");
    }

    /**
     * Điểm danh Face ID trực tiếp qua Camera (Laptop Webcam trên Web Portal hoặc Smartphone Camera trên Mobile)
     */
    @PostMapping("/face-id/check-in")
    public ResponseEntity<Attendance> faceIdCheckIn(@RequestBody com.hmcps.common.dto.FaceIdCheckInRequest request) {
        Attendance att = biometricAttendanceService.checkInWithFaceIdAndGps(request);
        return ResponseEntity.ok(att);
    }

    @Data
    public static class VerifyOtpRequest {
        private Long projectId;
        private String otpCode;
    }

    /**
     * Xác thực mã OTP điểm danh hiện trường
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<java.util.Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        boolean valid = gpsAttendanceService.verifyDailyOtp(request.getProjectId(), request.getOtpCode());
        return ResponseEntity.ok(java.util.Map.of("valid", valid, "message", valid ? "Mã OTP hợp lệ" : "Mã OTP không đúng hoặc đã hết hạn"));
    }

    /**
     * Lấy mã OTP hiện hành của công trình
     */
    @GetMapping("/otp/active/{projectId}")
    public ResponseEntity<DailySiteOtp> getActiveOtp(@PathVariable Long projectId) {
        return gpsAttendanceService.getActiveDailyOtp(projectId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
