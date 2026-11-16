package com.hmcps.common.util;

import com.hmcps.common.exception.BusinessException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Tiện ích tra cứu Ngày Lễ / Tết chính thức theo Điều 112 Bộ luật Lao động 2019
 * và kiểm tra tính hợp lệ giữa Ngày làm thêm giờ (OT), Khung giờ thực tế và Loại ca / Hệ số OT.
 */
public final class StatutoryHolidayUtils {

    private static final DateTimeFormatter VI_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HH_MM_FMT = DateTimeFormatter.ofPattern("H:mm");

    /**
     * Lịch nghỉ Lễ/Tết chính xác theo năm (gồm Tết Nguyên Đán Âm lịch, Giỗ Tổ Hùng Vương 10/3 ÂL và ngày liền kề Quốc Khánh).
     */
    private static final Map<String, String> EXACT_YEAR_HOLIDAYS = Map.ofEntries(
            // Năm 2025
            Map.entry("2025-01-28", "Tết Nguyên Đán Ất Tỵ (29 Tết)"),
            Map.entry("2025-01-29", "Tết Nguyên Đán Ất Tỵ (Mùng 1 Tết)"),
            Map.entry("2025-01-30", "Tết Nguyên Đán Ất Tỵ (Mùng 2 Tết)"),
            Map.entry("2025-01-31", "Tết Nguyên Đán Ất Tỵ (Mùng 3 Tết)"),
            Map.entry("2025-02-01", "Tết Nguyên Đán Ất Tỵ (Mùng 4 Tết)"),
            Map.entry("2025-04-07", "Giỗ Tổ Hùng Vương (10/3 Âm lịch)"),
            Map.entry("2025-09-01", "Nghỉ Lễ Quốc Khánh (Liền kề 02/9)"),

            // Năm 2026
            Map.entry("2026-02-16", "Tết Nguyên Đán Bính Ngọ (29 Tết)"),
            Map.entry("2026-02-17", "Tết Nguyên Đán Bính Ngọ (Mùng 1 Tết)"),
            Map.entry("2026-02-18", "Tết Nguyên Đán Bính Ngọ (Mùng 2 Tết)"),
            Map.entry("2026-02-19", "Tết Nguyên Đán Bính Ngọ (Mùng 3 Tết)"),
            Map.entry("2026-02-20", "Tết Nguyên Đán Bính Ngọ (Mùng 4 Tết)"),
            Map.entry("2026-04-26", "Giỗ Tổ Hùng Vương (10/3 Âm lịch)"),
            Map.entry("2026-04-27", "Nghỉ Bù Giỗ Tổ Hùng Vương (10/3 Âm lịch)"),
            Map.entry("2026-09-01", "Nghỉ Lễ Quốc Khánh (Liền kề 02/9)"),

            // Năm 2027
            Map.entry("2027-02-05", "Tết Nguyên Đán Đinh Mùi (29 Tết)"),
            Map.entry("2027-02-06", "Tết Nguyên Đán Đinh Mùi (Mùng 1 Tết)"),
            Map.entry("2027-02-07", "Tết Nguyên Đán Đinh Mùi (Mùng 2 Tết)"),
            Map.entry("2027-02-08", "Tết Nguyên Đán Đinh Mùi (Mùng 3 Tết)"),
            Map.entry("2027-02-09", "Tết Nguyên Đán Đinh Mùi (Mùng 4 Tết)"),
            Map.entry("2027-02-10", "Nghỉ Bù Tết Nguyên Đán Đinh Mùi"),
            Map.entry("2027-02-11", "Nghỉ Bù Tết Nguyên Đán Đinh Mùi"),
            Map.entry("2027-04-16", "Giỗ Tổ Hùng Vương (10/3 Âm lịch)"),
            Map.entry("2027-05-03", "Nghỉ Bù Ngày Quốc Tế Lao Động 01/5"),
            Map.entry("2027-09-03", "Nghỉ Lễ Quốc Khánh (Liền kề 02/9)"),

            // Năm 2028
            Map.entry("2028-01-03", "Nghỉ Bù Tết Dương Lịch 01/01"),
            Map.entry("2028-01-25", "Tết Nguyên Đán Mậu Thân (29 Tết)"),
            Map.entry("2028-01-26", "Tết Nguyên Đán Mậu Thân (Mùng 1 Tết)"),
            Map.entry("2028-01-27", "Tết Nguyên Đán Mậu Thân (Mùng 2 Tết)"),
            Map.entry("2028-01-28", "Tết Nguyên Đán Mậu Thân (Mùng 3 Tết)"),
            Map.entry("2028-01-29", "Tết Nguyên Đán Mậu Thân (Mùng 4 Tết)"),
            Map.entry("2028-04-04", "Giỗ Tổ Hùng Vương (10/3 Âm lịch)"),
            Map.entry("2028-09-03", "Nghỉ Lễ Quốc Khánh (Liền kề 02/9)")
    );

    private static final Map<String, String> FIXED_ANNUAL_HOLIDAYS = Map.of(
            "01-01", "Tết Dương Lịch (01/01)",
            "04-30", "Ngày Chiến Thắng 30/4",
            "05-01", "Ngày Quốc Tế Lao Động 01/5",
            "09-02", "Ngày Quốc Khánh 02/9"
    );

    private StatutoryHolidayUtils() {
    }

    public static Optional<String> getHolidayName(LocalDate date) {
        if (date == null) {
            return Optional.empty();
        }
        String iso = date.toString();
        String exact = EXACT_YEAR_HOLIDAYS.get(iso);
        if (exact != null) {
            return Optional.of(exact);
        }
        String mmdd = String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth());
        return Optional.ofNullable(FIXED_ANNUAL_HOLIDAYS.get(mmdd));
    }

    public static boolean isStatutoryHoliday(LocalDate date) {
        return getHolidayName(date).isPresent();
    }

    public static String formatVietnameseDayOfWeek(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }

    public static LocalDate nextWeekdayNonHoliday(LocalDate startFrom) {
        LocalDate candidate = startFrom != null ? startFrom : LocalDate.now().plusDays(1);
        for (int i = 0; i < 60; i++) {
            DayOfWeek dow = candidate.getDayOfWeek();
            if (dow != DayOfWeek.SUNDAY && dow != DayOfWeek.SATURDAY && !isStatutoryHoliday(candidate)) {
                return candidate;
            }
            candidate = candidate.plusDays(1);
        }
        return candidate;
    }

    /**
     * Kiểm tra toàn diện ngày OT, giờ thực tế, lịch ngày lễ (Điều 112 BLLĐ) và loại ca/hệ số OT.
     * Trả về hệ số chuẩn theo quy định.
     */
    public static double validateOvertimeAndResolveMultiplier(
            LocalDate workDate,
            String startTimeStr,
            String endTimeStr,
            String otType,
            Double otHours
    ) {
        LocalDate today = LocalDate.now();
        LocalDateTime nowDt = LocalDateTime.now();

        if (workDate.isBefore(today)) {
            throw new BusinessException("Không thể đăng ký OT cho ngày trong quá khứ (" + workDate + ")!");
        }

        LocalTime parsedStart;
        try {
            parsedStart = LocalTime.parse(startTimeStr, HH_MM_FMT);
        } catch (Exception e) {
            throw new BusinessException("Định dạng giờ bắt đầu OT (" + startTimeStr + ") không hợp lệ (HH:mm)!");
        }

        LocalDateTime startDateTime = LocalDateTime.of(workDate, parsedStart);
        if (startDateTime.isBefore(nowDt)) {
            throw new BusinessException(
                    "Không được phép đăng ký OT có giờ bắt đầu (" + startTimeStr + ") trước giờ hiện tại ("
                            + nowDt.format(DateTimeFormatter.ofPattern("HH:mm")) + ")!"
            );
        }

        String normalizedType = (otType == null || otType.isBlank()) ? "WEEKDAY_150" : otType.trim().toUpperCase();
        String dateVi = workDate.format(VI_DATE_FMT);
        DayOfWeek dow = workDate.getDayOfWeek();
        String dowVi = formatVietnameseDayOfWeek(dow);
        Optional<String> holidayOpt = getHolidayName(workDate);
        boolean isHolidayType = "HOLIDAY_200".equals(normalizedType) || "HOLIDAY_300".equals(normalizedType);
        boolean isNightDuty = "SITE_NIGHT_DUTY".equals(normalizedType);
        boolean isWeekendType = "WEEKEND_150".equals(normalizedType) || "WEEKEND_200".equals(normalizedType);

        if (!isNightDuty) {
            if (holidayOpt.isPresent()) {
                if (!isHolidayType) {
                    throw new BusinessException(
                            "Lỗi ngày Lễ OT: Ngày " + dateVi + " là ngày lễ chính thức (" + holidayOpt.get()
                                    + " - Điều 112 BLLĐ)! Bắt buộc chọn loại 'OT Ngày Lễ / Tết (Hệ số 200%)'."
                    );
                }
            } else {
                if (isHolidayType) {
                    throw new BusinessException(
                            "Lỗi ngày Lễ OT: Ngày " + dateVi + " (" + dowVi
                                    + ") KHÔNG phải là ngày Lễ / Tết theo quy định! Không thể chọn hệ số 200% Ngày Lễ."
                    );
                }
                if (isWeekendType && dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                    throw new BusinessException(
                            "Lỗi lịch thực tế OT: Loại 'Ngày Nghỉ Hàng Tuần (150%)' chỉ áp dụng cho Thứ Bảy hoặc Chủ Nhật! Ngày "
                                    + dateVi + " là " + dowVi + "."
                    );
                }
                if ("WEEKDAY_150".equals(normalizedType) && dow == DayOfWeek.SUNDAY) {
                    throw new BusinessException(
                            "Lỗi lịch thực tế OT: Ngày " + dateVi
                                    + " là Chủ Nhật (ngày nghỉ hàng tuần)! Vui lòng chọn 'OT Ngày Nghỉ Hàng Tuần (Hệ số 150%)'."
                    );
                }
            }
        }

        if (endTimeStr != null && !endTimeStr.isBlank()) {
            LocalTime parsedEnd;
            try {
                parsedEnd = LocalTime.parse(endTimeStr.trim(), HH_MM_FMT);
            } catch (Exception e) {
                throw new BusinessException("Định dạng giờ kết thúc (" + endTimeStr + ") không hợp lệ (HH:mm)!");
            }
            int startMin = parsedStart.getHour() * 60 + parsedStart.getMinute();
            int endMin = parsedEnd.getHour() * 60 + parsedEnd.getMinute();

            if (isNightDuty) {
                // Trực đêm công trường (đổ bê tông, giám sát đêm): khung thường 22:00 hôm trước -> 04:00 - 05:00 sáng hôm sau
                boolean validNightDutyWindow = startMin >= 21 * 60 && endMin <= 6 * 60 && endMin < startMin;
                if (!validNightDutyWindow) {
                    throw new BusinessException(
                            "Lỗi khung giờ Trực Đêm Công Trường: Chỉ áp dụng khung trực đêm qua ngày (bắt đầu từ 21:00–23:59 đêm hôm trước, kết thúc 03:00–06:00 sáng hôm sau; chuẩn 22:00 - 05:00)!"
                    );
                }
            } else if ("NIGHT_OT_150".equals(normalizedType) || "NIGHT_SHIFT_ADDITIONAL".equals(normalizedType)) {
                boolean overlapsNightWindow = (endMin <= startMin)
                        || startMin >= 22 * 60
                        || endMin > 22 * 60
                        || startMin < 6 * 60;
                if (!overlapsNightWindow) {
                    throw new BusinessException(
                            "Lỗi khung giờ OT Ban Đêm: Chỉ áp dụng khi khoảng thời gian ("
                                    + startTimeStr + " - " + endTimeStr + ") nằm trong khung 22:00 đến 06:00 sáng hôm sau!"
                    );
                }
            }

            int diffMin = endMin - startMin;
            if ((isNightDuty || "NIGHT_OT_150".equals(normalizedType) || "NIGHT_SHIFT_ADDITIONAL".equals(normalizedType)) && endMin <= startMin) {
                diffMin += 24 * 60;
            }
            if (diffMin <= 0) {
                throw new BusinessException("Lỗi thời gian OT: Giờ kết thúc (" + endTimeStr + ") phải lớn hơn giờ bắt đầu (" + startTimeStr + ")!");
            }
            double expectedHours = diffMin / 60.0;
            if (otHours != null && Math.abs(otHours - expectedHours) > 0.1) {
                throw new BusinessException(
                        "Lỗi đối soát giờ: Tổng số giờ nhập (" + otHours + "h) không khớp với khoảng thời gian từ "
                                + startTimeStr + " đến " + endTimeStr + " (" + String.format("%.1f", expectedHours) + "h)!"
                );
            }
        }

        double maxHours = "WEEKDAY_150".equals(normalizedType) ? 4.0 : 12.0;
        if (otHours != null) {
            if (otHours <= 0) {
                throw new BusinessException("Số giờ đăng ký phải lớn hơn 0!");
            }
            if (otHours > maxHours) {
                throw new BusinessException(
                        "Số giờ đăng ký (" + otHours + "h) vượt mức trần tối đa cho phép (" + maxHours + "h/ngày)!"
                );
            }
        }

        return switch (normalizedType) {
            case "WEEKDAY_150", "WEEKEND_150", "WEEKEND_200", "NIGHT_OT_150", "NIGHT_SHIFT_ADDITIONAL" -> 1.5;
            case "HOLIDAY_200", "HOLIDAY_300" -> 2.0;
            case "SITE_NIGHT_DUTY" -> 0.0; // Quy đổi 1.5 ngày công trực tiếp (1 công nghỉ bù + 0.5 công đêm), không tính tiền OT lẻ
            default -> throw new BusinessException("Loại ca tăng ca / trực đêm (otType=" + normalizedType + ") không hợp lệ!");
        };
    }
}
