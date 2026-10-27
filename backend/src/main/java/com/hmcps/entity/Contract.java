package com.hmcps.entity;

import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.ContractType;
import com.hmcps.common.enums.InsuranceFlag;
import com.hmcps.common.enums.TaxFlag;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String contractNumber;

    @Column(nullable = false)
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContractType contractType;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    // Lương chính theo hợp đồng làm căn cứ tính công và bảo hiểm
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal baseSalary;

    // Cờ bảo hiểm: FULL, NO_INSURANCE, HEALTH_ONLY, MATERNITY
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InsuranceFlag insuranceFlag = InsuranceFlag.FULL;

    // Cờ thuế TNCN: PROGRESSIVE (lũy tiến), FLAT_10 (khoán 10%), COMMITMENT (cam kết)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TaxFlag taxFlag = TaxFlag.PROGRESSIVE;

    // Trạng thái: ACTIVE (Hợp đồng có hiệu lực là điều kiện tiên quyết để tạo tài khoản & đăng nhập)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContractStatus status = ContractStatus.ACTIVE;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
