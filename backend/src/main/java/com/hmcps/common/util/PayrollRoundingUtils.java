package com.hmcps.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Tiện ích làm tròn và xử lý toán học tiền tệ cho Payroll Engine
 * Tuân thủ quy chuẩn kế toán Việt Nam: làm tròn HALF_UP đến hàng nghìn đồng cho Thực nhận.
 */
public final class PayrollRoundingUtils {

    private static final BigDecimal THOUSAND = new BigDecimal("1000");

    private PayrollRoundingUtils() {
        // utility class
    }

    /**
     * Làm tròn đến hàng nghìn đồng (ROUND(x, -3)) theo chuẩn kế toán Việt Nam.
     * Ví dụ: 23,548,700 -> 23,549,000; 23,548,200 -> 23,548,000
     */
    public static BigDecimal roundToThousand(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO;
        }
        return amount.divide(THOUSAND, 0, RoundingMode.HALF_UP).multiply(THOUSAND);
    }

    /**
     * Làm tròn tiền tệ tiêu chuẩn 2 chữ số thập phân (dùng cho các tỷ lệ hoặc tiền tệ trung gian).
     */
    public static BigDecimal roundToTwoDecimals(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Giữ giá trị trong khoảng [min, max]. Nếu val < min -> min; nếu max != null và val > max -> max.
     */
    public static BigDecimal clamp(BigDecimal value, BigDecimal min, BigDecimal max) {
        if (value == null) {
            return min;
        }
        BigDecimal result = value;
        if (min != null && result.compareTo(min) < 0) {
            result = min;
        }
        if (max != null && max.compareTo(BigDecimal.ZERO) > 0 && result.compareTo(max) > 0) {
            result = max;
        }
        return result;
    }
}
