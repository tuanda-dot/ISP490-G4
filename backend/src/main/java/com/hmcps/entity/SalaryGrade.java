package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "salary_grades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String gradeCode;

    @Column(nullable = false, length = 100)
    private String gradeName;

    @Column(nullable = false, length = 30)
    private String employeeType; // OFFICE_STAFF, SITE_ENGINEER

    @Column(nullable = false)
    @Builder.Default
    private Integer levelOrder = 1;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal minSalary;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal maxSalary;

    @Column(precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal standardStep = BigDecimal.valueOf(1000000.00);

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
