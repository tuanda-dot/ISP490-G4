package com.hmcps.service;

import com.hmcps.entity.Employee;
import com.hmcps.entity.PayrollItem;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.service.integration.BankPayoutExportService;
import com.hmcps.service.integration.VietQrService;
import com.hmcps.service.integration.ZaloSharingHelper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IntegrationServicesTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private BankPayoutExportService bankPayoutExportService;

    private final VietQrService vietQrService = new VietQrService();
    private final ZaloSharingHelper zaloSharingHelper = new ZaloSharingHelper();

    @Test
    @DisplayName("VietQR Service: Sinh mã QR chi lương chuẩn NAPAS 247 chính xác định dạng")
    void testVietQrGeneration() {
        String bankBin = "970436"; // Vietcombank
        String accNum = "0011001234567";
        String accName = "NGUYEN VAN A";
        BigDecimal amount = new BigDecimal("23549000");

        VietQrService.VietQrPaymentInfo result = vietQrService.generatePayrollVietQr(
                bankBin, accNum, accName, amount, "NV-001", 10, 2026);

        assertThat(result.getQrImageUrl()).contains("970436-0011001234567-compact2.png");
        assertThat(result.getQrImageUrl()).contains("amount=23549000");
        assertThat(result.getMemo()).isEqualTo("HMCPS Luong T10-2026 NV-001");
        assertThat(result.getQuickLink()).contains("https://api.vietqr.io/970436/0011001234567/23549000");
    }

    @Test
    @DisplayName("Zalo Intent Helper: Tạo liên kết mở App Zalo chia sẻ OTP ca công trường miễn phí")
    void testZaloSharingHelper() {
        String projectName = "Cầu Vàm Cỏ";
        String otpCode = "556677";
        LocalDate date = LocalDate.of(2026, 10, 17);

        String link = zaloSharingHelper.generateZaloOtpShareLink(projectName, otpCode, date);

        assertThat(link).startsWith("https://zalo.me/share?text=");
        assertThat(link).contains("556677");
    }

    @Test
    @DisplayName("Bank Export Service: Tạo file Excel lệnh chi lương hàng loạt Vietcombank & BIDV")
    void testExportBankBatchFiles() throws IOException {
        Employee emp = Employee.builder()
                .id(1L)
                .employeeCode("NV-01")
                .fullName("Trần Văn B")
                .bankAccount("1029384756")
                .build();

        PayrollItem item = PayrollItem.builder()
                .employeeId(1L)
                .employeeCode("NV-01")
                .fullName("Trần Văn B")
                .thucNhan(new BigDecimal("18500000"))
                .build();

        when(employeeRepository.findAllById(anyList())).thenReturn(List.of(emp));

        // Test Vietcombank
        byte[] vcbBytes = bankPayoutExportService.exportVietcombankBatch(List.of(item), 10, 2026);
        assertThat(vcbBytes).isNotNull();
        assertThat(vcbBytes.length).isGreaterThan(1000);

        // Test BIDV
        byte[] bidvBytes = bankPayoutExportService.exportBidvBatch(List.of(item), 10, 2026);
        assertThat(bidvBytes).isNotNull();
        assertThat(bidvBytes.length).isGreaterThan(1000);
    }
}
