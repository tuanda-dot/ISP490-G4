package com.hmcps.service;

import com.hmcps.common.dto.AccountingExportResponse;
import com.hmcps.common.dto.AccountingJournalVoucherDTO;
import com.hmcps.common.enums.AccountCode;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Payroll;
import com.hmcps.entity.PayrollItem;
import com.hmcps.entity.Project;
import com.hmcps.entity.ProjectCostAllocation;
import com.hmcps.repository.PayrollItemRepository;
import com.hmcps.repository.PayrollRepository;
import com.hmcps.repository.ProjectCostAllocationRepository;
import com.hmcps.repository.ProjectRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountingExportServiceTest {

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private PayrollItemRepository payrollItemRepository;

    @Mock
    private ProjectCostAllocationRepository costAllocationRepository;

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private AccountingExportService accountingExportService;

    @Test
    @DisplayName("Tự động sinh chứng từ hạch toán kế toán kép Nợ/Có cân đối và bóc tách theo dự án")
    void testGenerateJournalVouchers_Success() {
        Long payrollId = 1L;
        Payroll payroll = Payroll.builder()
                .id(payrollId)
                .payrollCode("PR-2026-10")
                .month(10)
                .year(2026)
                .status(com.hmcps.common.enums.PayrollStatus.APPROVED)
                .build();

        Project project = Project.builder()
                .id(101L)
                .code("DA-AQUACITY")
                .name("Khu Đô Thị Aqua City")
                .build();

        // 1 kỹ sư công trường
        PayrollItem siteItem = PayrollItem.builder()
                .id(1L)
                .payrollId(payrollId)
                .employeeId(10L)
                .employeeCode("KS-001")
                .fullName("Lê Văn Công")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .tongThuNhap(new BigDecimal("20000000.00"))
                .congBhDn(new BigDecimal("4700000.00")) // 23.5%
                .bhxhDn(new BigDecimal("3500000.00")) // 17.5%
                .tnldDn(BigDecimal.ZERO)
                .bhytDn(new BigDecimal("600000.00"))  // 3%
                .bhtnDn(new BigDecimal("200000.00"))  // 1%
                .kpcdDn(new BigDecimal("400000.00"))  // 2%
                .bhxhNld(new BigDecimal("1600000.00")) // 8%
                .bhytNld(new BigDecimal("300000.00"))  // 1.5%
                .bhtnNld(new BigDecimal("200000.00"))  // 1%
                .thueTncn(new BigDecimal("1500000.00"))
                .phiCongDoanVien(new BigDecimal("100000.00"))
                .thucNhan(new BigDecimal("16300000.00"))
                .build();

        ProjectCostAllocation alloc = ProjectCostAllocation.builder()
                .id(1L)
                .payrollId(payrollId)
                .payrollItemId(1L)
                .employeeId(10L)
                .projectId(101L)
                .accountCode(AccountCode.TK_622)
                .allocatedAmount(new BigDecimal("24700000.00"))
                .build();

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(payrollItemRepository.findByPayrollId(payrollId)).thenReturn(List.of(siteItem));
        when(costAllocationRepository.findByPayrollId(payrollId)).thenReturn(List.of(alloc));
        when(projectRepository.findAll()).thenReturn(List.of(project));

        AccountingExportResponse response = accountingExportService.generateJournalVouchers(payrollId);

        assertThat(response).isNotNull();
        assertThat(response.isBalanced()).isTrue();
        assertThat(response.getTotalDebit()).isEqualTo(response.getTotalCredit());
        assertThat(response.getEntries()).isNotEmpty();

        // Kiểm tra có dòng Nợ 622 gắn đúng mã công trình DA-AQUACITY
        boolean hasDebit622 = response.getEntries().stream().anyMatch(e ->
                "622".equals(e.getDebitAccount()) &&
                "3341".equals(e.getCreditAccount()) &&
                "DA-AQUACITY".equals(e.getProjectCode()));
        assertThat(hasDebit622).isTrue();

        // Kiểm tra xuất tệp CSV
        String csv = accountingExportService.exportToMisaCsv(payrollId);
        assertThat(csv).contains("SoChungTu,NgayChungTu,NgayHachToan,DienGiai,TKNo,TKCo,SoTien,MaDoiTuong,MaCongTrinh,MaKhoanMucCP");
        assertThat(csv).contains("622,3341");
        assertThat(csv).contains("DA-AQUACITY");
    }
}
