package com.hmcps.controller;

import com.hmcps.entity.EngineerAssignment;
import com.hmcps.entity.Project;
import com.hmcps.repository.EngineerAssignmentRepository;
import com.hmcps.repository.ProjectRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Controller Quản lý Công trình & Điều động Dự án (FE-02: UC-04, UC-05)
 * Thiết lập Geofence GPS bản đồ & Trần ngân sách OT công trường, điều chuyển kỹ sư thi công
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final EngineerAssignmentRepository assignmentRepository;

    // Trần ngân sách OT hàng tháng cho Khối Văn phòng HQ (TK 642), mặc định 12,000,000 VNĐ
    public static final AtomicReference<BigDecimal> HQ_OFFICE_OT_BUDGET_CAP =
            new AtomicReference<>(new BigDecimal("12000000.00"));

    @Data
    public static class AssignEngineerRequest {
        private Long employeeId;
        private String roleOnSite; // Chỉ huy phó, Kỹ sư giám sát, Cán bộ an toàn
        private LocalDate assignedDate;
        private LocalDate releaseDate;
    }

    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects(
            @RequestParam(required = false, defaultValue = "ACTIVE") String status) {
        return ResponseEntity.ok(projectRepository.findByStatus(status));
    }

    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dự án với ID: " + id));
        return ResponseEntity.ok(project);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTOR', 'CEO')")
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        if (project.getCode() == null || project.getCode().trim().isEmpty() || project.getName() == null || project.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Mã dự án và Tên dự án không được để trống!");
        }
        String normalizedCode = project.getCode().trim().toUpperCase();
        if (projectRepository.findByCode(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Lỗi dữ liệu trùng lặp: Mã dự án [" + normalizedCode + "] đã tồn tại trên hệ thống!");
        }
        project.setCode(normalizedCode);
        project.setName(project.getName().trim());
        if (project.getGeofenceRadiusMeters() != null && (project.getGeofenceRadiusMeters() < 50 || project.getGeofenceRadiusMeters() > 5000)) {
            throw new IllegalArgumentException("Bán kính Geofence công trường phải nằm trong khoảng từ 50m đến 5.000m (không được là số âm)!");
        }
        if (project.getLatitude() != null && (project.getLatitude().doubleValue() < -90.0 || project.getLatitude().doubleValue() > 90.0)) {
            throw new IllegalArgumentException("Vĩ độ (Latitude) phải nằm trong khoảng [-90, 90]!");
        }
        if (project.getLongitude() != null && (project.getLongitude().doubleValue() < -180.0 || project.getLongitude().doubleValue() > 180.0)) {
            throw new IllegalArgumentException("Kinh độ (Longitude) phải nằm trong khoảng [-180, 180]!");
        }
        if (project.getStartDate() != null && project.getEndDate() != null && project.getEndDate().isBefore(project.getStartDate())) {
            throw new IllegalArgumentException("Ngày hoàn thành dự kiến không được nhỏ hơn Ngày khởi công!");
        }
        if (project.getOtBudgetCap() != null && project.getOtBudgetCap().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Trần ngân sách OT dự án không được là số âm!");
        }
        if (project.getOtBudgetCap() == null) {
            project.setOtBudgetCap(new BigDecimal("20000000.00"));
        }
        Project created = projectRepository.save(project);
        return ResponseEntity.ok(created);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTOR', 'CEO', 'CHIEF_ACCOUNTANT')")
    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @RequestBody Project request) {
        Project proj = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dự án với ID: " + id));

        if (request.getGeofenceRadiusMeters() != null && (request.getGeofenceRadiusMeters() < 50 || request.getGeofenceRadiusMeters() > 5000)) {
            throw new IllegalArgumentException("Bán kính Geofence công trường phải nằm trong khoảng từ 50m đến 5.000m (không được là số âm)!");
        }
        if (request.getLatitude() != null && (request.getLatitude().doubleValue() < -90.0 || request.getLatitude().doubleValue() > 90.0)) {
            throw new IllegalArgumentException("Vĩ độ (Latitude) phải nằm trong khoảng [-90, 90]!");
        }
        if (request.getLongitude() != null && (request.getLongitude().doubleValue() < -180.0 || request.getLongitude().doubleValue() > 180.0)) {
            throw new IllegalArgumentException("Kinh độ (Longitude) phải nằm trong khoảng [-180, 180]!");
        }
        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày hoàn thành dự kiến không được nhỏ hơn Ngày khởi công!");
        }
        if (request.getOtBudgetCap() != null && request.getOtBudgetCap().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Trần ngân sách OT dự án không được là số âm!");
        }

        if (request.getName() != null) proj.setName(request.getName());
        if (request.getAddress() != null) proj.setAddress(request.getAddress());
        if (request.getLatitude() != null) proj.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) proj.setLongitude(request.getLongitude());
        if (request.getGeofenceRadiusMeters() != null) proj.setGeofenceRadiusMeters(request.getGeofenceRadiusMeters());
        if (request.getOtBudgetCap() != null) proj.setOtBudgetCap(request.getOtBudgetCap());
        if (request.getSiteManagerId() != null) proj.setSiteManagerId(request.getSiteManagerId());
        if (request.getStartDate() != null) proj.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) proj.setEndDate(request.getEndDate());
        if (request.getStatus() != null) proj.setStatus(request.getStatus());

        return ResponseEntity.ok(projectRepository.save(proj));
    }

    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/hq-ot-budget")
    public ResponseEntity<Map<String, Object>> getHqOtBudgetCap() {
        return ResponseEntity.ok(Map.of(
                "projectId", 0,
                "projectCode", "VP-HO",
                "otBudgetCap", HQ_OFFICE_OT_BUDGET_CAP.get()
        ));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTOR', 'CEO', 'CHIEF_ACCOUNTANT')")
    @PutMapping("/hq-ot-budget")
    public ResponseEntity<Map<String, Object>> updateHqOtBudgetCap(@RequestBody Map<String, Object> body) {
        Object raw = body != null ? body.get("otBudgetCap") : null;
        if (raw == null) {
            throw new IllegalArgumentException("Vui lòng cung cấp hạn mức otBudgetCap hợp lệ!");
        }
        BigDecimal cap = new BigDecimal(raw.toString());
        if (cap.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Trần ngân sách OT khối văn phòng không được âm!");
        }
        HQ_OFFICE_OT_BUDGET_CAP.set(cap);
        return ResponseEntity.ok(Map.of(
                "projectId", 0,
                "projectCode", "VP-HO",
                "otBudgetCap", cap
        ));
    }

    /**
     * Điều động kỹ sư hiện trường vào dự án (UC-05) — Chỉ HR Staff / HR Manager
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PostMapping("/{id}/assign")
    public ResponseEntity<EngineerAssignment> assignEngineer(
            @PathVariable Long id,
            @RequestBody AssignEngineerRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dự án với ID: " + id));

        EngineerAssignment assignment = EngineerAssignment.builder()
                .projectId(project.getId())
                .employeeId(request.getEmployeeId())
                .roleOnSite(request.getRoleOnSite())
                .assignedDate(request.getAssignedDate() != null ? request.getAssignedDate() : LocalDate.now())
                .releaseDate(request.getReleaseDate())
                .status("ACTIVE")
                .build();

        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    /**
     * Danh sách kỹ sư đang được phân công tại dự án (UC-05)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/{id}/engineers")
    public ResponseEntity<List<EngineerAssignment>> getAssignedEngineers(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentRepository.findByProjectIdAndStatus(id, "ACTIVE"));
    }
}
