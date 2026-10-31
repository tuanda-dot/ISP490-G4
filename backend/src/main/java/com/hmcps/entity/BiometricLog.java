package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "biometric_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long deviceId;

    // ID người dùng trên máy chấm công / Kiosk
    private Integer biometricUserId;

    private Long employeeId;

    @Column(nullable = false)
    private LocalDateTime logTimestamp;

    @Builder.Default
    private String verifyType = "FACE_ID"; // FACE_ID, LIVENESS_CHECK, FINGERPRINT

    @Column(columnDefinition = "TEXT")
    private String faceSnapshotUrl;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Builder.Default
    private Boolean livenessVerified = false;

    @Builder.Default
    private Boolean isProcessed = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
