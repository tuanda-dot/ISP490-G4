package com.hmcps.controller;

import com.hmcps.common.exception.BusinessException;
import com.hmcps.common.exception.ResourceNotFoundException;
import com.hmcps.common.util.FaceImageValidator;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.Employee;
import com.hmcps.entity.FaceUpdateRequest;
import com.hmcps.repository.AuditLogRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.FaceUpdateRequestRepository;
import com.hmcps.security.UserPrincipal;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Controller Quản lý Yêu cầu Đăng ký / Cập nhật Khuôn mặt Face ID theo chuẩn Maker - Checker.
 * - Nhân viên thường chỉ được gửi yêu cầu cho chính tài khoản đang đăng nhập (trạng thái PENDING).
 * - HR Staff / HR Manager / Admin (hoặc Chỉ huy trưởng đối với Kỹ sư công trường) thẩm định ảnh mới
 *   trước khi chính thức cập nhật dữ liệu sinh trắc học trên hồ sơ nhân sự.
 */
@RestController
@RequestMapping("/api/face-update-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FaceUpdateRequestController {

    private static final Set<String> HR_ADMIN_ROLES = Set.of(
            "ROLE_HR_MANAGER", "ROLE_HR_STAFF", "ROLE_HR_OFFICER",
            "HR_MANAGER", "HR_STAFF", "HR_OFFICER"
    );

    private final FaceUpdateRequestRepository faceUpdateRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogRepository auditLogRepository;

    @Data
    public static class SubmitFaceUpdateRequest {
        private Long employeeId;
        private String proposedFaceImageUrl;
        private String proposedFaceEmbedding;
        private String reason;
    }

    @Data
    public static class RejectFaceUpdateRequest {
        private String rejectionReason;
    }

    @GetMapping
    public ResponseEntity<List<FaceUpdateRequest>> listRequests() {
        UserPrincipal principal = requirePrincipal();
        String role = normalizeRole(principal.getRole());

        if (HR_ADMIN_ROLES.contains(role)) {
            return ResponseEntity.ok(faceUpdateRequestRepository.findAllByOrderByCreatedAtDesc());
        }
        if ("ROLE_SITE_MANAGER".equals(role)) {
            return ResponseEntity.ok(faceUpdateRequestRepository.findByEmployeeTypeOrderByCreatedAtDesc("SITE_ENGINEER"));
        }
        return ResponseEntity.ok(faceUpdateRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(principal.getId()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<FaceUpdateRequest>> listMyRequests() {
        UserPrincipal principal = requirePrincipal();
        return ResponseEntity.ok(faceUpdateRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(principal.getId()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<FaceUpdateRequest> submitRequest(@RequestBody SubmitFaceUpdateRequest body) {
        UserPrincipal principal = requirePrincipal();

        if (body.getEmployeeId() != null && !body.getEmployeeId().equals(principal.getId())) {
            throw new BusinessException("Bảo mật sinh trắc học: Bạn chỉ được phép gửi yêu cầu cập nhật Face ID cho chính tài khoản của mình!");
        }
        if (isBlank(body.getProposedFaceImageUrl()) || isBlank(body.getProposedFaceEmbedding())) {
            throw new BusinessException("Vui lòng chụp ảnh khuôn mặt mới từ Camera hoặc chọn ảnh chân dung hợp lệ trước khi gửi!");
        }
        if (isBlank(body.getReason()) || body.getReason().trim().length() < 5) {
            throw new BusinessException("Vui lòng nhập lý do cập nhật khuôn mặt (tối thiểu 5 ký tự) để HR/Quản lý thẩm định!");
        }

        Employee emp = employeeRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ nhân sự."));

        String normalizedProposedImage = FaceImageValidator.normalizeAndValidate(body.getProposedFaceImageUrl());
        if (isBlank(normalizedProposedImage)) {
            throw new BusinessException("Vui lòng chụp hoặc tải lên ảnh khuôn mặt hợp lệ trước khi gửi!");
        }

        // Hủy các yêu cầu PENDING cũ của chính nhân viên để thay bằng bản chụp mới nhất
        List<FaceUpdateRequest> existingPending = faceUpdateRequestRepository.findByEmployeeIdAndStatus(emp.getId(), "PENDING");
        for (FaceUpdateRequest old : existingPending) {
            old.setStatus("CANCELLED");
            old.setRejectionReason("Nhân viên gửi ảnh cập nhật mới thay thế");
            old.setReviewedAt(LocalDateTime.now());
            faceUpdateRequestRepository.save(old);
        }

        FaceUpdateRequest created = FaceUpdateRequest.builder()
                .employeeId(emp.getId())
                .employeeCode(emp.getEmployeeCode())
                .employeeName(emp.getFullName())
                .employeeType(emp.getEmployeeType() != null ? emp.getEmployeeType().name() : "OFFICE_STAFF")
                .currentFaceImageUrl(emp.getFaceImageUrl())
                .proposedFaceImageUrl(normalizedProposedImage)
                .proposedFaceEmbedding(body.getProposedFaceEmbedding().trim())
                .reason(body.getReason().trim())
                .status("PENDING")
                .build();

        FaceUpdateRequest saved = faceUpdateRequestRepository.save(created);
        recordAudit("FACE_UPDATE_SUBMIT", saved.getId(), emp, principal,
                "Gửi yêu cầu cập nhật khuôn mặt Face ID chờ duyệt. Lý do: " + saved.getReason());

        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER', 'SITE_MANAGER')")
    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<FaceUpdateRequest> approveRequest(@PathVariable Long id) {
        UserPrincipal principal = requirePrincipal();
        FaceUpdateRequest req = faceUpdateRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cập nhật Face ID: " + id));

        validateReviewerAuthority(principal, req);

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BusinessException("Yêu cầu này đã được xử lý trước đó (Trạng thái: " + req.getStatus() + ").");
        }

        Employee emp = employeeRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên: " + req.getEmployeeId()));

        emp.setFaceImageUrl(req.getProposedFaceImageUrl());
        emp.setFaceEmbedding(req.getProposedFaceEmbedding());
        emp.setIsFaceRegistered(true);
        emp.setFaceUpdatedBy(principal.getFullName() + " (" + stripRolePrefix(principal.getRole()) + ")");
        emp.setFaceUpdatedAt(LocalDateTime.now());
        employeeRepository.save(emp);

        req.setStatus("APPROVED");
        req.setReviewedById(principal.getId());
        req.setReviewedByName(principal.getFullName());
        req.setReviewedByRole(stripRolePrefix(principal.getRole()));
        req.setReviewedAt(LocalDateTime.now());
        FaceUpdateRequest saved = faceUpdateRequestRepository.save(req);

        recordAudit("FACE_UPDATE_APPROVED", saved.getId(), emp, principal,
                "Phê duyệt cập nhật Face ID cho " + emp.getFullName() + " (" + emp.getEmployeeCode() + ")");

        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasAnyRole('HR_MANAGER', 'HR_STAFF', 'HR_OFFICER', 'SITE_MANAGER')")
    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<FaceUpdateRequest> rejectRequest(
            @PathVariable Long id,
            @RequestBody RejectFaceUpdateRequest body) {
        UserPrincipal principal = requirePrincipal();
        FaceUpdateRequest req = faceUpdateRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cập nhật Face ID: " + id));

        validateReviewerAuthority(principal, req);

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BusinessException("Yêu cầu này đã được xử lý trước đó (Trạng thái: " + req.getStatus() + ").");
        }
        if (body == null || isBlank(body.getRejectionReason())) {
            throw new BusinessException("Vui lòng nhập lý do từ chối yêu cầu cập nhật Face ID!");
        }

        req.setStatus("REJECTED");
        req.setReviewedById(principal.getId());
        req.setReviewedByName(principal.getFullName());
        req.setReviewedByRole(stripRolePrefix(principal.getRole()));
        req.setRejectionReason(body.getRejectionReason().trim());
        req.setReviewedAt(LocalDateTime.now());
        FaceUpdateRequest saved = faceUpdateRequestRepository.save(req);

        Employee emp = employeeRepository.findById(req.getEmployeeId()).orElse(null);
        recordAudit("FACE_UPDATE_REJECTED", saved.getId(), emp, principal,
                "Từ chối yêu cầu cập nhật Face ID của " + req.getEmployeeName() + ": " + saved.getRejectionReason());

        return ResponseEntity.ok(saved);
    }

    private void validateReviewerAuthority(UserPrincipal reviewer, FaceUpdateRequest req) {
        if (reviewer.getId() != null && reviewer.getId().equals(req.getEmployeeId())) {
            throw new BusinessException("Nguyên tắc Maker-Checker: Bạn không thể tự phê duyệt/từ chối yêu cầu cập nhật Face ID của chính mình!");
        }
        String role = normalizeRole(reviewer.getRole());
        if ("ROLE_SITE_MANAGER".equals(role) && !"SITE_ENGINEER".equalsIgnoreCase(req.getEmployeeType())) {
            throw new BusinessException("Chỉ huy trưởng chỉ có thẩm quyền duyệt yêu cầu cập nhật Face ID cho Kỹ sư công trường!");
        }
        if (!HR_ADMIN_ROLES.contains(role) && !"ROLE_SITE_MANAGER".equals(role)) {
            throw new BusinessException("Bạn không có quyền thẩm định yêu cầu cập nhật khuôn mặt Face ID.");
        }
    }

    private UserPrincipal requirePrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        throw new BusinessException("Không xác định được danh tính người dùng đang đăng nhập.");
    }

    private void recordAudit(String action, Long reqId, Employee emp, UserPrincipal actor, String desc) {
        auditLogRepository.save(AuditLog.builder()
                .action(action)
                .entityName("face_update_requests")
                .entityId(reqId)
                .performedById(actor != null ? actor.getId() : null)
                .performedByName(actor != null ? actor.getFullName() : (emp != null ? emp.getFullName() : "System"))
                .performedByRole(actor != null ? stripRolePrefix(actor.getRole()) : "UNKNOWN")
                .description(desc)
                .build());
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        return role.startsWith("ROLE_") ? role : "ROLE_" + role;
    }

    private String stripRolePrefix(String role) {
        if (role == null) return "";
        return role.replace("ROLE_", "");
    }

    private boolean isBlank(String val) {
        return val == null || val.trim().isEmpty();
    }
}

