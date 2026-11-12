package com.hmcps.controller;

import com.hmcps.entity.MonthlyTimesheet;
import com.hmcps.repository.MonthlyTimesheetRepository;
import com.hmcps.service.TimesheetConsolidationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timesheets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TimesheetController {

    private final TimesheetConsolidationService timesheetService;
    private final MonthlyTimesheetRepository timesheetRepository;

    @Data
    public static class ConfirmTimesheetRequest {
        private Long siteManagerId;
    }

    @Data
    public static class RejectTimesheetRequest {
        private Long siteManagerId;
        private String reason;
    }

    @Data
    public static class LockTimesheetRequest {
        private Long hrManagerId;
    }

    @Data
    public static class LockMonthRequest {
        private Integer month;
        private Integer year;
        private Long hrManagerId;
    }

    /**
     * Lấy danh sách bảng chấm công của tháng/năm
     */
    @GetMapping
    public ResponseEntity<List<MonthlyTimesheet>> getMonthlyTimesheets(
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(timesheetRepository.findByMonthAndYear(month, year));
    }

    /**
     * Phê duyệt cấp 1: Chỉ huy trưởng xác nhận công dự án (CONFIRM)
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<MonthlyTimesheet> confirmTimesheet(
            @PathVariable Long id,
            @RequestBody ConfirmTimesheetRequest request) {
        MonthlyTimesheet ts = timesheetService.confirmTimesheetBySiteManager(id, request.getSiteManagerId());
        return ResponseEntity.ok(ts);
    }

    /**
     * Phê duyệt cấp 1: Chỉ huy trưởng từ chối / trả về yêu cầu HR điều chỉnh (BF-07)
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<MonthlyTimesheet> rejectTimesheet(
            @PathVariable Long id,
            @RequestBody(required = false) RejectTimesheetRequest request) {
        Long smId = request != null ? request.getSiteManagerId() : null;
        String reason = request != null ? request.getReason() : "Yêu cầu HR điều chỉnh";
        MonthlyTimesheet ts = timesheetService.rejectTimesheetBySiteManager(id, smId, reason);
        return ResponseEntity.ok(ts);
    }

    /**
     * Phê duyệt cấp 2: Trưởng phòng HR Khóa bảng công (LOCK)
     */
    @PostMapping("/{id}/lock")
    public ResponseEntity<MonthlyTimesheet> lockTimesheet(
            @PathVariable Long id,
            @RequestBody LockTimesheetRequest request) {
        MonthlyTimesheet ts = timesheetService.lockTimesheetByHrManager(id, request.getHrManagerId());
        return ResponseEntity.ok(ts);
    }

    /**
     * Khóa toàn bộ bảng công tháng và tự động kích hoạt tính lương (FE-05 -> FE-06)
     */
    @PostMapping("/lock-and-payroll")
    public ResponseEntity<String> lockAndTriggerPayroll(@RequestBody LockMonthRequest request) {
        timesheetService.lockAllTimesheetsAndTriggerPayroll(
                request.getMonth(), request.getYear(), request.getHrManagerId());
        return ResponseEntity.ok("Timesheets locked successfully. Payroll calculation triggered.");
    }
}
