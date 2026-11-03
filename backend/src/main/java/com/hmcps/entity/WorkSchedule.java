package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private Long shiftId;

    private Long projectId; // null nếu là khối văn phòng làm tại trụ sở

    @Column(nullable = false)
    private LocalDate workDate;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
