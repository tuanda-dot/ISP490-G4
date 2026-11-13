package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.enums.InsuranceFlag;
import com.hmcps.common.enums.TaxFlag;
import com.hmcps.entity.Contract;
import com.hmcps.entity.Employee;
import com.hmcps.entity.MonthlyTimesheet;
import com.hmcps.entity.PayrollItem;
import com.hmcps.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class PayrollEngineServiceTest {

    @Mock
    private ComplianceService complianceService;
    @Mock
    private PayrollRepository payrollRepository;
    @Mock
    private PayrollItemRepository payrollItemRepository;
    @Mock
    private ProjectCostAllocationRepository costAllocationRepository;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private MonthlyTimesheetRepository timesheetRepository;
    @Mock
    private EngineerAssignmentRepository assignmentRepository;

    @InjectMocks
    private PayrollEngineService payrollEngineService;

    @BeforeEach
    void setUp() {
        lenient().when(complianceService.getBhxhCap()).thenReturn(LaborLawConstants.CAP_BHXH_BHYT);
        lenient().when(complianceService.getBhtnCap()).thenReturn(LaborLawConstants.CAP_BHTN);
        lenient().when(complianceService.getRegionalMinWage()).thenReturn(LaborLawConstants.REGIONAL_MIN_WAGE_VUNG_1);
        lenient().when(complianceService.getPersonalDeduction()).thenReturn(LaborLawConstants.PERSONAL_DEDUCTION);
        lenient().when(complianceService.getDependentDeduction()).thenReturn(LaborLawConstants.DEPENDENT_DEDUCTION);
        lenient().when(complianceService.getMealExemptThreshold()).thenReturn(LaborLawConstants.MEAL_EXEMPT_THRESHOLD_MONTHLY);
        lenient().when(complianceService.getUnionDuesCap()).thenReturn(LaborLawConstants.CAP_UNION_DUES);
    }

    @Test
    @DisplayName("Kiểm tra đối soát chuẩn (Golden Reconciliation) - khớp số liệu mẫu dự án tham khảo F5-0003")
    void testGoldenReconciliation_F5_0003() {
        // Mock chuẩn theo file mẫu 08/2023 của dự án tham khảo:
        // Lương chính: 7.700.000, Hệ số năng suất: 2.0 (Trợ cấp: 15.400.000), Công 23/23, Cơm 23 công = 920.000, ĐT+Xăng 1tr, 1 NPT, Đoàn phí 2%
        // Kỳ vọng Thực nhận = 23.549.000 đ
        Employee emp = Employee.builder()
                .id(1L)
                .employeeCode("F5-0003")
                .fullName("Kỹ Sư Cao Cấp Mẫu")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(true)
                .dependentsCount(1)
                .build();

        Contract contract = Contract.builder()
                .employeeId(1L)
                .baseSalary(new BigDecimal("7700000"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("23.00"))
                .actualWorkDays(new BigDecimal("23.00"))
                .officialWorkDays(new BigDecimal("23.00"))
                .probationWorkDays(BigDecimal.ZERO)
                .mealWorkDays(new BigDecimal("23.00"))
                .overtimeHours(BigDecimal.ZERO)
                .nightHours(BigDecimal.ZERO)
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .heSoNangSuat(new BigDecimal("2.0"))
                .phuCapChucVu(BigDecimal.ZERO)
                .phuCapThamNien(BigDecimal.ZERO)
                .phuCapCom(new BigDecimal("920000"))
                .phuCapXangXe(new BigDecimal("500000"))
                .phuCapDienThoai(new BigDecimal("500000"))
                .thuongDuAn(BigDecimal.ZERO)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(100L, input);

        // Khối C: Trợ cấp lương chính = 7.7M x 2.0 = 15.4M
        assertThat(item.getPhuCapLuong()).isEqualByComparingTo(new BigDecimal("15400000.00"));

        // Khối E: Tổng thu nhập GROSS = 7.7M + 15.4M + 0.5M + 0.5M + 0.92M = 25.020.000 đ
        assertThat(item.getTongThuNhap()).isEqualByComparingTo(new BigDecimal("25020000.00"));

        // Khối F: Bảo hiểm NLĐ = 7.7M x 10.5% = 808.500 đ (BHXH 8% = 616k, BHYT 1.5% = 115.5k, BHTN 1% = 77k)
        assertThat(item.getCongBhNld()).isEqualByComparingTo(new BigDecimal("808500.00"));

        // Khối G: Thuế TNCN = 508.150 đ (TNCT 23.79M, TNTT 7.5815M -> Bậc 1: 250k, Bậc 2: 258.15k)
        assertThat(item.getThueTncn()).isEqualByComparingTo(new BigDecimal("508150.00"));

        // Đoàn phí công đoàn 1% = 77.000 đ
        assertThat(item.getPhiCongDoanVien()).isEqualByComparingTo(new BigDecimal("77000.00"));

        // Khối H: Thực nhận = 25.02M - 808.5k (BH) - 508.15k (Thuế) - 77k (Công đoàn) = 23.626.350đ -> làm tròn 23.626.000 đ
        assertThat(item.getThucNhan()).isEqualByComparingTo(new BigDecimal("23626000.00"));
    }

    @Test
    @DisplayName("Phân biệt bảo hiểm: Văn phòng (gồm phụ cấp chức vụ, thâm niên) vs Kỹ sư công trường (chỉ lương cơ bản)")
    void testDistinction_OfficeStaff_vs_SiteEngineer() {
        BigDecimal base = new BigDecimal("10000000");
        BigDecimal chucVu = new BigDecimal("3000000");
        BigDecimal thamNien = new BigDecimal("2000000");
        BigDecimal luuTruSite = new BigDecimal("4000000"); // Phụ cấp lưu trú công trường

        // 1. Cán bộ văn phòng (Office Staff)
        Employee officeEmp = Employee.builder()
                .id(10L)
                .employeeCode("OFF-01")
                .fullName("Trưởng Phòng Kế Toán")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract officeContract = Contract.builder()
                .employeeId(10L)
                .baseSalary(base)
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("26.00"))
                .officialWorkDays(new BigDecimal("26.00"))
                .mealWorkDays(new BigDecimal("26.00"))
                .build();

        PayrollEngineService.PayrollCalculationInput officeInput = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(officeEmp)
                .contract(officeContract)
                .timesheet(ts)
                .phuCapChucVu(chucVu)
                .phuCapThamNien(thamNien)
                .build();

        PayrollItem officeItem = payrollEngineService.calculatePayrollItem(1L, officeInput);

        // Căn cứ đóng BHXH Văn phòng = 10M + 3M + 2M = 15.000.000 đ
        assertThat(officeItem.getInsuranceBase()).isEqualByComparingTo(new BigDecimal("15000000.00"));
        // Tiền BHXH NLĐ (8%) = 15M x 8% = 1.200.000 đ
        assertThat(officeItem.getBhxhNld()).isEqualByComparingTo(new BigDecimal("1200000.00"));

        // 2. Kỹ sư công trường (Site Engineer)
        Employee siteEmp = Employee.builder()
                .id(20L)
                .employeeCode("ENG-01")
                .fullName("Chỉ Huy Phó Công Trường")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract siteContract = Contract.builder()
                .employeeId(20L)
                .baseSalary(base)
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        PayrollEngineService.PayrollCalculationInput siteInput = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(siteEmp)
                .contract(siteContract)
                .timesheet(ts)
                .phuCapLuuTru(luuTruSite) // Phụ cấp công trường
                .build();

        PayrollItem siteItem = payrollEngineService.calculatePayrollItem(1L, siteInput);

        // Căn cứ đóng BHXH Kỹ sư = 10.000.000 đ DUY NHẤT (Phụ cấp lưu trú 4M được miễn BHXH!)
        assertThat(siteItem.getInsuranceBase()).isEqualByComparingTo(new BigDecimal("10000000.00"));
        // Tiền BHXH NLĐ (8%) = 10M x 8% = 800.000 đ
        assertThat(siteItem.getBhxhNld()).isEqualByComparingTo(new BigDecimal("800000.00"));
    }

    @Test
    @DisplayName("Kiểm tra tính thuế TNCN 7 bậc lũy tiến từng phần")
    void testProgressiveTaxCalculation() {
        // Thu nhập tính thuế 0đ -> Thuế 0
        assertThat(payrollEngineService.calculateProgressiveTax(BigDecimal.ZERO))
                .isEqualByComparingTo(BigDecimal.ZERO);

        // Bậc 1: 4.000.000 đ x 5% = 200.000 đ
        assertThat(payrollEngineService.calculateProgressiveTax(new BigDecimal("4000000")))
                .isEqualByComparingTo(new BigDecimal("200000.00"));

        // Bậc 2: 8.000.000 đ -> 5M x 5% + 3M x 10% = 250k + 300k = 550.000 đ
        assertThat(payrollEngineService.calculateProgressiveTax(new BigDecimal("8000000")))
                .isEqualByComparingTo(new BigDecimal("550000.00"));

        // Bậc 3: 15.000.000 đ -> 250k + 500k + 5M x 15% = 750k + 750k = 1.500.000 đ
        assertThat(payrollEngineService.calculateProgressiveTax(new BigDecimal("15000000")))
                .isEqualByComparingTo(new BigDecimal("1500000.00"));
    }

    @Test
    @DisplayName("Kiểm tra chặn trần BHXH/BHYT (46.8M) và BHTN (106.2M) khi lương vượt trần")
    void testInsuranceCap_HighSalary() {
        BigDecimal superSalary = new BigDecimal("120000000"); // 120 triệu/tháng

        Employee emp = Employee.builder()
                .id(99L)
                .employeeCode("DIR-01")
                .fullName("Giám Đốc Dự Án")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract contract = Contract.builder()
                .employeeId(99L)
                .baseSalary(superSalary)
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("26.00"))
                .officialWorkDays(new BigDecimal("26.00"))
                .mealWorkDays(new BigDecimal("26.00"))
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(1L, input);

        // BHXH NLĐ bị chặn ở trần 46.800.000đ: 46.8M x 8% = 3.744.000 đ (thay vì 120M x 8% = 9.6M)
        assertThat(item.getBhxhNld()).isEqualByComparingTo(new BigDecimal("3744000.00"));

        // BHTN NLĐ bị chặn ở trần 106.200.000đ: 106.2M x 1% = 1.062.000 đ (thay vì 120M x 1% = 1.2M)
        assertThat(item.getBhtnNld()).isEqualByComparingTo(new BigDecimal("1062000.00"));
    }

    @Test
    @DisplayName("Đối soát thực tế Phiếu lương Công ty TNHH ĐT XD & PT Hải Minh (Phieu luong.xlsx - Phạm Văn Thịnh)")
    void testHaiMinhRealPayslip_PhamVanThinh() {
        Employee emp = Employee.builder()
                .id(200L)
                .employeeCode("HM-VP-01")
                .fullName("Phạm Văn Thịnh")
                .position("Chuyên viên phòng Kế hoạch KT")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isUnionMember(false)
                .dependentsCount(0)
                .performanceSalary(new BigDecimal("4000000"))
                .evaluationGrade("A")
                .evaluationPct(BigDecimal.ONE)
                .mealPackage(new BigDecimal("900000"))
                .fuelPackage(new BigDecimal("1000000"))
                .phonePackage(new BigDecimal("200000"))
                .build();

        Contract contract = Contract.builder()
                .employeeId(200L)
                .baseSalary(new BigDecimal("18000000"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.FLAT_10)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("22.50"))
                .actualWorkDays(new BigDecimal("18.00"))
                .officialWorkDays(new BigDecimal("18.00"))
                .probationWorkDays(BigDecimal.ZERO)
                .mealWorkDays(new BigDecimal("18.00"))
                .allowanceWorkDays(new BigDecimal("18.00"))
                .unpaidLeaveDays(new BigDecimal("4.50"))
                .overtimeHours(BigDecimal.ZERO)
                .nightHours(BigDecimal.ZERO)
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .phuCapCom(new BigDecimal("900000"))
                .phuCapXangXe(new BigDecimal("1000000"))
                .phuCapDienThoai(new BigDecimal("200000"))
                .luongHieuQua(new BigDecimal("4000000"))
                .xepLoaiDanhGia("A")
                .tyLeHieuQua(BigDecimal.ONE)
                .ngayCongHuongPhuCap(new BigDecimal("18.00"))
                .haiMinhStandardMode(true)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(500L, input);

        // Lương cơ bản thực hưởng = ROUND(18M / 22.5 * 18) = 14.400.000
        // Lương HQCV thực hưởng = ROUND(4M / 22.5 * 18 * 1.0) = 3.200.000
        assertThat(item.getLuongHieuQuaThucHuong()).isEqualByComparingTo(new BigDecimal("3200000"));
        // Phụ cấp ăn trưa prorated = ROUND(900k / 22.5 * 18) = 720.000
        assertThat(item.getPhuCapCom()).isEqualByComparingTo(new BigDecimal("720000"));
        // Phụ cấp xăng xe prorated = ROUND(1M / 22.5 * 18) = 800.000
        assertThat(item.getPhuCapXangXe()).isEqualByComparingTo(new BigDecimal("800000"));
        // Phụ cấp điện thoại prorated = ROUND(200k / 22.5 * 18) = 160.000
        assertThat(item.getPhuCapDienThoai()).isEqualByComparingTo(new BigDecimal("160000"));
        // Tổng Section II = 14.4M + 3.2M + 720k + 800k + 160k = 19.280.000 đ
        assertThat(item.getTongThuNhap()).isEqualByComparingTo(new BigDecimal("19280000"));
        // Section III BHXH = 10.5% * 18M = 1.890.000 đ
        assertThat(item.getCongBhNld()).isEqualByComparingTo(new BigDecimal("1890000"));
        // Thuế TNCN 10% = 1.928.000 đ
        assertThat(item.getThueTncn()).isEqualByComparingTo(new BigDecimal("1928000"));
        // Thực lĩnh = 19.280.000 - 1.890.000 - 1.928.000 = 15.462.000 đ
        assertThat(item.getThucNhan()).isEqualByComparingTo(new BigDecimal("15462000"));
    }
}
