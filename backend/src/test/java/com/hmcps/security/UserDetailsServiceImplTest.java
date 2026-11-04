package com.hmcps.security;

import com.hmcps.entity.Employee;
import com.hmcps.repository.EmployeeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit Test cho UserDetailsServiceImpl (Spring Security Integration)
 */
@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @DisplayName("Load User by Email: Thành công và ánh xạ đúng thông tin UserDetails")
    void testLoadUserByUsername_Success() {
        String email = "trung.tran@haiminh.vn";
        Employee employee = Employee.builder()
                .id(7L)
                .employeeCode("HM-ENG-01")
                .fullName("Trần Văn Trung")
                .email(email)
                .passwordHash("$2a$10$hashed_password_sample")
                .role("SITE_ENGINEER")
                .status("ACTIVE")
                .mustChangePassword(false)
                .build();

        when(employeeRepository.findByEmail(email)).thenReturn(Optional.of(employee));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        assertThat(userDetails).isNotNull();
        assertThat(userDetails.getUsername()).isEqualTo(email);
        assertThat(userDetails.getPassword()).isEqualTo("$2a$10$hashed_password_sample");
        assertThat(userDetails.isEnabled()).isTrue();
        assertThat(userDetails.getAuthorities()).extracting("authority").contains("ROLE_SITE_ENGINEER");
    }

    @Test
    @DisplayName("Load User by Email: Không tìm thấy email -> Ném UsernameNotFoundException")
    void testLoadUserByUsername_NotFound_ThrowsException() {
        String email = "notfound@haiminh.vn";
        when(employeeRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername(email))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("Không tìm thấy người dùng với email: " + email);
    }

    @Test
    @DisplayName("Load User by ID: Thành công và lấy đúng ID của nhân viên")
    void testLoadUserById_Success() {
        Long empId = 7L;
        Employee employee = Employee.builder()
                .id(empId)
                .employeeCode("HM-ENG-01")
                .fullName("Trần Văn Trung")
                .email("trung.tran@haiminh.vn")
                .role("SITE_ENGINEER")
                .status("ACTIVE")
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(employee));

        UserDetails userDetails = userDetailsService.loadUserById(empId);

        assertThat(userDetails).isNotNull();
        UserPrincipal principal = (UserPrincipal) userDetails;
        assertThat(principal.getId()).isEqualTo(empId);
        assertThat(principal.getEmployeeCode()).isEqualTo("HM-ENG-01");
    }

    @Test
    @DisplayName("Load User by ID: ID không tồn tại -> Ném UsernameNotFoundException")
    void testLoadUserById_NotFound_ThrowsException() {
        Long empId = 999L;
        when(employeeRepository.findById(empId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserById(empId))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("Không tìm thấy nhân viên với ID: " + empId);
    }
}
