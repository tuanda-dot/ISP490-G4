package com.hmcps.entity;

import com.hmcps.common.enums.EmployeeType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String employeeCode;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(unique = true, length = 20)
    private String citizenId; // CCCD

    private Long departmentId;

    @Column(length = 100)
    private String position;

    // Phân loại nhân sự: OFFICE_STAFF (Văn phòng) vs SITE_ENGINEER (Kỹ sư công trường)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmployeeType employeeType;

    // ID định danh trên máy chấm công vật lý / FaceID ZKTeco (nếu có)
    private Integer biometricId;

    // Trường dữ liệu Face ID AI sinh trắc học
    @Column(columnDefinition = "TEXT")
    private String faceImageUrl;

    @Column(columnDefinition = "TEXT")
    private String faceEmbedding;

    @Builder.Default
    private Boolean isFaceRegistered = false;

    // Cờ đoàn viên công đoàn (1 = đoàn viên -> đóng 1% đoàn phí, 0 = không đóng)
    @Builder.Default
    private Boolean isUnionMember = false;

    // Số người phụ thuộc giảm trừ gia cảnh thuế TNCN (mỗi NPT giảm 4.400.000 đ)
    @Builder.Default
    private Integer dependentsCount = 0;

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    // Mức lương cơ bản thỏa thuận (VNĐ)
    @Column(precision = 15, scale = 2)
    private BigDecimal baseSalary;

    private LocalDate hireDate;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, ON_LEAVE, TERMINATED

    // Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên
    @Builder.Default
    private Boolean mustChangePassword = true;

    private String passwordHash;

    @Column(length = 50)
    @Builder.Default
    private String role = "ROLE_OFFICE_STAFF";

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
