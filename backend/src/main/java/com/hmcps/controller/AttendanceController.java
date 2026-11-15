package com.hmcps.controller;

import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.entity.Employee;
import com.hmcps.entity.Project;
import com.hmcps.repository.AttendanceRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.ProjectRepository;
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
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final GpsAttendanceService gpsAttendanceService;
    private final BiometricAttendanceService biometricAttendanceService;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;

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
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SITE_MANAGER')")
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

    /**
     * Lấy danh sách lịch sử chấm công từ CƠ SỞ DỮ LIỆU (attendances table) để đồng bộ với Frontend
     */
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getAttendanceHistory(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long projectId) {
        List<Attendance> records = attendanceRepository.findAll();
        records.sort(Comparator.comparing(Attendance::getWorkDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Attendance::getId, Comparator.nullsLast(Comparator.reverseOrder())));

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        List<Map<String, Object>> result = new ArrayList<>();

        for (Attendance att : records) {
            if (employeeId != null && !employeeId.equals(att.getEmployeeId())) {
                continue;
            }
            if (projectId != null && !projectId.equals(att.getProjectId())) {
                continue;
            }
            Employee emp = att.getEmployeeId() != null ? employeeRepository.findById(att.getEmployeeId()).orElse(null) : null;
            Project proj = att.getProjectId() != null ? projectRepository.findById(att.getProjectId()).orElse(null) : null;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", att.getId());
            item.put("employeeId", att.getEmployeeId());
            item.put("employeeCode", emp != null ? emp.getEmployeeCode() : "HM-" + String.format("%03d", att.getEmployeeId() != null ? att.getEmployeeId() : 0));
            item.put("employeeName", emp != null ? emp.getFullName() : "Nhân sự #" + att.getEmployeeId());
            item.put("projectId", att.getProjectId() != null ? att.getProjectId() : 0L);
            item.put("projectName", proj != null ? proj.getName() : "Văn Phòng Trụ Sở Hải Minh Tower");
            item.put("workDate", att.getWorkDate() != null ? att.getWorkDate().toString() : LocalDate.now().toString());
            item.put("checkInTime", att.getCheckInTime() != null ? att.getCheckInTime().format(timeFmt) : "07:55");
            item.put("checkOutTime", att.getCheckOutTime() != null ? att.getCheckOutTime().format(timeFmt) : null);
            item.put("checkInMethod", att.getFaceSnapshotUrl() != null || Boolean.TRUE.equals(att.getLivenessVerified()) ? "FACE_ID" : "GPS");
            item.put("distanceMeters", att.getDistanceMeters() != null ? Math.round(att.getDistanceMeters()) : 12);
            item.put("regularHours", att.getRegularHours() != null ? att.getRegularHours().doubleValue() : 8.0);
            item.put("overtimeHours", att.getOvertimeHours() != null ? att.getOvertimeHours().doubleValue() : 0.0);
            item.put("nightHours", att.getNightHours() != null ? att.getNightHours().doubleValue() : 0.0);
            item.put("status", att.getStatus() != null ? att.getStatus().name() : "ON_TIME");
            item.put("faceConfidence", att.getConfidenceScore() != null ? Math.round(att.getConfidenceScore().doubleValue() * 1000.0) / 10.0 : null);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }
}
