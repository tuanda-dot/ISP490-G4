package com.hmcps.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit Test cho JwtTokenProvider (FE-01 / UC-01)
 * Kiểm thử việc sinh token, trích xuất Claims, kiểm tra hạn dùng và tính toàn vẹn chữ ký bảo mật.
 */
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UserPrincipal principal;

    private static final String SECRET = "HaiMinhConstructionPayrollSystemSecretKey2026SecureStringWith256BitsMinimumLength!";
    private static final long ACCESS_EXP = 3600000L;  // 1 giờ
    private static final long REFRESH_EXP = 7200000L; // 2 giờ
    private static final long PRE_AUTH_EXP = 900000L; // 15 phút

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, ACCESS_EXP, REFRESH_EXP, PRE_AUTH_EXP);

        principal = new UserPrincipal(
                10L,
                "HM-HR-01",
                "hr.manager@haiminh.vn",
                "encoded_password",
                "Trần Thị Trưởng Phòng",
                "ROLE_HR_MANAGER",
                false,
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))
        );
    }

    @Test
    @DisplayName("Access Token: Sinh token hợp lệ và giải mã đúng thông tin Username, EmployeeId, Role, Scope")
    void testGenerateAccessToken_Valid() {
        String token = jwtTokenProvider.generateAccessToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("hr.manager@haiminh.vn");
        assertThat(jwtTokenProvider.getEmployeeIdFromToken(token)).isEqualTo(10L);
        assertThat(jwtTokenProvider.getScopeFromToken(token)).isEqualTo(JwtTokenProvider.SCOPE_FULL);
    }

    @Test
    @DisplayName("PreAuth Token: Sinh token tạm thời với scope PRE_AUTH yêu cầu đổi mật khẩu lần đầu")
    void testGeneratePreAuthToken_Valid() {
        String token = jwtTokenProvider.generatePreAuthToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getScopeFromToken(token)).isEqualTo(JwtTokenProvider.SCOPE_PRE_AUTH);
    }

    @Test
    @DisplayName("Refresh Token: Sinh token làm mới phiên đăng nhập thành công")
    void testGenerateRefreshToken_Valid() {
        String token = jwtTokenProvider.generateRefreshToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("hr.manager@haiminh.vn");
    }

    @Test
    @DisplayName("Bảo mật: Token bị sửa đổi nội dung (Tampered) phải bị từ chối validate")
    void testValidateToken_TamperedToken_ReturnsFalse() {
        String token = jwtTokenProvider.generateAccessToken(principal);
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        assertThat(jwtTokenProvider.validateToken(tamperedToken)).isFalse();
    }

    @Test
    @DisplayName("Bảo mật: Token hết hạn (Expired Token) phải bị từ chối validate")
    void testValidateToken_ExpiredToken_ReturnsFalse() throws InterruptedException {
        // Khởi tạo JwtTokenProvider với thời gian hết hạn siêu ngắn (1 ms)
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(SECRET, 1L, 1L, 1L);
        String token = shortLivedProvider.generateAccessToken(principal);

        // Chờ 10ms để token hết hạn
        Thread.sleep(10);

        assertThat(shortLivedProvider.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("Bảo mật: Chuỗi token rỗng hoặc sai cú pháp phải trả về false")
    void testValidateToken_MalformedToken_ReturnsFalse() {
        assertThat(jwtTokenProvider.validateToken("not.a.valid.jwt.token")).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }
}
