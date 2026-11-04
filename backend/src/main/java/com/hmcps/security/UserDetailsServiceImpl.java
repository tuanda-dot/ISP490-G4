package com.hmcps.security;

import com.hmcps.entity.Employee;
import com.hmcps.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng với email: " + email));
        return UserPrincipal.create(employee);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy nhân viên với ID: " + id));
        return UserPrincipal.create(employee);
    }
}
