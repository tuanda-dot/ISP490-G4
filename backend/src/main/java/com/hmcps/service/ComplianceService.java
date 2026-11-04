package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.repository.ComplianceRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ComplianceService {

    private final ComplianceRuleRepository complianceRuleRepository;

    public BigDecimal getBhxhCap() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("BHXH_CAP")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.CAP_BHXH_BHYT);
    }

    public BigDecimal getBhtnCap() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("BHTN_CAP")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.CAP_BHTN);
    }

    public BigDecimal getRegionalMinWage() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("MIN_WAGE")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.REGIONAL_MIN_WAGE_VUNG_1);
    }

    public BigDecimal getPersonalDeduction() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("PERSONAL_DEDUCTION")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.PERSONAL_DEDUCTION);
    }

    public BigDecimal getDependentDeduction() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("DEPENDENT_DEDUCTION")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.DEPENDENT_DEDUCTION);
    }

    public BigDecimal getMealExemptThreshold() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("MEAL_EXEMPT_THRESHOLD")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.MEAL_EXEMPT_THRESHOLD_MONTHLY);
    }

    public BigDecimal getUnionDuesCap() {
        return complianceRuleRepository.findByRuleKeyAndIsActiveTrue("UNION_DUES_CAP")
                .map(r -> r.getRuleValue())
                .orElse(LaborLawConstants.CAP_UNION_DUES);
    }
}
