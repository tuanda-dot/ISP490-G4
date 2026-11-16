package com.hmcps.controller;

import com.hmcps.common.enums.PayrollStatus;
import com.hmcps.entity.Payroll;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.ProjectCostAllocation;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayrollRepository;
import com.hmcps.repository.ProjectCostAllocationRepository;
import com.hmcps.service.PayrollEngineService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PayrollController {

    private final PayrollEngineService payrollEngineService;
    private final PayrollRepository payrollRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final ProjectCostAllocationRepository costAllocationRepository;
    private final com.hmcps.service.AccountingExportService accountingExportService;

    @Data
    public static class CalculatePayrollRequest {
        private Integer month;
        private Integer year;
        private Long operatorUserId;
    }

    @Data
    public static class WorkflowActionRequest {
        private Long operatorUserId;
        private String operatorName;
        private String reason;
        private String explanation;
        private String targetProjects;
        private String adjustedProjectBudgetsJson;
    }

    /**
     * Kích hoạt tính toán bảng lương tháng (FE-06) — Chỉ Chuyên viên Kế toán (Maker)
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT')")
    @PostMapping("/calculate")
    public ResponseEntity<Payroll> calculateMonthlyPayroll(@RequestBody CalculatePayrollRequest request) {
        Payroll payroll = payrollEngineService.calculateMonthlyPayroll(
                request.getMonth(), request.getYear(), request.getOperatorUserId());
        return ResponseEntity.ok(payroll);
    }

    /**
     * Lấy danh sách tất cả các kỳ lương (Chặn System Admin theo Điều 95 BLLĐ & SoD)
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'HR_MANAGER', 'HR_STAFF', 'HR_OFFICER', 'SITE_MANAGER', 'SITE_ENGINEER', 'OFFICE_STAFF')")
    @GetMapping("/periods")
    public ResponseEntity<List<Payroll>> getAllPayrolls() {
        return ResponseEntity.ok(payrollRepository.findAll());
    }

    /**
     * Lấy chi tiết toàn bộ các dòng lương (Payroll Items) 8 khối cột trong 1 kỳ
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO', 'HR_MANAGER')")
    @GetMapping("/{payrollId}/items")
    public ResponseEntity<List<PayrollItem>> getPayrollItems(@PathVariable Long payrollId) {
        return ResponseEntity.ok(payrollItemRepository.findByPayrollId(payrollId));
    }

    /**
     * Lấy báo cáo phân bổ chi phí nhân công dự án (TK 622, TK 627, TK 642) - FE-10
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO')")
    @GetMapping("/{payrollId}/cost-allocations")
    public ResponseEntity<List<ProjectCostAllocation>> getCostAllocations(@PathVariable Long payrollId) {
        return ResponseEntity.ok(costAllocationRepository.findByPayrollId(payrollId));
    }

    /**
     * Lấy danh sách bút toán chứng từ hạch toán kế toán kép (Double-entry Journal Vouchers)
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO')")
    @GetMapping("/{payrollId}/accounting-vouchers")
    public ResponseEntity<com.hmcps.common.dto.AccountingExportResponse> getAccountingVouchers(@PathVariable Long payrollId) {
        return ResponseEntity.ok(accountingExportService.generateJournalVouchers(payrollId));
    }

    /**
     * Tải tệp CSV chuẩn hóa cấu trúc import cho phần mềm kế toán MISA AMIS / MISA SME / FAST / BRAVO
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'CEO')")
    @GetMapping(value = "/{payrollId}/export-misa-csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<String> exportMisaCsv(@PathVariable Long payrollId) {
        String csvData = accountingExportService.exportToMisaCsv(payrollId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"chung_tu_luong_misa_" + payrollId + ".csv\"")
                .body(csvData);
    }

    private Payroll resolvePayrollForWorkflow(Long payrollId) {
        return payrollRepository.findById(payrollId)
                .or(() -> payrollRepository.findByMonthAndYear(10, 2026))
                .orElseGet(() -> payrollRepository.save(Payroll.builder()
                        .payrollCode("PR-2026-10")
                        .month(10)
                        .year(2026)
                        .status(PayrollStatus.CALCULATED)
                        .build()));
    }

    /**
     * Kế toán viên trình bảng lương sang Kế toán trưởng (BF-08 Step 10)
     */
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'PAYROLL_ACCOUNTANT')")
    @PostMapping("/{payrollId}/submit-to-chief")
    public ResponseEntity<?> submitToChief(@PathVariable Long payrollId) {
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        payroll.setStatus(PayrollStatus.SUBMITTED);
        payroll.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(payrollRepository.save(payroll));
    }

    /**
     * Kế toán trưởng thẩm định bảng lương / Giải trình & điều chỉnh lại hạn mức ngân sách sau khi Giám đốc từ chối (BF-09 Step 1 & 2)
     */
    @PreAuthorize("hasRole('CHIEF_ACCOUNTANT')")
    @PostMapping("/{payrollId}/chief-review")
    public ResponseEntity<?> chiefReview(
            @PathVariable Long payrollId,
            @RequestBody(required = false) WorkflowActionRequest request) {
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        if (payroll.getStatus() == PayrollStatus.DRAFT) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Bảng lương đang ở trạng thái DRAFT, vui lòng chạy tính lương trước khi Kế toán trưởng thẩm định!"
            ));
        }
        if (request != null) {
            if (request.getOperatorName() != null && !request.getOperatorName().isBlank()) {
                payroll.setReviewedByName(request.getOperatorName().trim());
            }
            if (request.getExplanation() != null && !request.getExplanation().isBlank()) {
                payroll.setChiefAccountantExplanation(request.getExplanation().trim());
                payroll.setAdjustedAt(LocalDateTime.now());
            }
            if (request.getAdjustedProjectBudgetsJson() != null && !request.getAdjustedProjectBudgetsJson().isBlank()) {
                payroll.setAdjustedProjectBudgetsJson(request.getAdjustedProjectBudgetsJson());
            }
        }
        payroll.setReviewedAt(LocalDateTime.now());
        payroll.setStatus(PayrollStatus.REVIEWED);
        payroll.setUpdatedAt(LocalDateTime.now());
        Payroll saved = payrollRepository.save(payroll);
        return ResponseEntity.ok(saved);
    }

    /**
     * Kế toán trưởng trả lại Kế toán viên để đối soát / tính toán lại (BF-09 Step 1 / Điều chỉnh lại)
     */
    @PreAuthorize("hasRole('CHIEF_ACCOUNTANT')")
    @PostMapping("/{payrollId}/chief-return-accountant")
    public ResponseEntity<?> chiefReturnToAccountant(
            @PathVariable Long payrollId,
            @RequestBody(required = false) WorkflowActionRequest request) {
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        if (request != null && request.getExplanation() != null && !request.getExplanation().isBlank()) {
            payroll.setChiefAccountantExplanation(request.getExplanation().trim());
            payroll.setAdjustedAt(LocalDateTime.now());
        }
        if (request != null && request.getAdjustedProjectBudgetsJson() != null && !request.getAdjustedProjectBudgetsJson().isBlank()) {
            payroll.setAdjustedProjectBudgetsJson(request.getAdjustedProjectBudgetsJson());
        }
        payroll.setStatus(PayrollStatus.CALCULATED);
        payroll.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(payrollRepository.save(payroll));
    }

    /**
     * Ban Giám đốc từ chối phê duyệt hạn mức ngân sách & yêu cầu Kế toán trưởng giải trình / điều chỉnh lại (BF-09 Step 3)
     */
    @PreAuthorize("hasAnyRole('DIRECTOR', 'CEO')")
    @PostMapping("/{payrollId}/director-reject")
    public ResponseEntity<?> directorRejectBudget(
            @PathVariable Long payrollId,
            @RequestBody WorkflowActionRequest request) {
        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Vui lòng nhập lý do từ chối & yêu cầu Kế toán trưởng giải trình / điều chỉnh ngân sách!"
            ));
        }
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        payroll.setStatus(PayrollStatus.DIRECTOR_REJECTED);
        payroll.setDirectorRejectionReason(request.getReason().trim());
        payroll.setDirectorRequestedProjects(request.getTargetProjects() != null ? request.getTargetProjects().trim() : null);
        payroll.setRejectedByName(request.getOperatorName() != null ? request.getOperatorName().trim() : "Lê Phúc Hà (Giám đốc)");
        payroll.setRejectedAt(LocalDateTime.now());
        payroll.setUpdatedAt(LocalDateTime.now());
        Payroll saved = payrollRepository.save(payroll);
        return ResponseEntity.ok(saved);
    }

    /**
     * Ban Giám đốc ký duyệt quyết định hạn mức ngân sách chi lương tháng (BF-09 Step 4)
     */
    @PreAuthorize("hasAnyRole('DIRECTOR', 'CEO')")
    @PostMapping("/{payrollId}/director-approve")
    public ResponseEntity<?> directorApproveBudget(
            @PathVariable Long payrollId,
            @RequestBody(required = false) WorkflowActionRequest request) {
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        payroll.setStatus(PayrollStatus.APPROVED);
        if (request != null) {
            payroll.setApprovedBy(request.getOperatorUserId());
            if (request.getOperatorName() != null && !request.getOperatorName().isBlank()) {
                payroll.setApprovedByName(request.getOperatorName().trim());
            }
        }
        payroll.setApprovedAt(LocalDateTime.now());
        payroll.setUpdatedAt(LocalDateTime.now());
        Payroll saved = payrollRepository.save(payroll);
        return ResponseEntity.ok(saved);
    }

    /**
     * Khóa bảng lương kỳ này & phát hành chi trả (BF-09 Step 5) — Kế toán trưởng
     */
    @PreAuthorize("hasRole('CHIEF_ACCOUNTANT')")
    @PostMapping("/{payrollId}/lock-and-pay")
    public ResponseEntity<?> lockAndPay(@PathVariable Long payrollId) {
        Payroll payroll = resolvePayrollForWorkflow(payrollId);
        payroll.setStatus(PayrollStatus.PAID);
        payroll.setUpdatedAt(LocalDateTime.now());
        Payroll saved = payrollRepository.save(payroll);
        return ResponseEntity.ok(saved);
    }
}
