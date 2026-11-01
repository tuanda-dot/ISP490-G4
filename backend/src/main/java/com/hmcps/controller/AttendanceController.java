package com.hmcps.controller;

import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.service.GpsAttendanceService;
import com.hmcps.service.GpsAttendanceService.GpsCheckInRequest;
import com.hmcps.service.GpsAttendanceService.GpsCheckInResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho Điểm danh Hiện trường & Quản lý OTP Ca Làm việc (UC-07 & UC-08)
 * Phụ trách bởi: GiangNT
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final GpsAttendanceService gpsAttendanceService;

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
    public static class VerifyOtpRequest {
        private Long projectId;
        private String otpCode;
    }

    /**
     * Chỉ huy trưởng (Site Manager) sinh mã OTP động theo ngày cho công trình (UC-08)
     */
    @PostMapping("/otp/generate")
    public ResponseEntity<DailySiteOtp> generateDailyOtp(@RequestBody GenerateOtpRequest request) {
        DailySiteOtp otp = gpsAttendanceService.generateDailySiteOtp(request.getProjectId(), request.getSiteManagerId());
        return ResponseEntity.ok(otp);
    }

    /**
     * Xác thực mã OTP điểm danh hiện trường (UC-08)
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<java.util.Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        boolean valid = gpsAttendanceService.verifyDailyOtp(request.getProjectId(), request.getOtpCode());
        return ResponseEntity.ok(java.util.Map.of("valid", valid, "message", valid ? "Mã OTP hợp lệ" : "Mã OTP không đúng hoặc đã hết hạn"));
    }

    /**
     * Kỹ sư công trình Check-in bằng Mobile GPS Geofencing + Daily OTP (UC-07)
     */
    @PostMapping("/gps-checkin")
    public ResponseEntity<GpsCheckInResult> gpsCheckIn(@RequestBody GpsCheckInRequest request) {
        GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Kỹ sư công trình Check-out kết thúc ca làm việc (UC-07)
     */
    @PostMapping("/gps-checkout")
    public ResponseEntity<Attendance> gpsCheckOut(@RequestBody CheckOutRequest request) {
        Attendance att = gpsAttendanceService.checkOutWithGps(request.getEmployeeId(), request.getLatitude(), request.getLongitude());
        return ResponseEntity.ok(att);
    }
}
