package com.hmcps.repository;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Employee;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration Test tầng CSDL cho EmployeeRepository (FE-01, FE-03: UC-01, UC-06)
 * Kiểm tra các ràng buộc toàn vẹn CSDL (Unique Constraint, Nullable) và các câu query JPA.
 */
@DataJpaTest
class EmployeeRepositoryJpaTest {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Ràng buộc duy nhất: Trùng employeeCode phải ném DataIntegrityViolationException")
    void testUniqueConstraint_DuplicateEmployeeCode_ThrowsException() {
        Employee emp1 = Employee.builder()
                .employeeCode("HM-DUP-01")
                .fullName("Nhân Viên A")
                .email("nva@haiminh.vn")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .build();
        entityManager.persistAndFlush(emp1);

        Employee emp2 = Employee.builder()
                .employeeCode("HM-DUP-01") // Trùng employeeCode
                .fullName("Nhân Viên B")
                .email("nvb@haiminh.vn")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        assertThatThrownBy(() -> {
            employeeRepository.saveAndFlush(emp2);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Ràng buộc duy nhất: Trùng email phải ném DataIntegrityViolationException")
    void testUniqueConstraint_DuplicateEmail_ThrowsException() {
        Employee emp1 = Employee.builder()
                .employeeCode("HM-EMAIL-01")
                .fullName("Nhân Viên 1")
                .email("same.email@haiminh.vn")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .build();
        entityManager.persistAndFlush(emp1);

        Employee emp2 = Employee.builder()
                .employeeCode("HM-EMAIL-02")
                .fullName("Nhân Viên 2")
                .email("same.email@haiminh.vn") // Trùng email
                .employeeType(EmployeeType.OFFICE_STAFF)
                .build();

        assertThatThrownBy(() -> {
            employeeRepository.saveAndFlush(emp2);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Query: Tìm kiếm nhân viên theo Email phục vụ xác thực người dùng")
    void testFindByEmail_Success() {
        String email = "trung.ks@haiminh.vn";
        Employee emp = Employee.builder()
                .employeeCode("HM-KS-10")
                .fullName("Kỹ Sư Trưởng")
                .email(email)
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();
        employeeRepository.save(emp);

        Optional<Employee> found = employeeRepository.findByEmail(email);
        assertThat(found).isPresent();
        assertThat(found.get().getFullName()).isEqualTo("Kỹ Sư Trưởng");
        assertThat(found.get().getEmployeeCode()).isEqualTo("HM-KS-10");
    }

    @Test
    @DisplayName("Query: Tìm kiếm danh sách nhân viên theo phòng ban (DepartmentId)")
    void testFindByDepartmentId() {
        Long deptHr = 2L;
        Long deptTech = 3L;

        Employee e1 = Employee.builder()
                .employeeCode("HR-01")
                .fullName("Chuyên Viên HR")
                .email("hr01@haiminh.vn")
                .departmentId(deptHr)
                .employeeType(EmployeeType.OFFICE_STAFF)
                .build();

        Employee e2 = Employee.builder()
                .employeeCode("TECH-01")
                .fullName("Kỹ Sư Kết Cấu")
                .email("tech01@haiminh.vn")
                .departmentId(deptTech)
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        employeeRepository.save(e1);
        employeeRepository.save(e2);

        List<Employee> hrStaff = employeeRepository.findByDepartmentId(deptHr);
        assertThat(hrStaff).hasSize(1);
        assertThat(hrStaff.get(0).getEmployeeCode()).isEqualTo("HR-01");
    }
}
