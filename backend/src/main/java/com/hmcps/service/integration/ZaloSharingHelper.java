package com.hmcps.service.integration;

import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Tiện ích hỗ trợ chia sẻ Mã OTP Ca công trường qua Zalo & Telegram (UC-107)
 * Sử dụng Zalo Web Intent & URL Scheme hoàn toàn MIỄN PHÍ, không mất phí Zalo ZNS
 */
@Component
public class ZaloSharingHelper {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Tạo liên kết mở trực tiếp Zalo với nội dung Mã OTP đã được soạn sẵn
     * Chỉ huy trưởng bấm vào link này trên điện thoại -> Zalo tự động mở để chọn nhóm công trường gửi tin.
     *
     * @param projectName Tên dự án công trình
     * @param otpCode Mã OTP động trong ngày
     * @param validDate Ngày hiệu lực của ca
     * @return URL Zalo Share Scheme (vd: https://zalo.me/share?text=...)
     */
    public String generateZaloOtpShareLink(String projectName, String otpCode, LocalDate validDate) {
        String formattedDate = validDate != null ? validDate.format(DATE_FORMATTER) : LocalDate.now().format(DATE_FORMATTER);
        String message = String.format("""
            🔔 [HMCPS] THÔNG BÁO MÃ OTP CHẤM CÔNG HÔM NAY (%s)
            🏗️ Dự án: %s
            🔑 Mã OTP: %s
            ⏱️ Hiệu lực: Trong ngày làm việc
            👉 Anh em kỹ sư có mặt tại công trình mở app HMCPS, bật GPS và nhập mã trên để điểm danh Check-in.
            """, formattedDate, projectName, otpCode);

        String encodedText = URLEncoder.encode(message, StandardCharsets.UTF_8);
        return "https://zalo.me/share?text=" + encodedText;
    }
}
