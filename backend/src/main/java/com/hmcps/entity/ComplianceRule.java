package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String ruleKey; // REFERENCE_AMOUNT, BHXH_CAP, BHTN_CAP, MIN_WAGE, PERSONAL_DEDUCTION, DEPENDENT_DEDUCTION, MEAL_EXEMPT_THRESHOLD

    @Column(precision = 15, scale = 4, nullable = false)
    private BigDecimal ruleValue;

    @Column(nullable = false)
    private LocalDate effectiveDate;

    private String description;
    private String legalReference; // Số hiệu nghị định, thông tư (vd: NĐ 158/2025/NĐ-CP)

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
