-- ====================================================================
-- HMCPS COMPLETE DATABASE SCHEMA INITIALIZATION
-- Hệ thống Quản trị Chấm công và Tính lương Xây dựng Hải Minh (HMCPS)
-- Phiên bản: Hoàn chỉnh (Hợp nhất toàn diện V1 & V2)
-- Hệ quản trị CSDL: PostgreSQL 15+
-- Tuân thủ:
--  - Toàn bộ trường tiền tệ sử dụng DECIMAL(15, 2)
--  - Ngày giờ hệ thống sử dụng TIMESTAMPTZ (Chuẩn UTC ISO 8601)
--  - Bao phủ toàn diện 14 Feature Majors (FE-01 -> FE-14) & 29 Use Cases (UC-01 -> UC-29)
--  - Khớp 9 Luồng Nghiệp Vụ Chuẩn (BF-01 -> BF-09)
--  - Hỗ trợ đầy đủ: Face ID AI, GPS Geofencing, Dynamic OTP, Khóa công 3 cấp,
--    Động cơ tính lương chuẩn Golden Baseline F5-0003, Hạch toán ERP TT 200/2014,
--    Maker-Checker, E-Payslip bảo mật và Nhật ký kiểm toán bất biến (Audit Trail).
-- ====================================================================

-- ====================================================================
-- PHẦN I: TỔ CHỨC DOANH NGHIỆP, CÔNG TRÌNH & NHÂN SỰ (FE-01, FE-02)
-- ====================================================================

-- 1. Phòng ban & Trụ sở làm việc (FE-01 / UC-01)
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    parent_id BIGINT REFERENCES departments(id),
    manager_id BIGINT,
    address TEXT,
    latitude DECIMAL(10, 7) DEFAULT 10.7768890,
    longitude DECIMAL(10, 7) DEFAULT 106.7008060,
    geofence_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Dự án công trình xây dựng & Tọa độ Geofence (FE-02 / UC-04)
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geofence_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    site_manager_id BIGINT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Hồ sơ nhân sự toàn diện & Sinh trắc học Face ID (FE-01 / UC-02)
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    citizen_id VARCHAR(20) UNIQUE,
    department_id BIGINT REFERENCES departments(id),
    position VARCHAR(100),
    employee_type VARCHAR(30) NOT NULL, -- OFFICE_STAFF (Văn phòng - TK 642), SITE_ENGINEER (Hiện trường - TK 622/627)
    
    -- Dữ liệu Face ID AI sinh trắc học (FE-03 / UC-06)
    face_image_url TEXT,                -- URL ảnh chân dung chuẩn đăng ký
    face_embedding TEXT,                -- Vector đặc trưng khuôn mặt 128 chiều
    is_face_registered BOOLEAN NOT NULL DEFAULT FALSE,
    biometric_id INTEGER UNIQUE,        -- Mã ID ánh xạ máy chấm công vật lý Kiosk / ZKTeco
    
    is_union_member BOOLEAN NOT NULL DEFAULT FALSE,
    dependents_count INTEGER NOT NULL DEFAULT 0,
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    base_salary DECIMAL(15, 2),
    hire_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_OFFICE_STAFF',
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Bổ sung khóa ngoại manager_id của departments và site_manager_id của projects sau khi bảng employees đã tạo
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_manager;
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES employees(id);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_site_manager;
ALTER TABLE projects ADD CONSTRAINT fk_projects_site_manager FOREIGN KEY (site_manager_id) REFERENCES employees(id);

-- 4. Hợp đồng lao động & Phụ lục điều chỉnh (FE-01 / UC-03)
CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    contract_type VARCHAR(30) NOT NULL, -- OFFICIAL_DEFINITE, OFFICIAL_INDEFINITE, PROBATION, EXPERT_CONSULTANT
    start_date DATE NOT NULL,
    end_date DATE,
    base_salary DECIMAL(15, 2) NOT NULL,
    insurance_flag VARCHAR(30) NOT NULL DEFAULT 'FULL',
    tax_flag VARCHAR(30) NOT NULL DEFAULT 'PROGRESSIVE',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Phân công & Điều động kỹ sư hiện trường theo gói thầu (FE-02 / UC-05)
CREATE TABLE IF NOT EXISTS engineer_assignments (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    role_on_site VARCHAR(100),
    assigned_date DATE NOT NULL,
    release_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PHẦN II: THAM SỐ PHÁP LÝ, THANG BẢNG LƯƠNG & PHỤ CẤP (FE-08, FE-09)
-- ====================================================================

-- 6. Hằng số tuân thủ pháp luật lao động & thuế TNCN (FE-08 / UC-17)
CREATE TABLE IF NOT EXISTS compliance_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    rule_value DECIMAL(15, 4) NOT NULL,
    effective_date DATE NOT NULL,
    description TEXT,
    legal_reference VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Thang bảng lương & Ngạch bậc ngành xây dựng (FE-08 / UC-18)
CREATE TABLE IF NOT EXISTS salary_grades (
    id BIGSERIAL PRIMARY KEY,
    grade_code VARCHAR(30) NOT NULL UNIQUE,
    grade_name VARCHAR(100) NOT NULL,
    employee_type VARCHAR(30) NOT NULL, -- OFFICE_STAFF, SITE_ENGINEER
    level_order INTEGER NOT NULL DEFAULT 1,
    min_salary DECIMAL(15, 2) NOT NULL,
    max_salary DECIMAL(15, 2) NOT NULL,
    standard_step DECIMAL(15, 2) NOT NULL DEFAULT 1000000.00,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Danh mục phụ cấp & thành phần lương động (FE-09 / UC-19, UC-20)
CREATE TABLE IF NOT EXISTS salary_components (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    component_type VARCHAR(30) NOT NULL, -- ALLOWANCE, DEDUCTION, BONUS, SUBSIDY
    is_insurance_base BOOLEAN NOT NULL DEFAULT FALSE, -- Phụ cấp hiện trường của Kỹ sư công trường MIỄN đóng BHXH
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    is_prorated_by_days BOOLEAN NOT NULL DEFAULT TRUE,
    default_account_code VARCHAR(20),     -- 622, 627, 642
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Cấu trúc phụ cấp gán theo từng nhân viên (FE-09 / UC-19)
CREATE TABLE IF NOT EXISTS employee_salary_structures (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    component_id BIGINT NOT NULL REFERENCES salary_components(id),
    amount DECIMAL(15, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PHẦN III: QUẢN LÝ CA KÍP, CHẤM CÔNG & SINH TRẮC HỌC (FE-03, FE-04, FE-06)
-- ====================================================================

-- 10. Danh mục khung ca làm việc (FE-06 / UC-12)
CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    shift_type VARCHAR(30) NOT NULL, -- STANDARD, NIGHT_SHIFT, SPLIT_SHIFT, OVERTIME
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER NOT NULL DEFAULT 60,
    multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Ma trận phân ca định kỳ Roster Matrix (FE-06 / UC-12)
CREATE TABLE IF NOT EXISTS work_schedules (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    shift_id BIGINT NOT NULL REFERENCES shifts(id),
    project_id BIGINT REFERENCES projects(id),
    work_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_schedule UNIQUE (employee_id, work_date, shift_id)
);

-- 12. Thiết bị chấm công Face ID AI & Kiosk Hiện trường (FE-03 / UC-06)
CREATE TABLE IF NOT EXISTS biometric_devices (
    id BIGSERIAL PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(30) NOT NULL DEFAULT 'FACE_ID_CAMERA', -- FACE_ID_CAMERA, TABLET_KIOSK, WEBCAM_PORTAL, ZKTECO_HARDWARE
    ip_address VARCHAR(45) NOT NULL,
    port INTEGER NOT NULL DEFAULT 4370,
    location VARCHAR(150),
    confidence_threshold DECIMAL(4, 2) NOT NULL DEFAULT 0.85, -- Ngưỡng tin cậy nhận diện khuôn mặt
    liveness_enabled BOOLEAN NOT NULL DEFAULT TRUE,          -- Chống giả mạo ảnh in/video
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Dữ liệu thô sự kiện chấm công Face ID sinh trắc học (FE-03 / UC-06)
CREATE TABLE IF NOT EXISTS biometric_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT REFERENCES biometric_devices(id),
    biometric_user_id INTEGER,
    employee_id BIGINT REFERENCES employees(id),
    log_timestamp TIMESTAMPTZ NOT NULL,
    verify_type VARCHAR(30) NOT NULL DEFAULT 'FACE_ID', -- FACE_ID, LIVENESS_CHECK, FINGERPRINT
    face_snapshot_url TEXT,
    confidence_score DECIMAL(5, 4),
    liveness_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Mã Dynamic OTP Công trường theo ca/ngày (FE-04 / UC-08)
CREATE TABLE IF NOT EXISTS daily_site_otps (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    otp_code VARCHAR(10) NOT NULL,
    valid_date DATE NOT NULL,
    generated_by BIGINT NOT NULL REFERENCES employees(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_daily_otp UNIQUE (project_id, valid_date)
);

-- 15. Bảng chấm công hàng ngày (Triple-Factor: Face ID + GPS + Dynamic OTP) (FE-04 / UC-07, UC-09)
CREATE TABLE IF NOT EXISTS attendances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT REFERENCES projects(id),
    shift_id BIGINT REFERENCES shifts(id),
    work_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    actual_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    regular_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    night_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Tọa độ GPS Geofence (Kỹ sư hiện trường)
    check_in_latitude DECIMAL(10, 7),
    check_in_longitude DECIMAL(10, 7),
    distance_meters DOUBLE PRECISION,
    otp_entered VARCHAR(10),
    
    -- Dữ liệu đối soát Face ID
    face_snapshot_url TEXT,
    confidence_score DECIMAL(5, 4),
    liveness_verified BOOLEAN NOT NULL DEFAULT FALSE,
    device_info VARCHAR(255),
    
    status VARCHAR(30) NOT NULL, -- FACE_ID_GPS_VERIFIED, GPS_VERIFIED, FACE_ID_VERIFIED, BIOMETRIC_VERIFIED, MANUAL_ADJUSTED, INVALID_GEOFENCE, INVALID_OTP
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_employee_daily_attendance UNIQUE (employee_id, work_date, shift_id)
);

-- ====================================================================
-- PHẦN IV: QUY TRÌNH ĐƠN TỪ & GIẢI TRÌNH 2 CẤP (FE-05, FE-06)
-- ====================================================================

-- 16. Đơn xin nghỉ phép & Hạn mức phép năm (FE-05 / UC-10)
CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(30) NOT NULL, -- ANNUAL, SICK, COMPENSATORY, UNPAID, MATERNITY
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(4, 2) NOT NULL,
    reason TEXT NOT NULL,
    
    -- Quy trình duyệt 2 cấp (Chỉ huy trưởng L1 -> Trưởng phòng HR L2)
    site_manager_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, NOT_REQUIRED
    site_manager_id BIGINT REFERENCES employees(id),
    site_manager_approved_at TIMESTAMPTZ,
    
    hr_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    hr_manager_id BIGINT REFERENCES employees(id),
    hr_approved_at TIMESTAMPTZ,
    
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SM', -- PENDING_SM, PENDING_HR, APPROVED, REJECTED, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 17. Đơn đăng ký làm thêm giờ hiện trường OT (FE-06 / UC-13)
CREATE TABLE IF NOT EXISTS overtime_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    work_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    ot_hours DECIMAL(4, 2) NOT NULL,
    ot_type VARCHAR(30) NOT NULL, -- WEEKDAY_150, WEEKEND_200, NIGHT_SHIFT_ADDITIONAL, HOLIDAY_300
    multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.50,
    reason TEXT NOT NULL,
    
    -- Phê duyệt 2 cấp
    site_manager_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    site_manager_id BIGINT REFERENCES employees(id),
    site_manager_approved_at TIMESTAMPTZ,
    
    hr_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    hr_manager_id BIGINT REFERENCES employees(id),
    hr_approved_at TIMESTAMPTZ,
    
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 18. Đơn giải trình chấm công & Bù công hiện trường (FE-05 / UC-11)
CREATE TABLE IF NOT EXISTS attendance_explanations (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT REFERENCES projects(id),
    target_date DATE NOT NULL,
    explanation_type VARCHAR(50) NOT NULL, -- MISSING_CHECKIN, DEVICE_ERROR, GPS_DRIFT, ACCIDENTAL_PUNCH
    suggested_check_in VARCHAR(10),
    suggested_check_out VARCHAR(10),
    actual_hours DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    reason TEXT NOT NULL,
    evidence_url TEXT, -- Ảnh nhật ký thi công / biên bản xác nhận
    
    -- Phê duyệt 2 cấp
    site_manager_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    site_manager_id BIGINT REFERENCES employees(id),
    site_manager_approved_at TIMESTAMPTZ,
    
    hr_approval VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    hr_manager_id BIGINT REFERENCES employees(id),
    hr_approved_at TIMESTAMPTZ,
    
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ====================================================================
-- PHẦN V: TỔNG HỢP CÔNG & KHÓA SỔ 3 CẤP (FE-07 / UC-14, UC-15, UC-16)
-- ====================================================================

-- 19. Bảng tổng hợp công tháng (Monthly Timesheet)
CREATE TABLE IF NOT EXISTS monthly_timesheets (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    standard_work_days DECIMAL(5, 2) NOT NULL DEFAULT 26.00,
    actual_work_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    official_work_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    probation_work_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    meal_work_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    night_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    paid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    unpaid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Máy trạng thái khóa công 3 cấp
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, LOCKED
    confirmed_by BIGINT REFERENCES employees(id),
    confirmed_at TIMESTAMPTZ,
    locked_by BIGINT REFERENCES employees(id),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_employee_monthly_timesheet UNIQUE (employee_id, month, year)
);

-- ====================================================================
-- PHẦN VI: ĐỘNG CƠ TÍNH LƯƠNG, PHÂN BỔ DỰ ÁN & MAKER-CHECKER (FE-10, FE-11)
-- ====================================================================

-- 20. Kỳ tính lương tháng (FE-10 / UC-21)
CREATE TABLE IF NOT EXISTS payrolls (
    id BIGSERIAL PRIMARY KEY,
    payroll_code VARCHAR(50) NOT NULL UNIQUE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    standard_work_days DECIMAL(5, 2) NOT NULL DEFAULT 26.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CALCULATED, REVIEWED, APPROVED, LOCKED, PAID
    total_gross_salary DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_net_salary DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_employer_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    created_by BIGINT REFERENCES employees(id),
    approved_by BIGINT REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    
    -- Tích hợp chứng từ kế toán MISA / ERP (FE-11 / UC-24)
    accounting_voucher_no VARCHAR(50),
    accounting_exported_at TIMESTAMPTZ,
    accounting_exported_by BIGINT REFERENCES employees(id),
    is_accounting_balanced BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_payroll_period UNIQUE (month, year)
);

-- 21. Chi tiết dòng lương nhân sự 8 Khối Cột A -> H (FE-10 / UC-21)
CREATE TABLE IF NOT EXISTS payroll_items (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL REFERENCES payrolls(id),
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    employee_code VARCHAR(30) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    position VARCHAR(100),
    employee_type VARCHAR(30) NOT NULL,
    insurance_flag VARCHAR(30) NOT NULL,
    tax_flag VARCHAR(30) NOT NULL,
    
    -- Khối B: Thời gian lao động
    cong_chuan DECIMAL(5, 2) NOT NULL,
    cong_chinh_thuc DECIMAL(5, 2) NOT NULL,
    cong_thu_viec DECIMAL(5, 2) NOT NULL,
    cong_tinh_com DECIMAL(5, 2) NOT NULL,
    overtime_hours DECIMAL(6, 2) NOT NULL,
    night_hours DECIMAL(6, 2) NOT NULL,
    
    -- Khối C: Lương & Phụ cấp tính đóng BHXH
    muc_luong DECIMAL(15, 2) NOT NULL,
    he_so_nang_suat DECIMAL(4, 2) NOT NULL,
    phu_cap_luong DECIMAL(15, 2) NOT NULL,
    tro_cap_thu_viec DECIMAL(15, 2) NOT NULL,
    phu_cap_chuc_vu DECIMAL(15, 2) NOT NULL,
    phu_cap_tham_nien DECIMAL(15, 2) NOT NULL,
    
    -- Khối D: Phụ cấp đặc thù hiện trường MIỄN đóng BHXH
    phu_cap_com DECIMAL(15, 2) NOT NULL,
    phu_cap_xang_xe DECIMAL(15, 2) NOT NULL,
    phu_cap_dien_thoai DECIMAL(15, 2) NOT NULL,
    phu_cap_luu_tru DECIMAL(15, 2) NOT NULL,
    phu_cap_doc_hai DECIMAL(15, 2) NOT NULL,
    phu_cap_trach_nhiem DECIMAL(15, 2) NOT NULL,
    
    -- Khối E: Tổng thu nhập
    thu_nhap DECIMAL(15, 2) NOT NULL,
    luong_tang_ca DECIMAL(15, 2) NOT NULL,
    phu_troi_dem DECIMAL(15, 2) NOT NULL,
    thuong_du_an DECIMAL(15, 2) NOT NULL,
    tong_thu_nhap DECIMAL(15, 2) NOT NULL,
    
    -- Khối F: Trích nộp bảo hiểm bắt buộc (NLĐ 10.5% / DN 23.5%)
    insurance_base DECIMAL(15, 2) NOT NULL,
    bhxh_nld DECIMAL(15, 2) NOT NULL,
    bhyt_nld DECIMAL(15, 2) NOT NULL,
    bhtn_nld DECIMAL(15, 2) NOT NULL,
    cong_bh_nld DECIMAL(15, 2) NOT NULL,
    bhxh_dn DECIMAL(15, 2) NOT NULL,
    bhyt_dn DECIMAL(15, 2) NOT NULL,
    bhtn_dn DECIMAL(15, 2) NOT NULL,
    tnld_dn DECIMAL(15, 2) NOT NULL,
    kpcd_dn DECIMAL(15, 2) NOT NULL,
    cong_bh_dn DECIMAL(15, 2) NOT NULL,
    
    -- Khối G: Giảm trừ & Thuế TNCN lũy tiến
    sl_npt INTEGER NOT NULL,
    gt_ban_than DECIMAL(15, 2) NOT NULL,
    gt_npt DECIMAL(15, 2) NOT NULL,
    com_mien_thue DECIMAL(15, 2) NOT NULL,
    chenh_lech_ltg DECIMAL(15, 2) NOT NULL,
    phu_troi_dem_mien_thue DECIMAL(15, 2) NOT NULL,
    tnct DECIMAL(15, 2) NOT NULL,
    tntt DECIMAL(15, 2) NOT NULL,
    thue_tncn DECIMAL(15, 2) NOT NULL,
    
    -- Khối H: Thực nhận Net Pay
    phi_cong_doan_vien DECIMAL(15, 2) NOT NULL,
    thuc_nhan DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_item UNIQUE (payroll_id, employee_id)
);

-- 22. Phân bổ chi phí nhân công theo công trình (TK 622, 627, 642) (FE-10 / UC-22)
CREATE TABLE IF NOT EXISTS project_cost_allocations (
    id BIGSERIAL PRIMARY KEY,
    payroll_item_id BIGINT NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    payroll_id BIGINT NOT NULL REFERENCES payrolls(id),
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT REFERENCES projects(id),
    account_code VARCHAR(20) NOT NULL, -- TK_622, TK_627, TK_642
    allocation_ratio DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,
    allocated_amount DECIMAL(15, 2) NOT NULL,
    
    debit_account VARCHAR(20) NOT NULL DEFAULT '622',
    credit_account VARCHAR(20) NOT NULL DEFAULT '3341',
    expense_item_code VARCHAR(50),
    accounting_sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PHẦN VII: E-PAYSLIP, KHIẾU NẠI & HẠCH TOÁN SỔ CÁI (FE-11, FE-12, FE-13)
-- ====================================================================

-- 23. Phiếu lương điện tử E-Payslip (FE-12 / UC-25)
CREATE TABLE IF NOT EXISTS payslips (
    id BIGSERIAL PRIMARY KEY,
    payroll_item_id BIGINT NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED', -- GENERATED, VIEWED, CONFIRMED, DISPUTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_payslip UNIQUE (employee_id, month, year)
);

-- 24. Khiếu nại & Phản hồi phiếu lương (FE-12 / UC-25)
CREATE TABLE IF NOT EXISTS payslip_inquiries (
    id BIGSERIAL PRIMARY KEY,
    payslip_id BIGINT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    payroll_id BIGINT NOT NULL REFERENCES payrolls(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    response_content TEXT,
    responded_by_id BIGINT REFERENCES employees(id),
    responded_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, RESOLVED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 25. Bảng Chứng từ Hạch toán Kế toán Kép Thông tư 200 (FE-11 / UC-24)
CREATE TABLE IF NOT EXISTS accounting_journal_vouchers (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    voucher_number VARCHAR(50) NOT NULL,
    voucher_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    description TEXT NOT NULL,
    debit_account VARCHAR(20) NOT NULL,   -- 622, 627, 642, 3341
    credit_account VARCHAR(20) NOT NULL,  -- 3341, 3383, 3384, 3386, 3382, 3335, 1121
    amount DECIMAL(15, 2) NOT NULL,
    employee_id BIGINT REFERENCES employees(id),
    project_id BIGINT REFERENCES projects(id),
    project_code VARCHAR(50),
    expense_item_code VARCHAR(50),
    export_target VARCHAR(50) NOT NULL DEFAULT 'MISA', -- MISA, FAST, BRAVO, SAP
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PHẦN VIII: NHẬT KÝ KIỂM TOÁN AN NINH BẤT BIẾN (FE-14 / UC-29)
-- ====================================================================

-- 26. Nhật ký kiểm toán hệ thống bất biến (Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,          -- TIMESHEET_LOCK, PAYROLL_CALCULATE, FORMULA_UPDATE, OT_APPROVAL
    entity_name VARCHAR(100) NOT NULL,     -- monthly_timesheets, payrolls, compliance_rules, overtime_requests
    entity_id BIGINT,
    performed_by_id BIGINT REFERENCES employees(id),
    performed_by_name VARCHAR(150),
    performed_by_role VARCHAR(50),
    ip_address VARCHAR(45),
    old_value_json TEXT,                   -- Snapshot dữ liệu trước khi thay đổi
    new_value_json TEXT,                   -- Snapshot dữ liệu sau khi thay đổi
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PHẦN IX: CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (INDEXES)
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_attendances_emp_date ON attendances(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendances_proj_date ON attendances(project_id, work_date);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_payroll ON project_cost_allocations(payroll_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_project ON project_cost_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_payroll ON accounting_journal_vouchers(payroll_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_project ON accounting_journal_vouchers(project_code);
CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ot_emp_date ON overtime_requests(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_ot_proj_status ON overtime_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_exp_emp_date ON attendance_explanations(employee_id, target_date);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performer ON audit_logs(performed_by_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inquiry_emp ON payslip_inquiries(employee_id, status);

-- ====================================================================
-- PHẦN X: SEED DỮ LIỆU HẰNG SỐ PHÁP LÝ & THANG BẬC LƯƠNG
-- ====================================================================

-- 1. Hằng số pháp lý lao động & trần bảo hiểm năm 2026
INSERT INTO compliance_rules (rule_key, rule_value, effective_date, description, legal_reference)
VALUES 
    ('REFERENCE_AMOUNT', 2340000, '2026-01-01', 'Mức tham chiếu / Lương cơ sở', 'Nghị định 73/2024/NĐ-CP'),
    ('BHXH_CAP', 46800000, '2026-01-01', 'Trần đóng BHXH/BHYT (20 x 2.34M)', 'Luật BHXH 2014 & Luật BHXH 2024'),
    ('MIN_WAGE', 5310000, '2026-01-01', 'Lương tối thiểu Vùng I', 'Nghị định 74/2024/NĐ-CP'),
    ('BHTN_CAP', 106200000, '2026-01-01', 'Trần đóng BHTN (20 x 5.31M)', 'Luật Việc làm'),
    ('PERSONAL_DEDUCTION', 11000000, '2026-01-01', 'Mức giảm trừ bản thân thuế TNCN', 'Nghị quyết 954/2020/UBTVQH14'),
    ('DEPENDENT_DEDUCTION', 4400000, '2026-01-01', 'Mức giảm trừ người phụ thuộc thuế TNCN', 'Nghị quyết 954/2020/UBTVQH14'),
    ('MEAL_EXEMPT_THRESHOLD', 730000, '2026-01-01', 'Trần miễn thuế tiền ăn trưa', 'Thông tư 26/2016/TT-BLĐTBXH'),
    ('UNION_DUES_CAP', 234000, '2026-01-01', 'Trần đoàn phí công đoàn (10% lương cơ sở)', 'Quyết định 1908/QĐ-TLĐ'),
    ('HQ_LATITUDE', 10.7768890, '2026-01-01', 'Vĩ độ Trụ sở chính công ty Hải Minh Building', 'Quy chế chấm công nội bộ'),
    ('HQ_LONGITUDE', 106.7008060, '2026-01-01', 'Kinh độ Trụ sở chính công ty Hải Minh', 'Quy chế chấm công nội bộ'),
    ('HQ_GEOFENCE_RADIUS', 100.0000, '2026-01-01', 'Bán kính Geofence Trụ sở chính (mét)', 'Quy chế chấm công nội bộ')
ON CONFLICT (rule_key) DO NOTHING;

-- 2. Thang bảng lương ngạch bậc chuẩn ngành xây dựng & văn phòng
INSERT INTO salary_grades (grade_code, grade_name, employee_type, level_order, min_salary, max_salary, standard_step, description)
VALUES
    -- Khối Văn phòng HQ (TK 642)
    ('VP-B1', 'Chuyên Viên Tập Sự / Thử Việc', 'OFFICE_STAFF', 1, 10000000, 14000000, 1000000, 'Nhân viên hành chính, kế toán thử việc'),
    ('VP-B2', 'Chuyên Viên Chính Văn Phòng', 'OFFICE_STAFF', 2, 15000000, 22000000, 1500000, 'Chuyên viên nhân sự, kế toán tiền lương'),
    ('VP-B3', 'Chuyên Viên Cao Cấp / Phó Phòng', 'OFFICE_STAFF', 3, 23000000, 32000000, 2000000, 'Phó phòng kế toán, trưởng nhóm tuyển dụng'),
    ('VP-B4', 'Trưởng Phòng / Kế Toán Trưởng', 'OFFICE_STAFF', 4, 35000000, 50000000, 3000000, 'Trưởng phòng HR, Kế toán trưởng'),
    ('VP-B5', 'Ban Giám Đốc Điều Hành', 'OFFICE_STAFF', 5, 55000000, 80000000, 5000000, 'Phó Tổng Giám Đốc, Tổng Giám Đốc'),

    -- Khối Kỹ Sư Công Trường (TK 627)
    ('CT-B1', 'Kỹ Sư Hiện Trường Mới Ra Trường', 'SITE_ENGINEER', 1, 14000000, 18000000, 1000000, 'Kỹ sư trắc địa, giám sát tập sự'),
    ('CT-B2', 'Kỹ Sư Kết Cấu / MEP Độc Lập', 'SITE_ENGINEER', 2, 19000000, 26000000, 1500000, 'Kỹ sư trực tiếp phụ trách mũi thi công'),
    ('CT-B3', 'Kỹ Sư Giám Sát Trưởng / Đội Trưởng', 'SITE_ENGINEER', 3, 27000000, 35000000, 2000000, 'Chỉ huy phó, đội trưởng thi công dầm/móng'),
    ('CT-B4', 'Chỉ Huy Trưởng Công Trường', 'SITE_ENGINEER', 4, 36000000, 55000000, 3000000, 'Chỉ huy trưởng gói thầu trọng điểm')
ON CONFLICT (grade_code) DO NOTHING;
