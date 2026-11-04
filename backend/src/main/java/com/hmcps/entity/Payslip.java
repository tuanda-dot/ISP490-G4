package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payslips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long payrollItemId;

    @Column(nullable = false)
    private Long employeeId;

    @Column(name = "period_month", nullable = false)
    private Integer month;

    @Column(name = "period_year", nullable = false)
    private Integer year;

    private LocalDateTime sentAt;
    private LocalDateTime viewedAt;

    @Builder.Default
    private String status = "GENERATED"; // GENERATED, SENT, VIEWED

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
