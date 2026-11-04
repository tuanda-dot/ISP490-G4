package com.hmcps.repository;

import com.hmcps.common.enums.PayrollStatus;
import com.hmcps.entity.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    Optional<Payroll> findByMonthAndYear(Integer month, Integer year);
    Optional<Payroll> findByPayrollCode(String payrollCode);
    List<Payroll> findByStatus(PayrollStatus status);
}
