package com.hmcps.controller;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagementControllersTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private EngineerAssignmentRepository assignmentRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private MonthlyTimesheetRepository timesheetRepository;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private PayrollItemRepository payrollItemRepository;
    @Mock
    private PayrollRepository payrollRepository;
    @Mock
    private ProjectCostAllocationRepository costAllocationRepository;

    @InjectMocks
    private EmployeeController employeeController;

    @InjectMocks
    private DepartmentController departmentController;

    @InjectMocks
    private ProjectController projectController;

    @InjectMocks
    private AttendanceAdjustmentController adjustmentController;

    @InjectMocks
    private PayslipController payslipController;

    @InjectMocks
    private DashboardController dashboardController;

    @Test
    @DisplayName("EmployeeController: Đăng ký Face ID thành công")
    void testRegisterFaceId() {
        Long empId = 1L;
        Employee emp = Employee.builder()
                .id(empId)
                .fullName("Trần Văn Nhân Viên")
                .isFaceRegistered(false)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeController.RegisterFaceIdRequest req = new EmployeeController.RegisterFaceIdRequest();
        req.setFaceImageUrl("https://storage.haiminh.vn/faces/emp1.jpg");
        req.setFaceEmbedding("[0.123, -0.456, 0.789]");

        ResponseEntity<Employee> resp = employeeController.registerFaceId(empId, req);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getIsFaceRegistered()).isTrue();
        assertThat(resp.getBody().getFaceImageUrl()).isEqualTo("https://storage.haiminh.vn/faces/emp1.jpg");
    }

    @Test
    @DisplayName("EmployeeController: Cảnh báo hợp đồng sắp hết hạn trong 30 ngày")
    void testGetExpiringContracts() {
        LocalDate today = LocalDate.now();
        Contract contract = Contract.builder()
                .id(1L)
                .contractNumber("HD-2026-001")
                .employeeId(2L)
                .endDate(today.plusDays(15))
                .status(ContractStatus.ACTIVE)
                .build();

        when(contractRepository.findByEndDateBetweenAndStatus(eq(today), any(LocalDate.class), eq(ContractStatus.ACTIVE)))
                .thenReturn(List.of(contract));

        ResponseEntity<List<Contract>> resp = employeeController.getExpiringContracts(30);

        assertThat(resp.getBody()).hasSize(1);
        assertThat(resp.getBody().get(0).getContractNumber()).isEqualTo("HD-2026-001");
    }

    @Test
    @DisplayName("ProjectController: Điều động kỹ sư hiện trường vào dự án")
    void testAssignEngineer() {
        Long projId = 10L;
        Project project = Project.builder().id(projId).name("Cầu Thủ Thiêm 4").build();

        when(projectRepository.findById(projId)).thenReturn(Optional.of(project));
        when(assignmentRepository.save(any(EngineerAssignment.class))).thenAnswer(i -> i.getArgument(0));

        ProjectController.AssignEngineerRequest req = new ProjectController.AssignEngineerRequest();
        req.setEmployeeId(5L);
        req.setRoleOnSite("Chỉ huy phó");
        req.setAssignedDate(LocalDate.now());

        ResponseEntity<EngineerAssignment> resp = projectController.assignEngineer(projId, req);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getProjectId()).isEqualTo(projId);
        assertThat(resp.getBody().getRoleOnSite()).isEqualTo("Chỉ huy phó");
        assertThat(resp.getBody().getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("AttendanceAdjustmentController: Duyệt đơn giải trình chấm công bù thành công")
    void testAdjustAttendance() {
        Long empId = 3L;
        LocalDate date = LocalDate.now();

        when(attendanceRepository.findByEmployeeIdAndWorkDate(empId, date)).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        AttendanceAdjustmentController.AttendanceAdjustmentRequest req = new AttendanceAdjustmentController.AttendanceAdjustmentRequest();
        req.setEmployeeId(empId);
        req.setWorkDate(date);
        req.setShiftId(1L);
        req.setActualHours(new BigDecimal("8.00"));
        req.setReason("Camera laptop bị hỏng, có Chỉ huy trưởng xác nhận");
        req.setApprovedBy(99L);

        ResponseEntity<Attendance> resp = adjustmentController.adjustAttendance(req);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getStatus()).isEqualTo(AttendanceStatus.MANUAL_ADJUSTED);
        assertThat(resp.getBody().getActualHours()).isEqualTo(new BigDecimal("8.00"));
        assertThat(resp.getBody().getNotes()).contains("Lý do: Camera laptop bị hỏng");
    }

    @Test
    @DisplayName("PayslipController: Mở xem phiếu lương cá nhân thành công")
    void testViewPayslip() {
        Long payslipId = 100L;
        Payslip payslip = Payslip.builder()
                .id(payslipId)
                .employeeId(1L)
                .month(10)
                .year(2026)
                .status("SENT")
                .build();

        when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));
        when(payslipRepository.save(any(Payslip.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<Payslip> resp = payslipController.markPayslipAsViewed(payslipId);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getStatus()).isEqualTo("VIEWED");
        assertThat(resp.getBody().getViewedAt()).isNotNull();
    }

    @Test
    @DisplayName("DashboardController: Thống kê tổng quan chi phí lương Ban Giám đốc")
    void testGetExecutiveDashboard() {
        Payroll payroll = Payroll.builder()
                .id(1L)
                .month(10)
                .year(2026)
                .totalGrossSalary(new BigDecimal("500000000"))
                .isAccountingBalanced(true)
                .build();

        when(payrollRepository.findByMonthAndYear(10, 2026)).thenReturn(Optional.of(payroll));
        when(employeeRepository.findAll()).thenReturn(List.of(
                Employee.builder().id(1L).employeeType(EmployeeType.OFFICE_STAFF).build(),
                Employee.builder().id(2L).employeeType(EmployeeType.SITE_ENGINEER).build()
        ));
        when(projectRepository.findByStatus("ACTIVE")).thenReturn(List.of(new Project()));

        ResponseEntity<DashboardController.ExecutiveDashboardResponse> resp =
                dashboardController.getExecutiveDashboard(10, 2026);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getTotalEmployees()).isEqualTo(2);
        assertThat(resp.getBody().getTotalOfficeStaff()).isEqualTo(1);
        assertThat(resp.getBody().getTotalSiteEngineers()).isEqualTo(1);
        assertThat(resp.getBody().getTotalActiveProjects()).isEqualTo(1);
        assertThat(resp.getBody().isBalanced()).isTrue();
    }
}
