package com.hmcps.entity;

import com.hmcps.common.enums.AccountCode;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phân bổ chi phí nhân công theo Dự án xây dựng và Tài khoản kế toán
 * Tuân thủ Thông tư 200/2014/TT-BTC: TK 622 (Nhân công trực tiếp), TK 627 (Sản xuất chung), TK 642 (Quản lý DN).
 */
@Entity
@Table(name = "project_cost_allocations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectCostAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long payrollItemId;

    @Column(nullable = false)
    private Long payrollId;

    @Column(nullable = false)
    private Long employeeId;

    private Long projectId; // null nếu là cán bộ văn phòng phân bổ vào TK 642

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountCode accountCode; // TK_622, TK_627, TK_642

    // Tỷ lệ phân bổ (0.0 đến 1.0)
    @Column(precision = 5, scale = 4, nullable = false)
    @Builder.Default
    private BigDecimal allocationRatio = BigDecimal.ONE;

    // Số tiền phân bổ (VNĐ) = (tongThuNhap + congBhDn) x allocationRatio
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal allocatedAmount;

    // Định khoản đối ứng kế toán & phân loại chi phí
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String debitAccount = "622";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String creditAccount = "3341";

    @Column(length = 50)
    private String expenseItemCode;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String accountingSyncStatus = "PENDING";

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
