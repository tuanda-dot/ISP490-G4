package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "biometric_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String deviceName;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String deviceType = "MOBILE_APP_CAMERA"; // MOBILE_APP_CAMERA, MOBILE_IOS_CAMERA, MOBILE_ANDROID_CAMERA, MOBILE_WEB_WEBRTC

    @Column(nullable = false, length = 45)
    private String ipAddress;

    @Builder.Default
    private Integer port = 443;

    @Column(length = 150)
    private String location; // Vd: Camera Di Động - Trụ sở chính / Công trường

    @Column(precision = 4, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal confidenceThreshold = new BigDecimal("0.85");

    @Builder.Default
    private Boolean livenessEnabled = true;

    @Builder.Default
    private String status = "ONLINE"; // ONLINE, OFFLINE

    private LocalDateTime lastSyncAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
