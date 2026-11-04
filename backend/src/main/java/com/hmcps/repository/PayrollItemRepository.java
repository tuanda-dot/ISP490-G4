package com.hmcps.repository;

import com.hmcps.entity.PayrollItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollItemRepository extends JpaRepository<PayrollItem, Long> {
    List<PayrollItem> findByPayrollId(Long payrollId);
    Optional<PayrollItem> findByPayrollIdAndEmployeeId(Long payrollId, Long employeeId);
    void deleteByPayrollId(Long payrollId);
}
