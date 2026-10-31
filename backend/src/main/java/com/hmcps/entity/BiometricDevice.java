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
    private String deviceType = "FACE_ID_CAMERA"; // FACE_ID_CAMERA, TABLET_KIOSK, WEBCAM_PORTAL, ZKTECO_HARDWARE

    @Column(nullable = false, length = 45)
    private String ipAddress;

    @Builder.Default
    private Integer port = 4370;

    @Column(length = 150)
    private String location; // Vd: Sảnh tầng 1 - Trụ sở chính

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
