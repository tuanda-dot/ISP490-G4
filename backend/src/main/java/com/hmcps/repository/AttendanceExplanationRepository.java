package com.hmcps.repository;

import com.hmcps.entity.AttendanceExplanation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceExplanationRepository extends JpaRepository<AttendanceExplanation, Long> {
    List<AttendanceExplanation> findByEmployeeIdOrderByTargetDateDesc(Long employeeId);
    List<AttendanceExplanation> findByProjectId(Long projectId);
    List<AttendanceExplanation> findByStatus(String status);
    List<AttendanceExplanation> findByTargetDate(LocalDate targetDate);
    List<AttendanceExplanation> findByTargetDateBetween(LocalDate startDate, LocalDate endDate);
}
