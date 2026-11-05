package com.hmcps.controller;

import com.hmcps.entity.DailySiteOtp;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.Project;
import com.hmcps.repository.DailySiteOtpRepository;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.ProjectRepository;
import com.hmcps.service.integration.BankPayoutExportService;
import com.hmcps.service.integration.GeocodingService;
import com.hmcps.service.integration.VietQrService;
import com.hmcps.service.integration.VietQrService.VietQrPaymentInfo;
import com.hmcps.service.integration.ZaloSharingHelper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/integration")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IntegrationController {

    private final VietQrService vietQrService;
    private final GeocodingService geocodingService;
    private final ZaloSharingHelper zaloSharingHelper;
    private final BankPayoutExportService bankPayoutExportService;
    private final PayrollItemRepository payrollItemRepository;
    private final ProjectRepository projectRepository;
    private final DailySiteOtpRepository dailySiteOtpRepository;

    @Data
    public static class GenerateVietQrRequest {
        private String bankBin;
        private String accountNumber;
        private String accountName;
        private BigDecimal amount;
        private String employeeCode;
        private Integer month;
        private Integer year;
    }

    /**
     * Tra cứu danh mục 54 ngân hàng Việt Nam (VietQR Open API)
     */
    @GetMapping("/banks")
    public ResponseEntity<String> getSupportedBanks() {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(vietQrService.fetchSupportedBanksJson());
    }

    /**
     * Sinh mã VietQR chi lương chuẩn NAPAS 247
     */
    @PostMapping("/vietqr/generate")
    public ResponseEntity<VietQrPaymentInfo> generateVietQr(@RequestBody GenerateVietQrRequest request) {
        VietQrPaymentInfo qrInfo = vietQrService.generatePayrollVietQr(
                request.getBankBin(), request.getAccountNumber(), request.getAccountName(),
                request.getAmount(), request.getEmployeeCode(), request.getMonth(), request.getYear());
        return ResponseEntity.ok(qrInfo);
    }

    /**
     * Dịch tọa độ GPS sang địa chỉ văn bản tiếng Việt (OpenStreetMap Nominatim)
     */
    @GetMapping("/geocoding/reverse")
    public ResponseEntity<Map<String, String>> reverseGeocode(
            @RequestParam double lat,
            @RequestParam double lon) {
        String address = geocodingService.reverseGeocode(lat, lon);
        return ResponseEntity.ok(Map.of("address", address, "latitude", String.valueOf(lat), "longitude", String.valueOf(lon)));
    }

    /**
     * Lấy link chia sẻ mã OTP công trường qua Zalo (UC-107)
     */
    @GetMapping("/zalo/share-otp-link")
    public ResponseEntity<Map<String, String>> getZaloOtpShareLink(@RequestParam Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Dự án không tồn tại: " + projectId));

        LocalDate today = LocalDate.now();
        DailySiteOtp otp = dailySiteOtpRepository.findByProjectIdAndValidDateAndIsActiveTrue(projectId, today)
                .orElseThrow(() -> new IllegalStateException("Chưa mở ca hoặc chưa tạo mã OTP cho công trình hôm nay!"));

        String shareLink = zaloSharingHelper.generateZaloOtpShareLink(project.getName(), otp.getOtpCode(), today);
        return ResponseEntity.ok(Map.of("shareLink", shareLink, "otpCode", otp.getOtpCode(), "projectName", project.getName()));
    }

    /**
     * Xuất tệp lệnh chi lương hàng loạt cho Ngân hàng (Vietcombank hoặc BIDV) - UC-269
     */
    @GetMapping("/payroll/{payrollId}/export-bank")
    public ResponseEntity<byte[]> exportBankBatch(
            @PathVariable Long payrollId,
            @RequestParam(defaultValue = "VCB") String bankCode,
            @RequestParam(defaultValue = "10") int month,
            @RequestParam(defaultValue = "2026") int year) throws IOException {

        List<PayrollItem> items = payrollItemRepository.findByPayrollId(payrollId);
        byte[] fileBytes;
        String filename;

        if ("BIDV".equalsIgnoreCase(bankCode)) {
            fileBytes = bankPayoutExportService.exportBidvBatch(items, month, year);
            filename = String.format("BIDV_Salary_T%02d_%d.xlsx", month, year);
        } else {
            fileBytes = bankPayoutExportService.exportVietcombankBatch(items, month, year);
            filename = String.format("VCB_Salary_T%02d_%d.xlsx", month, year);
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(fileBytes);
    }
}
