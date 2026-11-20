package com.hmcps.controller;

import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.entity.Employee;
import com.hmcps.entity.Project;
import com.hmcps.repository.AttendanceRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.EngineerAssignmentRepository;
import com.hmcps.repository.ProjectRepository;
import com.hmcps.security.SecurityContextUtils;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.BiometricAttendanceService;
import com.hmcps.service.GpsAttendanceService;
import com.hmcps.service.GpsAttendanceService.GpsCheckInRequest;
import com.hmcps.service.GpsAttendanceService.GpsCheckInResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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

    @Autowired(required = false)
    private EngineerAssignmentRepository assignmentRepository;

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
     * Chỉ huy trưởng (Site Manager) sinh mã OTP Động theo ngày cho công trình mình phụ trách (FE-03)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SITE_MANAGER')")
    @PostMapping("/otp/generate")
    public ResponseEntity<DailySiteOtp> generateDailyOtp(
            @RequestBody(required = false) GenerateOtpRequest request,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long siteManagerId,
            @RequestParam(required = false) Long managerId) {
        UserPrincipal principal = SecurityContextUtils.getCurrentPrincipal();
        Long resolvedProjectId = request != null && request.getProjectId() != null
                ? request.getProjectId()
                : (projectId != null ? projectId : 1L);
        SecurityContextUtils.enforceSiteManagerProjectScope(principal, resolvedProjectId, projectRepository);
        Long resolvedManagerId = principal != null
                ? principal.getId()
                : (request != null && request.getSiteManagerId() != null
                        ? request.getSiteManagerId()
                        : (siteManagerId != null ? siteManagerId : (managerId != null ? managerId : 5L)));
        DailySiteOtp otp = gpsAttendanceService.generateDailySiteOtp(resolvedProjectId, resolvedManagerId);
        return ResponseEntity.ok(otp);
    }

    /**
     * Kỹ sư công trường Check-in bằng Mobile GPS Geofencing + Daily OTP (Chống chấm công hộ)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @PostMapping("/gps-checkin")
    public ResponseEntity<GpsCheckInResult> gpsCheckIn(@RequestBody GpsCheckInRequest request) {
        UserPrincipal principal = SecurityContextUtils.getCurrentPrincipal();
        if (principal != null) {
            if (request.getEmployeeId() != null && !Objects.equals(principal.getId(), request.getEmployeeId())) {
                throw new AccessDeniedException("Chống gian lận chấm công: Bạn không được phép Check-in GPS hộ tài khoản nhân viên khác!");
            }
            request.setEmployeeId(principal.getId());
        }
        GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Kỹ sư công trường Check-out kết thúc ca làm việc (Chống chấm công hộ)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @PostMapping("/gps-checkout")
    public ResponseEntity<Attendance> gpsCheckOut(@RequestBody CheckOutRequest request) {
        UserPrincipal principal = SecurityContextUtils.getCurrentPrincipal();
        Long resolvedEmpId = request.getEmployeeId();
        if (principal != null) {
            if (resolvedEmpId != null && !Objects.equals(principal.getId(), resolvedEmpId)) {
                throw new AccessDeniedException("Chống gian lận chấm công: Bạn không được phép Check-out GPS hộ tài khoản nhân viên khác!");
            }
            resolvedEmpId = principal.getId();
        }
        Attendance att = gpsAttendanceService.checkOutWithGps(resolvedEmpId, request.getLatitude(), request.getLongitude());
        return ResponseEntity.ok(att);
    }

    /**
     * Nạp log sinh trắc học từ máy chấm công ZKTeco / Kiosk FaceID — Chỉ HR / System Admin
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PostMapping("/biometric/ingest")
    public ResponseEntity<String> ingestBiometricPunch(@RequestBody IngestBiometricRequest request) {
        biometricAttendanceService.ingestBiometricLog(
                request.getDeviceId(), request.getBiometricUserId(), request.getTimestamp(), request.getVerifyType());
        return ResponseEntity.ok("Biometric log recorded successfully.");
    }

    /**
     * Điểm danh Face ID trực tiếp qua Camera (Chống điểm danh hộ IDOR)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @PostMapping("/face-id/check-in")
    public ResponseEntity<Attendance> faceIdCheckIn(@RequestBody com.hmcps.common.dto.FaceIdCheckInRequest request) {
        UserPrincipal principal = SecurityContextUtils.getCurrentPrincipal();
        if (principal != null) {
            if (request.getEmployeeId() != null && !Objects.equals(principal.getId(), request.getEmployeeId())) {
                throw new AccessDeniedException("Chống gian lận Face ID: Bạn chỉ được phép điểm danh Face ID cho chính tài khoản đang đăng nhập!");
            }
            request.setEmployeeId(principal.getId());
        }
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
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @PostMapping("/otp/verify")
    public ResponseEntity<java.util.Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        boolean valid = gpsAttendanceService.verifyDailyOtp(request.getProjectId(), request.getOtpCode());
        return ResponseEntity.ok(java.util.Map.of("valid", valid, "message", valid ? "Mã OTP hợp lệ" : "Mã OTP không đúng hoặc đã hết hạn"));
    }

    /**
     * Lấy mã OTP hiện hành của công trình — Chỉ Chỉ huy trưởng phụ trách / HR Manager / BGĐ
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SITE_MANAGER', 'HR_MANAGER', 'DIRECTOR', 'CEO')")
    @GetMapping("/otp/active/{projectId}")
    public ResponseEntity<DailySiteOtp> getActiveOtp(@PathVariable Long projectId) {
        SecurityContextUtils.enforceSiteManagerProjectScope(
                SecurityContextUtils.getCurrentPrincipal(), projectId, projectRepository);
        return gpsAttendanceService.getActiveDailyOtp(projectId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Lấy danh sách lịch sử chấm công từ CƠ SỞ DỮ LIỆU — Có lọc phạm vi theo vai trò (chống IDOR)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getAttendanceHistory(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long projectId) {
        UserPrincipal principal = SecurityContextUtils.getCurrentPrincipal();
        Long effectiveEmployeeId = employeeId;
        Set<Long> allowedProjectIds = null;
        Set<Long> allowedEngineerIds = null;

        if (principal != null && !SecurityContextUtils.isHrOrFinanceOrDirector(principal)) {
            if (SecurityContextUtils.isSiteManager(principal)) {
                allowedProjectIds = SecurityContextUtils.getManagedProjectIds(principal, projectRepository);
                allowedEngineerIds = SecurityContextUtils.getManagedEngineerIds(principal, projectRepository, assignmentRepository);
            } else {
                // Nhân viên VP / Kỹ sư chỉ được xem lịch sử chấm công của chính mình
                if (employeeId != null && !Objects.equals(principal.getId(), employeeId)) {
                    throw new AccessDeniedException("Bảo mật chấm công (IDOR): Bạn chỉ được phép xem lịch sử chấm công của chính mình!");
                }
                effectiveEmployeeId = principal.getId();
            }
        }

        List<Attendance> records = attendanceRepository.findAll();
        records.sort(Comparator.comparing(Attendance::getWorkDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Attendance::getId, Comparator.nullsLast(Comparator.reverseOrder())));

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        List<Map<String, Object>> result = new ArrayList<>();

        for (Attendance att : records) {
            if (effectiveEmployeeId != null && !effectiveEmployeeId.equals(att.getEmployeeId())) {
                continue;
            }
            if (projectId != null && !projectId.equals(att.getProjectId())) {
                continue;
            }
            if (allowedProjectIds != null) {
                boolean matchSelf = Objects.equals(principal.getId(), att.getEmployeeId());
                boolean matchProj = att.getProjectId() != null && allowedProjectIds.contains(att.getProjectId());
                boolean matchEng = allowedEngineerIds != null && allowedEngineerIds.contains(att.getEmployeeId());
                if (!matchSelf && !matchProj && !matchEng) {
                    continue;
                }
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
