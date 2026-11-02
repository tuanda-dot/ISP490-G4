package com.hmcps.repository;

import com.hmcps.entity.AccountingJournalVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AccountingJournalVoucherRepository extends JpaRepository<AccountingJournalVoucher, Long> {
    List<AccountingJournalVoucher> findByPayrollId(Long payrollId);
    List<AccountingJournalVoucher> findByProjectCode(String projectCode);
    List<AccountingJournalVoucher> findByPayrollIdAndExportTarget(Long payrollId, String exportTarget);
}
