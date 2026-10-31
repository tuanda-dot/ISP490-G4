package com.hmcps.controller;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.entity.Attendance;
import com.hmcps.entity.MonthlyTimesheet;
import com.hmcps.repository.AttendanceRepository;
import com.hmcps.repository.MonthlyTimesheetRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Controller Quản lý Đơn từ & Giải trình Chấm công (FE-05: UC-10, UC-11)
 * Số hóa quy trình xét duyệt nghỉ phép và giải trình bù công có minh chứng
 */
@RestController
@RequestMapping("/api/attendance/requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceAdjustmentController {

    private final AttendanceRepository attendanceRepository;
    private final MonthlyTimesheetRepository timesheetRepository;

    @Data
    public static class AttendanceAdjustmentRequest {
        private Long employeeId;
        private LocalDate workDate;
        private Long shiftId;
        private BigDecimal actualHours; // Giờ công bổ sung (VD: 8.00)
        private String reason;          // Lý do: Quên quẹt Face ID, thiết bị hết pin, lỗi camera
        private String evidenceUrl;     // URL ảnh minh chứng / giấy xác nhận công trường
        private Long approvedBy;        // Chỉ huy trưởng hoặc Quản lý HR duyệt
    }

    @Data
    public static class LeaveRequestDto {
        private Long employeeId;
        private Integer month;
        private Integer year;
        private BigDecimal leaveDays;   // Số ngày nghỉ
        private boolean isPaid;         // true: Nghỉ phép năm hưởng lương; false: Nghỉ không lương
        private String reason;
    }

    /**
     * Nộp & Phê duyệt giải trình chấm công bù (UC-11)
     */
    @PostMapping("/adjust")
    public ResponseEntity<Attendance> adjustAttendance(@RequestBody AttendanceAdjustmentRequest request) {
        Attendance attendance = attendanceRepository.findByEmployeeIdAndWorkDate(
                request.getEmployeeId(), request.getWorkDate())
                .orElseGet(() -> Attendance.builder()
                        .employeeId(request.getEmployeeId())
                        .workDate(request.getWorkDate())
                        .shiftId(request.getShiftId())
                        .status(AttendanceStatus.MANUAL_ADJUSTED)
                        .build());

        BigDecimal hours = request.getActualHours() != null ? request.getActualHours() : new BigDecimal("8.00");
        attendance.setActualHours(hours);
        attendance.setRegularHours(hours);
        attendance.setStatus(AttendanceStatus.MANUAL_ADJUSTED);
        attendance.setNotes(String.format("Giải trình bù công đã duyệt bởi ID %d. Lý do: %s. Minh chứng: %s",
                request.getApprovedBy(), request.getReason(), request.getEvidenceUrl() != null ? request.getEvidenceUrl() : "N/A"));
        attendance.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(attendanceRepository.save(attendance));
    }

    /**
     * Nộp & Duyệt nghỉ phép (UC-10)
     */
    @PostMapping("/leave")
    public ResponseEntity<MonthlyTimesheet> submitLeave(@RequestBody LeaveRequestDto request) {
        MonthlyTimesheet ts = timesheetRepository.findByEmployeeIdAndMonthAndYear(
                request.getEmployeeId(), request.getMonth(), request.getYear())
                .orElseGet(() -> MonthlyTimesheet.builder()
                        .employeeId(request.getEmployeeId())
                        .month(request.getMonth())
                        .year(request.getYear())
                        .standardWorkDays(new BigDecimal("26.00"))
                        .build());

        BigDecimal days = request.getLeaveDays() != null ? request.getLeaveDays() : BigDecimal.ONE;
        if (request.isPaid()) {
            ts.setPaidLeaveDays(ts.getPaidLeaveDays().add(days));
        } else {
            ts.setUnpaidLeaveDays(ts.getUnpaidLeaveDays().add(days));
        }

        return ResponseEntity.ok(timesheetRepository.save(ts));
    }
}
