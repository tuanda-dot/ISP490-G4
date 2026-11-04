package com.hmcps.controller;

import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Contract;
import com.hmcps.entity.Employee;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller Quản lý Hồ sơ Nhân sự & Hợp đồng Lao động (FE-01: UC-02, UC-03)
 * Tích hợp đăng ký dữ liệu sinh trắc học Face ID & Cảnh báo hợp đồng sắp hết hạn
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;

    @Data
    public static class RegisterFaceIdRequest {
        private String faceImageUrl;
        private String faceEmbedding; // Vector đặc trưng 128 chiều
    }

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) EmployeeType employeeType) {
        if (departmentId != null) {
            return ResponseEntity.ok(employeeRepository.findByDepartmentId(departmentId));
        }
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));
        return ResponseEntity.ok(emp);
    }

    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        if (employee.getBaseSalary() != null && employee.getBaseSalary().compareTo(new java.math.BigDecimal("5310000")) < 0) {
            throw new IllegalArgumentException("Vi phạm Nghị định 74/2024/NĐ-CP: Mức lương cơ bản không được thấp hơn Lương tối thiểu vùng I (5.310.000 VNĐ) hoặc là số âm!");
        }
        if (employee.getDependentsCount() != null && employee.getDependentsCount() < 0) {
            throw new IllegalArgumentException("Số người phụ thuộc giảm trừ gia cảnh không được là số âm!");
        }
        Employee created = employeeRepository.save(employee);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(@PathVariable Long id, @RequestBody Employee request) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));

        if (request.getBaseSalary() != null && request.getBaseSalary().compareTo(new java.math.BigDecimal("5310000")) < 0) {
            throw new IllegalArgumentException("Vi phạm Nghị định 74/2024/NĐ-CP: Mức lương cơ bản không được thấp hơn Lương tối thiểu vùng I (5.310.000 VNĐ) hoặc là số âm!");
        }
        if (request.getDependentsCount() != null && request.getDependentsCount() < 0) {
            throw new IllegalArgumentException("Số người phụ thuộc giảm trừ gia cảnh không được là số âm!");
        }

        emp.setFullName(request.getFullName());
        emp.setEmail(request.getEmail());
        emp.setPhone(request.getPhone());
        emp.setCitizenId(request.getCitizenId());
        emp.setPosition(request.getPosition());
        emp.setDepartmentId(request.getDepartmentId());
        emp.setEmployeeType(request.getEmployeeType());
        emp.setBaseSalary(request.getBaseSalary());
        emp.setBankAccount(request.getBankAccount());
        emp.setBankName(request.getBankName());
        emp.setDependentsCount(request.getDependentsCount());
        emp.setIsUnionMember(request.getIsUnionMember());
        emp.setStatus(request.getStatus());

        return ResponseEntity.ok(employeeRepository.save(emp));
    }

    /**
     * Đăng ký dữ liệu nhận diện khuôn mặt Face ID AI (FE-03: UC-06)
     */
    @PostMapping("/{id}/register-face")
    public ResponseEntity<Employee> registerFaceId(
            @PathVariable Long id,
            @RequestBody RegisterFaceIdRequest request) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));

        emp.setFaceImageUrl(request.getFaceImageUrl());
        emp.setFaceEmbedding(request.getFaceEmbedding());
        emp.setIsFaceRegistered(true);

        return ResponseEntity.ok(employeeRepository.save(emp));
    }

    /**
     * Cảnh báo danh sách Hợp đồng lao động sắp hết hạn trong 30 ngày (FE-01: UC-03)
     */
    @GetMapping("/contracts/expiring")
    public ResponseEntity<List<Contract>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int daysThreshold) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(daysThreshold);
        List<Contract> expiring = contractRepository.findByEndDateBetweenAndStatus(today, futureDate, ContractStatus.ACTIVE);
        return ResponseEntity.ok(expiring);
    }

    /**
     * Lấy danh sách hợp đồng của nhân viên
     */
    @GetMapping("/{id}/contracts")
    public ResponseEntity<List<Contract>> getEmployeeContracts(@PathVariable Long id) {
        return ResponseEntity.ok(contractRepository.findByEmployeeId(id));
    }

    /**
     * Tạo hợp đồng lao động mới cho nhân sự (UC-03)
     */
    @PostMapping("/{id}/contracts")
    public ResponseEntity<Contract> createContract(
            @PathVariable Long id,
            @RequestBody Contract contract) {
        contract.setEmployeeId(id);
        Contract saved = contractRepository.save(contract);
        return ResponseEntity.ok(saved);
    }
}
