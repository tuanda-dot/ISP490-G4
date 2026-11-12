package com.hmcps.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmcps.entity.ComplianceRule;
import com.hmcps.entity.SalaryComponent;
import com.hmcps.entity.SalaryGrade;
import com.hmcps.repository.ComplianceRuleRepository;
import com.hmcps.repository.SalaryComponentRepository;
import com.hmcps.repository.SalaryGradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller Quản lý Tham số Pháp lý & Danh mục Phụ cấp Lương Động (FE-08, FE-09: UC-17, UC-18, UC-19 / BF-10)
 */
@RestController
@RequestMapping("/api/compliance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ComplianceController {

    private final ComplianceRuleRepository complianceRuleRepository;
    private final SalaryComponentRepository salaryComponentRepository;
    private final SalaryGradeRepository salaryGradeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final File BF10_STATE_FILE = new File("./target/hmcps_bf10_state.json");
    private final Map<String, Object> bf10SharedState = new ConcurrentHashMap<>();

    private synchronized void ensureBf10Loaded() {
        if (bf10SharedState.isEmpty() && BF10_STATE_FILE.exists()) {
            try {
                Map<String, Object> diskState = objectMapper.readValue(
                        BF10_STATE_FILE,
                        new TypeReference<Map<String, Object>>() {}
                );
                if (diskState != null) {
                    bf10SharedState.putAll(diskState);
                }
            } catch (Exception ignored) {
            }
        }
    }

    private synchronized void persistBf10ToDisk() {
        try {
            File parent = BF10_STATE_FILE.getParentFile();
            if (parent != null && !parent.exists()) {
                Files.createDirectories(parent.toPath());
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(BF10_STATE_FILE, bf10SharedState);
        } catch (Exception ignored) {
        }
    }

    /**
     * Đồng bộ cấu hình Workflow BF-10 (Luật LĐ, Thang lương, Phụ cấp dự án, Lịch trình hẹn giờ & Công thức lương)
     * giữa tất cả các Actor (HR Manager, Kế toán, Kế toán trưởng, Ban Giám đốc) trên mọi trình duyệt (BF-10)
     */
    @GetMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> getBf10State() {
        ensureBf10Loaded();
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("hasState", !bf10SharedState.isEmpty());
        resp.put("state", new LinkedHashMap<>(bf10SharedState));
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> updateBf10State(@RequestBody Map<String, Object> payload) {
        ensureBf10Loaded();
        if (payload != null) {
            for (Map.Entry<String, Object> entry : payload.entrySet()) {
                if (entry.getValue() != null) {
                    bf10SharedState.put(entry.getKey(), entry.getValue());
                }
            }
            bf10SharedState.put("serverSyncedAt", Instant.now().toString());
            persistBf10ToDisk();
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("hasState", !bf10SharedState.isEmpty());
        resp.put("state", new LinkedHashMap<>(bf10SharedState));
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> resetBf10State() {
        bf10SharedState.clear();
        if (BF10_STATE_FILE.exists()) {
            BF10_STATE_FILE.delete();
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("hasState", false);
        resp.put("state", java.util.Collections.emptyMap());
        return ResponseEntity.ok(resp);
    }

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
