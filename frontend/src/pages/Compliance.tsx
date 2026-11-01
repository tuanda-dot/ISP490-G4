import React, { useState } from 'react';
import {
  ShieldCheck,
  Scale,
  FileText,
  Download,
  Building2,
  HardHat,
  Calculator,
  Plus,
  Edit2,
  Check,
  X,
  Sparkles,
  Layers,
  Percent,
  Sliders,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Trash2,
  History,
  Send,
  CheckSquare,
  Eye,
  Lock,
  RotateCcw,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import type {
  ComplianceRuleItem,
  SalaryScaleGrade,
  SalaryAllowanceItem,
  FormulaSimulationResult
} from '../types';

export const Compliance: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  // ----------------------------------------------------
  // ROLE-BASED ACCESS CONTROL (RBAC) - WORKFLOW HMCPS
  // ----------------------------------------------------
  // 1. Quản lý Tham số Pháp lý & Bảo hiểm (FE-08 / UC-17): HR Manager & Admin
  const canManageLawRules = ['HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  // 2. Quản lý Thang Bảng Lương Ngạch Bậc Chuẩn (FE-08 / UC-18): HR Manager & Admin
  const canManageSalaryScales = ['HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  // 3. Quản lý Phụ Cấp Công Trường & Gán Theo Dự Án (FE-09 / UC-19): HR Manager, Kế Toán Trưởng & Admin
  const canManageAllowances = ['HR_MANAGER', 'CHIEF_ACCOUNTANT', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  // 4. Workflow Lõi Lương Động & Sandbox (FE-09 / UC-20 / BF-10): Maker - Checker
  // Maker (Soạn thảo biểu thức, kiểm tra cú pháp, chạy dry-run, trình thẩm định): Chuyên viên Kế toán & Admin
  const isFormulaMaker = ['ACCOUNTANT', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  // Checker (Thẩm định & Phê duyệt chốt áp dụng phiên bản v2026.2): Kế toán trưởng & Admin
  const isFormulaChecker = ['CHIEF_ACCOUNTANT', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  // Management / Auditor / Viewer: Ban Giám đốc, Trưởng phòng HR, Kỹ sư hiện trường (Chế độ xem & Live Sandbox)
  const isFormulaViewer = !isFormulaMaker && !isFormulaChecker;

  const [activeTab, setActiveTab] = useState<'LAW_RULES' | 'SALARY_SCALES'>('LAW_RULES');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // ----------------------------------------------------
  // TAB 1: THAM SỐ LUẬT LAO ĐỘNG & BẢO HIỂM 2026 (FE-08 / UC-17)
  // ----------------------------------------------------
  const [complianceRules, setComplianceRules] = useState<ComplianceRuleItem[]>([
    {
      id: 1,
      ruleKey: 'REFERENCE_AMOUNT',
      ruleName: 'Mức Lương Tham Chiếu / Lương Cơ Sở',
      ruleValue: 2340000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị định 73/2024/NĐ-CP & NĐ 158/2025/NĐ-CP',
      description: 'Làm căn cứ xác định trần đóng BHXH, BHYT và các chế độ trợ cấp ốm đau, thai sản',
      category: 'INSURANCE',
      isActive: true,
    },
    {
      id: 2,
      ruleKey: 'REGIONAL_MIN_WAGE_I',
      ruleName: 'Lương Tối Thiểu Vùng I (Hà Nội, TP.HCM)',
      ruleValue: 5310000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị định 74/2024/NĐ-CP',
      description: 'Mức sàn hợp đồng lao động đối với nhân sự và kỹ sư công trình tại các đô thị loại I',
      category: 'LABOR_LAW',
      isActive: true,
    },
    {
      id: 3,
      ruleKey: 'BHXH_BHYT_CAP',
      ruleName: 'Mức Trần Đóng BHXH & BHYT (20 lần mức cơ sở)',
      ruleValue: 46800000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Luật BHXH 2024 / Điều 89',
      description: 'Thu nhập vượt quá 46.800.000 ₫/tháng chỉ đóng BHXH và BHYT tối đa ở hạn mức này',
      category: 'INSURANCE',
      isActive: true,
    },
    {
      id: 4,
      ruleKey: 'BHTN_CAP',
      ruleName: 'Mức Trần Đóng BHTN (20 lần lương tối thiểu Vùng I)',
      ruleValue: 106200000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Luật Việc Làm / Điều 58',
      description: 'Căn cứ áp trần Bảo hiểm Thất nghiệp cho cả NLĐ và Người sử dụng lao động',
      category: 'INSURANCE',
      isActive: true,
    },
    {
      id: 5,
      ruleKey: 'PIT_PERSONAL_DEDUCTION',
      ruleName: 'Giảm Trừ Gia Cảnh Bản Thân',
      ruleValue: 11000000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị quyết 954/2020/UBTVQH14 & Luật Thuế TNCN',
      description: 'Mức giảm trừ cố định 11 triệu đồng/tháng cho người nộp thuế trước khi tính thuế TNCN',
      category: 'TAX',
      isActive: true,
    },
    {
      id: 6,
      ruleKey: 'PIT_DEPENDENT_DEDUCTION',
      ruleName: 'Giảm Trừ Người Phụ Thuộc (NPT)',
      ruleValue: 4400000,
      unit: 'VNĐ/người/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị quyết 954/2020/UBTVQH14 & Luật Thuế TNCN',
      description: 'Giảm trừ 4.4 triệu đồng/tháng cho mỗi người phụ thuộc hợp pháp đã đăng ký mã số thuế',
      category: 'TAX',
      isActive: true,
    },
    {
      id: 7,
      ruleKey: 'MEAL_TAX_EXEMPT_THRESHOLD',
      ruleName: 'Hạn Mức Tiền Ăn Ca Miễn Thuế TNCN',
      ruleValue: 730000,
      unit: 'VNĐ/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Thông tư 111/2013/TT-BTC & Thông tư 26/2015',
      description: 'Khoản chi tiền ăn giữa ca trong hạn mức 730k được miễn thuế TNCN và miễn trích đóng BHXH',
      category: 'TAX',
      isActive: true,
    },
    {
      id: 8,
      ruleKey: 'TNLD_BNN_RATE',
      ruleName: 'Tỷ Lệ Đóng Quỹ TNLĐ-BNN Của Doanh Nghiệp',
      ruleValue: '0.50%',
      unit: 'Tỷ lệ %',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị định 158/2025/NĐ-CP & Luật An toàn VSLĐ',
      description: 'Đặc thù bắt buộc cho ngành thi công xây lắp công trình xây dựng (DN chi trả 100%)',
      category: 'INSURANCE',
      isActive: true,
    },
    {
      id: 9,
      ruleKey: 'UNION_FEE_RATE',
      ruleName: 'Kinh Phí Công Đoàn Doanh Nghiệp Nộp',
      ruleValue: '2.00%',
      unit: 'Tỷ lệ %',
      effectiveDate: '2026-01-01',
      legalReference: 'Nghị định 105/2026/NĐ-CP & Luật Công đoàn',
      description: 'Doanh nghiệp đóng 2% trên tổng quỹ tiền lương làm căn cứ đóng BHXH cho người lao động',
      category: 'INSURANCE',
      isActive: true,
    },
    {
      id: 10,
      ruleKey: 'STANDARD_WORK_DAYS',
      ruleName: 'Định Mức Ngày Công Chuẩn Trong Tháng',
      ruleValue: 26,
      unit: 'Ngày công/tháng',
      effectiveDate: '2026-01-01',
      legalReference: 'Nội quy Lao động Công ty Cổ phần Xây dựng Hải Minh',
      description: 'Áp dụng tính đơn giá ngày công: Đơn giá ngày = Lương cơ bản / 26 ngày',
      category: 'LABOR_LAW',
      isActive: true,
    },
  ]);

  // Modal Sửa & Thêm Quy Tắc Pháp Lý
  const [editingRule, setEditingRule] = useState<ComplianceRuleItem | null>(null);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>('ALL');

  const [newRuleForm, setNewRuleForm] = useState<Partial<ComplianceRuleItem>>({
    ruleKey: '',
    ruleName: '',
    ruleValue: '',
    unit: 'VNĐ/tháng',
    category: 'LABOR_LAW',
    effectiveDate: new Date().toISOString().split('T')[0],
    legalReference: '',
    description: '',
    status: 'ACTIVE',
  });

  const handleSaveRule = () => {
    if (!canManageLawRules) {
      alert('Bạn không có quyền chỉnh sửa tham số Luật Lao Động & Bảo Hiểm! Quyền này thuộc Trưởng Phòng Nhân Sự.');
      return;
    }
    if (!editingRule) return;
    setComplianceRules(prev => {
      const exists = prev.some(r => r.id === editingRule.id);
      if (exists) {
        return prev.map(r => r.id === editingRule.id ? editingRule : r);
      }
      return [{ ...editingRule, id: editingRule.id || Date.now(), status: editingRule.status || 'ACTIVE' }, ...prev];
    });
    showToast(`Đã lưu tham số "${editingRule.ruleName}" thành công!`);
    setEditingRule(null);
  };

  const handleCreateRule = () => {
    if (!canManageLawRules) {
      alert('Bạn không có quyền thêm mới tham số Luật Lao Động! Quyền này thuộc Trưởng Phòng Nhân Sự.');
      return;
    }
    if (!newRuleForm.ruleName || !newRuleForm.ruleKey) {
      alert('Vui lòng nhập đầy đủ Tên bộ luật và Mã quy chuẩn!');
      return;
    }
    const created: ComplianceRuleItem = {
      id: Date.now(),
      ruleKey: newRuleForm.ruleKey.toUpperCase().replace(/\s+/g, '_'),
      ruleName: newRuleForm.ruleName,
      ruleValue: isNaN(Number(newRuleForm.ruleValue)) ? (newRuleForm.ruleValue || '') : Number(newRuleForm.ruleValue),
      unit: newRuleForm.unit || 'VNĐ/tháng',
      category: (newRuleForm.category as any) || 'LABOR_LAW',
      effectiveDate: newRuleForm.effectiveDate || new Date().toISOString().split('T')[0],
      legalReference: newRuleForm.legalReference || 'Quy chuẩn nội bộ',
      description: newRuleForm.description || '',
      isActive: true,
      status: (newRuleForm.status as any) || 'ACTIVE',
      version: 'v2026.2',
    };
    setComplianceRules(prev => [created, ...prev]);
    showToast(`Đã thêm mới bộ luật / tham số "${created.ruleName}" (${created.status === 'ACTIVE' ? 'Áp dụng ngay' : 'Hẹn giờ hiệu lực: ' + created.effectiveDate})!`);
    setShowAddRuleModal(false);
    setNewRuleForm({
      ruleKey: '',
      ruleName: '',
      ruleValue: '',
      unit: 'VNĐ/tháng',
      category: 'LABOR_LAW',
      effectiveDate: new Date().toISOString().split('T')[0],
      legalReference: '',
      description: '',
      status: 'ACTIVE',
    });
  };

  const handleDeleteRule = (id: number, name: string) => {
    if (!canManageLawRules) {
      alert('Bạn không có quyền xóa tham số pháp lý!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa tham số / bộ luật "${name}" khỏi hệ thống không?`)) {
      setComplianceRules(prev => prev.filter(r => r.id !== id));
      showToast(`Đã xóa thành công tham số "${name}"!`);
    }
  };

  const handleToggleRuleStatus = (id: number) => {
    if (!canManageLawRules) {
      showToast('Bạn chỉ có quyền xem tham số pháp lý, không được thay đổi trạng thái áp dụng.');
      return;
    }
    setComplianceRules(prev => prev.map(r => {
      if (r.id === id) {
        const next = r.status === 'ACTIVE' ? 'PENDING' : 'ACTIVE';
        showToast(`Đã chuyển trạng thái tham số "${r.ruleName}" sang: ${next === 'ACTIVE' ? 'Hoạt động (Active)' : 'Chờ hiệu lực (Pending)'}`);
        return { ...r, status: next, isActive: next === 'ACTIVE' };
      }
      return r;
    }));
  };

  // ----------------------------------------------------
  // TAB 2: THANG BẢNG LƯƠNG CHUẨN DOANH NGHIỆP (FE-08 / UC-18)
  // ----------------------------------------------------
  const [salaryScales, setSalaryScales] = useState<SalaryScaleGrade[]>([
    // Khối Văn Phòng HQ (TK 642)
    {
      id: 1,
      scaleCode: 'VP-QL-01',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1 (Mới bổ nhiệm)',
      baseSalary: 25000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ (2.5M) bắt buộc đóng BHXH',
      description: 'Áp dụng cho Trưởng phòng HR, Kế toán trưởng, Giám đốc Dự án',
    },
    {
      id: 2,
      scaleCode: 'VP-QL-02',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 2,
      levelName: 'Bậc 2 (Thâm niên 2-4 năm)',
      baseSalary: 28500000,
      coefficient: 1.14,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ (2.5M) bắt buộc đóng BHXH',
      description: 'Quản lý có năng lực điều hành xuất sắc, hoàn thành KPI trên 95%',
    },
    {
      id: 3,
      scaleCode: 'VP-QL-03',
      scaleName: 'Cấp Quản Lý Khối Văn Phòng (Trưởng/Phó Phòng)',
      category: 'OFFICE',
      level: 3,
      levelName: 'Bậc 3 (Chuyên gia cao cấp / Lãnh đạo)',
      baseSalary: 32000000,
      coefficient: 1.28,
      accountCode: 'TK_642',
      insuranceRule: 'Lương CB + Phụ cấp chức vụ đóng BHXH (áp trần 46.8M)',
      description: 'Lãnh đạo phòng ban chiến lược với hơn 5 năm cống hiến',
    },
    {
      id: 4,
      scaleCode: 'VP-CV-01',
      scaleName: 'Chuyên Viên Chính Văn Phòng (HR, Kế Toán Tổng Hợp)',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 16000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Chuyên viên thực hiện độc lập mảng nghiệp vụ chuyên sâu',
    },
    {
      id: 5,
      scaleCode: 'VP-CV-02',
      scaleName: 'Chuyên Viên Chính Văn Phòng (HR, Kế Toán Tổng Hợp)',
      category: 'OFFICE',
      level: 2,
      levelName: 'Bậc 2',
      baseSalary: 18500000,
      coefficient: 1.156,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Chuyên viên chính có trên 3 năm kinh nghiệm',
    },
    {
      id: 6,
      scaleCode: 'VP-NV-01',
      scaleName: 'Chuyên Viên / Nhân Viên Hành Chính Nghiệp Vụ',
      category: 'OFFICE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 10000000,
      coefficient: 1.0,
      accountCode: 'TK_642',
      insuranceRule: 'Đóng BHXH trên Lương cơ bản',
      description: 'Nhân viên lễ tân, hành chính, văn thư lưu trữ',
    },
    // Khối Kỹ Sư Hiện Trường Công Trường (TK 627)
    {
      id: 7,
      scaleCode: 'CT-CHT-01',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1 (Công trình cấp II-III)',
      baseSalary: 26000000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng điều hành dự án dưới 150 tỷ đồng',
    },
    {
      id: 8,
      scaleCode: 'CT-CHT-02',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 2,
      levelName: 'Bậc 2 (Đại dự án cấp I, trên 150 tỷ)',
      baseSalary: 30000000,
      coefficient: 1.154,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng điều hành Cầu Nhật Tân 2, Landmark Hải Minh',
    },
    {
      id: 9,
      scaleCode: 'CT-CHT-03',
      scaleName: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      category: 'SITE',
      level: 3,
      levelName: 'Bậc 3 (Chỉ huy trưởng cấp Tập đoàn)',
      baseSalary: 35000000,
      coefficient: 1.346,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB (Miễn toàn bộ PC thi công)',
      description: 'Chỉ huy trưởng các công trình trọng điểm quốc gia',
    },
    {
      id: 10,
      scaleCode: 'CT-KS-01',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1 (Kỹ sư giám sát tiêu chuẩn)',
      baseSalary: 12000000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư trực tiếp bám hiện trường, chỉ đạo các tổ đội thi công',
    },
    {
      id: 11,
      scaleCode: 'CT-KS-02',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 2,
      levelName: 'Bậc 2 (Kỹ sư kinh nghiệm 2-4 năm)',
      baseSalary: 14500000,
      coefficient: 1.208,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư an toàn HSE chính, Kỹ sư kết cấu trưởng gói thầu',
    },
    {
      id: 12,
      scaleCode: 'CT-KS-03',
      scaleName: 'Kỹ Sư Hiện Trường (Giám Sát / An Toàn HSE / QS / MEP)',
      category: 'SITE',
      level: 3,
      levelName: 'Bậc 3 (Kỹ sư thâm niên cao)',
      baseSalary: 17000000,
      coefficient: 1.417,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Chủ trì thiết kế hiện trường, xử lý sự cố kết cấu phức tạp',
    },
    {
      id: 13,
      scaleCode: 'CT-TAPSU-01',
      scaleName: 'Kỹ Sư Hiện Trường Mới Ra Trường (Tập Sự)',
      category: 'SITE',
      level: 1,
      levelName: 'Bậc 1',
      baseSalary: 8500000,
      coefficient: 1.0,
      accountCode: 'TK_627',
      insuranceRule: 'Đóng BHXH DUY NHẤT trên Lương CB',
      description: 'Kỹ sư thực tập và kỹ sư tốt nghiệp loại khá/giỏi năm đầu',
    },
  ]);

  // Modal Sửa Thang Bảng Lương
  const [editingScale, setEditingScale] = useState<SalaryScaleGrade | null>(null);

  const handleSaveScale = () => {
    if (!canManageSalaryScales) {
      alert('Bạn không có quyền chỉnh sửa thang bảng lương ngạch bậc! Quyền này thuộc Trưởng Phòng Nhân Sự.');
      return;
    }
    if (!editingScale) return;
    setSalaryScales(prev => prev.map(s => s.id === editingScale.id ? editingScale : s));
    showToast(`Đã cập nhật bậc lương ${editingScale.scaleName} - ${editingScale.levelName}!`);
    setEditingScale(null);
  };


  // Export Compliance & Salary Scales CSV (FE-08)
  const handleExportComplianceCSV = () => {
    const ruleHeaders = ['STT', 'Mã Tham Số', 'Tên Quy Chuẩn / Bộ Luật', 'Nhóm', 'Giá Trị', 'Đơn Vị', 'Ngày Hiệu Lực', 'Trạng Thái', 'Căn Cứ Pháp Lý', 'Mô Tả Nghiệp Vụ'];
    const ruleRows = complianceRules.map((r, i) => [
      i + 1,
      `"${r.ruleKey}"`,
      `"${r.ruleName}"`,
      `"${r.category}"`,
      typeof r.ruleValue === 'number' ? r.ruleValue : `"${r.ruleValue}"`,
      `"${r.unit}"`,
      `"${r.effectiveDate}"`,
      `"${r.status || (r.isActive ? 'ACTIVE' : 'INACTIVE')}"`,
      `"${r.legalReference}"`,
      `"${r.description}"`
    ]);

    const scaleHeaders = ['Mã Ngạch', 'Tên Ngạch Bậc Lương', 'Khối', 'Cấp Bậc', 'Lương Cơ Bản', 'Hệ Số', 'TK Hạch Toán', 'Nguyên Tắc Đóng BHXH'];
    const scaleRows = salaryScales.map(s => [
      `"${s.scaleCode}"`,
      `"${s.scaleName}"`,
      `"${s.category === 'SITE' ? 'Khối Công Trường' : 'Khối Văn Phòng'}"`,
      `"${s.levelName}"`,
      s.baseSalary,
      s.coefficient,
      `"${s.accountCode}"`,
      `"${s.insuranceRule}"`
    ]);

    const csvSections = [
      'HỆ THỐNG QUẢN LÝ CHẤM CÔNG & TÍNH LƯƠNG HMCPS - HỒ SƠ QUY CHUẨN PHÁP LÝ & THANG BẢNG LƯƠNG (FE-08 / BF-10)',
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
      '',
      '=== PHẦN 1: BẢNG THAM SỐ LUẬT LAO ĐỘNG & BẢO HIỂM 2026 (FE-08 / UC-17) ===',
      [ruleHeaders.join(','), ...ruleRows.map(r => r.join(','))].join('\r\n'),
      '',
      '=== PHẦN 2: THANG BẢNG LƯƠNG CHUẨN DOANH NGHIỆP (FE-08 / UC-18) ===',
      [scaleHeaders.join(','), ...scaleRows.map(r => r.join(','))].join('\r\n')
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvSections], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Ho_So_Phap_Ly_Thang_Luong_2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công hồ sơ pháp lý & thang lương ra file CSV!');
  };

      {/* 1. Page Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-info" style={{ fontWeight: 600 }}>GIAI ĐOẠN 3 — TUẦN 4</span>
            <span className="badge badge-success">Luật Lao Động 2026 &amp; TT 200</span>
          </div>
          <h1 className="page-title">
            Cấu Hình Luật LĐ, Thang Bảng Lương &amp; Phụ Cấp Lương Động (FE-08, FE-09 / BF-10)
          </h1>
          <p className="page-description">
            Quản trị hằng số pháp lý lao động 2026, thang lương phân ngạch TK 642 vs TK 627, danh mục phụ cấp công trường và sandbox mô phỏng công thức lương động
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={handleExportComplianceCSV}
            className="btn btn-secondary"
            title="Tải về toàn bộ hồ sơ tham số pháp lý, thang lương và công thức định dạng Excel/CSV"
          >
            <Download size={15} />
            <span>Xuất Hồ Sơ Quy Định (.csv)</span>
          </button>

          {canManageLawRules && activeTab === 'LAW_RULES' && (
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="btn btn-primary"
            >
              <Plus size={15} />
              <span>Thêm Tham Số / Bộ Luật Mới</span>
            </button>
          )}

          {canManageAllowances && activeTab === 'SITE_ALLOWANCES' && (
            <button
              onClick={() => {
                setEditingAllowance({
                  id: 0,
                  code: '',
                  name: '',
                  componentType: 'ALLOWANCE',
                  amount: 1000000,
                  applicableScope: 'SITE_ENGINEER',
                  isInsuranceBase: false,
                  isTaxable: false,
                  isProratedByDays: true,
                  defaultAccountCode: 'TK_627',
                  legalBasis: 'Quy chế công ty',
                  isActive: true,
                  note: '',
                });
              }}
              className="btn btn-primary"
            >
              <Plus size={15} />
              <span>Thêm Phụ Cấp Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Actor Authorization & Workflow Responsibilities Strip */}
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '0.85rem 1.15rem',
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #2563eb',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: '1px solid #bfdbfe',
              }}
            >
              {user?.fullName ? user.fullName.split(' ').slice(-1)[0][0] : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                  {user?.fullName || 'Người Dùng'} ({user?.employeeCode || 'HM-USER'})
                </span>
                <span className="badge badge-primary" style={{ fontWeight: 600, fontSize: '0.6875rem' }}>
                  {ROLE_LABELS[currentRole] || currentRole}
                </span>
                {isFormulaMaker && !isFormulaChecker && (
                  <span className="badge badge-warning" style={{ fontSize: '0.6875rem', fontWeight: 600, backgroundColor: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Edit2 size={11} /> Maker (Soạn Thảo &amp; Trình Duyệt)
                  </span>
                )}
                {isFormulaChecker && !isFormulaMaker && (
                  <span className="badge badge-success" style={{ fontSize: '0.6875rem', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={11} /> Checker (Thẩm Định &amp; Phê Duyệt v2026.2)
                  </span>
                )}
                {isFormulaMaker && isFormulaChecker && (
                  <span className="badge badge-info" style={{ fontSize: '0.6875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sliders size={11} /> Quản Trị Hệ Thống (Toàn Quyền)
                  </span>
                )}
                {isFormulaViewer && (
                  <span className="badge badge-slate" style={{ fontSize: '0.6875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={11} /> Giám Sát / Mô Phỏng Quỹ Lương (Chỉ Đọc)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                {currentRole === 'ACCOUNTANT' && (
                  <><strong>Quyền hạn của bạn:</strong> Soạn thảo bộ công thức lương động (Step 9), kiểm tra cú pháp và trình Kế toán trưởng thẩm định (Step 11). Tham số Luật LĐ và Thang lương ở chế độ Tham chiếu (Read-only).</>
                )}
                {currentRole === 'CHIEF_ACCOUNTANT' && (
                  <><strong>Quyền hạn của bạn:</strong> Thẩm định và Phê duyệt chốt áp dụng bộ công thức v2026.2 (Step 12/BF-10); Đồng quản lý phụ cấp công trường &amp; gán dự án (TK 627). Tham số Luật LĐ và Ngạch bậc ở chế độ Tham chiếu.</>
                )}
                {currentRole === 'HR_MANAGER' && (
                  <><strong>Quyền hạn của bạn:</strong> Quản lý tham số Luật Lao Động 2026 (UC-17), thang bảng lương ngạch bậc (UC-18) và danh mục phụ cấp công trường (UC-19). Bộ biểu thức ở chế độ Giám sát &amp; Mô phỏng Sandbox.</>
                )}
                {['DIRECTOR', 'CEO'].includes(currentRole) && (
                  <><strong>Quyền hạn của bạn:</strong> Giám sát toàn diện tính tuân thủ pháp lý lao động 2026, đối chiếu định mức chi phí và thử nghiệm mô phỏng tác động quỹ lương qua Sandbox trực tiếp.</>
                )}
                {['SYSTEM_ADMIN', 'ADMIN'].includes(currentRole) && (
                  <><strong>Quyền hạn của bạn:</strong> Toàn quyền Quản trị: Thiết lập hằng số luật, thang bảng lương ngạch bậc, danh mục phụ cấp dự án và can thiệp bộ công thức tính toán.</>
                )}
                {!['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'HR_MANAGER', 'DIRECTOR', 'CEO', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole) && (
                  <><strong>Quyền hạn của bạn:</strong> Tham chiếu quy định pháp lý, chính sách phụ cấp hiện trường và trải nghiệm thử nghiệm bảng tính lương cá nhân.</>
                )}
              </div>
            </div>
          </div>

          {/* Quick RBAC Capability Indicators */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.6875rem' }}>
            <span
              className={`badge ${canManageLawRules ? 'badge-success' : 'badge-slate'}`}
              title="Quyền thêm, sửa, xóa tham số Luật Lao Động & Bảo Hiểm 2026 (FE-08)"
            >
              Luật LĐ: {canManageLawRules ? 'Toàn quyền' : 'Chỉ xem'}
            </span>
            <span
              className={`badge ${canManageSalaryScales ? 'badge-success' : 'badge-slate'}`}
              title="Quyền hiệu chỉnh ngạch bậc lương và hệ số chuẩn doanh nghiệp (FE-08)"
            >
              Thang Lương: {canManageSalaryScales ? 'Toàn quyền' : 'Chỉ xem'}
            </span>
            <span
              className={`badge ${canManageAllowances ? 'badge-success' : 'badge-slate'}`}
              title="Quyền sửa phụ cấp và gán định mức cho dự án công trình (FE-09)"
            >
              Phụ Cấp DA: {canManageAllowances ? 'Toàn quyền' : 'Chỉ xem'}
            </span>
            <span
              className={`badge ${isFormulaChecker ? 'badge-primary' : isFormulaMaker ? 'badge-warning' : 'badge-slate'}`}
              title="Vai trò trong quy trình phê duyệt công thức lương động (BF-10)"
            >
              Lõi Lương: {isFormulaChecker ? 'Thẩm định & Duyệt' : isFormulaMaker ? 'Maker (Soạn thảo)' : 'Chỉ xem'}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Summary KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Lương Tham Chiếu / Cơ Sở 2026</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <Scale size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(2340000)}</div>
          <div className="kpi-subtext">Căn cứ: <span className="font-medium text-slate-700">NĐ 73/2024 &amp; NĐ 158/2025</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Lương Tối Thiểu Vùng I (Sàn HĐLĐ)</span>
            <div className="kpi-icon-wrap" style={{ color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(5310000)}</div>
          <div className="kpi-subtext">Áp trần BHTN: <span className="tabular-nums font-semibold text-slate-800">106.200.000 ₫</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Mức Trần Đóng BHXH / BHYT</span>
            <div className="kpi-icon-wrap" style={{ color: '#b45309', backgroundColor: '#fffbeb' }}>
              <FileText size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#b45309' }}>{formatVND(46800000)}</div>
          <div className="kpi-subtext"><span className="tabular-nums font-semibold">20 lần</span> mức lương tham chiếu cơ sở</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Khoán Phụ Cấp Công Trường / Kỹ Sư</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <HardHat size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{formatVND(6500000)}</div>
          <div className="kpi-subtext">Lưu trú (3M) + Độc hại (1.5M) + TN (2M) — <strong className="text-emerald-700">Miễn BHXH</strong></div>
        </div>
      </div>

      {/* 3. 4-Tab Switcher Bar */}
      {/* 2-Tab Switcher Bar (FE-08) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('LAW_RULES')}
          className={`btn ${activeTab === 'LAW_RULES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 0.75rem', justifyContent: 'center', whiteSpace: 'nowrap' }}
        >
          <Scale size={15} />
          <span>1. Luật &amp; BHXH 2026</span>
          <span className="badge badge-info" style={{ marginLeft: '0.35rem' }}>{complianceRules.length}</span>
          <span className="badge badge-slate" style={{ marginLeft: '0.35rem', fontSize: '0.625rem' }}>HR</span>
        </button>

        <button
          onClick={() => setActiveTab('SALARY_SCALES')}
          className={`btn ${activeTab === 'SALARY_SCALES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 0.75rem', justifyContent: 'center', whiteSpace: 'nowrap' }}
        >
          <Layers size={15} />
          <span>2. Thang Bảng Lương</span>
          <span className="badge badge-slate" style={{ marginLeft: '0.35rem' }}>{salaryScales.length}</span>
          <span className="badge badge-slate" style={{ marginLeft: '0.35rem', fontSize: '0.625rem' }}>HR</span>
        </button>
      </div>
      {/* TAB 1: THAM SỐ LUẬT LAO ĐỘNG & BẢO HIỂM 2026 (FE-08 / UC-17) */}
      {/* ========================================================================= */}
      {activeTab === 'LAW_RULES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Analysis Cards */}
          <div className="grid-cols-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Cơ Cấu Trích Nộp Bảo Hiểm Bắt Buộc 34% (Năm 2026)</h2>
                <span className="badge badge-info">Luật BHXH 2024 &amp; NĐ 158/2025</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                    <span className="text-slate-700 font-semibold">Doanh Nghiệp Đóng (DN Chi Trả):</span>
                    <span className="tabular-nums font-bold text-amber-800" style={{ fontSize: '1rem' }}>23.50%</span>
                  </div>
                  <div style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • BHXH (Hưu trí &amp; Ốm đau): <strong className="text-slate-800">17.0%</strong> | BHYT: <strong className="text-slate-800">3.0%</strong> | BHTN: <strong className="text-slate-800">1.0%</strong> | TNLĐ-BNN đặc thù xây dựng: <strong className="text-emerald-700">0.5%</strong> (NĐ 158/2025) | Kinh phí Công đoàn: <strong className="text-slate-800">2.0%</strong> (NĐ 105/2026)
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem', marginTop: '0.35rem' }}>
                    <span className="text-slate-700 font-semibold">Người Lao Động Đóng (Trừ Lương):</span>
                    <span className="tabular-nums font-bold text-blue-700" style={{ fontSize: '1rem' }}>10.50%</span>
                  </div>
                  <div style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • BHXH: <strong className="text-slate-800">8.0%</strong> | BHYT: <strong className="text-slate-800">1.5%</strong> | BHTN: <strong className="text-slate-800">1.0%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Biểu Thuế TNCN &amp; Quy Tắc Tăng Ca OT Xây Dựng</h2>
                <span className="badge badge-success">Luật Thuế TNCN</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                    <span className="text-slate-700 font-semibold">Hệ Số Làm Thêm Giờ OT:</span>
                    <span className="badge badge-info font-mono">150% — 200% — 300%</span>
                  </div>
                  <div style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • Ngày thường: <strong className="text-slate-800">150%</strong> (Miễn thuế 50% phụ trội) | Cuối tuần: <strong className="text-slate-800">200%</strong> (Miễn thuế 100% phụ trội) | Ngày lễ/Tết: <strong className="text-slate-800">300%</strong> | Phụ trội ca đêm (22h - 06h): <strong className="text-amber-700">+30%</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem', marginTop: '0.35rem' }}>
                    <span className="text-slate-700 font-semibold">Biểu Thuế Lũy Tiến Từng Phần (7 Bậc):</span>
                    <span className="font-semibold text-slate-800">5% &rarr; 35%</span>
                  </div>
                  <div style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • Bậc 1 (&le;5M): 5% | Bậc 2 (5-10M): 10% | Bậc 3 (10-18M): 15% | Bậc 4 (18-32M): 20% | Bậc 5 (32-52M): 25% | Bậc 6 (52-80M): 30% | Bậc 7 (&gt;80M): 35%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Banner when user has read-only access to Legal Rules */}
          {!canManageLawRules && (
            <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={14} color="#64748b" />
              <span>Chế độ xem tham chiếu tham số pháp lý &amp; bảo hiểm. Quyền cấu hình và hiệu chỉnh thuộc về <strong>Trưởng Phòng Nhân Sự (HR Manager)</strong> &amp; Quản trị viên.</span>
            </div>
          )}

          {/* Category Filter & Stats Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', padding: '0.65rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bộ Lọc Phân Loại:</span>
              {(['ALL', 'INSURANCE', 'TAX', 'LABOR_LAW'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setRuleCategoryFilter(cat)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid',
                    cursor: 'pointer',
                    fontWeight: 500,
                    backgroundColor: ruleCategoryFilter === cat ? '#2563eb' : '#f8fafc',
                    color: ruleCategoryFilter === cat ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: ruleCategoryFilter === cat ? '#2563eb' : 'var(--border-subtle)',
                  }}
                >
                  {cat === 'ALL' ? 'Tất Cả (' + complianceRules.length + ')' :
                   cat === 'INSURANCE' ? 'Bảo Hiểm' :
                   cat === 'TAX' ? 'Thuế TNCN' : 'Luật Lao Động'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span className="text-slate-600">Đang áp dụng: <strong className="text-emerald-700">{complianceRules.filter(r => r.status !== 'PENDING').length}</strong></span>
              <span className="text-slate-600">Chờ hiệu lực: <strong className="text-amber-700">{complianceRules.filter(r => r.status === 'PENDING').length}</strong></span>
            </div>
          </div>

          {/* Table of Legal Rules */}
          <div className="table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '40px' }}>STT</th>
                  <th className="text-left">Tham Số / Bộ Luật</th>
                  <th className="text-left" style={{ width: '130px' }}>Nhóm</th>
                  <th className="text-right" style={{ width: '160px' }}>Giá Trị Áp Dụng</th>
                  <th className="text-center" style={{ width: '120px' }}>Trạng Thái</th>
                  <th className="text-left" style={{ width: '200px' }}>Căn Cứ Pháp Lý</th>
                  <th className="text-left">Ghi Chú Nghiệp Vụ HMCPS</th>
                  {canManageLawRules && <th className="text-center" style={{ width: '90px' }}>Thao Tác</th>}
                </tr>
              </thead>
              <tbody>
                {complianceRules
                  .filter(r => ruleCategoryFilter === 'ALL' || r.category === ruleCategoryFilter)
                  .map((rule, idx) => (
                  <tr key={rule.id}>
                    <td className="text-center font-mono text-xs text-slate-400">{idx + 1}</td>
                    <td className="text-left font-medium text-slate-900">
                      <div>{rule.ruleName}</div>
                      <span className="font-mono text-xs text-slate-400">{rule.ruleKey}</span>
                    </td>
                    <td className="text-left">
                      <span className={`badge ${
                        rule.category === 'INSURANCE' ? 'badge-info' :
                        rule.category === 'TAX' ? 'badge-success' : 'badge-slate'
                      }`}>
                        {rule.category === 'INSURANCE' ? 'Bảo Hiểm' : rule.category === 'TAX' ? 'Thuế TNCN' : 'Luật Lao Động'}
                      </span>
                    </td>
                    <td className="text-right tabular-nums font-semibold text-slate-900" style={{ fontSize: '0.875rem' }}>
                      {typeof rule.ruleValue === 'number' ? formatVND(rule.ruleValue) : rule.ruleValue}
                    </td>
                    <td className="text-center">
                      {canManageLawRules ? (
                        <button
                          onClick={() => handleToggleRuleStatus(rule.id)}
                          className={`badge ${rule.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}
                          style={{ cursor: 'pointer', border: 'none', fontSize: '0.6875rem' }}
                          title="Bấm để chuyển giữa Đang áp dụng và Chờ hiệu lực"
                        >
                          {rule.status === 'PENDING' ? 'Chờ Hiệu Lực' : 'Đang Áp Dụng'}
                        </button>
                      ) : (
                        <span
                          className={`badge ${rule.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}
                          style={{ cursor: 'default', fontSize: '0.6875rem' }}
                          title="Chỉ HR Manager & Admin mới có quyền bật/tắt hiệu lực"
                        >
                          {rule.status === 'PENDING' ? 'Chờ Hiệu Lực' : 'Đang Áp Dụng'}
                        </span>
                      )}
                    </td>
                    <td className="text-left">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {rule.legalReference}
                      </span>
                      {rule.effectiveDate && (
                        <div className="text-xs text-slate-400 mt-0.5">HL: {rule.effectiveDate}</div>
                      )}
                    </td>
                    <td className="text-left text-slate-600 text-xs">{rule.description}</td>
                    {canManageLawRules && (
                      <td className="text-center">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={() => setEditingRule({ ...rule })}
                            className="btn btn-sm btn-secondary"
                            title="Chỉnh sửa tham số này"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id, rule.ruleName)}
                            className="btn btn-sm btn-secondary"
                            style={{ color: '#dc2626', borderColor: '#fecaca' }}
                            title="Xóa bộ luật / tham số này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: THANG BẢNG LƯƠNG CHUẨN DOANH NGHIỆP (FE-08 / UC-18) */}
      {/* ========================================================================= */}
      {activeTab === 'SALARY_SCALES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Info Banner when user has read-only access to Salary Scales */}
          {!canManageSalaryScales && (
            <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={14} color="#64748b" />
              <span>Chế độ xem thang bảng lương ngạch bậc chuẩn (TK 642 vs TK 627). Quyền cấu hình thuộc về <strong>Trưởng Phòng Nhân Sự (HR Manager)</strong> &amp; Quản trị viên.</span>
            </div>
          )}

          {/* Note Banner */}
          <div className="alert-banner alert-banner-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Building2 size={18} color="#2563eb" />
              <div style={{ fontSize: '0.8125rem' }}>
                <strong>Quy tắc đóng BHXH theo ngạch bậc (Luật BHXH 2024 &amp; BLLĐ 2019):</strong>
                <div style={{ marginTop: '0.15rem', color: 'var(--text-body)' }}>
                  • <strong>Khối Văn Phòng (TK 642):</strong> Nền đóng BHXH = Lương cơ bản theo bậc + Phụ cấp chức vụ quản lý + Phụ cấp thâm niên (kẹp trần 46.8M).<br />
                  • <strong>Khối Kỹ Sư Hiện Trường (TK 627):</strong> Nền đóng BHXH = <em>Lương cơ bản theo bậc duy nhất!</em> Toàn bộ phụ cấp lưu trú công trường (3M), độc hại nguy hiểm (1.5M), phụ cấp trách nhiệm dự án (2M) được <strong>miễn 100% bảo hiểm</strong>.
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '100px' }}>Mã Ngạch</th>
                  <th className="text-left">Tên Ngạch &amp; Vị Trí Công Việc</th>
                  <th className="text-center" style={{ width: '130px' }}>Khối / Hạch Toán</th>
                  <th className="text-center" style={{ width: '90px' }}>Bậc Lương</th>
                  <th className="text-right" style={{ width: '150px' }}>Lương Cơ Bản</th>
                  <th className="text-center" style={{ width: '80px' }}>Hệ Số</th>
                  <th className="text-left">Nguyên Tắc Đóng BHXH</th>
                  {canManageSalaryScales && <th className="text-center" style={{ width: '80px' }}>Thao Tác</th>}
                </tr>
              </thead>
              <tbody>
                {salaryScales.map((scale) => (
                  <tr key={scale.id}>
                    <td className="text-left font-mono text-xs font-semibold text-slate-800">{scale.scaleCode}</td>
                    <td className="text-left">
                      <div className="font-medium text-slate-900">{scale.scaleName}</div>
                      <div className="text-xs text-slate-500">{scale.description}</div>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${scale.category === 'OFFICE' ? 'badge-primary' : 'badge-warning'}`}>
                        {scale.category === 'OFFICE' ? 'Văn Phòng (TK 642)' : 'Công Trường (TK 627)'}
                      </span>
                    </td>
                    <td className="text-center font-medium text-slate-800">{scale.levelName}</td>
                    <td className="text-right tabular-nums font-bold text-slate-900" style={{ fontSize: '0.875rem' }}>
                      {formatVND(scale.baseSalary)}
                    </td>
                    <td className="text-center tabular-nums font-mono text-slate-700">{scale.coefficient.toFixed(2)}</td>
                    <td className="text-left text-xs">
                      <span className={scale.category === 'OFFICE' ? 'text-blue-700 font-medium' : 'text-emerald-700 font-medium'}>
                        {scale.insuranceRule}
                      </span>
                    </td>
                    {canManageSalaryScales && (
                      <td className="text-center">
                        <button
                          onClick={() => setEditingScale({ ...scale })}
                          className="btn btn-sm btn-secondary"
                          title="Chỉnh sửa bậc lương này"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA THAM SỐ PHÁP LÝ (FE-08 / UC-17) */}
      {/* ========================================================================= */}
      {editingRule && (
        <div className="modal-backdrop" onClick={() => setEditingRule(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Chỉnh Sửa Tham Số Pháp Lý
                </h3>
                <span className="text-xs text-slate-500 font-mono">{editingRule.ruleKey}</span>
              </div>
              <button onClick={() => setEditingRule(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Tên Tham Số / Chỉ Số Pháp Lý:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingRule.ruleName}
                    onChange={(e) => setEditingRule({ ...editingRule, ruleName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Giá Trị Cấu Hình Mới ({editingRule.unit}):</label>
                  <input
                    type={typeof editingRule.ruleValue === 'number' ? 'number' : 'text'}
                    className="form-input"
                    value={editingRule.ruleValue}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      ruleValue: typeof editingRule.ruleValue === 'number' ? Number(e.target.value) : e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="form-label">Căn Cứ Văn Bản Pháp Lý (Nghị định / Luật):</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingRule.legalReference}
                    onChange={(e) => setEditingRule({ ...editingRule, legalReference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Ngày Hiệu Lực Áp Dụng:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingRule.effectiveDate}
                    onChange={(e) => setEditingRule({ ...editingRule, effectiveDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Diễn Giải Nghiệp Vụ HMCPS:</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={editingRule.description}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingRule(null)} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button onClick={handleSaveRule} className="btn btn-primary">
                <Check size={15} />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA BẬC LƯƠNG THANG BẢNG LƯƠNG (FE-08 / UC-18) */}
      {/* ========================================================================= */}
      {editingScale && (
        <div className="modal-backdrop" onClick={() => setEditingScale(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Chỉnh Sửa Thang Bảng Lương
                </h3>
                <span className="text-xs text-slate-500 font-mono">{editingScale.scaleCode}</span>
              </div>
              <button onClick={() => setEditingScale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Tên Ngạch Bậc Lương:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingScale.scaleName}
                    onChange={(e) => setEditingScale({ ...editingScale, scaleName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Cấp Bậc Lương:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingScale.levelName}
                    onChange={(e) => setEditingScale({ ...editingScale, levelName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Mức Lương Cơ Bản (VNĐ):</label>
                  <input
                    type="number"
                    step="500000"
                    className="form-input"
                    value={editingScale.baseSalary}
                    onChange={(e) => setEditingScale({ ...editingScale, baseSalary: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="form-label">Hệ Số Lương:</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input"
                    value={editingScale.coefficient}
                    onChange={(e) => setEditingScale({ ...editingScale, coefficient: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="form-label">Tài Khoản Kế Toán Mặc Định:</label>
                  <select
                    className="form-select"
                    value={editingScale.accountCode}
                    onChange={(e) => setEditingScale({ ...editingScale, accountCode: e.target.value as any })}
                  >
                    <option value="TK_642">TK 642 — Chi phí quản lý doanh nghiệp (Văn phòng)</option>
                    <option value="TK_627">TK 627 — Chi phí sản xuất chung (Công trường)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingScale(null)} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button onClick={handleSaveScale} className="btn btn-primary">
                <Check size={15} />
                <span>Cập Nhật Bậc Lương</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM BỘ LUẬT / THAM SỐ PHÁP LÝ MỚI (BF-10: BƯỚC 1 -> HÌNH THỨC ÁP DỤNG) */}
      {/* ========================================================================= */}
      {showAddRuleModal && (
        <div className="modal-backdrop" onClick={() => setShowAddRuleModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Thêm Tham Số / Bộ Luật Áp Dụng Vào Tính Lương
                </h3>
                <span className="text-xs text-slate-500">
                  Bước 1 (Workflow BF-10) — Thiết lập quy chuẩn pháp lý hoặc quy chế doanh nghiệp
                </span>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Mã Tham Số (Quy Chuẩn):</label>
                    <input
                      type="text"
                      className="form-input font-mono uppercase"
                      placeholder="VD: LUAT_BHXH_2026_MUC_TRAN"
                      value={newRuleForm.ruleKey}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, ruleKey: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Phân Loại Bộ Luật:</label>
                    <select
                      className="form-select"
                      value={newRuleForm.category}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, category: e.target.value as any })}
                    >
                      <option value="INSURANCE">Bảo Hiểm Xã Hội / Y Tế / BHTN</option>
                      <option value="TAX">Thuế TNCN &amp; Giảm Trừ Gia Cảnh</option>
                      <option value="LABOR_LAW">Bộ Luật Lao Động &amp; Mức Lương Tối Thiểu</option>
                      <option value="OTHER">Quy Chế Nội Bộ Doanh Nghiệp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Tên Quy Chuẩn / Bộ Luật:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Mức lương tối thiểu Vùng I năm 2026"
                    value={newRuleForm.ruleName}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, ruleName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Giá Trị Tham Số:</label>
                    <input
                      type="text"
                      className="form-input font-bold"
                      placeholder="VD: 5310000 hoặc 8.0"
                      value={newRuleForm.ruleValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = Number(val);
                        setNewRuleForm({ ...newRuleForm, ruleValue: isNaN(num) || val === '' ? val : num });
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label">Đơn Vị Tính:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: VNĐ/tháng hoặc %"
                      value={newRuleForm.unit}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, unit: e.target.value })}
                    />
                  </div>
                </div>

                {/* Decision Diamond in BF-10: Hình thức áp dụng phiên bản? (Áp dụng ngay vs Hẹn giờ) */}
                <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <label className="form-label" style={{ color: '#166534', fontWeight: 600 }}>
                    Hình Thức Áp Dụng Phiên Bản (Workflow BF-10):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <select
                        className="form-select"
                        value={newRuleForm.status}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, status: e.target.value as any })}
                      >
                        <option value="ACTIVE">Áp dụng ngay lập tức (Status: Active)</option>
                        <option value="PENDING">Hẹn giờ kích hoạt (Status: Pending)</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="date"
                        className="form-input"
                        value={newRuleForm.effectiveDate}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, effectiveDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#15803d', marginTop: '0.35rem' }}>
                    {newRuleForm.status === 'ACTIVE'
                      ? 'Yêu cầu kích hoạt phiên bản mới ngay lập tức vào kỳ tính lương hiện hành.'
                      : 'Lưu trạng thái Chờ (Pending) và hệ thống sẽ tự động kích hoạt khi đến ngày hiệu lực.'}
                  </div>
                </div>

                <div>
                  <label className="form-label">Căn Cứ Pháp Lý &amp; Văn Bản Ban Hành:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Nghị định 158/2025/NĐ-CP hoặc Luật BHXH 2024"
                    value={newRuleForm.legalReference}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, legalReference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Mô Tả Chi Tiết Quy Tắc Tính:</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Ghi chú nghiệp vụ áp dụng cho khối Văn phòng hoặc Công trường..."
                    value={newRuleForm.description}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowAddRuleModal(false)} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button onClick={handleCreateRule} className="btn btn-primary">
                <Check size={15} />
                <span>Thêm Bộ Luật / Tham Số</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};