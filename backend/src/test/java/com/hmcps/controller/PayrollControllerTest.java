package com.hmcps.controller;

import com.hmcps.common.enums.PayrollStatus;
import com.hmcps.entity.AccountingJournalVoucher;
import com.hmcps.entity.Payroll;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.ProjectCostAllocation;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayrollRepository;
import com.hmcps.repository.ProjectCostAllocationRepository;
import com.hmcps.service.AccountingExportService;
import com.hmcps.service.PayrollEngineService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit Test cho PayrollController (FE-10: UC-21, UC-22 / BF-08, BF-09)
 * Kiểm thử luồng tính toán lương tự động, quy trình duyệt 2 cấp (KTT & Giám đốc),
 * xuất tệp CSV MISA và phân bổ chi phí dự án.
 */
@ExtendWith(MockitoExtension.class)
class PayrollControllerTest {

    @Mock private PayrollEngineService payrollEngineService;
    @Mock private PayrollRepository payrollRepository;
    @Mock private PayrollItemRepository payrollItemRepository;
    @Mock private ProjectCostAllocationRepository costAllocationRepository;
    @Mock private AccountingExportService accountingExportService;
    @Mock private com.hmcps.service.AuditLogService auditLogService;

    @InjectMocks private PayrollController controller;

    @Test
    @DisplayName("PayrollController.calculateMonthlyPayroll: Tính bảng lương tháng và ghi AuditLog")
    void testCalculateMonthlyPayroll_Success() {
        PayrollController.CalculatePayrollRequest req = new PayrollController.CalculatePayrollRequest();
        req.setMonth(10);
        req.setYear(2026);
        req.setOperatorUserId(16L);
        Payroll p = Payroll.builder().id(1L).month(10).year(2026).status(PayrollStatus.CALCULATED).build();
        when(payrollEngineService.calculateMonthlyPayroll(10, 2026, 16L)).thenReturn(p);

        ResponseEntity<Payroll> resp = controller.calculateMonthlyPayroll(req);

        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getStatus()).isEqualTo(PayrollStatus.CALCULATED);
    }

    @Test
    @DisplayName("PayrollController.submitToChief: Chuyển trạng thái SUBMITTED gửi Kế toán trưởng")
    void testSubmitToChief_Success() {
        Payroll p = Payroll.builder().id(1L).status(PayrollStatus.CALCULATED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = controller.submitToChief(1L);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Payroll) resp.getBody()).getStatus()).isEqualTo(PayrollStatus.SUBMITTED);
    }

    @Test
    @DisplayName("PayrollController.chiefReview: Kế toán trưởng thẩm định đạt -> REVIEWED")
    void testChiefReview_Approved() {
        Payroll p = Payroll.builder().id(1L).payrollCode("PR-2026-10").status(PayrollStatus.SUBMITTED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));
        PayrollController.WorkflowActionRequest req = new PayrollController.WorkflowActionRequest();
        req.setApproved(true);
        req.setOperatorUserId(2L);
        req.setOperatorName("Nguyễn Thị Mai");

        ResponseEntity<?> resp = controller.chiefReview(1L, req);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Payroll) resp.getBody()).getStatus()).isEqualTo(PayrollStatus.REVIEWED);
    }

    @Test
    @DisplayName("PayrollController.chiefReturnToAccountant: Kế toán trưởng trả về yêu cầu tính lại -> CALCULATED")
    void testChiefReturnToAccountant_Success() {
        Payroll p = Payroll.builder().id(1L).payrollCode("PR-2026-10").status(PayrollStatus.SUBMITTED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));
        PayrollController.WorkflowActionRequest req = new PayrollController.WorkflowActionRequest();
        req.setOperatorUserId(2L);
        req.setReason("Cần rà soát lại công tác phí công trình Vàm Cỏ");

        ResponseEntity<?> resp = controller.chiefReturnToAccountant(1L, req);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Payroll) resp.getBody()).getStatus()).isEqualTo(PayrollStatus.CALCULATED);
    }

    @Test
    @DisplayName("PayrollController.directorApproveBudget: Giám đốc ký duyệt ngân sách -> APPROVED")
    void testDirectorApproveBudget_Success() {
        Payroll p = Payroll.builder().id(1L).payrollCode("PR-2026-10").status(PayrollStatus.REVIEWED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));
        PayrollController.WorkflowActionRequest req = new PayrollController.WorkflowActionRequest();
        req.setOperatorUserId(1L);
        req.setOperatorName("Lê Phúc Hà");

        ResponseEntity<?> resp = controller.directorApproveBudget(1L, req);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Payroll) resp.getBody()).getStatus()).isEqualTo(PayrollStatus.APPROVED);
        assertThat(((Payroll) resp.getBody()).getApprovedBy()).isEqualTo(1L);
    }

    @Test
    @DisplayName("PayrollController.directorRejectBudget: Chặn lý do trống (400) & từ chối lưu DIRECTOR_REJECTED")
    void testDirectorRejectBudget_ValidationAndTransition() {
        PayrollController.WorkflowActionRequest emptyReq = new PayrollController.WorkflowActionRequest();
        emptyReq.setReason("");
        ResponseEntity<?> badResp = controller.directorRejectBudget(1L, emptyReq);
        assertThat(badResp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Payroll p = Payroll.builder().id(1L).payrollCode("PR-2026-10").status(PayrollStatus.REVIEWED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));

        PayrollController.WorkflowActionRequest valid = new PayrollController.WorkflowActionRequest();
        valid.setReason("Vượt trần ngân sách chi phí nhân công Q4");
        valid.setOperatorUserId(1L);
        valid.setOperatorName("Lê Phúc Hà");

        ResponseEntity<?> okResp = controller.directorRejectBudget(1L, valid);
        assertThat(okResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Payroll) okResp.getBody()).getStatus()).isEqualTo(PayrollStatus.DIRECTOR_REJECTED);
    }

    @Test
    @DisplayName("PayrollController.exportMisaCsv: Trả về nội dung CSV và Content-Disposition filename")
    void testExportMisaCsv_ReturnsCsvContent() {
        when(accountingExportService.exportMisaCsv(1L)).thenReturn("MISA_HEADER\nROW1\n");
        ResponseEntity<String> resp = controller.exportMisaCsv(1L);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isEqualTo("MISA_HEADER\nROW1\n");
        assertThat(resp.getHeaders().getContentDisposition().toString()).contains("MISA_Payroll_1.csv");
    }

    @Test
    @DisplayName("PayrollController.getAccountingVouchers: Trả chứng từ hạch toán Nợ/Có cân đối")
    void testGetAccountingVouchers_ReturnsList() {
        when(accountingExportService.getVouchersByPayrollId(1L)).thenReturn(List.of(
                AccountingJournalVoucher.builder().payrollId(1L).debitAccount("622").creditAccount("3341").build()));
        ResponseEntity<List<AccountingJournalVoucher>> resp = controller.getAccountingVouchers(1L);
        assertThat(resp.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("PayrollController.getCostAllocations: Lấy phân bổ chi phí nhân công theo dự án")
    void testGetCostAllocations_ReturnsList() {
        when(costAllocationRepository.findByPayrollId(1L)).thenReturn(List.of(
                ProjectCostAllocation.builder().payrollId(1L).projectId(2L).allocatedAmount(new BigDecimal("50000000")).build()));
        ResponseEntity<List<ProjectCostAllocation>> resp = controller.getCostAllocations(1L);
        assertThat(resp.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("PayrollController.getPayrollItems: Trả chi tiết từng nhân viên của kỳ lương")
    void testGetPayrollItems_ReturnsItems() {
        when(payrollItemRepository.findByPayrollId(1L)).thenReturn(List.of(
                PayrollItem.builder().payrollId(1L).employeeCode("HM-006").build()));
        ResponseEntity<List<PayrollItem>> resp = controller.getPayrollItems(1L);
        assertThat(resp.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("PayrollController.lockAndPay: Khóa sổ chi trả kỳ lương -> PAID")
    void testLockAndPay_TransitionsToPaid() {
        Payroll p = Payroll.builder().id(1L).payrollCode("PR-2026-10").status(PayrollStatus.APPROVED).build();
        when(payrollRepository.findById(1L)).thenReturn(Optional.of(p));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = controller.lockAndPay(1L);
        assertThat(((Payroll) resp.getBody()).getStatus()).isEqualTo(PayrollStatus.PAID);
    }
}
