package com.hmcps.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO tổng hợp toàn bộ tập chứng từ hạch toán của một kỳ lương,
 * có cơ chế kiểm tra cân đối tổng Nợ = tổng Có trước khi cho phép xuất file.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountingExportResponse {

    private Long payrollId;
    private Integer periodMonth;
    private Integer periodYear;
    private String payrollCode;

    private BigDecimal totalDebit;      // Tổng phát sinh Nợ
    private BigDecimal totalCredit;     // Tổng phát sinh Có
    private boolean isBalanced;         // Kiểm tra cân đối Nợ = Có (true: Hợp lệ để import)
    private int voucherCount;           // Tổng số lượng dòng định khoản

    private List<AccountingJournalVoucherDTO> entries;
}
