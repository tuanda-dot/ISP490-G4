package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.common.enums.*;
import com.hmcps.common.exception.BusinessException;
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
import java.time.LocalDate;
import java.time.YearMonth;
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
    private final OvertimeRequestRepository overtimeRequestRepository;
    private final PerformanceEvaluationRepository performanceEvaluationRepository;

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
     * Quy chế tiền lương Hải Minh:
     * - KHÔNG tính lương trên bảng lương nhân viên cho Ban Giám đốc (DIRECTOR / CEO).
     * - VẪN tính lương đầy đủ theo HĐLĐ cho các Trưởng phòng (HR_MANAGER, CHIEF_ACCOUNTANT),
     *   Kỹ sư trưởng / Chỉ huy trưởng công trường (SITE_MANAGER) và toàn bộ nhân viên, kỹ sư.
     */
    public static boolean isExcludedDepartmentManager(Employee emp) {
        if (emp == null) return false;
        String r = emp.getRole() != null ? emp.getRole().trim().toUpperCase(java.util.Locale.ROOT).replaceFirst("^ROLE_", "") : "";
        String p = emp.getPosition() != null ? emp.getPosition().trim().toLowerCase(java.util.Locale.ROOT) : "";
        if (java.util.Set.of("DIRECTOR", "CEO").contains(r)) {
            return true;
        }
        return p.contains("tổng giám đốc")
                || p.contains("tong giam doc")
                || p.contains("giám đốc")
                || p.contains("giam doc");
    }

    /**
     * Quy chế phúc lợi Hải Minh (Note OT.docx):
     * Nghỉ ốm dài ngày (SICK_LONG - nằm viện/điều trị dài hạn):
     * - Cấp Trưởng phòng trở lên (HR_MANAGER, CHIEF_ACCOUNTANT, SITE_MANAGER / Chỉ huy trưởng / isDepartmentHead):
     *   Được hưởng 50% lương cơ bản theo ngày công (quy đổi 0,5 công hưởng lương / ngày nghỉ ốm dài).
     * - Cấp Nhân viên / Kỹ sư: 0% lương (Công đoàn & công ty thăm hỏi riêng).
     */
    public static boolean isSickLongHalfPayManager(Employee emp) {
        if (emp == null) return false;
        if (Boolean.TRUE.equals(emp.getIsDepartmentHead())) return true;
        String r = emp.getRole() != null ? emp.getRole().trim().toUpperCase(java.util.Locale.ROOT).replaceFirst("^ROLE_", "") : "";
        if (java.util.Set.of("HR_MANAGER", "CHIEF_ACCOUNTANT", "SITE_MANAGER", "DIRECTOR", "CEO").contains(r)) {
            return true;
        }
        String p = emp.getPosition() != null ? emp.getPosition().trim().toLowerCase(java.util.Locale.ROOT) : "";
        return p.contains("trưởng phòng")
                || p.contains("truong phong")
                || p.contains("kế toán trưởng")
                || p.contains("ke toan truong")
                || p.contains("chỉ huy trưởng")
                || p.contains("chi huy truong")
                || p.contains("kỹ sư trưởng")
                || p.contains("ky su truong")
                || p.contains("giám đốc")
                || p.contains("giam doc");
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
        private BigDecimal giamTruXepLoai;
        private Boolean haiMinhStandardMode;
        // Tách giờ OT theo đúng hệ số từng đơn đã duyệt/hậu kiểm (150%, 200%, 300%, ca đêm 180%)
        private List<OvertimeRequest> approvedOvertimeItems;
    }

    /**
     * Tính toán chi tiết 8 khối cột (A -> H) cho 1 nhân sự trong kỳ lương.
     */
    public PayrollItem calculatePayrollItem(Long payrollId, PayrollCalculationInput input) {
        Employee emp = input.getEmployee();
        Contract contract = input.getContract();
        MonthlyTimesheet ts = input.getTimesheet();

        // Quy chế Hải Minh: Không tính lương cho Ban Giám đốc (vẫn tính đầy đủ cho các Trưởng phòng, Kỹ sư trưởng & Nhân viên)
        if (isExcludedDepartmentManager(emp)) {
            return PayrollItem.builder()
                    .payrollId(payrollId)
                    .employeeId(emp.getId())
                    .employeeCode(emp.getEmployeeCode())
                    .fullName(emp.getFullName())
                    .position(emp.getPosition())
                    .employeeType(emp.getEmployeeType())
                    .insuranceFlag(InsuranceFlag.NO_INSURANCE)
                    .taxFlag(TaxFlag.COMMITMENT)
                    .congChuan(ts != null && ts.getStandardWorkDays() != null ? ts.getStandardWorkDays() : LaborLawConstants.STANDARD_WORK_DAYS_DEFAULT)
                    .congChinhThuc(BigDecimal.ZERO).congThuViec(BigDecimal.ZERO).congTinhCom(BigDecimal.ZERO)
                    .ngayCongHuongPhuCap(BigDecimal.ZERO).ngayCongCongTac(BigDecimal.ZERO)
                    .ngayNghiPhep(BigDecimal.ZERO).ngayNghiLe(BigDecimal.ZERO).ngayNghiKhongLuong(BigDecimal.ZERO)
                    .overtimeHours(BigDecimal.ZERO).nightHours(BigDecimal.ZERO)
                    .mucLuong(BigDecimal.ZERO).heSoNangSuat(BigDecimal.ZERO).phuCapLuong(BigDecimal.ZERO)
                    .luongHieuQuaKhoan(BigDecimal.ZERO).xepLoaiDanhGia("N/A").tyLeHieuQua(BigDecimal.ZERO).luongHieuQuaThucHuong(BigDecimal.ZERO)
                    .troCapThuViec(BigDecimal.ZERO).phuCapChucVu(BigDecimal.ZERO).phuCapThamNien(BigDecimal.ZERO)
                    .phuCapCom(BigDecimal.ZERO).phuCapXangXe(BigDecimal.ZERO).phuCapDienThoai(BigDecimal.ZERO)
                    .phuCapLuuTru(BigDecimal.ZERO).phuCapDocHai(BigDecimal.ZERO).phuCapTrachNhiem(BigDecimal.ZERO).phuCapCongTac(BigDecimal.ZERO)
                    .thuNhap(BigDecimal.ZERO).luongTangCa(BigDecimal.ZERO).phuTroiDem(BigDecimal.ZERO)
                    .thuongDuAn(BigDecimal.ZERO).hoanThueTncn(BigDecimal.ZERO).thuNhapKhac(BigDecimal.ZERO).truyThuThueTncn(BigDecimal.ZERO).giamTruXepLoai(BigDecimal.ZERO)
                    .tongThuNhap(BigDecimal.ZERO).insuranceBase(BigDecimal.ZERO)
                    .bhxhNld(BigDecimal.ZERO).bhytNld(BigDecimal.ZERO).bhtnNld(BigDecimal.ZERO).congBhNld(BigDecimal.ZERO)
                    .bhxhDn(BigDecimal.ZERO).bhytDn(BigDecimal.ZERO).bhtnDn(BigDecimal.ZERO).tnldDn(BigDecimal.ZERO).kpcdDn(BigDecimal.ZERO).congBhDn(BigDecimal.ZERO)
                    .slNpt(0).gtBanThan(BigDecimal.ZERO).gtNpt(BigDecimal.ZERO)
                    .comMienThue(BigDecimal.ZERO).chenhLechLtg(BigDecimal.ZERO).phuTroiDemMienThue(BigDecimal.ZERO)
                    .tnct(BigDecimal.ZERO).tntt(BigDecimal.ZERO).thueTncn(BigDecimal.ZERO)
                    .phiCongDoanVien(BigDecimal.ZERO).thucNhan(BigDecimal.ZERO)
                    .build();
        }

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
        BigDecimal giamTruXepLoai = input.getGiamTruXepLoai() != null ? input.getGiamTruXepLoai() : BigDecimal.ZERO;

        // 4. KHỐI E: Thu nhập & Tổng thu nhập (GROSS)
        BigDecimal holidayBaseDays = totalActualDays.add(ngayNghiLe);
        BigDecimal thuNhapChinh;
        if (isHaiMinhMode) {
            // Công thức chuẩn Phiếu lương thực tế Hải Minh (Phieu luong.xlsx):
            // Nghỉ Lễ, Tết (ngayNghiLe) hưởng 100% Lương cơ bản; Lương HQCV tính trên ngày đi làm + phép hợp lệ
            BigDecimal luongCoBanThucHuong = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? mucLuong.multiply(holidayBaseDays).divide(congChuan, 0, RoundingMode.HALF_UP)
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

            // Nghỉ Lễ, Tết hưởng nguyên Lương Cơ Bản; ngày công đi làm hưởng trọn đơn giá cố định
            BigDecimal holidayBasePay = (congChuan.compareTo(BigDecimal.ZERO) > 0 && ngayNghiLe.compareTo(BigDecimal.ZERO) > 0)
                    ? mucLuong.multiply(ngayNghiLe).divide(congChuan, 6, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            thuNhapChinh = congChuan.compareTo(BigDecimal.ZERO) > 0
                    ? totalFixedBase.divide(congChuan, 6, RoundingMode.HALF_UP)
                            .multiply(totalActualDays)
                            .add(holidayBasePay)
                            .add(phuCapCom)
                            .setScale(2, RoundingMode.HALF_UP)
                    : phuCapCom;
        }

        // Tiền lương làm thêm giờ (OT) theo quy chế Hải Minh:
        //  - Ngày thường, ban đêm, ngày nghỉ hàng tuần (T7/CN): 150%
        //  - Ngày Lễ, Tết: 200%
        //  - Trực đêm công trường (SITE_NIGHT_DUTY): Quy đổi 1.5 ngày công trực tiếp (tối đa 10 buổi/tháng), KHÔNG tính OT giờ lẻ
        BigDecimal hourlyRate = congChuan.compareTo(BigDecimal.ZERO) > 0
                ? mucLuong.divide(congChuan.multiply(LaborLawConstants.STANDARD_WORK_HOURS_PER_DAY), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal luongTangCa = BigDecimal.ZERO;
        BigDecimal chenhLechLtg = BigDecimal.ZERO;
        BigDecimal phuTroiDem = BigDecimal.ZERO;
        BigDecimal phuTroiDemMienThue = BigDecimal.ZERO;

        List<OvertimeRequest> approvedOts = input.getApprovedOvertimeItems();
        if (approvedOts != null && !approvedOts.isEmpty()) {
            BigDecimal itemizedDayOtHours = BigDecimal.ZERO;

            for (OvertimeRequest ot : approvedOts) {
                if (!"APPROVED".equalsIgnoreCase(ot.getStatus())) continue;
                String otType = ot.getOtType() != null ? ot.getOtType().trim().toUpperCase() : "WEEKDAY_150";
                if ("SITE_NIGHT_DUTY".equals(otType) || Boolean.TRUE.equals(ot.getIsNightDuty())) {
                    continue; // Trực đêm đã quy đổi thành 1.5 ngày công vào bảng công
                }
                BigDecimal otH = ot.getPayableOtHours() != null
                        ? ot.getPayableOtHours()
                        : (ot.getOtHours() != null ? ot.getOtHours() : BigDecimal.ZERO);
                if (otH.compareTo(BigDecimal.ZERO) <= 0) continue;

                boolean isHolidayOt = "HOLIDAY_200".equals(otType) || "HOLIDAY_300".equals(otType);
                BigDecimal mult = isHolidayOt ? LaborLawConstants.MULTIPLIER_OT_HOLIDAY : LaborLawConstants.MULTIPLIER_OT_WEEKDAY;
                BigDecimal pay = otH.multiply(hourlyRate).multiply(mult);
                BigDecimal exemptRatio = mult.subtract(BigDecimal.ONE).max(BigDecimal.ZERO);
                luongTangCa = luongTangCa.add(pay);
                chenhLechLtg = chenhLechLtg.add(otH.multiply(hourlyRate).multiply(exemptRatio));
                itemizedDayOtHours = itemizedDayOtHours.add(otH);
            }

            BigDecimal residualOt = overtimeHours.subtract(itemizedDayOtHours).max(BigDecimal.ZERO);
            if (residualOt.compareTo(BigDecimal.ZERO) > 0) {
                luongTangCa = luongTangCa.add(residualOt.multiply(hourlyRate).multiply(LaborLawConstants.MULTIPLIER_OT_WEEKDAY));
                chenhLechLtg = chenhLechLtg.add(residualOt.multiply(hourlyRate).multiply(new BigDecimal("0.50")));
            }

            luongTangCa = luongTangCa.setScale(2, RoundingMode.HALF_UP);
            chenhLechLtg = chenhLechLtg.setScale(2, RoundingMode.HALF_UP);
        } else {
            // Fallback khi chưa có danh sách đơn OvertimeRequest chi tiết: ngày thường / đêm / cuối tuần áp phẳng 150%
            luongTangCa = overtimeHours.multiply(hourlyRate).multiply(LaborLawConstants.MULTIPLIER_OT_WEEKDAY).setScale(2, RoundingMode.HALF_UP);
            chenhLechLtg = overtimeHours.multiply(hourlyRate).multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        }

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
            BigDecimal unpaidDaysForBh = congChuan.compareTo(totalActualDays) > 0
                    ? congChuan.subtract(totalActualDays)
                    : BigDecimal.ZERO;
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
            BigDecimal regionalMinWage = complianceService.getRegionalMinWage();
            BigDecimal effectiveFloor = (isHaiMinhMode && proratedBase.compareTo(BigDecimal.ZERO) > 0 && regionalMinWage != null)
                    ? regionalMinWage
                    : BigDecimal.ZERO;

            // Áp sàn tối thiểu vùng I (5.310.000đ khi có tham gia BH) & trần BHXH/BHYT (20 lần mức tham chiếu = 46.800.000đ)
            BigDecimal baseBhxh = PayrollRoundingUtils.clamp(proratedBase, effectiveFloor.min(bhxhCap), bhxhCap);
            // Áp sàn tối thiểu vùng I & trần BHTN (20 lần lương tối thiểu Vùng I = 106.200.000đ)
            BigDecimal baseBhtn = PayrollRoundingUtils.clamp(proratedBase, effectiveFloor.min(bhtnCap), bhtnCap);

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

        // THỰC NHẬN = Tổng thu nhập - BH NLĐ - Thuế TNCN - Phí công đoàn viên - Truy thu thuế TNCN - Giảm trừ xếp loại C
        BigDecimal rawThucNhan = tongThuNhap
                .subtract(congBhNld)
                .subtract(thueTncn)
                .subtract(phiCongDoanVien)
                .subtract(truyThuThueTncn)
                .subtract(giamTruXepLoai);
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
                .giamTruXepLoai(giamTruXepLoai)
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

        if (payroll.getStatus() == PayrollStatus.APPROVED
                || payroll.getStatus() == PayrollStatus.LOCKED
                || payroll.getStatus() == PayrollStatus.PAID) {
            throw new BusinessException("Kỳ lương " + payroll.getPayrollCode()
                    + " đang ở trạng thái " + payroll.getStatus()
                    + ", đã khóa sổ/phê duyệt nên không được phép tính toán lại!");
        }

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
        LocalDate periodStart = LocalDate.of(year, month, 1);
        LocalDate periodEnd = YearMonth.of(year, month).atEndOfMonth();

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
            List<OvertimeRequest> approvedOtItems = overtimeRequestRepository
                    .findByEmployeeIdAndWorkDateBetween(emp.getId(), periodStart, periodEnd)
                    .stream()
                    .filter(ot -> "APPROVED".equalsIgnoreCase(ot.getStatus()))
                    .toList();

            PerformanceEvaluation monthlyEval = performanceEvaluationRepository != null
                    ? performanceEvaluationRepository.findByEmployeeIdAndEvalYearAndEvalMonth(emp.getId(), year, month).orElse(null)
                    : null;
            String evalGrade = monthlyEval != null && monthlyEval.getGrade() != null
                    ? monthlyEval.getGrade() : emp.getEvaluationGrade();
            BigDecimal evalPct = monthlyEval != null && monthlyEval.getEvaluationPct() != null
                    ? monthlyEval.getEvaluationPct() : emp.getEvaluationPct();
            BigDecimal evalRewardBonus = (monthlyEval != null
                    && "FIXED_BONUS".equalsIgnoreCase(monthlyEval.getRewardChoice())
                    && monthlyEval.getRewardBonusAmount() != null)
                    ? monthlyEval.getRewardBonusAmount()
                    : BigDecimal.ZERO;
            BigDecimal evalDeduction = (monthlyEval != null
                    && "C".equalsIgnoreCase(monthlyEval.getGrade())
                    && "DEDUCTION".equalsIgnoreCase(monthlyEval.getCActionType())
                    && monthlyEval.getDeductionAmount() != null)
                    ? monthlyEval.getDeductionAmount()
                    : BigDecimal.ZERO;

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
                    .xepLoaiDanhGia(evalGrade)
                    .tyLeHieuQua(evalPct)
                    .thuNhapKhac(evalRewardBonus)
                    .giamTruXepLoai(evalDeduction)
                    .haiMinhStandardMode(emp.getPerformanceSalary() != null)
                    .thuongDuAn(BigDecimal.ZERO)
                    .approvedOvertimeItems(approvedOtItems)
                    .build();

            PayrollItem item = calculatePayrollItem(payroll.getId(), input);
            item = payrollItemRepository.save(item);

            totalGross = totalGross.add(item.getTongThuNhap());
            totalNet = totalNet.add(item.getThucNhan());
            totalEmployerCost = totalEmployerCost.add(item.getCongBhDn());

            // Phân bổ chi phí dự án (Trưởng phòng miễn tính lương không phát sinh chi phí hạch toán)
            if (item.getTongThuNhap().compareTo(BigDecimal.ZERO) > 0 || item.getCongBhDn().compareTo(BigDecimal.ZERO) > 0) {
                allocateProjectCosts(payroll, item, emp);
            }
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
                // Chỉ huy trưởng, Kỹ sư trưởng, cán bộ HSE / an toàn công trường -> TK 627 (Chi phí sản xuất chung công trường)
                // Kỹ sư thi công / kỹ thuật trực tiếp -> TK 622 (Chi phí nhân công trực tiếp)
                AccountCode projectAccountCode = isSiteSupervisoryStaff(emp) ? AccountCode.TK_627 : AccountCode.TK_622;
                BigDecimal ratio = BigDecimal.ONE.divide(BigDecimal.valueOf(assignments.size()), 4, RoundingMode.HALF_UP);
                BigDecimal amountPerProject = totalCost.multiply(ratio).setScale(2, RoundingMode.HALF_UP);

                for (EngineerAssignment assign : assignments) {
                    costAllocationRepository.save(ProjectCostAllocation.builder()
                            .payrollItemId(item.getId())
                            .payrollId(payroll.getId())
                            .employeeId(emp.getId())
                            .projectId(assign.getProjectId())
                            .accountCode(projectAccountCode)
                            .allocationRatio(ratio)
                            .allocatedAmount(amountPerProject)
                            .build());
                }
            }
        }
    }

    /**
     * Phân loại nhân sự quản lý/giám sát chung công trường (Chỉ huy trưởng, Kỹ sư trưởng, An toàn/HSE)
     * để hạch toán vào TK 627 thay vì TK 622 theo chuẩn Thông tư 200.
     */
    private static boolean isSiteSupervisoryStaff(Employee emp) {
        if (emp == null) return false;
        String code = emp.getEmployeeCode() != null ? emp.getEmployeeCode().trim().toUpperCase(java.util.Locale.ROOT) : "";
        String role = emp.getRole() != null ? emp.getRole().trim().toUpperCase(java.util.Locale.ROOT) : "";
        String pos = emp.getPosition() != null ? emp.getPosition().trim().toLowerCase(java.util.Locale.ROOT) : "";

        return "HM-005".equals(code)
                || "HM-012".equals(code)
                || "ROLE_SITE_MANAGER".equals(role)
                || "SITE_MANAGER".equals(role)
                || "ROLE_HSE".equals(role)
                || "HSE".equals(role)
                || pos.contains("chỉ huy")
                || pos.contains("kỹ sư trưởng")
                || pos.contains("hse")
                || pos.contains("an toàn")
                || pos.contains("giám sát công trường");
    }
}
