package com.hmcps.entity;

import com.hmcps.common.enums.ShiftType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code; // CA_NGAY, CA_DEM, CA_TANG_CA

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ShiftType shiftType;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Builder.Default
    private Integer breakMinutes = 60;

    // Hệ số lương của ca (1.0 cho ngày thường, 1.3 cho ca đêm, 1.5 - 3.0 cho tăng ca)
    @Column(precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal multiplier = BigDecimal.ONE;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
