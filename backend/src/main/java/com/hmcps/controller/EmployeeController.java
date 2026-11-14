package com.hmcps.controller;

import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.util.FaceImageValidator;
import com.hmcps.entity.Contract;
import com.hmcps.entity.Employee;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final PasswordEncoder passwordEncoder;

    @Data
    public static class RegisterFaceIdRequest {
        private String faceImageUrl;
        private String faceEmbedding; // Vector đặc trưng 128 chiều
    }

    @PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) EmployeeType employeeType) {
        if (departmentId != null) {
            return ResponseEntity.ok(employeeRepository.findByDepartmentId(departmentId));
        }
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    @PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));
        return ResponseEntity.ok(emp);
    }

    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PostMapping
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        if (employee.getEmail() == null || !employee.getEmail().trim().toLowerCase().matches("^[a-z0-9._%+-]+@(haiminh\\.vn|gmail\\.com)$")) {
            throw new IllegalArgumentException("Email không hợp lệ! Vui lòng sử dụng email có đuôi @haiminh.vn hoặc @gmail.com.");
        }
        String normalizedEmail = employee.getEmail().trim().toLowerCase();
        employee.setEmail(normalizedEmail);
        if (employee.getCitizenId() != null && employee.getCitizenId().isBlank()) {
            employee.setCitizenId(null);
        }

        if (employeeRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Email doanh nghiệp [" + normalizedEmail + "] đã tồn tại trong hệ thống!");
        }
        if (employee.getEmployeeCode() == null || employee.getEmployeeCode().isBlank()) {
            long seq = employeeRepository.count() + 1;
            String generatedCode = String.format("HM-%03d", seq);
            while (employeeRepository.findByEmployeeCode(generatedCode).isPresent()) {
                seq++;
                generatedCode = String.format("HM-%03d", seq);
            }
            employee.setEmployeeCode(generatedCode);
        } else {
            employee.setEmployeeCode(employee.getEmployeeCode().trim());
            if (employeeRepository.findByEmployeeCode(employee.getEmployeeCode()).isPresent()) {
                throw new IllegalArgumentException("Mã nhân viên [" + employee.getEmployeeCode() + "] đã tồn tại trong hệ thống!");
            }
        }
        if (employee.getBaseSalary() != null && employee.getBaseSalary().compareTo(new java.math.BigDecimal("5310000")) < 0) {
            throw new IllegalArgumentException("Vi phạm Nghị định 74/2024/NĐ-CP: Mức lương cơ bản không được thấp hơn Lương tối thiểu vùng I (5.310.000 VNĐ) hoặc là số âm!");
        }
        if (employee.getDependentsCount() != null && employee.getDependentsCount() < 0) {
            throw new IllegalArgumentException("Số người phụ thuộc giảm trừ gia cảnh không được là số âm!");
        }
        if (employee.getRole() == null || employee.getRole().isBlank() || "ROLE_OFFICE_STAFF".equals(employee.getRole())) {
            employee.setRole(employee.getEmployeeType() == EmployeeType.SITE_ENGINEER ? "ROLE_SITE_ENGINEER" : "ROLE_OFFICE_STAFF");
        } else if (!employee.getRole().startsWith("ROLE_")) {
            employee.setRole("ROLE_" + employee.getRole().trim());
        }
        if (employee.getPasswordHash() == null || employee.getPasswordHash().isBlank()) {
            employee.setPasswordHash(passwordEncoder.encode("Password123@"));
            employee.setMustChangePassword(true);
        }
        if (employee.getBaseSalary() == null) {
            employee.setBaseSalary(new java.math.BigDecimal("15000000.00"));
        }
        if (employee.getStatus() == null) {
            employee.setStatus("ACTIVE");
        }
        Employee created = employeeRepository.save(employee);
        if (!contractRepository.existsActiveContract(created.getId(), ContractStatus.ACTIVE, LocalDate.now())) {
            com.hmcps.common.enums.ContractType resolvedType = employee.getContractType() != null
                    ? employee.getContractType()
                    : com.hmcps.common.enums.ContractType.OFFICIAL_DEFINITE;
            LocalDate resolvedEndDate = resolvedType == com.hmcps.common.enums.ContractType.OFFICIAL_INDEFINITE
                    ? null
                    : (employee.getContractEndDate() != null ? employee.getContractEndDate() : LocalDate.now().plusYears(1));
            LocalDate resolvedStartDate = employee.getHireDate() != null && !employee.getHireDate().isAfter(LocalDate.now())
                    ? employee.getHireDate()
                    : LocalDate.now();
            Contract contract = Contract.builder()
                    .contractNumber("HDLD-HM-2026/" + String.format("%03d", created.getId()))
                    .employeeId(created.getId())
                    .contractType(resolvedType)
                    .startDate(resolvedStartDate)
                    .endDate(resolvedEndDate)
                    .baseSalary(employee.getBaseSalary())
                    .insuranceFlag(resolvedType == com.hmcps.common.enums.ContractType.PROBATION
                            ? com.hmcps.common.enums.InsuranceFlag.NO_INSURANCE
                            : com.hmcps.common.enums.InsuranceFlag.FULL)
                    .taxFlag(com.hmcps.common.enums.TaxFlag.PROGRESSIVE)
                    .status(ContractStatus.ACTIVE)
                    .build();
            contractRepository.save(contract);
        }
        return ResponseEntity.ok(created);
    }

    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
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
     * Đăng ký hoặc cập nhật trực tiếp dữ liệu khuôn mặt Face ID AI (FE-03: UC-06).
     * Chỉ HR Staff / HR Manager / Admin hệ thống mới được phép ghi trực tiếp vào hồ sơ nhân sự.
     */
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PostMapping("/{id}/register-face")
    public ResponseEntity<Employee> registerFaceId(
            @PathVariable Long id,
            @RequestBody RegisterFaceIdRequest request) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));

        boolean hasImage = request.getFaceImageUrl() != null && !request.getFaceImageUrl().trim().isEmpty();
        boolean hasEmbedding = request.getFaceEmbedding() != null && !request.getFaceEmbedding().trim().isEmpty();
        if (!hasImage && !hasEmbedding) {
            throw new IllegalArgumentException("Vui lòng cung cấp ảnh khuôn mặt hoặc vector sinh trắc học để cập nhật Face ID!");
        }

        if (hasImage) {
            emp.setFaceImageUrl(FaceImageValidator.normalizeAndValidate(request.getFaceImageUrl()));
        }
        if (hasEmbedding) {
            emp.setFaceEmbedding(request.getFaceEmbedding().trim());
        }
        emp.setIsFaceRegistered(true);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorLabel = (auth != null && auth.getPrincipal() instanceof com.hmcps.security.UserPrincipal up)
                ? up.getFullName() + " (" + up.getRole().replace("ROLE_", "") + ")"
                : "HR / Quản trị viên";
        emp.setFaceUpdatedBy(actorLabel);
        emp.setFaceUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(employeeRepository.save(emp));
    }

    /**
     * Cảnh báo danh sách Hợp đồng lao động sắp hết hạn trong 30 ngày (FE-01: UC-03)
     */
    @PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
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
    @PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/{id}/contracts")
    public ResponseEntity<List<Contract>> getEmployeeContracts(@PathVariable Long id) {
        return ResponseEntity.ok(contractRepository.findByEmployeeId(id));
    }

    /**
     * Tạo hợp đồng lao động mới cho nhân sự (UC-03) — Chỉ HR Staff / HR Manager
     */
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER')")
    @PostMapping("/{id}/contracts")
    public ResponseEntity<Contract> createContract(
            @PathVariable Long id,
            @RequestBody Contract contract) {
        contract.setEmployeeId(id);
        Contract saved = contractRepository.save(contract);
        return ResponseEntity.ok(saved);
    }
}
