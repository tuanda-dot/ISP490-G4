package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mã OTP Động theo ngày của Công trình (Daily Dynamic OTP)
 * Do Chỉ huy trưởng công trình (Site Manager) tạo vào đầu ca làm việc mỗi ngày.
 * Kỹ sư công trường bắt buộc phải nhập mã OTP này kết hợp với GPS Geofencing để chấm công.
 */
@Entity
@Table(name = "daily_site_otps", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"projectId", "validDate"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailySiteOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 10)
    private String otpCode; // Mã OTP 6 chữ số ngẫu nhiên

    @Column(nullable = false)
    private LocalDate validDate;

    // ID của Chỉ huy trưởng công trình đã tạo mã OTP này
    @Column(nullable = false)
    private Long generatedBy;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
