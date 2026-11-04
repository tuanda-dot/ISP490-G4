package com.hmcps.service;

import com.hmcps.common.dto.ForceChangePasswordRequest;
import com.hmcps.common.dto.LoginRequest;
import com.hmcps.common.dto.LoginResponse;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.common.exception.InactiveContractException;
import com.hmcps.entity.Employee;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.security.JwtTokenProvider;
import com.hmcps.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // 1. Xác thực Email
        Employee employee = employeeRepository.findByEmail(request.getEmail())
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
}
