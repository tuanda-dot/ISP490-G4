package com.hmcps.repository;

import com.hmcps.entity.SalaryGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryGradeRepository extends JpaRepository<SalaryGrade, Long> {
    Optional<SalaryGrade> findByGradeCode(String gradeCode);
    List<SalaryGrade> findByEmployeeTypeAndIsActiveTrueOrderByLevelOrderAsc(String employeeType);
    List<SalaryGrade> findByIsActiveTrueOrderByLevelOrderAsc();
}
