package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.entity.ComplianceRule;
import com.hmcps.repository.ComplianceRuleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit Test cho ComplianceService (FE-13 / UC-28)
 * Kiểm tra các hằng số pháp lý Việt Nam và cơ chế fallback về LaborLawConstants.
 */
@ExtendWith(MockitoExtension.class)
class ComplianceServiceTest {

    @Mock
    private ComplianceRuleRepository complianceRuleRepository;

    @InjectMocks
    private ComplianceService complianceService;

    @Test
    @DisplayName("BHXH Cap: Trả về giá trị từ CSDL khi có cấu hình")
    void testGetBhxhCap_FromDatabase() {
        BigDecimal customCap = new BigDecimal("50000000");
        ComplianceRule rule = ComplianceRule.builder()
                .ruleKey("BHXH_CAP")
                .ruleValue(customCap)
                .isActive(true)
                .build();

        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("BHXH_CAP")).thenReturn(Optional.of(rule));

        BigDecimal result = complianceService.getBhxhCap();
        assertThat(result).isEqualByComparingTo(customCap);
    }

    @Test
    @DisplayName("BHXH Cap: Fallback về 46.800.000đ (20 x Lương cơ sở) khi không có cấu hình CSDL")
    void testGetBhxhCap_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("BHXH_CAP")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getBhxhCap();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.CAP_BHXH_BHYT);
        assertThat(result).isEqualByComparingTo(new BigDecimal("46800000"));
    }

    @Test
    @DisplayName("BHTN Cap: Fallback về 106.200.000đ (20 x Lương tối thiểu Vùng I 5.31M)")
    void testGetBhtnCap_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("BHTN_CAP")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getBhtnCap();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.CAP_BHTN);
        assertThat(result).isEqualByComparingTo(new BigDecimal("106200000"));
    }

    @Test
    @DisplayName("Lương tối thiểu vùng: Fallback về 5.310.000đ (Vùng I)")
    void testGetRegionalMinWage_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("MIN_WAGE")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getRegionalMinWage();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.REGIONAL_MIN_WAGE_VUNG_1);
    }

    @Test
    @DisplayName("Giảm trừ gia cảnh bản thân: 11.000.000đ")
    void testGetPersonalDeduction_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("PERSONAL_DEDUCTION")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getPersonalDeduction();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.PERSONAL_DEDUCTION);
        assertThat(result).isEqualByComparingTo(new BigDecimal("11000000"));
    }

    @Test
    @DisplayName("Giảm trừ người phụ thuộc: 4.400.000đ/người/tháng")
    void testGetDependentDeduction_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("DEPENDENT_DEDUCTION")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getDependentDeduction();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.DEPENDENT_DEDUCTION);
        assertThat(result).isEqualByComparingTo(new BigDecimal("4400000"));
    }

    @Test
    @DisplayName("Trần miễn thuế tiền ăn ca: 730.000đ/tháng")
    void testGetMealExemptThreshold_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("MEAL_EXEMPT_THRESHOLD")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getMealExemptThreshold();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.MEAL_EXEMPT_THRESHOLD_MONTHLY);
        assertThat(result).isEqualByComparingTo(new BigDecimal("730000"));
    }

    @Test
    @DisplayName("Trần đoàn phí công đoàn: 234.000đ (10% Lương cơ sở 2.34M)")
    void testGetUnionDuesCap_FallbackToDefault() {
        when(complianceRuleRepository.findByRuleKeyAndIsActiveTrue("UNION_DUES_CAP")).thenReturn(Optional.empty());

        BigDecimal result = complianceService.getUnionDuesCap();
        assertThat(result).isEqualByComparingTo(LaborLawConstants.CAP_UNION_DUES);
        assertThat(result).isEqualByComparingTo(new BigDecimal("234000"));
    }
}
