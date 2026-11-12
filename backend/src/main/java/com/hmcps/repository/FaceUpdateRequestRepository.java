package com.hmcps.repository;

import com.hmcps.entity.FaceUpdateRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaceUpdateRequestRepository extends JpaRepository<FaceUpdateRequest, Long> {
    List<FaceUpdateRequest> findAllByOrderByCreatedAtDesc();
    List<FaceUpdateRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<FaceUpdateRequest> findByEmployeeTypeOrderByCreatedAtDesc(String employeeType);
    List<FaceUpdateRequest> findByEmployeeIdAndStatus(Long employeeId, String status);
}

