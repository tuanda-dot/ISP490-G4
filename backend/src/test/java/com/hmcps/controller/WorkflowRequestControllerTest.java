package com.hmcps.controller;

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
import static org.mockito.Mockito.*;

/**
 * Unit Test cho WorkflowRequestController (FE-08, FE-09: UC-15, UC-16, UC-17)
 * Kiểm thử quy trình phê duyệt 2 cấp (Chỉ huy trưởng hiện trường L1 -> Trưởng phòng HR L2),
 * đồng thời kiểm tra việc cập nhật tự động vào Bảng chấm công và Nhật ký kiểm toán AuditLog.
 */
@ExtendWith(MockitoExtension.class)
class WorkflowRequestControllerTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private MonthlyTimesheetRepository timesheetRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private OvertimeRequestRepository overtimeRequestRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private AttendanceExplanationRepository attendanceExplanationRepository;
    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private WorkflowRequestController workflowController;

    // ==========================================
    // 1. OVERTIME REQUESTS (UC-16)
    // ==========================================

    @Test
    @DisplayName("Overtime: Nộp đơn đăng ký làm thêm giờ thành công")
    void testCreateOvertimeRequest() {
        Long empId = 7L;
        Long projId = 1L;

        Employee emp = Employee.builder().id(empId).employeeCode("HM-ENG-01").fullName("Trần Văn Trung").build();
        Project proj = Project.builder().id(projId).name("Cầu Nhật Tân 2").build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(proj));
        when(overtimeRequestRepository.save(any(OvertimeRequest.class))).thenAnswer(i -> {
            OvertimeRequest r = i.getArgument(0);
            r.setId(501L);
            return r;
        });

        WorkflowRequestController.OvertimeDto req = WorkflowRequestController.OvertimeDto.builder()
                .employeeId(empId)
                .projectId(projId)
                .workDate("2026-10-28")
                .startTime("18:00")
                .endTime("22:00")
                .otHours(4.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .reason("Trực kỹ thuật kiểm tra kết cấu cáp giằng")
                .build();

        ResponseEntity<WorkflowRequestController.OvertimeDto> response = workflowController.createOvertimeRequest(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING_SM");
        assertThat(response.getBody().getEmployeeName()).isEqualTo("Trần Văn Trung");
        assertThat(response.getBody().getProjectName()).isEqualTo("Cầu Nhật Tân 2");
        verify(overtimeRequestRepository, times(1)).save(any(OvertimeRequest.class));
    }

    @Test
    @DisplayName("Overtime: Chỉ huy trưởng (Site Manager) duyệt cấp 1 -> Trạng thái chuyển PENDING_HR")
    void testApproveOvertime_Level1_SiteManager() {
        Long otId = 102L; // Đã có trong seed map
        WorkflowRequestController.ApproveOtRequest body = new WorkflowRequestController.ApproveOtRequest();
        body.setRole("SITE_MANAGER");
        body.setApproved(true);

        ResponseEntity<WorkflowRequestController.OvertimeDto> response = workflowController.approveOvertime(otId, body);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSiteManagerApproval()).isEqualTo("APPROVED");
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING_HR");
    }

    @Test
    @DisplayName("Overtime: Trưởng phòng HR duyệt cấp 2 -> APPROVED & Tự động cộng giờ OT vào Timesheet")
    void testApproveOvertime_Level2_HrManager_CreditsTimesheet() {
        Long otId = 101L; // Đã được Site Manager duyệt trong seed, đang chờ HR
        WorkflowRequestController.ApproveOtRequest body = new WorkflowRequestController.ApproveOtRequest();
        body.setRole("HR_MANAGER");
        body.setApproved(true);

        MonthlyTimesheet timesheet = MonthlyTimesheet.builder()
                .id(1L)
                .employeeId(7L)
                .month(10)
                .year(2026)
                .overtimeHours(BigDecimal.ZERO)
                .nightHours(new BigDecimal("2.0"))
                .build();

        when(timesheetRepository.findByEmployeeIdAndMonthAndYear(eq(7L), eq(10), eq(2026)))
                .thenReturn(Optional.of(timesheet));

        ResponseEntity<WorkflowRequestController.OvertimeDto> response = workflowController.approveOvertime(otId, body);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getHrApproval()).isEqualTo("APPROVED");
        assertThat(response.getBody().getStatus()).isEqualTo("APPROVED");

        // Xác nhận giờ ca đêm được cộng dồn vào timesheet (2h cũ + 6h mới = 8h)
        assertThat(timesheet.getNightHours()).isEqualByComparingTo(new BigDecimal("8.0"));
        verify(timesheetRepository, times(1)).save(timesheet);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Overtime: Chỉ huy trưởng từ chối đơn OT -> REJECTED")
    void testRejectOvertime_BySiteManager() {
        Long otId = 102L;
        WorkflowRequestController.ApproveOtRequest body = new WorkflowRequestController.ApproveOtRequest();
        body.setRole("SITE_MANAGER");
        body.setApproved(false);

        ResponseEntity<WorkflowRequestController.OvertimeDto> response = workflowController.approveOvertime(otId, body);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSiteManagerApproval()).isEqualTo("REJECTED");
        assertThat(response.getBody().getStatus()).isEqualTo("REJECTED");
    }

    // ==========================================
    // 2. LEAVE REQUESTS (UC-15)
    // ==========================================

    @Test
    @DisplayName("Leave: Nộp đơn xin nghỉ phép năm thành công")
    void testCreateLeaveRequest() {
        Long empId = 6L;
        Employee emp = Employee.builder().id(empId).employeeCode("HM-HR-02").fullName("Nguyễn Thu Giang").build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(i -> {
            LeaveRequest r = i.getArgument(0);
            r.setId(601L);
            return r;
        });

        WorkflowRequestController.LeaveDto req = WorkflowRequestController.LeaveDto.builder()
                .employeeId(empId)
                .leaveType("ANNUAL")
                .startDate("2026-10-30")
                .endDate("2026-10-31")
                .daysCount(2.0)
                .reason("Nghỉ phép giải quyết việc gia đình")
                .build();

        ResponseEntity<WorkflowRequestController.LeaveDto> response = workflowController.createLeaveRequest(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING");
        assertThat(response.getBody().getEmployeeName()).isEqualTo("Nguyễn Thu Giang");
        verify(leaveRequestRepository, times(1)).save(any(LeaveRequest.class));
    }

    @Test
    @DisplayName("Leave: Duyệt đơn nghỉ phép năm -> APPROVED & Tự động cộng ngày nghỉ hưởng lương vào Timesheet")
    void testApproveLeave_AnnualLeave() {
        Long leaveId = 201L; // Có sẵn trong seed
        WorkflowRequestController.ApproveLeaveRequest body = new WorkflowRequestController.ApproveLeaveRequest();
        body.setApproved(true);

        MonthlyTimesheet timesheet = MonthlyTimesheet.builder()
                .id(2L)
                .employeeId(6L)
                .month(10)
                .year(2026)
                .paidLeaveDays(BigDecimal.ZERO)
                .unpaidLeaveDays(BigDecimal.ZERO)
                .build();

        when(timesheetRepository.findByEmployeeIdAndMonthAndYear(eq(6L), eq(10), eq(2026)))
                .thenReturn(Optional.of(timesheet));

        ResponseEntity<WorkflowRequestController.LeaveDto> response = workflowController.approveLeave(leaveId, body);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("APPROVED");

        // Ngày nghỉ hưởng lương tăng thêm 1 ngày
        assertThat(timesheet.getPaidLeaveDays()).isEqualByComparingTo(new BigDecimal("1.0"));
        verify(timesheetRepository, times(1)).save(timesheet);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    // ==========================================
    // 3. ATTENDANCE EXPLANATIONS (UC-17)
    // ==========================================

    @Test
    @DisplayName("Explanation: Nộp đơn giải trình chấm công do sai lệch GPS thành công")
    void testCreateAttendanceExplanation() {
        Long empId = 7L;
        Long projId = 1L;

        Employee emp = Employee.builder().id(empId).employeeCode("HM-ENG-01").fullName("Trần Văn Trung").build();
        Project proj = Project.builder().id(projId).name("Cầu Nhật Tân 2").build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(proj));
        when(attendanceExplanationRepository.save(any(AttendanceExplanation.class))).thenAnswer(i -> {
            AttendanceExplanation e = i.getArgument(0);
            e.setId(701L);
            return e;
        });

        WorkflowRequestController.ExplanationDto req = WorkflowRequestController.ExplanationDto.builder()
                .employeeId(empId)
                .projectId(projId)
                .targetDate("2026-10-25")
                .explanationType("GPS_DEVIATION")
                .suggestedCheckIn("07:30")
                .suggestedCheckOut("17:00")
                .reason("Mất sóng GPS do làm việc trong hầm kỹ thuật cáp mố cầu")
                .evidenceUrl("https://storage.haiminh.vn/evidence/ham-ky-thuat.jpg")
                .build();

        ResponseEntity<WorkflowRequestController.ExplanationDto> response = workflowController.createAttendanceExplanation(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING_SM");
        assertThat(response.getBody().getSuggestedCheckIn()).isEqualTo("07:30");
        verify(attendanceExplanationRepository, times(1)).save(any(AttendanceExplanation.class));
    }
}
