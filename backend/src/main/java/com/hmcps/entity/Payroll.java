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

    // Số ngày công chuẩn của kỳ lương (thống nhất 22,5 ngày/tháng)
    @Column(precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal standardWorkDays = new BigDecimal("22.50");

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(30)")
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

    @Column(length = 150)
    private String approvedByName;

    @Column(length = 150)
    private String reviewedByName;

    private LocalDateTime reviewedAt;

    // Workflow 9 (BF-09): Luồng Giám đốc từ chối hạn mức ngân sách & KTT giải trình / điều chỉnh lại
    @Column(length = 150)
    private String rejectedByName;

    private LocalDateTime rejectedAt;

    @Column(length = 1000)
    private String directorRejectionReason;

    @Column(length = 500)
    private String directorRequestedProjects;

    @Column(length = 1500)
    private String chiefAccountantExplanation;

    private LocalDateTime adjustedAt;

    @Column(columnDefinition = "TEXT")
    private String adjustedProjectBudgetsJson;

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
