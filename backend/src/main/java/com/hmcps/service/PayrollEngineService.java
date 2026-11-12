package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.common.enums.*;
import com.hmcps.common.util.PayrollRoundingUtils;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.io.File;

/**
 * Lõi tính toán lương (Payroll Engine) - HMCPS (FE-06)
 * Chuyển giao và chuẩn hóa từ công nghệ tính toán lương chuẩn công nghiệp sang Java Spring Boot 3.
 * Tuân thủ nghiêm ngặt:
 *  - 100% sử dụng BigDecimal và RoundingMode.HALF_UP (Tuyệt đối không dùng float/double cho tiền tệ)
 *  - Phân tách rõ ràng giữa Khối Văn phòng (Office Staff) và Khối Kỹ sư Công trường (Site Engineers)
 *  - Hỗ trợ Proration theo ngày công thực tế (làm bao nhiêu hưởng bấy nhiêu)
 *  - Tính trần/sàn BHXH/BHYT/BHTN, thuế TNCN 7 bậc lũy tiến, chi phí TNLĐ-BNN (NĐ 158/2025)
 *  - Tự động bóc tách chi phí dự án vào các tài khoản kế toán TK 622, TK 627, TK 642
 */
@Service
@RequiredArgsConstructor
public class PayrollEngineService {

    private final ComplianceService complianceService;
    private final PayrollRepository payrollRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final ProjectCostAllocationRepository costAllocationRepository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final MonthlyTimesheetRepository timesheetRepository;
    private final EngineerAssignmentRepository assignmentRepository;

    private static final File BF10_STATE_FILE = new File("./target/hmcps_bf10_state.json");
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Data
    @Builder
    public static class ProjectAllowanceSnapshot {
        private BigDecimal siteLodging;
        private BigDecimal hazard;
        private BigDecimal projectResponsibility;
    }

    /**
     * Bóc tách phụ cấp công trường động từ Cấu hình BF-10 (theo Dự án & theo Từng Kỹ sư)
     */
    public ProjectAllowanceSnapshot resolveProjectAllowances(Employee emp) {
        if (emp == null || emp.getEmployeeType() == EmployeeType.OFFICE_STAFF) {
            return ProjectAllowanceSnapshot.builder()
                    .siteLodging(BigDecimal.ZERO)
                    .hazard(BigDecimal.ZERO)
                    .projectResponsibility(BigDecimal.ZERO)
                    .build();
        }

        // Đọc cấu hình phụ cấp công trường từ state BF-10
        if (BF10_STATE_FILE.exists()) {
            try {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(BF10_STATE_FILE);
                com.fasterxml.jackson.databind.JsonNode projectAllowances = root.path("projectAllowances");
                if (projectAllowances.isObject()) {
                    java.util.Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = projectAllowances.fields();
                    while (fields.hasNext()) {
                        Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry = fields.next();
                        com.fasterxml.jackson.databind.JsonNode projNode = entry.getValue();
                        com.fasterxml.jackson.databind.JsonNode engineers = projNode.path("engineers");
                        if (engineers.isArray()) {
                            for (com.fasterxml.jackson.databind.JsonNode engNode : engineers) {
                                String code = engNode.path("code").asText();
                                if (emp.getEmployeeCode() != null && emp.getEmployeeCode().equalsIgnoreCase(code)) {
                                    BigDecimal lodging = engNode.has("customLodging") ? new BigDecimal(engNode.path("customLodging").asText("0")) : BigDecimal.ZERO;
                                    BigDecimal hazard = engNode.has("customHazard") ? new BigDecimal(engNode.path("customHazard").asText("0")) : BigDecimal.ZERO;
                                    BigDecimal resp = engNode.has("customResp") ? new BigDecimal(engNode.path("customResp").asText("0")) : BigDecimal.ZERO;
                                    return ProjectAllowanceSnapshot.builder()
                                            .siteLodging(lodging)
                                            .hazard(hazard)
                                            .projectResponsibility(resp)
                                            .build();
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // Fallback mặc định theo định mức xây lắp nếu chưa thiết lập riêng
        boolean isSiteManager = emp.getPosition() != null && emp.getPosition().toLowerCase().contains("chỉ huy trưởng");
        return ProjectAllowanceSnapshot.builder()
                .siteLodging(new BigDecimal("3000000"))
                .hazard(new BigDecimal("1500000"))
                .projectResponsibility(isSiteManager ? new BigDecimal("2000000") : new BigDecimal("500000"))
                .build();
    }

    /**
     * DTO truyền đầu vào cho Engine tính lương của 1 nhân viên
     */
    @Data
    @Builder
    public static class PayrollCalculationInput {
        private Employee employee;
        private Contract contract;
        private MonthlyTimesheet timesheet;
        private BigDecimal heSoNangSuat;
        private BigDecimal phuCapChucVu;
        private BigDecimal phuCapThamNien;
        private BigDecimal phuCapCom;
        private BigDecimal phuCapXangXe;
        private BigDecimal phuCapDienThoai;
        private BigDecimal phuCapLuuTru;
        private BigDecimal phuCapDocHai;
        private BigDecimal phuCapTrachNhiem;
        private BigDecimal thuongDuAn;

        // Các trường mở rộng theo Phiếu lương & Bảng công thực tế Hải Minh (Phieu luong.xlsx)
        private BigDecimal luongHieuQua;
        private String xepLoaiDanhGia;
        private BigDecimal tyLeHieuQua;
        private BigDecimal phuCapCongTac;
        private BigDecimal ngayCongHuongPhuCap;
        private BigDecimal ngayCongCongTac;
        private BigDecimal hoanThueTncn;
        private BigDecimal thuNhapKhac;
        private BigDecimal truyThuThueTncn;
        private Boolean haiMinhStandardMode;
    }

    /**
     * Tính toán chi tiết 8 khối cột (A -> H) cho 1 nhân sự trong kỳ lương.
     */
    public PayrollItem calculatePayrollItem(Long payrollId, PayrollCalculationInput input) {
        Employee emp = input.getEmployee();
        Contract contract = input.getContract();
        MonthlyTimesheet ts = input.getTimesheet();

        // 1. KHỐI B: Ngày công
        BigDecimal congChuan = ts.getStandardWorkDays() != null && ts.getStandardWorkDays().compareTo(BigDecimal.ZERO) > 0
                ? ts.getStandardWorkDays() : LaborLawConstants.STANDARD_WORK_DAYS_DEFAULT;
        BigDecimal congChinhThuc = ts.getOfficialWorkDays() != null ? ts.getOfficialWorkDays() : BigDecimal.ZERO;
        BigDecimal congThuViec = ts.getProbationWorkDays() != null ? ts.getProbationWorkDays() : BigDecimal.ZERO;
        BigDecimal congTinhCom = ts.getMealWorkDays() != null ? ts.getMealWorkDays() : (congChinhThuc.add(congThuViec));
        BigDecimal overtimeHours = ts.getOvertimeHours() != null ? ts.getOvertimeHours() : BigDecimal.ZERO;
        BigDecimal nightHours = ts.getNightHours() != null ? ts.getNightHours() : BigDecimal.ZERO;
        BigDecimal ngayNghiPhep = ts.getPaidLeaveDays() != null ? ts.getPaidLeaveDays() : BigDecimal.ZERO;
        BigDecimal ngayNghiLe = ts.getHolidayLeaveDays() != null ? ts.getHolidayLeaveDays() : BigDecimal.ZERO;
        BigDecimal ngayNghiKhongLuong = ts.getUnpaidLeaveDays() != null ? ts.getUnpaidLeaveDays() : BigDecimal.ZERO;
        BigDecimal totalActualDays = congChinhThuc.add(congThuViec);
        BigDecimal ngayCongHuongPhuCap = input.getNgayCongHuongPhuCap() != null
                ? input.getNgayCongHuongPhuCap()
                : (ts.getAllowanceWorkDays() != null && ts.getAllowanceWorkDays().compareTo(BigDecimal.ZERO) > 0
                        ? ts.getAllowanceWorkDays() : totalActualDays);
        BigDecimal ngayCongCongTac = input.getNgayCongCongTac() != null
                ? input.getNgayCongCongTac()
                : (ts.getBusinessTripDays() != null ? ts.getBusinessTripDays() : BigDecimal.ZERO);

        boolean isHaiMinhMode = Boolean.TRUE.equals(input.getHaiMinhStandardMode())
                || input.getLuongHieuQua() != null
                || emp.getPerformanceSalary() != null;

        // 2. KHỐI C: Mức lương & phụ cấp tính lương T13 / Lương hiệu quả công việc
        BigDecimal mucLuong = contract.getBaseSalary();
        BigDecimal heSoNangSuat = input.getHeSoNangSuat() != null ? input.getHeSoNangSuat() : BigDecimal.ONE;
        // Trợ cấp lương chính = Lương chính x Hệ số năng suất (theo quy chế HRM)
        BigDecimal phuCapLuong = isHaiMinhMode
                ? BigDecimal.ZERO
                : mucLuong.multiply(heSoNangSuat).setScale(2, RoundingMode.HALF_UP);
        BigDecimal troCapThuViec = (!isHaiMinhMode && congThuViec.compareTo(BigDecimal.ZERO) > 0) ? phuCapLuong : BigDecimal.ZERO;
        BigDecimal phuCapChucVu = input.getPhuCapChucVu() != null ? input.getPhuCapChucVu()
                : (emp.getPositionAllowance() != null ? emp.getPositionAllowance() : BigDecimal.ZERO);
        BigDecimal phuCapThamNien = input.getPhuCapThamNien() != null ? input.getPhuCapThamNien()
                : (emp.getSeniorityAllowance() != null ? emp.getSeniorityAllowance() : BigDecimal.ZERO);

        BigDecimal luongHieuQuaKhoan = input.getLuongHieuQua() != null
                ? input.getLuongHieuQua()
                : (emp.getPerformanceSalary() != null ? emp.getPerformanceSalary() : BigDecimal.ZERO);
        String xepLoaiDanhGia = input.getXepLoaiDanhGia() != null
                ? input.getXepLoaiDanhGia()
                : (emp.getEvaluationGrade() != null ? emp.getEvaluationGrade() : "A");
        BigDecimal tyLeHieuQua = input.getTyLeHieuQua() != null
                ? input.getTyLeHieuQua()
                : (emp.getEvaluationPct() != null ? emp.getEvaluationPct() : BigDecimal.ONE);
        BigDecimal luongHieuQuaThucHuong = BigDecimal.ZERO;

        // 3. KHỐI D: Phụ cấp lưu động / công trường / văn phòng
        BigDecimal phuCapCom;
        BigDecimal phuCapXangXe;
        BigDecimal phuCapDienThoai;
        BigDecimal phuCapLuuTru = input.getPhuCapLuuTru() != null ? input.getPhuCapLuuTru() : BigDecimal.ZERO;
        BigDecimal phuCapDocHai = input.getPhuCapDocHai() != null ? input.getPhuCapDocHai() : BigDecimal.ZERO;
        BigDecimal phuCapTrachNhiem = input.getPhuCapTrachNhiem() != null ? input.getPhuCapTrachNhiem() : BigDecimal.ZERO;
        BigDecimal phuCapCongTac = input.getPhuCapCongTac() != null
                ? input.getPhuCapCongTac()
                : ngayCongCongTac.multiply(LaborLawConstants.BUSINESS_TRIP_ALLOWANCE_PER_DAY);
        BigDecimal hoanThueTncn = input.getHoanThueTncn() != null ? input.getHoanThueTncn() : BigDecimal.ZERO;
        BigDecimal thuNhapKhac = input.getThuNhapKhac() != null ? input.getThuNhapKhac() : BigDecimal.ZERO;
        BigDecimal truyThuThueTncn = input.getTruyThuThueTncn() != null ? input.getTruyThuThueTncn() : BigDecimal.ZERO;

        // 4. KHỐI E: Thu nhập & Tổng thu nhập (GROSS)
        BigDecimal thuNhapChinh;
        if (isHaiMinhMode) {
            // Công thức chuẩn Phiếu lương thực tế Hải Minh (Phieu luong.xlsx):
            BigDecimal luongCoBanThucHuong = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? mucLuong.multiply(totalActualDays).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            luongHieuQuaThucHuong = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? luongHieuQuaKhoan.multiply(totalActualDays).multiply(tyLeHieuQua).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal mealPkg = input.getPhuCapCom() != null ? input.getPhuCapCom()
                    : (emp.getMealPackage() != null ? emp.getMealPackage() : LaborLawConstants.OFFICE_MEAL_PACKAGE_DEFAULT);
            BigDecimal fuelPkg = input.getPhuCapXangXe() != null ? input.getPhuCapXangXe()
                    : (emp.getFuelPackage() != null ? emp.getFuelPackage() : LaborLawConstants.OFFICE_FUEL_PACKAGE_DEFAULT);
            BigDecimal phonePkg = input.getPhuCapDienThoai() != null ? input.getPhuCapDienThoai()
                    : (emp.getPhonePackage() != null ? emp.getPhonePackage() : LaborLawConstants.OFFICE_PHONE_PACKAGE_DEFAULT);

            phuCapCom = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? mealPkg.multiply(ngayCongHuongPhuCap).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            phuCapXangXe = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? fuelPkg.multiply(ngayCongHuongPhuCap).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            phuCapDienThoai = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? phonePkg.multiply(ngayCongHuongPhuCap).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal posProrated = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? phuCapChucVu.multiply(totalActualDays).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal senProrated = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? phuCapThamNien.multiply(totalActualDays).divide(congChuan, 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            thuNhapChinh = luongCoBanThucHuong
                    .add(luongHieuQuaThucHuong)
                    .add(phuCapCom)
                    .add(phuCapXangXe)
                    .add(phuCapDienThoai)
                    .add(phuCapCongTac)
                    .add(posProrated)
                    .add(senProrated)
                    .add(phuCapLuuTru)
                    .add(phuCapDocHai)
                    .add(phuCapTrachNhiem)
                    .setScale(0, RoundingMode.HALF_UP);
        } else {
            // Cơm = số công thực tế x 40.000đ/ngày
            phuCapCom = input.getPhuCapCom() != null && input.getPhuCapCom().compareTo(BigDecimal.ZERO) > 0
                    ? input.getPhuCapCom()
                    : congTinhCom.multiply(LaborLawConstants.MEAL_ALLOWANCE_PER_DAY);
            phuCapXangXe = input.getPhuCapXangXe() != null ? input.getPhuCapXangXe() : LaborLawConstants.FUEL_ALLOWANCE_DEFAULT;
            phuCapDienThoai = input.getPhuCapDienThoai() != null ? input.getPhuCapDienThoai() : LaborLawConstants.PHONE_ALLOWANCE_DEFAULT;

            // Tổng các khoản phụ cấp nền chia theo công
            BigDecimal totalFixedBase = mucLuong.add(phuCapLuong)
                    .add(phuCapChucVu)
                    .add(phuCapThamNien)
                    .add(phuCapXangXe)
                    .add(phuCapDienThoai)
                    .add(phuCapLuuTru)
                    .add(phuCapDocHai)
                    .add(phuCapTrachNhiem);

            // Proration theo ngày công thực tế
            thuNhapChinh = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? totalFixedBase.divide(congChuan, 6, RoundingMode.HALF_UP)
                            .multiply(totalActualDays)
                            .add(phuCapCom)
                            .setScale(2, RoundingMode.HALF_UP)
                    : phuCapCom;
        }

        // Tiền lương làm thêm giờ (OT) - Đ.98.1 BLLĐ
        // Đơn giá lương giờ chuẩn = mucLuong / (congChuan x 8)
        BigDecimal hourlyRate = congChuan.compareTo(BigDecimal.ZERO) > 0
                ? mucLuong.divide(congChuan.multiply(LaborLawConstants.STANDARD_WORK_HOURS_PER_DAY), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        // Giả định bình quân giờ làm thêm là ngày thường (150%)
        BigDecimal luongTangCa = overtimeHours.multiply(hourlyRate).multiply(LaborLawConstants.MULTIPLIER_OT_WEEKDAY).setScale(2, RoundingMode.HALF_UP);
        // Phần chênh lệch lương OT vượt quá ngày thường (50% của giờ thường) được MIỄN THUẾ TNCN
        BigDecimal chenhLechLtg = overtimeHours.multiply(hourlyRate).multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);

        // Phụ trội ca đêm 30% (Đ.98.2 BLLĐ)
        BigDecimal phuTroiDem = nightHours.multiply(hourlyRate).multiply(LaborLawConstants.SURCHARGE_NIGHT_SHIFT).setScale(2, RoundingMode.HALF_UP);
        BigDecimal phuTroiDemMienThue = phuTroiDem; // Toàn bộ phần trả cao hơn do làm đêm được miễn thuế

        BigDecimal thuongDuAn = input.getThuongDuAn() != null ? input.getThuongDuAn() : BigDecimal.ZERO;
        BigDecimal rawTongThuNhap = thuNhapChinh.add(luongTangCa).add(phuTroiDem).add(thuongDuAn).add(hoanThueTncn).add(thuNhapKhac);
        BigDecimal tongThuNhap = isHaiMinhMode ? rawTongThuNhap.setScale(0, RoundingMode.HALF_UP) : rawTongThuNhap.setScale(2, RoundingMode.HALF_UP);

        // 5. KHỐI F: Trích nộp Bảo hiểm (VĂN PHÒNG vs KỸ SƯ CÔNG TRƯỜNG)
        BigDecimal insuranceBase = BigDecimal.ZERO;
        BigDecimal bhxhNld = BigDecimal.ZERO;
        BigDecimal bhytNld = BigDecimal.ZERO;
        BigDecimal bhtnNld = BigDecimal.ZERO;
        BigDecimal congBhNld = BigDecimal.ZERO;
        BigDecimal bhxhDn = BigDecimal.ZERO;
        BigDecimal bhytDn = BigDecimal.ZERO;
        BigDecimal bhtnDn = BigDecimal.ZERO;
        BigDecimal tnldDn = BigDecimal.ZERO;
        BigDecimal kpcdDn = BigDecimal.ZERO;
        BigDecimal congBhDn = BigDecimal.ZERO;

        InsuranceFlag insFlag = contract.getInsuranceFlag() != null ? contract.getInsuranceFlag() : InsuranceFlag.FULL;

        if (insFlag != InsuranceFlag.NO_INSURANCE && insFlag != InsuranceFlag.MATERNITY) {
            // Xác định nền đóng bảo hiểm theo phân loại nhân sự:
            BigDecimal rawBase;
            if (emp.getEmployeeType() == EmployeeType.OFFICE_STAFF) {
                // Khối Văn phòng: Lương cơ bản + Phụ cấp chức vụ + Phụ cấp thâm niên
                rawBase = mucLuong.add(phuCapChucVu).add(phuCapThamNien);
            } else {
                // Khối Kỹ sư Công trường: DUY NHẤT Lương cơ bản! (Mọi phụ cấp công trường được miễn)
                rawBase = mucLuong;
            }

            // Prorate nền đóng bảo hiểm theo ngày công thực tế / công chuẩn
            // Theo Phiếu lương Hải Minh (Phieu luong.xlsx: =10.5%*D13) & Luật BHXH: nghỉ không lương < 14 ngày đóng đủ 100% nền BHXH
            BigDecimal unpaidDaysForBh = congChuan.subtract(totalActualDays);
            BigDecimal proratedBase;
            if (isHaiMinhMode) {
                proratedBase = (totalActualDays.compareTo(BigDecimal.ZERO) > 0 && unpaidDaysForBh.compareTo(new BigDecimal("14")) < 0)
                        ? rawBase : BigDecimal.ZERO;
            } else {
                proratedBase = congChuan.compareTo(BigDecimal.ZERO) > 0
                        ? rawBase.divide(congChuan, 6, RoundingMode.HALF_UP).multiply(congTinhCom).setScale(2, RoundingMode.HALF_UP)
                        : rawBase;
            }

            BigDecimal bhxhCap = complianceService.getBhxhCap();
            BigDecimal bhtnCap = complianceService.getBhtnCap();

            // Áp trần BHXH/BHYT (20 lần mức tham chiếu = 46.800.000đ)
            BigDecimal baseBhxh = PayrollRoundingUtils.clamp(proratedBase, BigDecimal.ZERO, bhxhCap);
            // Áp trần BHTN (20 lần lương tối thiểu Vùng I = 106.200.000đ)
            BigDecimal baseBhtn = PayrollRoundingUtils.clamp(proratedBase, BigDecimal.ZERO, bhtnCap);

            insuranceBase = baseBhxh;

            if (insFlag == InsuranceFlag.HEALTH_ONLY) {
                // Chỉ đóng BHYT (Cán bộ hưu trí)
                bhytNld = baseBhxh.multiply(LaborLawConstants.RATE_BHYT_EMPLOYEE).setScale(2, RoundingMode.HALF_UP);
                bhytDn = baseBhxh.multiply(LaborLawConstants.RATE_BHYT_EMPLOYER).setScale(2, RoundingMode.HALF_UP);
            } else {
                // Đóng đầy đủ
                bhxhNld = baseBhxh.multiply(LaborLawConstants.RATE_BHXH_EMPLOYEE).setScale(2, RoundingMode.HALF_UP);
                bhytNld = baseBhxh.multiply(LaborLawConstants.RATE_BHYT_EMPLOYEE).setScale(2, RoundingMode.HALF_UP);
                bhtnNld = baseBhtn.multiply(LaborLawConstants.RATE_BHTN_EMPLOYEE).setScale(2, RoundingMode.HALF_UP);

                bhxhDn = baseBhxh.multiply(LaborLawConstants.RATE_BHXH_EMPLOYER).setScale(2, RoundingMode.HALF_UP);
                bhytDn = baseBhxh.multiply(LaborLawConstants.RATE_BHYT_EMPLOYER).setScale(2, RoundingMode.HALF_UP);
                bhtnDn = baseBhtn.multiply(LaborLawConstants.RATE_BHTN_EMPLOYER).setScale(2, RoundingMode.HALF_UP);

                // BH TNLĐ-BNN (0.5% theo NĐ 158/2025 - DN nộp)
                tnldDn = baseBhxh.multiply(LaborLawConstants.RATE_TNLD_BNN_EMPLOYER).setScale(2, RoundingMode.HALF_UP);

                // Kinh phí công đoàn DN đóng (2% quỹ lương)
                if (insFlag != InsuranceFlag.NO_UNION) {
                    kpcdDn = baseBhxh.multiply(LaborLawConstants.RATE_KPCD_EMPLOYER).setScale(2, RoundingMode.HALF_UP);
                }
            }

            congBhNld = bhxhNld.add(bhytNld).add(bhtnNld).setScale(2, RoundingMode.HALF_UP);
            congBhDn = bhxhDn.add(bhytDn).add(bhtnDn).add(tnldDn).add(kpcdDn).setScale(2, RoundingMode.HALF_UP);
        }

        // 6. KHỐI G: Thuế Thu nhập cá nhân (PIT)
        Integer slNpt = emp.getDependentsCount() != null ? emp.getDependentsCount() : 0;
        BigDecimal gtBanThan = complianceService.getPersonalDeduction();
        BigDecimal gtNpt = complianceService.getDependentDeduction().multiply(BigDecimal.valueOf(slNpt));

        // Cơm miễn thuế tối đa 730.000đ/tháng
        BigDecimal mealCap = complianceService.getMealExemptThreshold();
        BigDecimal comMienThue = phuCapCom.compareTo(mealCap) > 0 ? mealCap : phuCapCom;

        // Các khoản miễn thuế hợp lý: Điện thoại khoán, Lưu trú công trường, Độc hại hiện trường, Công tác phí, Hoàn thuế TNCN, Chênh lệch OT, Phụ trội đêm
        BigDecimal exemptAllowances = phuCapDienThoai.add(phuCapLuuTru).add(phuCapDocHai).add(phuCapCongTac)
                .add(hoanThueTncn).add(comMienThue).add(chenhLechLtg).add(phuTroiDemMienThue);

        // Thu nhập chịu thuế (TNCT)
        BigDecimal tnct = tongThuNhap.subtract(exemptAllowances);
        if (tnct.compareTo(BigDecimal.ZERO) < 0) {
            tnct = BigDecimal.ZERO;
        }

        // Thu nhập tính thuế (TNTT) = MAX(0, TNCT - BH NLĐ - Giảm trừ bản thân - Giảm trừ NPT)
        BigDecimal totalDeductions = congBhNld.add(gtBanThan).add(gtNpt);
        BigDecimal tntt = tnct.subtract(totalDeductions);
        if (tntt.compareTo(BigDecimal.ZERO) < 0) {
            tntt = BigDecimal.ZERO;
        }

        // Tính thuế TNCN theo phương pháp
        TaxFlag taxFlag = contract.getTaxFlag() != null ? contract.getTaxFlag() : TaxFlag.PROGRESSIVE;
        BigDecimal thueTncn = BigDecimal.ZERO;

        if (taxFlag == TaxFlag.FLAT_10) {
            thueTncn = tongThuNhap.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        } else if (taxFlag == TaxFlag.FLAT_20) {
            thueTncn = tongThuNhap.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);
        } else if (taxFlag == TaxFlag.COMMITMENT) {
            thueTncn = BigDecimal.ZERO;
        } else {
            // Lũy tiến từng phần 7 bậc
            thueTncn = calculateProgressiveTax(tntt);
        }

        // 7. KHỐI H: Kết quả cuối (NET TAKE-HOME)
        // Đoàn phí công đoàn cá nhân (1% lương BHXH, trần 10% lương cơ sở = 234.000đ)
        BigDecimal phiCongDoanVien = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(emp.getIsUnionMember()) && insuranceBase.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal rawUnionDues = insuranceBase.multiply(LaborLawConstants.RATE_UNION_DUES_EMPLOYEE);
            BigDecimal unionCap = complianceService.getUnionDuesCap();
            phiCongDoanVien = (unionCap.compareTo(BigDecimal.ZERO) > 0 && rawUnionDues.compareTo(unionCap) > 0)
                    ? unionCap : rawUnionDues;
            phiCongDoanVien = phiCongDoanVien.setScale(2, RoundingMode.HALF_UP);
        }

        // THỰC NHẬN = Tổng thu nhập - BH NLĐ - Thuế TNCN - Phí công đoàn viên - Truy thu thuế TNCN
        BigDecimal rawThucNhan = tongThuNhap.subtract(congBhNld).subtract(thueTncn).subtract(phiCongDoanVien).subtract(truyThuThueTncn);
        if (rawThucNhan.compareTo(BigDecimal.ZERO) < 0) {
            rawThucNhan = BigDecimal.ZERO;
        }
        // Làm tròn đến hàng nghìn đồng theo chuẩn kế toán Việt Nam (ROUND(x, -3)), hoặc tròn đơn vị đồng theo Phiếu lương Hải Minh
        BigDecimal thucNhan = isHaiMinhMode
                ? rawThucNhan.setScale(0, RoundingMode.HALF_UP)
                : PayrollRoundingUtils.roundToThousand(rawThucNhan);

        return PayrollItem.builder()
                .payrollId(payrollId)
                .employeeId(emp.getId())
                .employeeCode(emp.getEmployeeCode())
                .fullName(emp.getFullName())
                .position(emp.getPosition())
                .employeeType(emp.getEmployeeType())
                .insuranceFlag(insFlag)
                .taxFlag(taxFlag)
                .congChuan(congChuan)
                .congChinhThuc(congChinhThuc)
                .congThuViec(congThuViec)
                .congTinhCom(congTinhCom)
                .ngayCongHuongPhuCap(ngayCongHuongPhuCap)
                .ngayCongCongTac(ngayCongCongTac)
                .ngayNghiPhep(ngayNghiPhep)
                .ngayNghiLe(ngayNghiLe)
                .ngayNghiKhongLuong(ngayNghiKhongLuong)
                .overtimeHours(overtimeHours)
                .nightHours(nightHours)
                .mucLuong(mucLuong)
                .heSoNangSuat(heSoNangSuat)
                .phuCapLuong(phuCapLuong)
                .luongHieuQuaKhoan(luongHieuQuaKhoan)
                .xepLoaiDanhGia(xepLoaiDanhGia)
                .tyLeHieuQua(tyLeHieuQua)
                .luongHieuQuaThucHuong(luongHieuQuaThucHuong)
                .troCapThuViec(troCapThuViec)
                .phuCapChucVu(phuCapChucVu)
                .phuCapThamNien(phuCapThamNien)
                .phuCapCom(phuCapCom)
                .phuCapXangXe(phuCapXangXe)
                .phuCapDienThoai(phuCapDienThoai)
                .phuCapLuuTru(phuCapLuuTru)
                .phuCapDocHai(phuCapDocHai)
                .phuCapTrachNhiem(phuCapTrachNhiem)
                .phuCapCongTac(phuCapCongTac)
                .thuNhap(thuNhapChinh)
                .luongTangCa(luongTangCa)
                .phuTroiDem(phuTroiDem)
                .thuongDuAn(thuongDuAn)
                .hoanThueTncn(hoanThueTncn)
                .thuNhapKhac(thuNhapKhac)
                .truyThuThueTncn(truyThuThueTncn)
                .tongThuNhap(tongThuNhap)
                .insuranceBase(insuranceBase)
                .bhxhNld(bhxhNld)
                .bhytNld(bhytNld)
                .bhtnNld(bhtnNld)
                .congBhNld(congBhNld)
                .bhxhDn(bhxhDn)
                .bhytDn(bhytDn)
                .bhtnDn(bhtnDn)
                .tnldDn(tnldDn)
                .kpcdDn(kpcdDn)
                .congBhDn(congBhDn)
                .slNpt(slNpt)
                .gtBanThan(gtBanThan)
                .gtNpt(gtNpt)
                .comMienThue(comMienThue)
                .chenhLechLtg(chenhLechLtg)
                .phuTroiDemMienThue(phuTroiDemMienThue)
                .tnct(tnct)
                .tntt(tntt)
                .thueTncn(thueTncn)
                .phiCongDoanVien(phiCongDoanVien)
                .thucNhan(thucNhan)
                .build();
    }

    /**
     * Tính thuế TNCN lũy tiến từng phần 7 bậc (Điều 22 Luật Thuế TNCN)
     */
    public BigDecimal calculateProgressiveTax(BigDecimal taxableIncome) {
        if (taxableIncome == null || taxableIncome.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal income = taxableIncome;

        // Bậc 1: Đến 5.000.000đ -> 5%
        BigDecimal b1 = new BigDecimal("5000000");
        if (income.compareTo(b1) > 0) {
            tax = tax.add(b1.multiply(new BigDecimal("0.05")));
        } else {
            return tax.add(income.multiply(new BigDecimal("0.05"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 2: 5tr - 10tr -> 10% (5tr x 10% = 500k)
        BigDecimal b2 = new BigDecimal("10000000");
        if (income.compareTo(b2) > 0) {
            tax = tax.add(new BigDecimal("5000000").multiply(new BigDecimal("0.10")));
        } else {
            return tax.add(income.subtract(b1).multiply(new BigDecimal("0.10"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 3: 10tr - 18tr -> 15% (8tr x 15% = 1.2tr)
        BigDecimal b3 = new BigDecimal("18000000");
        if (income.compareTo(b3) > 0) {
            tax = tax.add(new BigDecimal("8000000").multiply(new BigDecimal("0.15")));
        } else {
            return tax.add(income.subtract(b2).multiply(new BigDecimal("0.15"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 4: 18tr - 32tr -> 20% (14tr x 20% = 2.8tr)
        BigDecimal b4 = new BigDecimal("32000000");
        if (income.compareTo(b4) > 0) {
            tax = tax.add(new BigDecimal("14000000").multiply(new BigDecimal("0.20")));
        } else {
            return tax.add(income.subtract(b3).multiply(new BigDecimal("0.20"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 5: 32tr - 52tr -> 25% (20tr x 25% = 5tr)
        BigDecimal b5 = new BigDecimal("52000000");
        if (income.compareTo(b5) > 0) {
            tax = tax.add(new BigDecimal("20000000").multiply(new BigDecimal("0.25")));
        } else {
            return tax.add(income.subtract(b4).multiply(new BigDecimal("0.25"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 6: 52tr - 80tr -> 30% (28tr x 30% = 8.4tr)
        BigDecimal b6 = new BigDecimal("80000000");
        if (income.compareTo(b6) > 0) {
            tax = tax.add(new BigDecimal("28000000").multiply(new BigDecimal("0.30")));
        } else {
            return tax.add(income.subtract(b5).multiply(new BigDecimal("0.30"))).setScale(2, RoundingMode.HALF_UP);
        }

        // Bậc 7: Trên 80tr -> 35%
        tax = tax.add(income.subtract(b6).multiply(new BigDecimal("0.35")));
        return tax.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Thực hiện tính toán toàn bộ kỳ lương tháng và tự động phân bổ chi phí dự án (TK 622, 627, 642)
     */
    @Transactional
    public Payroll calculateMonthlyPayroll(Integer month, Integer year, Long operatorUserId) {
        Payroll payroll = payrollRepository.findByMonthAndYear(month, year)
                .orElseGet(() -> {
                    String code = String.format("PR-%04d-%02d", year, month);
                    return payrollRepository.save(Payroll.builder()
                            .payrollCode(code)
                            .month(month)
                            .year(year)
                            .standardWorkDays(LaborLawConstants.STANDARD_WORK_DAYS_DEFAULT)
                            .status(PayrollStatus.DRAFT)
                            .createdBy(operatorUserId)
                            .build());
                });

        // Nếu kỳ lương đã tồn tại các mục chi tiết hoặc phân bổ chi phí trước đó, xóa bỏ để tính toán lại chính xác
        if (payroll.getId() != null) {
            costAllocationRepository.deleteByPayrollId(payroll.getId());
            payrollItemRepository.deleteByPayrollId(payroll.getId());
            costAllocationRepository.flush();
            payrollItemRepository.flush();
        }

        // Lấy tất cả bảng chấm công tháng đã LOCKED (BF-08 Step 2: Tích hợp dữ liệu nguồn Bảng công đã khóa)
        List<MonthlyTimesheet> timesheets = timesheetRepository.findByMonthAndYearAndStatus(month, year, TimesheetStatus.LOCKED);
        if (timesheets.isEmpty()) {
            List<MonthlyTimesheet> allTs = timesheetRepository.findByMonthAndYear(month, year);
            if (!allTs.isEmpty()) {
                throw new IllegalStateException("Dữ liệu nguồn chưa hợp lệ (BF-08 Step 3): Bảng chấm công kỳ " + month + "/" + year + " chưa được Trưởng phòng Nhân sự khóa sổ Cấp 2 (LOCKED)! Vui lòng yêu cầu HR hoàn tất quy trình BF-07.");
            }
            throw new IllegalStateException("Không tìm thấy dữ liệu bảng chấm công cho kỳ " + month + "/" + year);
        }

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalEmployerCost = BigDecimal.ZERO;

        for (MonthlyTimesheet ts : timesheets) {
            Employee emp = employeeRepository.findById(ts.getEmployeeId()).orElse(null);
            if (emp == null) continue;

            Contract contract = contractRepository.findByEmployeeIdAndStatus(emp.getId(), ContractStatus.ACTIVE)
                    .orElse(null);
            if (contract == null) {
                throw new IllegalStateException("Dữ liệu nguồn không toàn vẹn (BF-08 Step 3): Nhân viên " + emp.getFullName() + " (" + emp.getEmployeeCode() + ") chưa có Hợp đồng lao động ACTIVE! Vui lòng yêu cầu HR Staff bổ sung hợp đồng theo quy trình BF-08 Step 4.");
            }

            // Đọc phụ cấp công trường động từ cấu hình BF-10
            ProjectAllowanceSnapshot allowances = resolveProjectAllowances(emp);

            PayrollCalculationInput input = PayrollCalculationInput.builder()
                    .employee(emp)
                    .contract(contract)
                    .timesheet(ts)
                    .heSoNangSuat(BigDecimal.ONE)
                    .phuCapChucVu(emp.getPositionAllowance() != null ? emp.getPositionAllowance() : (emp.getEmployeeType() == EmployeeType.OFFICE_STAFF && emp.getPosition() != null && emp.getPosition().contains("Trưởng") ? new BigDecimal("2500000") : BigDecimal.ZERO))
                    .phuCapThamNien(emp.getSeniorityAllowance() != null ? emp.getSeniorityAllowance() : BigDecimal.ZERO)
                    .phuCapCom(emp.getMealPackage())
                    .phuCapXangXe(emp.getFuelPackage() != null ? emp.getFuelPackage() : LaborLawConstants.FUEL_ALLOWANCE_DEFAULT)
                    .phuCapDienThoai(emp.getPhonePackage() != null ? emp.getPhonePackage() : LaborLawConstants.PHONE_ALLOWANCE_DEFAULT)
                    .phuCapLuuTru(allowances.getSiteLodging())
                    .phuCapDocHai(allowances.getHazard())
                    .phuCapTrachNhiem(allowances.getProjectResponsibility())
                    .luongHieuQua(emp.getPerformanceSalary())
                    .xepLoaiDanhGia(emp.getEvaluationGrade())
                    .tyLeHieuQua(emp.getEvaluationPct())
                    .haiMinhStandardMode(emp.getPerformanceSalary() != null)
                    .thuongDuAn(BigDecimal.ZERO)
                    .build();

            PayrollItem item = calculatePayrollItem(payroll.getId(), input);
            item = payrollItemRepository.save(item);

            totalGross = totalGross.add(item.getTongThuNhap());
            totalNet = totalNet.add(item.getThucNhan());
            totalEmployerCost = totalEmployerCost.add(item.getCongBhDn());

            // Phân bổ chi phí dự án (Project Cost Allocation)
            allocateProjectCosts(payroll, item, emp);
        }

        payroll.setTotalGrossSalary(totalGross);
        payroll.setTotalNetSalary(totalNet);
        payroll.setTotalEmployerCost(totalEmployerCost);
        payroll.setStatus(PayrollStatus.CALCULATED);
        return payrollRepository.save(payroll);
    }

    /**
     * Bóc tách và phân bổ chi phí lương + bảo hiểm doanh nghiệp vào các tài khoản kế toán TK 622, 627, 642
     */
    private void allocateProjectCosts(Payroll payroll, PayrollItem item, Employee emp) {
        BigDecimal totalCost = item.getTongThuNhap().add(item.getCongBhDn());

        if (emp.getEmployeeType() == EmployeeType.OFFICE_STAFF) {
            // Cán bộ văn phòng -> 100% vào TK 642 (Chi phí quản lý doanh nghiệp)
            costAllocationRepository.save(ProjectCostAllocation.builder()
                    .payrollItemId(item.getId())
                    .payrollId(payroll.getId())
                    .employeeId(emp.getId())
                    .projectId(null)
                    .accountCode(AccountCode.TK_642)
                    .allocationRatio(BigDecimal.ONE)
                    .allocatedAmount(totalCost)
                    .build());
        } else {
            // Kỹ sư công trường -> Kiểm tra dự án được phân công
            List<EngineerAssignment> assignments = assignmentRepository.findByEmployeeIdAndStatus(emp.getId(), "ACTIVE");
            if (assignments.isEmpty()) {
                // Nếu chưa gán cụ thể dự án nào thì tạm tính TK 627 (Sản xuất chung)
                costAllocationRepository.save(ProjectCostAllocation.builder()
                        .payrollItemId(item.getId())
                        .payrollId(payroll.getId())
                        .employeeId(emp.getId())
                        .projectId(null)
                        .accountCode(AccountCode.TK_627)
                        .allocationRatio(BigDecimal.ONE)
                        .allocatedAmount(totalCost)
                        .build());
            } else {
                // Chia đều cho các dự án đang tham gia (TK 622 - Nhân công trực tiếp)
                BigDecimal ratio = BigDecimal.ONE.divide(BigDecimal.valueOf(assignments.size()), 4, RoundingMode.HALF_UP);
                BigDecimal amountPerProject = totalCost.multiply(ratio).setScale(2, RoundingMode.HALF_UP);

                for (EngineerAssignment assign : assignments) {
                    costAllocationRepository.save(ProjectCostAllocation.builder()
                            .payrollItemId(item.getId())
                            .payrollId(payroll.getId())
                            .employeeId(emp.getId())
                            .projectId(assign.getProjectId())
                            .accountCode(AccountCode.TK_622)
                            .allocationRatio(ratio)
                            .allocatedAmount(amountPerProject)
                            .build());
                }
            }
        }
    }
}
