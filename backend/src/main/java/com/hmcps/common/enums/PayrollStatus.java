package com.hmcps.common.enums;

/**
 * Trạng thái kỳ tính lương:
 * - DRAFT: Khởi tạo bảng lương
 * - CALCULATED: Đã tính toán xong chi tiết lương các khối cột A-H
 * - REVIEWED: Kế toán trưởng đã đối soát
 * - APPROVED: Ban Giám đốc phê duyệt chi lương
 * - LOCKED: Đã khóa sổ kế toán, không thể điều chỉnh
 * - PAID: Đã chuyển khoản ngân hàng hoàn tất, gửi Payslip
 */
public enum PayrollStatus {
    DRAFT,
    CALCULATED,
    REVIEWED,
    APPROVED,
    LOCKED,
    PAID
}
