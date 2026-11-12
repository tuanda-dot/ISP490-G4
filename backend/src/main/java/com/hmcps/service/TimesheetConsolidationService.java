package com.hmcps.service;

import com.hmcps.common.constants.LaborLawConstants;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dịch vụ tổng hợp bảng chấm công tháng và Quy trình phê duyệt 2 cấp (FE-05)
 * Cấp 1: Chỉ huy trưởng dự án xác nhận (CONFIRMED)
 * Cấp 2: Trưởng phòng HR khóa bảng công (LOCKED) -> Kích hoạt Payroll Engine tính lương
 */
@Service
@RequiredArgsConstructor
public class TimesheetConsolidationService {

    private final AttendanceRepository attendanceRepository;
    private final MonthlyTimesheetRepository timesheetRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;

    /**
     * Tổng hợp toàn bộ dữ liệu chấm công hàng ngày trong tháng thành MonthlyTimesheet
     */
    @Transactional
    public MonthlyTimesheet consolidateMonthlyTimesheetForEmployee(Long employeeId, Integer month, Integer year) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Nhân viên không tồn tại: " + employeeId));

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<Attendance> attendances = attendanceRepository.findByEmployeeIdAndWorkDateBetween(employeeId, startDate, endDate);

        BigDecimal actualWorkDays = BigDecimal.ZERO;
        BigDecimal officialWorkDays = BigDecimal.ZERO;
        BigDecimal probationWorkDays = BigDecimal.ZERO;
        BigDecimal mealWorkDays = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;
        BigDecimal totalNightHours = BigDecimal.ZERO;
        BigDecimal allowanceWorkDays = BigDecimal.ZERO;
        int lateEarlyCount = 0;
        int explainedCount = 0;
        int missingPunchCount = 0;

        // Kiểm tra loại hợp đồng hiện tại
        Contract contract = contractRepository.findByEmployeeIdAndStatus(employeeId, ContractStatus.ACTIVE)
                .orElse(null);
        boolean isProbation = contract != null && contract.getContractType() == ContractType.PROBATION;

        for (Attendance att : attendances) {
            if (att.getStatus() == AttendanceStatus.MANUAL_ADJUSTED) {
                explainedCount += 1;
            }
            boolean missingPunch = att.getCheckInTime() == null || att.getCheckOutTime() == null;
            if (missingPunch && att.getStatus() != AttendanceStatus.MANUAL_ADJUSTED) {
                missingPunchCount += 1;
            } else if (att.getCheckInTime() != null) {
                int inMinutes = att.getCheckInTime().getHour() * 60 + att.getCheckInTime().getMinute();
                int outMinutes = att.getCheckOutTime() != null
                        ? att.getCheckOutTime().getHour() * 60 + att.getCheckOutTime().getMinute()
                        : 17 * 60;
                // Quy chuẩn Hải Minh: Vào sau 08:05 hoặc Ra trước 17:00 => Đi muộn/về sớm
                if (inMinutes > (8 * 60 + 5) || outMinutes < (17 * 60)) {
                    lateEarlyCount += 1;
                }
            }

            // Chỉ tính những ngày chấm công hợp lệ (FACE_ID_GPS_VERIFIED, FACE_ID_VERIFIED, GPS_VERIFIED, BIOMETRIC_VERIFIED, MANUAL_ADJUSTED)
            if (att.getStatus() == AttendanceStatus.FACE_ID_GPS_VERIFIED
                    || att.getStatus() == AttendanceStatus.FACE_ID_VERIFIED
                    || att.getStatus() == AttendanceStatus.GPS_VERIFIED
                    || att.getStatus() == AttendanceStatus.BIOMETRIC_VERIFIED
                    || att.getStatus() == AttendanceStatus.MANUAL_ADJUSTED) {

                BigDecimal regular = att.getRegularHours() != null ? att.getRegularHours() : BigDecimal.ZERO;
                // 8 giờ công tính là 1 công làm việc
                BigDecimal dayFraction = regular.divide(LaborLawConstants.STANDARD_WORK_HOURS_PER_DAY, 2, RoundingMode.HALF_UP);

                actualWorkDays = actualWorkDays.add(dayFraction);
                allowanceWorkDays = allowanceWorkDays.add(dayFraction);
                if (isProbation) {
                    probationWorkDays = probationWorkDays.add(dayFraction);
                } else {
                    officialWorkDays = officialWorkDays.add(dayFraction);
                }

                // Nếu có đi làm từ nửa ngày trở lên thì tính suất cơm
                if (dayFraction.compareTo(new BigDecimal("0.50")) >= 0) {
                    mealWorkDays = mealWorkDays.add(BigDecimal.ONE);
                }

                if (att.getOvertimeHours() != null) {
                    totalOvertimeHours = totalOvertimeHours.add(att.getOvertimeHours());
                }
                if (att.getNightHours() != null) {
                    totalNightHours = totalNightHours.add(att.getNightHours());
                }
            }
        }

        MonthlyTimesheet timesheet = timesheetRepository.findByEmployeeIdAndMonthAndYear(employeeId, month, year)
                .orElseGet(() -> MonthlyTimesheet.builder()
                        .employeeId(employeeId)
                        .month(month)
                        .year(year)
                        .standardWorkDays(LaborLawConstants.STANDARD_WORK_DAYS_DEFAULT)
                        .status(TimesheetStatus.DRAFT)
                        .build());

        // Nếu bảng công đã LOCKED thì không tự động ghi đè
        if (timesheet.getStatus() != TimesheetStatus.LOCKED) {
            timesheet.setActualWorkDays(actualWorkDays);
            timesheet.setOfficialWorkDays(officialWorkDays);
            timesheet.setProbationWorkDays(probationWorkDays);
            timesheet.setMealWorkDays(mealWorkDays);
            timesheet.setAllowanceWorkDays(allowanceWorkDays);
            timesheet.setLateEarlyCount(lateEarlyCount);
            timesheet.setExplainedCount(explainedCount);
            timesheet.setMissingPunchCount(missingPunchCount);
            timesheet.setOvertimeHours(totalOvertimeHours);
            timesheet.setNightHours(totalNightHours);
            timesheet = timesheetRepository.save(timesheet);
        }

        return timesheet;
    }

    /**
     * Cấp 1: Chỉ huy trưởng công trình (Site Manager) xác nhận bảng công
     */
    @Transactional
    public MonthlyTimesheet confirmTimesheetBySiteManager(Long timesheetId, Long siteManagerId) {
        MonthlyTimesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new IllegalArgumentException("Bảng công không tồn tại: " + timesheetId));

        if (timesheet.getStatus() == TimesheetStatus.LOCKED) {
            throw new IllegalStateException("Bảng công đã bị khóa bởi Phòng Nhân sự, không thể sửa đổi!");
        }

        timesheet.setStatus(TimesheetStatus.CONFIRMED);
        timesheet.setConfirmedBy(siteManagerId);
        timesheet.setConfirmedAt(LocalDateTime.now());
        return timesheetRepository.save(timesheet);
    }

    /**
     * Cấp 1: Chỉ huy trưởng công trình từ chối / trả về yêu cầu HR Staff điều chỉnh dữ liệu (BF-07)
     */
    @Transactional
    public MonthlyTimesheet rejectTimesheetBySiteManager(Long timesheetId, Long siteManagerId, String reason) {
        MonthlyTimesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new IllegalArgumentException("Bảng công không tồn tại: " + timesheetId));

        if (timesheet.getStatus() == TimesheetStatus.LOCKED) {
            throw new IllegalStateException("Bảng công đã bị khóa bởi Phòng Nhân sự, không thể từ chối!");
        }

        timesheet.setStatus(TimesheetStatus.DRAFT);
        timesheet.setConfirmedBy(null);
        timesheet.setConfirmedAt(null);
        return timesheetRepository.save(timesheet);
    }

    /**
     * Cấp 2: Trưởng phòng Nhân sự (HR Manager) rà soát và Khóa bảng công (LOCK - BF-07)
     * Bảng công bắt buộc phải được Chỉ huy trưởng công trình xác nhận Cấp 1 trước khi khóa
     */
    @Transactional
    public MonthlyTimesheet lockTimesheetByHrManager(Long timesheetId, Long hrManagerId) {
        MonthlyTimesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new IllegalArgumentException("Bảng công không tồn tại: " + timesheetId));

        if (timesheet.getStatus() != TimesheetStatus.CONFIRMED) {
            throw new IllegalStateException("Bảng công cần được Chỉ huy trưởng công trình (Site Manager) kiểm tra & xác nhận (Cấp 1) trước khi Trưởng phòng Nhân sự phê duyệt khóa!");
        }

        timesheet.setStatus(TimesheetStatus.LOCKED);
        timesheet.setLockedBy(hrManagerId);
        timesheet.setLockedAt(LocalDateTime.now());
        return timesheetRepository.save(timesheet);
    }

    /**
     * Khóa toàn bộ bảng công trong tháng và đánh dấu sẵn sàng tính lương (Ready for Payroll - BF-07)
     */
    @Transactional
    public void lockAllTimesheetsAndTriggerPayroll(Integer month, Integer year, Long hrManagerId) {
        List<MonthlyTimesheet> timesheets = timesheetRepository.findByMonthAndYear(month, year);
        LocalDateTime now = LocalDateTime.now();

        for (MonthlyTimesheet ts : timesheets) {
            ts.setStatus(TimesheetStatus.LOCKED);
            ts.setLockedBy(hrManagerId);
            ts.setLockedAt(now);
            timesheetRepository.save(ts);
        }
    }
}
