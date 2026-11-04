package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String action; // TIMESHEET_LOCK, PAYROLL_CALCULATE, FORMULA_UPDATE, OT_APPROVAL

    @Column(nullable = false, length = 100)
    private String entityName; // monthly_timesheets, payrolls, compliance_rules, overtime_requests

    private Long entityId;

    private Long performedById;

    @Column(length = 150)
    private String performedByName;

    @Column(length = 50)
    private String performedByRole;

    @Column(length = 45)
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String oldValueJson;

    @Column(columnDefinition = "TEXT")
    private String newValueJson;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
