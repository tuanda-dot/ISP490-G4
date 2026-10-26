package com.hmcps.controller;

import com.hmcps.entity.Department;
import com.hmcps.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller Quản lý Cơ cấu Tổ chức & Phòng ban (FE-01: UC-01)
 * Hỗ trợ thiết lập Tọa độ GPS Geofencing cho từng Văn phòng / Chi nhánh Trụ sở làm việc
 */
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Department> getDepartmentById(@PathVariable Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng ban với ID: " + id));
        return ResponseEntity.ok(dept);
    }

    @PostMapping
    public ResponseEntity<Department> createDepartment(@RequestBody Department department) {
        Department created = departmentRepository.save(department);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Department> updateDepartment(@PathVariable Long id, @RequestBody Department request) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng ban với ID: " + id));

        dept.setName(request.getName());
        dept.setDescription(request.getDescription());
        dept.setAddress(request.getAddress());
        if (request.getLatitude() != null) dept.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) dept.setLongitude(request.getLongitude());
        if (request.getGeofenceRadiusMeters() != null) dept.setGeofenceRadiusMeters(request.getGeofenceRadiusMeters());

        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteDepartment(@PathVariable Long id) {
        departmentRepository.deleteById(id);
        return ResponseEntity.ok("Phòng ban đã được xóa thành công.");
    }
}
