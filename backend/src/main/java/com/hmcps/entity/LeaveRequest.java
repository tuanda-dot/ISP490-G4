package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "leave_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false, length = 30)
    private String leaveType; // ANNUAL, SICK, COMPENSATORY, UNPAID, MATERNITY

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(precision = 4, scale = 2, nullable = false)
    private BigDecimal daysCount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String siteManagerApproval = "PENDING"; // PENDING, APPROVED, REJECTED, NOT_REQUIRED

    private Long siteManagerId;

    private LocalDateTime siteManagerApprovedAt;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String hrApproval = "PENDING"; // PENDING, APPROVED, REJECTED

    private Long hrManagerId;

    private LocalDateTime hrApprovedAt;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING_SM"; // PENDING_SM, PENDING_HR, APPROVED, REJECTED, CANCELLED

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
