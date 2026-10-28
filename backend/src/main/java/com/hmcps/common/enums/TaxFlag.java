package com.hmcps.common.enums;

/**
 * Cờ áp dụng thuế TNCN (Kế thừa từ nhóm mẫu):
 * - PROGRESSIVE: Biểu thuế lũy tiến từng phần 7 bậc (HĐLĐ từ 3 tháng trở lên)
 * - FLAT_10: Khấu trừ cố định 10% (HĐLĐ dưới 3 tháng hoặc thử việc không làm cam kết)
 * - FLAT_20: Khấu trừ cố định 20% (Cá nhân không cư trú)
 * - COMMITMENT: Cam kết thu nhập chưa đến mức chịu thuế (Mẫu 02/08-CK-TNCN -> Thuế = 0)
 */
public enum TaxFlag {
    PROGRESSIVE,
    FLAT_10,
    FLAT_20,
    COMMITMENT
}
