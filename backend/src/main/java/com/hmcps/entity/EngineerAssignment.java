package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "engineer_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngineerAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private Long projectId;

    @Column(length = 100)
    private String roleOnSite; // Chỉ huy phó, Kỹ sư giám sát kết cấu, Kỹ sư an toàn, Kỹ sư QS

    @Column(nullable = false)
    private LocalDate assignedDate;

    private LocalDate releaseDate;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, RELEASED

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
