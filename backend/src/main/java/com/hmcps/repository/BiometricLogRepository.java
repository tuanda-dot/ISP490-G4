package com.hmcps.repository;

import com.hmcps.entity.BiometricLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BiometricLogRepository extends JpaRepository<BiometricLog, Long> {
    List<BiometricLog> findByBiometricUserIdAndLogTimestampBetweenOrderByLogTimestampAsc(
            Integer biometricUserId, LocalDateTime startTime, LocalDateTime endTime);
    List<BiometricLog> findByIsProcessedFalse();
}
