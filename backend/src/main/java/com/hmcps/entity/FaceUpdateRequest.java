package com.hmcps.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Yêu cầu đăng ký mới hoặc cập nhật ảnh khuôn mặt gốc Face ID (Maker - Checker).
 * Nhân viên tự gửi ảnh đề nghị + lý do (PENDING); HR/Admin hoặc Chỉ huy trưởng thẩm định
 * trước khi ghi đè dữ liệu sinh trắc học chính thức trên hồ sơ nhân sự.
 */
@Entity
@Table(name = "face_update_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceUpdateRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(length = 30)
    private String employeeCode;

    @Column(length = 150)
    private String employeeName;

    @Column(length = 30)
    private String employeeType; // OFFICE_STAFF | SITE_ENGINEER

    @Column(columnDefinition = "TEXT")
    private String currentFaceImageUrl;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String proposedFaceImageUrl;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String proposedFaceEmbedding;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

    private Long reviewedById;

    @Column(length = 150)
    private String reviewedByName;

    @Column(length = 50)
    private String reviewedByRole;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;
}

