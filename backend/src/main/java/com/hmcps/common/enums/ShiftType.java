package com.hmcps.common.enums;

/**
 * Loại ca làm việc:
 * - DAY_SHIFT: Ca ngày bình thường (8 tiếng)
 * - NIGHT_SHIFT: Ca làm đêm (22:00 - 06:00, hưởng thêm +30% phụ cấp làm đêm theo Đ.98.2 BLLĐ)
 * - OVERTIME_SHIFT: Ca tăng ca hiện trường (OT 150%, 200%, 300%)
 */
public enum ShiftType {
    DAY_SHIFT,
    NIGHT_SHIFT,
    OVERTIME_SHIFT
}
