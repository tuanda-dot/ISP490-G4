package com.hmcps.entity;

import com.hmcps.common.enums.PayrollStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payrolls", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"month", "year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String payrollCode; // Vd: PR-2026-10

    @Column(name = "period_month", nullable = false)
    private Integer month;

    @Column(name = "period_year", nullable = false)
    private Integer year;

    // Số ngày công chuẩn của kỳ lương (thường 26 ngày)
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal standardWorkDays = new BigDecimal("26.00");

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PayrollStatus status = PayrollStatus.DRAFT;

    // Tổng quỹ lương Gross
    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalGrossSalary = BigDecimal.ZERO;

    // Tổng thực nhận (Net Take-Home)
    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalNetSalary = BigDecimal.ZERO;

    // Tổng chi phí bảo hiểm & thuế DN phải nộp
    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalEmployerCost = BigDecimal.ZERO;

    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime approvedAt;

    // Tích hợp kết nối Phần mềm Kế toán
    @Column(length = 50)
    private String accountingVoucherNo;

    private LocalDateTime accountingExportedAt;

    private Long accountingExportedBy;

    @Builder.Default
    private Boolean isAccountingBalanced = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
