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

/**
 * Unit Test chuyên sâu các trường hợp biên & đặc thù (Edge Cases) cho Payroll Engine (FE-10 / UC-21)
 * Bao quát các kịch bản: Hợp đồng thử việc, Công làm việc lẻ tháng (Proration), Thuế khoán 10%,
 * Giảm trừ người phụ thuộc vượt mức thu nhập, Miễn bảo hiểm.
 */
@ExtendWith(MockitoExtension.class)
class PayrollEngineEdgeCasesTest {

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
    @DisplayName("Proration: Nhân sự vào làm giữa tháng (13/26 ngày công) -> Lương chính giảm 50%")
    void testProratedSalary_PartialMonthWorked() {
        BigDecimal baseSalary = new BigDecimal("13000000"); // 13 triệu
        Employee emp = Employee.builder()
                .id(1L)
                .employeeCode("HM-ENG-05")
                .fullName("Kỹ Sư Mới Tuyển")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract contract = Contract.builder()
                .employeeId(1L)
                .baseSalary(baseSalary)
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("13.00"))
                .officialWorkDays(new BigDecimal("13.00"))
                .probationWorkDays(BigDecimal.ZERO)
                .mealWorkDays(new BigDecimal("13.00"))
                .overtimeHours(BigDecimal.ZERO)
                .nightHours(BigDecimal.ZERO)
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .heSoNangSuat(BigDecimal.ZERO)
                .phuCapXangXe(BigDecimal.ZERO)
                .phuCapDienThoai(BigDecimal.ZERO)
                .phuCapCom(new BigDecimal("520000")) // 13 ngày x 40k = 520k
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(1L, input);

        // Lương chính = 13M / 26 x 13 = 6.500.000 đ
        // Tổng thu nhập GROSS = 6.5M + 520k (cơm) = 7.020.000 đ
        assertThat(item.getTongThuNhap()).isEqualByComparingTo(new BigDecimal("7020000.00"));
        // Vì thu nhập (7.02M) < Mức giảm trừ bản thân (11M) -> Thuế TNCN phải bằng 0 đ
        assertThat(item.getThueTncn()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Thuế suất phẳng 10%: Áp dụng cho lao động vãng lai/thời vụ (TaxFlag.FLAT_10_PERCENT)")
    void testFlatTaxRate_FreelanceWorker() {
        BigDecimal baseSalary = new BigDecimal("10000000");
        Employee emp = Employee.builder()
                .id(2L)
                .employeeCode("VL-01")
                .fullName("Thợ Cơ Khí Vãng Lai")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract contract = Contract.builder()
                .employeeId(2L)
                .baseSalary(baseSalary)
                .insuranceFlag(InsuranceFlag.NO_INSURANCE) // Miễn đóng BHXH
                .taxFlag(TaxFlag.FLAT_10) // Khấu trừ 10% tại nguồn
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("26.00"))
                .officialWorkDays(new BigDecimal("26.00"))
                .probationWorkDays(BigDecimal.ZERO)
                .mealWorkDays(new BigDecimal("26.00"))
                .overtimeHours(BigDecimal.ZERO)
                .nightHours(BigDecimal.ZERO)
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .heSoNangSuat(BigDecimal.ZERO)
                .phuCapXangXe(BigDecimal.ZERO)
                .phuCapDienThoai(BigDecimal.ZERO)
                .phuCapCom(BigDecimal.ZERO)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(1L, input);

        // Tổng thu nhập GROSS = 10M + 1.04M (tiền cơm 26 ngày x 40k) = 11.040.000 đ
        assertThat(item.getTongThuNhap()).isEqualByComparingTo(new BigDecimal("11040000.00"));
        // Thuế TNCN (10% GROSS) = 11.040.000 x 10% = 1.104.000 đ
        assertThat(item.getThueTncn()).isEqualByComparingTo(new BigDecimal("11040000.00").multiply(new BigDecimal("0.10")));
        // Miễn bảo hiểm -> BHXH NLĐ = 0
        assertThat(item.getCongBhNld()).isEqualByComparingTo(BigDecimal.ZERO);
        // Thực nhận = 11.040.000 - 1.104.000 = 9.936.000 đ
        assertThat(item.getThucNhan()).isEqualByComparingTo(new BigDecimal("9936000.00"));
    }

    @Test
    @DisplayName("Nhiều người phụ thuộc: Tổng giảm trừ gia cảnh lớn hơn thu nhập -> Thuế TNCN = 0đ")
    void testManyDependents_ZeroTax() {
        BigDecimal baseSalary = new BigDecimal("18000000"); // 18 triệu
        Employee emp = Employee.builder()
                .id(3L)
                .employeeCode("HM-ENG-08")
                .fullName("Kỹ Sư Có 3 Con Nhỏ")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(3) // 3 người phụ thuộc = 3 x 4.4M = 13.2M + 11M bản thân = 24.2M giảm trừ
                .build();

        Contract contract = Contract.builder()
                .employeeId(3L)
                .baseSalary(baseSalary)
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
                .heSoNangSuat(BigDecimal.ZERO)
                .phuCapXangXe(BigDecimal.ZERO)
                .phuCapDienThoai(BigDecimal.ZERO)
                .phuCapCom(BigDecimal.ZERO)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(1L, input);

        // Thu nhập chịu thuế = 18M - BHXH (18M x 10.5% = 1.89M) = 16.11M
        // Tổng giảm trừ gia cảnh = 11M + 13.2M = 24.2M > 16.11M -> Thuế TNCN = 0
        assertThat(item.getThueTncn()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Làm thêm giờ và trực đêm công trường: Tính đúng phụ trội đêm và phần miễn thuế")
    void testOvertimeAndNightShiftCalculation() {
        BigDecimal baseSalary = new BigDecimal("10400000"); // 10.4 triệu -> Lương giờ chuẩn = 10.4M / (26 x 8) = 50.000 đ/h
        Employee emp = Employee.builder()
                .id(4L)
                .employeeCode("HM-ENG-09")
                .fullName("Kỹ Sư Trực Đêm Đổ Bê Tông")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .isUnionMember(false)
                .dependentsCount(0)
                .build();

        Contract contract = Contract.builder()
                .employeeId(4L)
                .baseSalary(baseSalary)
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("26.00"))
                .officialWorkDays(new BigDecimal("26.00"))
                .mealWorkDays(new BigDecimal("26.00"))
                .overtimeHours(new BigDecimal("10.00")) // 10 giờ làm thêm ngày thường (150%)
                .nightHours(new BigDecimal("10.00"))    // 10 giờ phụ trội ca đêm (30%)
                .build();

        PayrollEngineService.PayrollCalculationInput input = PayrollEngineService.PayrollCalculationInput.builder()
                .employee(emp)
                .contract(contract)
                .timesheet(ts)
                .heSoNangSuat(BigDecimal.ZERO)
                .phuCapXangXe(BigDecimal.ZERO)
                .phuCapDienThoai(BigDecimal.ZERO)
                .phuCapCom(BigDecimal.ZERO)
                .build();

        PayrollItem item = payrollEngineService.calculatePayrollItem(1L, input);

        // Tiền lương OT = 10h x 50.000đ/h x 1.5 = 750.000 đ
        assertThat(item.getLuongTangCa()).isEqualByComparingTo(new BigDecimal("750000.00"));

        // Phụ trội ca đêm = 10h x 50.000đ/h x 0.3 = 150.000 đ
        assertThat(item.getPhuTroiDem()).isEqualByComparingTo(new BigDecimal("150000.00"));

        // Phần chênh lệch lương OT vượt giờ thường (50k x 0.5 x 10h = 250k) và phụ trội đêm (150k) được miễn thuế
        // Tổng thu nhập GROSS = 10.4M + 750k (OT) + 150k (Dem) + 1.04M (Com 26 ngay x 40k) = 12.340.000 đ
        assertThat(item.getTongThuNhap()).isEqualByComparingTo(new BigDecimal("12340000.00"));
    }
}
