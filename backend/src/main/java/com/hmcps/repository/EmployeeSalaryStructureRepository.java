package com.hmcps.repository;

import com.hmcps.entity.EmployeeSalaryStructure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeSalaryStructureRepository extends JpaRepository<EmployeeSalaryStructure, Long> {
    List<EmployeeSalaryStructure> findByEmployeeIdAndIsActiveTrue(Long employeeId);
}
