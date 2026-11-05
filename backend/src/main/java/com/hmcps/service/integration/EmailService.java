package com.hmcps.service.integration;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Dịch vụ gửi Email thông báo & Phiếu lương điện tử (E-Payslip)
 * Sử dụng giao thức SMTP chuẩn (hỗ trợ Gmail SMTP 500 mail/ngày hoặc Brevo 300 mail/ngày miễn phí)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:notification.hmcps@gmail.com}")
    private String senderEmail;

    /**
     * Gửi email kích hoạt tài khoản lần đầu & mật khẩu tạm thời cho nhân viên mới
     */
    public void sendAccountActivationEmail(String toEmail, String employeeName, String tempPassword) {
        String subject = "[HMCPS] Kích hoạt tài khoản nhân sự & Thông tin đăng nhập";
        String content = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2C3D50; border-bottom: 2px solid #C2B280; padding-bottom: 10px;">HỆ THỐNG QUẢN TRỊ NHÂN SỰ & TÍNH LƯƠNG HẢI MINH (HMCPS)</h2>
                <p>Kính gửi Anh/Chị <strong>%s</strong>,</p>
                <p>Tài khoản nhân sự của Anh/Chị đã được khởi tạo thành công trên hệ thống HMCPS.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Tên đăng nhập (Email):</strong> %s</p>
                    <p style="margin: 5px 0;"><strong>Mật khẩu tạm thời:</strong> <span style="color: #e74c3c; font-weight: bold; font-size: 16px;">%s</span></p>
                </div>
                <p style="color: #e67e22;"><em>Lưu ý: Để đảm bảo an toàn thông tin, hệ thống bắt buộc Anh/Chị phải đổi mật khẩu ở lần đăng nhập đầu tiên.</em></p>
                <p style="margin-top: 30px;">Trân trọng,<br><strong>Phòng Hành chính - Nhân sự Công ty Xây dựng Hải Minh</strong></p>
            </div>
            """, employeeName, toEmail, tempPassword);

        sendHtmlEmail(toEmail, subject, content, null, null);
    }

    /**
     * Gửi email chứa mã OTP khôi phục mật khẩu (UC-06)
     */
    public void sendPasswordResetOtpEmail(String toEmail, String otpCode) {
        String subject = "[HMCPS] Mã OTP Khôi phục Mật khẩu";
        String content = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h3 style="color: #2C3D50;">YÊU CẦU ĐẶT LẠI MẬT KHẨU HỆ THỐNG HMCPS</h3>
                <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>%s</strong>.</p>
                <p>Mã xác thực OTP của Anh/Chị là:</p>
                <div style="text-align: center; margin: 25px 0;">
                    <span style="display: inline-block; background-color: #2C3D50; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 6px; padding: 12px 25px; border-radius: 6px;">%s</span>
                </div>
                <p style="color: #7f8c8d; font-size: 13px;">Mã OTP có hiệu lực trong vòng 05 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
            </div>
            """, toEmail, otpCode);

        sendHtmlEmail(toEmail, subject, content, null, null);
    }

    /**
     * Gửi Phiếu lương điện tử (E-Payslip) kèm tệp đính kèm PDF hoặc bảng HTML chi tiết (UC-317)
     */
    public void sendPayslipEmail(String toEmail, String employeeName, int month, int year,
                                 String payslipHtmlSummary, byte[] pdfAttachment) {
        String subject = String.format("[HMCPS] Phiếu lương điện tử Tháng %02d/%d - %s", month, year, employeeName);
        String filename = String.format("PhieuLuong_T%02d_%d_%s.pdf", month, year, employeeName.replaceAll("\\s+", "_"));

        sendHtmlEmail(toEmail, subject, payslipHtmlSummary, filename, pdfAttachment);
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent, String attachmentName, byte[] attachmentBytes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, attachmentBytes != null, StandardCharsets.UTF_8.name());

            helper.setFrom(senderEmail, "HMCPS - Hải Minh Payroll");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            if (attachmentBytes != null && attachmentName != null) {
                helper.addAttachment(attachmentName, new ByteArrayResource(attachmentBytes));
            }

            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            // Không ngắt luồng ứng dụng nếu gửi mail bị lỗi
        }
    }
}
