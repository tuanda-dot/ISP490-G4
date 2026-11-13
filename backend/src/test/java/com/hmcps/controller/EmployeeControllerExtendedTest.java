package com.hmcps.controller;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Employee;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test mở rộng cho EmployeeController (FE-03: UC-06, UC-07, UC-08)
 */
@ExtendWith(MockitoExtension.class)
class EmployeeControllerExtendedTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private ContractRepository contractRepository;

    @InjectMocks
    private EmployeeController employeeController;

    @Test
    @DisplayName("Employee: Lọc danh sách nhân viên theo phòng ban")
    void testGetAllEmployees_FilteredByDepartment() {
        Long deptId = 2L;
        Employee emp = Employee.builder()
                .id(1L)
                .fullName("Phạm Thị Nhân Sự")
                .departmentId(deptId)
                .build();

        when(employeeRepository.findByDepartmentId(deptId)).thenReturn(List.of(emp));

        ResponseEntity<List<Employee>> response = employeeController.getAllEmployees(deptId, null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getDepartmentId()).isEqualTo(deptId);
    }

    @Test
    @DisplayName("Employee: Lấy thông tin chi tiết nhân viên theo ID thành công")
    void testGetEmployeeById_Success() {
        Long empId = 5L;
        Employee emp = Employee.builder()
                .id(empId)
                .employeeCode("HM-ENG-05")
                .fullName("Lê Văn Kỹ Sư")
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));

        ResponseEntity<Employee> response = employeeController.getEmployeeById(empId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFullName()).isEqualTo("Lê Văn Kỹ Sư");
    }

    @Test
    @DisplayName("Employee: Lấy nhân viên không tồn tại -> Ném ngoại lệ IllegalArgumentException")
    void testGetEmployeeById_NotFound_ThrowsException() {
        Long empId = 999L;
        when(employeeRepository.findById(empId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> employeeController.getEmployeeById(empId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không tìm thấy nhân viên với ID: 999");
    }

    @Test
    @DisplayName("Employee: Tạo mới hồ sơ nhân sự thành công")
    void testCreateEmployee() {
        Employee newEmp = Employee.builder()
                .employeeCode("HM-ENG-99")
                .fullName("Vũ Hoàng Nam")
                .email("nam.vu@haiminh.vn")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .status("ACTIVE")
                .build();

        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> {
            Employee e = i.getArgument(0);
            e.setId(50L);
            return e;
        });

        ResponseEntity<Employee> response = employeeController.createEmployee(newEmp);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(50L);
        assertThat(response.getBody().getEmployeeCode()).isEqualTo("HM-ENG-99");
        verify(employeeRepository, times(1)).save(newEmp);
    }

    @Test
    @DisplayName("Employee: Cập nhật thông tin nhân viên")
    void testUpdateEmployee() {
        Long empId = 10L;
        Employee existing = Employee.builder()
                .id(empId)
                .fullName("Tên Cũ")
                .phone("0901234567")
                .build();

        Employee updateReq = Employee.builder()
                .fullName("Tên Mới Đã Sửa")
                .phone("0988776655")
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(existing));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<Employee> response = employeeController.updateEmployee(empId, updateReq);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFullName()).isEqualTo("Tên Mới Đã Sửa");
        assertThat(response.getBody().getPhone()).isEqualTo("0988776655");
    }
}
