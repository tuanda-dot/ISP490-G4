package com.hmcps.controller;

import com.hmcps.entity.Employee;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.Payslip;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayslipRepository;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.integration.EmailService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Controller Tra cứu & Phát hành E-Payslip Qua Email (FE-12: UC-24, UC-317)
 */
@RestController
@RequestMapping("/api/payslips")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PayslipController {

    private static final Set<String> PRIVILEGED_ROLES = Set.of(
            "ADMIN", "SYSTEM_ADMIN", "DIRECTOR", "SUPERVISOR",
            "CHIEF_ACCOUNTANT", "ACCOUNTANT", "PAYROLL_ACCOUNTANT"
    );

    private final PayslipRepository payslipRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final EmployeeRepository employeeRepository;
    private final EmailService emailService;

    @Data
    @Builder
    public static class PayslipDetailResponse {
        private Payslip payslip;
        private PayrollItem item;
    }

    @Data
    public static class SendPayslipEmailRequest {
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private String toEmail;
        private Integer month;
        private Integer year;
        private String payslipHtml;
        private String payrollStatus;
        private BigDecimal actualDays;
        private BigDecimal standardDays;
        private BigDecimal overtimeHours;
        private BigDecimal grossPay;
        private BigDecimal bhxhNld;
        private BigDecimal taxTncn;
        private BigDecimal netPay;
        private String position;
    }

    @Data
    public static class SendBatchPayslipsRequest {
        private Long payrollId;
        private Integer month;
        private Integer year;
        private String payrollStatus;
        private List<BatchPayslipItemPayload> items;
    }

    @Data
    public static class BatchPayslipItemPayload {
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private String email;
        private String position;
        private Boolean hasPayslip;
        private BigDecimal actualDays;
        private BigDecimal standardDays;
        private BigDecimal overtimeHours;
        private BigDecimal grossPay;
        private BigDecimal bhxhNld;
        private BigDecimal taxTncn;
        private BigDecimal netPay;
        private String payslipHtml;
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
     * Bước 9 (BF-09): Người lao động xác nhận số liệu lương chính xác & hoàn tất kỳ lương
     */
    @PostMapping("/{id}/confirm-accuracy")
    public ResponseEntity<Payslip> confirmPayslipAccuracy(@PathVariable Long id) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu lương với ID: " + id));

        payslip.setStatus("CONFIRMED");
        return ResponseEntity.ok(payslipRepository.save(payslip));
    }

    /**
     * Gửi Phiếu lương điện tử (E-Payslip) qua Email cho 1 nhân sự cụ thể (UC-317)
     */
    @PostMapping("/send-email")
    public ResponseEntity<Map<String, Object>> sendSinglePayslipEmail(
            @RequestBody SendPayslipEmailRequest request) {

        UserPrincipal principal = currentPrincipal();
        Employee resolvedEmp = resolveEmployee(request.getEmployeeId(), request.getEmployeeCode(), request.getToEmail());

        if (principal != null && !isPrivilegedRole(principal)) {
            boolean isSelf = (resolvedEmp != null && principal.getId().equals(resolvedEmp.getId()))
                    || (request.getEmployeeCode() != null && request.getEmployeeCode().equalsIgnoreCase(principal.getEmployeeCode()))
                    || (request.getToEmail() != null && request.getToEmail().equalsIgnoreCase(principal.getEmail()));
            if (!isSelf) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "message", "Bảo mật Điều 95 BLLĐ: Bạn chỉ được phép gửi phiếu lương của chính mình."
                ));
            }
            if (resolvedEmp == null) {
                resolvedEmp = employeeRepository.findById(principal.getId()).orElse(null);
            }
        }

        if ((principal == null || isPrivilegedRole(principal))
                && request.getPayrollStatus() != null
                && !request.getPayrollStatus().isBlank()
                && !"APPROVED".equalsIgnoreCase(request.getPayrollStatus())
                && !"PAID".equalsIgnoreCase(request.getPayrollStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Chặn phát hành E-Payslip (UTC049): Bảng lương chưa được Giám đốc phê duyệt (APPROVED)."
            ));
        }

        String targetEmail = firstNonBlank(
                request.getToEmail(),
                resolvedEmp != null ? resolvedEmp.getEmail() : null,
                principal != null ? principal.getEmail() : null
        );
        if (targetEmail == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy địa chỉ email người nhận phiếu lương."
            ));
        }

        int month = request.getMonth() != null ? request.getMonth() : LocalDateTime.now().getMonthValue();
        int year = request.getYear() != null ? request.getYear() : LocalDateTime.now().getYear();
        String displayName = firstNonBlank(
                request.getEmployeeName(),
                resolvedEmp != null ? resolvedEmp.getFullName() : null,
                targetEmail
        );
        String empCode = firstNonBlank(
                request.getEmployeeCode(),
                resolvedEmp != null ? resolvedEmp.getEmployeeCode() : null,
                "HM"
        );
        String position = firstNonBlank(
                request.getPosition(),
                resolvedEmp != null ? resolvedEmp.getPosition() : null,
                "Nhân sự Hải Minh"
        );

        String finalHtml = (request.getPayslipHtml() != null && !request.getPayslipHtml().isBlank())
                ? request.getPayslipHtml()
                : buildSummaryHtml(
                        empCode, displayName, position, month, year,
                        request.getActualDays(), request.getStandardDays(), request.getOvertimeHours(),
                        request.getGrossPay(), request.getBhxhNld(), request.getTaxTncn(), request.getNetPay()
                );

        String safeFileName = String.format(
                "PhieuLuong_T%02d_%d_%s.html",
                month, year, empCode.replaceAll("[^A-Za-z0-9_-]", "_")
        );
        byte[] attachmentBytes = finalHtml.getBytes(StandardCharsets.UTF_8);

        EmailService.EmailDispatchResult dispatch = emailService.sendPayslipEmailWithResult(
                targetEmail, displayName, month, year, finalHtml, safeFileName, attachmentBytes
        );

        if (!dispatch.success()) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "success", false,
                    "channel", dispatch.channel(),
                    "message", "Gửi email thất bại qua SMTP: " + dispatch.errorMessage()
            ));
        }

        if (resolvedEmp != null) {
            payslipRepository.findByEmployeeIdAndMonthAndYear(resolvedEmp.getId(), month, year)
                    .ifPresent(payslip -> {
                        payslip.setSentAt(LocalDateTime.now());
                        payslip.setStatus("SENT");
                        payslipRepository.save(payslip);
                    });
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("to", dispatch.to());
        body.put("subject", dispatch.subject());
        body.put("channel", dispatch.channel());
        body.put("timestamp", dispatch.timestamp());
        body.put("employeeName", displayName);
        body.put("message", "EMAIL_SERVER_SANDBOX".equals(dispatch.channel())
                ? "Đã ghi nhận phát hành E-Payslip tới " + dispatch.to() + " (Email Server Sandbox - chưa cấu hình SMTP MAIL_PASSWORD)."
                : "Đã gửi Phiếu lương điện tử thành công tới " + dispatch.to() + " qua SMTP Live.");
        return ResponseEntity.ok(body);
    }

    /**
     * Phát hành & Gửi E-Payslip hàng loạt qua Email cho toàn bộ nhân sự đủ điều kiện (Kế toán / Giám đốc)
     */
    @PostMapping("/send-batch")
    public ResponseEntity<Map<String, Object>> sendBatchPayslipEmails(
            @RequestBody SendBatchPayslipsRequest request) {

        UserPrincipal principal = currentPrincipal();
        if (principal != null && !isPrivilegedRole(principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Chỉ Kế toán / Kế toán trưởng / Giám đốc mới có quyền phát hành E-Payslip hàng loạt."
            ));
        }

        if (request.getPayrollStatus() != null
                && !request.getPayrollStatus().isBlank()
                && !"APPROVED".equalsIgnoreCase(request.getPayrollStatus())
                && !"PAID".equalsIgnoreCase(request.getPayrollStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Chặn phát hành E-Payslip (UTC049): Bảng lương chưa được Giám đốc phê duyệt (APPROVED)."
            ));
        }

        int month = request.getMonth() != null ? request.getMonth() : LocalDateTime.now().getMonthValue();
        int year = request.getYear() != null ? request.getYear() : LocalDateTime.now().getYear();

        int totalSent = 0;
        int skippedCount = 0;
        int failedCount = 0;
        String lastChannel = emailService.isLiveSmtpConfigured() ? "SMTP_LIVE" : "EMAIL_SERVER_SANDBOX";
        List<Map<String, Object>> results = new ArrayList<>();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (BatchPayslipItemPayload row : request.getItems()) {
                BigDecimal net = row.getNetPay() != null ? row.getNetPay() : BigDecimal.ZERO;
                BigDecimal days = row.getActualDays() != null ? row.getActualDays() : BigDecimal.ZERO;
                if (Boolean.FALSE.equals(row.getHasPayslip())
                        || (days.compareTo(BigDecimal.ZERO) <= 0 && net.compareTo(BigDecimal.ZERO) <= 0)) {
                    skippedCount++;
                    continue;
                }

                Employee emp = resolveEmployee(row.getEmployeeId(), row.getEmployeeCode(), row.getEmail());
                String targetEmail = firstNonBlank(row.getEmail(), emp != null ? emp.getEmail() : null);
                if (targetEmail == null) {
                    skippedCount++;
                    continue;
                }

                String empCode = firstNonBlank(row.getEmployeeCode(), emp != null ? emp.getEmployeeCode() : null, "HM");
                String displayName = firstNonBlank(row.getEmployeeName(), emp != null ? emp.getFullName() : null, targetEmail);
                String position = firstNonBlank(row.getPosition(), emp != null ? emp.getPosition() : null, "Nhân sự Hải Minh");

                String html = (row.getPayslipHtml() != null && !row.getPayslipHtml().isBlank())
                        ? row.getPayslipHtml()
                        : buildSummaryHtml(
                                empCode, displayName, position, month, year,
                                row.getActualDays(), row.getStandardDays(), row.getOvertimeHours(),
                                row.getGrossPay(), row.getBhxhNld(), row.getTaxTncn(), row.getNetPay()
                        );
                String fileName = String.format("PhieuLuong_T%02d_%d_%s.html", month, year, empCode.replaceAll("[^A-Za-z0-9_-]", "_"));

                EmailService.EmailDispatchResult dispatch = emailService.sendPayslipEmailWithResult(
                        targetEmail, displayName, month, year, html, fileName, html.getBytes(StandardCharsets.UTF_8)
                );
                lastChannel = dispatch.channel();
                if (dispatch.success()) {
                    totalSent++;
                    if (emp != null) {
                        payslipRepository.findByEmployeeIdAndMonthAndYear(emp.getId(), month, year)
                                .ifPresent(p -> {
                                    p.setSentAt(LocalDateTime.now());
                                    p.setStatus("SENT");
                                    payslipRepository.save(p);
                                });
                    }
                } else {
                    failedCount++;
                }

                Map<String, Object> itemRes = new LinkedHashMap<>();
                itemRes.put("employeeCode", empCode);
                itemRes.put("employeeName", displayName);
                itemRes.put("to", targetEmail);
                itemRes.put("success", dispatch.success());
                itemRes.put("channel", dispatch.channel());
                itemRes.put("timestamp", dispatch.timestamp());
                if (dispatch.errorMessage() != null) {
                    itemRes.put("error", dispatch.errorMessage());
                }
                results.add(itemRes);
            }
        } else if (request.getPayrollId() != null) {
            List<PayrollItem> dbItems = payrollItemRepository.findByPayrollId(request.getPayrollId());
            for (PayrollItem item : dbItems) {
                BigDecimal net = item.getThucNhan() != null ? item.getThucNhan() : BigDecimal.ZERO;
                BigDecimal actual = safeAdd(item.getCongChinhThuc(), item.getCongThuViec());
                if (actual.compareTo(BigDecimal.ZERO) <= 0 && net.compareTo(BigDecimal.ZERO) <= 0) {
                    skippedCount++;
                    continue;
                }

                Employee emp = item.getEmployeeId() != null ? employeeRepository.findById(item.getEmployeeId()).orElse(null) : null;
                String targetEmail = emp != null ? emp.getEmail() : null;
                if (targetEmail == null || targetEmail.isBlank()) {
                    skippedCount++;
                    continue;
                }

                String html = buildSummaryHtmlFromPayrollItem(item, month, year);
                String empCode = firstNonBlank(item.getEmployeeCode(), "HM");
                String fileName = String.format("PhieuLuong_T%02d_%d_%s.html", month, year, empCode.replaceAll("[^A-Za-z0-9_-]", "_"));

                EmailService.EmailDispatchResult dispatch = emailService.sendPayslipEmailWithResult(
                        targetEmail, item.getFullName(), month, year, html, fileName, html.getBytes(StandardCharsets.UTF_8)
                );
                lastChannel = dispatch.channel();
                if (dispatch.success()) {
                    totalSent++;
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
                    payslipRepository.save(payslip);
                } else {
                    failedCount++;
                }

                results.add(Map.of(
                        "employeeCode", empCode,
                        "employeeName", item.getFullName(),
                        "to", targetEmail,
                        "success", dispatch.success(),
                        "channel", dispatch.channel(),
                        "timestamp", dispatch.timestamp()
                ));
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", failedCount == 0);
        response.put("totalSent", totalSent);
        response.put("skippedCount", skippedCount);
        response.put("failedCount", failedCount);
        response.put("channel", lastChannel);
        response.put("results", results);
        response.put("emailLogs", emailService.getDispatchedLogs());
        response.put("message", String.format(
                "Đã phát hành %d E-Payslip qua %s (bỏ qua %d nhân sự chưa có công phát sinh).",
                totalSent, lastChannel, skippedCount
        ));
        return ResponseEntity.ok(response);
    }

    /**
     * Xem nhật ký gửi Email gần nhất từ EmailService
     */
    @GetMapping("/email-logs")
    public ResponseEntity<List<Map<String, String>>> getEmailLogs() {
        return ResponseEntity.ok(emailService.getDispatchedLogs());
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

            if (item.getEmployeeId() != null) {
                employeeRepository.findById(item.getEmployeeId()).ifPresent(emp -> {
                    if (emp.getEmail() != null && !emp.getEmail().isBlank()) {
                        String html = buildSummaryHtmlFromPayrollItem(item, month, year);
                        String code = firstNonBlank(item.getEmployeeCode(), emp.getEmployeeCode(), "HM");
                        String fileName = String.format("PhieuLuong_T%02d_%d_%s.html", month, year, code);
                        emailService.sendPayslipEmailWithResult(
                                emp.getEmail(),
                                firstNonBlank(item.getFullName(), emp.getFullName(), emp.getEmail()),
                                month, year, html, fileName, html.getBytes(StandardCharsets.UTF_8)
                        );
                    }
                });
            }

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

    private UserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        return null;
    }

    private boolean isPrivilegedRole(UserPrincipal principal) {
        if (principal == null || principal.getRole() == null) return false;
        String role = principal.getRole().replace("ROLE_", "").trim().toUpperCase(Locale.ROOT);
        return PRIVILEGED_ROLES.contains(role);
    }

    private Employee resolveEmployee(Long employeeId, String employeeCode, String email) {
        if (employeeId != null) {
            Optional<Employee> byId = employeeRepository.findById(employeeId);
            if (byId.isPresent()) return byId.get();
        }
        if (employeeCode != null && !employeeCode.isBlank()) {
            Optional<Employee> byCode = employeeRepository.findByEmployeeCode(employeeCode.trim());
            if (byCode.isPresent()) return byCode.get();
        }
        if (email != null && !email.isBlank()) {
            return employeeRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        }
        return null;
    }

    private String buildSummaryHtmlFromPayrollItem(PayrollItem item, int month, int year) {
        BigDecimal actualDays = safeAdd(item.getCongChinhThuc(), item.getCongThuViec());
        return buildSummaryHtml(
                firstNonBlank(item.getEmployeeCode(), "HM"),
                firstNonBlank(item.getFullName(), "Nhân sự Hải Minh"),
                firstNonBlank(item.getPosition(), "Nhân sự Hải Minh"),
                month,
                year,
                actualDays,
                item.getCongChuan(),
                item.getOvertimeHours(),
                item.getTongThuNhap(),
                item.getCongBhNld(),
                item.getThueTncn(),
                item.getThucNhan()
        );
    }

    private String buildSummaryHtml(
            String empCode,
            String fullName,
            String position,
            int month,
            int year,
            BigDecimal actualDays,
            BigDecimal standardDays,
            BigDecimal otHours,
            BigDecimal grossPay,
            BigDecimal bhxhNld,
            BigDecimal taxTncn,
            BigDecimal netPay
    ) {
        return String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 22px; border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff;">
                <h2 style="color: #1e3a8a; margin: 0 0 6px 0;">CÔNG TY CỔ PHẦN ĐẦU TƯ &amp; XÂY DỰNG HẢI MINH (HMCPS)</h2>
                <p style="margin: 0 0 16px 0; color: #475569; font-size: 13px;">PHIẾU LƯƠNG ĐIỆN TỬ (E-PAYSLIP) — KỲ THÁNG %02d/%d</p>
                <table style="width: 100%%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Mã nhân sự:</strong> %s</td><td style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Họ và tên:</strong> %s</td></tr>
                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Chức vụ:</strong> %s</td><td style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Ngày công:</strong> %s / %s công (OT: %s giờ)</td></tr>
                </table>
                <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                    <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Khoản mục lương</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Số tiền (VNĐ)</th></tr>
                    <tr><td style="padding: 7px 8px; border: 1px solid #e2e8f0;">Tổng thu nhập (Gross)</td><td style="text-align: right; padding: 7px 8px; border: 1px solid #e2e8f0;">%s đ</td></tr>
                    <tr><td style="padding: 7px 8px; border: 1px solid #e2e8f0;">Khấu trừ BHXH/BHYT/BHTN (10.5%%)</td><td style="text-align: right; padding: 7px 8px; border: 1px solid #e2e8f0; color: #b91c1c;">-%s đ</td></tr>
                    <tr><td style="padding: 7px 8px; border: 1px solid #e2e8f0;">Thuế Thu nhập cá nhân (TNCN)</td><td style="text-align: right; padding: 7px 8px; border: 1px solid #e2e8f0; color: #b91c1c;">-%s đ</td></tr>
                    <tr style="background: #ecfdf5;"><td style="padding: 9px 8px; border: 1px solid #a7f3d0;"><strong>THỰC LĨNH CHUYỂN KHOẢN (NET)</strong></td><td style="text-align: right; padding: 9px 8px; border: 1px solid #a7f3d0; color: #047857;"><strong>%s đ</strong></td></tr>
                </table>
                <p style="margin-top: 16px; color: #64748b; font-size: 12px;">Bảo mật theo Điều 95 Bộ luật Lao động 2019. Mọi thắc mắc vui lòng phản hồi trực tiếp trên cổng HMCPS E-Payslip.</p>
            </div>
            """,
                month, year,
                empCode, fullName,
                position,
                formatDecimal(actualDays), formatDecimal(standardDays != null ? standardDays : new BigDecimal("26")), formatDecimal(otHours),
                formatVnd(grossPay), formatVnd(bhxhNld), formatVnd(taxTncn), formatVnd(netPay)
        );
    }

    private BigDecimal safeAdd(BigDecimal a, BigDecimal b) {
        return (a != null ? a : BigDecimal.ZERO).add(b != null ? b : BigDecimal.ZERO);
    }

    private String formatDecimal(BigDecimal val) {
        return val != null ? val.stripTrailingZeros().toPlainString() : "0";
    }

    private String formatVnd(BigDecimal val) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        nf.setMaximumFractionDigits(0);
        return nf.format(val != null ? val : BigDecimal.ZERO);
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}
