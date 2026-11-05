package com.hmcps.controller;

import com.hmcps.entity.EngineerAssignment;
import com.hmcps.entity.Project;
import com.hmcps.repository.EngineerAssignmentRepository;
import com.hmcps.repository.ProjectRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller Quản lý Công trình & Điều động Dự án (FE-02: UC-04, UC-05)
 * Thiết lập Geofence GPS bản đồ cho công trường và điều chuyển kỹ sư thi công
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final EngineerAssignmentRepository assignmentRepository;

    @Data
    public static class AssignEngineerRequest {
        private Long employeeId;
        private String roleOnSite; // Chỉ huy phó, Kỹ sư giám sát, Cán bộ an toàn
        private LocalDate assignedDate;
        private LocalDate releaseDate;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects(
            @RequestParam(required = false, defaultValue = "ACTIVE") String status) {
        return ResponseEntity.ok(projectRepository.findByStatus(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dự án với ID: " + id));
        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        if (project.getGeofenceRadiusMeters() != null && (project.getGeofenceRadiusMeters() < 50 || project.getGeofenceRadiusMeters() > 2000)) {
            throw new IllegalArgumentException("Bán kính Geofence công trường phải nằm trong khoảng từ 50m đến 2.000m (không được là số âm)!");
        }
        if (project.getLatitude() != null && (project.getLatitude() < -90 || project.getLatitude() > 90)) {
            throw new IllegalArgumentException("Vĩ độ (Latitude) phải nằm trong khoảng [-90, 90]!");
        }
        if (project.getLongitude() != null && (project.getLongitude() < -180 || project.getLongitude() > 180)) {
            throw new IllegalArgumentException("Kinh độ (Longitude) phải nằm trong khoảng [-180, 180]!");
        }
        if (project.getStartDate() != null && project.getEndDate() != null && project.getEndDate().isBefore(project.getStartDate())) {
            throw new IllegalArgumentException("Ngày hoàn thành dự kiến không được nhỏ hơn Ngày khởi công!");
        }
        Project created = projectRepository.save(project);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @RequestBody Project request) {
        Project proj = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dự án với ID: " + id));

        if (request.getGeofenceRadiusMeters() != null && (request.getGeofenceRadiusMeters() < 50 || request.getGeofenceRadiusMeters() > 2000)) {
            throw new IllegalArgumentException("Bán kính Geofence công trường phải nằm trong khoảng từ 50m đến 2.000m (không được là số âm)!");
        }
        if (request.getLatitude() != null && (request.getLatitude() < -90 || request.getLatitude() > 90)) {
            throw new IllegalArgumentException("Vĩ độ (Latitude) phải nằm trong khoảng [-90, 90]!");
        }
        if (request.getLongitude() != null && (request.getLongitude() < -180 || request.getLongitude() > 180)) {
            throw new IllegalArgumentException("Kinh độ (Longitude) phải nằm trong khoảng [-180, 180]!");
        }
        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày hoàn thành dự kiến không được nhỏ hơn Ngày khởi công!");
        }

        proj.setName(request.getName());
        proj.setAddress(request.getAddress());
        if (request.getLatitude() != null) proj.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) proj.setLongitude(request.getLongitude());
        if (request.getGeofenceRadiusMeters() != null) proj.setGeofenceRadiusMeters(request.getGeofenceRadiusMeters());
        proj.setSiteManagerId(request.getSiteManagerId());
        proj.setStartDate(request.getStartDate());
        proj.setEndDate(request.getEndDate());
        proj.setStatus(request.getStatus());

        return ResponseEntity.ok(projectRepository.save(proj));
    }

    /**
     * Điều động kỹ sư hiện trường vào dự án (UC-05)
     */
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
    @GetMapping("/{id}/engineers")
    public ResponseEntity<List<EngineerAssignment>> getAssignedEngineers(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentRepository.findByProjectIdAndStatus(id, "ACTIVE"));
    }
}
