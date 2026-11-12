package com.hmcps.service;

import com.hmcps.common.dto.ForceChangePasswordRequest;
import com.hmcps.common.dto.ForgotPasswordRequest;
import com.hmcps.common.dto.LoginRequest;
import com.hmcps.common.dto.LoginResponse;
import com.hmcps.common.dto.ResetPasswordRequest;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.common.exception.InactiveContractException;
import com.hmcps.entity.Employee;
import com.hmcps.entity.PasswordResetToken;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.PasswordResetTokenRepository;
import com.hmcps.security.JwtTokenProvider;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.integration.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        // 1. Xác thực Email
        Employee employee = employeeRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Email hoặc mật khẩu không chính xác."));

        // 2. Xác thực Mật khẩu
        if (employee.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), employee.getPasswordHash())) {
            log.warn("Failed login attempt for email: {}", request.getEmail());
            throw new BadCredentialsException("Email hoặc mật khẩu không chính xác.");
        }

        // 3. Kiểm tra trạng thái tài khoản
        if (!"ACTIVE".equalsIgnoreCase(employee.getStatus())) {
            throw new BusinessException("Tài khoản đã bị tạm khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên.");
        }

        // 4. RÀNG BUỘC CỐT LÕI: Hợp đồng lao động hợp lệ và còn hiệu lực
        boolean hasActiveContract = contractRepository.existsActiveContract(
                employee.getId(),
                ContractStatus.ACTIVE,
                LocalDate.now()
        );

        if (!hasActiveContract) {
            log.warn("Login blocked: Employee {} ({}) does not have an active labor contract.", employee.getId(), employee.getEmail());
            throw new InactiveContractException(
                    "Tài khoản chưa thể đăng nhập do chưa có Hợp đồng lao động có hiệu lực với doanh nghiệp hoặc Hợp đồng đã hết hạn. Vui lòng liên hệ HR Manager / Phòng Nhân sự để được hỗ trợ."
            );
        }

        UserPrincipal principal = UserPrincipal.create(employee);

        // 5. RÀNG BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU (Mandatory First-Time Password Change)
        if (Boolean.TRUE.equals(employee.getMustChangePassword())) {
            log.info("Employee {} logged in for first time - issuing PreAuth token", employee.getEmail());
            String preAuthToken = tokenProvider.generatePreAuthToken(principal);

            return LoginResponse.builder()
                    .accessToken(preAuthToken)
                    .tokenType("PreAuth")
                    .mustChangePassword(true)
                    .employeeId(employee.getId())
                    .employeeCode(employee.getEmployeeCode())
                    .fullName(employee.getFullName())
                    .email(employee.getEmail())
                    .role(normalizeRoleForFrontend(principal.getRole()))
                    .message("Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.")
                    .build();
        }

        // 6. Cấp token đầy đủ khi đăng nhập thành công
        String accessToken = tokenProvider.generateAccessToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .mustChangePassword(false)
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .role(normalizeRoleForFrontend(principal.getRole()))
                .message("Đăng nhập thành công.")
                .build();
    }

    private String normalizeRoleForFrontend(String rawRole) {
        if (rawRole == null) return "OFFICE_STAFF";
        String r = rawRole.replace("ROLE_", "").trim();
        switch (r) {
            case "ADMIN":
                return "SYSTEM_ADMIN";
            case "PAYROLL_ACCOUNTANT":
                return "ACCOUNTANT";
            case "HR_OFFICER":
                return "HR_STAFF";
            case "SUPERVISOR":
                return "DIRECTOR";
            default:
                return r;
        }
    }

    @Transactional
    public LoginResponse forceChangePassword(Long employeeId, ForceChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("Xác nhận mật khẩu mới không trùng khớp.");
        }

        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin nhân viên."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), employee.getPasswordHash())) {
            throw new BadCredentialsException("Mật khẩu hiện tại không chính xác.");
        }

        // Cập nhật mật khẩu mới và bỏ cờ bắt buộc đổi mật khẩu
        employee.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        employee.setMustChangePassword(false);
        employeeRepository.save(employee);

        log.info("Password successfully changed for employee: {}", employee.getEmail());

        // Cấp phát chính thức cặp Access Token và Refresh Token đầy đủ quyền
        UserPrincipal principal = UserPrincipal.create(employee);
        String accessToken = tokenProvider.generateAccessToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .mustChangePassword(false)
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .role(normalizeRoleForFrontend(principal.getRole()))
                .message("Đổi mật khẩu thành công. Hệ thống đã kích hoạt toàn quyền truy cập.")
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        Employee employee = employeeRepository.findByEmail(username)
                .orElseThrow(() -> new BadCredentialsException("Không tìm thấy thông tin tài khoản."));

        UserPrincipal principal = UserPrincipal.create(employee);
        String newAccessToken = tokenProvider.generateAccessToken(principal);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .mustChangePassword(Boolean.TRUE.equals(employee.getMustChangePassword()))
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .role(normalizeRoleForFrontend(principal.getRole()))
                .message("Làm mới token thành công.")
                .build();
    }

    @Transactional
    public Map<String, Object> forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        Employee employee = employeeRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản nhân sự với email " + normalizedEmail + "."));

        if (!"ACTIVE".equalsIgnoreCase(employee.getStatus())) {
            throw new BusinessException("Tài khoản đã bị tạm khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên.");
        }

        List<PasswordResetToken> activeTokens = passwordResetTokenRepository.findByEmailIgnoreCaseAndUsedFalse(normalizedEmail);
        if (!activeTokens.isEmpty()) {
            activeTokens.forEach(token -> token.setUsed(true));
            passwordResetTokenRepository.saveAll(activeTokens);
        }

        String otpCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .employeeId(employee.getId())
                .email(normalizedEmail)
                .otpCode(otpCode)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();
        passwordResetTokenRepository.save(resetToken);

        EmailService.EmailDispatchResult dispatch = emailService.sendPasswordResetOtpEmailWithResult(
                normalizedEmail,
                employee.getFullName(),
                otpCode
        );
        if (!dispatch.success()) {
            throw new BusinessException(
                    "Không thể gửi email OTP qua SMTP (" + dispatch.errorMessage() + "). Vui lòng kiểm tra cấu hình MAIL_USERNAME/MAIL_PASSWORD."
            );
        }

        boolean isSandbox = "EMAIL_SERVER_SANDBOX".equals(dispatch.channel());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", normalizedEmail);
        payload.put("channel", dispatch.channel());
        payload.put("expiresInMinutes", 5);
        payload.put("message", isSandbox
                ? "Đã tạo mã OTP khôi phục mật khẩu (chế độ Email Server Sandbox vì chưa cấu hình MAIL_PASSWORD SMTP)."
                : "Đã gửi mã xác thực OTP 6 chữ số tới email " + normalizedEmail + ". Vui lòng kiểm tra hộp thư (hiệu lực 05 phút).");
        if (isSandbox) {
            payload.put("devOtpPreview", otpCode);
        }
        return payload;
    }

    @Transactional
    public Map<String, Object> resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("Xác nhận mật khẩu mới không trùng khớp.");
        }

        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String normalizedOtp = request.getOtpCode() != null ? request.getOtpCode().trim() : "";

        PasswordResetToken token = passwordResetTokenRepository
                .findTopByEmailIgnoreCaseAndOtpCodeAndUsedFalseOrderByCreatedAtDesc(normalizedEmail, normalizedOtp)
                .orElseThrow(() -> new BusinessException("Mã OTP không chính xác hoặc đã được sử dụng."));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            token.setUsed(true);
            passwordResetTokenRepository.save(token);
            throw new BusinessException("Mã OTP đã hết hạn (quá 05 phút). Vui lòng yêu cầu gửi lại mã mới.");
        }

        Employee employee = employeeRepository.findById(token.getEmployeeId())
                .or(() -> employeeRepository.findByEmail(normalizedEmail))
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin tài khoản nhân sự."));

        employee.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        employee.setMustChangePassword(false);
        employeeRepository.save(employee);

        token.setUsed(true);
        passwordResetTokenRepository.save(token);

        log.info("Password reset completed via email OTP for {}", normalizedEmail);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", normalizedEmail);
        payload.put("message", "Đặt lại mật khẩu thành công. Anh/Chị có thể đăng nhập bằng mật khẩu mới ngay bây giờ.");
        return payload;
    }
}
