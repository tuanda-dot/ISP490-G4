package com.hmcps.repository;

import com.hmcps.entity.SalaryComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SalaryComponentRepository extends JpaRepository<SalaryComponent, Long> {
    Optional<SalaryComponent> findByCode(String code);
}
