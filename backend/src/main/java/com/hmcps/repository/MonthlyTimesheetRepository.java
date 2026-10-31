package com.hmcps.repository;

import com.hmcps.common.enums.TimesheetStatus;
import com.hmcps.entity.MonthlyTimesheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface MonthlyTimesheetRepository extends JpaRepository<MonthlyTimesheet, Long> {
    Optional<MonthlyTimesheet> findByEmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);
    List<MonthlyTimesheet> findByMonthAndYear(Integer month, Integer year);
    List<MonthlyTimesheet> findByMonthAndYearAndStatus(Integer month, Integer year, TimesheetStatus status);
}
