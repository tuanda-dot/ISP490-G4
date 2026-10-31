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

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking HMCPS demo seed data status...");

        seedComplianceRules();
        seedSalaryComponents();
        seedShifts();

        if (departmentRepository.count() == 0) {
            log.info("Database is empty. Initializing comprehensive HMCPS demo dataset...");
            seedDepartmentsAndProjects();
            seedEmployeesAndContracts();
            seedSiteAssignmentsAndOtps();
            seedTimesheetsAndPayroll();
            log.info("HMCPS demo dataset successfully initialized!");
        } else {
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

    private void seedEmployeesAndContracts() {
        String defaultPasswordHash = passwordEncoder.encode("Password123@");

        Department bgd = departmentRepository.findByCode("BGD").orElseThrow();
        Department hr = departmentRepository.findByCode("HR").orElseThrow();
        Department kt = departmentRepository.findByCode("KT").orElseThrow();
        Department bql = departmentRepository.findByCode("BQL").orElseThrow();

        // 13 Employees representing all 13 RBAC roles:
        List<Employee> employees = List.of(
                // 1. ADMIN
                Employee.builder().employeeCode("HM-ADMIN").fullName("Quản trị viên Hệ thống").email("admin@haiminh.vn")
                        .phone("0981000001").citizenId("001090000001").departmentId(bgd.getId()).position("System Administrator")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_ADMIN").baseSalary(new BigDecimal("25000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 1, 1)).build(),

                // 2. DIRECTOR / CEO
                Employee.builder().employeeCode("HM-CEO").fullName("Nguyễn Văn An").email("ceo.an@haiminh.vn")
                        .phone("0981000002").citizenId("001090000002").departmentId(bgd.getId()).position("Tổng Giám Đốc")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_DIRECTOR").baseSalary(new BigDecimal("80000000.00"))
                        .dependentsCount(2).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2020, 1, 1)).build(),

                // 3. CHIEF ACCOUNTANT (Kế toán trưởng - Maker/Checker reviewer)
                Employee.builder().employeeCode("HM-KT-01").fullName("Lê Phương Hà").email("ketoantruong.ha@haiminh.vn")
                        .phone("0981000003").citizenId("001090000003").departmentId(kt.getId()).position("Kế toán trưởng")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_CHIEF_ACCOUNTANT").baseSalary(new BigDecimal("35000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2022, 5, 1)).build(),

                // 4. PAYROLL ACCOUNTANT (Kế toán tiền lương)
                Employee.builder().employeeCode("HM-KT-02").fullName("Đinh Anh Tuấn").email("ketoanluong.tuan@haiminh.vn")
                        .phone("0981000004").citizenId("001090000004").departmentId(kt.getId()).position("Kế toán tiền lương")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_PAYROLL_ACCOUNTANT").baseSalary(new BigDecimal("18000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 8, 1)).build(),

                // 5. HR MANAGER (Trưởng phòng nhân sự - Khóa bảng công)
                Employee.builder().employeeCode("HM-HR-01").fullName("Nguyễn Huy Thịnh").email("truongphonghr.thinh@haiminh.vn")
                        .phone("0981000005").citizenId("001090000005").departmentId(hr.getId()).position("Trưởng phòng Nhân sự")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_HR_MANAGER").baseSalary(new BigDecimal("30000000.00"))
                        .dependentsCount(1).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2021, 11, 1)).build(),

                // 6. HR OFFICER (Chuyên viên nhân sự)
                Employee.builder().employeeCode("HM-HR-02").fullName("Nguyễn Trường Giang").email("chuyenvienhr.giang@haiminh.vn")
                        .phone("0981000006").citizenId("001090000006").departmentId(hr.getId()).position("Chuyên viên Nhân sự & Chấm công")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_HR_OFFICER").baseSalary(new BigDecimal("15000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 2, 1)).build(),

                // 7. SITE MANAGER 1 (Chỉ huy trưởng Cầu Nhật Tân 2)
                Employee.builder().employeeCode("HM-SM-01").fullName("Nguyễn Lương Gia Phát").email("chihuytruong.phat@haiminh.vn")
                        .phone("0981000007").citizenId("001090000007").departmentId(bql.getId()).position("Chỉ huy trưởng Công trình")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_MANAGER").baseSalary(new BigDecimal("32000000.00"))
                        .dependentsCount(2).passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2022, 3, 1)).build(),

                // 8. SITE MANAGER 2 (Chỉ huy trưởng Landmark)
                Employee.builder().employeeCode("HM-SM-02").fullName("Phạm Hoàng Long").email("chihuytruong.long@haiminh.vn")
                        .phone("0981000008").citizenId("001090000008").departmentId(bql.getId()).position("Chỉ huy phó Công trình")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_MANAGER").baseSalary(new BigDecimal("28000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 4, 1)).build(),

                // 9. SITE ENGINEER 1 (Kỹ sư kết cấu công trường Cầu Nhật Tân)
                Employee.builder().employeeCode("HM-SE-01").fullName("Vũ Thành Trung").email("kysu.trung@haiminh.vn")
                        .phone("0981000009").citizenId("001090000009").departmentId(bql.getId()).position("Kỹ sư Giám sát Kết cấu")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("20000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2023, 6, 1)).build(),

                // 10. SITE ENGINEER 2 (Kỹ sư an toàn công trường)
                Employee.builder().employeeCode("HM-SE-02").fullName("Hoàng Đức Nam").email("kysu.nam@haiminh.vn")
                        .phone("0981000010").citizenId("001090000010").departmentId(bql.getId()).position("Kỹ sư An toàn Lao động (HSE)")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("18000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 3, 1)).build(),

                // 11. SITE ENGINEER 3 (Kỹ sư QS hiện trường)
                Employee.builder().employeeCode("HM-SE-03").fullName("Trần Minh Quân").email("kysu.quan@haiminh.vn")
                        .phone("0981000011").citizenId("001090000011").departmentId(bql.getId()).position("Kỹ sư Khối lượng QS")
                        .employeeType(EmployeeType.SITE_ENGINEER).role("ROLE_SITE_ENGINEER").baseSalary(new BigDecimal("19000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 4, 1)).build(),

                // 12. OFFICE STAFF (Nhân viên hành chính tổng hợp)
                Employee.builder().employeeCode("HM-NV-01").fullName("Đỗ Thùy Linh").email("nhanvien.linh@haiminh.vn")
                        .phone("0981000012").citizenId("001090000012").departmentId(hr.getId()).position("Chuyên viên Hành chính Lễ tân")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_OFFICE_STAFF").baseSalary(new BigDecimal("12000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 7, 1)).build(),

                // 13. SUPERVISOR (Giảng viên hướng dẫn / Giám sát độc lập)
                Employee.builder().employeeCode("HM-SUP-01").fullName("Thầy Nguyễn Văn An (GVHD)").email("supervisor.an@haiminh.vn")
                        .phone("0981000013").citizenId("001090000013").departmentId(bgd.getId()).position("Cố vấn & Giảng viên Hướng dẫn")
                        .employeeType(EmployeeType.OFFICE_STAFF).role("ROLE_SUPERVISOR").baseSalary(new BigDecimal("10000000.00"))
                        .passwordHash(defaultPasswordHash).mustChangePassword(false).status("ACTIVE").hireDate(LocalDate.of(2024, 1, 1)).build()
        );

        employeeRepository.saveAll(employees);
        log.info("Seeded {} employees across 13 roles.", employees.size());

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
        Employee smLong = employeeRepository.findByEmail("chihuytruong.long@haiminh.vn").orElseThrow();
        Employee seTrung = employeeRepository.findByEmail("kysu.trung@haiminh.vn").orElseThrow();
        Employee seNam = employeeRepository.findByEmail("kysu.nam@haiminh.vn").orElseThrow();
        Employee seQuan = employeeRepository.findByEmail("kysu.quan@haiminh.vn").orElseThrow();

        // Assign Site Managers to projects
        pNhatTan.setSiteManagerId(smPhat.getId());
        pLandmark.setSiteManagerId(smLong.getId());
        projectRepository.saveAll(List.of(pNhatTan, pLandmark));

        // Engineer Assignments
        List<EngineerAssignment> assignments = List.of(
                EngineerAssignment.builder().employeeId(smPhat.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Chỉ huy trưởng").assignedDate(LocalDate.of(2026, 1, 1)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seTrung.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Kỹ sư Giám sát Kết cấu").assignedDate(LocalDate.of(2026, 1, 15)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seNam.getId()).projectId(pNhatTan.getId())
                        .roleOnSite("Kỹ sư An toàn Lao động").assignedDate(LocalDate.of(2026, 2, 1)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(smLong.getId()).projectId(pLandmark.getId())
                        .roleOnSite("Chỉ huy trưởng").assignedDate(LocalDate.of(2026, 3, 1)).status("ACTIVE").build(),
                EngineerAssignment.builder().employeeId(seQuan.getId()).projectId(pLandmark.getId())
                        .roleOnSite("Kỹ sư Khối lượng QS").assignedDate(LocalDate.of(2026, 3, 10)).status("ACTIVE").build()
        );
        engineerAssignmentRepository.saveAll(assignments);

        // Daily Site OTP for today (2026-10-19 / 2026-10-20)
        LocalDate today = LocalDate.now();
        DailySiteOtp otp1 = DailySiteOtp.builder()
                .projectId(pNhatTan.getId()).otpCode("886699").validDate(today).generatedBy(smPhat.getId()).isActive(true).build();
        DailySiteOtp otp2 = DailySiteOtp.builder()
                .projectId(pLandmark.getId()).otpCode("773355").validDate(today).generatedBy(smLong.getId()).isActive(true).build();
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
}
