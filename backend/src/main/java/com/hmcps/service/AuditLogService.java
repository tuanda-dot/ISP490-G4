package com.hmcps.service;

import com.hmcps.entity.AuditLog;
import com.hmcps.repository.AuditLogRepository;
import com.hmcps.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog record(
            String action,
            String entityName,
            Long entityId,
            String oldValueJson,
            String newValueJson,
            String description
    ) {
        return recordAsActor(action, entityName, entityId, null, null, null, oldValueJson, newValueJson, description);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordAsActor(
            String action,
            String entityName,
            Long entityId,
            Long actorId,
            String actorName,
            String actorRole,
            String oldValueJson,
            String newValueJson,
            String description
    ) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Long resolvedId = actorId;
            String resolvedName = actorName;
            String resolvedRole = actorRole;

            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                if (resolvedId == null) resolvedId = up.getId();
                if (resolvedName == null || resolvedName.isBlank()) resolvedName = up.getFullName();
                if (resolvedRole == null || resolvedRole.isBlank()) {
                    resolvedRole = up.getRole() != null ? up.getRole().replace("ROLE_", "") : "SYSTEM";
                }
            } else if (auth != null && resolvedName == null) {
                resolvedName = auth.getName();
            }

            if (resolvedName == null || resolvedName.isBlank()) resolvedName = "Hệ Thống / Khách";
            if (resolvedRole == null || resolvedRole.isBlank()) resolvedRole = "ANONYMOUS";

            AuditLog entry = AuditLog.builder()
                    .action(action)
                    .entityName(entityName)
                    .entityId(entityId)
                    .performedById(resolvedId)
                    .performedByName(resolvedName)
                    .performedByRole(resolvedRole)
                    .ipAddress(resolveClientIp())
                    .oldValueJson(oldValueJson)
                    .newValueJson(newValueJson)
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build();

            return auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Could not persist audit log {}: {}", action, ex.getMessage());
            return null;
        }
    }

    private String resolveClientIp() {
        try {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }
}
