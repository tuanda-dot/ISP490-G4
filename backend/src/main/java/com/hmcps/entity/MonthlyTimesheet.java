package com.hmcps.entity;

import com.hmcps.common.enums.TimesheetStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_timesheets", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employeeId", "period_month", "period_year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyTimesheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(name = "period_month", nullable = false)
    private Integer month;

    @Column(name = "period_year", nullable = false)
    private Integer year;

    // Ngày công chuẩn trong tháng (thường là 26 ngày)
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal standardWorkDays = new BigDecimal("26.00");

    // Tổng số ngày công thực tế làm việc
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal actualWorkDays = BigDecimal.ZERO;

    // Số ngày công chính thức
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal officialWorkDays = BigDecimal.ZERO;

    // Số ngày công thử việc
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal probationWorkDays = BigDecimal.ZERO;

    // Số ngày công tính tiền ăn trưa (40.000đ/ngày)
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal mealWorkDays = BigDecimal.ZERO;

    // Tổng số giờ làm thêm (OT)
    @Column(precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    // Tổng số giờ làm việc ban đêm (22h - 06h)
    @Column(precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal nightHours = BigDecimal.ZERO;

    // Ngày nghỉ phép hưởng lương
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal paidLeaveDays = BigDecimal.ZERO;

    // Ngày nghỉ không hưởng lương
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal unpaidLeaveDays = BigDecimal.ZERO;

    // Trạng thái phê duyệt 2 cấp: DRAFT -> CONFIRMED (Site Manager) -> LOCKED (HR Manager)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TimesheetStatus status = TimesheetStatus.DRAFT;

    // Cấp 1: Chỉ huy trưởng dự án duyệt
    private Long confirmedBy;
    private LocalDateTime confirmedAt;

    // Cấp 2: Trưởng phòng HR Khóa bảng công (Tự động trigger sang tính lương)
    private Long lockedBy;
    private LocalDateTime lockedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
