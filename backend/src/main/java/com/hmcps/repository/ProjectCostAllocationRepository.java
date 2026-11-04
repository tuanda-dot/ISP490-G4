package com.hmcps.repository;

import com.hmcps.entity.ProjectCostAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectCostAllocationRepository extends JpaRepository<ProjectCostAllocation, Long> {
    List<ProjectCostAllocation> findByPayrollId(Long payrollId);
    List<ProjectCostAllocation> findByProjectId(Long projectId);
    void deleteByPayrollId(Long payrollId);
}
