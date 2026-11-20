package com.hmcps.security;

import com.hmcps.entity.EngineerAssignment;
import com.hmcps.entity.Project;
import com.hmcps.repository.EngineerAssignmentRepository;
import com.hmcps.repository.ProjectRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.*;

/**
 * Tiện ích tập trung cho kiểm tra danh tính người gọi (UserPrincipal),
 * chuẩn hóa 9 vai trò HMCPS và thực thi phạm vi công trình (Project-level Scope) cho Chỉ huy trưởng.
 */
public final class SecurityContextUtils {

    private SecurityContextUtils() {}

    public static UserPrincipal getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        return null;
    }

    public static String normalizeRoleShort(String rawRole) {
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

    public static boolean isSystemAdmin(UserPrincipal p) {
        return p != null && "SYSTEM_ADMIN".equals(normalizeRoleShort(p.getRole()));
    }

    public static boolean isSiteManager(UserPrincipal p) {
        return p != null && "SITE_MANAGER".equals(normalizeRoleShort(p.getRole()));
    }

    public static boolean isHrRole(UserPrincipal p) {
        if (p == null) return false;
        String r = normalizeRoleShort(p.getRole());
        return "HR_MANAGER".equals(r) || "HR_STAFF".equals(r);
    }

    /**
     * Các vai trò được xem dữ liệu lương/hồ sơ toàn công ty (HR, Kế toán, Ban Giám đốc)
     */
    public static boolean isHrOrFinanceOrDirector(UserPrincipal p) {
        if (p == null) return false;
        String r = normalizeRoleShort(p.getRole());
        return Set.of("HR_MANAGER", "HR_STAFF", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "DIRECTOR").contains(r);
    }

    /**
     * Các vai trò được xem chi tiết phiếu lương của nhân viên khác theo Điều 95 BLLĐ
     * (Kế toán tiền lương, Kế toán trưởng, Trưởng phòng Nhân sự, Ban Giám đốc)
     */
    public static boolean isSalaryPrivileged(UserPrincipal p) {
        if (p == null) return false;
        String r = normalizeRoleShort(p.getRole());
        return Set.of("ACCOUNTANT", "CHIEF_ACCOUNTANT", "HR_MANAGER", "DIRECTOR").contains(r);
    }

    /**
     * Lấy danh sách ID công trình mà Chỉ huy trưởng (SITE_MANAGER) trực tiếp phụ trách.
     */
    public static Set<Long> getManagedProjectIds(UserPrincipal principal, ProjectRepository projectRepository) {
        if (principal == null || principal.getId() == null || projectRepository == null) {
            return Collections.emptySet();
        }
        Set<Long> ids = new HashSet<>();
        List<Project> all = projectRepository.findAll();
        if (all != null) {
            for (Project p : all) {
                if (p.getId() != null && Objects.equals(p.getSiteManagerId(), principal.getId())) {
                    ids.add(p.getId());
                }
            }
        }
        return ids;
    }

    /**
     * Lấy tập ID nhân sự thuộc phạm vi quản lý của Chỉ huy trưởng (gồm chính mình + kỹ sư đang được phân công vào các dự án mình quản lý).
     */
    public static Set<Long> getManagedEngineerIds(
            UserPrincipal principal,
            ProjectRepository projectRepository,
            EngineerAssignmentRepository assignmentRepository
    ) {
        Set<Long> empIds = new HashSet<>();
        if (principal == null || principal.getId() == null) return empIds;
        empIds.add(principal.getId());
        if (projectRepository == null || assignmentRepository == null) return empIds;

        Set<Long> managedProjectIds = getManagedProjectIds(principal, projectRepository);
        for (Long projId : managedProjectIds) {
            List<EngineerAssignment> list = assignmentRepository.findByProjectIdAndStatus(projId, "ACTIVE");
            if (list != null) {
                for (EngineerAssignment ea : list) {
                    if (ea.getEmployeeId() != null) {
                        empIds.add(ea.getEmployeeId());
                    }
                }
            }
        }
        return empIds;
    }

    /**
     * Kiểm tra Chỉ huy trưởng chỉ được thao tác trên công trình mình trực tiếp phụ trách (Project-level Scope).
     */
    public static void enforceSiteManagerProjectScope(
            UserPrincipal principal,
            Long projectId,
            ProjectRepository projectRepository
    ) {
        if (principal == null || !isSiteManager(principal) || projectId == null || projectId <= 0 || projectRepository == null) {
            return;
        }
        Project proj = projectRepository.findById(projectId).orElse(null);
        if (proj != null && proj.getSiteManagerId() != null && !Objects.equals(proj.getSiteManagerId(), principal.getId())) {
            throw new AccessDeniedException(
                    "Phạm vi công trình (Project Scope): Chỉ huy trưởng chỉ được phép thao tác trên công trình mình trực tiếp phụ trách (" + proj.getCode() + " thuộc quản lý của Chỉ huy trưởng khác)!"
            );
        }
    }

    /**
     * Kiểm tra Chỉ huy trưởng chỉ được duyệt/xử lý nhân sự thuộc các công trình mình trực tiếp phụ trách.
     */
    public static void enforceSiteManagerEngineerScope(
            UserPrincipal principal,
            Long targetEmployeeId,
            ProjectRepository projectRepository,
            EngineerAssignmentRepository assignmentRepository
    ) {
        if (principal == null || !isSiteManager(principal) || targetEmployeeId == null) {
            return;
        }
        if (Objects.equals(principal.getId(), targetEmployeeId)) {
            return;
        }
        if (projectRepository == null || assignmentRepository == null) {
            return;
        }
        Set<Long> managedProjects = getManagedProjectIds(principal, projectRepository);
        if (managedProjects.isEmpty()) {
            throw new AccessDeniedException(
                    "Phạm vi công trình (Project Scope): Tài khoản Chỉ huy trưởng hiện chưa được gán phụ trách công trình nào!"
            );
        }
        Set<Long> managedEmpIds = getManagedEngineerIds(principal, projectRepository, assignmentRepository);
        if (!managedEmpIds.contains(targetEmployeeId)) {
            throw new AccessDeniedException(
                    "Phạm vi công trình (Project Scope): Nhân sự ID #" + targetEmployeeId + " không thuộc danh sách kỹ sư tại các công trình bạn trực tiếp phụ trách!"
            );
        }
    }
}
