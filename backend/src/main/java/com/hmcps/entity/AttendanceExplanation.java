package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_explanations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceExplanation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    private Long projectId;

    @Column(nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false, length = 50)
    private String explanationType; // MISSING_CHECKIN, DEVICE_ERROR, GPS_DRIFT, ACCIDENTAL_PUNCH

    @Column(length = 10)
    private String suggestedCheckIn;

    @Column(length = 10)
    private String suggestedCheckOut;

    @Column(precision = 4, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal actualHours = BigDecimal.valueOf(8.00);

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String evidenceUrl;

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
