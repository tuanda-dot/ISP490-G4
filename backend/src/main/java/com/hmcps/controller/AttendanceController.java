package com.hmcps.controller;

import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.service.GpsAttendanceService;
import com.hmcps.service.GpsAttendanceService.GpsCheckInRequest;
import com.hmcps.service.GpsAttendanceService.GpsCheckInResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller xử lý luồng Điểm danh Hiện trường (UC-07) và Quản lý OTP Ca Làm việc (UC-08).
 * Tác giả thực hiện: GiangNT
 */
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final GpsAttendanceService gpsAttendanceService;

    // ==========================================
    // 1. NHÓM CHỨC NĂNG ĐIỂM DANH HIỆN TRƯỜNG (UC-07)
    // ==========================================

    /**
     * Kỹ sư hiện trường điểm danh vào ca qua GPS Geofence + Dynamic OTP
     */
    @PostMapping("/gps-checkin")
    public ResponseEntity<GpsCheckInResult> gpsCheckIn(@RequestBody GpsCheckInRequest checkInPayload) {
        GpsCheckInResult checkInResult = gpsAttendanceService.checkInWithGpsAndOtp(checkInPayload);
        return ResponseEntity.ok(checkInResult);
    }

    /**
     * Kỹ sư kết thúc ca làm việc và ghi nhận giờ check-out
     */
    @PostMapping("/gps-checkout")
    public ResponseEntity<Attendance> gpsCheckOut(@RequestBody CheckOutRequest checkOutPayload) {
        Attendance attendanceLog = gpsAttendanceService.checkOutWithGps(
                checkOutPayload.getEmployeeId(),
                checkOutPayload.getLatitude(),
                checkOutPayload.getLongitude()
        );
        return new ResponseEntity<>(attendanceLog, HttpStatus.OK);
    }

    // ==========================================
    // 2. NHÓM CHỨC NĂNG QUẢN LÝ OTP CÔNG TRÌNH (UC-08)
    // ==========================================

    /**
     * Chỉ huy trưởng công trình khởi tạo mã OTP ngày cho dự án
     */
    @PostMapping("/otp/generate")
    public ResponseEntity<DailySiteOtp> generateDailyOtp(@RequestBody GenerateOtpRequest generateOtpPayload) {
        DailySiteOtp dailyOtp = gpsAttendanceService.generateDailySiteOtp(
                generateOtpPayload.getProjectId(),
                generateOtpPayload.getSiteManagerId()
        );
        return ResponseEntity.ok(dailyOtp);
    }

    /**
     * Kiểm tra tính hợp lệ của mã OTP công trình
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest verifyOtpPayload) {
        boolean isOtpValid = gpsAttendanceService.verifyDailyOtp(
                verifyOtpPayload.getProjectId(),
                verifyOtpPayload.getOtpCode()
        );

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("valid", isOtpValid);
        responseData.put("message", isOtpValid ? "Mã OTP hợp lệ" : "Mã OTP không đúng hoặc đã hết hạn");

        return ResponseEntity.ok(responseData);
    }

    // ==========================================
    // DATA TRANSFER OBJECTS (DTOs)
    // ==========================================

    @Data
    public static class CheckOutRequest {
        private Long employeeId;
        private Double latitude;
        private Double longitude;
    }

    @Data
    public static class GenerateOtpRequest {
        private Long projectId;
        private Long siteManagerId;
    }

    @Data
    public static class VerifyOtpRequest {
        private Long projectId;
        private String otpCode;
    }
}
