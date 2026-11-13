package com.hmcps.controller;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.AuditLog;
import com.hmcps.entity.Employee;
import com.hmcps.entity.FaceUpdateRequest;
import com.hmcps.repository.AuditLogRepository;
import com.hmcps.repository.EmployeeRepository;
import com.hmcps.repository.FaceUpdateRequestRepository;
import com.hmcps.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaceUpdateRequestControllerTest {

    @Mock
    private FaceUpdateRequestRepository faceUpdateRequestRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private FaceUpdateRequestController controller;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuth(Long id, String code, String name, String role) {
        UserPrincipal up = new UserPrincipal(
                id, code, code.toLowerCase() + "@haiminh.vn", "", name,
                role, false, true, Collections.singletonList(new SimpleGrantedAuthority(role))
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(up, null, up.getAuthorities())
        );
    }

    @Test
    @DisplayName("Nhân viên gửi yêu cầu cập nhật Face ID thành công ở trạng thái PENDING (chưa ghi đè ảnh gốc)")
    void testSubmitOwnRequest_PendingAndDoesNotOverwriteEmployee() {
        mockAuth(17L, "HM-017", "Vũ Hải Đăng", "ROLE_OFFICE_STAFF");
        Employee emp = Employee.builder()
                .id(17L).employeeCode("HM-017").fullName("Vũ Hải Đăng")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .faceImageUrl("old_img").faceEmbedding("old_vec").isFaceRegistered(true).build();

        when(employeeRepository.findById(17L)).thenReturn(Optional.of(emp));
        when(faceUpdateRequestRepository.findByEmployeeIdAndStatus(17L, "PENDING")).thenReturn(List.of());
        when(faceUpdateRequestRepository.save(any(FaceUpdateRequest.class))).thenAnswer(i -> {
            FaceUpdateRequest r = i.getArgument(0);
            r.setId(101L);
            return r;
        });
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(i -> i.getArgument(0));

        FaceUpdateRequestController.SubmitFaceUpdateRequest req = new FaceUpdateRequestController.SubmitFaceUpdateRequest();
        req.setProposedFaceImageUrl("data:image/jpeg;base64,new_face");
        req.setProposedFaceEmbedding("hmcps-face-v1:[0.1]");
        req.setReason("Đổi kiểu tóc và đeo kính mới");

        ResponseEntity<FaceUpdateRequest> resp = controller.submitRequest(req);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getStatus()).isEqualTo("PENDING");
        assertThat(emp.getFaceImageUrl()).isEqualTo("old_img"); // Chưa ghi đè khi chưa duyệt!
    }

    @Test
    @DisplayName("Chặn nhân viên gửi yêu cầu cập nhật Face ID thay cho ID người khác (Anti-IDOR)")
    void testSubmitForAnotherEmployee_Rejected() {
        mockAuth(17L, "HM-017", "Vũ Hải Đăng", "ROLE_OFFICE_STAFF");
        FaceUpdateRequestController.SubmitFaceUpdateRequest req = new FaceUpdateRequestController.SubmitFaceUpdateRequest();
        req.setEmployeeId(4L);
        req.setProposedFaceImageUrl("data:image/jpeg;base64,hack");
        req.setProposedFaceEmbedding("hmcps-face-v1:[0.2]");
        req.setReason("Giả mạo người khác");

        assertThatThrownBy(() -> controller.submitRequest(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("chỉ được phép gửi yêu cầu cập nhật Face ID cho chính tài khoản của mình");
    }

    @Test
    @DisplayName("Nguyên tắc Maker-Checker: Tự phê duyệt yêu cầu của chính mình bị chặn")
    void testSelfApprove_Rejected() {
        mockAuth(4L, "HM-004", "Nguyễn Thu Giang", "ROLE_HR_MANAGER");
        FaceUpdateRequest pending = FaceUpdateRequest.builder()
                .id(10L).employeeId(4L).employeeType("OFFICE_STAFF").status("PENDING").build();

        when(faceUpdateRequestRepository.findById(10L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> controller.approveRequest(10L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Maker-Checker");
    }

    @Test
    @DisplayName("Chỉ huy trưởng chỉ được duyệt Kỹ sư công trường, không được duyệt Khối văn phòng")
    void testSiteManagerCannotApproveOfficeStaff() {
        mockAuth(5L, "HM-005", "Nguyễn Lê Gia Phát", "ROLE_SITE_MANAGER");
        FaceUpdateRequest officeReq = FaceUpdateRequest.builder()
                .id(11L).employeeId(17L).employeeType("OFFICE_STAFF").status("PENDING").build();

        when(faceUpdateRequestRepository.findById(11L)).thenReturn(Optional.of(officeReq));

        assertThatThrownBy(() -> controller.approveRequest(11L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Kỹ sư công trường");
    }

    @Test
    @DisplayName("HR Manager phê duyệt -> cập nhật ảnh/vector chính thức lên Employee & lưu Audit")
    void testHrApproveUpdatesEmployee() {
        mockAuth(4L, "HM-004", "Nguyễn Thu Giang", "ROLE_HR_MANAGER");
        FaceUpdateRequest pending = FaceUpdateRequest.builder()
                .id(12L).employeeId(17L).employeeCode("HM-017").employeeName("Vũ Hải Đăng")
                .employeeType("OFFICE_STAFF")
                .proposedFaceImageUrl("data:image/jpeg;base64,approved")
                .proposedFaceEmbedding("hmcps-face-v1:[0.9]")
                .status("PENDING").build();
        Employee emp = Employee.builder()
                .id(17L).employeeCode("HM-017").fullName("Vũ Hải Đăng")
                .employeeType(EmployeeType.OFFICE_STAFF).isFaceRegistered(false).build();

        when(faceUpdateRequestRepository.findById(12L)).thenReturn(Optional.of(pending));
        when(employeeRepository.findById(17L)).thenReturn(Optional.of(emp));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));
        when(faceUpdateRequestRepository.save(any(FaceUpdateRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<FaceUpdateRequest> resp = controller.approveRequest(12L);
        assertThat(resp.getBody().getStatus()).isEqualTo("APPROVED");
        assertThat(emp.getIsFaceRegistered()).isTrue();
        assertThat(emp.getFaceImageUrl()).isEqualTo("data:image/jpeg;base64,approved");
        assertThat(emp.getFaceEmbedding()).isEqualTo("hmcps-face-v1:[0.9]");
        assertThat(emp.getFaceUpdatedBy()).contains("Nguyễn Thu Giang");
    }
}

