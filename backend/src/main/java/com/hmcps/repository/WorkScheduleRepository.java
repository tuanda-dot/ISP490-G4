package com.hmcps.repository;

import com.hmcps.entity.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {
    List<WorkSchedule> findByEmployeeIdAndWorkDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    Optional<WorkSchedule> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);
    List<WorkSchedule> findByProjectIdAndWorkDate(Long projectId, LocalDate workDate);
}
