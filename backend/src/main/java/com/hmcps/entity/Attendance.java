package com.hmcps.entity;

import com.hmcps.common.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employeeId", "workDate", "shiftId"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    private Long projectId; // null nếu là nhân viên văn phòng

    private Long shiftId;

    @Column(nullable = false)
    private LocalDate workDate;

    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;

    // Số giờ công thực tế
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal actualHours = BigDecimal.ZERO;

    // Số giờ công thường (tối đa 8h/ngày)
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal regularHours = BigDecimal.ZERO;

    // Số giờ làm thêm (OT)
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    // Số giờ làm ca đêm (22:00 - 06:00, hưởng phụ cấp đêm 30%)
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal nightHours = BigDecimal.ZERO;

    // Tọa độ GPS khi kỹ sư bấm check-in
    @Column(precision = 10, scale = 7)
    private BigDecimal checkInLatitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal checkInLongitude;

    // Khoảng cách thực tế đến tâm công trình (mét)
    private Double distanceMeters;

    // Mã OTP đã nhập khi chấm công
    @Column(length = 10)
    private String otpEntered;

    // Dữ liệu xác thực Face ID Camera
    @Column(columnDefinition = "TEXT")
    private String faceSnapshotUrl;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Builder.Default
    private Boolean livenessVerified = false;

    @Column(length = 255)
    private String deviceInfo;

    // Trạng thái chấm công
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AttendanceStatus status;

    private String notes;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
