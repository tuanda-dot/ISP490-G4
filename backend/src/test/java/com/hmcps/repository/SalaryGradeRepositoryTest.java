package com.hmcps.repository;

import com.hmcps.entity.SalaryGrade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test tầng CSDL cho SalaryGradeRepository (FE-13 / UC-28)
 * Kiểm tra các truy vấn JPA: tìm theo mã bậc, lọc theo loại nhân sự và sắp xếp theo level.
 */
@DataJpaTest
class SalaryGradeRepositoryTest {

    @Autowired
    private SalaryGradeRepository salaryGradeRepository;

    @Test
    @DisplayName("Repository: Lưu và tìm kiếm theo GradeCode")
    void testSaveAndFindByGradeCode() {
        SalaryGrade grade = SalaryGrade.builder()
                .gradeCode("TEST-BAC-1")
                .gradeName("Bậc Thử Nghiệm 1")
                .levelOrder(1)
                .minSalary(new BigDecimal("5310000.00"))
                .maxSalary(new BigDecimal("6310000.00"))
                .standardStep(new BigDecimal("1000000.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        salaryGradeRepository.save(grade);

        Optional<SalaryGrade> found = salaryGradeRepository.findByGradeCode("TEST-BAC-1");
        assertThat(found).isPresent();
        assertThat(found.get().getGradeName()).isEqualTo("Bậc Thử Nghiệm 1");
        assertThat(found.get().getMinSalary()).isEqualByComparingTo(new BigDecimal("5310000.00"));
    }

    @Test
    @DisplayName("Repository: Tìm kiếm theo EmployeeType và sắp xếp thứ tự LevelOrder tăng dần")
    void testFindByEmployeeTypeAndIsActiveTrueOrderByLevelOrderAsc() {
        SalaryGrade g2 = SalaryGrade.builder()
                .gradeCode("ENG-BAC-2")
                .gradeName("Bậc 2")
                .levelOrder(2)
                .minSalary(new BigDecimal("6310000.00"))
                .maxSalary(new BigDecimal("7310000.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        SalaryGrade g1 = SalaryGrade.builder()
                .gradeCode("ENG-BAC-1")
                .gradeName("Bậc 1")
                .levelOrder(1)
                .minSalary(new BigDecimal("5310000.00"))
                .maxSalary(new BigDecimal("6310000.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        SalaryGrade gOffice = SalaryGrade.builder()
                .gradeCode("OFF-BAC-1")
                .gradeName("Bậc Văn Phòng")
                .levelOrder(1)
                .minSalary(new BigDecimal("7000000.00"))
                .maxSalary(new BigDecimal("8000000.00"))
                .employeeType("OFFICE_STAFF")
                .isActive(true)
                .build();

        salaryGradeRepository.save(g2);
        salaryGradeRepository.save(g1);
        salaryGradeRepository.save(gOffice);

        List<SalaryGrade> engineers = salaryGradeRepository
                .findByEmployeeTypeAndIsActiveTrueOrderByLevelOrderAsc("SITE_ENGINEER");

        assertThat(engineers).hasSize(2);
        assertThat(engineers.get(0).getGradeCode()).isEqualTo("ENG-BAC-1");
        assertThat(engineers.get(1).getGradeCode()).isEqualTo("ENG-BAC-2");
    }
}
