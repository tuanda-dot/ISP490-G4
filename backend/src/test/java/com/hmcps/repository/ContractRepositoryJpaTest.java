package com.hmcps.repository;

import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.ContractType;
import com.hmcps.common.enums.InsuranceFlag;
import com.hmcps.common.enums.TaxFlag;
import com.hmcps.entity.Contract;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test tầng CSDL cho ContractRepository (FE-03: UC-08)
 * Kiểm tra ràng buộc hợp đồng và logic nghiệp vụ query kiểm tra hợp đồng còn hiệu lực.
 */
@DataJpaTest
class ContractRepositoryJpaTest {

    @Autowired
    private ContractRepository contractRepository;

    @Test
    @DisplayName("Query: existsActiveContract trả về TRUE khi có HĐLĐ ACTIVE và còn hạn")
    void testExistsActiveContract_ActiveAndValid_ReturnsTrue() {
        Long empId = 100L;
        LocalDate today = LocalDate.of(2026, 10, 28);

        Contract activeContract = Contract.builder()
                .employeeId(empId)
                .contractNumber("HDLD-2026-100")
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .baseSalary(new BigDecimal("15000000.00"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        contractRepository.save(activeContract);

        boolean exists = contractRepository.existsActiveContract(empId, ContractStatus.ACTIVE, today);
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Query: existsActiveContract trả về FALSE khi HĐLĐ đã hết hạn (endDate < today)")
    void testExistsActiveContract_Expired_ReturnsFalse() {
        Long empId = 101L;
        LocalDate today = LocalDate.of(2026, 10, 28);

        Contract expiredContract = Contract.builder()
                .employeeId(empId)
                .contractNumber("HDLD-2025-101")
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.of(2025, 1, 1))
                .endDate(LocalDate.of(2026, 6, 30)) // Hết hạn tháng 6/2026
                .baseSalary(new BigDecimal("12000000.00"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        contractRepository.save(expiredContract);

        boolean exists = contractRepository.existsActiveContract(empId, ContractStatus.ACTIVE, today);
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Query: existsActiveContract trả về FALSE khi hợp đồng bị chấm dứt (TERMINATED)")
    void testExistsActiveContract_TerminatedStatus_ReturnsFalse() {
        Long empId = 102L;
        LocalDate today = LocalDate.of(2026, 10, 28);

        Contract terminatedContract = Contract.builder()
                .employeeId(empId)
                .contractNumber("HDLD-2026-102")
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.TERMINATED)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .baseSalary(new BigDecimal("18000000.00"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        contractRepository.save(terminatedContract);

        boolean exists = contractRepository.existsActiveContract(empId, ContractStatus.ACTIVE, today);
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Query: existsActiveContract trả về TRUE với Hợp đồng không xác định thời hạn (endDate IS NULL)")
    void testExistsActiveContract_IndefiniteTerm_ReturnsTrue() {
        Long empId = 103L;
        LocalDate today = LocalDate.of(2026, 10, 28);

        Contract indefiniteContract = Contract.builder()
                .employeeId(empId)
                .contractNumber("HDLD-VTH-103")
                .contractType(ContractType.OFFICIAL_INDEFINITE)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.of(2020, 1, 1))
                .endDate(null) // Vô thời hạn
                .baseSalary(new BigDecimal("25000000.00"))
                .insuranceFlag(InsuranceFlag.FULL)
                .taxFlag(TaxFlag.PROGRESSIVE)
                .build();

        contractRepository.save(indefiniteContract);

        boolean exists = contractRepository.existsActiveContract(empId, ContractStatus.ACTIVE, today);
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Cảnh báo HĐLĐ sắp hết hạn: Lọc đúng các hợp đồng trong khoảng thời gian xác định")
    void testFindByEndDateBetweenAndStatus() {
        LocalDate startAlert = LocalDate.of(2026, 11, 1);
        LocalDate endAlert = LocalDate.of(2026, 11, 30);

        Contract expiring = Contract.builder()
                .employeeId(104L)
                .contractNumber("HDLD-EXP-01")
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.of(2025, 11, 15))
                .endDate(LocalDate.of(2026, 11, 15)) // Nằm trong khoảng cảnh báo
                .baseSalary(new BigDecimal("14000000.00"))
                .build();

        Contract notExpiring = Contract.builder()
                .employeeId(105L)
                .contractNumber("HDLD-OK-02")
                .contractType(ContractType.OFFICIAL_DEFINITE)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2027, 12, 31)) // Ngoài khoảng cảnh báo
                .baseSalary(new BigDecimal("16000000.00"))
                .build();

        contractRepository.save(expiring);
        contractRepository.save(notExpiring);

        List<Contract> expiringList = contractRepository.findByEndDateBetweenAndStatus(
                startAlert, endAlert, ContractStatus.ACTIVE);

        assertThat(expiringList).hasSize(1);
        assertThat(expiringList.get(0).getContractNumber()).isEqualTo("HDLD-EXP-01");
    }
}
