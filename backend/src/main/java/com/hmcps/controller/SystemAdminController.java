package com.hmcps.controller;

import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.BiometricDevice;
import com.hmcps.repository.BiometricDeviceRepository;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.AuditLogService;
import com.hmcps.service.SystemAdminService;
import com.hmcps.service.SystemAdminService.AdminAccountDTO;
import com.hmcps.service.SystemAdminService.CreateAccountRequest;
import com.hmcps.service.SystemAdminService.ResetPasswordAdminRequest;
import com.hmcps.service.SystemAdminService.UpdateAccountAccessRequest;
import com.hmcps.service.integration.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Controller Quản trị Hệ thống (System Admin - UC-27, UC-28 & System Settings Update)
 * Chỉ tài khoản Quản trị viên (SYSTEM_ADMIN / ADMIN) mới được phép truy cập.
 * Tuân thủ Nguyên tắc Bất kiêm nhiệm (SoD) & Điều 95 BLLĐ: không chứa dữ liệu lương/HĐLĐ.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMIN')")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemAdminController {

    private final SystemAdminService systemAdminService;
    private final BiometricDeviceRepository biometricDeviceRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(systemAdminService.getAdminOverview());
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AdminAccountDTO>> listAccounts() {
        return ResponseEntity.ok(systemAdminService.listAccounts());
    }

    @PostMapping("/accounts")
    public ResponseEntity<AdminAccountDTO> createAccount(
            @RequestBody CreateAccountRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.createAccount(request, principal));
    }

    @PutMapping("/accounts/{id}/access")
    public ResponseEntity<AdminAccountDTO> updateAccountAccess(
            @PathVariable Long id,
            @RequestBody UpdateAccountAccessRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.updateAccountAccess(id, request, principal));
    }

    @PostMapping("/accounts/{id}/toggle-status")
    public ResponseEntity<AdminAccountDTO> toggleAccountStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.toggleAccountStatus(id, principal));
    }

    @PostMapping("/accounts/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> resetAccountPassword(
            @PathVariable Long id,
            @RequestBody(required = false) ResetPasswordAdminRequest request
    ) {
        return ResponseEntity.ok(systemAdminService.resetAccountPassword(id, request));
    }

    @GetMapping("/rbac-matrix")
    public ResponseEntity<List<Map<String, Object>>> getRbacMatrix() {
        return ResponseEntity.ok(systemAdminService.getRbacMatrix());
    }

    @PutMapping("/rbac-matrix")
    public ResponseEntity<List<Map<String, Object>>> updateRbacMatrix(
            @RequestBody List<Map<String, Object>> matrix,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.updateRbacMatrix(matrix, principal));
    }

    @PostMapping("/rbac-matrix/reset")
    public ResponseEntity<List<Map<String, Object>>> resetRbacMatrix(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.resetRbacMatrix(principal));
    }

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSystemSettings() {
        return ResponseEntity.ok(systemAdminService.getSettingsBundle());
    }

    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateSystemSettings(
            @RequestBody Map<String, Map<String, Object>> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(systemAdminService.updateSettingsBundle(payload, principal));
    }

    @PostMapping("/settings/test-email")
    public ResponseEntity<Map<String, Object>> testEmailServer(
            @RequestBody(required = false) Map<String, String> body
    ) {
        String target = body != null ? body.get("toEmail") : null;
        EmailService.EmailDispatchResult res = emailService.sendDiagnosticTestEmail(target);
        auditLogService.record(
                "SMTP_DIAGNOSTIC_TEST",
                "system_settings",
                null,
                null,
                null,
                "System Admin kiểm thử dịch vụ SMTP tới " + res.to() + " (" + res.channel() + ")"
        );
        return ResponseEntity.ok(Map.of(
                "success", res.success(),
                "channel", res.channel(),
                "to", res.to(),
                "timestamp", res.timestamp(),
                "errorMessage", res.errorMessage() != null ? res.errorMessage() : ""
        ));
    }

    @GetMapping("/devices")
    public ResponseEntity<List<BiometricDevice>> listBiometricDevices() {
        return ResponseEntity.ok(biometricDeviceRepository.findAll());
    }

    @PostMapping("/devices")
    public ResponseEntity<BiometricDevice> createBiometricDevice(@RequestBody BiometricDevice device) {
        if (device.getDeviceName() == null || device.getDeviceName().isBlank()) {
            throw new BusinessException("Tên thiết bị sinh trắc học không được để trống.");
        }
        if (device.getIpAddress() == null || device.getIpAddress().isBlank()) {
            device.setIpAddress("192.168.1.100");
        }
        device.setLastSyncAt(LocalDateTime.now());
        BiometricDevice saved = biometricDeviceRepository.save(device);
        auditLogService.record(
                "BIOMETRIC_DEVICE_CREATED",
                "biometric_devices",
                saved.getId(),
                null,
                null,
                "Thêm mới thiết bị chấm công/Face ID: " + saved.getDeviceName() + " (" + saved.getIpAddress() + ")"
        );
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/devices/{id}")
    public ResponseEntity<BiometricDevice> updateBiometricDevice(
            @PathVariable Long id,
            @RequestBody BiometricDevice req
    ) {
        BiometricDevice existing = biometricDeviceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thiết bị sinh trắc học ID: " + id));
        String oldStatus = existing.getStatus();
        if (req.getDeviceName() != null && !req.getDeviceName().isBlank()) existing.setDeviceName(req.getDeviceName().trim());
        if (req.getDeviceType() != null && !req.getDeviceType().isBlank()) existing.setDeviceType(req.getDeviceType().trim());
        if (req.getIpAddress() != null && !req.getIpAddress().isBlank()) existing.setIpAddress(req.getIpAddress().trim());
        if (req.getPort() != null) existing.setPort(req.getPort());
        if (req.getLocation() != null) existing.setLocation(req.getLocation().trim());
        if (req.getConfidenceThreshold() != null) existing.setConfidenceThreshold(req.getConfidenceThreshold());
        if (req.getLivenessEnabled() != null) existing.setLivenessEnabled(req.getLivenessEnabled());
        if (req.getStatus() != null && !req.getStatus().isBlank()) existing.setStatus(req.getStatus().trim());
        existing.setLastSyncAt(LocalDateTime.now());
        BiometricDevice saved = biometricDeviceRepository.save(existing);
        auditLogService.record(
                "BIOMETRIC_DEVICE_UPDATED",
                "biometric_devices",
                saved.getId(),
                "{\"status\":\"" + oldStatus + "\"}",
                "{\"status\":\"" + saved.getStatus() + "\"}",
                "Cập nhật thiết bị sinh trắc học: " + saved.getDeviceName() + " [" + saved.getStatus() + "]"
        );
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/devices/{id}")
    public ResponseEntity<Map<String, Object>> deleteBiometricDevice(@PathVariable Long id) {
        BiometricDevice existing = biometricDeviceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thiết bị sinh trắc học ID: " + id));
        biometricDeviceRepository.deleteById(id);
        auditLogService.record(
                "BIOMETRIC_DEVICE_DELETED",
                "biometric_devices",
                id,
                null,
                null,
                "Xóa thiết bị sinh trắc học: " + existing.getDeviceName()
        );
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa thiết bị thành công."));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> listAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(systemAdminService.queryAuditLogs(action, entityName, role, q));
    }

    @GetMapping("/security-alerts")
    public ResponseEntity<List<Map<String, Object>>> listSecurityAlerts() {
        return ResponseEntity.ok(systemAdminService.getSecurityAlerts());
    }
}
