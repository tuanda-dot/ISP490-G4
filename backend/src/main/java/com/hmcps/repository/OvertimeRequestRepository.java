package com.hmcps.repository;

import com.hmcps.entity.OvertimeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OvertimeRequestRepository extends JpaRepository<OvertimeRequest, Long> {
    List<OvertimeRequest> findByEmployeeIdOrderByWorkDateDesc(Long employeeId);
    List<OvertimeRequest> findByProjectId(Long projectId);
    List<OvertimeRequest> findByStatus(String status);
    List<OvertimeRequest> findByWorkDateBetween(LocalDate startDate, LocalDate endDate);
    List<OvertimeRequest> findByEmployeeIdAndWorkDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
}
