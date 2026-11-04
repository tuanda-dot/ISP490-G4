package com.hmcps.entity;

import com.hmcps.common.enums.AccountCode;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "salary_components")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // MEAL, FUEL, PHONE, POSITION, SENIORITY, SITE_LODGING, HAZARD, PROJECT_RESPONSIBILITY

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 30)
    private String componentType; // ALLOWANCE, BONUS, DEDUCTION

    // Khoản này có tính vào nền đóng BHXH không? (Chỉ áp dụng với phụ cấp cố định khối văn phòng)
    @Builder.Default
    private Boolean isInsuranceBase = false;

    // Khoản này có tính thuế TNCN không? (Cơm, tăng ca, độc hại được miễn theo luật)
    @Builder.Default
    private Boolean isTaxable = true;

    // Khoản này có bị chia theo ngày công thực tế / công chuẩn không? (Prorated)
    @Builder.Default
    private Boolean isProratedByDays = true;

    // Phân bổ hạch toán chi phí kế toán
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AccountCode defaultAccountCode;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
