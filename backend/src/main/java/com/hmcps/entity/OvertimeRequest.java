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

    // Người lập đơn (Trưởng phòng / Chỉ huy trưởng theo Phương án B)
    private Long createdById;
    private String createdByName;
    private String createdByRole;

    // Bước 1: Ban Giám Đốc duyệt chủ trương trước khi làm
    @Column(length = 30)
    @Builder.Default
    private String directorApproval = "PENDING"; // PENDING, APPROVED, REJECTED
    private Long directorId;
    private LocalDateTime directorApprovedAt;
    @Builder.Default
    private Boolean budgetOverrideApproved = false;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String siteManagerApproval = "PENDING"; // PENDING, APPROVED, REJECTED, NOT_REQUIRED, CREATED_BY_SM

    private Long siteManagerId;

    private LocalDateTime siteManagerApprovedAt;

    // Bước 2: Hậu kiểm Face ID & Tài chính (HR / Kế toán - SoD)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String hrApproval = "PENDING"; // PENDING, APPROVED, REJECTED

    private Long hrManagerId;

    private LocalDateTime hrApprovedAt;

    private Long reconciledById;
    private String reconciledByName;
    private String reconciledByRole;

    // Đối chiếu Face ID & Dự toán trần ngân sách OT
    @Column(precision = 5, scale = 2)
    private BigDecimal actualFaceIdHours;
    @Column(precision = 5, scale = 2)
    private BigDecimal payableOtHours;
    private String faceIdReconcileStatus; // MATCHED, PARTIAL, MISSING, PENDING_SHIFT
    private String faceIdCheckIn;
    private String faceIdCheckOut;
    @Column(columnDefinition = "TEXT")
    private String faceIdNote;

    @Column(precision = 19, scale = 2)
    private BigDecimal estimatedCost;
    @Column(precision = 19, scale = 2)
    private BigDecimal budgetCapAtCreation;
    @Column(precision = 19, scale = 2)
    private BigDecimal projectedProjectOtCost;
    @Builder.Default
    private Boolean isBudgetOverrun = false;

    @Column(nullable = false, length = 40)
    @Builder.Default
    private String status = "PENDING_DIRECTOR"; // PENDING_DIRECTOR, PENDING_RECONCILIATION, PENDING_SM, PENDING_HR, APPROVED, REJECTED

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
