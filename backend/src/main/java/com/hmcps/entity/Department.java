package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    private String address;

    @Column(precision = 10, scale = 7)
    @Builder.Default
    private BigDecimal latitude = new BigDecimal("10.7768890");

    @Column(precision = 10, scale = 7)
    @Builder.Default
    private BigDecimal longitude = new BigDecimal("106.7008060");

    @Builder.Default
    private Double geofenceRadiusMeters = 100.0;

    private String description;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
