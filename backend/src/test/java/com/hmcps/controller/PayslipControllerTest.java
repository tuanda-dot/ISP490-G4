package com.hmcps.controller;

import com.hmcps.entity.Employee;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.Payslip;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayslipRepository;
import com.hmcps.service.integration.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test cho PayslipController (FE-10: UC-21, UC-22)
 * Kiểm thử tra cứu phiếu lương điện tử (E-Payslip), ghi nhận thời điểm xem,
 * sinh phiếu lương hàng loạt và lịch sử phiếu lương theo nhân viên.
 */
@ExtendWith(MockitoExtension.class)
class PayslipControllerTest {

    @Mock
    private PayslipRepository payslipRepository;

    @Mock
    private PayrollItemRepository payrollItemRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private PayslipController payslipController;

    @Test
    @DisplayName("E-Payslip: Tra cứu phiếu lương chi tiết của nhân viên thành công")
    void testGetMyPayslip_Success() {
        Long empId = 7L;
        Integer month = 10;
        Integer year = 2026;

        Payslip payslip = Payslip.builder()
                .id(1L)
                .employeeId(empId)
                .month(month)
                .year(year)
                .payrollItemId(100L)
                .status("SENT")
                .build();

        PayrollItem item = PayrollItem.builder()
                .id(100L)
                .employeeId(empId)
                .tongThuNhap(new BigDecimal("25020000.00"))
                .thucNhan(new BigDecimal("23549000.00"))
                .build();

        when(payslipRepository.findByEmployeeIdAndMonthAndYear(empId, month, year))
                .thenReturn(Optional.of(payslip));
        when(payrollItemRepository.findById(100L)).thenReturn(Optional.of(item));

        ResponseEntity<PayslipController.PayslipDetailResponse> response =
                payslipController.getMyPayslip(empId, month, year);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPayslip().getId()).isEqualTo(1L);
        assertThat(response.getBody().getItem().getThucNhan()).isEqualByComparingTo(new BigDecimal("23549000.00"));
    }

    @Test
    @DisplayName("E-Payslip: Tra cứu phiếu lương kỳ chưa tính -> Ném IllegalArgumentException")
    void testGetMyPayslip_NotFound_ThrowsException() {
        Long empId = 7L;
        when(payslipRepository.findByEmployeeIdAndMonthAndYear(empId, 1, 2027))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> payslipController.getMyPayslip(empId, 1, 2027))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Chưa có phiếu lương");
    }

    @Test
    @DisplayName("E-Payslip: Xác nhận đã xem phiếu lương -> Cập nhật trạng thái VIEWED và thời điểm xem")
    void testMarkPayslipAsViewed() {
        Long payslipId = 1L;
        Payslip payslip = Payslip.builder()
                .id(payslipId)
                .status("SENT")
                .build();

        when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));
        when(payslipRepository.save(any(Payslip.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<Payslip> response = payslipController.markPayslipAsViewed(payslipId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("VIEWED");
        assertThat(response.getBody().getViewedAt()).isNotNull();
    }

    @Test
    @DisplayName("E-Payslip: Sinh phiếu lương hàng loạt từ bảng tính lương đã duyệt")
    void testGeneratePayslipsForPayroll() {
        Long payrollId = 5L;
        PayrollItem item1 = PayrollItem.builder().id(101L).employeeId(1L).build();
        PayrollItem item2 = PayrollItem.builder().id(102L).employeeId(2L).build();

        when(payrollItemRepository.findByPayrollId(payrollId)).thenReturn(List.of(item1, item2));
        when(payslipRepository.findByPayrollItemId(101L)).thenReturn(Optional.empty());
        when(payslipRepository.findByPayrollItemId(102L)).thenReturn(Optional.empty());
        when(payslipRepository.save(any(Payslip.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<List<Payslip>> response =
                payslipController.generatePayslipsForPayroll(payrollId, 10, 2026);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).getStatus()).isEqualTo("SENT");
        verify(payslipRepository, times(2)).save(any(Payslip.class));
    }

    @Test
    @DisplayName("E-Payslip: Lấy lịch sử phiếu lương theo nhân viên sắp xếp mới nhất trước")
    void testGetEmployeePayslipHistory() {
        Long empId = 7L;
        Payslip p1 = Payslip.builder().id(1L).employeeId(empId).month(10).year(2026).build();
        Payslip p2 = Payslip.builder().id(2L).employeeId(empId).month(9).year(2026).build();

        when(payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(empId))
                .thenReturn(List.of(p1, p2));

        ResponseEntity<List<Payslip>> response = payslipController.getEmployeePayslipHistory(empId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).getMonth()).isEqualTo(10);
        assertThat(response.getBody().get(1).getMonth()).isEqualTo(9);
    }

    @Test
    @DisplayName("E-Payslip: Gửi email phiếu lương cá nhân qua EmailService thành công")
    void testSendSinglePayslipEmail_Success() {
        Employee emp = Employee.builder()
                .id(7L)
                .employeeCode("HM-007")
                .fullName("Nguyễn Văn B")
                .email("nv.b@haiminh.vn")
                .position("Kỹ sư hiện trường")
                .build();

        PayslipController.SendPayslipEmailRequest req = new PayslipController.SendPayslipEmailRequest();
        req.setEmployeeId(7L);
        req.setMonth(10);
        req.setYear(2026);
        req.setPayrollStatus("APPROVED");
        req.setNetPay(new BigDecimal("23549000"));

        when(employeeRepository.findById(7L)).thenReturn(Optional.of(emp));
        when(payslipRepository.findByEmployeeIdAndMonthAndYear(7L, 10, 2026)).thenReturn(Optional.empty());
        when(emailService.sendPayslipEmailWithResult(
                eq("nv.b@haiminh.vn"), eq("Nguyễn Văn B"), eq(10), eq(2026), anyString(), anyString(), any()))
                .thenReturn(new EmailService.EmailDispatchResult(
                        true, "EMAIL_SERVER_SANDBOX", "nv.b@haiminh.vn",
                        "[HMCPS] Phiếu lương điện tử Tháng 10/2026 - Nguyễn Văn B", "2026-11-12 14:00:00", null));

        ResponseEntity<Map<String, Object>> response = payslipController.sendSinglePayslipEmail(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("success")).isEqualTo(true);
        assertThat(response.getBody().get("to")).isEqualTo("nv.b@haiminh.vn");
    }

    @Test
    @DisplayName("E-Payslip Batch: Phát hành hàng loạt bỏ qua nhân sự 0 ngày công và gửi đúng người có lương")
    void testSendBatchPayslipEmails_SkipsZeroWorkday() {
        PayslipController.BatchPayslipItemPayload validRow = new PayslipController.BatchPayslipItemPayload();
        validRow.setEmployeeCode("HM-002");
        validRow.setEmployeeName("Trần Thị Lan");
        validRow.setEmail("ketoan.lan@haiminh.vn");
        validRow.setHasPayslip(true);
        validRow.setActualDays(new BigDecimal("26"));
        validRow.setNetPay(new BigDecimal("18500000"));

        PayslipController.BatchPayslipItemPayload newHireRow = new PayslipController.BatchPayslipItemPayload();
        newHireRow.setEmployeeCode("HM-099");
        newHireRow.setEmployeeName("Nhân viên mới");
        newHireRow.setEmail("new@haiminh.vn");
        newHireRow.setHasPayslip(false);
        newHireRow.setActualDays(BigDecimal.ZERO);
        newHireRow.setNetPay(BigDecimal.ZERO);

        PayslipController.SendBatchPayslipsRequest req = new PayslipController.SendBatchPayslipsRequest();
        req.setMonth(10);
        req.setYear(2026);
        req.setPayrollStatus("APPROVED");
        req.setItems(List.of(validRow, newHireRow));

        when(emailService.isLiveSmtpConfigured()).thenReturn(false);
        when(employeeRepository.findByEmployeeCode("HM-002")).thenReturn(Optional.empty());
        when(employeeRepository.findByEmail("ketoan.lan@haiminh.vn")).thenReturn(Optional.empty());
        when(emailService.sendPayslipEmailWithResult(
                eq("ketoan.lan@haiminh.vn"), eq("Trần Thị Lan"), eq(10), eq(2026), anyString(), anyString(), any()))
                .thenReturn(new EmailService.EmailDispatchResult(
                        true, "EMAIL_SERVER_SANDBOX", "ketoan.lan@haiminh.vn", "Subject", "2026-11-12 14:00:00", null));
        when(emailService.getDispatchedLogs()).thenReturn(List.of());

        ResponseEntity<Map<String, Object>> response = payslipController.sendBatchPayslipEmails(req);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("totalSent")).isEqualTo(1);
        assertThat(response.getBody().get("skippedCount")).isEqualTo(1);
    }
}
