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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Dịch vụ gửi Email thông báo & Phiếu lương điện tử (E-Payslip)
 * Sử dụng giao thức SMTP chuẩn (hỗ trợ Gmail SMTP 500 mail/ngày hoặc Brevo 300 mail/ngày miễn phí)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    public record EmailDispatchResult(
            boolean success,
            String channel,
            String to,
            String subject,
            String timestamp,
            String errorMessage
    ) {}

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:notification.hmcps@gmail.com}")
    private String senderEmail;

    @Value("${spring.mail.password:xxxx-xxxx-xxxx-xxxx}")
    private String mailPassword;

    private final ConcurrentLinkedDeque<Map<String, String>> dispatchedLogs = new ConcurrentLinkedDeque<>();

    public boolean isLiveSmtpConfigured() {
        return mailPassword != null && !mailPassword.isBlank() && !mailPassword.startsWith("xxxx");
    }

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
        sendPasswordResetOtpEmailWithResult(toEmail, toEmail, otpCode);
    }

    public EmailDispatchResult sendPasswordResetOtpEmailWithResult(String toEmail, String employeeName, String otpCode) {
        String subject = "[HMCPS] Mã OTP Khôi phục Mật khẩu";
        String displayName = (employeeName != null && !employeeName.isBlank()) ? employeeName : toEmail;
        String content = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h3 style="color: #2C3D50; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">YÊU CẦU ĐẶT LẠI MẬT KHẨU HỆ THỐNG HMCPS</h3>
                <p>Kính gửi Anh/Chị <strong>%s</strong>,</p>
                <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>%s</strong>.</p>
                <p>Mã xác thực OTP của Anh/Chị là:</p>
                <div style="text-align: center; margin: 25px 0;">
                    <span style="display: inline-block; background-color: #2C3D50; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 6px; padding: 12px 25px; border-radius: 6px;">%s</span>
                </div>
                <p style="color: #7f8c8d; font-size: 13px;">Mã OTP có hiệu lực trong vòng 05 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
            </div>
            """, displayName, toEmail, otpCode);

        return sendHtmlEmailSync(toEmail, subject, content, null, null);
    }

    /**
     * Gửi Phiếu lương điện tử (E-Payslip) kèm tệp đính kèm PDF hoặc bảng HTML chi tiết (UC-317)
     */
    public void sendPayslipEmail(String toEmail, String employeeName, int month, int year,
                                 String payslipHtmlSummary, byte[] pdfAttachment) {
        String safeName = (employeeName != null ? employeeName : "NhanVien").replaceAll("\\s+", "_");
        String filename = String.format("PhieuLuong_T%02d_%d_%s.pdf", month, year, safeName);
        sendPayslipEmailWithResult(toEmail, employeeName, month, year, payslipHtmlSummary, filename, pdfAttachment);
    }

    public EmailDispatchResult sendPayslipEmailWithResult(
            String toEmail,
            String employeeName,
            int month,
            int year,
            String payslipHtmlSummary,
            String attachmentName,
            byte[] attachmentBytes
    ) {
        String displayName = (employeeName != null && !employeeName.isBlank()) ? employeeName : toEmail;
        String subject = String.format("[HMCPS] Phiếu lương điện tử Tháng %02d/%d - %s", month, year, displayName);
        String resolvedFilename = attachmentName;
        if (attachmentBytes != null && (resolvedFilename == null || resolvedFilename.isBlank())) {
            resolvedFilename = String.format("PhieuLuong_T%02d_%d_%s.html", month, year, displayName.replaceAll("\\s+", "_"));
        }
        return sendHtmlEmailSync(toEmail, subject, payslipHtmlSummary, resolvedFilename, attachmentBytes);
    }

    /**
     * Gửi email thông báo kết quả phê duyệt/từ chối đơn từ (BF-04 OT, BF-05 Giải trình, BF-06 Nghỉ phép)
     */
    public void sendWorkflowDecisionEmail(
            String toEmail,
            String employeeName,
            String requestTypeLabel,
            Long requestId,
            boolean approved,
            String detailLine,
            String extraNote
    ) {
        if (toEmail == null || toEmail.isBlank()) return;
        String statusText = approved ? "ĐÃ ĐƯỢC PHÊ DUYỆT" : "ĐÃ BỊ TỪ CHỐI";
        String color = approved ? "#047857" : "#b91c1c";
        String subject = String.format("[HMCPS] Thông báo %s %s (#%d)", statusText, requestTypeLabel, requestId);
        String content = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h3 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">HMCPS — THÔNG BÁO KẾT QUẢ XỬ LÝ ĐƠN TỪ</h3>
                <p>Kính gửi Anh/Chị <strong>%s</strong>,</p>
                <p>Đơn <strong>%s (#%d)</strong> của Anh/Chị <strong style="color: %s;">%s</strong>.</p>
                <div style="background-color: #f8fafc; padding: 12px 15px; border-radius: 6px; border-left: 4px solid %s; margin: 14px 0;">
                    <p style="margin: 4px 0;"><strong>Chi tiết thời gian / nội dung:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Ghi chú / Thông tin bổ sung:</strong> %s</p>
                </div>
                <p style="color: #64748b; font-size: 12px;">Hệ thống tự động cập nhật dữ liệu lên Bảng chấm công &amp; Quỹ lương tương ứng.</p>
            </div>
            """, employeeName, requestTypeLabel, requestId, color, statusText, color, detailLine, extraNote);

        sendHtmlEmail(toEmail, subject, content, null, null);
    }

    public List<Map<String, String>> getDispatchedLogs() {
        return new ArrayList<>(dispatchedLogs);
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent, String attachmentName, byte[] attachmentBytes) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        boolean hasRealSmtp = isLiveSmtpConfigured();
        recordDispatchLog(to, subject, timestamp, hasRealSmtp ? "SMTP_LIVE" : "EMAIL_SERVER_SANDBOX", "QUEUED");

        if (!hasRealSmtp) {
            log.info("[Email Server Sandbox] Dispatched email -> To: {} | Subject: {}", to, subject);
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                sendMimeMessage(to, subject, htmlContent, attachmentName, attachmentBytes);
                log.info("Email sent successfully to: {}", to);
            } catch (Exception e) {
                log.error("Failed to send email to {}: {}", to, e.getMessage());
            }
        });
    }

    private EmailDispatchResult sendHtmlEmailSync(
            String to,
            String subject,
            String htmlContent,
            String attachmentName,
            byte[] attachmentBytes
    ) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        if (!isLiveSmtpConfigured()) {
            recordDispatchLog(to, subject, timestamp, "EMAIL_SERVER_SANDBOX", "SENT_SANDBOX");
            log.info("[Email Server Sandbox] Dispatched email -> To: {} | Subject: {}", to, subject);
            return new EmailDispatchResult(true, "EMAIL_SERVER_SANDBOX", to, subject, timestamp, null);
        }

        try {
            sendMimeMessage(to, subject, htmlContent, attachmentName, attachmentBytes);
            recordDispatchLog(to, subject, timestamp, "SMTP_LIVE", "SENT_LIVE");
            log.info("Email sent successfully via SMTP_LIVE to: {}", to);
            return new EmailDispatchResult(true, "SMTP_LIVE", to, subject, timestamp, null);
        } catch (Exception e) {
            String err = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            recordDispatchLog(to, subject, timestamp, "SMTP_FAILED", err);
            log.error("Failed to send email to {}: {}", to, err);
            return new EmailDispatchResult(false, "SMTP_FAILED", to, subject, timestamp, err);
        }
    }

    private void sendMimeMessage(
            String to,
            String subject,
            String htmlContent,
            String attachmentName,
            byte[] attachmentBytes
    ) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                message,
                attachmentBytes != null && attachmentName != null,
                StandardCharsets.UTF_8.name()
        );

        helper.setFrom(senderEmail, "HMCPS - Hải Minh Payroll");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        if (attachmentBytes != null && attachmentName != null) {
            helper.addAttachment(attachmentName, new ByteArrayResource(attachmentBytes));
        }

        mailSender.send(message);
    }

    private void recordDispatchLog(String to, String subject, String timestamp, String channel, String status) {
        Map<String, String> entry = new LinkedHashMap<>();
        entry.put("to", to != null ? to : "");
        entry.put("subject", subject != null ? subject : "");
        entry.put("timestamp", timestamp);
        entry.put("channel", channel);
        entry.put("status", status != null ? status : "SENT");
        dispatchedLogs.addFirst(entry);
        while (dispatchedLogs.size() > 50) {
            dispatchedLogs.removeLast();
        }
    }
}
