package com.hmcps.repository;

import com.hmcps.entity.BiometricDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BiometricDeviceRepository extends JpaRepository<BiometricDevice, Long> {
    List<BiometricDevice> findByStatus(String status);
}
