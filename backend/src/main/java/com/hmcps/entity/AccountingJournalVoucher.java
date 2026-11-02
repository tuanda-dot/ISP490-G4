package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bảng Chứng từ Hạch toán Kế toán Kép (Accounting Journal Vouchers)
 * Phục vụ xuất file import và kết nối trực tiếp vào Sổ Cái phần mềm kế toán MISA AMIS, FAST, BRAVO, SAP.
 * Tuân thủ Thông tư 200/2014/TT-BTC về hạch toán chi phí tiền lương và các khoản trích theo lương.
 */
@Entity
@Table(name = "accounting_journal_vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountingJournalVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long payrollId;

    @Column(nullable = false, length = 50)
    private String voucherNumber;

    @Column(nullable = false)
    private LocalDate voucherDate;

    @Column(nullable = false)
    private LocalDate postingDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String debitAccount; // 622, 627, 642, 3341

    @Column(nullable = false, length = 20)
    private String creditAccount; // 3341, 3383, 3384, 3386, 3382, 3335, 1121

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    private Long employeeId;

    private Long projectId;

    @Column(length = 50)
    private String projectCode;

    @Column(length = 50)
    private String expenseItemCode;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String exportTarget = "MISA"; // MISA, FAST, BRAVO, SAP

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
