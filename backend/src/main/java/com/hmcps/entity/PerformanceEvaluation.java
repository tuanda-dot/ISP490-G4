package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Đánh giá xếp loại nhân sự hàng tháng (A / B / C) do Trưởng phòng / Kỹ sư trưởng thực hiện.
 * - Loại A: Tích cực, hiệu quả cao. Đạt 6 tháng liên tiếp Loại A -> tháng thứ 7 đủ điều kiện xét tăng lương hoặc thưởng cố định (tối đa 2 lần/năm).
 * - Loại B: Đạt yêu cầu, giữ nguyên lương.
 * - Loại C: Thái độ / hiệu suất kém -> nhắc nhở hoặc giảm trừ theo quy định.
 */
@Entity
@Table(
    name = "performance_evaluations",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"employeeId", "evalYear", "evalMonth"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false, length = 30)
    private String employeeCode;

    @Column(nullable = false, length = 150)
    private String employeeName;

    private Long departmentId;

    @Column(nullable = false)
    private Long evaluatorId;

    @Column(length = 30)
    private String evaluatorCode;

    @Column(length = 150)
    private String evaluatorName;

    @Column(length = 50)
    private String evaluatorRole;

    @Column(nullable = false)
    private Integer evalYear;

    @Column(nullable = false)
    private Integer evalMonth;

    // Chi tiết ngày công tháng & điểm đánh giá tiêu chí
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal actualWorkDays = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal standardWorkDays = new BigDecimal("22.50");

    @Builder.Default
    private Integer lateEarlyCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer attitudeScore = 9; // Thang điểm 1 - 10

    @Column(nullable = false)
    @Builder.Default
    private Integer performanceScore = 9; // Thang điểm 1 - 10

    @Column(nullable = false, length = 5)
    private String grade; // "A", "B", "C"

    @Column(precision = 5, scale = 4, nullable = false)
    @Builder.Default
    private BigDecimal evaluationPct = BigDecimal.ONE;

    // Theo dõi chuỗi 6 tháng liên tiếp Loại A & quyền lợi tháng thứ 7 (tối đa 2 lần/năm)
    @Builder.Default
    private Integer consecutiveAMonths = 0;

    @Builder.Default
    private Boolean eligibleForSixMonthAReward = false;

    @Column(length = 30)
    @Builder.Default
    private String rewardChoice = "NONE"; // NONE | FIXED_BONUS | SALARY_RAISE

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal rewardBonusAmount = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal salaryRaiseAmount = BigDecimal.ZERO;

    @Builder.Default
    private Boolean salaryRaiseApplied = false;

    @Builder.Default
    private Integer yearlyRewardCountUsed = 0;

    // Xử lý khi Loại C (Nhắc nhở hoặc Giảm trừ theo quy định)
    @com.fasterxml.jackson.annotation.JsonProperty("cActionType")
    @Column(length = 30)
    @Builder.Default
    private String cActionType = "NONE"; // NONE | REMINDER | DEDUCTION

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal deductionAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
