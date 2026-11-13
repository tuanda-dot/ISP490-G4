package com.hmcps.controller;

import com.hmcps.common.dto.ApiResponse;
import com.hmcps.common.dto.ForceChangePasswordRequest;
import com.hmcps.common.dto.ForgotPasswordRequest;
import com.hmcps.common.dto.LoginRequest;
import com.hmcps.common.dto.LoginResponse;
import com.hmcps.common.dto.ResetPasswordRequest;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit Test cho AuthController (FE-01: UC-01, UC-02)
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    @DisplayName("Login: Đăng nhập thành công trả về token và thông tin người dùng")
    void testLogin_Success() {
        LoginRequest req = new LoginRequest();
        req.setEmail("an.nguyen@haiminh.vn");
        req.setPassword("Password@123");

        LoginResponse loginResp = LoginResponse.builder()
                .accessToken("sample.access.token")
                .refreshToken("sample.refresh.token")
                .tokenType("Bearer")
                .message("Đăng nhập thành công")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(loginResp);

        ResponseEntity<ApiResponse<LoginResponse>> response = authController.login(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getAccessToken()).isEqualTo("sample.access.token");
        assertThat(response.getBody().getData().getTokenType()).isEqualTo("Bearer");
    }

    @Test
    @DisplayName("Force Change Password: Đổi mật khẩu lần đầu thành công")
    void testForceChangePassword_Success() {
        UserPrincipal principal = new UserPrincipal(
                1L, "HM-001", "an.nguyen@haiminh.vn", "hash", "Nguyễn Văn An", "ROLE_ADMIN", false, true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        ForceChangePasswordRequest req = new ForceChangePasswordRequest();
        req.setCurrentPassword("Password@123");
        req.setNewPassword("NewSecurePassword@2026");
        req.setConfirmPassword("NewSecurePassword@2026");

        LoginResponse loginResp = LoginResponse.builder()
                .accessToken("new.full.token")
                .tokenType("Bearer")
                .message("Đổi mật khẩu thành công")
                .build();

        when(authService.forceChangePassword(eq(1L), any(ForceChangePasswordRequest.class))).thenReturn(loginResp);

        ResponseEntity<ApiResponse<LoginResponse>> response = authController.forceChangePassword(principal, req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getAccessToken()).isEqualTo("new.full.token");
    }

    @Test
    @DisplayName("Refresh Token: Làm mới phiên đăng nhập thành công")
    void testRefreshToken_Success() {
        String refreshToken = "sample.valid.refresh.token";

        LoginResponse loginResp = LoginResponse.builder()
                .accessToken("new.access.token")
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .message("Làm mới token thành công")
                .build();

        when(authService.refreshToken(refreshToken)).thenReturn(loginResp);

        ResponseEntity<ApiResponse<LoginResponse>> response = authController.refreshToken(refreshToken);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getAccessToken()).isEqualTo("new.access.token");
    }

    @Test
    @DisplayName("Current User: Lấy thông tin tài khoản hiện tại từ UserPrincipal")
    void testGetCurrentUser_Success() {
        UserPrincipal principal = new UserPrincipal(
                5L, "HM-KT-01", "ketoan@haiminh.vn", "hash", "Trần Kế Toán", "ROLE_ACCOUNTANT", false, true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNTANT"))
        );

        ResponseEntity<ApiResponse<UserPrincipal>> response = authController.getCurrentUser(principal);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getEmail()).isEqualTo("ketoan@haiminh.vn");
        assertThat(response.getBody().getData().getEmployeeCode()).isEqualTo("HM-KT-01");
    }

    @Test
    @DisplayName("Forgot Password: Gửi OTP khôi phục mật khẩu qua email thành công")
    void testForgotPassword_Success() {
        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("ketoan.lan@haiminh.vn");

        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(Map.of(
                        "email", "ketoan.lan@haiminh.vn",
                        "channel", "EMAIL_SERVER_SANDBOX",
                        "expiresInMinutes", 5,
                        "message", "Đã tạo mã OTP khôi phục mật khẩu"
                ));

        ResponseEntity<ApiResponse<Map<String, Object>>> response = authController.forgotPassword(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().get("email")).isEqualTo("ketoan.lan@haiminh.vn");
    }

    @Test
    @DisplayName("Reset Password: Xác nhận OTP và đặt lại mật khẩu mới thành công")
    void testResetPassword_Success() {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setEmail("ketoan.lan@haiminh.vn");
        req.setOtpCode("123456");
        req.setNewPassword("NewPass@2026");
        req.setConfirmPassword("NewPass@2026");

        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(Map.of(
                        "email", "ketoan.lan@haiminh.vn",
                        "message", "Đặt lại mật khẩu thành công."
                ));

        ResponseEntity<ApiResponse<Map<String, Object>>> response = authController.resetPassword(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().get("email")).isEqualTo("ketoan.lan@haiminh.vn");
    }
}
