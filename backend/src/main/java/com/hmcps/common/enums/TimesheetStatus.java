package com.hmcps.common.enums;

/**
 * Trạng thái bảng chấm công tháng (Quy trình 2 cấp):
 * - DRAFT: Bản nháp đang tích lũy công hàng ngày
 * - CONFIRMED: Chỉ huy trưởng (Site Manager) đã rà soát và xác nhận công dự án mình (Cấp 1)
 * - LOCKED: Trưởng phòng HR đã kiểm tra toàn công ty và Khóa bảng công (Cấp 2) -> Tự động kích hoạt tính lương
 */
public enum TimesheetStatus {
    DRAFT,
    CONFIRMED,
    LOCKED
}
