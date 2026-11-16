package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String settingKey; // SMTP_CONFIG, SMS_CONFIG, GPS_CONFIG, BIOMETRIC_CONFIG, SECURITY_CONFIG, RBAC_MATRIX

    @Column(nullable = false, length = 40)
    private String settingGroup; // SMTP, SMS, GPS, BIOMETRIC, SECURITY, RBAC

    @Column(nullable = false, columnDefinition = "TEXT")
    private String settingValueJson;

    @Column(length = 150)
    private String updatedBy;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    public void touchTimestamp() {
        updatedAt = LocalDateTime.now();
    }
}
