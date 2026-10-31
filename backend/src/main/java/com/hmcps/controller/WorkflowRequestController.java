package com.hmcps.controller;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
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

    private static final AtomicLong ID_GEN = new AtomicLong(1000);
    private static final Map<Long, OvertimeDto> overtimeMap = new ConcurrentHashMap<>();
    private static final Map<Long, LeaveDto> leaveMap = new ConcurrentHashMap<>();
    private static final Map<Long, ExplanationDto> explanationMap = new ConcurrentHashMap<>();

    static {
        // Seed initial Overtime Requests
        overtimeMap.put(101L, OvertimeDto.builder()
                .id(101L)
                .employeeId(7L)
                .employeeCode("HM-ENG-01")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Dự án Cầu Nhật Tân 2")
                .workDate("2026-10-21")
                .startTime("21:00")
                .endTime("03:00")
                .otHours(6.0)
                .otType("NIGHT_SHIFT_ADDITIONAL")
                .multiplier(1.8)
                .reason("Trực kỹ thuật giám sát đổ bê tông dầm cầu nhịp chính K14 ca đêm.")
                .siteManagerApproval("APPROVED")
                .hrApproval("PENDING")
                .status("PENDING_HR")
                .createdAt("2026-10-21 16:30")
                .build());

        overtimeMap.put(102L, OvertimeDto.builder()
                .id(102L)
                .employeeId(8L)
                .employeeCode("HM-ENG-02")
                .employeeName("Phạm Thành Nam")
                .projectId(1L)
                .projectName("Dự án Cầu Nhật Tân 2")
                .workDate("2026-10-22")
                .startTime("18:00")
                .endTime("22:00")
                .otHours(4.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .reason("Lắp đặt hệ thống cáp dự ứng lực nhịp dẫn bờ Bắc.")
                .siteManagerApproval("PENDING")
                .hrApproval("PENDING")
                .status("PENDING_SM")
                .createdAt("2026-10-22 17:00")
                .build());

        // Seed initial Leave Requests
        leaveMap.put(201L, LeaveDto.builder()
                .id(201L)
                .employeeId(6L)
                .employeeCode("HM-HR-02")
                .employeeName("Nguyễn Thu Giang")
                .leaveType("ANNUAL")
                .startDate("2026-10-24")
                .endDate("2026-10-24")
                .daysCount(1.0)
                .reason("Nghỉ phép thường niên theo Điều 113 BLLĐ.")
                .status("APPROVED")
                .createdAt("2026-10-23 09:00")
                .build());

        // Seed initial Attendance Explanations
        explanationMap.put(301L, ExplanationDto.builder()
                .id(301L)
                .employeeId(7L)
                .employeeCode("HM-ENG-01")
                .employeeName("Trần Văn Trung")
                .projectId(1L)
                .projectName("Dự án Cầu Nhật Tân 2")
                .targetDate("2026-10-20")
                .explanationType("GPS_DEVIATION")
                .suggestedCheckIn("07:30")
                .suggestedCheckOut("17:15")
                .reason("Khảo sát đáy trụ cầu dưới hố móng P3, dầm thép dày che chắn sóng GPS vệ tinh.")
                .siteManagerApproval("APPROVED")
                .hrApproval("PENDING")
                .status("PENDING_HR")
                .createdAt("2026-10-20 18:00")
                .build());
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
        private String workDate;
        private String startTime;
        private String endTime;
        private Double otHours;
        private String otType;
        private Double multiplier;
        private String reason;
        private String siteManagerApproval; // PENDING, APPROVED, REJECTED
        private String hrApproval;          // PENDING, APPROVED, REJECTED
        private String status;              // PENDING_SM, PENDING_HR, APPROVED, REJECTED
        private String createdAt;
    }

    @Data
    public static class ApproveOtRequest {
        private String role;       // SITE_MANAGER or HR_MANAGER
        private boolean approved;
    }

    @GetMapping("/requests/overtime")
    public ResponseEntity<List<OvertimeDto>> getOvertimeRequests(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long projectId) {
        List<OvertimeDto> list = new ArrayList<>(overtimeMap.values());
        if (employeeId != null) {
            list = list.stream().filter(r -> r.getEmployeeId().equals(employeeId)).collect(Collectors.toList());
        }
        if (projectId != null) {
            list = list.stream().filter(r -> r.getProjectId() != null && r.getProjectId().equals(projectId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(OvertimeDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/requests/overtime")
    public ResponseEntity<OvertimeDto> createOvertimeRequest(@RequestBody OvertimeDto req) {
        Long id = ID_GEN.incrementAndGet();
        req.setId(id);

        // Fill employee & project info
        if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(e -> {
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        }
        if (req.getProjectId() != null) {
            projectRepository.findById(req.getProjectId()).ifPresent(p -> {
                req.setProjectName(p.getName());
            });
        }

        req.setSiteManagerApproval("PENDING");
        req.setHrApproval("PENDING");
        req.setStatus("PENDING_SM");
        req.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        try {
            OvertimeRequest entity = OvertimeRequest.builder()
                    .employeeId(req.getEmployeeId() != null ? req.getEmployeeId() : 1L)
                    .projectId(req.getProjectId() != null ? req.getProjectId() : 1L)
                    .workDate(req.getWorkDate() != null ? LocalDate.parse(req.getWorkDate()) : LocalDate.now())
                    .startTime(req.getStartTime() != null ? req.getStartTime() : "18:00")
                    .endTime(req.getEndTime() != null ? req.getEndTime() : "22:00")
                    .otHours(BigDecimal.valueOf(req.getOtHours() != null ? req.getOtHours() : 4.0))
                    .otType(req.getOtType() != null ? req.getOtType() : "WEEKDAY_150")
                    .multiplier(BigDecimal.valueOf(req.getMultiplier() != null ? req.getMultiplier() : 1.5))
                    .reason(req.getReason() != null ? req.getReason() : "Tăng ca thi công hiện trường")
                    .siteManagerApproval("PENDING")
                    .hrApproval("PENDING")
                    .status("PENDING_SM")
                    .build();
            OvertimeRequest saved = overtimeRequestRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        overtimeMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SITE_MANAGER', 'HR_MANAGER', 'ADMIN')")
    @PutMapping("/requests/overtime/{id}/approve")
    public ResponseEntity<OvertimeDto> approveOvertime(
            @PathVariable Long id,
            @RequestBody ApproveOtRequest body) {
        OvertimeDto req = overtimeMap.get(id);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        if (!body.isApproved()) {
            if ("SITE_MANAGER".equalsIgnoreCase(body.getRole())) {
                req.setSiteManagerApproval("REJECTED");
            } else {
                req.setHrApproval("REJECTED");
            }
            req.setStatus("REJECTED");
        } else {
            if ("SITE_MANAGER".equalsIgnoreCase(body.getRole())) {
                req.setSiteManagerApproval("APPROVED");
                req.setStatus("PENDING_HR");
            } else {
                req.setHrApproval("APPROVED");
                req.setStatus("APPROVED");

                // Auto-credit Overtime hours into MonthlyTimesheet!
                try {
                    LocalDate d = LocalDate.parse(req.getWorkDate());
                    MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                            req.getEmployeeId(), d.getMonthValue(), d.getYear()).orElse(null);
                    if (ts != null) {
                        BigDecimal hours = BigDecimal.valueOf(req.getOtHours() != null ? req.getOtHours() : 0.0);
                        if ("NIGHT_SHIFT_ADDITIONAL".equalsIgnoreCase(req.getOtType())) {
                            ts.setNightHours(ts.getNightHours().add(hours));
                        } else {
                            ts.setOvertimeHours(ts.getOvertimeHours().add(hours));
                        }
                        timesheetRepository.save(ts);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        try {
            overtimeRequestRepository.findById(id).ifPresent(entity -> {
                entity.setSiteManagerApproval(req.getSiteManagerApproval());
                entity.setHrApproval(req.getHrApproval());
                entity.setStatus(req.getStatus());
                overtimeRequestRepository.save(entity);
            });
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_OVERTIME")
                    .entityName("overtime_requests")
                    .entityId(id)
                    .performedByRole(body.getRole())
                    .description("Phê duyệt đơn OT #" + id + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        overtimeMap.put(id, req);
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
        private String leaveType; // ANNUAL, COMPENSATORY, SICK, UNPAID
        private String startDate;
        private String endDate;
        private Double daysCount;
        private String reason;
        private String status;    // PENDING, APPROVED, REJECTED
        private String createdAt;
    }

    @Data
    public static class ApproveLeaveRequest {
        private boolean approved;
    }

    @GetMapping("/requests/leave")
    public ResponseEntity<List<LeaveDto>> getLeaveRequests(@RequestParam(required = false) Long employeeId) {
        List<LeaveDto> list = new ArrayList<>(leaveMap.values());
        if (employeeId != null) {
            list = list.stream().filter(l -> l.getEmployeeId().equals(employeeId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(LeaveDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/requests/leave")
    public ResponseEntity<LeaveDto> createLeaveRequest(@RequestBody LeaveDto req) {
        Long id = ID_GEN.incrementAndGet();
        req.setId(id);

        if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(e -> {
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        }

        req.setStatus("PENDING");
        req.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        try {
            LeaveRequest entity = LeaveRequest.builder()
                    .employeeId(req.getEmployeeId() != null ? req.getEmployeeId() : 1L)
                    .leaveType(req.getLeaveType() != null ? req.getLeaveType() : "ANNUAL")
                    .startDate(req.getStartDate() != null ? LocalDate.parse(req.getStartDate()) : LocalDate.now())
                    .endDate(req.getEndDate() != null ? LocalDate.parse(req.getEndDate()) : LocalDate.now())
                    .daysCount(BigDecimal.valueOf(req.getDaysCount() != null ? req.getDaysCount() : 1.0))
                    .reason(req.getReason() != null ? req.getReason() : "Nghỉ phép thường niên")
                    .siteManagerApproval("PENDING")
                    .hrApproval("PENDING")
                    .status("PENDING_SM")
                    .build();
            LeaveRequest saved = leaveRequestRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        leaveMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    @PutMapping("/requests/leave/{id}/approve")
    public ResponseEntity<LeaveDto> approveLeave(
            @PathVariable Long id,
            @RequestBody ApproveLeaveRequest body) {
        LeaveDto req = leaveMap.get(id);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        req.setStatus(body.isApproved() ? "APPROVED" : "REJECTED");

        if (body.isApproved()) {
            try {
                LocalDate d = LocalDate.parse(req.getStartDate());
                MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                        req.getEmployeeId(), d.getMonthValue(), d.getYear()).orElse(null);
                if (ts != null) {
                    BigDecimal days = BigDecimal.valueOf(req.getDaysCount() != null ? req.getDaysCount() : 1.0);
                    if ("UNPAID".equalsIgnoreCase(req.getLeaveType())) {
                        ts.setUnpaidLeaveDays(ts.getUnpaidLeaveDays().add(days));
                    } else {
                        ts.setPaidLeaveDays(ts.getPaidLeaveDays().add(days));
                    }
                    timesheetRepository.save(ts);
                }
            } catch (Exception ignored) {
            }
        }

        try {
            leaveRequestRepository.findById(id).ifPresent(entity -> {
                entity.setStatus(req.getStatus());
                entity.setHrApproval(body.isApproved() ? "APPROVED" : "REJECTED");
                leaveRequestRepository.save(entity);
            });
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_LEAVE")
                    .entityName("leave_requests")
                    .entityId(id)
                    .description("Phê duyệt đơn nghỉ phép #" + id + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        leaveMap.put(id, req);
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
        private String createdAt;
    }

    @Data
    public static class ApproveExplanationRequest {
        private String level;    // SM or HR
        private boolean approved;
    }

    @GetMapping("/attendance/explanations")
    public ResponseEntity<List<ExplanationDto>> getAttendanceExplanations(
            @RequestParam(required = false) Long projectId) {
        List<ExplanationDto> list = new ArrayList<>(explanationMap.values());
        if (projectId != null) {
            list = list.stream().filter(e -> e.getProjectId() != null && e.getProjectId().equals(projectId)).collect(Collectors.toList());
        }
        list.sort(Comparator.comparing(ExplanationDto::getId).reversed());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/attendance/explanations")
    public ResponseEntity<ExplanationDto> createAttendanceExplanation(@RequestBody ExplanationDto req) {
        Long id = ID_GEN.incrementAndGet();
        req.setId(id);

        if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(e -> {
                req.setEmployeeCode(e.getEmployeeCode());
                req.setEmployeeName(e.getFullName());
            });
        }
        if (req.getProjectId() != null) {
            projectRepository.findById(req.getProjectId()).ifPresent(p -> {
                req.setProjectName(p.getName());
            });
        }

        req.setSiteManagerApproval("PENDING");
        req.setHrApproval("PENDING");
        req.setStatus("PENDING_SM");
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
                    .siteManagerApproval("PENDING")
                    .hrApproval("PENDING")
                    .status("PENDING_SM")
                    .build();
            AttendanceExplanation saved = attendanceExplanationRepository.save(entity);
            req.setId(saved.getId());
        } catch (Exception ignored) {
        }

        explanationMap.put(req.getId(), req);
        return ResponseEntity.ok(req);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SITE_MANAGER', 'HR_MANAGER', 'ADMIN')")
    @PutMapping("/attendance/explanations/{id}/approve")
    public ResponseEntity<ExplanationDto> approveExplanation(
            @PathVariable Long id,
            @RequestBody ApproveExplanationRequest body) {
        ExplanationDto req = explanationMap.get(id);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        if (!body.isApproved()) {
            if ("SM".equalsIgnoreCase(body.getLevel())) {
                req.setSiteManagerApproval("REJECTED");
            } else {
                req.setHrApproval("REJECTED");
            }
            req.setStatus("REJECTED");
        } else {
            if ("SM".equalsIgnoreCase(body.getLevel())) {
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
                attendanceExplanationRepository.save(entity);
            });
            auditLogRepository.save(AuditLog.builder()
                    .action("APPROVE_EXPLANATION")
                    .entityName("attendance_explanations")
                    .entityId(id)
                    .description("Phê duyệt giải trình chấm công #" + id + " - Trạng thái: " + req.getStatus())
                    .build());
        } catch (Exception ignored) {
        }

        explanationMap.put(id, req);
        return ResponseEntity.ok(req);
    }
}
