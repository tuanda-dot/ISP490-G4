package com.hmcps.entity;

import com.hmcps.common.enums.EmployeeType;
import com.hmcps.common.enums.InsuranceFlag;
import com.hmcps.common.enums.TaxFlag;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Chi tiết bảng lương nhân viên - Thể hiện toàn bộ 8 Khối Cột (A -> H)
 * Kế thừa trọn vẹn và tối ưu hóa từ Engine tính lương chuẩn công nghiệp.
 * Tất cả trường số tiền bắt buộc sử dụng BigDecimal (precision = 15, scale = 2).
 */
@Entity
@Table(name = "payroll_items", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"payrollId", "employeeId"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long payrollId;

    @Column(nullable = false)
    private Long employeeId;

    // ================= KHỐI A: ĐỊNH DANH NHÂN VIÊN =================
    @Column(nullable = false, length = 30)
    private String employeeCode;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(length = 100)
    private String position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmployeeType employeeType; // OFFICE_STAFF vs SITE_ENGINEER

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InsuranceFlag insuranceFlag = InsuranceFlag.FULL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TaxFlag taxFlag = TaxFlag.PROGRESSIVE;

    // ================= KHỐI B: NGÀY CÔNG & GIỜ LÀM VIỆC =================
    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal congChuan; // Công chuẩn trong tháng

    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal congChinhThuc; // Số ngày công chính thức

    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal congThuViec; // Số ngày công thử việc

    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal congTinhCom; // Công đi làm thực tế để tính suất cơm 40k/ngày

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal ngayCongHuongPhuCap = BigDecimal.ZERO; // Ngày công hưởng phụ cấp (Mẫu Phiếu lương Hải Minh)

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal ngayCongCongTac = BigDecimal.ZERO; // Ngày công hưởng phụ cấp công tác (CT)

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal ngayNghiPhep = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal ngayNghiLe = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal ngayNghiKhongLuong = BigDecimal.ZERO;

    @Column(precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal overtimeHours = BigDecimal.ZERO; // Giờ làm thêm (OT)

    @Column(precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal nightHours = BigDecimal.ZERO; // Giờ làm đêm (22h - 06h)

    // ================= KHỐI C: MỨC LƯƠNG & PHỤ CẤP TÍNH LƯƠNG T13 =================
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal mucLuong; // Lương chính thỏa thuận HĐLĐ

    @Column(precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal heSoNangSuat = BigDecimal.ONE; // Hệ số năng suất KPI (0.0 - 5.0)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapLuong = BigDecimal.ZERO; // Trợ cấp năng suất = mucLuong x heSoNangSuat

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal troCapThuViec = BigDecimal.ZERO; // Trợ cấp thời gian thử việc

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapChucVu = BigDecimal.ZERO; // Phụ cấp chức vụ (Office Staff tính BHXH)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapThamNien = BigDecimal.ZERO; // Phụ cấp thâm niên (Office Staff tính BHXH)

    // Lương hiệu quả công việc & Xếp loại đánh giá (Mẫu Phieu luong.xlsx Hải Minh)
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal luongHieuQuaKhoan = BigDecimal.ZERO;

    @Column(length = 10)
    @Builder.Default
    private String xepLoaiDanhGia = "A";

    @Column(precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal tyLeHieuQua = BigDecimal.ONE;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal luongHieuQuaThucHuong = BigDecimal.ZERO;

    // ================= KHỐI D: PHỤ CẤP LƯU ĐỘNG / CÔNG TRƯỜNG =================
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapCom = BigDecimal.ZERO; // Tiền ăn = congTinhCom x 40.000đ

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapXangXe = BigDecimal.ZERO; // Xăng xe: 500.000đ

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapDienThoai = BigDecimal.ZERO; // Điện thoại: 500.000đ

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapLuuTru = BigDecimal.ZERO; // Phụ cấp lưu trú công trình (Kỹ sư - miễn BHXH)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapDocHai = BigDecimal.ZERO; // Phụ cấp độc hại nguy hiểm hiện trường (Kỹ sư - miễn BHXH)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapTrachNhiem = BigDecimal.ZERO; // Phụ cấp trách nhiệm dự án (Kỹ sư - miễn BHXH)

    // ================= KHỐI E: THU NHẬP CHỊU THUẾ & TỔNG THU NHẬP (GROSS) =================
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal thuNhap; // Lương phân bổ theo công: (mucLuong + phuCapLuong)/congChuan x congThucTe + PhuCapNgoai

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal luongTangCa = BigDecimal.ZERO; // Tiền làm thêm giờ (OT 150%, 200%, 300%)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuTroiDem = BigDecimal.ZERO; // Tiền phụ cấp làm đêm 30% (Đ.98.2 BLLĐ)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal thuongDuAn = BigDecimal.ZERO; // Thưởng hoàn thành mốc dự án

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal phuCapCongTac = BigDecimal.ZERO; // Phụ cấp công tác (CT)

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal hoanThueTncn = BigDecimal.ZERO; // Hoàn thuế TNCN

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal thuNhapKhac = BigDecimal.ZERO; // Các khoản thu nhập / thưởng khác

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal truyThuThueTncn = BigDecimal.ZERO; // Truy thu thuế TNCN

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal tongThuNhap; // TỔNG THU NHẬP GROSS

    // ================= KHỐI F: TRÍCH NỘP BẢO HIỂM =================
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal insuranceBase; // Nền lương đóng BHXH (Khác nhau giữa Văn phòng vs Kỹ sư!)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhxhNld; // BHXH NLĐ (8%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhytNld; // BHYT NLĐ (1.5%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhtnNld; // BHTN NLĐ (1%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal congBhNld; // CỘNG BH NLĐ = BHXH + BHYT + BHTN (10.5%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhxhDn; // BHXH Doanh nghiệp (17%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhytDn; // BHYT Doanh nghiệp (3%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal bhtnDn; // BHTN Doanh nghiệp (1%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal tnldDn; // TNLĐ-BNN Doanh nghiệp (0.5% theo NĐ 158/2025)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal kpcdDn; // Kinh phí Công đoàn DN (2%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal congBhDn; // CỘNG BH DOANH NGHIỆP = 23.5%

    // ================= KHỐI G: THUẾ THU NHẬP CÁ NHÂN (PIT) =================
    @Column(nullable = false)
    private Integer slNpt; // Số người phụ thuộc

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal gtBanThan; // Giảm trừ bản thân (11.000.000đ)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal gtNpt; // Giảm trừ NPT (4.400.000đ x slNpt)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal comMienThue; // Cơm miễn thuế = MIN(phuCapCom, 730.000đ)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal chenhLechLtg; // Chênh lệch lương tăng ca MIỄN THUẾ TNCN (50% ngày thường, 100% CN, 200% Lễ)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal phuTroiDemMienThue; // Phụ trội ca đêm MIỄN THUẾ TNCN (30%)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal tnct; // Thu nhập chịu thuế

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal tntt; // Thu nhập tính thuế = MAX(0, tnct - congBhNld - gtBanThan - gtNpt)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal thueTncn; // Thuế TNCN (Lũy tiến 7 bậc hoặc khoán 10%/20%)

    // ================= KHỐI H: KẾT QUẢ CUỐI (NET TAKE-HOME) =================
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal phiCongDoanVien; // Phí công đoàn viên (1% lương BHXH, trần 10% lương cơ sở)

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal thucNhan; // THỰC NHẬN = tongThuNhap - congBhNld - thueTncn - phiCongDoanVien

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
