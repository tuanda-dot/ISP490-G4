package com.hmcps.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO đại diện cho một dòng chứng từ hạch toán kế toán (Journal Voucher Entry)
 * Được thiết kế chuẩn hóa để xuất dữ liệu (Excel/CSV/JSON) import trực tiếp vào các phần mềm kế toán:
 * MISA AMIS, MISA SME, FAST Accounting, BRAVO, SAP Business One.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountingJournalVoucherDTO {

    private String voucherNumber;       // Số chứng từ (VD: PKT-2026-10-001)
    private LocalDate voucherDate;      // Ngày chứng từ (Ngày lập)
    private LocalDate postingDate;      // Ngày hạch toán (Ngày ghi sổ cái)
    private String description;         // Diễn giải nghiệp vụ kinh tế phát sinh

    private String debitAccount;        // Tài khoản Nợ (TK 622, TK 627, TK 642, TK 3341)
    private String creditAccount;       // Tài khoản Có (TK 3341, TK 3382, TK 3383, TK 3384, TK 3386, TK 3335, TK 1121)
    private BigDecimal amount;          // Số tiền hạch toán (VNĐ)

    private String employeeCode;        // Mã đối tượng nhân viên (nếu có)
    private String employeeName;        // Tên đối tượng nhân viên (nếu có)

    private String projectCode;         // Mã công trình / Mã dự án (Cost Center) - BẮT BUỘC cho TK 622, TK 627
    private String projectName;         // Tên công trình / Dự án
    private String expenseItemCode;     // Mã khoản mục chi phí (CP_LUONG, CP_BHXH, CP_BHYT, CP_BHTN, CP_KPCĐ)
}
