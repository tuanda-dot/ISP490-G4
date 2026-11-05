package com.hmcps.controller;

import com.hmcps.entity.ComplianceRule;
import com.hmcps.entity.SalaryComponent;
import com.hmcps.entity.SalaryGrade;
import com.hmcps.repository.ComplianceRuleRepository;
import com.hmcps.repository.SalaryComponentRepository;
import com.hmcps.repository.SalaryGradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller Quản lý Tham số Pháp lý & Danh mục Phụ cấp Lương Động (FE-08, FE-09: UC-17, UC-18, UC-19)
 */
@RestController
@RequestMapping("/api/compliance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ComplianceController {

    private final ComplianceRuleRepository complianceRuleRepository;
    private final SalaryComponentRepository salaryComponentRepository;
    private final SalaryGradeRepository salaryGradeRepository;

    /**
     * Danh sách hằng số pháp lý 2026 đang có hiệu lực (UC-17)
     */
    @GetMapping("/rules")
    public ResponseEntity<List<ComplianceRule>> getActiveRules() {
        return ResponseEntity.ok(complianceRuleRepository.findByIsActiveTrue());
    }

    /**
     * Danh mục phụ cấp và thành phần lương động (UC-19)
     */
    @GetMapping("/salary-components")
    public ResponseEntity<List<SalaryComponent>> getAllSalaryComponents() {
        return ResponseEntity.ok(salaryComponentRepository.findAll());
    }

    /**
     * Tạo mới hoặc cấu hình phụ cấp đặc thù công trường (UC-19)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")
    @PostMapping("/salary-components")
    public ResponseEntity<SalaryComponent> createSalaryComponent(@RequestBody SalaryComponent component) {
        return ResponseEntity.ok(salaryComponentRepository.save(component));
    }

    /**
     * Danh mục thang bảng lương và ngạch bậc chuẩn (UC-18)
     */
    @GetMapping("/salary-grades")
    public ResponseEntity<List<SalaryGrade>> getSalaryGrades(
            @RequestParam(required = false) String employeeType) {
        if (employeeType != null && !employeeType.isEmpty()) {
            return ResponseEntity.ok(salaryGradeRepository.findByEmployeeTypeAndIsActiveTrueOrderByLevelOrderAsc(employeeType));
        }
        return ResponseEntity.ok(salaryGradeRepository.findByIsActiveTrueOrderByLevelOrderAsc());
    }

    /**
     * Cập nhật hoặc tạo mới ngạch bậc lương (UC-18)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")
    @PostMapping("/salary-grades")
    public ResponseEntity<SalaryGrade> saveSalaryGrade(@RequestBody SalaryGrade grade) {
        if (grade.getMinSalary() != null && grade.getMinSalary().compareTo(new java.math.BigDecimal("5310000")) < 0) {
            throw new IllegalArgumentException("Vi phạm Nghị định 74/2024/NĐ-CP: Mức lương tối thiểu bậc lương không được thấp hơn 5.310.000 VNĐ hoặc là số âm!");
        }
        if (grade.getMinSalary() != null && grade.getMaxSalary() != null && grade.getMaxSalary().compareTo(grade.getMinSalary()) < 0) {
            throw new IllegalArgumentException("Mức lương tối đa của bậc lương không được nhỏ hơn mức lương tối thiểu!");
        }
        return ResponseEntity.ok(salaryGradeRepository.save(grade));
    }
}
