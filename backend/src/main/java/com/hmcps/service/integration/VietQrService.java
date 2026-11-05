package com.hmcps.service.integration;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Dịch vụ Ngân hàng & Mã thanh toán chuẩn quốc gia VietQR (NAPAS 247)
 * Sử dụng Cổng mở VietQR Open API hoàn toàn miễn phí (vietqr.io)
 */
@Service
@Slf4j
public class VietQrService {

    @Value("${hmcps.banking.vietqr.lookup-banks-url:https://api.vietqr.io/v2/banks}")
    private String banksApiUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Data
    @Builder
    public static class VietQrPaymentInfo {
        private String bankBin;        // Mã BIN ngân hàng (vd: 970436 cho Vietcombank, 970418 cho BIDV)
        private String bankName;       // Tên ngân hàng
        private String accountNumber;  // Số tài khoản người nhận lương
        private String accountName;    // Tên người thụ hưởng
        private BigDecimal amount;     // Số tiền thực nhận (ThucNhan)
        private String memo;           // Nội dung chuyển tiền (vd: "HMCPS Luong T10/2026 NV001")
        private String qrImageUrl;     // Link ảnh mã VietQR chuẩn EMVCo
        private String quickLink;      // Đường dẫn mở App ngân hàng tức thời
    }

    /**
     * Tra cứu danh sách 54 Ngân hàng Việt Nam (Logo, Tên viết tắt, Mã BIN)
     */
    public String fetchSupportedBanksJson() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(banksApiUrl))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return response.body();
            }
            log.warn("VietQR bank lookup returned status: {}", response.statusCode());
        } catch (Exception e) {
            log.error("Failed to query VietQR bank list: {}", e.getMessage());
        }
        // Fallback danh sách các ngân hàng lớn phổ biến nhất
        return """
            {"code":"00","desc":"Success (Fallback)","data":[
                {"id":17,"name":"Ngân hàng TMCP Ngoại Thương Việt Nam","code":"VCB","bin":"970436","shortName":"Vietcombank"},
                {"id":4,"name":"Ngân hàng TMCP Đầu tư và Phát triển Việt Nam","code":"BIDV","bin":"970418","shortName":"BIDV"},
                {"id":43,"name":"Ngân hàng TMCP Kỹ thương Việt Nam","code":"TCB","bin":"970407","shortName":"Techcombank"},
                {"id":26,"name":"Ngân hàng TMCP Công thương Việt Nam","code":"CTG","bin":"970415","shortName":"VietinBank"},
                {"id":2,"name":"Ngân hàng Nông nghiệp và Phát triển Nông thôn VN","code":"VBA","bin":"970405","shortName":"Agribank"},
                {"id":21,"name":"Ngân hàng TMCP Quân đội","code":"MB","bin":"970422","shortName":"MBBank"}
            ]}
            """;
    }

    /**
     * Sinh mã VietQR chi lương chuẩn quốc gia NAPAS 247
     * Cú pháp chuẩn VietQR QuickLink: https://img.vietqr.io/image/{bankBin}-{accountNumber}-compact2.png?amount={amount}&addInfo={memo}&accountName={name}
     */
    public VietQrPaymentInfo generatePayrollVietQr(String bankBin, String accountNumber,
                                                   String accountName, BigDecimal amount,
                                                   String employeeCode, int month, int year) {
        String memo = String.format("HMCPS Luong T%02d-%d %s", month, year, employeeCode);
        String encodedMemo = URLEncoder.encode(memo, StandardCharsets.UTF_8);
        String encodedName = accountName != null ? URLEncoder.encode(accountName, StandardCharsets.UTF_8) : "";

        long amountVnd = amount != null ? amount.longValue() : 0L;

        String qrImageUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                bankBin, accountNumber, amountVnd, encodedMemo, encodedName);

        String quickLink = String.format("https://api.vietqr.io/%s/%s/%d/%s/vietqr.png",
                bankBin, accountNumber, amountVnd, encodedMemo);

        return VietQrPaymentInfo.builder()
                .bankBin(bankBin)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .amount(amount)
                .memo(memo)
                .qrImageUrl(qrImageUrl)
                .quickLink(quickLink)
                .build();
    }
}
