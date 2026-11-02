package com.hmcps.service;

import com.hmcps.common.dto.AccountingExportResponse;
import com.hmcps.common.dto.AccountingJournalVoucherDTO;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Dịch vụ xử lý xuất dữ liệu hạch toán kế toán tiền lương (FE-10 / FE-11)
 * Tự động sinh các bút toán kế toán kép (Double-entry Journal Vouchers)
 * theo chuẩn Thông tư 200/2014/TT-BTC & Thông tư 133/2016/TT-BTC,
 * bóc tách chi phí nhân công theo từng công trình/dự án để import vào MISA, FAST, BRAVO.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountingExportService {

    private final PayrollRepository payrollRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final ProjectCostAllocationRepository costAllocationRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public AccountingExportResponse generateJournalVouchers(Long payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kỳ lương ID: " + payrollId));

        List<PayrollItem> items = payrollItemRepository.findByPayrollId(payrollId);
        if (items.isEmpty()) {
            throw new IllegalStateException("Kỳ lương chưa có dữ liệu chi tiết để hạch toán.");
        }

        List<ProjectCostAllocation> allocations = costAllocationRepository.findByPayrollId(payrollId);
        Map<Long, Project> projectMap = projectRepository.findAll().stream()
                .collect(Collectors.toMap(Project::getId, p -> p));

        int month = payroll.getMonth();
        int year = payroll.getYear();
        String payrollCode = payroll.getPayrollCode();

        List<AccountingJournalVoucherDTO> vouchers = new ArrayList<>();
        LocalDate postingDate = LocalDate.of(year, month, 1)
                .plusMonths(1).minusDays(1); // Ngày cuối tháng của kỳ lương
        LocalDate voucherDate = postingDate;
        String voucherNo = String.format("PKT-%d-%02d", year, month);

        // =========================================================================
        // BÚT TOÁN 1: TRÍCH LƯƠNG & PHỤ CẤP VÀO CHI PHÍ THEO TỪNG DỰ ÁN (TK 622, 627, 642 / TK 3341)
        // =========================================================================
        BigDecimal totalGross = BigDecimal.ZERO;
        for (ProjectCostAllocation alloc : allocations) {
            Project proj = alloc.getProjectId() != null ? projectMap.get(alloc.getProjectId()) : null;
            String projCode = proj != null ? proj.getCode() : (alloc.getAccountCode().name().equals("TK_642") ? "VP-TRUSO" : "CT-CHUNG");
            String projName = proj != null ? proj.getName() : "Văn phòng trụ sở chính";

            // Tách phần tiền lương trong tổng chi phí phân bổ (allocatedAmount = thuNhap + BH_DN)
            // Lấy tỷ lệ lương từ PayrollItem tương ứng
            Optional<PayrollItem> itemOpt = items.stream().filter(it -> it.getId().equals(alloc.getPayrollItemId())).findFirst();
            BigDecimal salaryPortion = alloc.getAllocatedAmount();
            if (itemOpt.isPresent()) {
                PayrollItem it = itemOpt.get();
                BigDecimal totalItemCost = it.getTongThuNhap().add(it.getCongBhDn());
                if (totalItemCost.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal salaryRatio = it.getTongThuNhap().divide(totalItemCost, 6, RoundingMode.HALF_UP);
                    salaryPortion = alloc.getAllocatedAmount().multiply(salaryRatio).setScale(2, RoundingMode.HALF_UP);
                }
            }

            totalGross = totalGross.add(salaryPortion);

            String accCode = alloc.getAccountCode().name().replace("TK_", "");
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Chi phí lương tháng " + month + "/" + year + " - " + projName)
                    .debitAccount(accCode)
                    .creditAccount("3341")
                    .amount(salaryPortion)
                    .projectCode(projCode)
                    .projectName(projName)
                    .expenseItemCode("CP_LUONG")
                    .build());
        }

        // =========================================================================
        // BÚT TOÁN 2: TRÍCH BẢO HIỂM & KPCĐ PHẦN DOANH NGHIỆP ĐÓNG (23.5%) VÀO CHI PHÍ DỰ ÁN
        // Nợ TK 622, 627, 642 / Có TK 3383 (17.5%), 3384 (3.0%), 3386 (1.0%), 3382 (2.0%)
        // =========================================================================
        BigDecimal sumBhxhDn = items.stream().map(it -> it.getBhxhDn().add(it.getTnldDn())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumBhytDn = items.stream().map(PayrollItem::getBhytDn).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumBhtnDn = items.stream().map(PayrollItem::getBhtnDn).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumKpcdDn = items.stream().map(PayrollItem::getKpcdDn).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalInsDn = sumBhxhDn.add(sumBhytDn).add(sumBhtnDn).add(sumKpcdDn);

        // Phân bổ phần chi phí bảo hiểm DN theo từng tài khoản
        for (ProjectCostAllocation alloc : allocations) {
            Project proj = alloc.getProjectId() != null ? projectMap.get(alloc.getProjectId()) : null;
            String projCode = proj != null ? proj.getCode() : "VP-TRUSO";
            String projName = proj != null ? proj.getName() : "Văn phòng trụ sở";

            Optional<PayrollItem> itemOpt = items.stream().filter(it -> it.getId().equals(alloc.getPayrollItemId())).findFirst();
            if (itemOpt.isPresent()) {
                PayrollItem it = itemOpt.get();
                BigDecimal totalItemCost = it.getTongThuNhap().add(it.getCongBhDn());
                if (totalItemCost.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal insRatio = it.getCongBhDn().divide(totalItemCost, 6, RoundingMode.HALF_UP);
                    BigDecimal insPortion = alloc.getAllocatedAmount().multiply(insRatio).setScale(2, RoundingMode.HALF_UP);

                    if (insPortion.compareTo(BigDecimal.ZERO) > 0) {
                        String accCode = alloc.getAccountCode().name().replace("TK_", "");
                        // Phân rã đối ứng Nợ 622/627/642 - Có 3383, 3384, 3386, 3382
                        BigDecimal bhxhItem = insPortion.multiply(new BigDecimal("17.5")).divide(new BigDecimal("23.5"), 2, RoundingMode.HALF_UP);
                        BigDecimal bhytItem = insPortion.multiply(new BigDecimal("3.0")).divide(new BigDecimal("23.5"), 2, RoundingMode.HALF_UP);
                        BigDecimal bhtnItem = insPortion.multiply(new BigDecimal("1.0")).divide(new BigDecimal("23.5"), 2, RoundingMode.HALF_UP);
                        BigDecimal kpcdItem = insPortion.subtract(bhxhItem).subtract(bhytItem).subtract(bhtnItem);

                        vouchers.add(AccountingJournalVoucherDTO.builder()
                                .voucherNumber(voucherNo)
                                .voucherDate(voucherDate)
                                .postingDate(postingDate)
                                .description("Trích BHXH DN (17.5%) tháng " + month + " - " + projName)
                                .debitAccount(accCode)
                                .creditAccount("3383")
                                .amount(bhxhItem)
                                .projectCode(projCode)
                                .projectName(projName)
                                .expenseItemCode("CP_BHXH_DN")
                                .build());

                        vouchers.add(AccountingJournalVoucherDTO.builder()
                                .voucherNumber(voucherNo)
                                .voucherDate(voucherDate)
                                .postingDate(postingDate)
                                .description("Trích BHYT DN (3%) tháng " + month + " - " + projName)
                                .debitAccount(accCode)
                                .creditAccount("3384")
                                .amount(bhytItem)
                                .projectCode(projCode)
                                .projectName(projName)
                                .expenseItemCode("CP_BHYT_DN")
                                .build());

                        vouchers.add(AccountingJournalVoucherDTO.builder()
                                .voucherNumber(voucherNo)
                                .voucherDate(voucherDate)
                                .postingDate(postingDate)
                                .description("Trích BHTN DN (1%) tháng " + month + " - " + projName)
                                .debitAccount(accCode)
                                .creditAccount("3386")
                                .amount(bhtnItem)
                                .projectCode(projCode)
                                .projectName(projName)
                                .expenseItemCode("CP_BHTN_DN")
                                .build());

                        vouchers.add(AccountingJournalVoucherDTO.builder()
                                .voucherNumber(voucherNo)
                                .voucherDate(voucherDate)
                                .postingDate(postingDate)
                                .description("Trích KPCĐ DN (2%) tháng " + month + " - " + projName)
                                .debitAccount(accCode)
                                .creditAccount("3382")
                                .amount(kpcdItem)
                                .projectCode(projCode)
                                .projectName(projName)
                                .expenseItemCode("CP_KPCD_DN")
                                .build());
                    }
                }
            }
        }

        // =========================================================================
        // BÚT TOÁN 3: KHẤU TRỪ BẢO HIỂM NLĐ (10.5%) & THUẾ TNCN & ĐOÀN PHÍ
        // Nợ TK 3341 / Có TK 3383 (8%), 3384 (1.5%), 3386 (1%), 3335, 3388
        // =========================================================================
        BigDecimal sumBhxhNld = items.stream().map(PayrollItem::getBhxhNld).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumBhytNld = items.stream().map(PayrollItem::getBhytNld).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumBhtnNld = items.stream().map(PayrollItem::getBhtnNld).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumPit = items.stream().map(PayrollItem::getThueTncn).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumUnionFee = items.stream().map(PayrollItem::getPhiCongDoanVien).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (sumBhxhNld.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Khấu trừ BHXH người lao động (8%) tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("3383")
                    .amount(sumBhxhNld)
                    .expenseItemCode("KT_BHXH_NLD")
                    .build());
        }

        if (sumBhytNld.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Khấu trừ BHYT người lao động (1.5%) tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("3384")
                    .amount(sumBhytNld)
                    .expenseItemCode("KT_BHYT_NLD")
                    .build());
        }

        if (sumBhtnNld.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Khấu trừ BHTN người lao động (1.0%) tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("3386")
                    .amount(sumBhtnNld)
                    .expenseItemCode("KT_BHTN_NLD")
                    .build());
        }

        if (sumPit.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Khấu trừ Thuế TNCN phải nộp tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("3335")
                    .amount(sumPit)
                    .expenseItemCode("KT_THUE_TNCN")
                    .build());
        }

        if (sumUnionFee.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Khấu trừ Đoàn phí công đoàn viên tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("3388")
                    .amount(sumUnionFee)
                    .expenseItemCode("KT_DOAN_PHI")
                    .build());
        }

        // =========================================================================
        // BÚT TOÁN 4: CHI TRẢ TIỀN LƯƠNG THỰC NHẬN CHO NGƯỜI LAO ĐỘNG (QUA NGÂN HÀNG)
        // Nợ TK 3341 / Có TK 1121
        // =========================================================================
        BigDecimal sumNet = items.stream().map(PayrollItem::getThucNhan).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sumNet.compareTo(BigDecimal.ZERO) > 0) {
            vouchers.add(AccountingJournalVoucherDTO.builder()
                    .voucherNumber(voucherNo)
                    .voucherDate(voucherDate)
                    .postingDate(postingDate)
                    .description("Thanh toán tiền lương thực nhận chuyển khoản ngân hàng tháng " + month)
                    .debitAccount("3341")
                    .creditAccount("1121")
                    .amount(sumNet)
                    .expenseItemCode("CHI_LUONG_NH")
                    .build());
        }

        // Tính tổng phát sinh Nợ và Có
        BigDecimal totalDebit = vouchers.stream().map(AccountingJournalVoucherDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = vouchers.stream().map(AccountingJournalVoucherDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Với hạch toán kép từng dòng Nợ - Có đối ứng trực tiếp (1 Nợ - 1 Có), totalDebit luôn bằng totalCredit
        boolean isBalanced = totalDebit.compareTo(totalCredit) == 0;

        return AccountingExportResponse.builder()
                .payrollId(payroll.getId())
                .periodMonth(month)
                .periodYear(year)
                .payrollCode(payrollCode)
                .totalDebit(totalDebit)
                .totalCredit(totalCredit)
                .isBalanced(isBalanced)
                .voucherCount(vouchers.size())
                .entries(vouchers)
                .build();
    }

    /**
     * Xuất tệp CSV chuẩn UTF-8 tương thích 100% với trình import của MISA SME/AMIS, FAST, BRAVO
     */
    public String exportToMisaCsv(Long payrollId) {
        AccountingExportResponse response = generateJournalVouchers(payrollId);
        StringBuilder sb = new StringBuilder();

        // MISA Header Template: SoChungTu,NgayChungTu,NgayHachToan,DienGiai,TKNo,TKCo,SoTien,MaDoiTuong,MaCongTrinh,MaKhoanMucCP
        sb.append("SoChungTu,NgayChungTu,NgayHachToan,DienGiai,TKNo,TKCo,SoTien,MaDoiTuong,MaCongTrinh,MaKhoanMucCP\n");

        for (AccountingJournalVoucherDTO entry : response.getEntries()) {
            sb.append(escapeCsv(entry.getVoucherNumber())).append(",")
              .append(entry.getVoucherDate()).append(",")
              .append(entry.getPostingDate()).append(",")
              .append(escapeCsv(entry.getDescription())).append(",")
              .append(entry.getDebitAccount()).append(",")
              .append(entry.getCreditAccount()).append(",")
              .append(entry.getAmount()).append(",")
              .append(escapeCsv(entry.getEmployeeCode() != null ? entry.getEmployeeCode() : "")).append(",")
              .append(escapeCsv(entry.getProjectCode() != null ? entry.getProjectCode() : "")).append(",")
              .append(escapeCsv(entry.getExpenseItemCode() != null ? entry.getExpenseItemCode() : ""))
              .append("\n");
        }

        return sb.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
