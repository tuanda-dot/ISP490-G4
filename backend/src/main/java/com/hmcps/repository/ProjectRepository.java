package com.hmcps.repository;

import com.hmcps.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByCode(String code);
    List<Project> findBySiteManagerId(Long siteManagerId);
    List<Project> findByStatus(String status);
}
