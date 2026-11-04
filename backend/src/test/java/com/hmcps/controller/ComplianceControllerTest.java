package com.hmcps.controller;

import com.hmcps.entity.ComplianceRule;
import com.hmcps.entity.SalaryComponent;
import com.hmcps.entity.SalaryGrade;
import com.hmcps.repository.ComplianceRuleRepository;
import com.hmcps.repository.SalaryComponentRepository;
import com.hmcps.repository.SalaryGradeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test cho ComplianceController (FE-13: UC-28, FE-08: UC-18, UC-19)
 * Kiểm thử quản lý Thang bảng lương 9 bậc chuẩn ngành xây dựng và danh mục phụ cấp động.
 */
@ExtendWith(MockitoExtension.class)
class ComplianceControllerTest {

    @Mock
    private ComplianceRuleRepository complianceRuleRepository;

    @Mock
    private SalaryComponentRepository salaryComponentRepository;

    @Mock
    private SalaryGradeRepository salaryGradeRepository;

    @InjectMocks
    private ComplianceController complianceController;

    @Test
    @DisplayName("Thang bảng lương: Lấy toàn bộ 9 bậc lương ngành xây dựng có hiệu lực")
    void testGetSalaryGrades_AllActive() {
        SalaryGrade grade1 = SalaryGrade.builder()
                .id(1L)
                .gradeCode("XD-BAC-1")
                .gradeName("Bậc 1 - Kỹ sư tập sự")
                .levelOrder(1)
                .minSalary(new BigDecimal("5310000.00"))
                .maxSalary(new BigDecimal("6310000.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        SalaryGrade grade9 = SalaryGrade.builder()
                .id(9L)
                .gradeCode("XD-BAC-9")
                .gradeName("Bậc 9 - Giám đốc dự án / Tổng công trình sư")
                .levelOrder(9)
                .minSalary(new BigDecimal("14761800.00"))
                .maxSalary(new BigDecimal("16000000.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        when(salaryGradeRepository.findByIsActiveTrueOrderByLevelOrderAsc())
                .thenReturn(Arrays.asList(grade1, grade9));

        ResponseEntity<List<SalaryGrade>> response = complianceController.getSalaryGrades(null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).getGradeCode()).isEqualTo("XD-BAC-1");
        assertThat(response.getBody().get(1).getGradeCode()).isEqualTo("XD-BAC-9");
    }

    @Test
    @DisplayName("Thang bảng lương: Lọc theo phân loại nhân viên SITE_ENGINEER")
    void testGetSalaryGrades_FilterByEmployeeType() {
        SalaryGrade grade = SalaryGrade.builder()
                .id(2L)
                .gradeCode("XD-BAC-2")
                .gradeName("Bậc 2 - Kỹ sư hiện trường")
                .levelOrder(2)
                .minSalary(new BigDecimal("6265800.00"))
                .maxSalary(new BigDecimal("7265800.00"))
                .employeeType("SITE_ENGINEER")
                .isActive(true)
                .build();

        when(salaryGradeRepository.findByEmployeeTypeAndIsActiveTrueOrderByLevelOrderAsc("SITE_ENGINEER"))
                .thenReturn(List.of(grade));

        ResponseEntity<List<SalaryGrade>> response = complianceController.getSalaryGrades("SITE_ENGINEER");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getEmployeeType()).isEqualTo("SITE_ENGINEER");
    }

    @Test
    @DisplayName("Thang bảng lương: Thêm mới hoặc cập nhật bậc lương thành công")
    void testSaveSalaryGrade() {
        SalaryGrade newGrade = SalaryGrade.builder()
                .gradeCode("VP-BAC-1")
                .gradeName("Bậc 1 - Chuyên viên Văn phòng")
                .levelOrder(1)
                .minSalary(new BigDecimal("6000000.00"))
                .maxSalary(new BigDecimal("7000000.00"))
                .employeeType("OFFICE_STAFF")
                .isActive(true)
                .build();

        when(salaryGradeRepository.save(any(SalaryGrade.class))).thenAnswer(i -> {
            SalaryGrade g = i.getArgument(0);
            g.setId(10L);
            return g;
        });

        ResponseEntity<SalaryGrade> response = complianceController.saveSalaryGrade(newGrade);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(10L);
        assertThat(response.getBody().getGradeCode()).isEqualTo("VP-BAC-1");
        verify(salaryGradeRepository, times(1)).save(newGrade);
    }

    @Test
    @DisplayName("Tham số pháp lý: Lấy danh sách quy định tuân thủ đang có hiệu lực")
    void testGetActiveRules() {
        ComplianceRule rule = ComplianceRule.builder()
                .id(1L)
                .ruleKey("CAP_BHXH_BHYT")
                .ruleValue(new BigDecimal("46800000.00"))
                .description("Trần đóng BHXH/BHYT 20 lần lương cơ sở")
                .isActive(true)
                .build();

        when(complianceRuleRepository.findByIsActiveTrue()).thenReturn(List.of(rule));

        ResponseEntity<List<ComplianceRule>> response = complianceController.getActiveRules();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getRuleKey()).isEqualTo("CAP_BHXH_BHYT");
    }

    @Test
    @DisplayName("Phụ cấp động: Tạo mới cấu hình phụ cấp đặc thù công trường")
    void testCreateSalaryComponent() {
        SalaryComponent component = SalaryComponent.builder()
                .code("PC_HAM_SAU")
                .name("Phụ cấp thi công hầm sâu móng cọc")
                .componentType("ALLOWANCE")
                .isTaxable(true)
                .isInsuranceBase(false)
                .build();

        when(salaryComponentRepository.save(any(SalaryComponent.class))).thenAnswer(i -> {
            SalaryComponent c = i.getArgument(0);
            c.setId(100L);
            return c;
        });

        ResponseEntity<SalaryComponent> response = complianceController.createSalaryComponent(component);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(100L);
        assertThat(response.getBody().getCode()).isEqualTo("PC_HAM_SAU");
    }
}
