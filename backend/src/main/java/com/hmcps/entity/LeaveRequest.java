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
    private String leaveType; // ANNUAL, SPECIAL_PAID, SICK_SHORT, SICK_LONG, PERSONAL_TRAVEL, COMPENSATORY, BAD_WEATHER, UNPAID

    @Column(length = 20)
    @Builder.Default
    private String halfDaySession = "FULL_DAY"; // FULL_DAY, MORNING (Sáng 0.5), AFTERNOON (Chiều 0.5)

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(precision = 4, scale = 2, nullable = false)
    private BigDecimal daysCount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(length = 255)
    private String attachmentName;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String siteManagerApproval = "PENDING"; // PENDING, APPROVED, REJECTED, NOT_REQUIRED

    private Long siteManagerId;

    private LocalDateTime siteManagerApprovedAt;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String hrApproval = "PENDING"; // PENDING, APPROVED, REJECTED

    private Long hrManagerId;

    private LocalDateTime hrApprovedAt;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING_SM"; // PENDING_SM, PENDING_HR, APPROVED, REJECTED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

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
