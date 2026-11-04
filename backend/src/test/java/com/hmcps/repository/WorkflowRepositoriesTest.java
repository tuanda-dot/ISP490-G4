package com.hmcps.repository;

import com.hmcps.entity.AttendanceExplanation;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.LeaveRequest;
import com.hmcps.entity.OvertimeRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test tầng CSDL cho các bảng Workflow Đơn từ và Nhật ký kiểm toán (FE-08, FE-09, FE-14)
 */
@DataJpaTest
class WorkflowRepositoriesTest {

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private OvertimeRequestRepository overtimeRequestRepository;

    @Autowired
    private AttendanceExplanationRepository attendanceExplanationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    @DisplayName("LeaveRequestRepository: Lưu và tìm kiếm theo EmployeeId và Status")
    void testLeaveRequestRepository_SaveAndFindByStatus() {
        LeaveRequest leave = LeaveRequest.builder()
                .employeeId(10L)
                .leaveType("ANNUAL")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 2))
                .daysCount(new BigDecimal("2.0"))
                .reason("Nghỉ phép thường niên")
                .status("PENDING_SM")
                .build();

        leaveRequestRepository.save(leave);

        List<LeaveRequest> pendingList = leaveRequestRepository.findByStatus("PENDING_SM");
        assertThat(pendingList).isNotEmpty();
        assertThat(pendingList.get(0).getEmployeeId()).isEqualTo(10L);
        assertThat(pendingList.get(0).getDaysCount()).isEqualByComparingTo(new BigDecimal("2.0"));
    }

    @Test
    @DisplayName("OvertimeRequestRepository: Lưu và tìm kiếm theo khoảng ngày làm việc")
    void testOvertimeRequestRepository_FindByWorkDateBetween() {
        LocalDate d1 = LocalDate.of(2026, 10, 20);
        LocalDate d2 = LocalDate.of(2026, 10, 25);

        OvertimeRequest ot = OvertimeRequest.builder()
                .employeeId(12L)
                .projectId(1L)
                .workDate(d1)
                .startTime("18:00")
                .endTime("22:00")
                .otHours(new BigDecimal("4.0"))
                .otType("WEEKDAY_150")
                .multiplier(new BigDecimal("1.5"))
                .reason("Trực kỹ thuật kiểm tra kết cấu cáp giằng")
                .status("APPROVED")
                .build();

        overtimeRequestRepository.save(ot);

        List<OvertimeRequest> list = overtimeRequestRepository.findByWorkDateBetween(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));

        assertThat(list).isNotEmpty();
        assertThat(list.get(0).getOtHours()).isEqualByComparingTo(new BigDecimal("4.0"));
    }

    @Test
    @DisplayName("AttendanceExplanationRepository: Lưu và tìm kiếm giải trình chấm công theo targetDate")
    void testAttendanceExplanationRepository_FindByTargetDate() {
        LocalDate date = LocalDate.of(2026, 10, 22);

        AttendanceExplanation exp = AttendanceExplanation.builder()
                .employeeId(15L)
                .projectId(2L)
                .targetDate(date)
                .explanationType("GPS_DEVIATION")
                .suggestedCheckIn("07:30")
                .suggestedCheckOut("17:00")
                .actualHours(new BigDecimal("8.00"))
                .reason("Mất sóng GPS dưới hầm kỹ thuật")
                .status("PENDING_SM")
                .build();

        attendanceExplanationRepository.save(exp);

        List<AttendanceExplanation> list = attendanceExplanationRepository.findByTargetDate(date);
        assertThat(list).isNotEmpty();
        assertThat(list.get(0).getReason()).contains("GPS");
    }

    @Test
    @DisplayName("AuditLogRepository: Lưu và truy vấn lịch sử thao tác theo EntityName và EntityId")
    void testAuditLogRepository_SaveAndFindByEntity() {
        AuditLog log = AuditLog.builder()
                .action("APPROVE_OVERTIME")
                .entityName("overtime_requests")
                .entityId(101L)
                .performedByRole("HR_MANAGER")
                .description("Phê duyệt đơn OT #101 thành công")
                .build();

        auditLogRepository.save(log);

        List<AuditLog> logs = auditLogRepository.findByEntityNameAndEntityIdOrderByCreatedAtDesc("overtime_requests", 101L);
        assertThat(logs).isNotEmpty();
        assertThat(logs.get(0).getAction()).isEqualTo("APPROVE_OVERTIME");
        assertThat(logs.get(0).getPerformedByRole()).isEqualTo("HR_MANAGER");
    }
}
