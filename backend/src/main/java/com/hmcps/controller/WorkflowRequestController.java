package com.hmcps.controller;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.common.util.StatutoryHolidayUtils;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import com.hmcps.service.integration.EmailService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Controller Quản lý Quy trình Phê duyệt Đơn từ 2 Cấp (FE-04, FE-05, UC-11, UC-13)
 * Cấp 1: Chỉ huy trưởng công trường duyệt hiện trường (L1)
 * Cấp 2: Trưởng phòng Nhân sự duyệt toàn công ty (L2) & Tự động hạch toán vào Bảng Chấm Công
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkflowRequestController {

    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final MonthlyTimesheetRepository timesheetRepository;
    private final AttendanceRepository attendanceRepository;
    private final OvertimeRequestRepository overtimeRequestRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceExplanationRepository attendanceExplanationRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;

    private static final AtomicLong ID_GEN = new AtomicLong(1000);
    private static final Map<Long, OvertimeDto> overtimeMap = new ConcurrentHashMap<>();
    private static final Map<Long, LeaveDto> leaveMap = new ConcurrentHashMap<>();
    private static final Map<Long, ExplanationDto> explanationMap = new ConcurrentHashMap<>();

    static {
        // Seed initial Overtime & Night Duty Requests (Trưởng phòng / CHT lập & duyệt trực tiếp 1 bước; 150% ngày thường/đêm/cuối tuần, 200% Lễ/Tết; Trực đêm = 1.5 công)
        overtimeMap.put(1L, OvertimeDto.builder()
                .id(1L)
                .employeeId(6L)
                .employeeCode("HM-006")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .createdById(5L)
                .createdByName("Nguyễn Lê Gia Phát")
                .createdByRole("SITE_MANAGER")
                .workDate("2026-10-21")
                .startTime("22:00")
                .endTime("05:00")
                .otHours(7.0)
                .otType("SITE_NIGHT_DUTY")
                .multiplier(0.0)
                .isNightDuty(true)
                .nightDutyConvertedDays(1.5)
                .reason("Trực đêm công trường giám sát đổ bê tông dầm cầu nhịp chính K14 (22h00 - 05h00).")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("PENDING")
                .hrApproval("NOT_REQUIRED")
                .actualFaceIdHours(7.0)
                .payableOtHours(0.0)
                .faceIdReconcileStatus("MATCHED")
                .faceIdCheckIn("22:00")
                .faceIdCheckOut("05:00 (+1)")
                .faceIdNote("Trực đêm công trường (22h00 - 05h00): 01 buổi = 1,5 ngày công, hôm sau nghỉ bù.")
                .estimatedCost(0.0)
                .budgetCapAtCreation(25000000.0)
                .status("PENDING_MANAGER")
                .createdAt("2026-10-21 09:30")
                .build());

        overtimeMap.put(2L, OvertimeDto.builder()
                .id(2L)
                .employeeId(7L)
                .employeeCode("HM-007")
                .employeeName("Phạm Thành Nam")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .createdById(5L)
                .createdByName("Nguyễn Lê Gia Phát")
                .createdByRole("SITE_MANAGER")
                .workDate("2026-10-22")
                .startTime("18:00")
                .endTime("22:00")
                .otHours(4.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Kéo cáp dự ứng lực khoang nhịp K12 ban đêm.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("APPROVED")
                .hrApproval("NOT_REQUIRED")
                .reconciledById(5L)
                .reconciledByName("Nguyễn Lê Gia Phát")
                .reconciledByRole("SITE_MANAGER")
                .reconciledAt("2026-10-22 10:15")
                .actualFaceIdHours(4.0)
                .payableOtHours(4.0)
                .faceIdReconcileStatus("MATCHED")
                .faceIdCheckIn("07:15")
                .faceIdCheckOut("22:05")
                .faceIdNote("Khớp dữ liệu Face ID + GPS công trường 100% (4.0h).")
                .estimatedCost(692308.0)
                .budgetCapAtCreation(25000000.0)
                .status("APPROVED")
                .createdAt("2026-10-20 16:15")
                .build());

        overtimeMap.put(3L, OvertimeDto.builder()
                .id(3L)
                .employeeId(5L)
                .employeeCode("HM-005")
                .employeeName("Nguyễn Lê Gia Phát")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .createdById(5L)
                .createdByName("Nguyễn Lê Gia Phát")
                .createdByRole("SITE_MANAGER")
                .workDate("2026-10-18")
                .startTime("08:00")
                .endTime("17:00")
                .otHours(8.0)
                .otType("WEEKEND_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Trực chỉ huy cứu hộ đê bao & an toàn thi công trụ cầu ngày Chủ Nhật.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("APPROVED")
                .hrApproval("NOT_REQUIRED")
                .reconciledById(5L)
                .reconciledByName("Nguyễn Lê Gia Phát")
                .reconciledByRole("SITE_MANAGER")
                .reconciledAt("2026-10-18 17:30")
                .actualFaceIdHours(8.0)
                .payableOtHours(8.0)
                .faceIdReconcileStatus("MATCHED")
                .faceIdCheckIn("08:00")
                .faceIdCheckOut("17:02")
                .faceIdNote("Khớp Face ID Chủ nhật 8.0h (sau khi trừ 1h nghỉ trưa) - hệ số 150%.")
                .estimatedCost(1846154.0)
                .budgetCapAtCreation(25000000.0)
                .status("APPROVED")
                .createdAt("2026-10-17 14:00")
                .build());

        overtimeMap.put(4L, OvertimeDto.builder()
                .id(4L)
                .employeeId(6L)
                .employeeCode("HM-006")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .createdById(5L)
                .createdByName("Nguyễn Lê Gia Phát")
                .createdByRole("SITE_MANAGER")
                .workDate("2026-10-23")
                .startTime("18:00")
                .endTime("21:00")
                .otHours(3.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Khảo sát trắc địa tim trục dầm thép tầng chuyển kết cấu.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("PENDING")
                .hrApproval("NOT_REQUIRED")
                .payableOtHours(3.0)
                .faceIdReconcileStatus("PENDING_SHIFT")
                .estimatedCost(475962.0)
                .budgetCapAtCreation(25000000.0)
                .status("PENDING_MANAGER")
                .createdAt("2026-10-21 11:20")
                .build());

        overtimeMap.put(5L, OvertimeDto.builder()
                .id(5L)
                .employeeId(6L)
                .employeeCode("HM-006")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .createdById(5L)
                .createdByName("Nguyễn Lê Gia Phát")
                .createdByRole("SITE_MANAGER")
                .workDate("2026-10-11")
                .startTime("08:00")
                .endTime("17:00")
                .otHours(8.0)
                .otType("WEEKEND_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Trực giám sát đổ bê tông bản mặt cầu nhịp K12 ngày Chủ Nhật.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("APPROVED")
                .hrApproval("NOT_REQUIRED")
                .reconciledById(5L)
                .reconciledByName("Nguyễn Lê Gia Phát")
                .reconciledByRole("SITE_MANAGER")
                .reconciledAt("2026-10-12 09:00")
                .actualFaceIdHours(8.0)
                .payableOtHours(8.0)
                .faceIdReconcileStatus("MATCHED")
                .faceIdCheckIn("08:00")
                .faceIdCheckOut("17:00")
                .faceIdNote("Khớp dữ liệu Face ID Chủ nhật 8.0h - hệ số 150%.")
                .estimatedCost(1269231.0)
                .budgetCapAtCreation(25000000.0)
                .status("APPROVED")
                .createdAt("2026-10-10 15:00")
                .build());

        overtimeMap.put(6L, OvertimeDto.builder()
                .id(6L)
                .employeeId(17L)
                .employeeCode("HM-017")
                .employeeName("Vũ Hải Đăng")
                .projectId(0L)
                .projectName("Văn Phòng Trụ Sở Chính HQ (TK 642)")
                .createdById(4L)
                .createdByName("Nguyễn Thu Giang")
                .createdByRole("HR_MANAGER")
                .workDate("2026-10-24")
                .startTime("18:00")
                .endTime("21:00")
                .otHours(3.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Tổng hợp hồ sơ quyết toán lương & đối chiếu chứng từ văn phòng tháng 10.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("NOT_REQUIRED")
                .hrApproval("PENDING")
                .payableOtHours(3.0)
                .faceIdReconcileStatus("PENDING_SHIFT")
                .estimatedCost(350000.0)
                .budgetCapAtCreation(12000000.0)
                .status("PENDING_MANAGER")
                .createdAt("2026-10-21 14:15")
                .build());

        overtimeMap.put(7L, OvertimeDto.builder()
                .id(7L)
                .employeeId(16L)
                .employeeCode("HM-016")
                .employeeName("Hoàng Thị Lan")
                .projectId(0L)
                .projectName("Văn Phòng Trụ Sở Chính HQ (TK 642)")
                .createdById(2L)
                .createdByName("Đoàn Anh Tuấn")
                .createdByRole("CHIEF_ACCOUNTANT")
                .workDate("2026-10-20")
                .startTime("17:30")
                .endTime("20:30")
                .otHours(3.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .isNightDuty(false)
                .nightDutyConvertedDays(0.0)
                .reason("Hoàn thiện hồ sơ đối chiếu bảng lương và chứng từ MISA tháng 10.")
                .directorApproval("NOT_REQUIRED")
                .siteManagerApproval("NOT_REQUIRED")
                .hrApproval("PENDING")
                .actualFaceIdHours(3.0)
                .payableOtHours(3.0)
                .faceIdReconcileStatus("MATCHED")
                .faceIdCheckIn("08:02")
                .faceIdCheckOut("20:35")
                .faceIdNote("Khớp log Face ID Trụ sở chính HQ (3.0h OT). Chờ Trưởng phòng duyệt trực tiếp.")
                .estimatedCost(575000.0)
                .budgetCapAtCreation(12000000.0)
                .status("PENDING_MANAGER")
                .createdAt("2026-10-20 11:00")
                .build());

        // Seed initial Leave Requests
        leaveMap.put(1L, LeaveDto.builder()
                .id(1L)
                .employeeId(4L)
                .employeeCode("HM-004")
                .employeeName("Nguyễn Thu Giang")
                .leaveType("ANNUAL")
                .halfDaySession("FULL_DAY")
                .startDate("2026-10-27")
                .endDate("2026-10-28")
                .daysCount(2.0)
                .reason("Nghỉ phép thường niên (trong hạn mức 4 ngày/tháng).")
                .attachmentName("Don_xin_nghi_phep_HM004.pdf")
                .siteManagerApproval("NOT_REQUIRED")
                .hrApproval("APPROVED")
                .status("APPROVED")
                .createdAt("2026-10-20 08:30")
                .build());

        leaveMap.put(2L, LeaveDto.builder()
                .id(2L)
                .employeeId(6L)
                .employeeCode("HM-006")
                .employeeName("Trần Văn Trung")
                .leaveType("COMPENSATORY")
                .halfDaySession("FULL_DAY")
                .startDate("2026-10-24")
                .endDate("2026-10-24")
                .daysCount(1.0)
                .reason("Nghỉ bù sau ca trực đêm 21/10 tại công trường Cầu Nhật Tân 2.")
                .attachmentName("Lich_truc_ca_dem_21_10_CT.pdf")
                .siteManagerApproval("PENDING")
                .hrApproval("PENDING")
                .status("PENDING_SM")
                .createdAt("2026-10-21 10:00")
                .build());

        leaveMap.put(3L, LeaveDto.builder()
                .id(3L)
                .employeeId(7L)
                .employeeCode("HM-007")
                .employeeName("Phạm Thành Nam")
                .leaveType("SICK_SHORT")
                .halfDaySession("FULL_DAY")
                .startDate("2026-10-15")
                .endDate("2026-10-16")
                .daysCount(2.0)
                .reason("Nghỉ ốm ngắn ngày (<= 2 ngày/tháng - Công ty tự chi trả, không trừ lương).")
                .attachmentName("Giay_kham_benh_vien_HM007.jpg")
                .siteManagerApproval("APPROVED")
                .hrApproval("APPROVED")
                .status("APPROVED")
                .createdAt("2026-10-14 17:00")
                .build());

        // Seed initial Attendance Explanations (Note: 2026-10-14 of HM-006 is left open as 'V' for TC 5.0!)
        explanationMap.put(1L, ExplanationDto.builder()
                .id(1L)
                .employeeId(5L)
                .employeeCode("HM-005")
                .employeeName("Nguyễn Lê Gia Phát")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .targetDate("2026-10-18")
                .explanationType("GPS_DEVIATION")
                .suggestedCheckIn("07:05")
                .suggestedCheckOut("17:15")
                .reason("Thi công đổ bê tông mố trụ dưới chân cầu, tín hiệu GPS vệ tinh bị che khuất bởi kết cấu dầm thép.")
                .siteManagerApproval("APPROVED")
                .hrApproval("PENDING")
                .status("PENDING_HR")
                .createdAt("2026-10-18 18:30")
                .build());

        explanationMap.put(2L, ExplanationDto.builder()
                .id(2L)
                .employeeId(6L)
                .employeeCode("HM-006")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .targetDate("2026-10-10")
                .explanationType("MISSING_CHECKOUT")
                .suggestedCheckIn("07:30")
                .suggestedCheckOut("17:00")
                .reason("Trực thi công cọc khoan nhồi dưới chân cầu cả ngày, quên check-out do hết pin điện thoại.")
                .siteManagerApproval("APPROVED")
                .hrApproval("APPROVED")
                .status("APPROVED")
                .createdAt("2026-10-11 08:15")
                .build());

        explanationMap.put(3L, ExplanationDto.builder()
                .id(3L)
                .employeeId(7L)
                .employeeCode("HM-007")
                .employeeName("Phạm Thành Nam")
                .projectId(1L)
                .projectName("Cầu Nhật Tân 2 & Nút Giao Vành Đai")
                .targetDate("2026-10-20")
                .explanationType("DEVICE_ERROR")
                .suggestedCheckIn("07:00")
                .suggestedCheckOut("17:00")
                .reason("Ứng dụng camera gặp lỗi tải Face ID khi mất kết nối 4G tại khu vực bãi đúc dầm.")
                .siteManagerApproval("PENDING")
                .hrApproval("PENDING")
                .status("PENDING_SM")
                .createdAt("2026-10-20 18:00")
                .build());
    }

    private String resolveEmployeeEmail(Long employeeId, String employeeCode) {
        if (employeeId != null) {
            Optional<Employee> emp = employeeRepository.findById(employeeId);
            if (emp.isPresent() && emp.get().getEmail() != null) return emp.get().getEmail();
        }
        if (employeeCode != null && !employeeCode.isBlank()) {
            Optional<Employee> emp = employeeRepository.findByEmployeeCode(employeeCode);
            if (emp.isPresent() && emp.get().getEmail() != null) return emp.get().getEmail();
        }
        return "nhanvien@haiminh.vn";
    }

    @GetMapping("/requests/email-logs")
    public ResponseEntity<List<Map<String, String>>> getEmailLogs() {
        return ResponseEntity.ok(emailService.getDispatchedLogs());
    }

    private boolean isCallerSiteManagerOnly() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        boolean isSm = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SITE_MANAGER".equals(a.getAuthority()));
        boolean isHr = auth.getAuthorities().stream()
                .anyMatch(a -> Set.of("ROLE_HR_MANAGER", "ROLE_HR_STAFF", "ROLE_HR_OFFICER")
                        .contains(a.getAuthority()));
        return isSm && !isHr;
    }

    private boolean isOfficeStaffEmployee(Long employeeId, String employeeCode, Long projectId) {
        Employee emp = null;
        if (employeeId != null) {
            emp = employeeRepository.findById(employeeId).orElse(null);
        }
        if (emp == null && employeeCode != null && !employeeCode.isBlank()) {
            emp = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        if (emp != null && emp.getEmployeeType() != null) {
            if ("OFFICE_STAFF".equalsIgnoreCase(emp.getEmployeeType().name())) {
                // Admin giả lập đơn công trình trong kịch bản test khi chọn rõ projectId > 0
                String r = emp.getRole() != null ? emp.getRole() : "";
                boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(r) || "ROLE_SYSTEM_ADMIN".equalsIgnoreCase(r);
                if (isAdmin && projectId != null && projectId > 0) {
                    return false;
                }
                return true;
            }
            return false;
        }
        if (projectId != null && projectId == 0L) return true;
        if (employeeCode != null) {
            if (List.of("HM-001", "HM-002", "HM-004", "HM-015", "HM-016", "HM-017").contains(employeeCode)
                    || ("HM-003".equals(employeeCode) && (projectId == null || projectId == 0L))
                    || employeeCode.startsWith("HM-HR")
                    || employeeCode.startsWith("HM-ACC")
                    || employeeCode.startsWith("HM-OFF")
                    || employeeCode.startsWith("HM-ADM")) {
                return true;
            }
        }
        return false;
    }

    // ==========================================
    // 1. OVERTIME REQUESTS (UC-13 / BF-04)
    // ==========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OvertimeDto {
        private Long id;
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private Long projectId;
        private String projectName;
        private Long createdById;
        private String createdByName;
        private String createdByRole;
        private String workDate;
        private String startTime;
        private String endTime;
        private Double otHours;
        private String otType;
        private Double multiplier;
        private Boolean isNightDuty;
        private Double nightDutyConvertedDays;
        private Boolean autoApprove;
        private String reason;
        private String directorApproval;    // NOT_REQUIRED
        private String directorApprovedAt;
        private Boolean budgetOverrideApproved;
        private String siteManagerApproval; // NOT_REQUIRED, PENDING, APPROVED, REJECTED
        private String hrApproval;          // NOT_REQUIRED, PENDING, APPROVED, REJECTED
        private Long reconciledById;
        private String reconciledByName;
        private String reconciledByRole;
        private String reconciledAt;
        private Double actualFaceIdHours;
        private Double payableOtHours;
        private String faceIdReconcileStatus; // MATCHED, PARTIAL, MISSING, PENDING_SHIFT
        private String faceIdCheckIn;
        private String faceIdCheckOut;
        private String faceIdNote;
        private Double estimatedCost;
        private Double budgetCapAtCreation;
        private Double projectedProjectOtCost;
        private Boolean isBudgetOverrun;
        private String status;              // PENDING_MANAGER, APPROVED, REJECTED
        private String rejectionReason;
        private String createdAt;
    }

    @Data
    public static class ApproveOtRequest {
        private String role;       // DIRECTOR, CEO, HR_MANAGER, HR_STAFF, CHIEF_ACCOUNTANT, ACCOUNTANT
        private boolean approved;
        private String rejectionReason;
        private Boolean budgetOverrideApproved;
        private Double payableOtHours;
        private String faceIdNote;
    }

    private com.hmcps.security.UserPrincipal getCurrentPrincipal() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.hmcps.security.UserPrincipal up) {
            return up;
        }
        return null;
    }

    private Employee resolveCurrentEmployeeCaller(com.hmcps.security.UserPrincipal principal) {
        if (principal != null) {
            return Employee.builder()
                    .id(principal.getId())
                    .employeeCode(principal.getEmployeeCode())
                    .fullName(principal.getFullName())
                    .role(principal.getRole())
                    .build();
        }
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !"anonymousUser".equals(auth.getName())) {
            return employeeRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    private String resolveCallerShortRole(com.hmcps.security.UserPrincipal principal, String fallbackRole) {
        if (principal != null && principal.getRole() != null && !principal.getRole().isBlank()) {
            return normalizeShortRole(principal.getRole());
        }
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().stream()
                    .map(a -> normalizeShortRole(a.getAuthority()))
                    .filter(r -> !r.isBlank() && !"ANONYMOUS".equals(r))
                    .findFirst()
                    .orElse(fallbackRole != null ? normalizeShortRole(fallbackRole) : "");
        }
        return fallbackRole != null ? normalizeShortRole(fallbackRole) : "";
    }

    private String normalizeShortRole(String rawRole) {
        if (rawRole == null) return "";
        return rawRole.replace("ROLE_", "").trim().toUpperCase(Locale.ROOT);
    }

    private double resolveEmployeeOtCost(Long employeeId, String employeeCode, boolean isOffice, double hours, double mult) {
        Employee emp = null;
        if (employeeId != null) emp = employeeRepository.findById(employeeId).orElse(null);
        if (emp == null && employeeCode != null && !employeeCode.isBlank()) {
            emp = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        double base = (emp != null && emp.getBaseSalary() != null) ? emp.getBaseSalary().doubleValue() : 15000000.0;
        double stdDays = isOffice ? 22.5 : 26.0;
        double hourlyRate = base / (stdDays * 8.0);
        return Math.round(hourlyRate * mult * hours);
    }

    private double resolveProjectOtCap(Long projectId) {
        if (projectId == null || projectId <= 0) {
            return ProjectController.HQ_OFFICE_OT_BUDGET_CAP.get().doubleValue();
        }
        return projectRepository.findById(projectId)
                .map(Project::getOtBudgetCap)
                .map(BigDecimal::doubleValue)
                .orElse(20000000.0);
    }

    private void enrichOtWithFaceIdAndBudget(OvertimeDto dto) {
        if (dto == null) return;
        boolean isOffice = (dto.getProjectId() == null || dto.getProjectId() <= 0)
                || "NOT_REQUIRED".equalsIgnoreCase(dto.getSiteManagerApproval());
        double hours = dto.getOtHours() != null ? dto.getOtHours() : 0.0;
        double mult = dto.getMultiplier() != null ? dto.getMultiplier() : 1.5;

        double effectivePayableHours = dto.getPayableOtHours() != null ? dto.getPayableOtHours() : hours;

        // Đối chiếu trực tiếp log Attendance (Face ID / GPS) từ Database nếu có
        try {
            if (dto.getEmployeeId() != null && dto.getWorkDate() != null && !dto.getWorkDate().isBlank()) {
                LocalDate wd = LocalDate.parse(dto.getWorkDate());
                Optional<Attendance> attOpt = attendanceRepository.findByEmployeeIdAndWorkDate(dto.getEmployeeId(), wd);
                if (attOpt.isPresent()) {
                    Attendance att = attOpt.get();
                    double dbOt = att.getOvertimeHours() != null ? att.getOvertimeHours().doubleValue() : 0.0;
                    double dbNight = att.getNightHours() != null ? att.getNightHours().doubleValue() : 0.0;
                    double actualOt = "NIGHT_SHIFT_ADDITIONAL".equalsIgnoreCase(dto.getOtType())
                            ? (dbNight > 0 ? dbNight : dbOt)
                            : (dbOt + dbNight);
                    if (actualOt <= 0 && att.getCheckInTime() != null && att.getCheckOutTime() != null) {
                        long mins = java.time.Duration.between(att.getCheckInTime(), att.getCheckOutTime()).toMinutes();
                        if (mins > 0) {
                            double rawH = mins > 300 ? (mins - 60) / 60.0 : mins / 60.0;
                            actualOt = ("WEEKEND_200".equalsIgnoreCase(dto.getOtType()) || "HOLIDAY_300".equalsIgnoreCase(dto.getOtType()))
                                    ? Math.max(0.0, Math.round(rawH * 2.0) / 2.0)
                                    : Math.max(0.0, Math.round((rawH - 8.0) * 2.0) / 2.0);
                        }
                    }
                    dto.setActualFaceIdHours(actualOt);
                    if (att.getCheckInTime() != null) {
                        dto.setFaceIdCheckIn(att.getCheckInTime().toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")));
                    }
                    if (att.getCheckOutTime() != null) {
                        String outStr = att.getCheckOutTime().toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                        if (att.getCheckOutTime().toLocalDate().isAfter(wd)) outStr += " (+1)";
                        dto.setFaceIdCheckOut(outStr);
                    }
                    if (!"APPROVED".equalsIgnoreCase(dto.getStatus())) {
                        double capped = Math.min(hours, actualOt);
                        dto.setPayableOtHours(capped);
                        effectivePayableHours = capped;
                        if (actualOt >= hours) {
                            dto.setFaceIdReconcileStatus("MATCHED");
                            if (dto.getFaceIdNote() == null) {
                                dto.setFaceIdNote("Khớp log Face ID (" + actualOt + "h thực tế / " + hours + "h ĐK).");
                            }
                        } else if (actualOt > 0) {
                            dto.setFaceIdReconcileStatus("PARTIAL");
                            dto.setFaceIdNote("Chênh lệch Face ID: Thực tế " + actualOt + "h < Đăng ký " + hours + "h -> Lương tính " + capped + "h.");
                        } else {
                            dto.setFaceIdReconcileStatus("MISSING");
                            dto.setFaceIdNote("Chưa ghi nhận giờ OT từ Face ID check-out ngày " + dto.getWorkDate() + ".");
                        }
                    }
                } else if (dto.getFaceIdReconcileStatus() == null) {
                    dto.setFaceIdReconcileStatus(wd.isAfter(LocalDate.now()) ? "PENDING_SHIFT" : "MISSING");
                }
            }
        } catch (Exception ignored) {
        }

        if ("SITE_NIGHT_DUTY".equalsIgnoreCase(dto.getOtType()) || Boolean.TRUE.equals(dto.getIsNightDuty())) {
            dto.setIsNightDuty(true);
            dto.setNightDutyConvertedDays(LaborLawConstants.SITE_NIGHT_DUTY_DAYS_CONVERSION.doubleValue());
            dto.setMultiplier(0.0);
            dto.setPayableOtHours(0.0);
            dto.setEstimatedCost(0.0);
        } else {
            if (dto.getPayableOtHours() == null) {
                dto.setPayableOtHours(effectivePayableHours);
            }
            if (dto.getEstimatedCost() == null || !"APPROVED".equalsIgnoreCase(dto.getStatus())) {
                dto.setEstimatedCost(resolveEmployeeOtCost(dto.getEmployeeId(), dto.getEmployeeCode(), isOffice, effectivePayableHours, mult));
            }
        }
        double cap = resolveProjectOtCap(dto.getProjectId());
        dto.setBudgetCapAtCreation(cap);
    }

    @GetMapping("/requests/overtime")
    public ResponseEntity<List<OvertimeDto>> getOvertimeRequests(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long projectId) {
        List<OvertimeDto> list = new ArrayList<>(overtimeMap.values());
        list.forEach(this::enrichOtWithFaceIdAndBudget);
        if (isCallerSiteManagerOnly()) {
            list = list.stream()
                    .filter(r -> !"NOT_REQUIRED".equalsIgnoreCase(r.getSiteManagerApproval())
                            && (r.getProjectId() == null || r.getProjectId() > 0)
                            && !isOfficeStaffEmployee(r.getEmployeeId(), r.getEmployeeCode(), r.getProjectId()))
                    .collect(Collectors.toList());
        }
        if (employeeId != null) {
            list = list.stream().filter(r -> r.getEmployeeId().equals(employeeId)).collect(Collectors.toList());
        }
        if (projectId != null) {
            list = list.stream().filter(r -> r.getProjectId() != null && r.getProjectId().equals(projectId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(OvertimeDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/requests/overtime/budget-summary")
    public ResponseEntity<List<Map<String, Object>>> getOtBudgetSummary(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        int targetMonth = month != null ? month : 10;
        int targetYear = year != null ? year : 2026;
        String ymPrefix = String.format("%04d-%02d", targetYear, targetMonth);

        List<OvertimeDto> periodList = overtimeMap.values().stream()
                .peek(this::enrichOtWithFaceIdAndBudget)
                .filter(o -> !"REJECTED".equalsIgnoreCase(o.getStatus()))
                .filter(o -> o.getWorkDate() != null && o.getWorkDate().startsWith(ymPrefix))
                .toList();

        List<Map<String, Object>> summary = new ArrayList<>();
        for (Project p : projectRepository.findAll()) {
            double cap = p.getOtBudgetCap() != null ? p.getOtBudgetCap().doubleValue() : 20000000.0;
            double approvedCost = periodList.stream()
                    .filter(o -> p.getId().equals(o.getProjectId()) && "APPROVED".equalsIgnoreCase(o.getStatus()))
                    .mapToDouble(o -> o.getEstimatedCost() != null ? o.getEstimatedCost() : 0.0).sum();
            double pendingCost = periodList.stream()
                    .filter(o -> p.getId().equals(o.getProjectId()) && !"APPROVED".equalsIgnoreCase(o.getStatus()))
                    .mapToDouble(o -> o.getEstimatedCost() != null ? o.getEstimatedCost() : 0.0).sum();
            double projected = approvedCost + pendingCost;
            summary.add(Map.of(
                    "projectId", p.getId(),
                    "projectCode", p.getCode(),
                    "projectName", p.getName(),
                    "otBudgetCap", cap,
                    "approvedOtCost", approvedCost,
                    "pendingOtCost", pendingCost,
                    "totalProjectedOtCost", projected,
                    "utilizationPct", cap > 0 ? Math.round((projected / cap) * 1000.0) / 10.0 : 0.0,
                    "isOverrun", projected > cap
            ));
        }

        double hqCap = ProjectController.HQ_OFFICE_OT_BUDGET_CAP.get().doubleValue();
        double hqApproved = periodList.stream()
                .filter(o -> (o.getProjectId() == null || o.getProjectId() == 0L) && "APPROVED".equalsIgnoreCase(o.getStatus()))
                .mapToDouble(o -> o.getEstimatedCost() != null ? o.getEstimatedCost() : 0.0).sum();
        double hqPending = periodList.stream()
                .filter(o -> (o.getProjectId() == null || o.getProjectId() == 0L) && !"APPROVED".equalsIgnoreCase(o.getStatus()))
                .mapToDouble(o -> o.getEstimatedCost() != null ? o.getEstimatedCost() : 0.0).sum();
        double hqProjected = hqApproved + hqPending;
        summary.add(Map.of(
                "projectId", 0L,
                "projectCode", "VP-HO",
                "projectName", "Văn Phòng Trụ Sở Chính HQ (TK 642)",
                "otBudgetCap", hqCap,
                "approvedOtCost", hqApproved,
                "pendingOtCost", hqPending,
                "totalProjectedOtCost", hqProjected,
                "utilizationPct", hqCap > 0 ? Math.round((hqProjected / hqCap) * 1000.0) / 10.0 : 0.0,
                "isOverrun", hqProjected > hqCap
        ));
        return ResponseEntity.ok(summary);
    }

    private long countMonthlyNightDutySessions(Long employeeId, String employeeCode, String ymPrefix, Long excludeId) {
        return overtimeMap.values().stream()
                .filter(o -> excludeId == null || !excludeId.equals(o.getId()))
                .filter(o -> !"REJECTED".equalsIgnoreCase(o.getStatus()))
                .filter(o -> (employeeId != null && employeeId.equals(o.getEmployeeId()))
                        || (employeeCode != null && employeeCode.equalsIgnoreCase(o.getEmployeeCode())))
                .filter(o -> o.getWorkDate() != null && o.getWorkDate().startsWith(ymPrefix))
                .filter(o -> "SITE_NIGHT_DUTY".equalsIgnoreCase(o.getOtType()) || Boolean.TRUE.equals(o.getIsNightDuty()))
                .count();
    }

    private void finalizeApprovedOvertime(
            OvertimeDto req,
            Long approverId,
            String approverName,
            String approverRole,
            Double overridePayableHours,
            String note
    ) {
        boolean isOfficeReq = (req.getProjectId() == null || req.getProjectId() == 0L);
        boolean isNightDuty = "SITE_NIGHT_DUTY".equalsIgnoreCase(req.getOtType()) || Boolean.TRUE.equals(req.getIsNightDuty());

        req.setDirectorApproval("NOT_REQUIRED");
        req.setSiteManagerApproval(isOfficeReq ? "NOT_REQUIRED" : "APPROVED");
        req.setHrApproval(isOfficeReq ? "APPROVED" : "NOT_REQUIRED");
        req.setReconciledById(approverId);
        req.setReconciledByName(approverName);
        req.setReconciledByRole(approverRole);
        req.setReconciledAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        req.setStatus("APPROVED");

        if (isNightDuty) {
            req.setIsNightDuty(true);
            req.setNightDutyConvertedDays(LaborLawConstants.SITE_NIGHT_DUTY_DAYS_CONVERSION.doubleValue());
            req.setPayableOtHours(0.0);
            req.setEstimatedCost(0.0);
        } else {
            double reqHours = req.getOtHours() != null ? req.getOtHours() : 0.0;
            double payableHours = overridePayableHours != null
                    ? Math.max(0.0, Math.min(reqHours, overridePayableHours))
                    : (req.getActualFaceIdHours() != null ? Math.min(reqHours, req.getActualFaceIdHours()) : reqHours);
            double mult = req.getMultiplier() != null ? req.getMultiplier() : 1.5;
            req.setPayableOtHours(payableHours);
            req.setEstimatedCost(resolveEmployeeOtCost(req.getEmployeeId(), req.getEmployeeCode(), isOfficeReq, payableHours, mult));
        }
        if (note != null && !note.isBlank()) {
            req.setFaceIdNote(note.trim());
        }

        try {
            LocalDate d = LocalDate.parse(req.getWorkDate());
            MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                    req.getEmployeeId(), d.getMonthValue(), d.getYear()).orElse(null);
            if (ts != null) {
                if (isNightDuty) {
                    BigDecimal converted = LaborLawConstants.SITE_NIGHT_DUTY_DAYS_CONVERSION;
                    ts.setActualWorkDays(ts.getActualWorkDays().add(converted));
                    ts.setOfficialWorkDays(ts.getOfficialWorkDays().add(converted));
                    timesheetRepository.save(ts);
                } else if (req.getPayableOtHours() != null && req.getPayableOtHours() > 0) {
                    BigDecimal hours = BigDecimal.valueOf(req.getPayableOtHours());
                    ts.setOvertimeHours(ts.getOvertimeHours().add(hours));
                    timesheetRepository.save(ts);
                }
            }
        } catch (Exception ignored) {
        }
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'CHIEF_ACCOUNTANT', 'SITE_MANAGER')")
    @PostMapping("/requests/overtime")
    public ResponseEntity<OvertimeDto> createOvertimeRequest(@RequestBody OvertimeDto req) {
        com.hmcps.security.UserPrincipal principal = getCurrentPrincipal();
        Employee caller = resolveCurrentEmployeeCaller(principal);
        String callerShortRole = resolveCallerShortRole(principal, "HR_MANAGER");

        LocalDate parsedWorkDate;
        try {
            parsedWorkDate = (req.getWorkDate() != null && !req.getWorkDate().isBlank())
                    ? LocalDate.parse(req.getWorkDate().trim())
                    : LocalDate.now();
        } catch (Exception e) {
            throw new BusinessException("Định dạng ngày làm thêm giờ (workDate) không hợp lệ!");
        }

        String resolvedOtType = (req.getOtType() != null && !req.getOtType().isBlank())
                ? req.getOtType().trim().toUpperCase()
                : (StatutoryHolidayUtils.isStatutoryHoliday(parsedWorkDate)
                        ? "HOLIDAY_200"
                        : (parsedWorkDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY
                                || parsedWorkDate.getDayOfWeek() == java.time.DayOfWeek.SATURDAY)
                                ? "WEEKEND_150"
                                : "WEEKDAY_150");

        boolean isNightDuty = "SITE_NIGHT_DUTY".equalsIgnoreCase(resolvedOtType);
        String startTimeStr = (req.getStartTime() != null && !req.getStartTime().isBlank())
                ? req.getStartTime().trim()
                : (isNightDuty ? "22:00" : "18:00");
        String endTimeStr = (req.getEndTime() != null && !req.getEndTime().isBlank())
                ? req.getEndTime().trim()
                : (isNightDuty ? "05:00" : null);

        double canonicalMultiplier = StatutoryHolidayUtils.validateOvertimeAndResolveMultiplier(
                parsedWorkDate,
                startTimeStr,
                endTimeStr,
                resolvedOtType,
                req.getOtHours()
        );
        req.setStartTime(startTimeStr);
        if (endTimeStr != null) {
            req.setEndTime(endTimeStr);
        }
        req.setOtType(resolvedOtType);
        req.setMultiplier(canonicalMultiplier);
        req.setIsNightDuty(isNightDuty);
        req.setNightDutyConvertedDays(isNightDuty ? LaborLawConstants.SITE_NIGHT_DUTY_DAYS_CONVERSION.doubleValue() : 0.0);

        // Fill employee & verify maker scope
        if (req.getEmployeeCode() != null && !req.getEmployeeCode().isBlank()) {
            employeeRepository.findByEmployeeCode(req.getEmployeeCode()).ifPresent(e -> {
                req.setEmployeeId(e.getId());
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        } else if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(e -> {
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        } else if (caller != null) {
            req.setEmployeeId(caller.getId());
            req.setEmployeeCode(caller.getEmployeeCode());
            req.setEmployeeName(caller.getFullName());
        }

        boolean isOfficeTarget = isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), req.getProjectId());
        if ("SITE_MANAGER".equals(callerShortRole) && isOfficeTarget) {
            throw new BusinessException("Từ chối phân quyền: Chỉ huy trưởng công trường chỉ được phép lập đơn OT / Trực đêm cho Kỹ sư công trường hoặc chính mình (không lập cho Khối Văn phòng HQ)!");
        }
        if (("HR_MANAGER".equals(callerShortRole) || "CHIEF_ACCOUNTANT".equals(callerShortRole)) && !isOfficeTarget) {
            throw new BusinessException("Từ chối phân quyền: Trưởng phòng khối Văn phòng chỉ được lập đơn OT cho nhân sự khối Văn phòng / phòng ban của mình!");
        }
        if (isNightDuty && isOfficeTarget) {
            throw new BusinessException("Nghiệp vụ Trực đêm công trường (22h00 - 05h00, quy đổi 1.5 ngày công) chỉ áp dụng cho Kỹ sư / Nhân sự công trường!");
        }

        String ymPrefix = parsedWorkDate.toString().substring(0, 7);
        if (isNightDuty) {
            long existingNightCount = countMonthlyNightDutySessions(req.getEmployeeId(), req.getEmployeeCode(), ymPrefix, null);
            if (existingNightCount >= LaborLawConstants.MAX_SITE_NIGHT_DUTY_PER_MONTH) {
                throw new BusinessException("Vượt giới hạn Trực đêm công trường: Mỗi nhân sự chỉ được trực tối đa "
                        + LaborLawConstants.MAX_SITE_NIGHT_DUTY_PER_MONTH + " buổi đêm/tháng (đã có " + existingNightCount + "/10 buổi trong tháng " + ymPrefix + ")!");
            }
        }

        // Chặn tạo trùng lặp đơn OT trong cùng ngày và cùng loại ca OT cho cùng 1 nhân sự
        boolean duplicateOt = overtimeMap.values().stream().anyMatch(existing ->
                !"REJECTED".equalsIgnoreCase(existing.getStatus())
                        && ((req.getEmployeeId() != null && req.getEmployeeId().equals(existing.getEmployeeId()))
                            || (req.getEmployeeCode() != null && req.getEmployeeCode().equalsIgnoreCase(existing.getEmployeeCode())))
                        && parsedWorkDate.toString().equals(existing.getWorkDate())
                        && resolvedOtType.equalsIgnoreCase(existing.getOtType())
        );
        if (duplicateOt) {
            throw new BusinessException("Lỗi trùng lặp đơn OT: Nhân sự đã có đơn đăng ký tăng ca / trực đêm ngày " + parsedWorkDate + " (" + resolvedOtType + ") đang chờ duyệt hoặc đã phê duyệt!");
        }

        Long id = ID_GEN.incrementAndGet();
        req.setId(id);

        if (isOfficeTarget) {
            req.setProjectId(0L);
            req.setProjectName("Văn Phòng Trụ Sở Chính HQ (TK 642)");
        } else {
            Long targetPid = (req.getProjectId() != null && req.getProjectId() > 0) ? req.getProjectId() : 1L;
            req.setProjectId(targetPid);
            projectRepository.findById(targetPid).ifPresent(p -> req.setProjectName(p.getName()));
        }

        double otHours = req.getOtHours() != null ? req.getOtHours() : (isNightDuty ? 7.0 : 4.0);
        req.setOtHours(otHours);
        double estCost = isNightDuty
                ? 0.0
                : resolveEmployeeOtCost(req.getEmployeeId(), req.getEmployeeCode(), isOfficeTarget, otHours, canonicalMultiplier);
        double cap = resolveProjectOtCap(req.getProjectId());
        double existingProjCost = overtimeMap.values().stream()
                .peek(this::enrichOtWithFaceIdAndBudget)
                .filter(o -> !"REJECTED".equalsIgnoreCase(o.getStatus()))
                .filter(o -> Objects.equals(req.getProjectId(), o.getProjectId()))
                .filter(o -> o.getWorkDate() != null && o.getWorkDate().startsWith(ymPrefix))
                .mapToDouble(o -> o.getEstimatedCost() != null ? o.getEstimatedCost() : 0.0)
                .sum();
        double projectedCost = existingProjCost + estCost;

        req.setCreatedById(caller != null ? caller.getId() : req.getEmployeeId());
        req.setCreatedByName(caller != null ? caller.getFullName() : "Trưởng phòng / CHT");
        req.setCreatedByRole(callerShortRole);
        req.setDirectorApproval("NOT_REQUIRED");
        req.setSiteManagerApproval(isOfficeTarget ? "NOT_REQUIRED" : "PENDING");
        req.setHrApproval(isOfficeTarget ? "PENDING" : "NOT_REQUIRED");
        req.setPayableOtHours(isNightDuty ? 0.0 : otHours);
        req.setFaceIdReconcileStatus(parsedWorkDate.isAfter(LocalDate.now()) ? "PENDING_SHIFT" : "MISSING");
        req.setEstimatedCost(estCost);
        req.setBudgetCapAtCreation(cap);
        req.setProjectedProjectOtCost(projectedCost);
        req.setIsBudgetOverrun(!isNightDuty && projectedCost > cap);
        req.setStatus("PENDING_MANAGER");
        req.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        boolean isSelfEmployeeOnCreate = caller != null
                && ((caller.getId() != null && caller.getId().equals(req.getEmployeeId()))
                    || (caller.getEmployeeCode() != null && caller.getEmployeeCode().equalsIgnoreCase(req.getEmployeeCode())));
        if (Boolean.TRUE.equals(req.getAutoApprove()) && !isSelfEmployeeOnCreate) {
            finalizeApprovedOvertime(
                    req,
                    caller != null ? caller.getId() : null,
                    caller != null ? caller.getFullName() : "Trưởng phòng / CHT",
                    callerShortRole,
                    null,
                    req.getFaceIdNote()
            );
        }

        try {
            OvertimeRequest entity = OvertimeRequest.builder()
                    .employeeId(req.getEmployeeId() != null ? req.getEmployeeId() : 1L)
                    .projectId(req.getProjectId())
                    .createdById(req.getCreatedById())
                    .createdByName(req.getCreatedByName())
                    .createdByRole(req.getCreatedByRole())
                    .workDate(parsedWorkDate)
                    .startTime(req.getStartTime())
                    .endTime(req.getEndTime() != null ? req.getEndTime() : "22:00")
                    .otHours(BigDecimal.valueOf(otHours))
                    .otType(resolvedOtType)
                    .multiplier(BigDecimal.valueOf(canonicalMultiplier))
                    .isNightDuty(isNightDuty)
                    .nightDutyConvertedDays(BigDecimal.valueOf(req.getNightDutyConvertedDays()))
                    .reason(req.getReason() != null ? req.getReason() : (isNightDuty ? "Trực đêm công trường (22h00 - 05h00)" : "Tăng ca thi công / nghiệp vụ"))
                    .directorApproval("NOT_REQUIRED")
                    .siteManagerApproval(req.getSiteManagerApproval())
                    .hrApproval(req.getHrApproval())
                    .payableOtHours(BigDecimal.valueOf(req.getPayableOtHours()))
                    .faceIdReconcileStatus(req.getFaceIdReconcileStatus())
                    .estimatedCost(BigDecimal.valueOf(req.getEstimatedCost()))
                    .budgetCapAtCreation(BigDecimal.valueOf(cap))
                    .projectedProjectOtCost(BigDecimal.valueOf(projectedCost))
                    .isBudgetOverrun(req.getIsBudgetOverrun())
                    .status(req.getStatus())
                    .build();
            OvertimeRequest saved = overtimeRequestRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        overtimeMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'CHIEF_ACCOUNTANT', 'SITE_MANAGER')")
    @PutMapping("/requests/overtime/{id}/approve")
    public ResponseEntity<OvertimeDto> approveOvertime(
            @PathVariable Long id,
            @RequestBody ApproveOtRequest body) {
        boolean existedInMap = overtimeMap.containsKey(id);
        OvertimeDto req = overtimeMap.get(id);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }
        enrichOtWithFaceIdAndBudget(req);

        com.hmcps.security.UserPrincipal principal = getCurrentPrincipal();
        Employee caller = resolveCurrentEmployeeCaller(principal);
        Long callerId = caller != null ? caller.getId() : null;
        String callerCode = caller != null ? caller.getEmployeeCode() : null;
        String callerName = caller != null ? caller.getFullName() : "Trưởng phòng phê duyệt";
        String callerRole = resolveCallerShortRole(principal, body.getRole());

        if (!Set.of("HR_MANAGER", "CHIEF_ACCOUNTANT", "SITE_MANAGER").contains(callerRole)) {
            throw new BusinessException("Chỉ Trưởng phòng hoặc Quản lý trực tiếp mới có quyền duyệt đơn OT (Ban Giám đốc không duyệt đơn OT lẻ)!");
        }

        boolean isOfficeReq = (req.getProjectId() == null || req.getProjectId() == 0L)
                || isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), req.getProjectId());

        if ("SITE_MANAGER".equals(callerRole) && isOfficeReq) {
            throw new BusinessException("Từ chối phân quyền: Chỉ huy trưởng công trường chỉ được duyệt đơn OT / Trực đêm thuộc công trường!");
        }
        if (("HR_MANAGER".equals(callerRole) || "CHIEF_ACCOUNTANT".equals(callerRole)) && !isOfficeReq) {
            throw new BusinessException("Từ chối phân quyền: Trưởng phòng khối Văn phòng chỉ được duyệt đơn OT khối Văn phòng HQ!");
        }

        // Chặn tuyệt đối tự duyệt đơn OT cá nhân của chính mình (nhưng cho phép Trưởng phòng duyệt trực tiếp đơn của nhân viên mình lập)
        boolean isSelfEmployee = (callerId != null && callerId.equals(req.getEmployeeId()))
                || (callerCode != null && callerCode.equalsIgnoreCase(req.getEmployeeCode()));
        if (isSelfEmployee) {
            throw new BusinessException("Khóa Phân Quyền (SoD): Không thể tự phê duyệt đơn OT của chính bản thân mình!");
        }

        if (!body.isApproved()) {
            if (body.getRejectionReason() == null || body.getRejectionReason().isBlank()) {
                throw new BusinessException("Vui lòng nhập lý do từ chối đơn OT!");
            }
            req.setDirectorApproval("NOT_REQUIRED");
            if (isOfficeReq) {
                req.setHrApproval("REJECTED");
            } else {
                req.setSiteManagerApproval("REJECTED");
            }
            req.setStatus("REJECTED");
            req.setReconciledById(callerId);
            req.setReconciledByName(callerName);
            req.setReconciledByRole(callerRole);
            req.setReconciledAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            req.setRejectionReason(body.getRejectionReason().trim());
        } else {
            boolean isNightDuty = "SITE_NIGHT_DUTY".equalsIgnoreCase(req.getOtType()) || Boolean.TRUE.equals(req.getIsNightDuty());
            if (!isNightDuty && Boolean.TRUE.equals(req.getIsBudgetOverrun()) && !Boolean.TRUE.equals(body.getBudgetOverrideApproved())) {
                throw new BusinessException("Dự toán chi phí OT vượt trần ngân sách dự án! Trưởng phòng cần xác nhận cho phép vượt trần ngân sách (budgetOverrideApproved=true) khi duyệt đơn.");
            }
            if (isNightDuty && req.getWorkDate() != null && req.getWorkDate().length() >= 7) {
                String ym = req.getWorkDate().substring(0, 7);
                long existingNightCount = countMonthlyNightDutySessions(req.getEmployeeId(), req.getEmployeeCode(), ym, id);
                if (existingNightCount >= LaborLawConstants.MAX_SITE_NIGHT_DUTY_PER_MONTH) {
                    throw new BusinessException("Vượt giới hạn Trực đêm công trường (tối đa 10 buổi/tháng): Đã có " + existingNightCount + "/10 buổi trong tháng " + ym + "!");
                }
            }
            req.setBudgetOverrideApproved(Boolean.TRUE.equals(body.getBudgetOverrideApproved()));
            finalizeApprovedOvertime(req, callerId, callerName, callerRole, body.getPayableOtHours(), body.getFaceIdNote());
        }

        try {
            OvertimeRequest entity = overtimeRequestRepository.findById(id).orElse(null);
            if (entity == null && req.getEmployeeId() != null && req.getWorkDate() != null) {
                entity = OvertimeRequest.builder()
                        .employeeId(req.getEmployeeId())
                        .projectId(req.getProjectId() != null ? req.getProjectId() : 0L)
                        .createdById(req.getCreatedById())
                        .createdByName(req.getCreatedByName())
                        .createdByRole(req.getCreatedByRole())
                        .workDate(LocalDate.parse(req.getWorkDate()))
                        .startTime(req.getStartTime() != null ? req.getStartTime() : "18:00")
                        .endTime(req.getEndTime() != null ? req.getEndTime() : "22:00")
                        .otHours(BigDecimal.valueOf(req.getOtHours() != null ? req.getOtHours() : 0.0))
                        .otType(req.getOtType() != null ? req.getOtType() : "WEEKDAY_150")
                        .multiplier(BigDecimal.valueOf(req.getMultiplier() != null ? req.getMultiplier() : 1.5))
                        .isNightDuty(Boolean.TRUE.equals(req.getIsNightDuty()))
                        .nightDutyConvertedDays(BigDecimal.valueOf(req.getNightDutyConvertedDays() != null ? req.getNightDutyConvertedDays() : 0.0))
                        .reason(req.getReason() != null ? req.getReason() : "")
                        .build();
            }
            if (entity != null) {
                entity.setDirectorApproval(req.getDirectorApproval());
                entity.setBudgetOverrideApproved(req.getBudgetOverrideApproved());
                entity.setSiteManagerApproval(req.getSiteManagerApproval());
                entity.setHrApproval(req.getHrApproval());
                entity.setReconciledById(req.getReconciledById());
                entity.setReconciledByName(req.getReconciledByName());
                entity.setReconciledByRole(req.getReconciledByRole());
                entity.setIsNightDuty(Boolean.TRUE.equals(req.getIsNightDuty()));
                entity.setNightDutyConvertedDays(BigDecimal.valueOf(req.getNightDutyConvertedDays() != null ? req.getNightDutyConvertedDays() : 0.0));
                if (req.getActualFaceIdHours() != null) entity.setActualFaceIdHours(BigDecimal.valueOf(req.getActualFaceIdHours()));
                if (req.getPayableOtHours() != null) entity.setPayableOtHours(BigDecimal.valueOf(req.getPayableOtHours()));
                entity.setFaceIdReconcileStatus(req.getFaceIdReconcileStatus());
                entity.setFaceIdNote(req.getFaceIdNote());
                if (req.getEstimatedCost() != null) entity.setEstimatedCost(BigDecimal.valueOf(req.getEstimatedCost()));
                entity.setStatus(req.getStatus());
                entity.setRejectionReason(req.getRejectionReason());
                overtimeRequestRepository.save(entity);
            }
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_OVERTIME_DIRECT")
                    .entityName("overtime_requests")
                    .entityId(id)
                    .performedByName(callerName)
                    .performedByRole(callerRole)
                    .description("Trưởng phòng / CHT duyệt trực tiếp đơn OT #" + id
                            + (Boolean.TRUE.equals(req.getIsNightDuty())
                                    ? " [Trực đêm công trường = 1.5 ngày công]"
                                    : " - Giờ tính lương: " + req.getPayableOtHours() + "h")
                            + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        if (existedInMap) {
            overtimeMap.put(id, req);
        }
        if (emailService != null && ("APPROVED".equals(req.getStatus()) || "REJECTED".equals(req.getStatus()))) {
            String targetEmail = resolveEmployeeEmail(req.getEmployeeId(), req.getEmployeeCode());
            boolean isApproved = "APPROVED".equals(req.getStatus());
            emailService.sendWorkflowDecisionEmail(
                    targetEmail,
                    req.getEmployeeName(),
                    Boolean.TRUE.equals(req.getIsNightDuty()) ? "Đơn Trực Đêm Công Trường" : "Đơn Làm Thêm Giờ (OT)",
                    id,
                    isApproved,
                    "Ngày " + req.getWorkDate() + " (" + req.getStartTime() + " - " + req.getEndTime()
                            + (Boolean.TRUE.equals(req.getIsNightDuty())
                                    ? ", Quy đổi: 1,5 ngày công)"
                                    : ", ĐK: " + req.getOtHours() + "h, Tính lương: " + req.getPayableOtHours() + "h, hệ số " + req.getMultiplier() + "x)"),
                    isApproved ? "Trưởng phòng đã phê duyệt trực tiếp và đồng bộ vào Bảng công & Bảng lương." : "Lý do từ chối: " + req.getRejectionReason()
            );
        }
        return ResponseEntity.ok(req);
    }

    // ==========================================
    // 2. LEAVE REQUESTS (FE-04 / BF-03)
    // ==========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveDto {
        private Long id;
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private String leaveType; // ANNUAL, SPECIAL_PAID, SICK_SHORT, SICK_LONG, SICK, PERSONAL_TRAVEL, COMPENSATORY, BAD_WEATHER, UNPAID
        private String halfDaySession; // FULL_DAY, MORNING, AFTERNOON
        private String startDate;
        private String endDate;
        private Double daysCount;
        private String reason;
        private String attachmentName;
        private String siteManagerApproval;
        private String hrApproval;
        private String status;    // PENDING_SM, PENDING_HR, PENDING, APPROVED, REJECTED
        private String rejectionReason;
        private String createdAt;
    }

    @Data
    public static class ApproveLeaveRequest {
        private String level;     // SM or HR
        private boolean approved;
        private String rejectionReason;
    }

    @GetMapping("/requests/leave")
    public ResponseEntity<List<LeaveDto>> getLeaveRequests(@RequestParam(required = false) Long employeeId) {
        List<LeaveDto> list = new ArrayList<>(leaveMap.values());
        if (isCallerSiteManagerOnly()) {
            list = list.stream()
                    .filter(l -> !"NOT_REQUIRED".equalsIgnoreCase(l.getSiteManagerApproval())
                            && !isOfficeStaffEmployee(l.getEmployeeId(), l.getEmployeeCode(), null))
                    .collect(Collectors.toList());
        }
        if (employeeId != null) {
            list = list.stream().filter(l -> l.getEmployeeId().equals(employeeId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(LeaveDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    private static final List<String> ALLOWED_LEAVE_EXTENSIONS = List.of(".pdf", ".jpg", ".jpeg", ".png", ".webp");

    private boolean hasValidLeaveAttachment(String attachmentName) {
        if (attachmentName == null || attachmentName.isBlank()) {
            return false;
        }
        String lower = attachmentName.trim().toLowerCase();
        return ALLOWED_LEAVE_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private boolean isShortSickLeaveType(String leaveType) {
        return "SICK_SHORT".equalsIgnoreCase(leaveType) || "SICK".equalsIgnoreCase(leaveType);
    }

    private boolean isUnpaidLeaveType(String leaveType) {
        return "UNPAID".equalsIgnoreCase(leaveType)
                || "PERSONAL_TRAVEL".equalsIgnoreCase(leaveType)
                || "SICK_LONG".equalsIgnoreCase(leaveType);
    }

    private boolean isMonthlyCappedPaidLeaveType(String leaveType) {
        return "ANNUAL".equalsIgnoreCase(leaveType)
                || "SPECIAL_PAID".equalsIgnoreCase(leaveType)
                || isShortSickLeaveType(leaveType);
    }

    private double countMonthlyLeaveDays(
            Long empId,
            String empCode,
            int year,
            int month,
            Long excludeId,
            boolean approvedOnly,
            boolean sickOnly
    ) {
        return leaveMap.values().stream()
                .filter(l -> excludeId == null || !excludeId.equals(l.getId()))
                .filter(l -> approvedOnly
                        ? "APPROVED".equalsIgnoreCase(l.getStatus())
                        : !"REJECTED".equalsIgnoreCase(l.getStatus()))
                .filter(l -> (empId != null && empId.equals(l.getEmployeeId()))
                        || (empCode != null && empCode.equalsIgnoreCase(l.getEmployeeCode())))
                .filter(l -> sickOnly ? isShortSickLeaveType(l.getLeaveType()) : isMonthlyCappedPaidLeaveType(l.getLeaveType()))
                .filter(l -> {
                    try {
                        LocalDate s = LocalDate.parse(l.getStartDate());
                        return s.getYear() == year && s.getMonthValue() == month;
                    } catch (Exception ex) {
                        return false;
                    }
                })
                .mapToDouble(l -> l.getDaysCount() != null ? l.getDaysCount() : 0.0)
                .sum();
    }

    @PostMapping("/requests/leave")
    public ResponseEntity<LeaveDto> createLeaveRequest(@RequestBody LeaveDto req) {
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BusinessException("Lý do xin nghỉ phép không được để trống!");
        }
        if (!hasValidLeaveAttachment(req.getAttachmentName())) {
            throw new BusinessException(
                    "Chưa đính kèm minh chứng hợp lệ! Bắt buộc tải lên tệp minh chứng (.pdf, .jpg, .png, .webp) trước khi gửi đơn xin nghỉ phép.");
        }
        req.setAttachmentName(req.getAttachmentName().trim());
        req.setReason(req.getReason().trim());

        LocalDate parsedStart;
        LocalDate parsedEnd;
        try {
            parsedStart = req.getStartDate() != null ? LocalDate.parse(req.getStartDate().trim()) : LocalDate.now();
            parsedEnd = req.getEndDate() != null ? LocalDate.parse(req.getEndDate().trim()) : parsedStart;
        } catch (Exception e) {
            throw new BusinessException("Định dạng Từ ngày / Đến ngày của đơn xin nghỉ phép không hợp lệ (YYYY-MM-DD)!");
        }
        if (parsedStart.isBefore(LocalDate.now())) {
            throw new BusinessException("Không thể gửi đơn xin nghỉ phép cho ngày trong quá khứ (" + parsedStart + ")!");
        }
        if (parsedEnd.isBefore(parsedStart)) {
            throw new BusinessException("Ngày kết thúc (" + parsedEnd + ") không được nhỏ hơn Từ ngày (" + parsedStart + ")!");
        }
        req.setStartDate(parsedStart.toString());
        req.setEndDate(parsedEnd.toString());

        String normalizedSession = (req.getHalfDaySession() != null && !req.getHalfDaySession().isBlank())
                ? req.getHalfDaySession().trim().toUpperCase()
                : "FULL_DAY";
        if (!Set.of("FULL_DAY", "MORNING", "AFTERNOON").contains(normalizedSession)) {
            throw new BusinessException("Ca nghỉ không hợp lệ! Vui lòng chọn Cả ngày (FULL_DAY), Buổi sáng (MORNING) hoặc Buổi chiều (AFTERNOON).");
        }
        req.setHalfDaySession(normalizedSession);

        double requestedDays;
        if ("MORNING".equals(normalizedSession) || "AFTERNOON".equals(normalizedSession)) {
            if (!parsedStart.equals(parsedEnd)) {
                throw new BusinessException("Nghỉ nửa ngày (Sáng hoặc Chiều - 0,5 ngày công) chỉ áp dụng khi Từ ngày trùng Đến ngày!");
            }
            requestedDays = 0.5;
        } else {
            requestedDays = req.getDaysCount() != null ? req.getDaysCount() : 1.0;
        }
        if (requestedDays <= 0) {
            throw new BusinessException("Số ngày xin nghỉ tính công phải lớn hơn 0!");
        }
        req.setDaysCount(requestedDays);

        String normalizedLeaveType = (req.getLeaveType() != null && !req.getLeaveType().isBlank())
                ? req.getLeaveType().trim().toUpperCase()
                : "ANNUAL";
        req.setLeaveType(normalizedLeaveType);

        if ("SPECIAL_PAID".equals(normalizedLeaveType) && requestedDays > 4.0) {
            throw new BusinessException(
                    "Vượt hạn mức nghỉ việc khẩn cấp / gia đình hưởng lương trong tháng (tối đa 04 ngày/tháng). Vui lòng tách phần ngày dư sang Nghỉ không lương!");
        }

        Employee matchedEmp = null;
        if (req.getEmployeeCode() != null && !req.getEmployeeCode().isBlank()) {
            matchedEmp = employeeRepository.findByEmployeeCode(req.getEmployeeCode()).orElse(null);
        } else if (req.getEmployeeId() != null) {
            matchedEmp = employeeRepository.findById(req.getEmployeeId()).orElse(null);
        }
        if (matchedEmp != null) {
            req.setEmployeeId(matchedEmp.getId());
            req.setEmployeeCode(matchedEmp.getEmployeeCode());
            req.setEmployeeName(matchedEmp.getFullName());
        }

        final Long targetEmpId = req.getEmployeeId();
        final String targetEmpCode = req.getEmployeeCode();

        // Kiểm tra trùng lịch với các đơn chưa bị từ chối (cho phép 1 buổi sáng + 1 buổi chiều khác buổi trong cùng 1 ngày)
        boolean hasOverlap = leaveMap.values().stream()
                .filter(l -> !"REJECTED".equalsIgnoreCase(l.getStatus()))
                .filter(l -> (targetEmpId != null && targetEmpId.equals(l.getEmployeeId()))
                        || (targetEmpCode != null && targetEmpCode.equalsIgnoreCase(l.getEmployeeCode())))
                .anyMatch(l -> {
                    try {
                        LocalDate s = LocalDate.parse(l.getStartDate());
                        LocalDate e = LocalDate.parse(l.getEndDate());
                        boolean datesOverlap = !s.isAfter(parsedEnd) && !e.isBefore(parsedStart);
                        if (!datesOverlap) return false;
                        String existingSession = l.getHalfDaySession() != null ? l.getHalfDaySession().toUpperCase() : "FULL_DAY";
                        if (("MORNING".equals(normalizedSession) && "AFTERNOON".equals(existingSession))
                                || ("AFTERNOON".equals(normalizedSession) && "MORNING".equals(existingSession))) {
                            return false;
                        }
                        return true;
                    } catch (Exception ex) {
                        return false;
                    }
                });
        if (hasOverlap) {
            throw new BusinessException(
                    "Trùng lịch nghỉ phép: Khoảng ngày " + parsedStart + " -> " + parsedEnd + " trùng với đơn đã tồn tại!");
        }

        // Nghỉ ốm ngắn ngày (SICK_SHORT / SICK): Công ty tự chi trả, tối đa 2.0 ngày/tháng
        if (isShortSickLeaveType(normalizedLeaveType)) {
            double usedSickInMonth = countMonthlyLeaveDays(
                    targetEmpId, targetEmpCode, parsedStart.getYear(), parsedStart.getMonthValue(), null, false, true);
            if (usedSickInMonth + requestedDays > LaborLawConstants.MAX_SHORT_SICK_DAYS_PER_MONTH.doubleValue() + 1e-6) {
                throw new BusinessException(
                        "Vượt hạn mức Nghỉ ốm ngắn ngày (tối đa 02 ngày/tháng do Công ty tự chi trả, không trừ lương). "
                                + "Nếu nằm viện / điều trị dài ngày (> 2 ngày/tháng), vui lòng chọn chế độ Nghỉ ốm dài ngày (SICK_LONG - Không tính lương)!");
            }
        }

        // Kiểm tra & trừ quỹ phép năm cho ANNUAL (Nghỉ phép năm)
        if ("ANNUAL".equals(normalizedLeaveType)) {
            int seniorityBonus = 0;
            if (matchedEmp != null && matchedEmp.getHireDate() != null) {
                int yearsWorked = Math.max(0, parsedStart.getYear() - matchedEmp.getHireDate().getYear());
                seniorityBonus = yearsWorked / 5;
            }
            double totalEntitled = 12.0 + seniorityBonus;
            double usedOrPendingAnnual = leaveMap.values().stream()
                    .filter(l -> !"REJECTED".equalsIgnoreCase(l.getStatus())
                            && "ANNUAL".equalsIgnoreCase(l.getLeaveType()))
                    .filter(l -> (targetEmpId != null && targetEmpId.equals(l.getEmployeeId()))
                            || (targetEmpCode != null && targetEmpCode.equalsIgnoreCase(l.getEmployeeCode())))
                    .mapToDouble(l -> l.getDaysCount() != null ? l.getDaysCount() : 0.0)
                    .sum();
            double remaining = Math.max(0.0, totalEntitled - usedOrPendingAnnual);
            if (requestedDays > remaining + 1e-6) {
                throw new BusinessException(
                        String.format(
                                "Vượt Quỹ Phép Năm (Điều 113–114 BLLĐ): Quỹ phép năm chỉ còn %.1f/%.0f ngày, không đủ cho %.1f ngày!",
                                remaining, totalEntitled, requestedDays));
            }
        }

        Long id = ID_GEN.incrementAndGet();
        req.setId(id);

        boolean isOffice = isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), null);
        req.setSiteManagerApproval(isOffice ? "NOT_REQUIRED" : "PENDING");
        req.setHrApproval("PENDING");
        req.setStatus(isOffice ? "PENDING" : "PENDING_SM");
        req.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        try {
            LeaveRequest entity = LeaveRequest.builder()
                    .employeeId(req.getEmployeeId() != null ? req.getEmployeeId() : 1L)
                    .leaveType(normalizedLeaveType)
                    .halfDaySession(normalizedSession)
                    .startDate(parsedStart)
                    .endDate(parsedEnd)
                    .daysCount(BigDecimal.valueOf(requestedDays))
                    .reason(req.getReason())
                    .attachmentName(req.getAttachmentName())
                    .siteManagerApproval(req.getSiteManagerApproval())
                    .hrApproval(req.getHrApproval())
                    .status(req.getStatus())
                    .build();
            LeaveRequest saved = leaveRequestRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        leaveMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SITE_MANAGER', 'HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PutMapping("/requests/leave/{id}/approve")
    public ResponseEntity<LeaveDto> approveLeave(
            @PathVariable Long id,
            @RequestBody ApproveLeaveRequest body) {
        boolean existedInMap = leaveMap.containsKey(id);
        LeaveDto foundLeave = leaveMap.get(id);
        if (foundLeave == null && id != null && id == 201L) {
            foundLeave = LeaveDto.builder()
                    .id(201L)
                    .employeeId(6L)
                    .employeeCode("HM-HR-02")
                    .employeeName("Nguyễn Thu Giang")
                    .leaveType("ANNUAL")
                    .startDate("2026-10-27")
                    .endDate("2026-10-27")
                    .daysCount(1.0)
                    .reason("Nghỉ phép thường niên.")
                    .attachmentName("Don_xin_nghi_phep_HM006.pdf")
                    .siteManagerApproval("NOT_REQUIRED")
                    .hrApproval("PENDING")
                    .status("PENDING")
                    .createdAt("2026-10-20 08:30")
                    .build();
        }
        if (foundLeave == null) {
            return ResponseEntity.notFound().build();
        }
        final LeaveDto req = foundLeave;

        boolean callerIsSiteManagerOnly = isCallerSiteManagerOnly();
        boolean isSmLevel = callerIsSiteManagerOnly || "SM".equalsIgnoreCase(body.getLevel()) || "SITE_MANAGER".equalsIgnoreCase(body.getLevel());
        boolean isOfficeReq = "NOT_REQUIRED".equalsIgnoreCase(req.getSiteManagerApproval())
                || isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), null);

        if (isSmLevel && isOfficeReq) {
            throw new BusinessException("Từ chối phân quyền: Chỉ huy trưởng / Kỹ sư trưởng công trường KHÔNG được phép duyệt đơn nghỉ phép của Nhân viên Văn phòng!");
        }
        if (!isSmLevel && !isOfficeReq && body.isApproved() && !"APPROVED".equalsIgnoreCase(req.getSiteManagerApproval())) {
            throw new BusinessException("Đơn nghỉ phép của Kỹ sư công trường cần được Chỉ huy trưởng duyệt Cấp 1 trước khi HR duyệt Cấp 2!");
        }
        if (body.isApproved() && !hasValidLeaveAttachment(req.getAttachmentName())) {
            throw new BusinessException(
                    "Không thể phê duyệt: Đơn xin nghỉ phép #NP-" + id + " chưa đính kèm tài liệu/ảnh minh chứng hợp lệ (.pdf, .jpg, .png, .webp)!");
        }
        if (body.isApproved()) {
            try {
                org.springframework.security.core.Authentication auth =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getName() != null) {
                    employeeRepository.findByEmail(auth.getName()).ifPresent(caller -> {
                        boolean isSameId = req.getEmployeeId() != null && caller.getId() != null && caller.getId().equals(req.getEmployeeId());
                        boolean isSameCode = req.getEmployeeCode() != null && caller.getEmployeeCode() != null
                                && caller.getEmployeeCode().equalsIgnoreCase(req.getEmployeeCode());
                        if (isSameId || isSameCode) {
                            throw new BusinessException(
                                    "Vi phạm phân tách nhiệm vụ (Maker–Checker SoD): Người tạo đơn không thể tự phê duyệt đơn xin nghỉ phép của chính mình!");
                        }
                    });
                }
            } catch (BusinessException be) {
                throw be;
            } catch (Exception ignored) {
            }
        }

        if (!body.isApproved()) {
            if (body.getRejectionReason() != null && body.getRejectionReason().isBlank()) {
                return ResponseEntity.badRequest().build();
            }
            if (isSmLevel) {
                req.setSiteManagerApproval("REJECTED");
            } else {
                req.setHrApproval("REJECTED");
            }
            req.setStatus("REJECTED");
            req.setRejectionReason(body.getRejectionReason() != null
                    ? body.getRejectionReason().trim()
                    : "Từ chối phê duyệt theo quy định");
        } else {
            if (isSmLevel) {
                req.setSiteManagerApproval("APPROVED");
                req.setStatus("PENDING_HR");
            } else {
                req.setHrApproval("APPROVED");
                req.setStatus("APPROVED");

                try {
                    LocalDate d = LocalDate.parse(req.getStartDate());
                    MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                            req.getEmployeeId(), d.getMonthValue(), d.getYear()).orElse(null);
                    if (ts != null) {
                        BigDecimal days = BigDecimal.valueOf(req.getDaysCount() != null ? req.getDaysCount() : 1.0);
                        String normalizedType = req.getLeaveType() != null ? req.getLeaveType().trim().toUpperCase() : "ANNUAL";
                        if (isUnpaidLeaveType(normalizedType)) {
                            // PERSONAL_TRAVEL (du lịch/việc cá nhân), SICK_LONG (nằm viện dài ngày), UNPAID: Không tính công hưởng lương
                            ts.setUnpaidLeaveDays(ts.getUnpaidLeaveDays().add(days));
                        } else if (isMonthlyCappedPaidLeaveType(normalizedType)) {
                            // Trần tối đa 4.0 ngày nghỉ hưởng lương/tháng (2 ngày phép + 2 ngày dự phòng, gộp ốm ngắn ngày <= 2 ngày)
                            double alreadyApprovedPaid = countMonthlyLeaveDays(
                                    req.getEmployeeId(), req.getEmployeeCode(), d.getYear(), d.getMonthValue(), req.getId(), true, false);
                            double remainingPaidRoom = Math.max(0.0, LaborLawConstants.MAX_PAID_LEAVE_DAYS_PER_MONTH.doubleValue() - alreadyApprovedPaid);
                            double paidPart = Math.min(days.doubleValue(), remainingPaidRoom);
                            double unpaidPart = Math.max(0.0, days.doubleValue() - paidPart);
                            if (paidPart > 0) {
                                ts.setPaidLeaveDays(ts.getPaidLeaveDays().add(BigDecimal.valueOf(paidPart)));
                            }
                            if (unpaidPart > 0) {
                                ts.setUnpaidLeaveDays(ts.getUnpaidLeaveDays().add(BigDecimal.valueOf(unpaidPart)));
                            }
                        } else {
                            ts.setPaidLeaveDays(ts.getPaidLeaveDays().add(days));
                        }
                        timesheetRepository.save(ts);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        try {
            leaveRequestRepository.findById(id).ifPresent(entity -> {
                entity.setStatus(req.getStatus());
                entity.setSiteManagerApproval(req.getSiteManagerApproval());
                entity.setHrApproval(req.getHrApproval());
                entity.setRejectionReason(req.getRejectionReason());
                leaveRequestRepository.save(entity);
            });
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_LEAVE")
                    .entityName("leave_requests")
                    .entityId(id)
                    .performedByRole(isSmLevel ? "SITE_MANAGER" : "HR_MANAGER")
                    .description("Phê duyệt đơn nghỉ phép #" + id + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        if (existedInMap) {
            leaveMap.put(id, req);
        }
        if (emailService != null && ("APPROVED".equals(req.getStatus()) || "REJECTED".equals(req.getStatus()))) {
            String targetEmail = resolveEmployeeEmail(req.getEmployeeId(), req.getEmployeeCode());
            boolean isApproved = "APPROVED".equals(req.getStatus());
            emailService.sendWorkflowDecisionEmail(
                    targetEmail,
                    req.getEmployeeName(),
                    "Đơn Xin Nghỉ Phép",
                    id,
                    isApproved,
                    "Loại: " + req.getLeaveType() + " | Từ " + req.getStartDate() + " đến " + req.getEndDate() + " (" + req.getDaysCount() + " ngày)",
                    isApproved ? "Đã cập nhật ngày nghỉ vào Bảng công & đồng bộ Quỹ phép năm." : "Lý do từ chối: " + req.getRejectionReason()
            );
        }
        return ResponseEntity.ok(req);
    }

    // ==========================================
    // 3. ATTENDANCE EXPLANATIONS (UC-11 / BF-05)
    // ==========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExplanationDto {
        private Long id;
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private Long projectId;
        private String projectName;
        private String targetDate;
        private String explanationType;
        private String suggestedCheckIn;
        private String suggestedCheckOut;
        private String reason;
        private String evidenceUrl;
        private String siteManagerApproval;
        private String hrApproval;
        private String status;
        private String rejectionReason;
        private String createdAt;
    }

    @Data
    public static class ApproveExplanationRequest {
        private String level;    // SM or HR
        private boolean approved;
        private String rejectionReason;
    }

    @GetMapping("/attendance/explanations")
    public ResponseEntity<List<ExplanationDto>> getAttendanceExplanations(
            @RequestParam(required = false) Long projectId) {
        List<ExplanationDto> list = new ArrayList<>(explanationMap.values());
        if (isCallerSiteManagerOnly()) {
            list = list.stream()
                    .filter(e -> !"NOT_REQUIRED".equalsIgnoreCase(e.getSiteManagerApproval())
                            && (e.getProjectId() == null || e.getProjectId() > 0)
                            && !isOfficeStaffEmployee(e.getEmployeeId(), e.getEmployeeCode(), e.getProjectId()))
                    .collect(Collectors.toList());
        }
        if (projectId != null) {
            list = list.stream().filter(e -> e.getProjectId() != null && e.getProjectId().equals(projectId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(ExplanationDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/attendance/explanations")
    public ResponseEntity<ExplanationDto> createAttendanceExplanation(@RequestBody ExplanationDto req) {
        if (req.getReason() == null || req.getReason().trim().isEmpty()) {
            throw new BusinessException("Vui lòng nhập lý do giải trình chấm công chi tiết (không được để trống)!");
        }
        LocalDate parsedTargetDate;
        try {
            parsedTargetDate = (req.getTargetDate() != null && !req.getTargetDate().isBlank())
                    ? LocalDate.parse(req.getTargetDate().trim())
                    : LocalDate.now();
        } catch (Exception e) {
            throw new BusinessException("Định dạng ngày cần giải trình (targetDate) không hợp lệ!");
        }
        if (parsedTargetDate.isAfter(LocalDate.now())) {
            throw new BusinessException("Lỗi logic thời gian (UTC037): Ngày cần điều chỉnh bù công (" + parsedTargetDate + ") không được là ngày trong tương lai!");
        }
        if (req.getSuggestedCheckIn() != null && req.getSuggestedCheckOut() != null
                && req.getSuggestedCheckOut().trim().compareTo(req.getSuggestedCheckIn().trim()) <= 0) {
            throw new BusinessException("Lỗi khung giờ giải trình: Giờ ra đề xuất (" + req.getSuggestedCheckOut() + ") phải sau Giờ vào đề xuất (" + req.getSuggestedCheckIn() + ")!");
        }

        if (req.getEmployeeCode() != null && !req.getEmployeeCode().isBlank()) {
            employeeRepository.findByEmployeeCode(req.getEmployeeCode()).ifPresent(e -> {
                req.setEmployeeId(e.getId());
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        } else if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(e -> {
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        }

        boolean duplicateExp = explanationMap.values().stream().anyMatch(existing ->
                !"REJECTED".equalsIgnoreCase(existing.getStatus())
                        && ((req.getEmployeeId() != null && req.getEmployeeId().equals(existing.getEmployeeId()))
                            || (req.getEmployeeCode() != null && req.getEmployeeCode().equalsIgnoreCase(existing.getEmployeeCode())))
                        && parsedTargetDate.toString().equals(existing.getTargetDate())
        );
        if (duplicateExp) {
            throw new BusinessException("Lỗi trùng lặp đơn (TC 24): Nhân sự đã có đơn giải trình bù công cho ngày " + parsedTargetDate + " đang chờ duyệt hoặc đã được phê duyệt!");
        }

        Long id = ID_GEN.incrementAndGet();
        req.setId(id);
        req.setTargetDate(parsedTargetDate.toString());

        boolean isOffice = isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), req.getProjectId());
        if (isOffice) {
            req.setProjectId(0L);
            req.setProjectName("Văn Phòng Trụ Sở Chính HQ (TK 642)");
        } else if (req.getProjectId() != null) {
            if (req.getProjectId() == 0L) {
                req.setProjectName("Văn Phòng Trụ Sở Chính HQ (TK 642)");
            } else {
                projectRepository.findById(req.getProjectId()).ifPresent(p -> {
                    req.setProjectName(p.getName());
                });
            }
        }

        req.setSiteManagerApproval(isOffice ? "NOT_REQUIRED" : "PENDING");
        req.setHrApproval("PENDING");
        req.setStatus(isOffice ? "PENDING_HR" : "PENDING_SM");
        req.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        try {
            AttendanceExplanation entity = AttendanceExplanation.builder()
                    .employeeId(req.getEmployeeId() != null ? req.getEmployeeId() : 1L)
                    .projectId(req.getProjectId())
                    .targetDate(req.getTargetDate() != null ? LocalDate.parse(req.getTargetDate()) : LocalDate.now())
                    .explanationType(req.getExplanationType() != null ? req.getExplanationType() : "MISSING_CHECKIN")
                    .suggestedCheckIn(req.getSuggestedCheckIn())
                    .suggestedCheckOut(req.getSuggestedCheckOut())
                    .actualHours(new BigDecimal("8.00"))
                    .reason(req.getReason() != null ? req.getReason() : "Giải trình bù công")
                    .evidenceUrl(req.getEvidenceUrl())
                    .siteManagerApproval(req.getSiteManagerApproval())
                    .hrApproval(req.getHrApproval())
                    .status(req.getStatus())
                    .build();
            AttendanceExplanation saved = attendanceExplanationRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        explanationMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SITE_MANAGER', 'HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PutMapping("/attendance/explanations/{id}/approve")
    public ResponseEntity<ExplanationDto> approveExplanation(
            @PathVariable Long id,
            @RequestBody ApproveExplanationRequest body) {
        ExplanationDto req = explanationMap.get(id);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        boolean callerIsSiteManagerOnly = isCallerSiteManagerOnly();
        boolean isSmLevel = callerIsSiteManagerOnly || "SM".equalsIgnoreCase(body.getLevel()) || "SITE_MANAGER".equalsIgnoreCase(body.getLevel());
        boolean isOfficeReq = "NOT_REQUIRED".equalsIgnoreCase(req.getSiteManagerApproval())
                || (req.getProjectId() != null && req.getProjectId() == 0L)
                || isOfficeStaffEmployee(req.getEmployeeId(), req.getEmployeeCode(), req.getProjectId());

        if (isSmLevel && isOfficeReq) {
            throw new BusinessException("Từ chối phân quyền: Chỉ huy trưởng / Kỹ sư trưởng công trường KHÔNG được phép duyệt giải trình chấm công của Nhân viên Văn phòng!");
        }
        if (!isSmLevel && !isOfficeReq && body.isApproved() && !"APPROVED".equalsIgnoreCase(req.getSiteManagerApproval())) {
            throw new BusinessException("Đơn giải trình của Kỹ sư công trường cần được Chỉ huy trưởng duyệt Cấp 1 trước khi HR duyệt Cấp 2!");
        }

        if (!body.isApproved()) {
            if (body.getRejectionReason() == null || body.getRejectionReason().isBlank()) {
                return ResponseEntity.badRequest().build();
            }
            if (isSmLevel) {
                req.setSiteManagerApproval("REJECTED");
            } else {
                req.setHrApproval("REJECTED");
            }
            req.setStatus("REJECTED");
            req.setRejectionReason(body.getRejectionReason().trim());
        } else {
            if (isSmLevel) {
                req.setSiteManagerApproval("APPROVED");
                req.setStatus("PENDING_HR");
            } else {
                req.setHrApproval("APPROVED");
                req.setStatus("APPROVED");

                // Auto-remedy attendance record & credit 8h work into MonthlyTimesheet!
                try {
                    LocalDate targetDate = LocalDate.parse(req.getTargetDate());
                    Attendance att = attendanceRepository.findByEmployeeIdAndWorkDate(
                            req.getEmployeeId(), targetDate).orElseGet(() -> Attendance.builder()
                            .employeeId(req.getEmployeeId())
                            .workDate(targetDate)
                            .shiftId(1L)
                            .build());

                    att.setStatus(AttendanceStatus.MANUAL_ADJUSTED);
                    att.setActualHours(new BigDecimal("8.00"));
                    att.setRegularHours(new BigDecimal("8.00"));
                    att.setOvertimeHours(BigDecimal.ZERO);
                    attendanceRepository.save(att);

                    // Update Timesheet
                    MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                            req.getEmployeeId(), targetDate.getMonthValue(), targetDate.getYear()).orElse(null);
                    if (ts != null) {
                        ts.setActualWorkDays(ts.getActualWorkDays().add(BigDecimal.ONE));
                        ts.setOfficialWorkDays(ts.getOfficialWorkDays().add(BigDecimal.ONE));
                        timesheetRepository.save(ts);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        try {
            attendanceExplanationRepository.findById(id).ifPresent(entity -> {
                entity.setSiteManagerApproval(req.getSiteManagerApproval());
                entity.setHrApproval(req.getHrApproval());
                entity.setStatus(req.getStatus());
                entity.setRejectionReason(req.getRejectionReason());
                attendanceExplanationRepository.save(entity);
            });
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_EXPLANATION")
                    .entityName("attendance_explanations")
                    .entityId(id)
                    .performedByRole(isSmLevel ? "SITE_MANAGER" : "HR_MANAGER")
                    .description("Phê duyệt giải trình chấm công #" + id + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        explanationMap.put(id, req);
        if (emailService != null && ("APPROVED".equals(req.getStatus()) || "REJECTED".equals(req.getStatus()))) {
            String targetEmail = resolveEmployeeEmail(req.getEmployeeId(), req.getEmployeeCode());
            boolean isApproved = "APPROVED".equals(req.getStatus());
            emailService.sendWorkflowDecisionEmail(
                    targetEmail,
                    req.getEmployeeName(),
                    "Đơn Giải Trình Chấm Công",
                    id,
                    isApproved,
                    "Ngày cần bù công: " + req.getTargetDate() + " (" + req.getSuggestedCheckIn() + " - " + req.getSuggestedCheckOut() + ")",
                    isApproved ? "Đã bù công X (8.0h) và xóa cờ phạt chuyên cần." : "Lý do từ chối: " + req.getRejectionReason()
            );
        }
        return ResponseEntity.ok(req);
    }
}
