package com.hmcps.service;

import com.hmcps.common.dto.ForceChangePasswordRequest;
import com.hmcps.common.dto.LoginRequest;
import com.hmcps.common.dto.LoginResponse;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.common.exception.InactiveContractException;
import com.hmcps.entity.Employee;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @InjectMocks
    private AuthService authService;

    private Employee mockEmployee;

    @BeforeEach
    void setUp() {
        mockEmployee = Employee.builder()
                .id(1L)
                .employeeCode("NV-HM-001")
                .fullName("Nguyễn Văn An")
                .email("an.nguyen@haiminh.vn")
                .passwordHash("$2a$12$e8F1ZzD9f7l8N1wXyZaBkeO0q4WvS0h6KjL3u.exampleHash")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .role("ROLE_HR_MANAGER")
                .status("ACTIVE")
                .mustChangePassword(false)
                .build();
    }

    @Test
    @DisplayName("Đăng nhập thành công khi có Hợp đồng lao động ACTIVE còn hiệu lực")
    void testLogin_Success_WithActiveContract() {
        LoginRequest req = LoginRequest.builder()
                .email("an.nguyen@haiminh.vn")
                .password("Password@123")
                .build();

        when(employeeRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(mockEmployee));
        when(passwordEncoder.matches(req.getPassword(), mockEmployee.getPasswordHash())).thenReturn(true);
        when(contractRepository.existsActiveContract(eq(1L), eq(ContractStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(true);
        when(tokenProvider.generateAccessToken(any())).thenReturn("mock-access-token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("mock-refresh-token");

        LoginResponse res = authService.login(req);

        assertThat(res).isNotNull();
        assertThat(res.getAccessToken()).isEqualTo("mock-access-token");
        assertThat(res.getTokenType()).isEqualTo("Bearer");
        assertThat(res.isMustChangePassword()).isFalse();
        assertThat(res.getFullName()).isEqualTo("Nguyễn Văn An");
    }

    @Test
    @DisplayName("Chặn đăng nhập (HTTP 403) khi KHÔNG có Hợp đồng lao động ACTIVE (Ràng buộc cốt lõi HMCPS)")
    void testLogin_Blocked_WhenNoActiveContract() {
        LoginRequest req = LoginRequest.builder()
                .email("an.nguyen@haiminh.vn")
                .password("Password@123")
                .build();

        when(employeeRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(mockEmployee));
        when(passwordEncoder.matches(req.getPassword(), mockEmployee.getPasswordHash())).thenReturn(true);
        // Không có hợp đồng còn hiệu lực
        when(contractRepository.existsActiveContract(eq(1L), eq(ContractStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(InactiveContractException.class)
                .hasMessageContaining("chưa có Hợp đồng lao động có hiệu lực");

        verify(tokenProvider, never()).generateAccessToken(any());
    }

    @Test
    @DisplayName("Lần đầu đăng nhập: Phải cấp PreAuth Token và cờ mustChangePassword = true")
    void testLogin_FirstTime_ReturnsPreAuthToken() {
        mockEmployee.setMustChangePassword(true);

        LoginRequest req = LoginRequest.builder()
                .email("an.nguyen@haiminh.vn")
                .password("TempPass@123")
                .build();

        when(employeeRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(mockEmployee));
        when(passwordEncoder.matches(req.getPassword(), mockEmployee.getPasswordHash())).thenReturn(true);
        when(contractRepository.existsActiveContract(eq(1L), eq(ContractStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(true);
        when(tokenProvider.generatePreAuthToken(any())).thenReturn("mock-pre-auth-token");

        LoginResponse res = authService.login(req);

        assertThat(res).isNotNull();
        assertThat(res.getAccessToken()).isEqualTo("mock-pre-auth-token");
        assertThat(res.getTokenType()).isEqualTo("PreAuth");
        assertThat(res.isMustChangePassword()).isTrue();
        assertThat(res.getMessage()).contains("Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên");
    }

    @Test
    @DisplayName("Đổi mật khẩu lần đầu: Cập nhật CSDL, bỏ cờ mustChangePassword và cấp token chính thức")
    void testForceChangePassword_Success() {
        mockEmployee.setMustChangePassword(true);

        ForceChangePasswordRequest req = ForceChangePasswordRequest.builder()
                .currentPassword("TempPass@123")
                .newPassword("NewSecurePassword@2026")
                .confirmPassword("NewSecurePassword@2026")
                .build();

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(passwordEncoder.matches(req.getCurrentPassword(), mockEmployee.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.encode(req.getNewPassword())).thenReturn("new-hashed-password");
        when(tokenProvider.generateAccessToken(any())).thenReturn("new-full-access-token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("new-refresh-token");

        LoginResponse res = authService.forceChangePassword(1L, req);

        assertThat(res.getAccessToken()).isEqualTo("new-full-access-token");
        assertThat(res.getTokenType()).isEqualTo("Bearer");
        assertThat(res.isMustChangePassword()).isFalse();
        assertThat(mockEmployee.getMustChangePassword()).isFalse();
        assertThat(mockEmployee.getPasswordHash()).isEqualTo("new-hashed-password");
        verify(employeeRepository).save(mockEmployee);
    }

    @Test
    @DisplayName("Đổi mật khẩu lần đầu: Từ chối nếu mật khẩu mới trùng mật khẩu hiện tại")
    void testForceChangePassword_SamePassword_Rejected() {
        ForceChangePasswordRequest req = ForceChangePasswordRequest.builder()
                .currentPassword("TempPass@123")
                .newPassword("TempPass@123")
                .confirmPassword("TempPass@123")
                .build();

        assertThatThrownBy(() -> authService.forceChangePassword(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("không được trùng");
    }
}
