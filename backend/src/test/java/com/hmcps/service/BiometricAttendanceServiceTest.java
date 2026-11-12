package com.hmcps.service;

import com.hmcps.common.dto.FaceIdCheckInRequest;
import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.exception.BusinessException;
import com.hmcps.entity.Attendance;
import com.hmcps.entity.Department;
import com.hmcps.entity.Employee;
import com.hmcps.repository.AttendanceRepository;
import com.hmcps.repository.BiometricLogRepository;
import com.hmcps.repository.DepartmentRepository;
import com.hmcps.repository.EmployeeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiometricAttendanceServiceTest {

    @Mock
    private BiometricLogRepository biometricLogRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private BiometricAttendanceService biometricAttendanceService;

    @Test
    @DisplayName("Chấm công từ xa qua Web Laptop bị từ chối do ngoài bán kính GPS Văn phòng Trụ sở")
    void testFaceIdCheckIn_OutOfOfficeGeofence_Rejected() {
        Long empId = 1L;
        Long deptId = 2L;

        // Trụ sở công ty: Tòa nhà Hải Minh (10.776889, 106.700806), bán kính 100m
        Department dept = Department.builder()
                .id(deptId)
                .code("DEPT-HR")
                .name("Phòng Hành chính Nhân sự")
                .latitude(new BigDecimal("10.7768890"))
                .longitude(new BigDecimal("106.7008060"))
                .geofenceRadiusMeters(100.0)
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .fullName("Nguyễn Thị Lan")
                .departmentId(deptId)
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isFaceRegistered(true)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(departmentRepository.findById(deptId)).thenReturn(Optional.of(dept));

        // Nhân viên ngồi quán cà phê (cách trụ sở ~ 2.5 km: 10.795000, 106.715000)
        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(empId)
                .timestamp(LocalDateTime.now())
                .faceSnapshotUrl("https://storage.haiminh.vn/snapshots/face_lan_office.jpg")
                .confidenceScore(0.99)
                .deviceInfo("MacBook Pro Chrome Webcam")
                .latitude(10.795000)
                .longitude(106.715000)
                .build();

        assertThatThrownBy(() -> biometricAttendanceService.checkInWithFaceIdAndGps(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Chấm công từ xa bị từ chối");
    }

    @Test
    @DisplayName("Chấm công bị từ chối khi không bật quyền truy cập GPS")
    void testFaceIdCheckIn_MissingGps_Rejected() {
        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(1L)
                .timestamp(LocalDateTime.now())
                .faceSnapshotUrl("https://storage.haiminh.vn/snapshots/face_lan_office.jpg")
                .latitude(null)
                .longitude(null)
                .build();

        assertThatThrownBy(() -> biometricAttendanceService.checkInWithFaceIdAndGps(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bắt buộc bật định vị GPS khi chấm công");
    }

    @Test
    @DisplayName("Xác thực kép thành công: Nhân viên văn phòng có mặt tại trụ sở + quét Face ID qua Webcam")
    void testFaceIdCheckIn_Success() {
        Long empId = 1L;
        Long deptId = 2L;

        Department dept = Department.builder()
                .id(deptId)
                .code("DEPT-HR")
                .name("Phòng Hành chính Nhân sự")
                .latitude(new BigDecimal("10.7768890"))
                .longitude(new BigDecimal("106.7008060"))
                .geofenceRadiusMeters(100.0)
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .fullName("Nguyễn Thị Lan")
                .departmentId(deptId)
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isFaceRegistered(true)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(departmentRepository.findById(deptId)).thenReturn(Optional.of(dept));
        when(attendanceRepository.findByEmployeeIdAndWorkDate(eq(empId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Tọa độ sát trụ sở (< 10 mét)
        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(empId)
                .timestamp(LocalDateTime.now())
                .faceSnapshotUrl("https://storage.haiminh.vn/snapshots/face_lan_office.jpg")
                .confidenceScore(0.995)
                .deviceInfo("Dell XPS 15 Chrome Webcam")
                .latitude(10.7768900)
                .longitude(106.7008070)
                .build();

        Attendance attendance = biometricAttendanceService.checkInWithFaceIdAndGps(req);

        assertThat(attendance).isNotNull();
        assertThat(attendance.getStatus()).isEqualTo(AttendanceStatus.FACE_ID_GPS_VERIFIED);
        assertThat(attendance.getLivenessVerified()).isTrue();
        assertThat(attendance.getDistanceMeters()).isLessThan(20.0);
        assertThat(attendance.getFaceSnapshotUrl()).isEqualTo("https://storage.haiminh.vn/snapshots/face_lan_office.jpg");
    }

    private String makeConstantDescriptor(double sign) {
        StringBuilder sb = new StringBuilder("hmcps-face-v1:[");
        for (int i = 0; i < 128; i++) {
            if (i > 0) sb.append(",");
            double val = (i % 2 == 0 ? 1.0 : -1.0) * sign * 0.0884;
            sb.append(val);
        }
        sb.append("]");
        return sb.toString();
    }

    @Test
    @DisplayName("Chặn chấm công Face ID nếu nhân viên chưa đăng ký dữ liệu khuôn mặt")
    void testFaceIdCheckIn_UnregisteredFace_Rejected() {
        Employee emp = Employee.builder()
                .id(2L)
                .employeeCode("HM-006")
                .fullName("Trần Văn Trung")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isFaceRegistered(false)
                .build();

        when(employeeRepository.findById(2L)).thenReturn(Optional.of(emp));

        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(2L)
                .latitude(10.7768900)
                .longitude(106.7008070)
                .confidenceScore(0.98)
                .build();

        assertThatThrownBy(() -> biometricAttendanceService.checkInWithFaceIdAndGps(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("chưa đăng ký hoặc cập nhật dữ liệu khuôn mặt");
    }

    @Test
    @DisplayName("Từ chối điểm danh khi Vector 128-d khuôn mặt quét KHÔNG KHỚP với hồ sơ đã cập nhật")
    void testFaceIdCheckIn_VectorMismatch_Rejected() {
        Employee emp = Employee.builder()
                .id(3L)
                .employeeCode("HM-004")
                .fullName("Nguyễn Thu Giang")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isFaceRegistered(true)
                .faceEmbedding(makeConstantDescriptor(1.0))
                .build();

        when(employeeRepository.findById(3L)).thenReturn(Optional.of(emp));

        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(3L)
                .latitude(10.7768900)
                .longitude(106.7008070)
                .faceEmbedding(makeConstantDescriptor(-1.0))
                .confidenceScore(0.99) // even if client attempts to spoof score, backend vector comparison rejects
                .build();

        assertThatThrownBy(() -> biometricAttendanceService.checkInWithFaceIdAndGps(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("không khớp với hồ sơ Face ID");
    }

    @Test
    @DisplayName("Chấp nhận điểm danh khi Vector 128-d khuôn mặt khớp với hồ sơ đã cập nhật (>= 85%)")
    void testFaceIdCheckIn_VectorMatch_Success() {
        Employee emp = Employee.builder()
                .id(4L)
                .employeeCode("HM-004")
                .fullName("Nguyễn Thu Giang")
                .employeeType(EmployeeType.OFFICE_STAFF)
                .isFaceRegistered(true)
                .faceEmbedding(makeConstantDescriptor(1.0))
                .build();

        when(employeeRepository.findById(4L)).thenReturn(Optional.of(emp));
        when(attendanceRepository.findByEmployeeIdAndWorkDate(eq(4L), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        FaceIdCheckInRequest req = FaceIdCheckInRequest.builder()
                .employeeId(4L)
                .latitude(10.7768900)
                .longitude(106.7008070)
                .faceEmbedding(makeConstantDescriptor(1.0))
                .faceSnapshotUrl("data:image/jpeg;base64,/9j/test")
                .build();

        Attendance saved = biometricAttendanceService.checkInWithFaceIdAndGps(req);
        assertThat(saved.getStatus()).isEqualTo(AttendanceStatus.FACE_ID_GPS_VERIFIED);
        assertThat(saved.getConfidenceScore()).isGreaterThanOrEqualTo(new BigDecimal("0.8500"));
    }
}
