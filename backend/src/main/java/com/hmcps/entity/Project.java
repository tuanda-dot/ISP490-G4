package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    private String address;

    // Tọa độ tâm công trình phục vụ GPS Geofencing
    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    // Bán kính khoanh vùng địa lý cho phép chấm công (mặc định 100m)
    @Column(nullable = false)
    @Builder.Default
    private Double geofenceRadiusMeters = 100.0;

    // ID của Chỉ huy trưởng công trình phụ trách dự án
    private Long siteManagerId;

    private LocalDate startDate;
    private LocalDate endDate;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, SUSPENDED

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
