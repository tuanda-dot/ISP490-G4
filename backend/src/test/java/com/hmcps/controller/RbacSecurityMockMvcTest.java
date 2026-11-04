package com.hmcps.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Employee;
import com.hmcps.entity.SalaryGrade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration Test kiểm thử Phân quyền (RBAC) với MockMvc và @WithMockUser
 * Xác minh quyền hạn chặt chẽ của 4 vai trò chính:
 * 1. HR Manager (ROLE_HR_MANAGER)
 * 2. Chỉ huy trưởng công trường (ROLE_SITE_MANAGER)
 * 3. Kế toán (ROLE_ACCOUNTANT)
 * 4. Kỹ sư hiện trường / Công nhân (ROLE_SITE_ENGINEER)
 * 5. Khách vãng lai chưa xác thực (Anonymous)
 */
@SpringBootTest
@AutoConfigureMockMvc
class RbacSecurityMockMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ==========================================
    // 1. ROLE HR MANAGER (Nhân sự)
    // ==========================================

    @Test
    @WithMockUser(username = "hr.manager@haiminh.vn", roles = {"HR_MANAGER"})
    @DisplayName("RBAC HR: Được phép tạo mới hồ sơ nhân viên (POST /api/employees) -> 200 OK")
    void testHrManager_CanCreateEmployee() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        Employee emp = Employee.builder()
                .employeeCode("TEST-HR-" + suffix)
                .fullName("Nhân Viên Do HR Tạo")
                .email("hr.created." + suffix + "@haiminh.vn")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .build();

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emp)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "hr.manager@haiminh.vn", roles = {"HR_MANAGER"})
    @DisplayName("RBAC HR: Được phép phê duyệt đơn nghỉ phép Cấp 2 (PUT /api/requests/leave/{id}/approve) -> 200 OK")
    void testHrManager_CanApproveLeave() throws Exception {
        WorkflowRequestController.ApproveLeaveRequest req = new WorkflowRequestController.ApproveLeaveRequest();
        req.setApproved(true);

        mockMvc.perform(put("/api/requests/leave/201/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    // ==========================================
    // 2. ROLE SITE MANAGER (Chỉ huy trưởng)
    // ==========================================

    @Test
    @WithMockUser(username = "site.manager@haiminh.vn", roles = {"SITE_MANAGER"})
    @DisplayName("RBAC Chỉ huy trưởng: Được phép duyệt đơn OT hiện trường Cấp 1 -> 200 OK")
    void testSiteManager_CanApproveOvertime() throws Exception {
        WorkflowRequestController.ApproveOtRequest req = new WorkflowRequestController.ApproveOtRequest();
        req.setRole("SITE_MANAGER");
        req.setApproved(true);

        mockMvc.perform(put("/api/requests/overtime/102/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "site.manager@haiminh.vn", roles = {"SITE_MANAGER"})
    @DisplayName("RBAC Chỉ huy trưởng: BỊ CHẶN khi cố sửa thang bảng lương tài chính -> 403 Forbidden")
    void testSiteManager_CannotModifySalaryGrades_Forbidden() throws Exception {
        SalaryGrade grade = SalaryGrade.builder()
                .gradeCode("XD-HACK-01")
                .gradeName("Bậc Lương Trái Phép")
                .levelOrder(1)
                .minSalary(new BigDecimal("10000000"))
                .maxSalary(new BigDecimal("12000000"))
                .employeeType("SITE_ENGINEER")
                .build();

        mockMvc.perform(post("/api/compliance/salary-grades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(grade)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 3. ROLE ACCOUNTANT (Kế toán)
    // ==========================================

    @Test
    @WithMockUser(username = "accountant@haiminh.vn", roles = {"ACCOUNTANT"})
    @DisplayName("RBAC Kế toán: Được phép cập nhật thang bảng lương (POST /api/compliance/salary-grades) -> 200 OK")
    void testAccountant_CanModifySalaryGrades() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        SalaryGrade grade = SalaryGrade.builder()
                .gradeCode("XD-KT-" + suffix)
                .gradeName("Bậc 1 Kế Toán Thiết Lập")
                .levelOrder(1)
                .minSalary(new BigDecimal("6000000.00"))
                .maxSalary(new BigDecimal("7000000.00"))
                .employeeType("SITE_ENGINEER")
                .build();

        mockMvc.perform(post("/api/compliance/salary-grades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(grade)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "accountant@haiminh.vn", roles = {"ACCOUNTANT"})
    @DisplayName("RBAC Kế toán: BỊ CHẶN khi duyệt đơn nghỉ phép của nhân sự -> 403 Forbidden")
    void testAccountant_CannotApproveLeave_Forbidden() throws Exception {
        WorkflowRequestController.ApproveLeaveRequest req = new WorkflowRequestController.ApproveLeaveRequest();
        req.setApproved(true);

        mockMvc.perform(put("/api/requests/leave/201/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 4. ROLE WORKER / SITE ENGINEER (Kỹ sư hiện trường / Công nhân)
    // ==========================================

    @Test
    @WithMockUser(username = "engineer@haiminh.vn", roles = {"SITE_ENGINEER"})
    @DisplayName("RBAC Kỹ sư/Công nhân: Được phép nộp đơn xin tăng ca OT -> 200 OK")
    void testEngineer_CanSubmitOvertimeRequest() throws Exception {
        WorkflowRequestController.OvertimeDto dto = WorkflowRequestController.OvertimeDto.builder()
                .employeeId(7L)
                .projectId(1L)
                .workDate("2026-10-29")
                .startTime("18:00")
                .endTime("22:00")
                .otHours(4.0)
                .otType("WEEKDAY_150")
                .reason("Trực bơm bê tông ca đêm")
                .build();

        mockMvc.perform(post("/api/requests/overtime")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "engineer@haiminh.vn", roles = {"SITE_ENGINEER"})
    @DisplayName("RBAC Kỹ sư/Công nhân: BỊ CHẶN khi cố tạo mới nhân sự -> 403 Forbidden")
    void testEngineer_CannotCreateEmployee_Forbidden() throws Exception {
        Employee emp = Employee.builder()
                .employeeCode("HACK-01")
                .fullName("Người Dùng Trái Phép")
                .email("hack@haiminh.vn")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emp)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "engineer@haiminh.vn", roles = {"SITE_ENGINEER"})
    @DisplayName("RBAC Kỹ sư/Công nhân: BỊ CHẶN khi cố duyệt đơn tăng ca -> 403 Forbidden")
    void testEngineer_CannotApproveOvertime_Forbidden() throws Exception {
        WorkflowRequestController.ApproveOtRequest req = new WorkflowRequestController.ApproveOtRequest();
        req.setRole("SITE_MANAGER");
        req.setApproved(true);

        mockMvc.perform(put("/api/requests/overtime/101/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 5. ANONYMOUS (Chưa đăng nhập)
    // ==========================================

    @Test
    @DisplayName("Chưa đăng nhập: Truy cập tài nguyên bảo vệ bị chặn 403/401")
    void testAnonymous_AccessProtectedResource_ForbiddenOrUnauthorized() throws Exception {
        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isForbidden());
    }
}
