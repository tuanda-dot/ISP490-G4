package com.hmcps.common.enums;

/**
 * Phân loại đối tượng lao động cốt lõi của HMCPS:
 * - OFFICE_STAFF: Nhân viên văn phòng (Trụ sở chính) -> Chấm công vân tay/FaceID, bảo hiểm tính trên (Lương + Phụ cấp chức vụ + Thâm niên)
 * - SITE_ENGINEER: Kỹ sư công trường (Hiện trường) -> Chấm công Mobile GPS + OTP, bảo hiểm tính DUY NHẤT trên Lương cơ bản, phụ cấp công trường miễn BHXH
 */
public enum EmployeeType {
    OFFICE_STAFF,
    SITE_ENGINEER
}
