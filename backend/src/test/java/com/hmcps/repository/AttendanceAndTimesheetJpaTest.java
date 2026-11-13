package com.hmcps.repository;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.enums.TimesheetStatus;
import com.hmcps.entity.Attendance;
import com.hmcps.entity.MonthlyTimesheet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test tầng CSDL cho Chấm công & Bảng tổng hợp công tháng (FE-05, FE-07: UC-11, UC-18)
 */
@DataJpaTest
class AttendanceAndTimesheetJpaTest {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private MonthlyTimesheetRepository timesheetRepository;

    @Test
    @DisplayName("AttendanceRepository: Lưu và tìm kiếm bản ghi chấm công theo EmployeeId và WorkDate")
    void testSaveAndFindByEmployeeIdAndWorkDate() {
        Long empId = 55L;
        LocalDate workDate = LocalDate.of(2026, 10, 28);

        Attendance att = Attendance.builder()
                .employeeId(empId)
                .workDate(workDate)
                .projectId(1L)
                .checkInTime(LocalDateTime.of(2026, 10, 28, 7, 30))
                .checkOutTime(LocalDateTime.of(2026, 10, 28, 17, 30))
                .status(AttendanceStatus.GPS_VERIFIED)
                .actualHours(new BigDecimal("8.00"))
                .distanceMeters(45.5)
                .build();

        attendanceRepository.save(att);

        Optional<Attendance> found = attendanceRepository.findByEmployeeIdAndWorkDate(empId, workDate);
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(AttendanceStatus.GPS_VERIFIED);
        assertThat(found.get().getDistanceMeters()).isEqualTo(45.5);
        assertThat(found.get().getActualHours()).isEqualByComparingTo(new BigDecimal("8.00"));
    }

    @Test
    @DisplayName("MonthlyTimesheetRepository: Lưu và tìm kiếm bảng chấm công theo kỳ tháng/năm")
    void testTimesheet_FindByEmployeeIdAndMonthAndYear() {
        Long empId = 66L;
        Integer month = 10;
        Integer year = 2026;

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .employeeId(empId)
                .month(month)
                .year(year)
                .standardWorkDays(new BigDecimal("26.00"))
                .actualWorkDays(new BigDecimal("25.00"))
                .paidLeaveDays(new BigDecimal("1.00"))
                .unpaidLeaveDays(BigDecimal.ZERO)
                .overtimeHours(new BigDecimal("8.00"))
                .nightHours(new BigDecimal("4.00"))
                .status(TimesheetStatus.LOCKED)
                .build();

        timesheetRepository.save(ts);

        Optional<MonthlyTimesheet> found = timesheetRepository.findByEmployeeIdAndMonthAndYear(empId, month, year);
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(TimesheetStatus.LOCKED);
        assertThat(found.get().getPaidLeaveDays()).isEqualByComparingTo(new BigDecimal("1.00"));
        assertThat(found.get().getOvertimeHours()).isEqualByComparingTo(new BigDecimal("8.00"));
    }

    @Test
    @DisplayName("MonthlyTimesheetRepository: Lọc các bảng công theo trạng thái đã chốt khóa (LOCKED)")
    void testTimesheet_FindByStatus() {
        MonthlyTimesheet lockedTs = MonthlyTimesheet.builder()
                .employeeId(70L)
                .month(10)
                .year(2026)
                .status(TimesheetStatus.LOCKED)
                .build();

        MonthlyTimesheet draftTs = MonthlyTimesheet.builder()
                .employeeId(71L)
                .month(10)
                .year(2026)
                .status(TimesheetStatus.DRAFT)
                .build();

        timesheetRepository.save(lockedTs);
        timesheetRepository.save(draftTs);

        List<MonthlyTimesheet> lockedList = timesheetRepository.findByMonthAndYearAndStatus(10, 2026, TimesheetStatus.LOCKED);
        assertThat(lockedList).hasSize(1);
        assertThat(lockedList.get(0).getEmployeeId()).isEqualTo(70L);
    }
}
