package com.hmcps.controller;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    @Mock
    private com.hmcps.service.integration.EmailService emailService;

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
                .workDate(LocalDate.now().plusDays(1).toString())
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

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Overtime Khối Văn Phòng: Nhân viên văn phòng luôn đi thẳng PENDING_HR (NOT_REQUIRED CHT) dù payload có projectId")
    void testCreateOvertime_OfficeStaff_AlwaysRoutesToHrOnly() {
        Employee officeEmp = Employee.builder()
                .id(18L)
                .employeeCode("HM-018")
                .fullName("Lê Thị Hoa")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .role("ROLE_OFFICE_STAFF")
                .build();
        when(employeeRepository.findById(18L)).thenReturn(Optional.of(officeEmp));
        when(overtimeRequestRepository.save(any(OvertimeRequest.class))).thenAnswer(i -> {
            OvertimeRequest o = i.getArgument(0);
            o.setId(801L);
            return o;
        });

        WorkflowRequestController.OvertimeDto req = WorkflowRequestController.OvertimeDto.builder()
                .employeeId(18L)
                .projectId(1L) // Kể cả payload gửi nhầm projectId=1
                .workDate(LocalDate.now().plusDays(1).toString())
                .startTime("18:00")
                .endTime("21:00")
                .otHours(3.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .reason("Quyết toán chứng từ phòng hành chính")
                .build();

        ResponseEntity<WorkflowRequestController.OvertimeDto> resp = workflowController.createOvertimeRequest(req);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getProjectId()).isEqualTo(0L);
        assertThat(resp.getBody().getSiteManagerApproval()).isEqualTo("NOT_REQUIRED");
        assertThat(resp.getBody().getStatus()).isEqualTo("PENDING_HR");
    }

    @Test
    @DisplayName("Phân quyền OT: Kỹ sư trưởng / Chỉ huy trưởng (SITE_MANAGER) BỊ CHẶN nếu cố duyệt đơn OT của Nhân viên Văn phòng")
    void testSiteManagerCannotApproveOfficeOvertime_Rejected() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "chihuytruong.phat@haiminh.vn",
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_SITE_MANAGER"))
                )
        );
        WorkflowRequestController.ApproveOtRequest body = new WorkflowRequestController.ApproveOtRequest();
        body.setRole("SITE_MANAGER");
        body.setApproved(true);

        // ID 6L là đơn OT khối văn phòng của HM-017 Vũ Hải Đăng (siteManagerApproval = NOT_REQUIRED)
        assertThatThrownBy(() -> workflowController.approveOvertime(6L, body))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("KHÔNG được phép duyệt đơn OT của Nhân viên Văn phòng");
    }

    @Test
    @DisplayName("Phân quyền OT: HR Staff phê duyệt trực tiếp đơn OT Khối Văn Phòng -> APPROVED")
    void testHrStaffCanApproveOfficeOvertime_Success() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "hrstaff.mai@haiminh.vn",
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_HR_OFFICER"))
                )
        );
        WorkflowRequestController.ApproveOtRequest body = new WorkflowRequestController.ApproveOtRequest();
        body.setRole("HR_STAFF");
        body.setApproved(true);

        ResponseEntity<WorkflowRequestController.OvertimeDto> resp = workflowController.approveOvertime(6L, body);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getHrApproval()).isEqualTo("APPROVED");
        assertThat(resp.getBody().getStatus()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("Validate OT: BỊ CHẶN nếu đăng ký OT trong ngày hôm nay nhưng giờ bắt đầu trước giờ hiện tại")
    void testCreateOvertime_StartTimeBeforeNowToday_Rejected() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        String pastDateStr = now.isAfter(LocalTime.of(0, 5)) ? today.toString() : today.minusDays(1).toString();
        String pastTimeStr = now.isAfter(LocalTime.of(0, 5))
                ? now.minusMinutes(5).format(DateTimeFormatter.ofPattern("HH:mm"))
                : "23:00";

        WorkflowRequestController.OvertimeDto req = WorkflowRequestController.OvertimeDto.builder()
                .employeeId(7L)
                .projectId(1L)
                .workDate(pastDateStr)
                .startTime(pastTimeStr)
                .endTime("23:59")
                .otHours(2.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .reason("Đăng ký OT ngược giờ hiện tại")
                .build();

        assertThatThrownBy(() -> workflowController.createOvertimeRequest(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("trước");
    }

    @Test
    @DisplayName("Validate OT: BỊ CHẶN nếu đăng ký OT vào ngày trong quá khứ")
    void testCreateOvertime_PastDate_Rejected() {
        WorkflowRequestController.OvertimeDto req = WorkflowRequestController.OvertimeDto.builder()
                .employeeId(7L)
                .projectId(1L)
                .workDate(LocalDate.now().minusDays(1).toString())
                .startTime("18:00")
                .endTime("22:00")
                .otHours(4.0)
                .otType("WEEKDAY_150")
                .multiplier(1.5)
                .reason("Đăng ký OT ngày hôm qua")
                .build();

        assertThatThrownBy(() -> workflowController.createOvertimeRequest(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("quá khứ");
    }
}
