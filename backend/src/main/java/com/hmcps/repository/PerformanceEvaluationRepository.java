package com.hmcps.repository;

import com.hmcps.entity.PerformanceEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerformanceEvaluationRepository extends JpaRepository<PerformanceEvaluation, Long> {
    Optional<PerformanceEvaluation> findByEmployeeIdAndEvalYearAndEvalMonth(Long employeeId, Integer evalYear, Integer evalMonth);
    List<PerformanceEvaluation> findByEmployeeIdOrderByEvalYearDescEvalMonthDesc(Long employeeId);
    List<PerformanceEvaluation> findByEvalYearAndEvalMonthOrderByEmployeeCodeAsc(Integer evalYear, Integer evalMonth);
    List<PerformanceEvaluation> findByDepartmentIdAndEvalYearAndEvalMonthOrderByEmployeeCodeAsc(Long departmentId, Integer evalYear, Integer evalMonth);
}
