package com.hmcps.repository;

import com.hmcps.entity.ComplianceRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface ComplianceRuleRepository extends JpaRepository<ComplianceRule, Long> {
    Optional<ComplianceRule> findByRuleKeyAndIsActiveTrue(String ruleKey);
    List<ComplianceRule> findByIsActiveTrue();
}
