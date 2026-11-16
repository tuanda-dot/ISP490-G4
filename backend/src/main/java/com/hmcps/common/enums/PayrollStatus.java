package com.hmcps.common.enums;

/**
 * Trạng thái kỳ tính lương:
 * - DRAFT: Khởi tạo bảng lương
 * - CALCULATED: Đã tính toán xong chi tiết lương các khối cột A-H
 * - SUBMITTED: Kế toán viên đã trình Kế toán trưởng thẩm định
 * - REVIEWED: Kế toán trưởng đã đối soát & trình Tờ trình ngân sách lên Giám đốc
 * - DIRECTOR_REJECTED: Ban Giám đốc từ chối hạn mức ngân sách & yêu cầu KTT giải trình / điều chỉnh lại
 * - APPROVED: Ban Giám đốc phê duyệt chi lương
 * - LOCKED: Đã khóa sổ kế toán, không thể điều chỉnh
 * - PAID: Đã chuyển khoản ngân hàng hoàn tất, gửi Payslip
 */
public enum PayrollStatus {
    DRAFT,
    CALCULATED,
    SUBMITTED,
    REVIEWED,
    DIRECTOR_REJECTED,
    APPROVED,
    LOCKED,
    PAID
}
