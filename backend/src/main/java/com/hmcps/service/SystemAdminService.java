package com.hmcps.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmcps.common.enums.ContractStatus;
import com.hmcps.common.enums.ContractType;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.enums.InsuranceFlag;
import com.hmcps.common.enums.TaxFlag;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.BiometricDevice;
import com.hmcps.entity.Contract;
import com.hmcps.entity.Department;
import com.hmcps.entity.Employee;
import com.hmcps.entity.SystemSetting;
import com.hmcps.repository.AuditLogRepository;
import com.hmcps.repository.BiometricDeviceRepository;
import com.hmcps.repository.ContractRepository;
import com.hmcps.repository.DepartmentRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.SystemSettingRepository;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.integration.EmailService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemAdminService {

    public static final String KEY_SMTP = "SMTP_CONFIG";
    public static final String KEY_SMS = "SMS_CONFIG";
    public static final String KEY_GPS = "GPS_CONFIG";
    public static final String KEY_BIOMETRIC = "BIOMETRIC_CONFIG";
    public static final String KEY_SECURITY = "SECURITY_CONFIG";
    public static final String KEY_RBAC_MATRIX = "RBAC_MATRIX";

    private static final Set<String> ADMIN_ROLE_NAMES = Set.of(
            "ROLE_ADMIN", "ROLE_SYSTEM_ADMIN", "ADMIN", "SYSTEM_ADMIN"
    );

    private static final Set<String> SECURITY_ALERT_ACTIONS = Set.of(
            "LOGIN_FAILED",
            "LOGIN_BLOCKED_INACTIVE",
            "SECURITY_ALERT_ACCESS_DENIED",
            "ADMIN_PASSWORD_RESET",
            "ROLE_ASSIGNMENT_UPDATED",
            "RBAC_PERMISSION_UPDATED",
            "ACCOUNT_LOCKED",
            "SYSTEM_SETTINGS_UPDATED",
            "PAYROLL_DIRECTOR_REJECT"
    );

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final ContractRepository contractRepository;
    private final BiometricDeviceRepository biometricDeviceRepository;
    private final AuditLogRepository auditLogRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Data
    @Builder
    public static class AdminAccountDTO {
        private Long id;
        private String employeeCode;
        private String fullName;
        private String email;
        private String phone;
        private Long departmentId;
        private String departmentName;
        private String position;
        private String employeeType;
        private String role;
        private String normalizedRole;
        private String status;
        private boolean mustChangePassword;
        private boolean isFaceRegistered;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class CreateAccountRequest {
        private String fullName;
        private String email;
        private String phone;
        private Long departmentId;
        private String position;
        private String employeeType;
        private String role;
        private String tempPassword;
        private Boolean sendEmail;
    }

    @Data
    public static class UpdateAccountAccessRequest {
        private String role;
        private Long departmentId;
        private String position;
        private String employeeType;
    }

    @Data
    public static class ResetPasswordAdminRequest {
        private String tempPassword;
        private Boolean sendEmail;
    }

    public String normalizeRoleShort(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) return "OFFICE_STAFF";
        String r = rawRole.replace("ROLE_", "").trim().toUpperCase(Locale.ROOT);
        return switch (r) {
            case "ADMIN", "SYSTEM_ADMIN" -> "SYSTEM_ADMIN";
            case "DIRECTOR", "CEO", "SUPERVISOR" -> "DIRECTOR";
            case "CHIEF_ACCOUNTANT" -> "CHIEF_ACCOUNTANT";
            case "PAYROLL_ACCOUNTANT", "ACCOUNTANT" -> "ACCOUNTANT";
            case "HR_MANAGER" -> "HR_MANAGER";
            case "HR_OFFICER", "HR_STAFF" -> "HR_STAFF";
            case "SITE_MANAGER" -> "SITE_MANAGER";
            case "SITE_ENGINEER" -> "SITE_ENGINEER";
            default -> "OFFICE_STAFF";
        };
    }

    private String toDbRoleAuthority(String roleInput) {
        String shortRole = normalizeRoleShort(roleInput);
        return switch (shortRole) {
            case "SYSTEM_ADMIN" -> "ROLE_ADMIN";
            case "ACCOUNTANT" -> "ROLE_PAYROLL_ACCOUNTANT";
            case "HR_STAFF" -> "ROLE_HR_OFFICER";
            default -> "ROLE_" + shortRole;
        };
    }

    public List<AdminAccountDTO> listAccounts() {
        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName, (a, b) -> a));

        return employeeRepository.findAll().stream()
                .sorted(Comparator.comparing(Employee::getId))
                .map(e -> toAccountDto(e, deptMap))
                .toList();
    }

    private AdminAccountDTO toAccountDto(Employee e, Map<Long, String> deptMap) {
        String normalized = normalizeRoleShort(e.getRole());
        return AdminAccountDTO.builder()
                .id(e.getId())
                .employeeCode(e.getEmployeeCode())
                .fullName(e.getFullName())
                .email(e.getEmail())
                .phone(e.getPhone())
                .departmentId(e.getDepartmentId())
                .departmentName(e.getDepartmentId() != null ? deptMap.getOrDefault(e.getDepartmentId(), "Chưa gán phòng ban") : "Chưa gán phòng ban")
                .position(e.getPosition())
                .employeeType(e.getEmployeeType() != null ? e.getEmployeeType().name() : "OFFICE_STAFF")
                .role(e.getRole())
                .normalizedRole(normalized)
                .status(e.getStatus() != null ? e.getStatus() : "ACTIVE")
                .mustChangePassword(Boolean.TRUE.equals(e.getMustChangePassword()))
                .isFaceRegistered(Boolean.TRUE.equals(e.getIsFaceRegistered()))
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    @Transactional
    public AdminAccountDTO createAccount(CreateAccountRequest request, UserPrincipal actor) {
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new BusinessException("Vui lòng nhập họ tên chủ tài khoản.");
        }
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase(Locale.ROOT) : "";
        if (!email.matches("^[a-z0-9._%+-]+@(haiminh\\.vn|gmail\\.com)$")) {
            throw new BusinessException("Email đăng nhập phải thuộc tên miền @haiminh.vn hoặc @gmail.com.");
        }
        if (employeeRepository.findByEmail(email).isPresent()) {
            throw new BusinessException("Email tài khoản [" + email + "] đã tồn tại trong hệ thống!");
        }

        long seq = employeeRepository.count() + 1;
        String code = String.format("HM-%03d", seq);
        while (employeeRepository.findByEmployeeCode(code).isPresent()) {
            seq++;
            code = String.format("HM-%03d", seq);
        }

        String shortRole = normalizeRoleShort(request.getRole());
        String dbRole = toDbRoleAuthority(shortRole);
        EmployeeType empType = ("SITE_MANAGER".equals(shortRole) || "SITE_ENGINEER".equals(shortRole)
                || "SITE_ENGINEER".equalsIgnoreCase(request.getEmployeeType()))
                ? EmployeeType.SITE_ENGINEER
                : EmployeeType.OFFICE_STAFF;

        Long deptId = request.getDepartmentId();
        if (deptId == null) {
            deptId = departmentRepository.findAll().stream().findFirst().map(Department::getId).orElse(1L);
        }

        String rawPass = (request.getTempPassword() != null && request.getTempPassword().trim().length() >= 8)
                ? request.getTempPassword().trim()
                : "Password123@";

        Employee created = employeeRepository.save(Employee.builder()
                .employeeCode(code)
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .departmentId(deptId)
                .position(request.getPosition() != null && !request.getPosition().isBlank()
                        ? request.getPosition().trim()
                        : defaultPositionForRole(shortRole))
                .employeeType(empType)
                .role(dbRole)
                .baseSalary(new BigDecimal("5310000.00"))
                .status("ACTIVE")
                .mustChangePassword(true)
                .passwordHash(passwordEncoder.encode(rawPass))
                .hireDate(LocalDate.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        if (!contractRepository.existsActiveContract(created.getId(), ContractStatus.ACTIVE, LocalDate.now())) {
            contractRepository.save(Contract.builder()
                    .contractNumber("HDLD-HM-2026/" + String.format("%03d", created.getId()))
                    .employeeId(created.getId())
                    .contractType(ContractType.OFFICIAL_DEFINITE)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusYears(1))
                    .baseSalary(new BigDecimal("5310000.00"))
                    .insuranceFlag(InsuranceFlag.FULL)
                    .taxFlag(TaxFlag.PROGRESSIVE)
                    .status(ContractStatus.ACTIVE)
                    .build());
        }

        if (Boolean.TRUE.equals(request.getSendEmail())) {
            try {
                emailService.sendAccountActivationEmail(created.getEmail(), created.getFullName(), rawPass);
            } catch (Exception ex) {
                log.warn("Activation email dispatch failed cleanly for {}: {}", created.getEmail(), ex.getMessage());
            }
        }

        auditLogService.record(
                "ACCOUNT_CREATED",
                "employees",
                created.getId(),
                null,
                toJsonSafe(Map.of(
                        "employeeCode", created.getEmployeeCode(),
                        "email", created.getEmail(),
                        "role", shortRole,
                        "departmentId", created.getDepartmentId(),
                        "status", created.getStatus()
                )),
                String.format("System Admin cấp phát tài khoản %s (%s) với vai trò %s",
                        created.getEmployeeCode(), created.getEmail(), shortRole)
        );

        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName, (a, b) -> a));
        return toAccountDto(created, deptMap);
    }

    @Transactional
    public AdminAccountDTO updateAccountAccess(Long id, UpdateAccountAccessRequest request, UserPrincipal actor) {
        Employee target = employeeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản với ID: " + id));

        String oldShortRole = normalizeRoleShort(target.getRole());
        Long oldDeptId = target.getDepartmentId();
        String oldPosition = target.getPosition();

        String newShortRole = request.getRole() != null && !request.getRole().isBlank()
                ? normalizeRoleShort(request.getRole())
                : oldShortRole;

        if (actor != null && Objects.equals(actor.getId(), target.getId()) && !"SYSTEM_ADMIN".equals(newShortRole)) {
            throw new BusinessException("Không thể tự hạ quyền Quản Trị Hệ Thống (System Admin) của chính tài khoản đang đăng nhập!");
        }
        if ("SYSTEM_ADMIN".equals(oldShortRole) && !"SYSTEM_ADMIN".equals(newShortRole) && countActiveAdmins() <= 1) {
            throw new BusinessException("Hệ thống bắt buộc phải giữ ít nhất 01 tài khoản Quản Trị Hệ Thống (System Admin) đang hoạt động!");
        }

        String dbRole = toDbRoleAuthority(newShortRole);
        target.setRole(dbRole);
        if (request.getDepartmentId() != null) {
            target.setDepartmentId(request.getDepartmentId());
        }
        if (request.getPosition() != null && !request.getPosition().isBlank()) {
            target.setPosition(request.getPosition().trim());
        } else if (!oldShortRole.equals(newShortRole)) {
            target.setPosition(defaultPositionForRole(newShortRole));
        }
        if (request.getEmployeeType() != null && !request.getEmployeeType().isBlank()) {
            target.setEmployeeType("SITE_ENGINEER".equalsIgnoreCase(request.getEmployeeType())
                    ? EmployeeType.SITE_ENGINEER
                    : EmployeeType.OFFICE_STAFF);
        }
        target.setUpdatedAt(LocalDateTime.now());
        Employee saved = employeeRepository.save(target);

        auditLogService.record(
                "ROLE_ASSIGNMENT_UPDATED",
                "employees",
                saved.getId(),
                toJsonSafe(Map.of("role", oldShortRole, "departmentId", oldDeptId, "position", oldPosition != null ? oldPosition : "")),
                toJsonSafe(Map.of("role", newShortRole, "departmentId", saved.getDepartmentId(), "position", saved.getPosition() != null ? saved.getPosition() : "")),
                String.format("Cập nhật phân quyền tài khoản %s (%s): Vai trò %s -> %s",
                        saved.getEmployeeCode(), saved.getFullName(), oldShortRole, newShortRole)
        );

        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName, (a, b) -> a));
        return toAccountDto(saved, deptMap);
    }

    @Transactional
    public AdminAccountDTO toggleAccountStatus(Long id, UserPrincipal actor) {
        Employee target = employeeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản với ID: " + id));

        String oldStatus = target.getStatus() != null ? target.getStatus() : "ACTIVE";
        boolean locking = "ACTIVE".equalsIgnoreCase(oldStatus);

        if (locking && actor != null && Objects.equals(actor.getId(), target.getId())) {
            throw new BusinessException("Không thể tự khóa tài khoản Quản Trị Hệ Thống đang đăng nhập!");
        }
        if (locking && isAdminAccount(target) && countActiveAdmins() <= 1) {
            throw new BusinessException("Không thể khóa tài khoản Quản Trị Hệ Thống (System Admin) cuối cùng đang hoạt động!");
        }

        String nextStatus = locking ? "LOCKED" : "ACTIVE";
        target.setStatus(nextStatus);
        target.setUpdatedAt(LocalDateTime.now());
        Employee saved = employeeRepository.save(target);

        auditLogService.record(
                locking ? "ACCOUNT_LOCKED" : "ACCOUNT_UNLOCKED",
                "employees",
                saved.getId(),
                toJsonSafe(Map.of("status", oldStatus)),
                toJsonSafe(Map.of("status", nextStatus)),
                String.format("%s tài khoản %s (%s - %s)",
                        locking ? "Tạm khóa" : "Mở khóa", saved.getEmployeeCode(), saved.getFullName(), saved.getEmail())
        );

        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName, (a, b) -> a));
        return toAccountDto(saved, deptMap);
    }

    @Transactional
    public Map<String, Object> resetAccountPassword(Long id, ResetPasswordAdminRequest request) {
        Employee target = employeeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản với ID: " + id));

        String tempPass = (request != null && request.getTempPassword() != null && !request.getTempPassword().isBlank())
                ? request.getTempPassword().trim()
                : "Password123@";
        if (tempPass.length() < 8) {
            throw new BusinessException("Mật khẩu tạm thời phải có tối thiểu 8 ký tự.");
        }

        target.setPasswordHash(passwordEncoder.encode(tempPass));
        target.setMustChangePassword(true);
        target.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(target);

        boolean sendMail = request == null || !Boolean.FALSE.equals(request.getSendEmail());
        if (sendMail) {
            try {
                emailService.sendAccountActivationEmail(target.getEmail(), target.getFullName(), tempPass);
            } catch (Exception ex) {
                log.warn("Could not send password reset activation mail to {}: {}", target.getEmail(), ex.getMessage());
            }
        }

        auditLogService.record(
                "ADMIN_PASSWORD_RESET",
                "employees",
                target.getId(),
                toJsonSafe(Map.of("mustChangePassword", false)),
                toJsonSafe(Map.of("mustChangePassword", true, "resetTriggeredByAdmin", true)),
                String.format("Admin đặt lại mật khẩu tạm thời cho %s (%s) & kích hoạt ép đổi mật khẩu lần đăng nhập tới",
                        target.getEmployeeCode(), target.getEmail())
        );

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("employeeId", target.getId());
        res.put("email", target.getEmail());
        res.put("mustChangePassword", true);
        res.put("smtpLive", emailService.isLiveSmtpConfigured());
        res.put("message", "Đã đặt lại mật khẩu tạm thời và bật cờ bắt buộc đổi mật khẩu ở lần đăng nhập kế tiếp.");
        return res;
    }

    public Map<String, Object> getSettingsBundle() {
        Map<String, Object> bundle = new LinkedHashMap<>();
        Map<String, Object> smtp = readSettingMap(KEY_SMTP, defaultSmtpConfig());
        smtp.put("liveConfigured", emailService.isLiveSmtpConfigured());
        bundle.put("smtp", smtp);
        bundle.put("sms", readSettingMap(KEY_SMS, defaultSmsConfig()));
        bundle.put("gps", readSettingMap(KEY_GPS, defaultGpsConfig()));
        bundle.put("biometric", readSettingMap(KEY_BIOMETRIC, defaultBiometricConfig()));
        bundle.put("security", readSettingMap(KEY_SECURITY, defaultSecurityConfig()));
        return bundle;
    }

    @Transactional
    public Map<String, Object> updateSettingsBundle(Map<String, Map<String, Object>> payload, UserPrincipal actor) {
        Map<String, Object> beforeSnapshot = getSettingsBundle();
        String actorName = actor != null ? actor.getFullName() : "System Admin";

        if (payload != null) {
            saveGroupSetting(KEY_SMTP, "SMTP", payload.get("smtp"), defaultSmtpConfig(), actorName);
            saveGroupSetting(KEY_SMS, "SMS", payload.get("sms"), defaultSmsConfig(), actorName);
            saveGroupSetting(KEY_GPS, "GPS", payload.get("gps"), defaultGpsConfig(), actorName);
            saveGroupSetting(KEY_BIOMETRIC, "BIOMETRIC", payload.get("biometric"), defaultBiometricConfig(), actorName);
            saveGroupSetting(KEY_SECURITY, "SECURITY", payload.get("security"), defaultSecurityConfig(), actorName);
        }

        Map<String, Object> afterSnapshot = getSettingsBundle();
        auditLogService.record(
                "SYSTEM_SETTINGS_UPDATED",
                "system_settings",
                null,
                toJsonSafe(beforeSnapshot),
                toJsonSafe(afterSnapshot),
                "System Admin cập nhật cấu hình kỹ thuật hệ thống (SMTP / SMS / GPS / Face ID AI / Bảo mật)"
        );
        return afterSnapshot;
    }

    @SuppressWarnings("unchecked")
    private void saveGroupSetting(
            String key,
            String group,
            Map<String, Object> incoming,
            Map<String, Object> defaults,
            String updatedBy
    ) {
        if (incoming == null) return;
        Map<String, Object> merged = new LinkedHashMap<>(readSettingMap(key, defaults));
        merged.putAll(incoming);
        merged.remove("liveConfigured");

        SystemSetting setting = systemSettingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(key)
                        .settingGroup(group)
                        .build());
        setting.setSettingGroup(group);
        setting.setSettingValueJson(toJsonSafe(merged));
        setting.setUpdatedBy(updatedBy);
        setting.setUpdatedAt(LocalDateTime.now());
        systemSettingRepository.save(setting);
    }

    public List<Map<String, Object>> getRbacMatrix() {
        Optional<SystemSetting> existing = systemSettingRepository.findBySettingKey(KEY_RBAC_MATRIX);
        if (existing.isPresent()) {
            try {
                List<Map<String, Object>> stored = objectMapper.readValue(
                        existing.get().getSettingValueJson(),
                        new TypeReference<List<Map<String, Object>>>() {}
                );
                Map<String, String> defaultNames = new LinkedHashMap<>();
                for (Map<String, Object> def : defaultRbacMatrix()) {
                    defaultNames.put(String.valueOf(def.get("moduleCode")), String.valueOf(def.get("moduleName")));
                }
                List<Map<String, Object>> normalized = new ArrayList<>();
                for (Map<String, Object> row : stored) {
                    Map<String, Object> copy = new LinkedHashMap<>(row);
                    String code = String.valueOf(copy.getOrDefault("moduleCode", ""));
                    if (defaultNames.containsKey(code)) {
                        copy.put("moduleName", defaultNames.get(code));
                    }
                    normalized.add(copy);
                }
                return normalized;
            } catch (Exception ex) {
                log.warn("Invalid stored RBAC matrix JSON, falling back to defaults: {}", ex.getMessage());
            }
        }
        return defaultRbacMatrix();
    }

    @Transactional
    public List<Map<String, Object>> updateRbacMatrix(List<Map<String, Object>> matrix, UserPrincipal actor) {
        if (matrix == null || matrix.isEmpty()) {
            throw new BusinessException("Dữ liệu ma trận phân quyền RBAC không được để trống.");
        }
        List<Map<String, Object>> previous = getRbacMatrix();

        // Bảo vệ nguyên tắc Phân tách nhiệm vụ (SoD) & tự khóa quyền System Admin
        Set<String> protectedBusinessModules = Set.of(
                "EMP_PROFILE", "PROJECT_GIS", "ATTENDANCE", "REQUESTS_WF",
                "TIMESHEET_LOCK", "POLICY_FORMULA", "PAYROLL_ENGINE", "BUDGET_APPROVAL", "EXEC_DASHBOARD"
        );
        List<Map<String, Object>> sanitized = new ArrayList<>();
        for (Map<String, Object> row : matrix) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            String code = String.valueOf(copy.getOrDefault("moduleCode", ""));
            if ("ADMIN_GOV".equals(code)) {
                copy.put("SYSTEM_ADMIN", "FULL");
            }
            if (protectedBusinessModules.contains(code)) {
                String requestedSysAdmin = String.valueOf(copy.getOrDefault("SYSTEM_ADMIN", "DENIED")).trim().toUpperCase(Locale.ROOT);
                if (!"DENIED".equals(requestedSysAdmin) && !"NONE".equals(requestedSysAdmin)) {
                    throw new BusinessException("Vi phạm Segregation of Duties (Điều 95 BLLĐ): Không thể cấp quyền truy cập phân hệ nghiệp vụ [" + code + "] cho vai trò SYSTEM_ADMIN.");
                }
                copy.put("SYSTEM_ADMIN", "DENIED");
            }
            sanitized.add(copy);
        }

        String actorName = actor != null ? actor.getFullName() : "System Admin";
        SystemSetting setting = systemSettingRepository.findBySettingKey(KEY_RBAC_MATRIX)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(KEY_RBAC_MATRIX)
                        .settingGroup("RBAC")
                        .build());
        setting.setSettingGroup("RBAC");
        setting.setSettingValueJson(toJsonSafe(sanitized));
        setting.setUpdatedBy(actorName);
        setting.setUpdatedAt(LocalDateTime.now());
        systemSettingRepository.save(setting);

        auditLogService.record(
                "RBAC_PERMISSION_UPDATED",
                "rbac_matrix",
                setting.getId(),
                toJsonSafe(previous),
                toJsonSafe(sanitized),
                "System Admin cập nhật Ma trận phân quyền RBAC hệ thống"
        );
        return sanitized;
    }

    @Transactional
    public List<Map<String, Object>> resetRbacMatrix(UserPrincipal actor) {
        List<Map<String, Object>> previous = getRbacMatrix();
        List<Map<String, Object>> defaults = defaultRbacMatrix();
        String actorName = actor != null ? actor.getFullName() : "System Admin";
        SystemSetting setting = systemSettingRepository.findBySettingKey(KEY_RBAC_MATRIX)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(KEY_RBAC_MATRIX)
                        .settingGroup("RBAC")
                        .build());
        setting.setSettingGroup("RBAC");
        setting.setSettingValueJson(toJsonSafe(defaults));
        setting.setUpdatedBy(actorName);
        setting.setUpdatedAt(LocalDateTime.now());
        systemSettingRepository.save(setting);

        auditLogService.record(
                "RBAC_PERMISSION_UPDATED",
                "rbac_matrix",
                setting.getId(),
                toJsonSafe(previous),
                toJsonSafe(defaults),
                "System Admin khôi phục Ma trận phân quyền RBAC về cấu hình mặc định"
        );
        return defaults;
    }

    public List<AuditLog> queryAuditLogs(String action, String entityName, String role, String keyword) {
        List<AuditLog> all = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        String q = keyword != null ? keyword.trim().toLowerCase(Locale.ROOT) : "";
        return all.stream()
                .filter(item -> action == null || action.isBlank() || "ALL".equalsIgnoreCase(action)
                        || action.equalsIgnoreCase(item.getAction()))
                .filter(item -> entityName == null || entityName.isBlank() || "ALL".equalsIgnoreCase(entityName)
                        || entityName.equalsIgnoreCase(item.getEntityName()))
                .filter(item -> role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)
                        || role.equalsIgnoreCase(item.getPerformedByRole()))
                .filter(item -> q.isEmpty()
                        || containsLower(item.getDescription(), q)
                        || containsLower(item.getPerformedByName(), q)
                        || containsLower(item.getAction(), q)
                        || containsLower(item.getEntityName(), q)
                        || containsLower(item.getIpAddress(), q))
                .toList();
    }

    public List<Map<String, Object>> getSecurityAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();

        List<Employee> allAccounts = employeeRepository.findAll();
        long lockedCount = allAccounts.stream().filter(e -> !"ACTIVE".equalsIgnoreCase(e.getStatus())).count();
        long pendingPwdCount = allAccounts.stream().filter(e -> Boolean.TRUE.equals(e.getMustChangePassword())).count();
        List<BiometricDevice> offlineDevices = biometricDeviceRepository.findByStatus("OFFLINE");

        if (!emailService.isLiveSmtpConfigured()) {
            alerts.add(Map.of(
                    "id", "INFRA-SMTP-SANDBOX",
                    "severity", "MEDIUM",
                    "category", "EXTERNAL_SERVICE",
                    "title", "Email Server (SMTP) đang chạy chế độ Sandbox",
                    "detail", "Chưa nạp mật khẩu ứng dụng SMTP thực (spring.mail.password). Các email OTP & E-Payslip đang được lưu log nội bộ thay vì gửi ra Internet.",
                    "source", "EmailService",
                    "timestamp", LocalDateTime.now().toString()
            ));
        }

        for (BiometricDevice dev : offlineDevices) {
            alerts.add(Map.of(
                    "id", "DEV-OFFLINE-" + dev.getId(),
                    "severity", "MEDIUM",
                    "category", "MOBILE_CAMERA_HEALTH",
                    "title", "Kênh Camera Di Động ngoại tuyến: " + dev.getDeviceName(),
                    "detail", String.format("Gateway %s:%d tại [%s] đang ở trạng thái OFFLINE.", dev.getIpAddress(), dev.getPort(), dev.getLocation()),
                    "source", "MobileCameraChannel",
                    "timestamp", dev.getLastSyncAt() != null ? dev.getLastSyncAt().toString() : LocalDateTime.now().toString()
            ));
        }

        if (lockedCount > 0) {
            alerts.add(Map.of(
                    "id", "ACC-LOCKED-SUMMARY",
                    "severity", "INFO",
                    "category", "ACCOUNT_STATUS",
                    "title", lockedCount + " tài khoản đang ở trạng thái Tạm Khóa",
                    "detail", "Các tài khoản bị khóa sẽ không thể đăng nhập hay nhận JWT mới cho tới khi System Admin mở khóa.",
                    "source", "AccountGovernance",
                    "timestamp", LocalDateTime.now().toString()
            ));
        }

        if (pendingPwdCount > 0) {
            alerts.add(Map.of(
                    "id", "ACC-FIRST-PWD",
                    "severity", "INFO",
                    "category", "PASSWORD_POLICY",
                    "title", pendingPwdCount + " tài khoản chờ đổi mật khẩu bắt buộc lần đầu",
                    "detail", "Hệ thống tự động cấp PreAuth Token và ép đổi mật khẩu trước khi truy cập vào nghiệp vụ.",
                    "source", "PasswordPolicy",
                    "timestamp", LocalDateTime.now().toString()
            ));
        }

        List<AuditLog> recentLogs = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        for (AuditLog logEntry : recentLogs) {
            if (SECURITY_ALERT_ACTIONS.contains(logEntry.getAction())) {
                String sev = switch (logEntry.getAction()) {
                    case "SECURITY_ALERT_ACCESS_DENIED", "LOGIN_FAILED", "LOGIN_BLOCKED_INACTIVE", "ACCOUNT_LOCKED" -> "HIGH";
                    case "ROLE_ASSIGNMENT_UPDATED", "RBAC_PERMISSION_UPDATED", "SYSTEM_SETTINGS_UPDATED", "ADMIN_PASSWORD_RESET" -> "MEDIUM";
                    default -> "INFO";
                };
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", "AUDIT-" + logEntry.getId());
                item.put("severity", sev);
                item.put("category", logEntry.getAction());
                item.put("title", buildAlertTitle(logEntry.getAction()));
                item.put("detail", logEntry.getDescription() != null ? logEntry.getDescription() : logEntry.getEntityName());
                item.put("source", (logEntry.getPerformedByName() != null ? logEntry.getPerformedByName() : "System")
                        + " (" + (logEntry.getIpAddress() != null ? logEntry.getIpAddress() : "127.0.0.1") + ")");
                item.put("timestamp", logEntry.getCreatedAt() != null ? logEntry.getCreatedAt().toString() : "");
                alerts.add(item);
            }
        }

        return alerts;
    }

    public Map<String, Object> getAdminOverview() {
        List<Employee> employees = employeeRepository.findAll();
        List<Department> departments = departmentRepository.findAll();
        List<BiometricDevice> devices = biometricDeviceRepository.findAll();
        List<AuditLog> recentLogs = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        List<Map<String, Object>> alerts = getSecurityAlerts();

        long activeAccounts = employees.stream().filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus())).count();
        long lockedAccounts = employees.size() - activeAccounts;
        long mustChangePwd = employees.stream().filter(e -> Boolean.TRUE.equals(e.getMustChangePassword())).count();
        long onlineDevices = devices.stream().filter(d -> "ONLINE".equalsIgnoreCase(d.getStatus())).count();

        Map<String, Long> roleDistribution = new LinkedHashMap<>();
        List.of(
                "DIRECTOR", "HR_MANAGER", "HR_STAFF", "CHIEF_ACCOUNTANT",
                "ACCOUNTANT", "SITE_MANAGER", "SITE_ENGINEER", "OFFICE_STAFF", "SYSTEM_ADMIN"
        ).forEach(r -> roleDistribution.put(r, 0L));

        for (Employee e : employees) {
            String shortRole = normalizeRoleShort(e.getRole());
            roleDistribution.put(shortRole, roleDistribution.getOrDefault(shortRole, 0L) + 1L);
        }

        Map<String, Object> sms = readSettingMap(KEY_SMS, defaultSmsConfig());
        Map<String, Object> gps = readSettingMap(KEY_GPS, defaultGpsConfig());

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalAccounts", employees.size());
        overview.put("activeAccounts", activeAccounts);
        overview.put("lockedAccounts", lockedAccounts);
        overview.put("mustChangePasswordCount", mustChangePwd);
        overview.put("totalDepartments", departments.size());
        overview.put("roleDistribution", roleDistribution);
        overview.put("biometricTotalCount", devices.size());
        overview.put("biometricOnlineCount", onlineDevices);
        overview.put("smtpLiveConfigured", emailService.isLiveSmtpConfigured());
        overview.put("smsSandboxMode", Boolean.TRUE.equals(sms.getOrDefault("sandboxMode", true)));
        overview.put("gpsStrictAntiSpoofing", Boolean.TRUE.equals(gps.getOrDefault("strictAntiSpoofing", true)));
        overview.put("securityAlertsCount", alerts.size());
        overview.put("highAlertsCount", alerts.stream().filter(a -> "HIGH".equals(a.get("severity"))).count());
        overview.put("recentAlerts", alerts.stream().limit(6).toList());
        overview.put("recentAuditLogs", recentLogs.stream().limit(8).toList());
        overview.put("serverTime", LocalDateTime.now().toString());
        return overview;
    }

    public void seedDefaultSettingsIfEmpty() {
        ensureSettingExists(KEY_SMTP, "SMTP", defaultSmtpConfig());
        ensureSettingExists(KEY_SMS, "SMS", defaultSmsConfig());
        ensureSettingExists(KEY_GPS, "GPS", defaultGpsConfig());
        ensureSettingExists(KEY_BIOMETRIC, "BIOMETRIC", defaultBiometricConfig());
        ensureSettingExists(KEY_SECURITY, "SECURITY", defaultSecurityConfig());
        if (systemSettingRepository.findBySettingKey(KEY_RBAC_MATRIX).isEmpty()) {
            systemSettingRepository.save(SystemSetting.builder()
                    .settingKey(KEY_RBAC_MATRIX)
                    .settingGroup("RBAC")
                    .settingValueJson(toJsonSafe(defaultRbacMatrix()))
                    .updatedBy("SYSTEM_INIT")
                    .build());
        }
    }

    private void ensureSettingExists(String key, String group, Map<String, Object> defaultMap) {
        if (systemSettingRepository.findBySettingKey(key).isEmpty()) {
            systemSettingRepository.save(SystemSetting.builder()
                    .settingKey(key)
                    .settingGroup(group)
                    .settingValueJson(toJsonSafe(defaultMap))
                    .updatedBy("SYSTEM_INIT")
                    .build());
        }
    }

    private Map<String, Object> readSettingMap(String key, Map<String, Object> defaults) {
        Optional<SystemSetting> existing = systemSettingRepository.findBySettingKey(key);
        if (existing.isPresent()) {
            try {
                Map<String, Object> parsed = objectMapper.readValue(
                        existing.get().getSettingValueJson(),
                        new TypeReference<Map<String, Object>>() {}
                );
                Map<String, Object> merged = new LinkedHashMap<>(defaults);
                merged.putAll(parsed);
                return merged;
            } catch (Exception ignored) {
            }
        }
        return new LinkedHashMap<>(defaults);
    }

    private boolean isAdminAccount(Employee e) {
        if (e.getRole() == null) return false;
        return ADMIN_ROLE_NAMES.contains(e.getRole().trim().toUpperCase(Locale.ROOT));
    }

    private long countActiveAdmins() {
        return employeeRepository.findAll().stream()
                .filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus()) && isAdminAccount(e))
                .count();
    }

    private String defaultPositionForRole(String shortRole) {
        return switch (shortRole) {
            case "SYSTEM_ADMIN" -> "Quản Trị Hệ Thống (System Admin)";
            case "DIRECTOR" -> "Ban Giám Đốc";
            case "HR_MANAGER" -> "Trưởng Phòng Nhân Sự";
            case "HR_STAFF" -> "Chuyên Viên Nhân Sự (HR Staff)";
            case "CHIEF_ACCOUNTANT" -> "Kế Toán Trưởng";
            case "ACCOUNTANT" -> "Chuyên Viên Kế Toán";
            case "SITE_MANAGER" -> "Chỉ Huy Trưởng Công Trường";
            case "SITE_ENGINEER" -> "Kỹ Sư Công Trường";
            default -> "Chuyên Viên Văn Phòng";
        };
    }

    private String buildAlertTitle(String action) {
        return switch (action) {
            case "SECURITY_ALERT_ACCESS_DENIED" -> "Chặn truy cập trái phép (HTTP 403 RBAC)";
            case "LOGIN_FAILED" -> "Đăng nhập thất bại (Sai mật khẩu)";
            case "LOGIN_BLOCKED_INACTIVE" -> "Tài khoản bị khóa / hết HĐLĐ cố gắng đăng nhập";
            case "ACCOUNT_LOCKED" -> "Khóa quyền truy cập tài khoản";
            case "ADMIN_PASSWORD_RESET" -> "Đặt lại mật khẩu qua Quản trị viên";
            case "ROLE_ASSIGNMENT_UPDATED" -> "Thay đổi vai trò / phòng ban tài khoản";
            case "RBAC_PERMISSION_UPDATED" -> "Cập nhật Ma trận Phân quyền RBAC";
            case "SYSTEM_SETTINGS_UPDATED" -> "Thay đổi Cấu hình Kỹ thuật Hệ thống";
            case "PAYROLL_DIRECTOR_REJECT" -> "Giám đốc từ chối hạn mức ngân sách lương";
            default -> "Sự kiện kiểm toán bảo mật: " + action;
        };
    }

    private boolean containsLower(String val, String q) {
        return val != null && val.toLowerCase(Locale.ROOT).contains(q);
    }

    private String toJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    public static Map<String, Object> defaultSmtpConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("host", "smtp.gmail.com");
        m.put("port", 587);
        m.put("senderEmail", "notification.hmcps@gmail.com");
        m.put("senderName", "HMCPS Hải Minh Notification");
        m.put("tlsEnabled", true);
        return m;
    }

    public static Map<String, Object> defaultSmsConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("provider", "VNPT_ESMS");
        m.put("apiEndpoint", "https://sms-gateway.haiminh.vn/v1/otp/send");
        m.put("otpExpirySeconds", 300);
        m.put("maxOtpPerHour", 10);
        m.put("sandboxMode", true);
        return m;
    }

    public static Map<String, Object> defaultGpsConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("geocodingService", "OPENSTREETMAP_NOMINATIM");
        m.put("defaultGeofenceRadiusMeters", 150);
        m.put("minRadiusMeters", 50);
        m.put("maxRadiusMeters", 5000);
        m.put("strictAntiSpoofing", true);
        m.put("allowGraceMinutes", 15);
        return m;
    }

    public static Map<String, Object> defaultBiometricConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("confidenceThreshold", 0.85);
        m.put("livenessDetectionRequired", true);
        m.put("maxMismatchRetries", 3);
        m.put("logRetentionDays", 365);
        return m;
    }

    public static Map<String, Object> defaultSecurityConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("jwtExpiryHours", 24);
        m.put("minPasswordLength", 8);
        m.put("forceFirstLoginChange", true);
        m.put("maxFailedLoginAttempts", 5);
        m.put("sessionTimeoutMinutes", 60);
        m.put("enforceArticle95SalaryIsolation", true);
        return m;
    }

    public static List<Map<String, Object>> defaultRbacMatrix() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(rbacRow("ADMIN_GOV", "Quản trị Tài khoản, Phòng ban, Settings & Audit Logs",
                "FULL", "DENIED", "DENIED", "DENIED", "DENIED", "DENIED", "DENIED", "DENIED", "DENIED"));
        list.add(rbacRow("DEPT_READ", "Tra cứu Danh mục Phòng ban (Read-only)",
                "FULL", "READ", "READ", "READ", "READ", "READ", "READ", "READ", "READ"));
        list.add(rbacRow("EMP_PROFILE", "Hồ sơ Nhân sự, Hợp đồng lao động & Điều động Dự án",
                "DENIED", "READ", "APPROVE", "FULL", "DENIED", "DENIED", "READ_SITE", "SELF", "SELF"));
        list.add(rbacRow("PROJECT_GIS", "Cấu hình Công trình & GPS Geofence",
                "DENIED", "FULL", "READ", "ASSIGN", "READ", "DENIED", "OTP_SITE", "READ_SITE", "DENIED"));
        list.add(rbacRow("ATTENDANCE", "Chấm công Camera Di Động (Face ID AI), GPS + OTP & Bổ sung khẩn cấp",
                "DENIED", "READ", "READ", "MANAGE_FACE", "SELF", "SELF", "SITE_OPS", "SELF_SITE", "SELF"));
        list.add(rbacRow("REQUESTS_WF", "Đơn Nghỉ phép, Làm thêm giờ (OT) & Giải trình Chấm công",
                "DENIED", "DENIED", "APPROVE_L2", "PROCESS_L2", "SELF", "SELF", "APPROVE_L1", "SUBMIT", "SUBMIT"));
        list.add(rbacRow("TIMESHEET_LOCK", "Tổng hợp Bảng công & Khóa Sổ 3 Cấp",
                "DENIED", "READ", "LOCK_L2", "PREPARE", "READ", "READ", "CONFIRM_L1", "SELF", "SELF"));
        list.add(rbacRow("POLICY_FORMULA", "Tham số Pháp lý 2026, Thang bảng lương & Công thức",
                "DENIED", "READ", "CONFIG_POLICY", "READ", "APPROVE_CHECKER", "CONFIG_MAKER", "DENIED", "DENIED", "DENIED"));
        list.add(rbacRow("PAYROLL_ENGINE", "Chạy Tính Lương 8 Cột & Bóc Tách Chi Phí MISA",
                "DENIED", "READ_SUMMARY", "SELF_PAYSLIP", "SELF_PAYSLIP", "CHECKER_REVIEW", "MAKER_RUN", "SELF_PAYSLIP", "SELF_PAYSLIP", "SELF_PAYSLIP"));
        list.add(rbacRow("BUDGET_APPROVAL", "Thẩm định & Phê Duyệt Tổng Ngân Sách Quỹ Lương",
                "DENIED", "APPROVE_REJECT", "DENIED", "DENIED", "EXPLAIN_ADJUST", "DENIED", "DENIED", "DENIED", "DENIED"));
        list.add(rbacRow("EXEC_DASHBOARD", "Dashboard Điều hành Chi phí & Báo cáo Tổng hợp",
                "DENIED", "FULL", "HR_METRICS", "READ", "FULL", "FULL", "SITE_METRICS", "DENIED", "DENIED"));
        return list;
    }

    private static Map<String, Object> rbacRow(
            String moduleCode, String moduleName,
            String sysAdmin, String director, String hrMgr, String hrStaff,
            String chiefAcc, String acc, String siteMgr, String siteEng, String officeStaff
    ) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("moduleCode", moduleCode);
        row.put("moduleName", moduleName);
        row.put("SYSTEM_ADMIN", sysAdmin);
        row.put("DIRECTOR", director);
        row.put("HR_MANAGER", hrMgr);
        row.put("HR_STAFF", hrStaff);
        row.put("CHIEF_ACCOUNTANT", chiefAcc);
        row.put("ACCOUNTANT", acc);
        row.put("SITE_MANAGER", siteMgr);
        row.put("SITE_ENGINEER", siteEng);
        row.put("OFFICE_STAFF", officeStaff);
        return row;
    }
}
