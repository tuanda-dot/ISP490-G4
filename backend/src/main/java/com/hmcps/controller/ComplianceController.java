package com.hmcps.controller;

import com.hmcps.entity.ComplianceRule;
import com.hmcps.entity.SalaryComponent;
import com.hmcps.entity.SalaryGrade;
import com.hmcps.repository.ComplianceRuleRepository;
import com.hmcps.repository.SalaryComponentRepository;
import com.hmcps.repository.SalaryGradeRepository;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.Workflow10SchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
    private final Workflow10SchedulerService workflow10SchedulerService;

    /**
     * Đồng bộ cấu hình Workflow BF-10 (Luật LĐ, Thang lương, Phụ cấp dự án, Lịch trình hẹn giờ & Công thức lương)
     * giữa tất cả các Actor (HR Manager, System Admin Scheduler, Kế toán, Kế toán trưởng, Ban Giám đốc)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> getBf10State() {
        return ResponseEntity.ok(workflow10SchedulerService.getBf10StateResponse());
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER', 'ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO')")
    @PutMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> updateBf10State(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        validateFormulaSafetyIfPresent(payload);
        String actorName = principal != null ? principal.getFullName() : null;
        workflow10SchedulerService.mergeAndSaveBf10State(payload, actorName);
        return ResponseEntity.ok(workflow10SchedulerService.getBf10StateResponse());
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT')")
    @DeleteMapping("/bf10-state")
    public ResponseEntity<Map<String, Object>> resetBf10State(@AuthenticationPrincipal UserPrincipal principal) {
        String actorName = principal != null ? principal.getFullName() : "HR Manager";
        workflow10SchedulerService.clearBf10State(actorName);
        return ResponseEntity.ok(workflow10SchedulerService.getBf10StateResponse());
    }

    /**
     * WF-10 Step 8 & Step 14: Nhận thông báo cấu hình mới sẵn sàng (cho Kế toán / HR / Giám sát System Admin)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/wf10-notifications")
    public ResponseEntity<List<Map<String, Object>>> getWf10Notifications(
            @RequestParam(required = false) String role
    ) {
        return ResponseEntity.ok(workflow10SchedulerService.getNotifications(role));
    }

    /**
     * WF-10 Step 11 -> Step 12-14: Kế toán trưởng chốt bộ công thức & phụ cấp kỳ tới -> Syntax Check, Archive & Notify System Admin
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO')")
    @PostMapping("/wf10/finalize-formula")
    public ResponseEntity<Map<String, Object>> finalizeFormula(
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        validateFormulaSafetyIfPresent(payload);
        return ResponseEntity.ok(workflow10SchedulerService.finalizeFormulaFromChiefAccountant(payload, principal));
    }

    /**
     * Danh sách hằng số pháp lý 2026 đang có hiệu lực (UC-17)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/rules")
    public ResponseEntity<List<ComplianceRule>> getActiveRules() {
        return ResponseEntity.ok(complianceRuleRepository.findByIsActiveTrue());
    }

    /**
     * Danh mục phụ cấp và thành phần lương động (UC-19)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
    @GetMapping("/salary-components")
    public ResponseEntity<List<SalaryComponent>> getAllSalaryComponents() {
        return ResponseEntity.ok(salaryComponentRepository.findAll());
    }

    /**
     * Tạo mới hoặc cấu hình phụ cấp đặc thù công trường (UC-19)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT')")
    @PostMapping("/salary-components")
    public ResponseEntity<SalaryComponent> createSalaryComponent(@RequestBody SalaryComponent component) {
        return ResponseEntity.ok(salaryComponentRepository.save(component));
    }

    /**
     * Danh mục thang bảng lương và ngạch bậc chuẩn (UC-18)
     */
    @org.springframework.security.access.prepost.PreAuthorize("!hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
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
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('HR_MANAGER', 'ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT')")
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

    @SuppressWarnings("unchecked")
    private void validateFormulaSafetyIfPresent(Map<String, Object> payload) {
        if (payload == null) return;
        Map<String, Object> formulasMap = null;
        if (payload.get("formulas") instanceof Map<?, ?> m) {
            formulasMap = (Map<String, Object>) m;
        } else if (payload.get("formulaState") instanceof Map<?, ?> fs && fs.get("formulas") instanceof Map<?, ?> m) {
            formulasMap = (Map<String, Object>) m;
        } else if (payload.get("formulaApprovalState") instanceof Map<?, ?> fs && fs.get("formulas") instanceof Map<?, ?> m) {
            formulasMap = (Map<String, Object>) m;
        }
        if (formulasMap == null) return;

        java.util.regex.Pattern forbidden = java.util.regex.Pattern.compile(
                "\\b(eval|Function|window|document|globalThis|fetch|XMLHttpRequest|import|export|while|for|new|this|constructor|__proto__|prototype)\\b"
        );
        java.util.regex.Pattern literalDivZero = java.util.regex.Pattern.compile("/\\s*0(?:\\.0+)?(?![0-9.])");
        for (Map.Entry<String, Object> entry : formulasMap.entrySet()) {
            if (!(entry.getValue() instanceof String expr)) continue;
            String trimmed = expr.trim();
            if (trimmed.isEmpty()) continue;
            if (forbidden.matcher(trimmed).find()) {
                throw new com.hmcps.common.exception.BusinessException(
                        "Vi phạm an toàn công thức tại khối [" + entry.getKey() + "]: Phát hiện từ khóa thực thi bị cấm!"
                );
            }
            if (literalDivZero.matcher(trimmed).find()) {
                throw new com.hmcps.common.exception.BusinessException(
                        "Lỗi an toàn tài chính tại khối [" + entry.getKey() + "]: Phát hiện phép chia cho 0!"
                );
            }
            int balance = 0;
            for (int i = 0; i < trimmed.length(); i++) {
                char c = trimmed.charAt(i);
                if (c == '(') balance++;
                else if (c == ')') {
                    balance--;
                    if (balance < 0) {
                        throw new com.hmcps.common.exception.BusinessException(
                                "Lỗi cú pháp tại khối [" + entry.getKey() + "]: Cặp ngoặc đơn () không cân bằng!"
                        );
                    }
                }
            }
            if (balance != 0) {
                throw new com.hmcps.common.exception.BusinessException(
                        "Lỗi cú pháp tại khối [" + entry.getKey() + "]: Thiếu dấu đóng ngoặc ')'!"
                );
            }
        }
    }
}
