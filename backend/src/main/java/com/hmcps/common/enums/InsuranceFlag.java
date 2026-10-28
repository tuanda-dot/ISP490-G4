package com.hmcps.common.enums;

/**
 * Cờ bảo hiểm phục vụ tính lương (Kế thừa từ nhóm mẫu):
 * - FULL: Đóng đầy đủ (BHXH 8%, BHYT 1.5%, BHTN 1%, TNLĐ 0.5%, KPCĐ 2%)
 * - NO_INSURANCE: Không đóng bảo hiểm (Thử việc, chuyên gia, thời vụ)
 * - HEALTH_ONLY: Chỉ đóng BHYT (Cán bộ hưu trí làm việc tiếp)
 * - MATERNITY: Nghỉ thai sản (Cơ quan BHXH chi trả, DN và NLĐ không đóng BHXH/BHTN)
 * - NO_UNION: Không tham gia công đoàn
 */
public enum InsuranceFlag {
    FULL,
    NO_INSURANCE,
    HEALTH_ONLY,
    MATERNITY,
    NO_UNION
}
