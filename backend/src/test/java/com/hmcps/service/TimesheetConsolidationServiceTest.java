package com.hmcps.service;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.ContractType;
import com.hmcps.common.enums.TimesheetStatus;
import com.hmcps.entity.Attendance;
import com.hmcps.entity.Contract;
import com.hmcps.entity.Employee;
import com.hmcps.entity.MonthlyTimesheet;
import com.hmcps.repository.AttendanceRepository;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.MonthlyTimesheetRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimesheetConsolidationServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private MonthlyTimesheetRepository timesheetRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContractRepository contractRepository;

    @InjectMocks
    private TimesheetConsolidationService timesheetService;

    @Test
    @DisplayName("Tổng hợp công từ các ngày chấm công thực tế thành MonthlyTimesheet")
    void testConsolidateMonthlyTimesheet() {
        Long empId = 1L;
        int month = 10;
        int year = 2026;

        Employee emp = Employee.builder().id(empId).build();
        Contract contract = Contract.builder()
                .employeeId(empId)
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.ACTIVE)
                .build();

        Attendance att1 = Attendance.builder()
                .employeeId(empId)
                .workDate(LocalDate.of(year, month, 1))
                .regularHours(new BigDecimal("8.00"))
                .overtimeHours(new BigDecimal("2.00"))
                .status(AttendanceStatus.GPS_VERIFIED)
                .build();

        Attendance att2 = Attendance.builder()
                .employeeId(empId)
                .workDate(LocalDate.of(year, month, 2))
                .regularHours(new BigDecimal("8.00"))
                .overtimeHours(BigDecimal.ZERO)
                .status(AttendanceStatus.GPS_VERIFIED)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(contractRepository.findByEmployeeIdAndStatus(empId, ContractStatus.ACTIVE)).thenReturn(Optional.of(contract));
        when(attendanceRepository.findByEmployeeIdAndWorkDateBetween(eq(empId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(att1, att2));
        when(timesheetRepository.findByEmployeeIdAndMonthAndYear(empId, month, year))
                .thenReturn(Optional.empty());
        when(timesheetRepository.save(any(MonthlyTimesheet.class))).thenAnswer(i -> i.getArgument(0));

        MonthlyTimesheet ts = timesheetService.consolidateMonthlyTimesheetForEmployee(empId, month, year);

        // 2 ngày đi làm đủ 8 tiếng = 2 công chính thức
        assertThat(ts.getActualWorkDays()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(ts.getOfficialWorkDays()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(ts.getMealWorkDays()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(ts.getOvertimeHours()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(ts.getStatus()).isEqualTo(TimesheetStatus.DRAFT);
    }

    @Test
    @DisplayName("Quy trình 2 cấp: Chỉ huy trưởng CONFIRM -> HR Manager LOCK -> Kích hoạt tính lương")
    void testTwoLevelApprovalAndLock() {
        Long tsId = 100L;
        Long siteManagerId = 88L;
        Long hrManagerId = 99L;

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .id(tsId)
                .status(TimesheetStatus.DRAFT)
                .month(10)
                .year(2026)
                .build();

        when(timesheetRepository.findById(tsId)).thenReturn(Optional.of(ts));
        when(timesheetRepository.save(any(MonthlyTimesheet.class))).thenAnswer(i -> i.getArgument(0));

        // Cấp 1: Chỉ huy trưởng xác nhận
        MonthlyTimesheet confirmedTs = timesheetService.confirmTimesheetBySiteManager(tsId, siteManagerId);
        assertThat(confirmedTs.getStatus()).isEqualTo(TimesheetStatus.CONFIRMED);
        assertThat(confirmedTs.getConfirmedBy()).isEqualTo(siteManagerId);

        // Cấp 2: Trưởng phòng HR Khóa bảng công
        MonthlyTimesheet lockedTs = timesheetService.lockTimesheetByHrManager(tsId, hrManagerId);
        assertThat(lockedTs.getStatus()).isEqualTo(TimesheetStatus.LOCKED);
        assertThat(lockedTs.getLockedBy()).isEqualTo(hrManagerId);
    }

    @Test
    @DisplayName("Quy trình 2 cấp: Chặn HR Manager khóa bảng công khi CHT chưa CONFIRM (BF-07)")
    void testBlockLockWhenNotConfirmed() {
        Long tsId = 101L;
        Long hrManagerId = 99L;

        MonthlyTimesheet draftTs = MonthlyTimesheet.builder()
                .id(tsId)
                .status(TimesheetStatus.DRAFT)
                .build();

        when(timesheetRepository.findById(tsId)).thenReturn(Optional.of(draftTs));

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> {
            timesheetService.lockTimesheetByHrManager(tsId, hrManagerId);
        });
    }

    @Test
    @DisplayName("Quy trình 2 cấp: CHT từ chối trả về DRAFT để HR Staff điều chỉnh (BF-07)")
    void testSiteManagerRejectTimesheet() {
        Long tsId = 102L;
        Long siteManagerId = 88L;

        MonthlyTimesheet ts = MonthlyTimesheet.builder()
                .id(tsId)
                .status(TimesheetStatus.DRAFT)
                .confirmedBy(siteManagerId)
                .build();

        when(timesheetRepository.findById(tsId)).thenReturn(Optional.of(ts));
        when(timesheetRepository.save(any(MonthlyTimesheet.class))).thenAnswer(i -> i.getArgument(0));

        MonthlyTimesheet rejected = timesheetService.rejectTimesheetBySiteManager(tsId, siteManagerId, "Sai số giờ OT");
        assertThat(rejected.getStatus()).isEqualTo(TimesheetStatus.DRAFT);
        assertThat(rejected.getConfirmedBy()).isNull();
    }
}
