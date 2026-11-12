package com.hmcps.common.constants;

import java.math.BigDecimal;

/**
 * Các hằng số luật lao động, bảo hiểm và thuế TNCN Việt Nam (Áp dụng năm 2025 - 2026)
 * Tuân thủ BLLĐ 2019, Luật BHXH, TT 111/2013/TT-BTC, NĐ 158/2025/NĐ-CP, QĐ 1908/QĐ-TLĐ.
 */
public final class LaborLawConstants {

    private LaborLawConstants() {
        // utility class
    }

    // ================= TỶ LỆ TRÍCH NỘP BẢO HIỂM (2026) =================
    // Người lao động đóng (Tổng: 10.5%)
    public static final BigDecimal RATE_BHXH_EMPLOYEE = new BigDecimal("0.0800"); // 8.0% Hưu trí - Tử tuất
    public static final BigDecimal RATE_BHYT_EMPLOYEE = new BigDecimal("0.0150"); // 1.5% BHYT
    public static final BigDecimal RATE_BHTN_EMPLOYEE = new BigDecimal("0.0100"); // 1.0% BHTN
    public static final BigDecimal RATE_TOTAL_INSURANCE_EMPLOYEE = new BigDecimal("0.1050"); // 10.5%

    // Doanh nghiệp đóng (Tổng: 21.5% + 0.5% TNLĐ + 2.0% KPCĐ = 24.0%)
    public static final BigDecimal RATE_BHXH_EMPLOYER = new BigDecimal("0.1700"); // 17.0% (14% Hưu trí + 3% Ốm đau thai sản)
    public static final BigDecimal RATE_BHYT_EMPLOYER = new BigDecimal("0.0300"); // 3.0% BHYT
    public static final BigDecimal RATE_BHTN_EMPLOYER = new BigDecimal("0.0100"); // 1.0% BHTN
    public static final BigDecimal RATE_TNLD_BNN_EMPLOYER = new BigDecimal("0.0050"); // 0.5% TNLĐ-BNN bắt buộc DN xây dựng (NĐ 158/2025)
    public static final BigDecimal RATE_KPCD_EMPLOYER = new BigDecimal("0.0200"); // 2.0% Kinh phí công đoàn DN đóng
    public static final BigDecimal RATE_TOTAL_INSURANCE_EMPLOYER = new BigDecimal("0.2350"); // 23.5%

    // Đoàn phí công đoàn cá nhân (QĐ 1908/QĐ-TLĐ): 1% lương đóng BHXH cho đoàn viên
    public static final BigDecimal RATE_UNION_DUES_EMPLOYEE = new BigDecimal("0.0100"); // 1.0%

    // ================= TRẦN & SÀN BẢO HIỂM (VÙNG I - 2026) =================
    public static final BigDecimal REFERENCE_AMOUNT = new BigDecimal("2340000"); // Mức tham chiếu / Lương cơ sở
    public static final BigDecimal CAP_BHXH_BHYT = new BigDecimal("46800000"); // 20 x 2.340.000đ
    public static final BigDecimal REGIONAL_MIN_WAGE_VUNG_1 = new BigDecimal("5310000"); // Sàn lương tối thiểu Vùng I
    public static final BigDecimal CAP_BHTN = new BigDecimal("106200000"); // 20 x 5.310.000đ
    public static final BigDecimal CAP_UNION_DUES = new BigDecimal("234000"); // Trần đoàn phí = 10% Lương cơ sở

    // ================= GIẢM TRỪ GIA CẢNH THUẾ TNCN =================
    public static final BigDecimal PERSONAL_DEDUCTION = new BigDecimal("11000000"); // Bản thân: 11.000.000 đ/tháng
    public static final BigDecimal DEPENDENT_DEDUCTION = new BigDecimal("4400000"); // Người phụ thuộc: 4.400.000 đ/tháng/người

    // ================= MIỄN THUẾ & PHỤ CẤP ĐẶC THÙ =================
    public static final BigDecimal MEAL_ALLOWANCE_PER_DAY = new BigDecimal("40000"); // Tiền ăn trưa quy chế HMCPS: 40.000đ/công thực tế
    public static final BigDecimal MEAL_EXEMPT_THRESHOLD_MONTHLY = new BigDecimal("730000"); // Trần miễn thuế tiền ăn: 730.000 đ/tháng
    public static final BigDecimal FUEL_ALLOWANCE_DEFAULT = new BigDecimal("500000"); // Xăng xe: 500.000 đ/tháng
    public static final BigDecimal PHONE_ALLOWANCE_DEFAULT = new BigDecimal("500000"); // Điện thoại: 500.000 đ/tháng

    // ================= HỆ SỐ LÀM THÊM GIỜ (OT) & PHỤ CẤP CA ĐÊM =================
    public static final BigDecimal MULTIPLIER_OT_WEEKDAY = new BigDecimal("1.50"); // 150% ngày thường (Đ.98.1a)
    public static final BigDecimal MULTIPLIER_OT_WEEKEND = new BigDecimal("2.00"); // 200% ngày nghỉ tuần (Đ.98.1b)
    public static final BigDecimal MULTIPLIER_OT_HOLIDAY = new BigDecimal("3.00"); // 300% ngày lễ, tết (Đ.98.1c)
    public static final BigDecimal SURCHARGE_NIGHT_SHIFT = new BigDecimal("0.30"); // +30% ca đêm 22h-06h (Đ.98.2)

    // ================= NGÀY CÔNG TIÊU CHUẨN & ĐỊNH MỨC HẢI MINH =================
    public static final BigDecimal STANDARD_WORK_DAYS_DEFAULT = new BigDecimal("26"); // Tối đa không quá 26 ngày/tháng
    public static final BigDecimal OFFICE_STANDARD_WORK_DAYS_HM = new BigDecimal("22.5"); // Chuẩn công thực tế VP Hà Nội (5 ngày/tuần hoặc nửa thứ 7)
    public static final BigDecimal STANDARD_WORK_HOURS_PER_DAY = new BigDecimal("8");

    // Định mức gói phụ cấp Khối Văn phòng (Phieu luong.xlsx - Công ty TNHH ĐT XD & PT Hải Minh)
    public static final BigDecimal OFFICE_MEAL_PACKAGE_DEFAULT = new BigDecimal("900000"); // 900.000 đ/tháng (chia theo ngày công hưởng phụ cấp)
    public static final BigDecimal OFFICE_FUEL_PACKAGE_DEFAULT = new BigDecimal("1000000"); // 1.000.000 đ/tháng (chia theo ngày công hưởng phụ cấp)
    public static final BigDecimal OFFICE_PHONE_PACKAGE_DEFAULT = new BigDecimal("200000"); // 200.000 đ/tháng (chia theo ngày công hưởng phụ cấp)
    public static final BigDecimal BUSINESS_TRIP_ALLOWANCE_PER_DAY = new BigDecimal("300000"); // 300.000 đ/ngày công tác (CT)
}
