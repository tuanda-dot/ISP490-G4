package com.hmcps.common.config;

import com.hmcps.common.enums.*;
import com.hmcps.entity.*;
import com.hmcps.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Khởi tạo dữ liệu mẫu thực tế cho hệ thống HMCPS khi khởi động.
 * Đảm bảo hệ thống có sẵn:
 * - 4 Phòng ban & Trụ sở HQ Geofence
 * - 3 Dự án công trường xây dựng trọng điểm (kèm Geofence & GPS)
 * - 13 Tài khoản người dùng tương ứng 13 Roles chuẩn RBAC
 * - Hợp đồng lao động active cho toàn bộ nhân sự (phân tách Office Staff vs Site Engineer)
 * - Bộ tham số pháp lý lao động 2026 (Nghị định 158/2025/NĐ-CP & Luật thuế TNCN)
 * - Danh mục phụ cấp công trường (miễn bảo hiểm / miễn thuế)
 * - Ca làm việc ngày, đêm, tăng ca
 * - Điều động kỹ sư hiện trường & Daily Site OTP hôm nay
 * - Bảng chấm công mẫu và bảng lương mẫu 8 khối cột (A -> H)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final ComplianceRuleRepository complianceRuleRepository;
    private final SalaryComponentRepository salaryComponentRepository;
    private final ShiftRepository shiftRepository;
    private final EngineerAssignmentRepository engineerAssignmentRepository;
    private final DailySiteOtpRepository dailySiteOtpRepository;
    private final MonthlyTimesheetRepository monthlyTimesheetRepository;
    private final PayrollRepository payrollRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final PasswordEncoder passwordEncoder;
    private final SalaryGradeRepository salaryGradeRepository;
    private final OvertimeRequestRepository overtimeRequestRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceExplanationRepository attendanceExplanationRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking HMCPS demo seed data status...");

        seedComplianceRules();
        seedSalaryComponents();
        seedSalaryGrades();
        seedShifts();

        if (departmentRepository.count() == 0) {
            log.info("Database is empty. Initializing comprehensive HMCPS demo dataset...");
            seedDepartmentsAndProjects();
            seedEmployeesAndContracts();
            seedSiteAssignmentsAndOtps();
            seedTimesheetsAndPayroll();
            seedWorkflowRequests();
            seedAuditLogs();
            log.info("HMCPS demo dataset successfully initialized!");
        } else {
            ensureStandardDemoAccounts();
            seedWorkflowRequests();
            seedAuditLogs();
            log.info("HMCPS database already initialized with {} employees and {} departments.",
                    employeeRepository.count(), departmentRepository.count());
        }
    }

    private void seedComplianceRules() {
        if (complianceRuleRepository.count() > 0) return;

        LocalDate effDate = LocalDate.of(2026, 1, 1);
        List<ComplianceRule> rules = List.of(
                ComplianceRule.builder().ruleKey("REFERENCE_AMOUNT").ruleValue(new BigDecimal("2340000.0000"))
                        .effectiveDate(effDate).description("Mức lương cơ sở năm 2026").legalReference("Nghị định 158/2025/NĐ-CP").build(),
                ComplianceRule.builder().ruleKey("BHXH_CAP").ruleValue(new BigDecimal("46800000.0000"))
                        .effectiveDate(effDate).description("Mức trần đóng BHXH/BHYT (20 lần lương cơ sở)").legalReference("Luật BHXH").build(),
                ComplianceRule.builder().ruleKey("BHTN_CAP").ruleValue(new BigDecimal("106200000.0000"))
                        .effectiveDate(effDate).description("Mức trần đóng BHTN (20 lần lương tối thiểu vùng I)").legalReference("Luật Việc làm").build(),
                ComplianceRule.builder().ruleKey("MIN_WAGE").ruleValue(new BigDecimal("5310000.0000"))
                        .effectiveDate(effDate).description("Mức lương tối thiểu Vùng I (Hà Nội & TP.HCM)").legalReference("Nghị định 74/2024/NĐ-CP").build(),
                ComplianceRule.builder().ruleKey("PERSONAL_DEDUCTION").ruleValue(new BigDecimal("11000000.0000"))
                        .effectiveDate(effDate).description("Giảm trừ gia cảnh bản thân (tháng)").legalReference("Luật Thuế TNCN").build(),
                ComplianceRule.builder().ruleKey("DEPENDENT_DEDUCTION").ruleValue(new BigDecimal("4400000.0000"))
                        .effectiveDate(effDate).description("Giảm trừ người phụ thuộc (tháng/người)").legalReference("Luật Thuế TNCN").build(),
                ComplianceRule.builder().ruleKey("MEAL_EXEMPT_THRESHOLD").ruleValue(new BigDecimal("730000.0000"))
                        .effectiveDate(effDate).description("Hạn mức phụ cấp ăn ca tối đa được miễn thuế TNCN").legalReference("Thông tư 111/2013/TT-BTC").build()
        );
        complianceRuleRepository.saveAll(rules);
        log.info("Seeded {} compliance rules for labor year 2026.", rules.size());
    }

    private void seedSalaryComponents() {
        if (salaryComponentRepository.count() > 0) return;

        List<SalaryComponent> components = List.of(
                SalaryComponent.builder().code("MEAL").name("Phụ cấp ăn ca").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(false).isProratedByDays(true).defaultAccountCode(AccountCode.TK_642).build(),
                SalaryComponent.builder().code("SITE_LODGING").name("Phụ cấp lưu trú công trình").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(false).isProratedByDays(true).defaultAccountCode(AccountCode.TK_622).build(),
                SalaryComponent.builder().code("HAZARD").name("Phụ cấp độc hại công trường").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(false).isProratedByDays(true).defaultAccountCode(AccountCode.TK_622).build(),
                SalaryComponent.builder().code("PROJECT_RESPONSIBILITY").name("Phụ cấp trách nhiệm gói thầu").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(true).isProratedByDays(false).defaultAccountCode(AccountCode.TK_627).build(),
                SalaryComponent.builder().code("FUEL").name("Phụ cấp xăng xe đi lại").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(true).isProratedByDays(true).defaultAccountCode(AccountCode.TK_642).build(),
                SalaryComponent.builder().code("PHONE").name("Phụ cấp điện thoại liên lạc").componentType("ALLOWANCE")
                        .isInsuranceBase(false).isTaxable(false).isProratedByDays(false).defaultAccountCode(AccountCode.TK_642).build()
        );
        salaryComponentRepository.saveAll(components);
        log.info("Seeded {} salary allowance components.", components.size());
    }

    private void seedShifts() {
        if (shiftRepository.count() > 0) return;

        List<Shift> shifts = List.of(
                Shift.builder().code("CA_NGAY").name("Ca hành chính / Ca ngày (08:00 - 17:30)").shiftType(ShiftType.DAY_SHIFT)
                        .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(17, 30)).breakMinutes(90).multiplier(BigDecimal.ONE).build(),
                Shift.builder().code("CA_CONG_TRUONG").name("Ca thi công ngày (07:00 - 17:00)").shiftType(ShiftType.DAY_SHIFT)
                        .startTime(LocalTime.of(7, 0)).endTime(LocalTime.of(17, 0)).breakMinutes(120).multiplier(BigDecimal.ONE).build(),
                Shift.builder().code("CA_DEM").name("Ca đổ bê tông đêm (19:00 - 04:00)").shiftType(ShiftType.NIGHT_SHIFT)
                        .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(4, 0)).breakMinutes(60).multiplier(new BigDecimal("1.30")).build(),
                Shift.builder().code("CA_TANG_CA").name("Ca làm thêm giờ OT (17:30 - 21:30)").shiftType(ShiftType.OVERTIME_SHIFT)
                        .startTime(LocalTime.of(17, 30)).endTime(LocalTime.of(21, 30)).breakMinutes(30).multiplier(new BigDecimal("1.50")).build()
        );
        shiftRepository.saveAll(shifts);
        log.info("Seeded {} shifts.", shifts.size());
    }

    private void seedDepartmentsAndProjects() {
        // Departments
        Department bgd = Department.builder().code("BGD").name("Ban Giám Đốc")
                .address("Tầng 18, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội")
                .latitude(new BigDecimal("21.0285110")).longitude(new BigDecimal("105.8544440"))
                .geofenceRadiusMeters(100.0).description("Khối điều hành cấp cao").build();

        Department hr = Department.builder().code("HR").name("Phòng Hành chính - Nhân sự")
                .address("Tầng 16, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội")
                .latitude(new BigDecimal("21.0285110")).longitude(new BigDecimal("105.8544440"))
                .geofenceRadiusMeters(100.0).description("Quản trị nhân sự và tuyển dụng").build();

        Department kt = Department.builder().code("KT").name("Phòng Kế toán - Tài chính")
                .address("Tầng 16, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội")
                .latitude(new BigDecimal("21.0285110")).longitude(new BigDecimal("105.8544440"))
                .geofenceRadiusMeters(100.0).description("Hạch toán kế toán và chi trả lương").build();

        Department bql = Department.builder().code("BQL").name("Ban Quản lý Dự án & Kỹ thuật Hiện trường")
                .address("Tầng 15, Tòa nhà Hải Minh Tower, Cầu Giấy, Hà Nội")
                .latitude(new BigDecimal("21.0285110")).longitude(new BigDecimal("105.8544440"))
                .geofenceRadiusMeters(150.0).description("Chỉ đạo kỹ thuật thi công các công trình").build();

        departmentRepository.saveAll(List.of(bgd, hr, kt, bql));

        // Projects (Construction Sites)
        Project p1 = Project.builder().code("DA-NHATTAN2").name("Dự án Cầu Nhật Tân Giai đoạn 2")
                .address("Đông Anh - Tây Hồ, TP. Hà Nội")
                .latitude(new BigDecimal("21.0924320")).longitude(new BigDecimal("105.8197650"))
                .geofenceRadiusMeters(200.0).status("ACTIVE")
                .startDate(LocalDate.of(2026, 1, 1)).endDate(LocalDate.of(2027, 12, 31)).build();

        Project p2 = Project.builder().code("DA-LANDMARK").name("Tòa nhà Hải Minh Landmark Riverside")
                .address("Bạch Đằng, Quận Hải Châu, TP. Đà Nẵng")
                .latitude(new BigDecimal("16.0544070")).longitude(new BigDecimal("108.2021670"))
                .geofenceRadiusMeters(150.0).status("ACTIVE")
                .startDate(LocalDate.of(2026, 3, 1)).endDate(LocalDate.of(2028, 6, 30)).build();

        Project p3 = Project.builder().code("DA-EXPRESSWAY").name("Cao tốc Bắc - Nam Gói thầu XL-12")
                .address("Huyện Diễn Châu, Tỉnh Nghệ An")
                .latitude(new BigDecimal("18.6795850")).longitude(new BigDecimal("105.6813350"))
                .geofenceRadiusMeters(300.0).status("ACTIVE")
                .startDate(LocalDate.of(2025, 9, 1)).endDate(LocalDate.of(2027, 6, 30)).build();

        projectRepository.saveAll(List.of(p1, p2, p3));
    }

    private List<Employee> buildStandardEmployees(Department bgd, Department hr, Department kt, Department bql, String defaultPasswordHash) {
        return List.of(
                // 1. HM-001: Tổng Giám Đốc
                Employee.builder().employeeCode("HM-001").fullName("Lê Phúc Hà").email("ceo.ha@haiminh.vn")
                        .phone("0901234567").citizenId("001085001234").departmentId(bgd.getId()).position("Tổng Giám Đốc")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_DIRECTOR").baseSalary(new BigDecimal("45000000.00"))
                        .dependentsCount(2).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2020, 1, 1)).build(),

                // 2. HM-002: Kế Toán Trưởng
                Employee.builder().employeeCode("HM-002").fullName("Đoàn Anh Tuấn").email("ketoantruong.tuan@haiminh.vn")
                        .phone("0902345678").citizenId("001088002345").departmentId(kt.getId()).position("Kế Toán Trưởng")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_CHIEF_ACCOUNTANT").baseSalary(new BigDecimal("28000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2022, 5, 1)).build(),

                // 3. HM-003: Quản Trị Hệ Thống
                Employee.builder().employeeCode("HM-003").fullName("Nguyễn Hữu Thịnh").email("admin.thinh@haiminh.vn")
                        .phone("0903456789").citizenId("001092003456").departmentId(bgd.getId()).position("Quản Trị Hệ Thống")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_ADMIN").baseSalary(new BigDecimal("22000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 1, 1)).build(),

                // 4. HM-004: Trưởng Phòng Nhân Sự
                Employee.builder().employeeCode("HM-004").fullName("Nguyễn Thu Giang").email("hr.giang@haiminh.vn")
                        .phone("0904567890").citizenId("001095004567").departmentId(hr.getId()).position("Trưởng Phòng Nhân Sự")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_HR_MANAGER").baseSalary(new BigDecimal("26000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2021, 11, 1)).build(),

                // 5. HM-005: Chỉ Huy Trưởng Công Trường
                Employee.builder().employeeCode("HM-005").fullName("Nguyễn Lê Gia Phát").email("chihuytruong.phat@haiminh.vn")
                        .phone("0905678901").citizenId("001090005678").departmentId(bql.getId()).position("Chỉ Huy Trưởng Công Trường")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_MANAGER").baseSalary(new BigDecimal("38000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2022, 3, 1)).build(),

                // 6. HM-006: Kỹ Sư Kết Cấu Hiện Trường
                Employee.builder().employeeCode("HM-006").fullName("Trần Văn Trung").email("kysu.trung@haiminh.vn")
                        .phone("0906789012").citizenId("001094006789").departmentId(bql.getId()).position("Kỹ Sư Kết Cấu Hiện Trường")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("25000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 6, 1)).build(),

                // 7. HM-007: Kỹ Sư Giám Sát MEP
                Employee.builder().employeeCode("HM-007").fullName("Phạm Thành Nam").email("kysu.nam@haiminh.vn")
                        .phone("0907890123").citizenId("001096007890").departmentId(bql.getId()).position("Kỹ Sư Giám Sát MEP")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("21000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 3, 1)).build(),

                // 8. HM-008: Kỹ Sư Trắc Địa Công Trường
                Employee.builder().employeeCode("HM-008").fullName("Đặng Hoàng Nam").email("kysu.hoangnam@haiminh.vn")
                        .phone("0908111222").citizenId("001095008111").departmentId(bql.getId()).position("Kỹ Sư Trắc Địa Công Trường")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("20000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 2, 1)).build(),

                // 9. HM-009: Kỹ Sư An Toàn Lao Động (HSE)
                Employee.builder().employeeCode("HM-009").fullName("Lê Minh Khôi").email("kysu.khoi@haiminh.vn")
                        .phone("0908222333").citizenId("001095008222").departmentId(bql.getId()).position("Kỹ Sư An Toàn Lao Động (HSE)")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("22000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 9, 1)).build(),

                // 10. HM-010: Kỹ Sư Vật Liệu & Dự Toán QS
                Employee.builder().employeeCode("HM-010").fullName("Vũ Trọng Nghĩa").email("kysu.nghia@haiminh.vn")
                        .phone("0908333444").citizenId("001095008333").departmentId(bql.getId()).position("Kỹ Sư Vật Liệu & Dự Toán QS")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("23000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 10, 1)).build(),

                // 11. HM-014: Tân Kỹ Sư (Đổi MK lần đầu)
                Employee.builder().employeeCode("HM-014").fullName("Đặng Tuấn Tú").email("newbie.engineer@haiminh.vn")
                        .phone("0908444555").citizenId("001099008444").departmentId(bql.getId()).position("Kỹ Sư Hiện Trường Tập Sự")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("16000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(true).status("ACTIVE").hireDate(LocalDate.of(2026, 10, 1)).build(),

                // 12. HM-015: Chuyên Viên Nhân Sự (C&B)
                Employee.builder().employeeCode("HM-015").fullName("Phạm Thị Mai").email("hrstaff.mai@haiminh.vn")
                        .phone("0908901234").citizenId("001097008901").departmentId(hr.getId()).position("Chuyên Viên Nhân Sự (C&B)")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_HR_OFFICER").baseSalary(new BigDecimal("16000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 2, 1)).build(),

                // 13. HM-016: Chuyên Viên Kế Toán Tiền Lương
                Employee.builder().employeeCode("HM-016").fullName("Hoàng Thị Lan").email("ketoan.lan@haiminh.vn")
                        .phone("0909012345").citizenId("001098009012").departmentId(kt.getId()).position("Chuyên Viên Kế Toán Tiền Lương")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_PAYROLL_ACCOUNTANT").baseSalary(new BigDecimal("18000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 8, 1)).build(),

                // 14. HM-017: Chuyên Viên Hành Chính Tổng Hợp
                Employee.builder().employeeCode("HM-017").fullName("Vũ Hải Đăng").email("vanphong.dang@haiminh.vn")
                        .phone("0909123456").citizenId("001099009123").departmentId(hr.getId()).position("Chuyên Viên Hành Chính Tổng Hợp")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_OFFICE_STAFF").baseSalary(new BigDecimal("14000000.00"))
                        .dependentsCount(0).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 7, 1)).build()
        );
    }

    private void ensureStandardDemoAccounts() {
        String defaultPasswordHash = passwordEncoder.encode("Password123@");
        Department bgd = departmentRepository.findByCode("BGD").orElseGet(() -> departmentRepository.findAll().get(0));
        Department hr = departmentRepository.findByCode("HR").orElse(bgd);
        Department kt = departmentRepository.findByCode("KT").orElse(bgd);
        Department bql = departmentRepository.findByCode("BQL").orElse(bgd);

        List<Employee> standardList = buildStandardEmployees(bgd, hr, kt, bql, defaultPasswordHash);
        for (int i = 0; i < standardList.size(); i++) {
            Employee std = standardList.get(i);
            Employee existing = employeeRepository.findByEmail(std.getEmail()).orElse(null);
            if (existing == null) {
                existing = employeeRepository.findByEmployeeCode(std.getEmployeeCode()).orElse(null);
            }
            if (existing == null) {
                Employee saved = employeeRepository.save(std);
                Contract contract = Contract.builder()
                        .contractNumber("HDLD-HM-2026/STD-" + saved.getEmployeeCode())
                        .employeeId(saved.getId())
                        .contractType(ContractType.OFFICIAL_INDEFINITE)
                        .startDate(saved.getHireDate())
                        .endDate(null)
                        .baseSalary(saved.getBaseSalary())
                        .insuranceFlag(InsuranceFlag.FULL)
                        .taxFlag(TaxFlag.PROGRESSIVE)
                        .status(ContractStatus.ACTIVE)
                        .build();
                contractRepository.save(contract);
            } else {
                existing.setEmployeeCode(std.getEmployeeCode());
                existing.setFullName(std.getFullName());
                existing.setEmail(std.getEmail());
                existing.setPosition(std.getPosition());
                existing.setRole(std.getRole());
                existing.setEmployeeType(std.getEmployeeType());
                existing.setBaseSalary(std.getBaseSalary());
                existing.setDependentsCount(std.getDependentsCount());
                existing.setStatus("ACTIVE");
                employeeRepository.save(existing);
            }
        }
    }

    private void seedEmployeesAndContracts() {
        String defaultPasswordHash = passwordEncoder.encode("Password123@");

        Department bgd = departmentRepository.findByCode("BGD").orElseThrow();
        Department hr = departmentRepository.findByCode("HR").orElseThrow();
        Department kt = departmentRepository.findByCode("KT").orElseThrow();
        Department bql = departmentRepository.findByCode("BQL").orElseThrow();

        List<Employee> employees = buildStandardEmployees(bgd, hr, kt, bql, defaultPasswordHash);

        employeeRepository.saveAll(employees);
        log.info("Seeded {} employees across standard HMCPS roles.", employees.size());

        // Create Active Contracts for all employees
        for (int i = 0; i < employees.size(); i++) {
            Employee emp = employees.get(i);
            Contract contract = Contract.builder()
                    .contractNumber("HDLD-HM-2026/" + String.format("%03d", i + 1))
                    .employeeId(emp.getId())
                    .contractType(ContractType.OFFICIAL_INDEFINITE)
                    .startDate(emp.getHireDate())
                    .endDate(null)
                    .baseSalary(emp.getBaseSalary())
                    .insuranceFlag(InsuranceFlag.FULL)
                    .taxFlag(TaxFlag.PROGRESSIVE)
                    .status(ContractStatus.ACTIVE)
                    .build();
            contractRepository.save(contract);
        }
        log.info("Created active labor contracts for all {} employees.", employees.size());
    }

    private void seedSiteAssignmentsAndOtps() {
        Project pNhatTan = projectRepository.findByCode("DA-NHATTAN2").orElseThrow();
        Project pLandmark = projectRepository.findByCode("DA-LANDMARK").orElseThrow();

        Employee smPhat = employeeRepository.findByEmail("chihuytruong.phat@haiminh.vn").orElseThrow();
        Employee seTrung = employeeRepository.findByEmail("kysu.trung@haiminh.vn").orElseThrow();
        Employee seNam = employeeRepository.findByEmail("kysu.nam@haiminh.vn").orElseThrow();
        Employee seHoangNam = employeeRepository.findByEmail("kysu.hoangnam@haiminh.vn").orElseThrow();
        Employee seKhoi = employeeRepository.findByEmail("kysu.khoi@haiminh.vn").orElseThrow();

        // Assign Site Managers to projects
        pNhatTan.setSiteManagerId(smPhat.getId());
        pLandmark.setSiteManagerId(smPhat.getId());
        projectRepository.saveAll(List.of(pNhatTan, pLandmark));

        // Engineer Assignments
        List<EngineerAssignment> assignments = List.of(
                EngineerAssignment.builder().employeeId(smPhat.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Chỉ huy trưởng").assignedDate(LocalDate.of(2026, 1, 1)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seTrung.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Kỹ sư Giám sát Kết cấu").assignedDate(LocalDate.of(2026, 1, 15)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seNam.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Kỹ sư Giám sát MEP").assignedDate(LocalDate.of(2026, 2, 1)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seHoangNam.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Kỹ sư Trắc địa").assignedDate(LocalDate.of(2026, 2, 15)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seKhoi.getId()).projectId(pLandmark.getId())
                        .roleOnSite("Kỹ sư An toàn Lao động").assignedDate(LocalDate.of(2026, 3, 10)).status("ACTIVE").build()
        );
        engineerAssignmentRepository.saveAll(assignments);

        // Daily Site OTP for today
        LocalDate today = LocalDate.now();
        DailySiteOtp otp1 = DailySiteOtp.builder()
                .projectId(pNhatTan.getId()).otpCode("849201").validDate(today).generatedBy(smPhat.getId()).isActive(true).build();
        DailySiteOtp otp2 = DailySiteOtp.builder()
                .projectId(pLandmark.getId()).otpCode("773355").validDate(today).generatedBy(smPhat.getId()).isActive(true).build();
        dailySiteOtpRepository.saveAll(List.of(otp1, otp2));
        log.info("Seeded Site Engineer assignments and today's active OTPs for projects.");
    }

    private void seedTimesheetsAndPayroll() {
        int currentMonth = LocalDate.now().getMonthValue();
        int currentYear = LocalDate.now().getYear();

        List<Employee> allEmployees = employeeRepository.findAll();
        for (Employee emp : allEmployees) {
            BigDecimal actualDays = new BigDecimal("24.00");
            BigDecimal mealDays = new BigDecimal("24.00");
            BigDecimal otHours = emp.getEmployeeType() == EmployeeType.SITE_ENGINEER ? new BigDecimal("16.00") : BigDecimal.ZERO;

            MonthlyTimesheet timesheet = MonthlyTimesheet.builder()
                    .employeeId(emp.getId())
                    .month(currentMonth)
                    .year(currentYear)
                    .standardWorkDays(new BigDecimal("26.00"))
                    .actualWorkDays(actualDays)
                    .officialWorkDays(actualDays)
                    .probationWorkDays(BigDecimal.ZERO)
                    .mealWorkDays(mealDays)
                    .overtimeHours(otHours)
                    .nightHours(BigDecimal.ZERO)
                    .status(TimesheetStatus.LOCKED)
                    .confirmedBy(1L)
                    .lockedBy(1L)
                    .build();
            monthlyTimesheetRepository.save(timesheet);
        }
        log.info("Seeded LOCKED monthly timesheets for all employees for month {}/{}.", currentMonth, currentYear);

        // Seed a sample Payroll record for demoing 8-column table and MISA export
        Payroll payroll = Payroll.builder()
                .payrollCode("PR-" + currentYear + "-" + String.format("%02d", currentMonth))
                .month(currentMonth)
                .year(currentYear)
                .standardWorkDays(new BigDecimal("26.00"))
                .status(PayrollStatus.REVIEWED)
                .totalGrossSalary(new BigDecimal("345000000.00"))
                .totalNetSalary(new BigDecimal("298500000.00"))
                .totalEmployerCost(new BigDecimal("78200000.00"))
                .build();
        payrollRepository.save(payroll);

        // Seed 8-column Payroll Items
        for (Employee emp : allEmployees) {
            BigDecimal base = emp.getBaseSalary();
            BigDecimal stdDays = new BigDecimal("26.00");
            BigDecimal days = new BigDecimal("24.00");
            BigDecimal prorated = base.multiply(days).divide(stdDays, 2, java.math.RoundingMode.HALF_UP);
            BigDecimal phuCapCom = days.multiply(new BigDecimal("40000.00"));
            BigDecimal phuCapLuuTru = emp.getEmployeeType() == EmployeeType.SITE_ENGINEER ? new BigDecimal("2000000.00") : BigDecimal.ZERO;
            BigDecimal phuCapDocHai = emp.getEmployeeType() == EmployeeType.SITE_ENGINEER ? new BigDecimal("1000000.00") : BigDecimal.ZERO;
            BigDecimal phuCapXangXe = new BigDecimal("500000.00");
            BigDecimal phuCapDienThoai = new BigDecimal("500000.00");
            BigDecimal tongThuNhap = prorated.add(phuCapCom).add(phuCapLuuTru).add(phuCapDocHai).add(phuCapXangXe).add(phuCapDienThoai);

            BigDecimal insBase = base.min(new BigDecimal("46800000.00"));
            BigDecimal bhxhNld = insBase.multiply(new BigDecimal("0.08")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal bhytNld = insBase.multiply(new BigDecimal("0.015")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal bhtnNld = base.min(new BigDecimal("106200000.00")).multiply(new BigDecimal("0.010")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal congBhNld = bhxhNld.add(bhytNld).add(bhtnNld);

            BigDecimal bhxhDn = insBase.multiply(new BigDecimal("0.17")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal bhytDn = insBase.multiply(new BigDecimal("0.03")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal bhtnDn = base.min(new BigDecimal("106200000.00")).multiply(new BigDecimal("0.010")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal tnldDn = insBase.multiply(new BigDecimal("0.005")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal kpcdDn = insBase.multiply(new BigDecimal("0.02")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal congBhDn = bhxhDn.add(bhytDn).add(bhtnDn).add(tnldDn).add(kpcdDn);

            int depCount = emp.getDependentsCount() != null ? emp.getDependentsCount() : 0;
            BigDecimal gtBanThan = new BigDecimal("11000000.00");
            BigDecimal gtNpt = new BigDecimal("4400000.00").multiply(BigDecimal.valueOf(depCount));
            BigDecimal comMienThue = phuCapCom.min(new BigDecimal("730000.00"));
            BigDecimal tnct = tongThuNhap.subtract(comMienThue).subtract(phuCapDienThoai).subtract(phuCapLuuTru).subtract(phuCapDocHai).max(BigDecimal.ZERO);
            BigDecimal tntt = tnct.subtract(congBhNld).subtract(gtBanThan).subtract(gtNpt).max(BigDecimal.ZERO);
            BigDecimal thueTncn = tntt.multiply(new BigDecimal("0.10")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal phiCongDoanVien = insBase.multiply(new BigDecimal("0.01")).min(new BigDecimal("234000.00")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal thucNhan = tongThuNhap.subtract(congBhNld).subtract(thueTncn).subtract(phiCongDoanVien).setScale(-3, java.math.RoundingMode.HALF_UP);

            PayrollItem item = PayrollItem.builder()
                    .payrollId(payroll.getId())
                    .employeeId(emp.getId())
                    .employeeCode(emp.getEmployeeCode())
                    .fullName(emp.getFullName())
                    .position(emp.getPosition())
                    .employeeType(emp.getEmployeeType())
                    .insuranceFlag(InsuranceFlag.FULL)
                    .taxFlag(TaxFlag.PROGRESSIVE)
                    .congChuan(stdDays)
                    .congChinhThuc(days)
                    .congThuViec(BigDecimal.ZERO)
                    .congTinhCom(days)
                    .overtimeHours(BigDecimal.ZERO)
                    .nightHours(BigDecimal.ZERO)
                    .mucLuong(base)
                    .heSoNangSuat(BigDecimal.ONE)
                    .phuCapLuong(BigDecimal.ZERO)
                    .troCapThuViec(BigDecimal.ZERO)
                    .phuCapChucVu(BigDecimal.ZERO)
                    .phuCapThamNien(BigDecimal.ZERO)
                    .phuCapCom(phuCapCom)
                    .phuCapXangXe(phuCapXangXe)
                    .phuCapDienThoai(phuCapDienThoai)
                    .phuCapLuuTru(phuCapLuuTru)
                    .phuCapDocHai(phuCapDocHai)
                    .phuCapTrachNhiem(BigDecimal.ZERO)
                    .thuNhap(prorated)
                    .luongTangCa(BigDecimal.ZERO)
                    .phuTroiDem(BigDecimal.ZERO)
                    .thuongDuAn(BigDecimal.ZERO)
                    .tongThuNhap(tongThuNhap)
                    .insuranceBase(insBase)
                    .bhxhNld(bhxhNld)
                    .bhytNld(bhytNld)
                    .bhtnNld(bhtnNld)
                    .congBhNld(congBhNld)
                    .bhxhDn(bhxhDn)
                    .bhytDn(bhytDn)
                    .bhtnDn(bhtnDn)
                    .tnldDn(tnldDn)
                    .kpcdDn(kpcdDn)
                    .congBhDn(congBhDn)
                    .slNpt(depCount)
                    .gtBanThan(gtBanThan)
                    .gtNpt(gtNpt)
                    .comMienThue(comMienThue)
                    .chenhLechLtg(BigDecimal.ZERO)
                    .phuTroiDemMienThue(BigDecimal.ZERO)
                    .tnct(tnct)
                    .tntt(tntt)
                    .thueTncn(thueTncn)
                    .phiCongDoanVien(phiCongDoanVien)
                    .thucNhan(thucNhan)
                    .build();
            payrollItemRepository.save(item);
        }
        log.info("Seeded sample Payroll PR-{}-{} with {} 8-column items.", currentYear, currentMonth, allEmployees.size());
    }

    private void seedSalaryGrades() {
        if (salaryGradeRepository.count() > 0) return;

        List<SalaryGrade> grades = List.of(
                SalaryGrade.builder().gradeCode("VP-B1").gradeName("Chuyên Viên Tập Sự / Thử Việc")
                        .employeeType("OFFICE_STAFF").levelOrder(1)
                        .minSalary(new BigDecimal("10000000")).maxSalary(new BigDecimal("14000000"))
                        .standardStep(new BigDecimal("1000000")).description("Nhân viên hành chính, kế toán thử việc").build(),
                SalaryGrade.builder().gradeCode("VP-B2").gradeName("Chuyên Viên Chính Văn Phòng")
                        .employeeType("OFFICE_STAFF").levelOrder(2)
                        .minSalary(new BigDecimal("15000000")).maxSalary(new BigDecimal("22000000"))
                        .standardStep(new BigDecimal("1500000")).description("Chuyên viên nhân sự, kế toán tiền lương").build(),
                SalaryGrade.builder().gradeCode("VP-B3").gradeName("Chuyên Viên Cao Cấp / Phó Phòng")
                        .employeeType("OFFICE_STAFF").levelOrder(3)
                        .minSalary(new BigDecimal("23000000")).maxSalary(new BigDecimal("32000000"))
                        .standardStep(new BigDecimal("2000000")).description("Phó phòng kế toán, trưởng nhóm tuyển dụng").build(),
                SalaryGrade.builder().gradeCode("VP-B4").gradeName("Trưởng Phòng / Kế Toán Trưởng")
                        .employeeType("OFFICE_STAFF").levelOrder(4)
                        .minSalary(new BigDecimal("35000000")).maxSalary(new BigDecimal("50000000"))
                        .standardStep(new BigDecimal("3000000")).description("Trưởng phòng HR, Kế toán trưởng").build(),
                SalaryGrade.builder().gradeCode("VP-B5").gradeName("Ban Giám Đốc Điều Hành")
                        .employeeType("OFFICE_STAFF").levelOrder(5)
                        .minSalary(new BigDecimal("55000000")).maxSalary(new BigDecimal("80000000"))
                        .standardStep(new BigDecimal("5000000")).description("Phó Tổng Giám Đốc, Tổng Giám Đốc").build(),

                SalaryGrade.builder().gradeCode("CT-B1").gradeName("Kỹ Sư Hiện Trường Mới Ra Trường")
                        .employeeType("SITE_ENGINEER").levelOrder(1)
                        .minSalary(new BigDecimal("14000000")).maxSalary(new BigDecimal("18000000"))
                        .standardStep(new BigDecimal("1000000")).description("Kỹ sư trắc địa, giám sát tập sự").build(),
                SalaryGrade.builder().gradeCode("CT-B2").gradeName("Kỹ Sư Kết Cấu / MEP Độc Lập")
                        .employeeType("SITE_ENGINEER").levelOrder(2)
                        .minSalary(new BigDecimal("19000000")).maxSalary(new BigDecimal("26000000"))
                        .standardStep(new BigDecimal("1500000")).description("Kỹ sư trực tiếp phụ trách mũi thi công").build(),
                SalaryGrade.builder().gradeCode("CT-B3").gradeName("Kỹ Sư Giám Sát Trưởng / Đội Trưởng")
                        .employeeType("SITE_ENGINEER").levelOrder(3)
                        .minSalary(new BigDecimal("27000000")).maxSalary(new BigDecimal("35000000"))
                        .standardStep(new BigDecimal("2000000")).description("Chỉ huy phó, đội trưởng thi công dầm/móng").build(),
                SalaryGrade.builder().gradeCode("CT-B4").gradeName("Chỉ Huy Trưởng Công Trường")
                        .employeeType("SITE_ENGINEER").levelOrder(4)
                        .minSalary(new BigDecimal("36000000")).maxSalary(new BigDecimal("55000000"))
                        .standardStep(new BigDecimal("3000000")).description("Chỉ huy trưởng gói thầu trọng điểm").build()
        );
        salaryGradeRepository.saveAll(grades);
        log.info("Seeded {} construction standard Salary Grades (UC-18).", grades.size());
    }

    private void seedWorkflowRequests() {
        if (overtimeRequestRepository.count() == 0) {
            List<OvertimeRequest> ots = List.of(
                    OvertimeRequest.builder()
                            .employeeId(6L)
                            .projectId(1L)
                            .workDate(LocalDate.of(2026, 10, 21))
                            .startTime("21:00")
                            .endTime("03:00")
                            .otHours(new BigDecimal("6.00"))
                            .otType("NIGHT_SHIFT_ADDITIONAL")
                            .multiplier(new BigDecimal("1.80"))
                            .reason("Trực kỹ thuật giám sát đổ bê tông dầm cầu nhịp chính K14 ca đêm.")
                            .siteManagerApproval("APPROVED")
                            .siteManagerId(5L)
                            .hrApproval("PENDING")
                            .status("PENDING_HR")
                            .build(),
                    OvertimeRequest.builder()
                            .employeeId(7L)
                            .projectId(1L)
                            .workDate(LocalDate.of(2026, 10, 22))
                            .startTime("18:00")
                            .endTime("22:00")
                            .otHours(new BigDecimal("4.00"))
                            .otType("WEEKDAY_150")
                            .multiplier(new BigDecimal("1.50"))
                            .reason("Lắp đặt hệ thống cáp dự ứng lực nhịp dẫn bờ Bắc.")
                            .siteManagerApproval("PENDING")
                            .siteManagerId(5L)
                            .hrApproval("PENDING")
                            .status("PENDING_SM")
                            .build()
            );
            overtimeRequestRepository.saveAll(ots);
            log.info("Seeded {} Overtime Requests (UC-13).", ots.size());
        }

        if (leaveRequestRepository.count() == 0) {
            List<LeaveRequest> leaves = List.of(
                    LeaveRequest.builder()
                            .employeeId(4L)
                            .leaveType("ANNUAL")
                            .startDate(LocalDate.of(2026, 10, 24))
                            .endDate(LocalDate.of(2026, 10, 24))
                            .daysCount(new BigDecimal("1.00"))
                            .reason("Nghỉ phép thường niên theo Điều 113 BLLĐ.")
                            .siteManagerApproval("NOT_REQUIRED")
                            .hrApproval("APPROVED")
                            .hrManagerId(4L)
                            .status("APPROVED")
                            .build()
            );
            leaveRequestRepository.saveAll(leaves);
            log.info("Seeded {} Leave Requests (UC-10).", leaves.size());
        }

        if (attendanceExplanationRepository.count() == 0) {
            List<AttendanceExplanation> explanations = List.of(
                    AttendanceExplanation.builder()
                            .employeeId(6L)
                            .projectId(1L)
                            .targetDate(LocalDate.of(2026, 10, 20))
                            .explanationType("GPS_DRIFT")
                            .suggestedCheckIn("07:30")
                            .suggestedCheckOut("17:15")
                            .actualHours(new BigDecimal("8.00"))
                            .reason("Khảo sát đáy trụ cầu dưới hố móng P3, dầm thép dày che chắn sóng GPS.")
                            .siteManagerApproval("APPROVED")
                            .siteManagerId(5L)
                            .hrApproval("PENDING")
                            .status("PENDING_HR")
                            .build()
            );
            attendanceExplanationRepository.saveAll(explanations);
            log.info("Seeded {} Attendance Explanations (UC-11).", explanations.size());
        }
    }

    private void seedAuditLogs() {
        if (auditLogRepository.count() > 0) return;

        List<AuditLog> logs = List.of(
                AuditLog.builder()
                        .action("SYSTEM_INIT")
                        .entityName("compliance_rules")
                        .performedByName("Hệ Thống Tự Động")
                        .performedByRole("SYSTEM_ADMIN")
                        .description("Khởi tạo bộ tham số pháp lý Luật Lao Động 2026 (Nghị định 158/2025/NĐ-CP)")
                        .build(),
                AuditLog.builder()
                        .action("PAYROLL_FORMULA_VERIFIED")
                        .entityName("payrolls")
                        .entityId(1L)
                        .performedByName("Đoàn Anh Tuấn (Kế Toán Trưởng)")
                        .performedByRole("CHIEF_ACCOUNTANT")
                        .description("Thẩm tra & Ký số duyệt bảng lương tháng 10/2026 (Maker-Checker Cấp 2)")
                        .build()
        );
        auditLogRepository.saveAll(logs);
        log.info("Seeded {} System Audit Logs (UC-28).", logs.size());
    }
}
