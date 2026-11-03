package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "overtime_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false)
    private LocalDate workDate;

    @Column(nullable = false, length = 10)
    private String startTime;

    @Column(nullable = false, length = 10)
    private String endTime;

    @Column(precision = 4, scale = 2, nullable = false)
    private BigDecimal otHours;

    @Column(nullable = false, length = 30)
    private String otType; // WEEKDAY_150, WEEKEND_200, NIGHT_SHIFT_ADDITIONAL, HOLIDAY_300

    @Column(precision = 4, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal multiplier = BigDecimal.valueOf(1.50);

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String siteManagerApproval = "PENDING"; // PENDING, APPROVED, REJECTED

    private Long siteManagerId;

    private LocalDateTime siteManagerApprovedAt;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String hrApproval = "PENDING"; // PENDING, APPROVED, REJECTED

    private Long hrManagerId;

    private LocalDateTime hrApprovedAt;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING_SM"; // PENDING_SM, PENDING_HR, APPROVED, REJECTED

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
