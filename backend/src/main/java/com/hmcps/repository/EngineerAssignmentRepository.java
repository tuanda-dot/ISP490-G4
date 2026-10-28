package com.hmcps.repository;

import com.hmcps.entity.EngineerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface EngineerAssignmentRepository extends JpaRepository<EngineerAssignment, Long> {
    List<EngineerAssignment> findByEmployeeIdAndStatus(Long employeeId, String status);
    List<EngineerAssignment> findByProjectIdAndStatus(Long projectId, String status);
    Optional<EngineerAssignment> findByEmployeeIdAndProjectIdAndStatus(Long employeeId, Long projectId, String status);
}
