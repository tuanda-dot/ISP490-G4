package com.hmcps.repository;

import com.hmcps.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);
    List<Attendance> findByEmployeeIdAndWorkDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    List<Attendance> findByProjectIdAndWorkDate(Long projectId, LocalDate workDate);
    List<Attendance> findByProjectIdAndWorkDateBetween(Long projectId, LocalDate startDate, LocalDate endDate);
}
