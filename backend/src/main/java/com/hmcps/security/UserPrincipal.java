package com.hmcps.security;

import com.hmcps.entity.Employee;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Getter
@AllArgsConstructor
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String employeeCode;
    private final String email;
    private final String password;
    private final String fullName;
    private final String role;
    private final boolean mustChangePassword;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(Employee employee) {
        String roleName = employee.getRole() != null ? employee.getRole() : "ROLE_OFFICE_STAFF";
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }

        return new UserPrincipal(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getEmail(),
                employee.getPasswordHash() != null ? employee.getPasswordHash() : "",
                employee.getFullName(),
                roleName,
                Boolean.TRUE.equals(employee.getMustChangePassword()),
                "ACTIVE".equalsIgnoreCase(employee.getStatus()),
                Collections.singletonList(new SimpleGrantedAuthority(roleName))
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
