package com.hmcps.controller;

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
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    /**
     * Kích hoạt tính toán bảng lương tháng (FE-06)
     */
    @PostMapping("/calculate")
    public ResponseEntity<Payroll> calculateMonthlyPayroll(@RequestBody CalculatePayrollRequest request) {
        Payroll payroll = payrollEngineService.calculateMonthlyPayroll(
                request.getMonth(), request.getYear(), request.getOperatorUserId());
        return ResponseEntity.ok(payroll);
    }

    /**
     * Lấy danh sách tất cả các kỳ lương
     */
    @GetMapping("/periods")
    public ResponseEntity<List<Payroll>> getAllPayrolls() {
        return ResponseEntity.ok(payrollRepository.findAll());
    }

    /**
     * Lấy chi tiết toàn bộ các dòng lương (Payroll Items) 8 khối cột trong 1 kỳ
     */
    @GetMapping("/{payrollId}/items")
    public ResponseEntity<List<PayrollItem>> getPayrollItems(@PathVariable Long payrollId) {
        return ResponseEntity.ok(payrollItemRepository.findByPayrollId(payrollId));
    }

    /**
     * Lấy báo cáo phân bổ chi phí nhân công dự án (TK 622, TK 627, TK 642) - FE-10
     */
    @GetMapping("/{payrollId}/cost-allocations")
    public ResponseEntity<List<ProjectCostAllocation>> getCostAllocations(@PathVariable Long payrollId) {
        return ResponseEntity.ok(costAllocationRepository.findByPayrollId(payrollId));
    }

    /**
     * Lấy danh sách bút toán chứng từ hạch toán kế toán kép (Double-entry Journal Vouchers)
     * Kiểm tra cân đối Nợ = Có và phân bổ chi tiết theo từng Mã công trình / Dự án
     */
    @GetMapping("/{payrollId}/accounting-vouchers")
    public ResponseEntity<com.hmcps.common.dto.AccountingExportResponse> getAccountingVouchers(@PathVariable Long payrollId) {
        return ResponseEntity.ok(accountingExportService.generateJournalVouchers(payrollId));
    }

    /**
     * Tải tệp CSV chuẩn hóa cấu trúc import cho phần mềm kế toán MISA AMIS / MISA SME / FAST / BRAVO
     */
    @GetMapping(value = "/{payrollId}/export-misa-csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<String> exportMisaCsv(@PathVariable Long payrollId) {
        String csvData = accountingExportService.exportToMisaCsv(payrollId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"chung_tu_luong_misa_" + payrollId + ".csv\"")
                .body(csvData);
    }
}
