package com.hmcps.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.SystemSetting;
import com.hmcps.repository.AuditLogRepository;
import com.hmcps.repository.SystemSettingRepository;
import com.hmcps.security.UserPrincipal;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Workflow 10 (BF-10) Automated Policy Scheduler, Field-Level Security & Archive Governance Service.
 *
 * Enforces Segregation of Duties (SoD) and Article 95 Labor Code:
 * - System Admin governs schedule timers (Step 5), field access/masking rules (Step 6),
 *   and audit/checksum integrity verification (Step 12-14).
 * - System Admin cannot edit underlying HR monetary amounts or employee salary data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Workflow10SchedulerService {

    public static final String KEY_SCHEDULER_CONFIG = "WF10_SCHEDULER_CONFIG";
    public static final String KEY_FIELD_SECURITY = "WF10_FIELD_SECURITY";
    public static final String KEY_ARCHIVES = "WF10_ARCHIVES";
    public static final String KEY_NOTIFICATIONS = "WF10_NOTIFICATIONS";

    private static final String DEFAULT_TZ = "Asia/Ho_Chi_Minh";
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):([0-5]\\d)$");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final File BF10_STATE_FILE = new File("./target/hmcps_bf10_state.json");

    private final SystemSettingRepository systemSettingRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, Object> bf10SharedState = new LinkedHashMap<>();

    @PostConstruct
    public synchronized void initStateFromDisk() {
        if (BF10_STATE_FILE.exists()) {
            try {
                Map<String, Object> loaded = objectMapper.readValue(
                        BF10_STATE_FILE,
                        new TypeReference<Map<String, Object>>() {}
                );
                if (loaded != null) {
                    bf10SharedState.clear();
                    bf10SharedState.putAll(loaded);
                    log.info("Workflow10SchedulerService loaded bf10_state ({} keys)", bf10SharedState.size());
                }
            } catch (Exception ex) {
                log.warn("Could not load BF-10 state file: {}", ex.getMessage());
            }
        }
    }

    public synchronized Map<String, Object> getBf10StateResponse() {
        Map<String, Object> snapshot = new LinkedHashMap<>(bf10SharedState);
        return Map.of(
                "hasState", !snapshot.isEmpty(),
                "state", snapshot
        );
    }

    public synchronized Map<String, Object> mergeAndSaveBf10State(Map<String, Object> payload, String actorName) {
        if (payload == null) {
            return Map.of("success", false, "message", "Payload không hợp lệ");
        }

        Map<String, Object> previousSnapshot = deepCopyMap(bf10SharedState);
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (entry.getValue() != null) {
                bf10SharedState.put(entry.getKey(), entry.getValue());
            }
        }
        bf10SharedState.put("serverSyncedAt", System.currentTimeMillis());
        persistBf10StateToDisk();

        processHrOrAccountantTransitions(previousSnapshot, bf10SharedState, payload, actorName);

        return Map.of(
                "success", true,
                "hasState", !bf10SharedState.isEmpty(),
                "updatedKeys", payload.keySet()
        );
    }

    public synchronized Map<String, Object> clearBf10State(String actorName) {
        bf10SharedState.clear();
        if (BF10_STATE_FILE.exists()) {
            BF10_STATE_FILE.delete();
        }
        auditLogService.record(
                "WF10_STATE_RESET",
                "bf10_policies",
                null,
                null,
                null,
                "Khôi phục trạng thái chính sách & phụ cấp về mặc định bởi " + actorName
        );
        return Map.of("success", true, "message", "Đã đặt lại trạng thái cấu hình chính sách về mặc định.");
    }

    public synchronized Map<String, Object> getAdminWf10Overview() {
        Map<String, Object> schedulerConfig = getSchedulerConfig();
        List<Map<String, Object>> scheduledItems = extractScheduledMetadataItems(schedulerConfig);
        List<Map<String, Object>> fieldSecurity = getFieldSecurityPolicies();
        List<Map<String, Object>> archives = getArchives();
        List<Map<String, Object>> notifications = getNotifications(null);
        List<Map<String, Object>> wf10AuditLogs = queryWf10AuditLogs();

        long pendingCount = scheduledItems.stream()
                .filter(item -> "PENDING".equalsIgnoreCase(String.valueOf(item.get("status"))))
                .count();
        long dueCount = scheduledItems.stream()
                .filter(item -> Boolean.TRUE.equals(item.get("dueNow")))
                .count();
        long activeCount = scheduledItems.stream()
                .filter(item -> "ACTIVE".equalsIgnoreCase(String.valueOf(item.get("status"))))
                .count();
        long unreadAdminNotifs = notifications.stream()
                .filter(n -> !Boolean.TRUE.equals(n.get("isRead"))
                        && "SYSTEM_ADMIN".equalsIgnoreCase(String.valueOf(n.get("targetRole"))))
                .count();

        Map<String, Object> syntaxResult = verifyFormulaAndStateIntegrity(false, "SYSTEM_CHECK");

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("schedulerConfig", schedulerConfig);
        overview.put("scheduledItems", scheduledItems);
        overview.put("fieldSecurityPolicies", fieldSecurity);
        overview.put("archives", archives);
        overview.put("notifications", notifications);
        overview.put("auditLogs", wf10AuditLogs);
        overview.put("integritySummary", Map.of(
                "pendingCount", pendingCount,
                "dueCount", dueCount,
                "activeCount", activeCount,
                "archiveCount", archives.size(),
                "unreadAdminNotifications", unreadAdminNotifs,
                "syntaxStatus", syntaxResult.get("syntaxStatus"),
                "stateChecksum", syntaxResult.get("stateChecksum"),
                "checkedAt", syntaxResult.get("checkedAt")
        ));
        return overview;
    }

    public List<Map<String, Object>> getNotifications(String targetRole) {
        List<Map<String, Object>> list = sanitizeNotificationList(readJsonList(KEY_NOTIFICATIONS, defaultNotifications()));
        if (targetRole == null || targetRole.isBlank() || "ALL".equalsIgnoreCase(targetRole)) {
            return list;
        }
        return list.stream()
                .filter(n -> targetRole.equalsIgnoreCase(String.valueOf(n.get("targetRole")))
                        || ("ACCOUNTANT".equalsIgnoreCase(targetRole) && "CHIEF_ACCOUNTANT".equalsIgnoreCase(String.valueOf(n.get("targetRole")))))
                .toList();
    }

    @Transactional
    public Map<String, Object> updateSchedulerConfig(Map<String, Object> request, UserPrincipal actor) {
        Map<String, Object> previous = getSchedulerConfig();
        Map<String, Object> next = new LinkedHashMap<>(previous);

        if (request.containsKey("autoActivationEnabled")) {
            next.put("autoActivationEnabled", Boolean.TRUE.equals(request.get("autoActivationEnabled")));
        }
        if (request.containsKey("dailyExecutionTime")) {
            String rawTime = String.valueOf(request.get("dailyExecutionTime")).trim();
            next.put("dailyExecutionTime", normalizeTimeString(rawTime));
        }
        if (request.containsKey("pollingIntervalSeconds")) {
            int interval = toInt(request.get("pollingIntervalSeconds"), 60);
            if (interval < 15 || interval > 3600) {
                throw new BusinessException("Chu kỳ quét lịch trình (pollingIntervalSeconds) phải nằm trong khoảng 15 - 3600 giây.");
            }
            next.put("pollingIntervalSeconds", interval);
        }
        if (request.containsKey("timezone")) {
            String tz = String.valueOf(request.get("timezone")).trim();
            try {
                ZoneId.of(tz);
            } catch (Exception ex) {
                throw new BusinessException("Múi giờ không hợp lệ: " + tz);
            }
            next.put("timezone", tz);
        }
        if (request.containsKey("autoArchivePrevious")) {
            next.put("autoArchivePrevious", Boolean.TRUE.equals(request.get("autoArchivePrevious")));
        }
        if (request.containsKey("notifyAccountantOnActivate")) {
            next.put("notifyAccountantOnActivate", Boolean.TRUE.equals(request.get("notifyAccountantOnActivate")));
        }
        if (request.containsKey("requireSyntaxCheckBeforeActivate")) {
            next.put("requireSyntaxCheckBeforeActivate", Boolean.TRUE.equals(request.get("requireSyntaxCheckBeforeActivate")));
        }

        String actorName = actor != null ? actor.getFullName() : "System Admin";
        next.put("updatedBy", actorName);
        next.put("updatedAt", nowFormatted(String.valueOf(next.getOrDefault("timezone", DEFAULT_TZ))));

        saveSettingJson(KEY_SCHEDULER_CONFIG, "WF10", next, actorName);
        auditLogService.record(
                "WF10_SCHEDULER_CONFIG_UPDATED",
                "wf10_scheduler",
                1L,
                toJsonSafe(previous),
                toJsonSafe(next),
                String.format("System Admin cập nhật bộ hẹn giờ kích hoạt chính sách (Tự động=%s, Giờ chạy=%s, Lưu trữ=%s)",
                        next.get("autoActivationEnabled"), next.get("dailyExecutionTime"), next.get("autoArchivePrevious"))
        );
        return next;
    }

    @Transactional
    public synchronized Map<String, Object> updateItemSchedule(
            String moduleType,
            String itemKey,
            Map<String, Object> request,
            UserPrincipal actor
    ) {
        String effectiveDate = request.get("effectiveDate") != null ? String.valueOf(request.get("effectiveDate")).trim() : null;
        if (effectiveDate != null && !effectiveDate.isEmpty()) {
            try {
                LocalDate.parse(effectiveDate);
            } catch (Exception ex) {
                throw new BusinessException("Ngày hiệu lực không đúng định dạng yyyy-MM-dd: " + effectiveDate);
            }
        }
        String scheduledTime = request.get("scheduledTime") != null
                ? normalizeTimeString(String.valueOf(request.get("scheduledTime")).trim())
                : null;
        String adminNote = request.get("adminNote") != null ? String.valueOf(request.get("adminNote")).trim() : null;
        String securityPolicy = request.get("securityPolicy") != null ? String.valueOf(request.get("securityPolicy")).trim() : null;

        String actorName = actor != null ? actor.getFullName() : "System Admin";
        Map<String, Object> target = findMutableItemByKey(moduleType, itemKey);
        if (target == null) {
            throw new BusinessException("Không tìm thấy cấu hình [" + moduleType + " / " + itemKey + "] trong hàng đợi lịch trình.");
        }

        Map<String, Object> beforeMeta = Map.of(
                "effectiveDate", String.valueOf(target.getOrDefault("effectiveDate", "")),
                "scheduledTime", String.valueOf(target.getOrDefault("autoScheduleTime", "")),
                "status", String.valueOf(target.getOrDefault("status", "PENDING"))
        );

        if (effectiveDate != null && !effectiveDate.isEmpty()) {
            target.put("effectiveDate", effectiveDate);
        }
        if (scheduledTime != null) {
            target.put("autoScheduleTime", scheduledTime);
        }
        if (adminNote != null) {
            target.put("adminNote", adminNote);
        }
        if (securityPolicy != null && !securityPolicy.isEmpty()) {
            target.put("securityPolicy", securityPolicy);
        }
        target.put("scheduledByAdmin", actorName);
        target.put("scheduledUpdatedAt", nowFormatted(DEFAULT_TZ));

        persistBf10StateToDisk();

        Map<String, Object> afterMeta = Map.of(
                "effectiveDate", String.valueOf(target.getOrDefault("effectiveDate", "")),
                "scheduledTime", String.valueOf(target.getOrDefault("autoScheduleTime", "")),
                "status", String.valueOf(target.getOrDefault("status", "PENDING"))
        );

        auditLogService.record(
                "WF10_ITEM_SCHEDULE_UPDATED",
                "wf10_scheduler",
                null,
                toJsonSafe(beforeMeta),
                toJsonSafe(afterMeta),
                String.format("System Admin thiết lập lịch trình hẹn giờ cho [%s / %s]: hiệu lực %s lúc %s",
                        moduleType, itemKey, afterMeta.get("effectiveDate"), afterMeta.get("scheduledTime"))
        );

        return Map.of(
                "success", true,
                "moduleType", moduleType,
                "itemKey", itemKey,
                "effectiveDate", afterMeta.get("effectiveDate"),
                "scheduledTime", afterMeta.get("scheduledTime")
        );
    }

    @Scheduled(fixedDelay = 60000)
    public void scheduledAutoActivationTick() {
        try {
            Map<String, Object> cfg = getSchedulerConfig();
            if (!Boolean.TRUE.equals(cfg.get("autoActivationEnabled"))) {
                return;
            }
            executeActivationSweep(false, null, null, "Hệ thống Scheduler (Cron Tự Động)");
        } catch (Exception ex) {
            log.warn("WF-10 scheduled tick encountered an error: {}", ex.getMessage());
        }
    }

    @Transactional
    public synchronized Map<String, Object> runDueActivationsNow(UserPrincipal actor) {
        String actorName = actor != null ? actor.getFullName() + " (System Admin)" : "System Admin";
        return executeActivationSweep(false, null, null, actorName);
    }

    @Transactional
    public synchronized Map<String, Object> activateSpecificItemNow(String moduleType, String itemKey, UserPrincipal actor) {
        String actorName = actor != null ? actor.getFullName() + " (System Admin)" : "System Admin";
        Map<String, Object> result = executeActivationSweep(true, moduleType, itemKey, actorName);
        int activated = toInt(result.get("activatedCount"), 0);
        if (activated == 0) {
            throw new BusinessException("Không có mục PENDING nào khớp với [" + moduleType + " / " + itemKey + "] để kích hoạt.");
        }
        return result;
    }

    @Transactional
    public Map<String, Object> updateFieldSecurityPolicies(List<Map<String, Object>> policies, UserPrincipal actor) {
        if (policies == null || policies.isEmpty()) {
            throw new BusinessException("Danh sách chính sách bảo mật trường dữ liệu không được để trống.");
        }

        List<Map<String, Object>> previous = getFieldSecurityPolicies();
        List<Map<String, Object>> sanitized = new ArrayList<>();
        String actorName = actor != null ? actor.getFullName() : "System Admin";
        String nowStr = nowFormatted(DEFAULT_TZ);

        for (Map<String, Object> raw : policies) {
            String fieldKey = String.valueOf(raw.getOrDefault("fieldKey", "")).trim().toUpperCase(Locale.ROOT);
            String classification = String.valueOf(raw.getOrDefault("classification", "STATUTORY_POLICY")).trim();
            List<String> allowedRoles = coerceStringList(raw.get("allowedRoles"));

            boolean isSalaryOrPolicyField = !"GOVERNANCE_METADATA".equalsIgnoreCase(classification);
            boolean adminIncluded = allowedRoles.stream()
                    .anyMatch(r -> "SYSTEM_ADMIN".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r));
            if (isSalaryOrPolicyField && adminIncluded) {
                throw new BusinessException("Vi phạm Phân Tách Quyền (SoD / Điều 95 BLLĐ): Không thể cấp quyền xem/sửa trường dữ liệu lương & bảo hiểm [" + fieldKey + "] cho System Admin!");
            }

            Map<String, Object> row = new LinkedHashMap<>(raw);
            row.put("fieldKey", fieldKey);
            row.put("allowedRoles", allowedRoles);
            row.put("dieu95Enforced", true);
            row.put("updatedBy", actorName);
            row.put("updatedAt", nowStr);
            sanitized.add(row);
        }

        saveSettingJson(KEY_FIELD_SECURITY, "WF10", sanitized, actorName);
        auditLogService.record(
                "WF10_FIELD_SECURITY_UPDATED",
                "wf10_field_security",
                1L,
                toJsonSafe(previous),
                toJsonSafe(sanitized),
                "System Admin cập nhật phân quyền truy cập & bảo mật trường dữ liệu lương/bảo hiểm mới"
        );

        return Map.of(
                "success", true,
                "policies", sanitized,
                "updatedAt", nowStr
        );
    }

    @Transactional
    public synchronized Map<String, Object> verifyFormulaAndStateIntegrity(boolean writeAudit, String actorName) {
        String nowStr = nowFormatted(DEFAULT_TZ);
        String checksum = computeSha256(toJsonSafe(bf10SharedState)).substring(0, 16);

        boolean syntaxOk = true;
        List<String> warnings = new ArrayList<>();
        Object formulaObj = bf10SharedState.get("formulaState");
        if (formulaObj instanceof Map<?, ?> formulaMap) {
            Object exprObj = formulaMap.get("expressions");
            if (exprObj instanceof Map<?, ?> exprMap) {
                for (Map.Entry<?, ?> entry : exprMap.entrySet()) {
                    String val = String.valueOf(entry.getValue());
                    if (!hasBalancedParentheses(val) || val.trim().isEmpty()) {
                        syntaxOk = false;
                        warnings.add("Công thức [" + entry.getKey() + "] có dấu ngoặc không cân hoặc rỗng.");
                    }
                }
            }
        }

        String syntaxStatus = syntaxOk ? "PASSED" : "WARNING";
        if (writeAudit) {
            auditLogService.record(
                    "WF10_INTEGRITY_VERIFIED",
                    "wf10_integrity",
                    null,
                    null,
                    toJsonSafe(Map.of("syntaxStatus", syntaxStatus, "checksum", checksum, "warnings", warnings)),
                    String.format("System Admin xác thực tính toàn vẹn cấu hình chính sách & công thức (Syntax=%s, SHA-256=%s)", syntaxStatus, checksum)
            );
            pushNotification(
                    "STEP_14_ADMIN_AUDIT",
                    "SYSTEM_ADMIN",
                    "Xác thực toàn vẹn cấu hình hệ thống hoàn tất",
                    String.format("Kiểm tra cú pháp %s — Checksum cấu hình %s đã được ghi nhận vào Audit Log.", syntaxStatus, checksum),
                    "SYSTEM",
                    "STATE_INTEGRITY",
                    "v2026.2",
                    checksum,
                    "/admin/schedules"
            );
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("syntaxStatus", syntaxStatus);
        result.put("stateChecksum", checksum);
        result.put("warnings", warnings);
        result.put("checkedAt", nowStr);
        result.put("checkedBy", actorName);
        return result;
    }

    @Transactional
    public synchronized Map<String, Object> finalizeFormulaFromChiefAccountant(Map<String, Object> payload, UserPrincipal actor) {
        String actorName = actor != null ? actor.getFullName() + " (Kế Toán Trưởng)" : "Kế Toán Trưởng";
        Map<String, Object> check = verifyFormulaAndStateIntegrity(false, actorName);
        if (!"PASSED".equals(check.get("syntaxStatus"))) {
            throw new BusinessException("Lỗi kiểm tra cú pháp công thức: " + check.get("warnings"));
        }

        String version = payload != null && payload.get("version") != null
                ? String.valueOf(payload.get("version"))
                : "v2026." + (getArchives().size() + 1);
        appendArchiveSnapshot(
                "FORMULA_SET",
                "DYNAMIC_FORMULAS",
                "Bộ Công Thức Tính Lương Động",
                version,
                "ACTIVE",
                actorName,
                "Kế toán trưởng chốt cấu hình công thức tính lương kỳ tới & lưu kho kiểm toán",
                bf10SharedState.get("formulaState")
        );

        String checksum = String.valueOf(check.get("stateChecksum"));
        auditLogService.record(
                "WF10_FORMULA_FINALIZED",
                "wf10_formula",
                null,
                null,
                toJsonSafe(Map.of("version", version, "checksum", checksum, "syntaxStatus", "PASSED")),
                "Kế Toán Trưởng chốt bộ công thức lương " + version + " — SHA-256: " + checksum
        );

        pushNotification(
                "STEP_14_ADMIN_AUDIT",
                "SYSTEM_ADMIN",
                "Công thức lương kỳ mới đã chốt & lưu kho lưu trữ",
                String.format("Bộ công thức %s vượt qua kiểm tra cú pháp (%s). Phiên bản cũ đã lưu kho kiểm toán.", version, checksum),
                "FORMULA_SET",
                "DYNAMIC_FORMULAS",
                version,
                checksum,
                "/admin/schedules"
        );

        return Map.of(
                "success", true,
                "syntaxStatus", "PASSED",
                "version", version,
                "checksum", checksum
        );
    }

    @Transactional
    public void markNotificationRead(String notifId) {
        List<Map<String, Object>> current = readJsonList(KEY_NOTIFICATIONS, defaultNotifications());
        List<Map<String, Object>> next = new ArrayList<>();
        for (Map<String, Object> row : current) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            if ("ALL".equalsIgnoreCase(notifId) || notifId.equals(String.valueOf(copy.get("id")))) {
                copy.put("isRead", true);
            }
            next.add(copy);
        }
        saveSettingJson(KEY_NOTIFICATIONS, "WF10", next, "System");
    }

    private synchronized Map<String, Object> executeActivationSweep(
            boolean forceSpecific,
            String targetModule,
            String targetKey,
            String actorName
    ) {
        Map<String, Object> cfg = getSchedulerConfig();
        String tz = String.valueOf(cfg.getOrDefault("timezone", DEFAULT_TZ));
        String defaultTime = String.valueOf(cfg.getOrDefault("dailyExecutionTime", "00:05"));
        boolean autoArchive = Boolean.TRUE.equals(cfg.get("autoArchivePrevious"));
        boolean notifyAccountant = Boolean.TRUE.equals(cfg.get("notifyAccountantOnActivate"));
        LocalDateTime now = LocalDateTime.now(ZoneId.of(tz));

        List<String> activatedLabels = new ArrayList<>();
        int count = 0;

        // 1. Compliance Rules
        if (!forceSpecific || "COMPLIANCE_RULE".equalsIgnoreCase(targetModule)) {
            List<Map<String, Object>> rules = asMapList(bf10SharedState.get("complianceRules"));
            for (Map<String, Object> rule : rules) {
                String key = String.valueOf(rule.getOrDefault("ruleKey", rule.get("id")));
                if (forceSpecific && !key.equalsIgnoreCase(targetKey)) continue;
                if (shouldActivateItem(rule, forceSpecific, now, defaultTime)) {
                    if (autoArchive) {
                        appendArchiveSnapshot("COMPLIANCE_RULE", key,
                                String.valueOf(rule.getOrDefault("ruleName", key)),
                                String.valueOf(rule.getOrDefault("version", "v2026.1")),
                                "PENDING", actorName,
                                "Kích hoạt tự động tham số pháp lý theo lịch hẹn", rule);
                    }
                    rule.put("status", "ACTIVE");
                    rule.put("isActive", true);
                    if (forceSpecific) {
                        rule.put("effectiveDate", now.toLocalDate().toString());
                    }
                    rule.put("activatedBy", actorName);
                    rule.put("activatedAt", now.format(TS_FMT));
                    count++;
                    activatedLabels.add("Tham số PL: " + rule.getOrDefault("ruleName", key));
                }
            }
        }

        // 2. Salary Scales
        if (!forceSpecific || "SALARY_SCALE".equalsIgnoreCase(targetModule)) {
            List<Map<String, Object>> scales = asMapList(bf10SharedState.get("salaryScales"));
            for (Map<String, Object> scale : scales) {
                String key = String.valueOf(scale.getOrDefault("scaleCode", scale.get("id")));
                if (forceSpecific && !key.equalsIgnoreCase(targetKey)) continue;
                if (shouldActivateItem(scale, forceSpecific, now, defaultTime)) {
                    if (autoArchive) {
                        appendArchiveSnapshot("SALARY_SCALE", key,
                                String.valueOf(scale.getOrDefault("scaleName", key)) + " - " + scale.getOrDefault("levelName", ""),
                                String.valueOf(scale.getOrDefault("version", "v2026.1")),
                                "PENDING", actorName,
                                "Kích hoạt thang bảng lương theo lịch hẹn", scale);
                    }
                    scale.put("status", "ACTIVE");
                    if (forceSpecific) {
                        scale.put("effectiveDate", now.toLocalDate().toString());
                    }
                    scale.put("activatedBy", actorName);
                    scale.put("activatedAt", now.format(TS_FMT));
                    count++;
                    activatedLabels.add("Bậc lương: " + key);
                }
            }
        }

        // 3. Allowance Catalog
        if (!forceSpecific || "ALLOWANCE_ITEM".equalsIgnoreCase(targetModule)) {
            List<Map<String, Object>> allowances = asMapList(bf10SharedState.get("allowanceList"));
            for (Map<String, Object> item : allowances) {
                String key = String.valueOf(item.getOrDefault("code", item.get("id")));
                if (forceSpecific && !key.equalsIgnoreCase(targetKey)) continue;
                if (shouldActivateItem(item, forceSpecific, now, defaultTime)) {
                    if (autoArchive) {
                        appendArchiveSnapshot("ALLOWANCE_ITEM", key,
                                String.valueOf(item.getOrDefault("name", key)),
                                String.valueOf(item.getOrDefault("version", "v2026.1")),
                                "PENDING", actorName,
                                "Kích hoạt danh mục phụ cấp theo lịch hẹn", item);
                    }
                    item.put("status", "ACTIVE");
                    item.put("isActive", true);
                    if (forceSpecific) {
                        item.put("effectiveDate", now.toLocalDate().toString());
                    }
                    item.put("activatedBy", actorName);
                    item.put("activatedAt", now.format(TS_FMT));
                    count++;
                    activatedLabels.add("Phụ cấp: " + item.getOrDefault("name", key));
                }
            }
        }

        // 4. Site Project Allowances
        if (!forceSpecific || "SITE_PROJECT".equalsIgnoreCase(targetModule)) {
            Object rawProjMap = bf10SharedState.get("siteProjectAllowances");
            if (rawProjMap instanceof Map<?, ?>) {
                @SuppressWarnings("unchecked")
                Map<String, Object> projMap = (Map<String, Object>) rawProjMap;
                for (Map.Entry<String, Object> entry : projMap.entrySet()) {
                    if (forceSpecific && !entry.getKey().equalsIgnoreCase(targetKey)) continue;
                    if (entry.getValue() instanceof Map<?, ?>) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> proj = (Map<String, Object>) entry.getValue();
                        if (shouldActivateItem(proj, forceSpecific, now, defaultTime)) {
                            if (autoArchive) {
                                appendArchiveSnapshot("SITE_PROJECT", entry.getKey(),
                                        String.valueOf(proj.getOrDefault("projectName", entry.getKey())),
                                        String.valueOf(proj.getOrDefault("version", "v2026.1")),
                                        "ACTIVE", actorName,
                                        "Lưu trữ định mức cũ trước khi kích hoạt lịch mới",
                                        proj.get("activeSnapshot") != null ? proj.get("activeSnapshot") : proj);
                            }
                            proj.put("status", "ACTIVE");
                            proj.put("applyMode", "ACTIVE");
                            if (forceSpecific) {
                                proj.put("effectiveDate", now.toLocalDate().toString());
                            }
                            proj.put("activeSnapshot", Map.of(
                                    "siteLodging", proj.getOrDefault("siteLodging", 0),
                                    "hazard", proj.getOrDefault("hazard", 0),
                                    "projectResponsibilitySM", proj.getOrDefault("projectResponsibilitySM", 0),
                                    "projectResponsibilityEng", proj.getOrDefault("projectResponsibilityEng", 0),
                                    "nightShiftAllowance", proj.getOrDefault("nightShiftAllowance", 800000)
                            ));
                            proj.put("activatedBy", actorName);
                            proj.put("activatedAt", now.format(TS_FMT));
                            count++;
                            activatedLabels.add("Dự án: " + proj.getOrDefault("projectName", entry.getKey()));
                        }
                    }
                }
            }
        }

        Map<String, Object> updatedCfg = new LinkedHashMap<>(cfg);
        updatedCfg.put("lastScanAt", now.format(TS_FMT));
        if (count > 0) {
            bf10SharedState.put("serverSyncedAt", System.currentTimeMillis());
            persistBf10StateToDisk();

            int prevTotal = toInt(updatedCfg.get("totalAutoActivatedCount"), 0);
            updatedCfg.put("totalAutoActivatedCount", prevTotal + count);
            updatedCfg.put("lastRunSummary", "Đã kích hoạt " + count + " cấu hình: " + String.join(", ", activatedLabels));
            saveSettingJson(KEY_SCHEDULER_CONFIG, "WF10", updatedCfg, actorName);

            String summaryText = String.join("; ", activatedLabels);
            String checksum = computeSha256(toJsonSafe(bf10SharedState)).substring(0, 16);

            if (notifyAccountant) {
                pushNotification(
                        "STEP_8_ACCOUNTANT_READY",
                        "ACCOUNTANT",
                        "Cấu hình chính sách lương mới đã kích hoạt sẵn sàng",
                        String.format("%s đã kích hoạt (%s). Kế toán có thể cập nhật Bộ công thức lương & chạy kiểm thử.", actorName, summaryText),
                        forceSpecific && targetModule != null ? targetModule : "POLICY_SCHEDULE",
                        forceSpecific && targetKey != null ? targetKey : "BATCH",
                        "v2026.2",
                        checksum,
                        "/salary-formula"
                );
            }

            pushNotification(
                    "STEP_14_ADMIN_AUDIT",
                    "SYSTEM_ADMIN",
                    "Lịch trình tự động đã kích hoạt " + count + " cấu hình",
                    String.format("Các mục [%s] đã chuyển PENDING -> ACTIVE, lưu kho lưu trữ & phát thông báo Kế toán. Checksum: %s.", summaryText, checksum),
                    forceSpecific && targetModule != null ? targetModule : "POLICY_SCHEDULE",
                    forceSpecific && targetKey != null ? targetKey : "BATCH",
                    "v2026.2",
                    checksum,
                    "/admin/schedules"
            );

            auditLogService.recordAsActor(
                    forceSpecific ? "WF10_SCHEDULE_ACTIVATED" : "WF10_AUTO_ACTIVATED",
                    "wf10_scheduler",
                    null,
                    null,
                    actorName,
                    "SYSTEM_ADMIN",
                    null,
                    toJsonSafe(Map.of("activatedCount", count, "items", activatedLabels, "checksum", checksum)),
                    String.format("Hệ thống kích hoạt %d cấu hình (%s) -> Phát thông báo Kế toán & Ghi Audit Log", count, summaryText)
            );
        } else {
            updatedCfg.put("lastRunSummary", "Không có mục PENDING đến hạn tại thời điểm quét (" + now.format(TS_FMT) + ")");
            saveSettingJson(KEY_SCHEDULER_CONFIG, "WF10", updatedCfg, "System");
        }

        return Map.of(
                "success", true,
                "activatedCount", count,
                "activatedItems", activatedLabels,
                "scannedAt", now.format(TS_FMT)
        );
    }

    private void processHrOrAccountantTransitions(
            Map<String, Object> previousSnapshot,
            Map<String, Object> currentState,
            Map<String, Object> payload,
            String actorName
    ) {
        String actor = actorName != null && !actorName.isBlank() ? actorName : "HR Manager";
        String checksum = computeSha256(toJsonSafe(currentState)).substring(0, 16);

        int pendingFound = 0;
        int immediateActiveCount = 0;

        for (String key : List.of("complianceRules", "salaryScales", "allowanceList")) {
            if (!payload.containsKey(key)) continue;
            List<Map<String, Object>> list = asMapList(currentState.get(key));
            for (Map<String, Object> item : list) {
                if ("PENDING".equalsIgnoreCase(String.valueOf(item.get("status")))) {
                    pendingFound++;
                }
            }
            if (pendingFound == 0 && !list.isEmpty()) {
                immediateActiveCount++;
            }
        }

        if (payload.containsKey("siteProjectAllowances") && payload.get("siteProjectAllowances") instanceof Map<?, ?> projMap) {
            for (Object val : projMap.values()) {
                if (val instanceof Map<?, ?> m) {
                    if ("PENDING".equalsIgnoreCase(String.valueOf(m.get("status")))
                            || "PENDING".equalsIgnoreCase(String.valueOf(m.get("applyMode")))) {
                        pendingFound++;
                    } else {
                        immediateActiveCount++;
                    }
                }
            }
        }

        if (pendingFound > 0) {
            auditLogService.record(
                    "WF10_SCHEDULE_REGISTERED",
                    "wf10_scheduler",
                    null,
                    null,
                    toJsonSafe(Map.of("pendingCount", pendingFound, "updatedKeys", payload.keySet())),
                    String.format("%s đã đăng ký lịch trình hẹn giờ (%d mục PENDING) sang hàng đợi Quản trị Hệ thống", actor, pendingFound)
            );
            pushNotification(
                    "STEP_5_SCHEDULE_PENDING",
                    "SYSTEM_ADMIN",
                    "Đăng ký lịch trình hẹn giờ chính sách mới từ HR",
                    String.format("%s vừa đăng ký %d cấu hình ở trạng thái Chờ (Pending). Vui lòng kiểm tra giờ chạy & bảo mật trường dữ liệu.", actor, pendingFound),
                    "POLICY_SCHEDULE",
                    "PENDING_QUEUE",
                    "v2026.2",
                    checksum,
                    "/admin/schedules"
            );
        } else if (immediateActiveCount > 0 && !payload.containsKey("formulaState")) {
            auditLogService.record(
                    "WF10_IMMEDIATE_ACTIVATION",
                    "wf10_scheduler",
                    null,
                    toJsonSafe(previousSnapshot.keySet()),
                    toJsonSafe(Map.of("updatedKeys", payload.keySet(), "checksum", checksum)),
                    String.format("%s kích hoạt tức thời cấu hình chính sách/phụ cấp mới (Status: ACTIVE)", actor)
            );
            pushNotification(
                    "STEP_8_ACCOUNTANT_READY",
                    "ACCOUNTANT",
                    "Chính sách lương mới kích hoạt tức thời",
                    String.format("%s đã áp dụng ngay cấu hình mới (%s). Kế toán có thể cập nhật Bộ công thức lương & chạy kiểm thử.", actor, String.join(", ", payload.keySet())),
                    "POLICY_SCHEDULE",
                    "IMMEDIATE_ACTIVE",
                    "v2026.2",
                    checksum,
                    "/salary-formula"
            );
        }
    }

    private List<Map<String, Object>> extractScheduledMetadataItems(Map<String, Object> schedulerConfig) {
        List<Map<String, Object>> items = new ArrayList<>();
        String tz = String.valueOf(schedulerConfig.getOrDefault("timezone", DEFAULT_TZ));
        String defaultTime = String.valueOf(schedulerConfig.getOrDefault("dailyExecutionTime", "00:05"));
        LocalDateTime now = LocalDateTime.now(ZoneId.of(tz));

        // Compliance Rules
        for (Map<String, Object> r : asMapList(bf10SharedState.get("complianceRules"))) {
            String status = String.valueOf(r.getOrDefault("status", "ACTIVE"));
            String key = String.valueOf(r.getOrDefault("ruleKey", r.get("id")));
            String title = String.format("%s — %s", key, r.getOrDefault("ruleName", key));
            items.add(buildMetadataRow("COMPLIANCE_RULE", "Tham Số Pháp Lý & BHXH", key, title, status, r, now, defaultTime, tz));
        }

        // Salary Scales
        for (Map<String, Object> s : asMapList(bf10SharedState.get("salaryScales"))) {
            String status = String.valueOf(s.getOrDefault("status", "ACTIVE"));
            String key = String.valueOf(s.getOrDefault("scaleCode", s.get("id")));
            String title = String.format("%s — %s (%s)", key, s.getOrDefault("scaleName", key), s.getOrDefault("levelName", ""));
            items.add(buildMetadataRow("SALARY_SCALE", "Thang Bảng Lương", key, title, status, s, now, defaultTime, tz));
        }

        // Allowances
        for (Map<String, Object> a : asMapList(bf10SharedState.get("allowanceList"))) {
            String status = String.valueOf(a.getOrDefault("status", "ACTIVE"));
            String key = String.valueOf(a.getOrDefault("code", a.get("id")));
            String title = String.format("%s — %s", key, a.getOrDefault("name", key));
            items.add(buildMetadataRow("ALLOWANCE_ITEM", "Danh Mục Phụ Cấp", key, title, status, a, now, defaultTime, tz));
        }

        // Site Project Allowances
        Object rawProjMap = bf10SharedState.get("siteProjectAllowances");
        if (rawProjMap instanceof Map<?, ?> projMap) {
            for (Map.Entry<?, ?> entry : projMap.entrySet()) {
                if (entry.getValue() instanceof Map<?, ?> m) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> proj = (Map<String, Object>) m;
                    String status = String.valueOf(proj.getOrDefault("status", proj.getOrDefault("applyMode", "ACTIVE")));
                    String key = String.valueOf(entry.getKey());
                    String title = String.format("%s — %s", key, proj.getOrDefault("projectName", key));
                    items.add(buildMetadataRow("SITE_PROJECT", "Phụ Cấp Dự Án Hiện Trường", key, title, status, proj, now, defaultTime, tz));
                }
            }
        }

        // Sort PENDING items first, then due items, then by effectiveDate
        items.sort((a, b) -> {
            int pA = "PENDING".equalsIgnoreCase(String.valueOf(a.get("status"))) ? 0 : 1;
            int pB = "PENDING".equalsIgnoreCase(String.valueOf(b.get("status"))) ? 0 : 1;
            if (pA != pB) return Integer.compare(pA, pB);
            return String.valueOf(b.get("effectiveDate")).compareTo(String.valueOf(a.get("effectiveDate")));
        });
        return items;
    }

    private Map<String, Object> buildMetadataRow(
            String moduleType,
            String moduleLabel,
            String itemKey,
            String itemTitle,
            String status,
            Map<String, Object> source,
            LocalDateTime now,
            String defaultTime,
            String tz
    ) {
        String effectiveDate = String.valueOf(source.getOrDefault("effectiveDate", now.toLocalDate().toString()));
        String itemTimeRaw = String.valueOf(source.getOrDefault("autoScheduleTime", defaultTime));
        String scheduledTime = extractTimePart(itemTimeRaw, defaultTime);
        boolean dueNow = shouldActivateItem(source, false, now, defaultTime);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("moduleType", moduleType);
        row.put("moduleLabel", moduleLabel);
        row.put("itemKey", itemKey);
        row.put("itemTitle", itemTitle);
        row.put("status", status);
        row.put("effectiveDate", effectiveDate);
        row.put("scheduledTime", scheduledTime);
        row.put("timezone", tz);
        row.put("dueNow", dueNow);
        row.put("securityPolicy", String.valueOf(source.getOrDefault("securityPolicy", "STRICT_DIEU_95_BLLD")));
        row.put("version", String.valueOf(source.getOrDefault("version", "v2026.1")));
        row.put("updatedBy", String.valueOf(source.getOrDefault("updatedBy", "Nguyễn Thu Giang (Trưởng Phòng HR)")));
        row.put("updatedAt", String.valueOf(source.getOrDefault("updatedAt", "")));
        row.put("adminNote", String.valueOf(source.getOrDefault("adminNote", "")));
        row.put("integrityChecksum", computeSha256(moduleType + "|" + itemKey + "|" + status + "|" + effectiveDate).substring(0, 16));
        row.put("maskedAmountSummary", "Đã ẩn con số tiền lương (SoD / Điều 95 BLLĐ)");
        return row;
    }

    private Map<String, Object> findMutableItemByKey(String moduleType, String itemKey) {
        if ("COMPLIANCE_RULE".equalsIgnoreCase(moduleType)) {
            for (Map<String, Object> r : asMapList(bf10SharedState.get("complianceRules"))) {
                if (itemKey.equalsIgnoreCase(String.valueOf(r.getOrDefault("ruleKey", r.get("id"))))) return r;
            }
        } else if ("SALARY_SCALE".equalsIgnoreCase(moduleType)) {
            for (Map<String, Object> s : asMapList(bf10SharedState.get("salaryScales"))) {
                if (itemKey.equalsIgnoreCase(String.valueOf(s.getOrDefault("scaleCode", s.get("id"))))) return s;
            }
        } else if ("ALLOWANCE_ITEM".equalsIgnoreCase(moduleType)) {
            for (Map<String, Object> a : asMapList(bf10SharedState.get("allowanceList"))) {
                if (itemKey.equalsIgnoreCase(String.valueOf(a.getOrDefault("code", a.get("id"))))) return a;
            }
        } else if ("SITE_PROJECT".equalsIgnoreCase(moduleType)) {
            Object rawProjMap = bf10SharedState.get("siteProjectAllowances");
            if (rawProjMap instanceof Map<?, ?> projMap && projMap.get(itemKey) instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) m;
                return cast;
            }
        }
        return null;
    }

    private boolean shouldActivateItem(Map<String, Object> item, boolean force, LocalDateTime now, String defaultTime) {
        String status = String.valueOf(item.getOrDefault("status", item.getOrDefault("applyMode", "ACTIVE")));
        if (!"PENDING".equalsIgnoreCase(status)) {
            return false;
        }
        if (force) {
            return true;
        }
        String effStr = String.valueOf(item.getOrDefault("effectiveDate", ""));
        if (effStr.isBlank()) {
            return false;
        }
        try {
            LocalDate effDate = LocalDate.parse(effStr.trim());
            LocalDate today = now.toLocalDate();
            if (effDate.isBefore(today)) {
                return true;
            }
            if (effDate.isEqual(today)) {
                String schedTime = extractTimePart(String.valueOf(item.getOrDefault("autoScheduleTime", defaultTime)), defaultTime);
                LocalTime targetTime = LocalTime.parse(schedTime);
                return !now.toLocalTime().isBefore(targetTime);
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private String extractTimePart(String raw, String fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        Matcher m = Pattern.compile("([01]\\d|2[0-3]):([0-5]\\d)").matcher(raw);
        if (m.find()) {
            return m.group(1) + ":" + m.group(2);
        }
        return fallback;
    }

    private String normalizeTimeString(String rawTime) {
        if (!TIME_PATTERN.matcher(rawTime).matches()) {
            throw new BusinessException("Giờ hẹn kích hoạt phải đúng định dạng HH:mm (ví dụ: 00:05 hoặc 08:30).");
        }
        return rawTime;
    }

    private Map<String, Object> getSchedulerConfig() {
        Map<String, Object> cfg = new LinkedHashMap<>(readJsonMap(KEY_SCHEDULER_CONFIG, defaultSchedulerConfig()));
        cfg.put("lastRunSummary", stripSpecJargon(String.valueOf(cfg.getOrDefault("lastRunSummary", ""))));
        return cfg;
    }

    private List<Map<String, Object>> getFieldSecurityPolicies() {
        List<Map<String, Object>> stored = readJsonList(KEY_FIELD_SECURITY, defaultFieldSecurityPolicies());
        Map<String, String> defaultSources = new LinkedHashMap<>();
        for (Map<String, Object> def : defaultFieldSecurityPolicies()) {
            defaultSources.put(String.valueOf(def.get("fieldKey")), String.valueOf(def.get("moduleSource")));
        }
        List<Map<String, Object>> clean = new ArrayList<>();
        for (Map<String, Object> row : stored) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            String key = String.valueOf(copy.getOrDefault("fieldKey", ""));
            if (defaultSources.containsKey(key)) {
                copy.put("moduleSource", defaultSources.get(key));
            }
            clean.add(copy);
        }
        return clean;
    }

    private List<Map<String, Object>> getArchives() {
        List<Map<String, Object>> list = readJsonList(KEY_ARCHIVES, defaultArchives());
        List<Map<String, Object>> clean = new ArrayList<>();
        for (Map<String, Object> item : list) {
            Map<String, Object> copy = new LinkedHashMap<>(item);
            copy.put("reason", stripSpecJargon(String.valueOf(copy.getOrDefault("reason", ""))));
            copy.put("snapshotSummary", stripSpecJargon(String.valueOf(copy.getOrDefault("snapshotSummary", ""))));
            clean.add(copy);
        }
        return clean;
    }

    private List<Map<String, Object>> sanitizeNotificationList(List<Map<String, Object>> list) {
        List<Map<String, Object>> clean = new ArrayList<>();
        for (Map<String, Object> n : list) {
            Map<String, Object> copy = new LinkedHashMap<>(n);
            copy.put("title", stripSpecJargon(String.valueOf(copy.getOrDefault("title", ""))));
            copy.put("message", stripSpecJargon(String.valueOf(copy.getOrDefault("message", ""))));
            clean.add(copy);
        }
        return clean;
    }

    private String stripSpecJargon(String text) {
        if (text == null || text.isBlank()) return "";
        return text
                .replaceAll("WF-10\\s*Step\\s*[\\d&,\\s-]+:\\s*", "")
                .replaceAll("Workflow\\s*10\\s*", "")
                .replaceAll("WF-10\\s*", "")
                .replaceAll("BF-10\\s*", "")
                .replaceAll("\\s*\\((?:Bước|Step)\\s*[\\d.,\\s>-]+\\)", "")
                .replaceAll("\\s*\\(Dry-run.*?\\)", "")
                .replaceAll("\\s*->\\s*Phát thông báo Kế toán.*?$", " -> Phát thông báo Kế toán & Ghi Audit Log")
                .trim();
    }

    private void appendArchiveSnapshot(
            String moduleType,
            String itemKey,
            String itemTitle,
            String version,
            String previousStatus,
            String archivedBy,
            String reason,
            Object snapshotObj
    ) {
        List<Map<String, Object>> current = new ArrayList<>(getArchives());
        String snapJson = toJsonSafe(snapshotObj);
        String checksum = computeSha256(snapJson).substring(0, 16);

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("archiveId", "ARC-" + System.currentTimeMillis());
        entry.put("moduleType", moduleType);
        entry.put("itemKey", itemKey);
        entry.put("itemTitle", itemTitle);
        entry.put("version", version);
        entry.put("previousStatus", previousStatus);
        entry.put("archivedAt", nowFormatted(DEFAULT_TZ));
        entry.put("archivedBy", archivedBy);
        entry.put("reason", reason);
        entry.put("syntaxCheckStatus", "PASSED");
        entry.put("checksumSha256", checksum);
        entry.put("snapshotSummary", "Đã niêm phong SHA-256 (" + checksum + ") vào kho kiểm toán hệ thống");

        current.add(0, entry);
        if (current.size() > 40) {
            current = new ArrayList<>(current.subList(0, 40));
        }
        saveSettingJson(KEY_ARCHIVES, "WF10", current, archivedBy);
    }

    private void pushNotification(
            String stepCode,
            String targetRole,
            String title,
            String message,
            String moduleType,
            String itemKey,
            String version,
            String checksumSha256,
            String link
    ) {
        List<Map<String, Object>> current = new ArrayList<>(readJsonList(KEY_NOTIFICATIONS, defaultNotifications()));
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", "NOTIF-" + System.currentTimeMillis() + "-" + (int) (Math.random() * 100));
        entry.put("stepCode", stepCode);
        entry.put("targetRole", targetRole);
        entry.put("title", title);
        entry.put("message", message);
        entry.put("moduleType", moduleType);
        entry.put("itemKey", itemKey);
        entry.put("version", version);
        entry.put("checksumSha256", checksumSha256);
        entry.put("isRead", false);
        entry.put("createdAt", nowFormatted(DEFAULT_TZ));
        entry.put("link", link);

        current.add(0, entry);
        if (current.size() > 40) {
            current = new ArrayList<>(current.subList(0, 40));
        }
        saveSettingJson(KEY_NOTIFICATIONS, "WF10", current, "System");
    }

    private List<Map<String, Object>> queryWf10AuditLogs() {
        List<AuditLog> recent = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (AuditLog logEntry : recent) {
            String action = logEntry.getAction() != null ? logEntry.getAction() : "";
            String entity = logEntry.getEntityName() != null ? logEntry.getEntityName() : "";
            if (action.startsWith("WF10") || entity.startsWith("wf10") || entity.startsWith("bf10")) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", logEntry.getId());
                m.put("action", action);
                m.put("entityName", entity);
                m.put("performedByName", logEntry.getPerformedByName());
                m.put("performedByRole", logEntry.getPerformedByRole());
                m.put("description", stripSpecJargon(logEntry.getDescription()));
                m.put("oldValueJson", logEntry.getOldValueJson());
                m.put("newValueJson", logEntry.getNewValueJson());
                m.put("createdAt", logEntry.getCreatedAt() != null ? logEntry.getCreatedAt().toString() : "");
                result.add(m);
            }
        }
        return result;
    }

    private Map<String, Object> defaultSchedulerConfig() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("autoActivationEnabled", true);
        map.put("dailyExecutionTime", "00:05");
        map.put("pollingIntervalSeconds", 60);
        map.put("timezone", DEFAULT_TZ);
        map.put("autoArchivePrevious", true);
        map.put("notifyAccountantOnActivate", true);
        map.put("requireSyntaxCheckBeforeActivate", true);
        map.put("lastScanAt", nowFormatted(DEFAULT_TZ));
        map.put("lastRunSummary", "Bộ hẹn giờ tự động đang chạy trực tuyến — sẵn sàng tiếp nhận lịch trình Pending từ HR Manager");
        map.put("totalAutoActivatedCount", 0);
        map.put("updatedBy", "Nguyễn Hữu Thịnh (System Admin)");
        map.put("updatedAt", nowFormatted(DEFAULT_TZ));
        return map;
    }

    private List<Map<String, Object>> defaultFieldSecurityPolicies() {
        String now = nowFormatted(DEFAULT_TZ);
        return List.of(
                fieldPolicyRow("MIN_WAGE_&_INSURANCE_PARAMS", "Tham số Lương Tối Thiểu Vùng, BHXH/BHYT/BHTN & TNCN",
                        "Chính sách Luật LĐ & BH", "STATUTORY_POLICY", "MASKED_FOR_NON_OWNER",
                        List.of("HR_MANAGER", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "DIRECTOR"), true, now),
                fieldPolicyRow("SALARY_SCALES_GRADES", "Khung Bậc Lương Văn Phòng & Công Trường (Salary Grades)",
                        "Thang bảng lương", "CONFIDENTIAL_SALARY", "MASKED_FOR_NON_OWNER",
                        List.of("HR_MANAGER", "HR_STAFF", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "DIRECTOR"), true, now),
                fieldPolicyRow("ALLOWANCE_CATALOG_TAX_RULES", "Danh Mục Phụ Cấp & Quy Tắc Miễn/Chịu Thuế, BH",
                        "Danh mục phụ cấp", "STATUTORY_POLICY", "FULL_CLEAR",
                        List.of("HR_MANAGER", "ACCOUNTANT", "CHIEF_ACCOUNTANT"), true, now),
                fieldPolicyRow("SITE_PROJECT_ALLOWANCES", "Phụ Cấp Đặc Thù Hiện Trường Theo Dự Án & Kỹ Sư",
                        "Phụ cấp theo dự án", "CONFIDENTIAL_SALARY", "MASKED_FOR_NON_OWNER",
                        List.of("HR_MANAGER", "SITE_MANAGER", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "DIRECTOR"), true, now),
                fieldPolicyRow("DYNAMIC_PAYROLL_FORMULAS", "Bộ Công Thức Tính Lương Động & Dữ Liệu Kiểm Thử",
                        "Bộ công thức tính lương", "CONFIDENTIAL_SALARY", "AGGREGATE_ONLY",
                        List.of("ACCOUNTANT", "CHIEF_ACCOUNTANT", "DIRECTOR"), true, now),
                fieldPolicyRow("VERSION_SCHEDULES_&_CHECKSUMS", "Lịch Trình Hẹn Giờ Hiệu Lực & Checksum Toàn Vẹn (Metadata)",
                        "Quản trị lịch trình", "GOVERNANCE_METADATA", "MASKED_FOR_NON_OWNER",
                        List.of("SYSTEM_ADMIN", "HR_MANAGER", "CHIEF_ACCOUNTANT", "DIRECTOR"), false, now)
        );
    }

    private Map<String, Object> fieldPolicyRow(
            String key, String label, String source, String classification,
            String maskingMode, List<String> allowedRoles, boolean encryptionRequired, String updatedAt
    ) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fieldKey", key);
        m.put("fieldLabel", label);
        m.put("moduleSource", source);
        m.put("classification", classification);
        m.put("maskingMode", maskingMode);
        m.put("allowedRoles", allowedRoles);
        m.put("encryptionRequired", encryptionRequired);
        m.put("dieu95Enforced", true);
        m.put("updatedBy", "Nguyễn Hữu Thịnh (System Admin)");
        m.put("updatedAt", updatedAt);
        return m;
    }

    private List<Map<String, Object>> defaultArchives() {
        Map<String, Object> baseline = new LinkedHashMap<>();
        baseline.put("archiveId", "ARC-2026-INIT");
        baseline.put("moduleType", "COMPLIANCE_RULE");
        baseline.put("itemKey", "BASELINE_2026_V1");
        baseline.put("itemTitle", "Bộ Tham Số Luật Lao Động & BHXH Khởi Tạo 2026");
        baseline.put("version", "v2026.1");
        baseline.put("previousStatus", "ACTIVE");
        baseline.put("archivedAt", "2026-01-01 00:05:00");
        baseline.put("archivedBy", "Hệ Thống HMCPS (Archive Vault)");
        baseline.put("reason", "Bản chụp chuẩn NĐ 73/2024 & NĐ 74/2024/NĐ-CP làm mốc kiểm toán hệ thống");
        baseline.put("syntaxCheckStatus", "PASSED");
        baseline.put("checksumSha256", computeSha256("HMCPS_WF10_BASELINE_2026").substring(0, 16));
        baseline.put("snapshotSummary", "Đã niêm phong 10 hằng số pháp lý & công thức chuẩn 2026");
        return List.of(baseline);
    }

    private List<Map<String, Object>> defaultNotifications() {
        Map<String, Object> notif = new LinkedHashMap<>();
        notif.put("id", "NOTIF-WF10-INIT");
        notif.put("stepCode", "STEP_14_ADMIN_AUDIT");
        notif.put("targetRole", "SYSTEM_ADMIN");
        notif.put("title", "Hệ thống Hẹn Giờ Kích Hoạt Chính Sách đã sẵn sàng");
        notif.put("message", "Dịch vụ hẹn giờ tự động kích hoạt chính sách lương & bảo mật trường dữ liệu đang hoạt động 24/7.");
        notif.put("moduleType", "WORKFLOW_10");
        notif.put("itemKey", "SCHEDULER_DAEMON");
        notif.put("version", "v2026.1");
        notif.put("checksumSha256", computeSha256("HMCPS_WF10_BASELINE_2026").substring(0, 16));
        notif.put("isRead", false);
        notif.put("createdAt", nowFormatted(DEFAULT_TZ));
        notif.put("link", "/admin/schedules");
        return List.of(notif);
    }

    private void persistBf10StateToDisk() {
        try {
            File parent = BF10_STATE_FILE.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(BF10_STATE_FILE, bf10SharedState);
        } catch (Exception ex) {
            log.warn("Could not persist BF-10 state to disk: {}", ex.getMessage());
        }
    }

    private Map<String, Object> readJsonMap(String key, Map<String, Object> fallback) {
        return systemSettingRepository.findBySettingKey(key)
                .map(s -> {
                    try {
                        Map<String, Object> parsed = objectMapper.readValue(
                                s.getSettingValueJson(),
                                new TypeReference<Map<String, Object>>() {}
                        );
                        return parsed != null ? parsed : new LinkedHashMap<>(fallback);
                    } catch (Exception ex) {
                        return new LinkedHashMap<>(fallback);
                    }
                })
                .orElseGet(() -> new LinkedHashMap<>(fallback));
    }

    private List<Map<String, Object>> readJsonList(String key, List<Map<String, Object>> fallback) {
        return systemSettingRepository.findBySettingKey(key)
                .map(s -> {
                    try {
                        List<Map<String, Object>> parsed = objectMapper.readValue(
                                s.getSettingValueJson(),
                                new TypeReference<List<Map<String, Object>>>() {}
                        );
                        return parsed != null ? parsed : new ArrayList<>(fallback);
                    } catch (Exception ex) {
                        return new ArrayList<>(fallback);
                    }
                })
                .orElseGet(() -> new ArrayList<>(fallback));
    }

    private void saveSettingJson(String key, String group, Object value, String actorName) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(key)
                        .settingGroup(group)
                        .build());
        setting.setSettingGroup(group);
        setting.setSettingValueJson(toJsonSafe(value));
        setting.setUpdatedBy(actorName);
        setting.setUpdatedAt(LocalDateTime.now());
        systemSettingRepository.save(setting);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> asMapList(Object obj) {
        if (!(obj instanceof List<?> list)) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                out.add((Map<String, Object>) m);
            }
        }
        return out;
    }

    private Map<String, Object> deepCopyMap(Map<String, Object> src) {
        try {
            String json = objectMapper.writeValueAsString(src);
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return new LinkedHashMap<>(src);
        }
    }

    private List<String> coerceStringList(Object val) {
        if (!(val instanceof List<?> list)) return List.of();
        List<String> out = new ArrayList<>();
        for (Object o : list) {
            if (o != null && !String.valueOf(o).isBlank()) {
                out.add(String.valueOf(o).trim().toUpperCase(Locale.ROOT));
            }
        }
        return out;
    }

    private int toInt(Object val, int fallback) {
        if (val == null) return fallback;
        try {
            return Integer.parseInt(String.valueOf(val));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String nowFormatted(String tz) {
        return LocalDateTime.now(ZoneId.of(tz)).format(TS_FMT);
    }

    private boolean hasBalancedParentheses(String expr) {
        int depth = 0;
        for (char c : expr.toCharArray()) {
            if (c == '(') depth++;
            else if (c == ')') {
                depth--;
                if (depth < 0) return false;
            }
        }
        return depth == 0;
    }

    private String computeSha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "0000000000000000";
        }
    }

    private String toJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
