package com.hmcps.repository;

import com.hmcps.entity.DailySiteOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailySiteOtpRepository extends JpaRepository<DailySiteOtp, Long> {
    Optional<DailySiteOtp> findByProjectIdAndValidDateAndIsActiveTrue(Long projectId, LocalDate validDate);
    Optional<DailySiteOtp> findByProjectIdAndValidDate(Long projectId, LocalDate validDate);
}
