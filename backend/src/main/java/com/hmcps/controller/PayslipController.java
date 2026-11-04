package com.hmcps.controller;

import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.Payslip;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayslipRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Controller Tra cứu E-Payslip & Phiếu Lương Điện Tử (FE-12: UC-24)
 * Hỗ trợ tra cứu bảo mật, ghi nhận thời điểm xem và phản hồi thắc mắc lương
 */
@RestController
@RequestMapping("/api/payslips")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PayslipController {

    private final PayslipRepository payslipRepository;
    private final PayrollItemRepository payrollItemRepository;

    @Data
    @Builder
    public static class PayslipDetailResponse {
        private Payslip payslip;
        private PayrollItem item;
    }

    /**
     * Tra cứu phiếu lương cá nhân của nhân sự theo tháng/năm (UC-24)
     */
    @GetMapping("/my-payslip")
    public ResponseEntity<PayslipDetailResponse> getMyPayslip(
            @RequestParam Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {

        Payslip payslip = payslipRepository.findByEmployeeIdAndMonthAndYear(employeeId, month, year)
                .orElseThrow(() -> new IllegalArgumentException(
                        String.format("Chưa có phiếu lương cho nhân viên %d trong kỳ %d/%d!", employeeId, month, year)));

        PayrollItem item = payrollItemRepository.findById(payslip.getPayrollItemId())
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy dữ liệu chi tiết dòng lương!"));

        return ResponseEntity.ok(PayslipDetailResponse.builder()
                .payslip(payslip)
                .item(item)
                .build());
    }

    /**
     * Xác nhận mở xem phiếu lương bảo mật (ghi nhận viewedAt)
     */
    @PostMapping("/{id}/view")
    public ResponseEntity<Payslip> markPayslipAsViewed(@PathVariable Long id) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu lương với ID: " + id));

        payslip.setViewedAt(LocalDateTime.now());
        payslip.setStatus("VIEWED");
        return ResponseEntity.ok(payslipRepository.save(payslip));
    }

    /**
     * Sinh phiếu lương tự động cho tất cả nhân sự từ một kỳ tính lương đã được duyệt
     */
    @PostMapping("/generate-for-payroll/{payrollId}")
    public ResponseEntity<List<Payslip>> generatePayslipsForPayroll(
            @PathVariable Long payrollId,
            @RequestParam Integer month,
            @RequestParam Integer year) {

        List<PayrollItem> items = payrollItemRepository.findByPayrollId(payrollId);
        List<Payslip> generated = new ArrayList<>();

        for (PayrollItem item : items) {
            Payslip payslip = payslipRepository.findByPayrollItemId(item.getId())
                    .orElseGet(() -> Payslip.builder()
                            .payrollItemId(item.getId())
                            .employeeId(item.getEmployeeId())
                            .month(month)
                            .year(year)
                            .status("GENERATED")
                            .build());

            payslip.setSentAt(LocalDateTime.now());
            payslip.setStatus("SENT");
            generated.add(payslipRepository.save(payslip));
        }

        return ResponseEntity.ok(generated);
    }

    /**
     * Xem lịch sử phiếu lương qua các tháng của nhân viên
     */
    @GetMapping("/history/{employeeId}")
    public ResponseEntity<List<Payslip>> getEmployeePayslipHistory(@PathVariable Long employeeId) {
        return ResponseEntity.ok(payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employeeId));
    }
}
