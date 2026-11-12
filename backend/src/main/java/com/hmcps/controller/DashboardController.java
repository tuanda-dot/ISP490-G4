package com.hmcps.controller;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Payroll;
import com.hmcps.entity.ProjectCostAllocation;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.PayrollRepository;
import com.hmcps.repository.ProjectCostAllocationRepository;
import com.hmcps.repository.ProjectRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller Dashboard Điều hành Chi phí Nhân sự & Quỹ lương (FE-14: UC-26)
 * Cung cấp số liệu phân tích tài chính đa chiều cho Ban Giám đốc và Kế toán trưởng
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final PayrollRepository payrollRepository;
    private final ProjectCostAllocationRepository costAllocationRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;

    @GetMapping({"/", "/api/v1", "/api/v1/health"})
    public ResponseEntity<Map<String, Object>> getApiRootStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("system", "HMCPS - Hệ Thống Quản Lý Tiền Lương & Nhân Sự Xây Dựng Hải Minh (Backend REST API)");
        status.put("frontendWebAppUrl", "http://localhost:5173");
        status.put("swaggerDocsUrl", "http://localhost:8080/swagger-ui/index.html");
        status.put("h2ConsoleUrl", "http://localhost:8080/h2-console");
        status.put("h2JdbcUrl", "jdbc:h2:file:./target/hmcps_dev_db");
        status.put("h2Username", "sa");
        status.put("h2Password", "(để trống)");
        status.put("totalEmployees", employeeRepository.count());
        return ResponseEntity.ok(status);
    }

    @Data
    @Builder
    public static class ExecutiveDashboardResponse {
        private Payroll latestPayroll;
        private long totalEmployees;
        private long totalOfficeStaff;
        private long totalSiteEngineers;
        private long totalActiveProjects;
        private Map<String, BigDecimal> costAllocationByAccount; // TK_622, TK_627, TK_642
        private BigDecimal totalCostAllocated;
        private boolean isBalanced;
    }

    @GetMapping("/api/dashboard/executive")
    public ResponseEntity<ExecutiveDashboardResponse> getExecutiveDashboard(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        Payroll targetPayroll = null;
        if (month != null && year != null) {
            targetPayroll = payrollRepository.findByMonthAndYear(month, year).orElse(null);
        } else {
            List<Payroll> allPayrolls = payrollRepository.findAll();
            if (!allPayrolls.isEmpty()) {
                targetPayroll = allPayrolls.get(allPayrolls.size() - 1);
            }
        }

        long officeCount = employeeRepository.findAll().stream()
                .filter(e -> e.getEmployeeType() == EmployeeType.OFFICE_STAFF)
                .count();

        long siteCount = employeeRepository.findAll().stream()
                .filter(e -> e.getEmployeeType() == EmployeeType.SITE_ENGINEER)
                .count();

        long projectCount = projectRepository.findByStatus("ACTIVE").size();

        Map<String, BigDecimal> costByAccount = new HashMap<>();
        costByAccount.put("TK_622", BigDecimal.ZERO);
        costByAccount.put("TK_627", BigDecimal.ZERO);
        costByAccount.put("TK_642", BigDecimal.ZERO);
        BigDecimal totalCost = BigDecimal.ZERO;

        if (targetPayroll != null) {
            List<ProjectCostAllocation> allocations = costAllocationRepository.findByPayrollId(targetPayroll.getId());
            for (ProjectCostAllocation a : allocations) {
                String accKey = a.getAccountCode() != null ? a.getAccountCode().name() : "TK_622";
                BigDecimal current = costByAccount.getOrDefault(accKey, BigDecimal.ZERO);
                costByAccount.put(accKey, current.add(a.getAllocatedAmount()));
                totalCost = totalCost.add(a.getAllocatedAmount());
            }
        }

        return ResponseEntity.ok(ExecutiveDashboardResponse.builder()
                .latestPayroll(targetPayroll)
                .totalEmployees(officeCount + siteCount)
                .totalOfficeStaff(officeCount)
                .totalSiteEngineers(siteCount)
                .totalActiveProjects(projectCount)
                .costAllocationByAccount(costByAccount)
                .totalCostAllocated(totalCost)
                .isBalanced(targetPayroll != null ? targetPayroll.getIsAccountingBalanced() : true)
                .build());
    }
}
