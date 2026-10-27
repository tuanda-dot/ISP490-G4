package com.hmcps.repository;

import com.hmcps.common.enums.ContractStatus;
import com.hmcps.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    Optional<Contract> findByEmployeeIdAndStatus(Long employeeId, ContractStatus status);
    List<Contract> findByEmployeeId(Long employeeId);
    Optional<Contract> findByContractNumber(String contractNumber);
    List<Contract> findByEndDateBetweenAndStatus(java.time.LocalDate start, java.time.LocalDate end, ContractStatus status);

    @org.springframework.data.jpa.repository.Query(
        "SELECT CASE WHEN COUNT(c) > 0 THEN TRUE ELSE FALSE END FROM Contract c " +
        "WHERE c.employeeId = :employeeId AND c.status = :status " +
        "AND c.startDate <= :today AND (c.endDate IS NULL OR c.endDate >= :today)"
    )
    boolean existsActiveContract(
        @org.springframework.data.repository.query.Param("employeeId") Long employeeId,
        @org.springframework.data.repository.query.Param("status") ContractStatus status,
        @org.springframework.data.repository.query.Param("today") java.time.LocalDate today
    );
}
