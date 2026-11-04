package com.hmcps.repository;

import com.hmcps.entity.PayslipInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayslipInquiryRepository extends JpaRepository<PayslipInquiry, Long> {
    List<PayslipInquiry> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<PayslipInquiry> findByPayrollId(Long payrollId);
    List<PayslipInquiry> findByStatus(String status);
}
