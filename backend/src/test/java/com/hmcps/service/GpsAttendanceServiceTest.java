package com.hmcps.service;

import com.hmcps.common.enums.AttendanceStatus;
import com.hmcps.common.enums.EmployeeType;
import com.hmcps.entity.Attendance;
import com.hmcps.entity.DailySiteOtp;
import com.hmcps.entity.Employee;
import com.hmcps.entity.EngineerAssignment;
import com.hmcps.entity.Project;
import com.hmcps.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GpsAttendanceServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DailySiteOtpRepository dailySiteOtpRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private EngineerAssignmentRepository assignmentRepository;
    @Mock
    private ShiftRepository shiftRepository;

    @InjectMocks
    private GpsAttendanceService gpsAttendanceService;

    @Test
    @DisplayName("Chấm công thành công khi vị trí GPS nằm trong bán kính công trường và OTP đúng")
    void testGpsCheckIn_Success() {
        Long empId = 5L;
        Long projId = 10L;

        // Tọa độ công trình: Bitexco Tower (10.771971, 106.704413), bán kính 100m
        Project project = Project.builder()
                .id(projId)
                .code("PRJ-BITEXCO")
                .name("Tòa nhà Bitexco")
                .latitude(new BigDecimal("10.771971"))
                .longitude(new BigDecimal("106.704413"))
                .geofenceRadiusMeters(100.0)
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .employeeCode("ENG-005")
                .fullName("Kỹ Sư Kết Cấu Nguyễn Văn A")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        EngineerAssignment assignment = EngineerAssignment.builder()
                .employeeId(empId)
                .projectId(projId)
                .status("ACTIVE")
                .build();

        DailySiteOtp otp = DailySiteOtp.builder()
                .projectId(projId)
                .otpCode("889922")
                .validDate(LocalDate.now())
                .isActive(true)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(project));
        when(assignmentRepository.findByEmployeeIdAndProjectIdAndStatus(empId, projId, "ACTIVE"))
                .thenReturn(Optional.of(assignment));
        when(dailySiteOtpRepository.findByProjectIdAndValidDateAndIsActiveTrue(projId, LocalDate.now()))
                .thenReturn(Optional.of(otp));
        when(attendanceRepository.findByEmployeeIdAndWorkDate(empId, LocalDate.now()))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        // Tọa độ nhân viên cách tâm công trình ~20m (10.772100, 106.704450)
        GpsAttendanceService.GpsCheckInRequest req = GpsAttendanceService.GpsCheckInRequest.builder()
                .employeeId(empId)
                .projectId(projId)
                .shiftId(1L)
                .latitude(10.772100)
                .longitude(106.704450)
                .otpCode("889922")
                .build();

        GpsAttendanceService.GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(req);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.GPS_VERIFIED);
        assertThat(result.getDistanceMeters()).isLessThan(100.0);
    }

    @Test
    @DisplayName("Chấm công thất bại (INVALID_GEOFENCE) khi nhân viên ở xa ngoài bán kính cho phép")
    void testGpsCheckIn_OutsideGeofence() {
        Long empId = 5L;
        Long projId = 10L;

        Project project = Project.builder()
                .id(projId)
                .code("PRJ-BITEXCO")
                .latitude(new BigDecimal("10.771971"))
                .longitude(new BigDecimal("106.704413"))
                .geofenceRadiusMeters(100.0) // 100 mét
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        EngineerAssignment assignment = EngineerAssignment.builder()
                .employeeId(empId)
                .projectId(projId)
                .status("ACTIVE")
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(project));
        when(assignmentRepository.findByEmployeeIdAndProjectIdAndStatus(empId, projId, "ACTIVE"))
                .thenReturn(Optional.of(assignment));

        // Tọa độ nhân viên ở chợ Bến Thành (~800m so với Bitexco): 10.7725, 106.6980
        GpsAttendanceService.GpsCheckInRequest req = GpsAttendanceService.GpsCheckInRequest.builder()
                .employeeId(empId)
                .projectId(projId)
                .shiftId(1L)
                .latitude(10.7725)
                .longitude(106.6980)
                .otpCode("889922")
                .build();

        GpsAttendanceService.GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(req);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.INVALID_GEOFENCE);
        assertThat(result.getDistanceMeters()).isGreaterThan(500.0);
    }

    @Test
    @DisplayName("Chấm công thất bại (INVALID_OTP) khi nhập sai mã OTP công trường trong ngày")
    void testGpsCheckIn_InvalidOtp() {
        Long empId = 5L;
        Long projId = 10L;

        Project project = Project.builder()
                .id(projId)
                .latitude(new BigDecimal("10.771971"))
                .longitude(new BigDecimal("106.704413"))
                .geofenceRadiusMeters(100.0)
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        EngineerAssignment assignment = EngineerAssignment.builder()
                .employeeId(empId)
                .projectId(projId)
                .status("ACTIVE")
                .build();

        DailySiteOtp otp = DailySiteOtp.builder()
                .projectId(projId)
                .otpCode("654321")
                .validDate(LocalDate.now())
                .isActive(true)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(project));
        when(assignmentRepository.findByEmployeeIdAndProjectIdAndStatus(empId, projId, "ACTIVE"))
                .thenReturn(Optional.of(assignment));
        when(dailySiteOtpRepository.findByProjectIdAndValidDateAndIsActiveTrue(projId, LocalDate.now()))
                .thenReturn(Optional.of(otp));

        // Đúng vị trí GPS (< 10m) nhưng nhập sai mã OTP "111222"
        GpsAttendanceService.GpsCheckInRequest req = GpsAttendanceService.GpsCheckInRequest.builder()
                .employeeId(empId)
                .projectId(projId)
                .shiftId(1L)
                .latitude(10.771971)
                .longitude(106.704413)
                .otpCode("111222") // Sai OTP
                .build();

        GpsAttendanceService.GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(req);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.INVALID_OTP);
    }

    @Test
    @DisplayName("Xác thực tam trùng thành công: Kỹ sư có mặt đúng công trình + đúng mã OTP + quét Face ID")
    void testGpsCheckIn_WithFaceId_TripleVerification() {
        Long empId = 6L;
        Long projId = 12L;

        Project project = Project.builder()
                .id(projId)
                .code("PRJ-METRO")
                .name("Tuyến Metro Số 1")
                .latitude(new BigDecimal("10.771971"))
                .longitude(new BigDecimal("106.704413"))
                .geofenceRadiusMeters(100.0)
                .build();

        Employee emp = Employee.builder()
                .id(empId)
                .fullName("Lê Văn Kỹ Sư")
                .employeeType(EmployeeType.SITE_ENGINEER)
                .build();

        EngineerAssignment assignment = EngineerAssignment.builder()
                .employeeId(empId)
                .projectId(projId)
                .status("ACTIVE")
                .build();

        DailySiteOtp otp = DailySiteOtp.builder()
                .projectId(projId)
                .otpCode("888999")
                .validDate(LocalDate.now())
                .isActive(true)
                .build();

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(projectRepository.findById(projId)).thenReturn(Optional.of(project));
        when(assignmentRepository.findByEmployeeIdAndProjectIdAndStatus(empId, projId, "ACTIVE"))
                .thenReturn(Optional.of(assignment));
        when(dailySiteOtpRepository.findByProjectIdAndValidDateAndIsActiveTrue(projId, LocalDate.now()))
                .thenReturn(Optional.of(otp));
        when(attendanceRepository.findByEmployeeIdAndWorkDate(eq(empId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GpsAttendanceService.GpsCheckInRequest req = GpsAttendanceService.GpsCheckInRequest.builder()
                .employeeId(empId)
                .projectId(projId)
                .shiftId(1L)
                .latitude(10.771971)
                .longitude(106.704413)
                .otpCode("888999")
                .faceSnapshotUrl("https://storage.haiminh.vn/snapshots/face_engineer_01.jpg")
                .confidenceScore(0.992)
                .deviceId("iPhone 15 Pro - Safari Mobile")
                .build();

        GpsAttendanceService.GpsCheckInResult result = gpsAttendanceService.checkInWithGpsAndOtp(req);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.FACE_ID_GPS_VERIFIED);
        assertThat(result.getAttendance().getFaceSnapshotUrl()).isEqualTo("https://storage.haiminh.vn/snapshots/face_engineer_01.jpg");
        assertThat(result.getAttendance().getLivenessVerified()).isTrue();
    }
}
