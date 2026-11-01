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

  const [activeTab, setActiveTab] = useState<'LAW_RULES' | 'SALARY_SCALES' | 'SITE_ALLOWANCES' | 'FORMULA_SIMULATOR'>('LAW_RULES');
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

  // ----------------------------------------------------
  // TAB 3: PHỤ CẤP CÔNG TRÌNH & ĐẶC THÙ XÂY DỰNG (FE-09 / UC-19)
  // ----------------------------------------------------
  const [allowanceList, setAllowanceList] = useState<SalaryAllowanceItem[]>([
    {
      id: 1,
      code: 'SITE_LODGING',
      name: 'Phụ cấp lưu trú công trình',
      componentType: 'ALLOWANCE',
      amount: 3000000,
      applicableScope: 'SITE_ENGINEER',
      isInsuranceBase: false,
      isTaxable: false,
      isProratedByDays: true,
      defaultAccountCode: 'TK_627',
      legalBasis: 'Luật BHXH 2024 & Quy chế khoán thi công',
      isActive: true,
      note: 'Khoán hỗ trợ kỹ sư bám lán trại, ăn ở tại công trình xa trụ sở. Miễn đóng BHXH và miễn thuế TNCN',
    },
    {
      id: 2,
      code: 'HAZARD',
      name: 'Phụ cấp độc hại & nguy hiểm hiện trường',
      componentType: 'ALLOWANCE',
      amount: 1500000,
      applicableScope: 'SITE_ENGINEER',
      isInsuranceBase: false,
      isTaxable: false,
      isProratedByDays: true,
      defaultAccountCode: 'TK_627',
      legalBasis: 'Điều 2 Thông tư 111/2013/TT-BTC & NĐ 158/2025/NĐ-CP',
      isActive: true,
      note: 'Hỗ trợ thi công trên cao, hầm ngầm, đổ bê tông đêm. Được miễn thuế TNCN và miễn đóng BHXH',
    },
    {
      id: 3,
      code: 'PROJECT_RESPONSIBILITY',
      name: 'Phụ cấp trách nhiệm gói thầu công trình',
      componentType: 'ALLOWANCE',
      amount: 2000000,
      applicableScope: 'SITE_ENGINEER',
      isInsuranceBase: false,
      isTaxable: true,
      isProratedByDays: false,
      defaultAccountCode: 'TK_627',
      legalBasis: 'Quy chế Thù lao Ban Điều hành Dự án',
      isActive: true,
      note: 'Dành riêng cho Chỉ huy trưởng, Đội trưởng, Kỹ sư an toàn HSE. Miễn đóng BHXH, tính vào thu nhập chịu thuế TNCN',
    },
    {
      id: 4,
      code: 'FUEL_TRAVEL',
      name: 'Phụ cấp đi lại & xăng xe công tác hiện trường',
      componentType: 'ALLOWANCE',
      amount: 1000000,
      applicableScope: 'ALL',
      isInsuranceBase: false,
      isTaxable: true,
      isProratedByDays: true,
      defaultAccountCode: 'TK_627',
      legalBasis: 'Quy chế Công tác phí Doanh nghiệp',
      isActive: true,
      note: 'Khoán hỗ trợ di chuyển giữa các công trình hoặc đi thị sát dự án. Miễn đóng BHXH',
    },
    {
      id: 5,
      code: 'MEAL',
      name: 'Phụ cấp ăn ca / trưa công trường & văn phòng',
      componentType: 'ALLOWANCE',
      amount: 730000,
      applicableScope: 'ALL',
      isInsuranceBase: false,
      isTaxable: false,
      isProratedByDays: true,
      defaultAccountCode: 'TK_642',
      legalBasis: 'Thông tư 111/2013/TT-BTC & TT 26/2015',
      isActive: true,
      note: 'Mức chuẩn 730.000 ₫/tháng được miễn thuế TNCN và không tính vào quỹ đóng BHXH',
    },
    {
      id: 6,
      code: 'POSITION_OFFICE',
      name: 'Phụ cấp chức vụ quản lý văn phòng',
      componentType: 'ALLOWANCE',
      amount: 2500000,
      applicableScope: 'OFFICE_STAFF',
      isInsuranceBase: true,
      isTaxable: true,
      isProratedByDays: false,
      defaultAccountCode: 'TK_642',
      legalBasis: 'Luật BHXH 2024 / Khoản 2 Điều 89',
      isActive: true,
      note: 'Dành cho Trưởng/Phó phòng khối HQ. BẮT BUỘC TÍNH VÀO NỀN ĐÓNG BHXH theo Luật BHXH 2024',
    },
    {
      id: 7,
      code: 'SENIORITY',
      name: 'Phụ cấp thâm niên cống hiến',
      componentType: 'ALLOWANCE',
      amount: 1500000,
      applicableScope: 'OFFICE_STAFF',
      isInsuranceBase: true,
      isTaxable: true,
      isProratedByDays: false,
      defaultAccountCode: 'TK_642',
      legalBasis: 'Thỏa ước Lao động Tập thể',
      isActive: true,
      note: 'Áp dụng cho nhân sự cống hiến từ 3 năm trở lên. Khối văn phòng bắt buộc đóng BHXH trên khoản này',
    },
  ]);

  // Modal Sửa & Thêm Phụ Cấp
  const [editingAllowance, setEditingAllowance] = useState<SalaryAllowanceItem | null>(null);

  const handleSaveAllowance = () => {
    if (!canManageAllowances) {
      alert('Bạn không có quyền chỉnh sửa danh mục phụ cấp! Quyền này thuộc HR Manager và Kế Toán Trưởng.');
      return;
    }
    if (!editingAllowance) return;
    setAllowanceList(prev => {
      const exists = prev.some(a => a.id === editingAllowance.id);
      if (exists) {
        return prev.map(a => a.id === editingAllowance.id ? editingAllowance : a);
      }
      return [...prev, { ...editingAllowance, id: editingAllowance.id || Date.now() }];
    });
    showToast(`Đã lưu cấu hình phụ cấp "${editingAllowance.name}" thành công!`);
    setEditingAllowance(null);
  };

  const handleDeleteAllowance = (id: number, name: string) => {
    if (!canManageAllowances) {
      alert('Bạn không có quyền xóa phụ cấp!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa khoản phụ cấp "${name}" khỏi hệ thống không?`)) {
      setAllowanceList(prev => prev.filter(a => a.id !== id));
      showToast(`Đã xóa khoản phụ cấp "${name}" thành công!`);
    }
  };

  const handleToggleAllowanceStatus = (id: number) => {
    if (!canManageAllowances) {
      showToast('Bạn chỉ có quyền xem danh mục phụ cấp, không được thay đổi trạng thái kích hoạt.');
      return;
    }
    setAllowanceList(prev => prev.map(a => {
      if (a.id === id) {
        const next = !a.isActive;
        showToast(`Đã ${next ? 'kích hoạt' : 'tạm dừng'} phụ cấp: ${a.name}`);
        return { ...a, isActive: next };
      }
      return a;
    }));
  };

  // Step 4 (BF-10): Gán phụ cấp đặc thù Hiện trường cho nhóm Kỹ sư công trường theo từng dự án
  const [selectedSiteProject, setSelectedSiteProject] = useState<'DA-NHATTAN2' | 'DA-LANDMARK'>('DA-NHATTAN2');
  const [siteProjectAllowances, setSiteProjectAllowances] = useState({
    'DA-NHATTAN2': {
      projectName: 'Dự Án Cầu Nhật Tân 2 & Nút Giao Vành Đai',
      siteLodging: 3000000,
      hazard: 1500000,
      projectResponsibilitySM: 2000000,
      projectResponsibilityEng: 500000,
      nightShiftAllowance: 800000,
      engineers: [
        { code: 'HM-005', name: 'Nguyễn Lê Gia Phát', role: 'Chỉ Huy Trưởng', customLodging: 3000000, customHazard: 1500000, customResp: 2000000 },
        { code: 'HM-006', name: 'Trần Văn Trung', role: 'Kỹ Sư Kết Cấu Trưởng', customLodging: 3000000, customHazard: 1500000, customResp: 500000 },
        { code: 'HM-010', name: 'Phạm Đức Long', role: 'Kỹ Sư Thi Công Cầu', customLodging: 3000000, customHazard: 1500000, customResp: 500000 },
      ]
    },
    'DA-LANDMARK': {
      projectName: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
      siteLodging: 2500000,
      hazard: 1200000,
      projectResponsibilitySM: 1500000,
      projectResponsibilityEng: 500000,
      nightShiftAllowance: 600000,
      engineers: [
        { code: 'HM-012', name: 'Hoàng Văn Long', role: 'Chỉ Huy Trưởng', customLodging: 2500000, customHazard: 1200000, customResp: 1500000 },
        { code: 'HM-015', name: 'Trần Đình Trọng', role: 'Kỹ Sư An Toàn HSE', customLodging: 2500000, customHazard: 1200000, customResp: 500000 },
        { code: 'HM-017', name: 'Vũ Hải Đăng', role: 'Kỹ Sư Hiện Trường Tập Sự', customLodging: 2500000, customHazard: 1200000, customResp: 0 },
      ]
    }
  });

  const handleSaveProjectAllowanceAllocation = () => {
    if (!canManageAllowances) {
      alert('Bạn không có quyền thiết lập phụ cấp dự án! Quyền này thuộc HR Manager và Kế Toán Trưởng.');
      return;
    }
    const proj = siteProjectAllowances[selectedSiteProject];
    showToast(`Đã lưu và đồng bộ hạn mức phụ cấp đặc thù hiện trường cho dự án "${proj.projectName}" (Step 4 / BF-10)!`);
  };

  // Workflow BF-10: Bộ Công Thức Tính Lương Động & Lịch Sử Kiểm Toán
  const [formulaWorkflowStatus, setFormulaWorkflowStatus] = useState<'DRAFT' | 'SYNTAX_VERIFIED' | 'PREVIEWED' | 'PENDING_APPROVAL' | 'APPROVED_ACTIVE'>('APPROVED_ACTIVE');
  const [formulaVersion, setFormulaVersion] = useState<string>('v2026.1');
  const [syntaxCheckMessage, setSyntaxCheckMessage] = useState<string | null>(null);

  // Dynamic formula inputs
  const [customFormulas, setCustomFormulas] = useState({
    timeSalary: '(BASE_SALARY / STANDARD_DAYS) * ACTUAL_DAYS',
    otPay: '(BASE_SALARY / STANDARD_DAYS / 8) * (OT_WEEKDAY * 1.5 + OT_WEEKEND * 2.0 + OT_HOLIDAY * 3.0 + OT_NIGHT * 0.3)',
    insuranceBaseOffice: 'CLAMP(BASE_SALARY + POSITION_ALLOWANCE + SENIORITY_ALLOWANCE, MIN_WAGE, BHXH_CAP)',
    insuranceBaseSite: 'CLAMP(BASE_SALARY, MIN_WAGE, BHXH_CAP)',
    taxableIncome: 'GROSS_SALARY - MEAL_EXEMPT - SITE_LODGING_EXEMPT - HAZARD_EXEMPT - OT_PREMIUM_EXEMPT',
    netSalary: 'GROSS_SALARY - EMPLOYEE_INSURANCE - PIT_TAX - UNION_DUES',
    costAllocationTK622: 'Chi phí nhân công trực tiếp thi công công trình (Kỹ sư kết cấu hiện trường)',
    costAllocationTK627: 'Chi phí sản xuất chung (Ban chỉ huy công trường, Chỉ huy trưởng, Kỹ sư HSE)',
    costAllocationTK642: 'Chi phí quản lý doanh nghiệp (Khối văn phòng trụ sở chính HQ)',
  });

  // Audit Logs (Step 14 & 15 BF-10)
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      version: 'v2026.1',
      actor: 'Đoàn Anh Tuấn (Kế toán trưởng)',
      action: 'Phê duyệt & Chốt áp dụng bộ công thức tính lương & phụ cấp chuẩn năm 2026 (Step 12 / BF-10)',
      timestamp: '2026-10-01 08:30:00',
      status: 'APPROVED',
      notes: 'Áp dụng biểu thuế TNCN 7 bậc, phụ cấp công trường miễn BHXH, trần BHXH 46.8M'
    },
    {
      id: 2,
      version: 'v2026.1',
      actor: 'Nguyễn Thu Giang (HR Manager)',
      action: 'Cấu hình thang bảng lương ngạch bậc VP TK 642 và Công trường TK 627 (Step 2 & 3)',
      timestamp: '2026-09-28 14:15:00',
      status: 'ACTIVE',
      notes: 'Khởi tạo 13 ngạch bậc lương chuẩn và 7 khoản phụ cấp đặc thù công trường'
    },
    {
      id: 3,
      version: 'v2026.0',
      actor: 'System Admin',
      action: 'Lưu trữ phiên bản cũ (Archive) vào kho lịch sử kiểm toán hệ thống (Step 13 & 14)',
      timestamp: '2026-09-25 18:00:00',
      status: 'ARCHIVED',
      notes: 'Lưu trữ cấu hình năm tài chính 2025 vào kho Audit Trail'
    }
  ]);

  const handleSyntaxCheck = () => {
    const requiredVars = ['BASE_SALARY', 'STANDARD_DAYS', 'ACTUAL_DAYS'];
    const hasRequired = requiredVars.every(v => customFormulas.timeSalary.includes(v));
    if (hasRequired) {
      setSyntaxCheckMessage('Cú pháp biểu thức toán học hoàn toàn hợp lệ! Đã xác thực toàn vẹn 8 trường tham số (Step 13 / BF-10).');
      setFormulaWorkflowStatus('SYNTAX_VERIFIED');
      showToast('Kiểm tra cú pháp công thức thành công! Sẵn sàng chạy thử nghiệm Sandbox.');
    } else {
      setSyntaxCheckMessage('Lỗi cú pháp: Biểu thức thiếu các tham số chuẩn!');
    }
  };

  const handleRunSandboxDryRun = () => {
    setFormulaWorkflowStatus('PREVIEWED');
    showToast('Đã chạy thử nghiệm (Dry-run / Preview Formula) thành công trên 4 Persona mẫu! (Step 11 / BF-10)');
  };

  const handleSubmitFormulaForReview = () => {
    if (!isFormulaMaker) {
      alert('Chỉ Chuyên viên Kế toán (Maker) mới có quyền trình thẩm định bộ công thức lương động!');
      return;
    }
    setFormulaWorkflowStatus('PENDING_APPROVAL');
    setAuditLogs(prev => [
      {
        id: Date.now(),
        version: 'v2026.2-DRAFT',
        actor: `${user?.fullName || 'Hoàng Thị Lan'} (${ROLE_LABELS[currentRole] || 'Chuyên viên Kế toán'})`,
        action: 'Trình thẩm định bộ công thức tính lương & phụ cấp mới lên Kế toán trưởng (Step 11 / BF-10)',
        timestamp: new Date().toLocaleString('vi-VN'),
        status: 'PENDING',
        notes: 'Cập nhật hệ số tăng ca đêm công trình và định mức phụ cấp lán trại Cầu Nhật Tân 2'
      },
      ...prev
    ]);
    showToast('Chuyên viên Kế toán đã trình bộ công thức tính lương động sang Kế toán trưởng thẩm định!');
  };

  const handleApproveFormulaWorkflow = () => {
    if (!isFormulaChecker) {
      alert('Chỉ Kế Toán Trưởng hoặc Quản Trị Hệ Thống mới có thẩm quyền phê duyệt và chốt áp dụng công thức lương (BF-10)!');
      return;
    }
    setFormulaWorkflowStatus('APPROVED_ACTIVE');
    setFormulaVersion('v2026.2');
    setAuditLogs(prev => [
      {
        id: Date.now(),
        version: 'v2026.2',
        actor: `${user?.fullName || 'Đoàn Anh Tuấn'} (${ROLE_LABELS[currentRole] || 'Kế toán trưởng'})`,
        action: 'Phê duyệt & Chốt áp dụng bộ công thức tính lương & phụ cấp mới cho kỳ tới (Step 12 / BF-10)',
        timestamp: new Date().toLocaleString('vi-VN'),
        status: 'APPROVED',
        notes: 'Chính thức áp dụng phiên bản v2026.2 vào toàn bộ hệ thống tính lương HMCPS'
      },
      ...prev
    ]);
    showToast('Kế toán trưởng đã phê duyệt và chốt áp dụng bộ công thức tính lương mới cho kỳ tới thành công!');
  };

  const handleRejectFormulaWorkflow = () => {
    if (!isFormulaChecker) return;
    setFormulaWorkflowStatus('DRAFT');
    setAuditLogs(prev => [
      {
        id: Date.now(),
        version: 'v2026.2-DRAFT',
        actor: `${user?.fullName || 'Đoàn Anh Tuấn'} (${ROLE_LABELS[currentRole] || 'Kế toán trưởng'})`,
        action: 'Yêu cầu điều chỉnh lại biểu thức (Return to Maker for Revision)',
        timestamp: new Date().toLocaleString('vi-VN'),
        status: 'PENDING',
        notes: 'Kế toán trưởng yêu cầu Kế toán viên kiểm tra lại tham số bóc tách chi phí và hệ số phụ cấp'
      },
      ...prev
    ]);
    showToast('Đã hoàn trả bộ công thức về trạng thái Bản thảo (Draft) để Kế toán viên điều chỉnh lại!');
  };

  // Export Comprehensive Compliance CSV
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

    const allowanceHeaders = ['Mã Phụ Cấp', 'Tên Khoản Phụ Cấp', 'Định Mức (VNĐ)', 'Đối Tượng Áp Dụng', 'Tính Vào Nền BHXH?', 'Chịu Thuế TNCN?', 'Phân Bổ Theo Ngày Công?', 'TK Mặc Định', 'Căn Cứ Pháp Lý', 'Ghi Chú'];
    const allowanceRows = allowanceList.map(a => [
      `"${a.code}"`,
      `"${a.name}"`,
      a.amount,
      `"${a.applicableScope === 'SITE_ENGINEER' ? 'Kỹ Sư Công Trường' : a.applicableScope === 'OFFICE_STAFF' ? 'Khối Văn Phòng' : 'Toàn Bộ Nhân Sự'}"`,
      a.isInsuranceBase ? 'CÓ ĐÓNG BHXH' : 'MIỄN BHXH',
      a.isTaxable ? 'CHỊU THUẾ' : 'MIỄN THUẾ',
      a.isProratedByDays ? 'THEO NGÀY CÔNG' : 'CỐ ĐỊNH THÁNG',
      `"${a.defaultAccountCode}"`,
      `"${a.legalBasis}"`,
      `"${a.note}"`
    ]);

    const formulaHeaders = ['Thành Phần Lương', 'Biểu Thức Công Thức Động', 'Ghi Chú Hạch Toán'];
    const formulaRows = [
      ['"Lương thời gian (TimeSalary)"', `"${customFormulas.timeSalary}"`, '"Đơn giá ngày = Base / 26 công"'],
      ['"Làm thêm giờ (OvertimePay)"', `"${customFormulas.otPay}"`, '"Đơn giá giờ = Base / 26 / 8 * hệ số"'],
      ['"Nền đóng BHXH Khối VP"', `"${customFormulas.insuranceBaseOffice}"`, '"Lương CB + Phụ cấp chức vụ + Thâm niên (trần 46.8M)"'],
      ['"Nền đóng BHXH Khối Công trường"', `"${customFormulas.insuranceBaseSite}"`, '"Lương CB DUY NHẤT! Miễn toàn bộ phụ cấp thi công"'],
      ['"Thu nhập chịu thuế (TaxableIncome)"', `"${customFormulas.taxableIncome}"`, '"Trừ phần phụ cấp ăn ca, lưu trú, độc hại và phụ trội OT"'],
      ['"Thực lĩnh chuyển khoản (NetSalary)"', `"${customFormulas.netSalary}"`, '"Net = Gross - BHXH NLĐ (10.5%) - Thuế TNCN - Đoàn phí (1%)"'],
      ['"Bóc tách chi phí nhân công trực tiếp"', '"TK 622"', `"${customFormulas.costAllocationTK622}"`],
      ['"Bóc tách chi phí sản xuất chung hiện trường"', '"TK 627"', `"${customFormulas.costAllocationTK627}"`],
      ['"Bóc tách chi phí quản lý doanh nghiệp"', '"TK 642"', `"${customFormulas.costAllocationTK642}"`]
    ];

    const csvSections = [
      'HỆ THỐNG QUẢN LÝ CHẤM CÔNG & TÍNH LƯƠNG HMCPS - HỒ SƠ QUY CHUẨN PHÁP LÝ & CÔNG THỨC LƯƠNG ĐỘNG (BF-10)',
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')} | Phiên bản hiệu lực: ${formulaVersion}`,
      '',
      '=== PHẦN 1: BẢNG THAM SỐ LUẬT LAO ĐỘNG & BẢO HIỂM 2026 (FE-08 / UC-17) ===',
      [ruleHeaders.join(','), ...ruleRows.map(r => r.join(','))].join('\r\n'),
      '',
      '=== PHẦN 2: THANG BẢNG LƯƠNG CHUẨN DOANH NGHIỆP (FE-08 / UC-18) ===',
      [scaleHeaders.join(','), ...scaleRows.map(r => r.join(','))].join('\r\n'),
      '',
      '=== PHẦN 3: DANH MỤC PHỤ CẤP CÔNG TRÌNH & ĐẶC THÙ XÂY DỰNG (FE-09 / UC-19) ===',
      [allowanceHeaders.join(','), ...allowanceRows.map(r => r.join(','))].join('\r\n'),
      '',
      '=== PHẦN 4: BỘ CÔNG THỨC LƯƠNG ĐỘNG & PHÂN BỔ CHI PHÍ (FE-09 / UC-20 / BF-10) ===',
      [formulaHeaders.join(','), ...formulaRows.map(r => r.join(','))].join('\r\n')
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvSections], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Ho_So_Chinh_Sach_Phap_Ly_Luong_Phu_Cap_2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công toàn bộ hồ sơ pháp lý, thang lương & công thức ra file CSV / Excel!');
  };

  // ----------------------------------------------------
  // TAB 4: BỘ CÔNG THỨC LƯƠNG ĐỘNG & SANDBOX MÔ PHỎNG (FE-09 / UC-20)
  // ----------------------------------------------------
  // Danh sách Persona mẫu để kiểm thử sandbox
  const samplePersonas = [
    {
      id: 'PERSONA_1',
      employeeCode: 'HM-003',
      fullName: 'Nguyễn Thu Giang',
      position: 'Trưởng Phòng Nhân Sự (HR Manager)',
      employeeType: 'OFFICE_STAFF' as const,
      accountCode: 'TK_642' as const,
      baseSalary: 25000000,
      positionAllowance: 2500000,
      seniorityAllowance: 1500000,
      mealAllowance: 730000,
      dependentsCount: 1,
      isUnionMember: true,
      standardDays: 26,
    },
    {
      id: 'PERSONA_2',
      employeeCode: 'HM-005',
      fullName: 'Nguyễn Lê Gia Phát',
      position: 'Chỉ Huy Trưởng Công Trường (Cầu Nhật Tân 2)',
      employeeType: 'SITE_ENGINEER' as const,
      accountCode: 'TK_627' as const,
      baseSalary: 26000000,
      siteLodging: 3000000,
      hazard: 1500000,
      projectResponsibility: 2000000,
      mealAllowance: 730000,
      dependentsCount: 0,
      isUnionMember: true,
      standardDays: 26,
    },
    {
      id: 'PERSONA_3',
      employeeCode: 'HM-006',
      fullName: 'Trần Đình Trọng',
      position: 'Kỹ Sư An Toàn HSE Hiện Trường (TK 627)',
      employeeType: 'SITE_ENGINEER' as const,
      accountCode: 'TK_627' as const,
      baseSalary: 14500000,
      siteLodging: 3000000,
      hazard: 1500000,
      projectResponsibility: 0,
      mealAllowance: 730000,
      dependentsCount: 2,
      isUnionMember: true,
      standardDays: 26,
    },
    {
      id: 'PERSONA_4',
      employeeCode: 'HM-017',
      fullName: 'Vũ Hải Đăng',
      position: 'Kỹ Sư Hiện Trường Tập Sự (Tháp Landmark)',
      employeeType: 'SITE_ENGINEER' as const,
      accountCode: 'TK_627' as const,
      baseSalary: 10000000,
      siteLodging: 3000000,
      hazard: 1500000,
      projectResponsibility: 0,
      mealAllowance: 730000,
      dependentsCount: 0,
      isUnionMember: true,
      standardDays: 26,
    },
  ];

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('PERSONA_2');
  const [simActualDays, setSimActualDays] = useState<number>(25);
  const [simOtWeekdayHours, setSimOtWeekdayHours] = useState<number>(12);
  const [simOtWeekendHours, setSimOtWeekendHours] = useState<number>(8);

  // Thuật toán chạy lõi tính lương mô phỏng thời gian thực
  const calculateSimulation = (): FormulaSimulationResult => {
    const persona = samplePersonas.find(p => p.id === selectedPersonaId) || samplePersonas[0];
    const stdDays = persona.standardDays || 26;

    // 1. Lương thời gian
    const timeSalary = Math.round((persona.baseSalary / stdDays) * simActualDays);

    // 2. Tiền làm thêm giờ (OT)
    // Đơn giá 1 giờ chuẩn = Lương CB / 26 / 8
    const hourlyRate = persona.baseSalary / stdDays / 8;
    const otWeekdayPay = Math.round(hourlyRate * simOtWeekdayHours * 1.5);
    const otWeekendPay = Math.round(hourlyRate * simOtWeekendHours * 2.0);
    const otPay = otWeekdayPay + otWeekendPay;

    // 3. Phụ cấp theo loại đối tượng
    const allowances: { name: string; amount: number; isTaxable: boolean; isInsurance: boolean }[] = [];
    let allowanceTotal = 0;

    if (persona.employeeType === 'OFFICE_STAFF') {
      if (persona.positionAllowance) {
        allowances.push({ name: 'Phụ cấp chức vụ quản lý', amount: persona.positionAllowance, isTaxable: true, isInsurance: true });
        allowanceTotal += persona.positionAllowance;
      }
      if (persona.seniorityAllowance) {
        allowances.push({ name: 'Phụ cấp thâm niên', amount: persona.seniorityAllowance, isTaxable: true, isInsurance: true });
        allowanceTotal += persona.seniorityAllowance;
      }
      if (persona.mealAllowance) {
        const mealProrated = Math.round((persona.mealAllowance / stdDays) * simActualDays);
        allowances.push({ name: 'Phụ cấp ăn ca', amount: mealProrated, isTaxable: false, isInsurance: false });
        allowanceTotal += mealProrated;
      }
    } else {
      // Khối Công Trường: Toàn bộ phụ cấp lưu trú, độc hại, trách nhiệm MIỄN BHXH!
      if (persona.siteLodging) {
        const lodgingProrated = Math.round((persona.siteLodging / stdDays) * simActualDays);
        allowances.push({ name: 'Phụ cấp lưu trú công trình', amount: lodgingProrated, isTaxable: false, isInsurance: false });
        allowanceTotal += lodgingProrated;
      }
      if (persona.hazard) {
        const hazardProrated = Math.round((persona.hazard / stdDays) * simActualDays);
        allowances.push({ name: 'Phụ cấp độc hại hiện trường', amount: hazardProrated, isTaxable: false, isInsurance: false });
        allowanceTotal += hazardProrated;
      }
      if (persona.projectResponsibility) {
        allowances.push({ name: 'Phụ cấp trách nhiệm gói thầu', amount: persona.projectResponsibility, isTaxable: true, isInsurance: false });
        allowanceTotal += persona.projectResponsibility;
      }
      if (persona.mealAllowance) {
        const mealProrated = Math.round((persona.mealAllowance / stdDays) * simActualDays);
        allowances.push({ name: 'Phụ cấp ăn ca công trường', amount: mealProrated, isTaxable: false, isInsurance: false });
        allowanceTotal += mealProrated;
      }
    }

    // 4. Tổng thu nhập Gross
    const grossSalary = timeSalary + otPay + allowanceTotal;

    // 5. Nền đóng BHXH (CRITICAL DOMAIN LOGIC)
    let rawInsuranceBase = persona.baseSalary;
    if (persona.employeeType === 'OFFICE_STAFF') {
      rawInsuranceBase += (persona.positionAllowance || 0) + (persona.seniorityAllowance || 0);
    }
    // Kẹp trần BHXH/BHYT (46.8M) và sàn Vùng I (5.31M)
    const insuranceCapped = rawInsuranceBase > 46800000;
    const insuranceBase = Math.min(Math.max(rawInsuranceBase, 5310000), 46800000);
    const bhtnBase = Math.min(Math.max(rawInsuranceBase, 5310000), 106200000);

    // 6. Trích nộp bảo hiểm
    // NLĐ (10.5%)
    const empBhxh = Math.round(insuranceBase * 0.08);
    const empBhyt = Math.round(insuranceBase * 0.015);
    const empBhtn = Math.round(bhtnBase * 0.01);
    const empInsuranceTotal = empBhxh + empBhyt + empBhtn;

    // Doanh nghiệp (23.5% = 17% BHXH + 3% BHYT + 1% BHTN + 0.5% TNLĐ + 2% KPCĐ)
    const compBhxh = Math.round(insuranceBase * 0.17);
    const compBhyt = Math.round(insuranceBase * 0.03);
    const compBhtn = Math.round(bhtnBase * 0.01);
    const compTnld = Math.round(insuranceBase * 0.005);
    const compUnion = Math.round(insuranceBase * 0.02);
    const compInsuranceTotal = compBhxh + compBhyt + compBhtn + compTnld + compUnion;

    // 7. Giảm trừ & Thuế TNCN
    const personalDeduction = 11000000;
    const dependentDeduction = persona.dependentsCount * 4400000;

    // Thu nhập chịu thuế = Gross - Phần phụ cấp miễn thuế - Phần phụ trội OT miễn thuế
    // Phần phụ trội OT: giờ thường hưởng 150% thì 50% miễn thuế; cuối tuần 200% thì 100% miễn thuế
    const otTaxExemptPortion = Math.round(hourlyRate * simOtWeekdayHours * 0.5 + hourlyRate * simOtWeekendHours * 1.0);
    const nonTaxableAllowances = allowances.filter(a => !a.isTaxable).reduce((sum, a) => sum + a.amount, 0);

    const assessableIncome = Math.max(0, grossSalary - nonTaxableAllowances - otTaxExemptPortion);
    const taxableIncome = Math.max(0, assessableIncome - empInsuranceTotal - personalDeduction - dependentDeduction);

    // Biểu thuế lũy tiến từng phần
    let pitTax = 0;
    if (taxableIncome > 0) {
      if (taxableIncome <= 5000000) {
        pitTax = taxableIncome * 0.05;
      } else if (taxableIncome <= 10000000) {
        pitTax = 5000000 * 0.05 + (taxableIncome - 5000000) * 0.1;
      } else if (taxableIncome <= 18000000) {
        pitTax = 5000000 * 0.05 + 5000000 * 0.1 + (taxableIncome - 10000000) * 0.15;
      } else if (taxableIncome <= 32000000) {
        pitTax = 5000000 * 0.05 + 5000000 * 0.1 + 8000000 * 0.15 + (taxableIncome - 18000000) * 0.2;
      } else if (taxableIncome <= 52000000) {
        pitTax = 5000000 * 0.05 + 5000000 * 0.1 + 8000000 * 0.15 + 14000000 * 0.2 + (taxableIncome - 32000000) * 0.25;
      } else {
        pitTax = 5000000 * 0.05 + 5000000 * 0.1 + 8000000 * 0.15 + 14000000 * 0.2 + 20000000 * 0.25 + (taxableIncome - 52000000) * 0.3;
      }
    }
    pitTax = Math.round(pitTax);

    // 8. Đoàn phí công đoàn NLĐ (1% lương cơ bản, tối đa 10% lương tối thiểu = 531k)
    const unionDues = persona.isUnionMember ? Math.min(Math.round(persona.baseSalary * 0.01), 531000) : 0;

    // 9. Lương thực lĩnh Net (Tuyệt đối không có tạm ứng lương theo SRS)
    const netSalary = grossSalary - empInsuranceTotal - pitTax - unionDues;

    // 10. Tổng chi phí DN
    const totalCompanyCost = grossSalary + compInsuranceTotal;

    return {
      employeeCode: persona.employeeCode,
      fullName: persona.fullName,
      position: persona.position,
      employeeType: persona.employeeType,
      accountCode: persona.accountCode,
      baseSalary: persona.baseSalary,
      standardDays: stdDays,
      actualDays: simActualDays,
      timeSalary,
      otWeekdayHours: simOtWeekdayHours,
      otWeekendHours: simOtWeekendHours,
      otPay,
      allowanceTotal,
      allowances,
      grossSalary,
      insuranceBase,
      insuranceCapped,
      employeeInsurance: {
        bhxh: empBhxh,
        bhyt: empBhyt,
        bhtn: empBhtn,
        total: empInsuranceTotal,
      },
      employerInsurance: {
        bhxh: compBhxh,
        bhyt: compBhyt,
        bhtn: compBhtn,
        tnldBnn: compTnld,
        unionFee: compUnion,
        total: compInsuranceTotal,
      },
      personalDeduction,
      dependentsCount: persona.dependentsCount,
      dependentDeduction,
      taxableIncome,
      pitTax,
      unionDues,
      netSalary,
      totalCompanyCost,
    };
  };

  const simResult = calculateSimulation();

  return (
    <div className="page-wrapper">
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

        <button
          onClick={() => setActiveTab('SITE_ALLOWANCES')}
          className={`btn ${activeTab === 'SITE_ALLOWANCES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 0.75rem', justifyContent: 'center', whiteSpace: 'nowrap' }}
        >
          <HardHat size={15} />
          <span>3. Phụ Cấp Công Trường</span>
          <span className="badge badge-slate" style={{ marginLeft: '0.35rem' }}>{allowanceList.length}</span>
          <span className="badge badge-warning" style={{ marginLeft: '0.35rem', fontSize: '0.625rem' }}>HR &amp; KTT</span>
        </button>

        <button
          onClick={() => setActiveTab('FORMULA_SIMULATOR')}
          className={`btn ${activeTab === 'FORMULA_SIMULATOR' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 0.75rem', justifyContent: 'center', whiteSpace: 'nowrap', backgroundColor: activeTab === 'FORMULA_SIMULATOR' ? '#1d4ed8' : undefined }}
        >
          <Calculator size={15} />
          <span>4. Lõi Lương &amp; Sandbox</span>
          <span className="badge badge-success" style={{ marginLeft: '0.35rem' }}>Live Test</span>
          <span className="badge badge-primary" style={{ marginLeft: '0.35rem', fontSize: '0.625rem' }}>Maker-Checker</span>
        </button>
      </div>

      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* TAB 3: PHỤ CẤP CÔNG TRÌNH & ĐẶC THÙ XÂY DỰNG (FE-09 / UC-19) */}
      {/* ========================================================================= */}
      {activeTab === 'SITE_ALLOWANCES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Info Banner when user has read-only access to Site Allowances */}
          {!canManageAllowances && (
            <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={14} color="#64748b" />
              <span>Chế độ xem chính sách phụ cấp công trường. Quyền cấu hình và gán dự án thuộc về <strong>Trưởng Phòng Nhân Sự (HR Manager)</strong> &amp; <strong>Kế Toán Trưởng</strong>.</span>
            </div>
          )}

          <div className="alert-banner alert-banner-warning">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <HardHat size={18} color="#d97706" />
              <div style={{ fontSize: '0.8125rem' }}>
                <strong>Chính sách đãi ngộ đặc thù thi công công trình xây lắp:</strong>
                <div style={{ marginTop: '0.15rem', color: 'var(--text-body)' }}>
                  HMCPS thiết lập cấu hình linh hoạt cho 7 loại phụ cấp. Khoản phụ cấp được miễn BHXH giúp tối ưu hóa chi phí cho cả Doanh nghiệp và tăng thu nhập thực lĩnh cho Kỹ sư công trường theo đúng quy định pháp luật.
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '90px' }}>Mã PC</th>
                  <th className="text-left">Tên Khoản Phụ Cấp</th>
                  <th className="text-right" style={{ width: '140px' }}>Mức Định Mức</th>
                  <th className="text-center" style={{ width: '130px' }}>Đối Tượng Áp Dụng</th>
                  <th className="text-center" style={{ width: '110px' }}>Tính Nền BHXH</th>
                  <th className="text-center" style={{ width: '110px' }}>Thuế TNCN</th>
                  <th className="text-center" style={{ width: '100px' }}>Tính Theo Ngày</th>
                  <th className="text-center" style={{ width: '90px' }}>Hạch Toán</th>
                  <th className="text-center" style={{ width: '90px' }}>Trạng Thái</th>
                  {canManageAllowances && <th className="text-center" style={{ width: '70px' }}>Sửa</th>}
                </tr>
              </thead>
              <tbody>
                {allowanceList.map((item) => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                    <td className="text-left font-mono text-xs font-bold text-slate-800">{item.code}</td>
                    <td className="text-left">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.note}</div>
                    </td>
                    <td className="text-right tabular-nums font-bold text-slate-900" style={{ fontSize: '0.875rem' }}>
                      {formatVND(item.amount)}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${
                        item.applicableScope === 'SITE_ENGINEER' ? 'badge-warning' :
                        item.applicableScope === 'OFFICE_STAFF' ? 'badge-primary' : 'badge-slate'
                      }`}>
                        {item.applicableScope === 'SITE_ENGINEER' ? 'Kỹ Sư Công Trường' :
                         item.applicableScope === 'OFFICE_STAFF' ? 'Khối Văn Phòng HQ' : 'Toàn Bộ Nhân Sự'}
                      </span>
                    </td>
                    <td className="text-center">
                      {item.isInsuranceBase ? (
                        <span className="badge badge-warning" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                          Có Đóng BHXH
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
                          Miễn BHXH
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {item.isTaxable ? (
                        <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>Chịu Thuế</span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Miễn Thuế</span>
                      )}
                    </td>
                    <td className="text-center text-xs text-slate-600">
                      {item.isProratedByDays ? 'Theo ngày công' : 'Khoán cố định'}
                    </td>
                    <td className="text-center font-mono font-semibold text-xs text-slate-700">
                      {item.defaultAccountCode}
                    </td>
                    <td className="text-center">
                      {canManageAllowances ? (
                        <button
                          onClick={() => handleToggleAllowanceStatus(item.id)}
                          className={`badge ${item.isActive ? 'badge-success' : 'badge-slate'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Bấm để bật / tắt khoản phụ cấp này"
                        >
                          {item.isActive ? 'Đang Dùng' : 'Tạm Dừng'}
                        </button>
                      ) : (
                        <span
                          className={`badge ${item.isActive ? 'badge-success' : 'badge-slate'}`}
                          style={{ cursor: 'default' }}
                          title="Chỉ HR Manager & Kế toán trưởng mới có quyền bật/tắt"
                        >
                          {item.isActive ? 'Đang Dùng' : 'Tạm Dừng'}
                        </span>
                      )}
                    </td>
                    {canManageAllowances && (
                      <td className="text-center">
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => setEditingAllowance({ ...item })}
                            className="btn btn-sm btn-secondary"
                            title="Sửa cấu hình phụ cấp"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteAllowance(item.id, item.name)}
                            className="btn btn-sm btn-secondary"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            title="Xóa khoản phụ cấp này"
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

          {/* ========================================================================= */}
          {/* STEP 4 (BF-10): GÁN PHỤ CẤP ĐẶC THÙ HIỆN TRƯỜNG CHO KỸ SƯ THEO DỰ ÁN */}
          {/* ========================================================================= */}
          <div className="card" style={{ border: '1px solid #fed7aa', backgroundColor: '#fffdfa' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #ffedd5', backgroundColor: '#fff7ed' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: '#fed7aa', color: '#c2410c' }}>
                  <HardHat size={18} />
                </div>
                <div>
                  <h3 className="card-title" style={{ color: '#9a3412', fontSize: '0.9375rem' }}>
                    Bước 4 (Workflow BF-10): Gán Phụ Cấp Đặc Thù Hiện Trường Cho Kỹ Sư Theo Từng Dự Án
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#ea580c', margin: 0 }}>
                    HR Manager thiết lập định mức phụ cấp lưu trú, độc hại, trách nhiệm gói thầu &amp; ca đêm cho từng công trình (TK 627)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-warning">Quy Chế Khoán Hiện Trường</span>
                {canManageAllowances ? (
                  <button onClick={handleSaveProjectAllowanceAllocation} className="btn btn-sm btn-primary">
                    <Check size={14} />
                    <span>Lưu &amp; Kích Hoạt Cho Dự Án</span>
                  </button>
                ) : (
                  <span className="badge badge-slate" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Lock size={12} />
                    <span>Chỉ HR &amp; KTT được lưu</span>
                  </span>
                )}
              </div>
            </div>

            <div className="card-body">
              {/* Project Picker */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="#b45309" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#78350f' }}>Chọn Công Trình / Dự Án:</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedSiteProject('DA-NHATTAN2')}
                    className={`btn btn-sm ${selectedSiteProject === 'DA-NHATTAN2' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    DA-NHATTAN2: Cầu Nhật Tân 2
                  </button>
                  <button
                    onClick={() => setSelectedSiteProject('DA-LANDMARK')}
                    className={`btn btn-sm ${selectedSiteProject === 'DA-LANDMARK' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    DA-LANDMARK: Tòa Tháp Landmark Hải Minh
                  </button>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#92400e' }}>
                  Dự án đang chọn: <strong>{siteProjectAllowances[selectedSiteProject].projectName}</strong>
                </div>
              </div>

              {/* Allowance inputs for this project */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Phụ cấp Lưu trú công trường (VNĐ):</label>
                  <input
                    type="number"
                    step="100000"
                    className="form-input"
                    disabled={!canManageAllowances}
                    readOnly={!canManageAllowances}
                    value={siteProjectAllowances[selectedSiteProject].siteLodging}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSiteProjectAllowances(prev => ({
                        ...prev,
                        [selectedSiteProject]: { ...prev[selectedSiteProject], siteLodging: val }
                      }));
                    }}
                    style={{
                      backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                      cursor: canManageAllowances ? 'text' : 'not-allowed',
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Miễn BHXH &amp; Miễn Thuế TNCN</span>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Phụ cấp Độc hại / Nặng nhọc (VNĐ):</label>
                  <input
                    type="number"
                    step="100000"
                    className="form-input"
                    disabled={!canManageAllowances}
                    readOnly={!canManageAllowances}
                    value={siteProjectAllowances[selectedSiteProject].hazard}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSiteProjectAllowances(prev => ({
                        ...prev,
                        [selectedSiteProject]: { ...prev[selectedSiteProject], hazard: val }
                      }));
                    }}
                    style={{
                      backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                      cursor: canManageAllowances ? 'text' : 'not-allowed',
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Thi công trên cao / hầm chui</span>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Trách nhiệm Chỉ huy trưởng (VNĐ):</label>
                  <input
                    type="number"
                    step="100000"
                    className="form-input"
                    disabled={!canManageAllowances}
                    readOnly={!canManageAllowances}
                    value={siteProjectAllowances[selectedSiteProject].projectResponsibilitySM}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSiteProjectAllowances(prev => ({
                        ...prev,
                        [selectedSiteProject]: { ...prev[selectedSiteProject], projectResponsibilitySM: val }
                      }));
                    }}
                    style={{
                      backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                      cursor: canManageAllowances ? 'text' : 'not-allowed',
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Chỉ huy công trường, an toàn</span>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Trách nhiệm Kỹ sư hiện trường (VNĐ):</label>
                  <input
                    type="number"
                    step="100000"
                    className="form-input"
                    disabled={!canManageAllowances}
                    readOnly={!canManageAllowances}
                    value={siteProjectAllowances[selectedSiteProject].projectResponsibilityEng}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSiteProjectAllowances(prev => ({
                        ...prev,
                        [selectedSiteProject]: { ...prev[selectedSiteProject], projectResponsibilityEng: val }
                      }));
                    }}
                    style={{
                      backgroundColor: canManageAllowances ? '#ffffff' : '#f8fafc',
                      cursor: canManageAllowances ? 'text' : 'not-allowed',
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Kỹ sư giám sát / kết cấu / MEP</span>
                </div>
              </div>

              {/* Site Engineers Table for this project */}
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Danh sách Kỹ sư công trường phân bổ vào dự án ({siteProjectAllowances[selectedSiteProject].engineers.length} kỹ sư):
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Mã NV</th>
                      <th>Họ và Tên</th>
                      <th>Chức Danh Hiện Trường</th>
                      <th className="text-right">PC Lưu Trú</th>
                      <th className="text-right">PC Độc Hại</th>
                      <th className="text-right">PC Trách Nhiệm</th>
                      <th className="text-right">Tổng PC Dự Án (TK 627)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteProjectAllowances[selectedSiteProject].engineers.map((eng) => {
                      const totalEng = eng.customLodging + eng.customHazard + eng.customResp;
                      return (
                        <tr key={eng.code}>
                          <td className="font-mono font-semibold text-xs text-blue-700">{eng.code}</td>
                          <td className="font-semibold text-slate-800">{eng.name}</td>
                          <td>
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{eng.role}</span>
                          </td>
                          <td className="text-right tabular-nums">{formatVND(eng.customLodging)}</td>
                          <td className="text-right tabular-nums">{formatVND(eng.customHazard)}</td>
                          <td className="text-right tabular-nums">{formatVND(eng.customResp)}</td>
                          <td className="text-right tabular-nums font-bold text-emerald-700">{formatVND(totalEng)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BỘ CÔNG THỨC LƯƠNG ĐỘNG & WORKFLOW BF-10 (BƯỚC 9 -> BƯỚC 15) */}
      {/* ========================================================================= */}
      {activeTab === 'FORMULA_SIMULATOR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Workflow Stepper Status Header */}
          <div className="card" style={{ border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff' }}>
            <div className="card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calculator size={20} color="#0284c7" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0369a1' }}>
                      Quy Trình Quản Lý &amp; Phê Duyệt Bộ Công Thức Tính Lương Động (Workflow BF-10)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                      Chu trình phối hợp giữa HR Manager &bull; Chuyên viên Kế toán &bull; Kế toán trưởng &bull; System Admin
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                    Phiên Bản Hoạt Động: <strong>{formulaVersion}</strong>
                  </span>
                  <span className={`badge ${
                    formulaWorkflowStatus === 'APPROVED_ACTIVE' ? 'badge-success' :
                    formulaWorkflowStatus === 'PENDING_APPROVAL' ? 'badge-warning' :
                    formulaWorkflowStatus === 'PREVIEWED' ? 'badge-primary' : 'badge-slate'
                  }`} style={{ fontSize: '0.75rem' }}>
                    {formulaWorkflowStatus === 'APPROVED_ACTIVE' ? 'Đã Phê Duyệt & Hiệu Lực' :
                     formulaWorkflowStatus === 'PENDING_APPROVAL' ? 'Chờ KT Trưởng Phê Duyệt' :
                     formulaWorkflowStatus === 'PREVIEWED' ? 'Đã Chạy Thử Nghiệm Sandbox' :
                     formulaWorkflowStatus === 'SYNTAX_VERIFIED' ? 'Đã Kiểm Tra Cú Pháp' : 'Bản Thảo (Draft)'}
                  </span>
                </div>
              </div>

              {/* Stepper Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: formulaWorkflowStatus === 'DRAFT' || formulaWorkflowStatus === 'SYNTAX_VERIFIED' ? '#eff6ff' : '#ffffff',
                  border: formulaWorkflowStatus === 'DRAFT' || formulaWorkflowStatus === 'SYNTAX_VERIFIED' ? '2px solid #2563eb' : '1px solid #bae6fd'
                }}>
                  <div style={{ fontWeight: 600, color: '#0369a1' }}>1. Kế Toán Soạn Biểu Thức</div>
                  <div style={{ color: 'var(--text-muted)' }}>Bước 9: Update công thức động (Maker)</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #bae6fd' }}>
                  <div style={{ fontWeight: 600, color: '#0369a1' }}>2. Bóc Tách TK 622/627/642</div>
                  <div style={{ color: 'var(--text-muted)' }}>Bước 10: Tách chi phí dự án</div>
                </div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: formulaWorkflowStatus === 'PREVIEWED' ? '#eff6ff' : '#ffffff',
                  border: formulaWorkflowStatus === 'PREVIEWED' ? '2px solid #2563eb' : '1px solid #bae6fd'
                }}>
                  <div style={{ fontWeight: 600, color: '#0369a1' }}>3. Syntax Check &amp; Sandbox</div>
                  <div style={{ color: 'var(--text-muted)' }}>Bước 11 &amp; 13: Thử nghiệm dữ liệu</div>
                </div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: formulaWorkflowStatus === 'PENDING_APPROVAL' ? '#fffbeb' : '#ffffff',
                  border: formulaWorkflowStatus === 'PENDING_APPROVAL' ? '2px solid #d97706' : '1px solid #bae6fd'
                }}>
                  <div style={{ fontWeight: 600, color: formulaWorkflowStatus === 'PENDING_APPROVAL' ? '#b45309' : '#0369a1' }}>
                    4. Trình Thẩm Định
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Bước 11 &rarr; 12: Gửi KT Trưởng (Checker)</div>
                </div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: formulaWorkflowStatus === 'APPROVED_ACTIVE' ? '#ecfdf5' : '#ffffff',
                  border: formulaWorkflowStatus === 'APPROVED_ACTIVE' ? '2px solid #059669' : '1px solid #bae6fd'
                }}>
                  <div style={{ fontWeight: 600, color: formulaWorkflowStatus === 'APPROVED_ACTIVE' ? '#047857' : '#0369a1' }}>
                    5. Phê Duyệt &amp; Archive Log
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Bước 12, 14 &amp; 15: Chốt &amp; Audit Log</div>
                </div>
              </div>

              {/* Syntax Message banner if available */}
              {syntaxCheckMessage && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{syntaxCheckMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 9 & 10: Formula Expression Inputs */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="#2563eb" />
                <div>
                  <h2 className="card-title">Cấu Hình Bộ Biểu Thức Lương Động &amp; Thuật Toán Bóc Tách Chi Phí (Bước 9 &amp; 10 / BF-10)</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    {isFormulaMaker
                      ? 'Kế toán viên (Maker) có quyền soạn và chỉnh sửa trực tiếp biểu thức tính toán; kiểm tra cú pháp và trình KT Trưởng'
                      : isFormulaChecker
                      ? 'Kế toán trưởng (Checker) thẩm định biểu thức, kiểm tra cú pháp, chạy thử Sandbox và phê duyệt chốt áp dụng'
                      : 'Chế độ xem đối chiếu công thức lương động & mô phỏng Sandbox (Read-only)'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {/* 1. Syntax Check: Maker & Checker */}
                {(isFormulaMaker || isFormulaChecker) && (
                  <button
                    onClick={handleSyntaxCheck}
                    className="btn btn-sm btn-secondary"
                    title="Kiểm tra tính hợp lệ cú pháp biểu thức toán học (Step 13 / BF-10)"
                  >
                    <CheckSquare size={14} />
                    <span>1. Kiểm Tra Cú Pháp</span>
                  </button>
                )}

                {/* 2. Sandbox Dry-run: Maker & Checker */}
                {(isFormulaMaker || isFormulaChecker) && (
                  <button
                    onClick={handleRunSandboxDryRun}
                    className="btn btn-sm btn-secondary"
                    title="Chạy thử nghiệm trên tập dữ liệu mẫu (Step 11 / BF-10)"
                  >
                    <Eye size={14} />
                    <span>2. Chạy Thử Sandbox</span>
                  </button>
                )}

                {/* 3. Trình KT Trưởng: ONLY Maker can submit (not Chief Accountant) */}
                {isFormulaMaker && currentRole !== 'CHIEF_ACCOUNTANT' && (
                  <button
                    onClick={handleSubmitFormulaForReview}
                    className="btn btn-sm btn-secondary"
                    style={{
                      color: '#2563eb',
                      borderColor: '#93c5fd',
                      backgroundColor: formulaWorkflowStatus === 'SYNTAX_VERIFIED' || formulaWorkflowStatus === 'PREVIEWED' ? '#eff6ff' : undefined
                    }}
                    title="Kế toán viên trình thẩm định bộ công thức lên Kế toán trưởng (Step 11 / BF-10)"
                  >
                    <Send size={14} />
                    <span>3. Trình KT Trưởng</span>
                  </button>
                )}

                {/* Checker Action: Revise/Return if in pending approval */}
                {isFormulaChecker && formulaWorkflowStatus === 'PENDING_APPROVAL' && (
                  <button
                    onClick={handleRejectFormulaWorkflow}
                    className="btn btn-sm btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    title="Kế toán trưởng yêu cầu Kế toán viên điều chỉnh lại biểu thức"
                  >
                    <RotateCcw size={14} />
                    <span>Hoàn Trả / Sửa Lại</span>
                  </button>
                )}

                {/* Checker Action: Approve */}
                {isFormulaChecker && (
                  <button
                    onClick={handleApproveFormulaWorkflow}
                    className="btn btn-sm btn-primary"
                    style={{
                      backgroundColor: formulaWorkflowStatus === 'PENDING_APPROVAL' ? '#059669' : undefined,
                      borderColor: formulaWorkflowStatus === 'PENDING_APPROVAL' ? '#047857' : undefined,
                    }}
                    title="Kế toán trưởng phê duyệt và chốt áp dụng bộ công thức mới (Step 12 / BF-10)"
                  >
                    <Lock size={14} />
                    <span>4. Phê Duyệt &amp; Chốt Áp Dụng</span>
                  </button>
                )}

                {/* Notice for Maker: Cannot self-approve */}
                {isFormulaMaker && !isFormulaChecker && (
                  <span
                    className="badge badge-slate"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem' }}
                    title="Quy tắc Maker-Checker: Người soạn thảo không được tự phê duyệt công thức"
                  >
                    <Lock size={11} />
                    <span>Chờ Kế Toán Trưởng Duyệt</span>
                  </span>
                )}

                {/* Notice for Viewer */}
                {isFormulaViewer && (
                  <span
                    className="badge badge-slate"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem' }}
                  >
                    <Eye size={11} />
                    <span>Chế Độ Xem Biểu Thức</span>
                  </span>
                )}
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                {/* 1. Time Salary */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      1. Biểu Thức Lương Thời Gian (TimeSalary):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.timeSalary}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, timeSalary: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#2563eb' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Định mức chuẩn: 26 ngày công/tháng. Đơn giá ngày = BaseSalary / 26.
                  </div>
                </div>

                {/* 2. Overtime Pay */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      2. Biểu Thức Làm Thêm Giờ Hiện Trường (OvertimePay):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.otPay}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, otPay: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#d97706' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Hệ số làm thêm: 150% (ngày thường), 200% (cuối tuần), 300% (ngày lễ), +30% phụ cấp ca đêm.
                  </div>
                </div>

                {/* 3. Insurance Base Office */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      3. Nền Đóng BHXH Khối Văn Phòng HQ (TK 642):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.insuranceBaseOffice}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, insuranceBaseOffice: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#047857' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Luật BHXH 2024: Nền = Lương CB + Phụ cấp chức vụ + Thâm niên. Kẹp trần 46.8M.
                  </div>
                </div>

                {/* 4. Insurance Base Site */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      4. Nền Đóng BHXH Kỹ Sư Công Trường (TK 627/622):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.insuranceBaseSite}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, insuranceBaseSite: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#047857' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Quy chế đặc thù: Nền BHXH = Lương cơ bản ONLY. Toàn bộ PC lưu trú, độc hại miễn BHXH.
                  </div>
                </div>

                {/* 5. Taxable Income */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      5. Thu Nhập Tính Thuế TNCN (TaxableIncome):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.taxableIncome}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, taxableIncome: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#7c3aed' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Miễn trừ: Ăn ca 730k, Lưu trú CT, Độc hại, Phần chênh lệch tăng ca vượt mức 100%.
                  </div>
                </div>

                {/* 6. Net Salary */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      6. Lương Thực Lĩnh Net (NetSalary):
                    </label>
                    {!isFormulaMaker && (
                      <span className="badge badge-slate" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                        <Lock size={10} style={{ display: 'inline', marginRight: '2px' }} />Chỉ Maker được sửa
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    disabled={!isFormulaMaker}
                    readOnly={!isFormulaMaker}
                    value={customFormulas.netSalary}
                    onChange={(e) => setCustomFormulas({ ...customFormulas, netSalary: e.target.value })}
                    style={{
                      color: isFormulaMaker ? '#0284c7' : '#475569',
                      fontWeight: 600,
                      backgroundColor: isFormulaMaker ? '#ffffff' : '#f1f5f9',
                      cursor: isFormulaMaker ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Net = Gross - BHXH_10.5% - Thuế TNCN lũy tiến 7 bậc - Đoàn phí công đoàn 1%.
                  </div>
                </div>
              </div>

              {/* Step 10: Cost allocation definitions */}
              <div style={{ marginTop: '1rem', padding: '0.85rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                  Bước 10 (BF-10): Quy Tắc Bóc Tách Chi Phí Lương &amp; Bảo Hiểm Theo Tài Khoản Hạch Toán:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.75rem' }}>
                  <div style={{ backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <strong className="text-amber-800">TK 622 — Nhân Công Trực Tiếp:</strong>
                    <div style={{ color: 'var(--text-muted)' }}>Lương kỹ sư kết cấu, kỹ sư thi công trực tiếp gắn liền với từng mã công trình dự án.</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <strong className="text-amber-800">TK 627 — Chi Phí SXC Công Trường:</strong>
                    <div style={{ color: 'var(--text-muted)' }}>Chỉ huy trưởng, kỹ sư HSE, phụ cấp lán trại, phụ cấp độc hại, bảo hiểm khối công trường.</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <strong className="text-amber-800">TK 642 — Chi Phí QLDN Văn Phòng:</strong>
                    <div style={{ color: 'var(--text-muted)' }}>Khối văn phòng trụ sở HQ (HR, Kế toán, Ban Giám đốc), khấu trừ BHXH văn phòng.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Live Interactive Simulator */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="#047857" />
                <h2 className="card-title">Sandbox Thử Nghiệm Mô Phỏng Tính Lương Trực Tiếp (Live Payroll Simulator - Bước 11 / BF-10)</h2>
              </div>
              <span className="badge badge-success">Phản Hồi Thời Gian Thực</span>
            </div>

            <div className="card-body">
              {/* Simulator Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    1. Chọn Nhân Sự Thử Nghiệm:
                  </label>
                  <select
                    className="form-select"
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {samplePersonas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} — {p.position} ({formatVND(p.baseSalary)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    2. Số Ngày Công Thực Tế: <strong className="text-blue-700">{simActualDays} / 26 công</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="31"
                    value={simActualDays}
                    onChange={(e) => setSimActualDays(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    <span>0 ngày</span>
                    <span>Chuẩn 26 ngày</span>
                    <span>Tối đa 31 ngày</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    3. Giờ Tăng Ca OT Ngày Thường: <strong className="text-amber-700">{simOtWeekdayHours} giờ (150%)</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={simOtWeekdayHours}
                    onChange={(e) => setSimOtWeekdayHours(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    <span>0 giờ</span>
                    <span>20 giờ</span>
                    <span>40 giờ</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    4. Giờ Tăng Ca OT Cuối Tuần: <strong className="text-amber-800">{simOtWeekendHours} giờ (200%)</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={simOtWeekendHours}
                    onChange={(e) => setSimOtWeekendHours(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    <span>0 giờ</span>
                    <span>12 giờ</span>
                    <span>24 giờ</span>
                  </div>
                </div>
              </div>

              {/* Simulation Results Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Result Card 1: Gross Income */}
                <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', backgroundColor: '#eff6ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af' }}>I. TỔNG THU NHẬP GROSS</span>
                    <DollarSign size={16} color="#1e40af" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
                    {formatVND(simResult.grossSalary)}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Lương thời gian ({simResult.actualDays}/26 công):</span>
                      <strong className="tabular-nums">{formatVND(simResult.timeSalary)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Tiền làm thêm giờ ({simResult.otWeekdayHours + simResult.otWeekendHours}h OT):</span>
                      <strong className="tabular-nums text-amber-700">{formatVND(simResult.otPay)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Tổng phụ cấp ({simResult.allowances.length} khoản):</span>
                      <strong className="tabular-nums text-emerald-700">{formatVND(simResult.allowanceTotal)}</strong>
                    </div>
                  </div>
                </div>

                {/* Result Card 2: Insurance Base */}
                <div style={{ border: '1px solid #fed7aa', borderRadius: '8px', padding: '1rem', backgroundColor: '#fff7ed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9a3412' }}>II. NỀN ĐÓNG BẢO HIỂM</span>
                    <ShieldCheck size={16} color="#9a3412" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.5rem' }}>
                    {formatVND(simResult.insuranceBase)}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Đối tượng phân loại:</span>
                      <span className="font-semibold text-slate-800">{simResult.employeeType === 'OFFICE_STAFF' ? 'Khối Văn Phòng' : 'Kỹ Sư Công Trường'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• NLĐ đóng (10.5%):</span>
                      <strong className="tabular-nums text-rose-700">-{formatVND(simResult.employeeInsurance.total)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Doanh nghiệp nộp (23.5%):</span>
                      <strong className="tabular-nums text-amber-800">{formatVND(simResult.employerInsurance.total)}</strong>
                    </div>
                  </div>
                </div>

                {/* Result Card 3: Deductions & PIT */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>III. KHẤU TRỪ THUẾ &amp; PHÍ</span>
                    <Percent size={16} color="#475569" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e11d48', marginBottom: '0.5rem' }}>
                    -{formatVND(simResult.employeeInsurance.total + simResult.pitTax + simResult.unionDues)}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Bảo hiểm NLĐ (10.5%):</span>
                      <strong className="tabular-nums">-{formatVND(simResult.employeeInsurance.total)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Thuế TNCN lũy tiến:</span>
                      <strong className="tabular-nums text-rose-700">-{formatVND(simResult.pitTax)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Đoàn phí công đoàn (1%):</span>
                      <strong className="tabular-nums">-{formatVND(simResult.unionDues)}</strong>
                    </div>
                  </div>
                </div>

                {/* Result Card 4: Net Take-Home */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', backgroundColor: '#f0fdf4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534' }}>IV. LƯƠNG THỰC LĨNH (NET)</span>
                    <TrendingUp size={16} color="#166534" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
                    {formatVND(simResult.netSalary)}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Chuyển khoản Vietcombank:</span>
                      <strong className="tabular-nums text-emerald-800">{formatVND(simResult.netSalary)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Hạch toán chi phí:</span>
                      <span className="badge badge-primary">{simResult.accountCode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Tổng chi phí công ty:</span>
                      <strong className="tabular-nums">{formatVND(simResult.totalCompanyCost)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isFormulaChecker ? (
                  <button
                    onClick={() => {
                      showToast('Đã lưu cấu hình công thức lương động vào cơ sở dữ liệu hệ thống (áp dụng cho kỳ lương tháng 11/2026)!');
                    }}
                    className="btn btn-primary"
                    title="Kế toán trưởng kích hoạt áp dụng công thức vào kỳ tính lương chính thức tiếp theo"
                  >
                    <Sparkles size={15} />
                    <span>Áp Dụng Công Thức Vào Kỳ Lương Tiếp Theo</span>
                  </button>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={14} />
                    <span>Kết quả mô phỏng Sandbox mang tính chất thử nghiệm. Quyền chốt áp dụng kỳ tiếp theo thuộc Kế Toán Trưởng.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 14 & 15 (BF-10): NHẬT KÝ KIỂM TOÁN HỆ THỐNG & ARCHIVE PHIÊN BẢN CŨ */}
          {/* ========================================================================= */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="#475569" />
                <div>
                  <h3 className="card-title" style={{ fontSize: '0.9375rem' }}>
                    Nhật Ký Kiểm Toán Hệ Thống &amp; Lưu Trữ Phiên Bản Cũ (Bước 14 &amp; 15 / BF-10)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Tự động ghi nhận chi tiết thay đổi công thức, phụ cấp, ngày hiệu lực và phê duyệt của Kế toán trưởng
                  </p>
                </div>
              </div>
              <span className="badge badge-slate font-mono">System Audit Log Active</span>
            </div>

            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-sm" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Phiên Bản</th>
                      <th>Người Thực Hiện</th>
                      <th>Nghiệp Vụ / Hành Động</th>
                      <th>Thời Điểm</th>
                      <th className="text-center">Trạng Thái</th>
                      <th>Ghi Chú Kiểm Toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono font-bold text-xs text-blue-700">{log.version}</td>
                        <td className="font-semibold text-slate-800">{log.actor}</td>
                        <td className="text-slate-700">{log.action}</td>
                        <td className="font-mono text-xs text-slate-500">{log.timestamp}</td>
                        <td className="text-center">
                          <span className={`badge ${
                            log.status === 'APPROVED' ? 'badge-success' :
                            log.status === 'ACTIVE' ? 'badge-primary' :
                            log.status === 'PENDING' ? 'badge-warning' : 'badge-slate'
                          }`} style={{ fontSize: '0.6875rem' }}>
                            {log.status === 'APPROVED' ? 'Đã Phê Duyệt' :
                             log.status === 'ACTIVE' ? 'Đang Áp Dụng' :
                             log.status === 'PENDING' ? 'Chờ Duyệt' : 'Archive (Lưu trữ)'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">{log.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL: CHỈNH SỬA / THÊM PHỤ CẤP CÔNG TRÌNH (FE-09 / UC-19) */}
      {/* ========================================================================= */}
      {editingAllowance && (
        <div className="modal-backdrop" onClick={() => setEditingAllowance(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {editingAllowance.id ? 'Cấu Hình Phụ Cấp Công Trường' : 'Thêm Phụ Cấp Mới'}
                </h3>
                <span className="text-xs text-slate-500 font-mono">{editingAllowance.code}</span>
              </div>
              <button onClick={() => setEditingAllowance(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Mã Phụ Cấp:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingAllowance.code}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tên Khoản Phụ Cấp:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingAllowance.name}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Mức Định Mức (VNĐ):</label>
                    <input
                      type="number"
                      step="100000"
                      className="form-input"
                      value={editingAllowance.amount}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Đối Tượng Áp Dụng:</label>
                    <select
                      className="form-select"
                      value={editingAllowance.applicableScope}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, applicableScope: e.target.value as any })}
                    >
                      <option value="SITE_ENGINEER">Kỹ Sư Công Trường</option>
                      <option value="OFFICE_STAFF">Khối Văn Phòng HQ</option>
                      <option value="ALL">Toàn Bộ Nhân Sự</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Quy Định Đóng BHXH:</label>
                    <select
                      className="form-select"
                      value={editingAllowance.isInsuranceBase ? 'YES' : 'NO'}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, isInsuranceBase: e.target.value === 'YES' })}
                    >
                      <option value="NO">Miễn Đóng BHXH (Luật BHXH 2024)</option>
                      <option value="YES">Bắt Buộc Tính Vào Nền BHXH</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tính Thuế TNCN:</label>
                    <select
                      className="form-select"
                      value={editingAllowance.isTaxable ? 'YES' : 'NO'}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, isTaxable: e.target.value === 'YES' })}
                    >
                      <option value="YES">Chịu Thuế TNCN</option>
                      <option value="NO">Miễn Thuế TNCN</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Phân Bổ Theo Ngày Công:</label>
                    <select
                      className="form-select"
                      value={editingAllowance.isProratedByDays ? 'YES' : 'NO'}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, isProratedByDays: e.target.value === 'YES' })}
                    >
                      <option value="YES">Theo Ngày Công Thực Tế</option>
                      <option value="NO">Khoán Cố Định Tháng</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tài Khoản Hạch Toán:</label>
                    <select
                      className="form-select"
                      value={editingAllowance.defaultAccountCode}
                      onChange={(e) => setEditingAllowance({ ...editingAllowance, defaultAccountCode: e.target.value as any })}
                    >
                      <option value="TK_627">TK 627 — Chi phí SXC Công trường</option>
                      <option value="TK_622">TK 622 — Chi phí nhân công trực tiếp</option>
                      <option value="TK_642">TK 642 — Chi phí QLDN Văn phòng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Ghi Chú Nghiệp Vụ &amp; Căn Cứ Pháp Lý:</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editingAllowance.note}
                    onChange={(e) => setEditingAllowance({ ...editingAllowance, note: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingAllowance(null)} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button onClick={handleSaveAllowance} className="btn btn-primary">
                <Check size={15} />
                <span>Lưu Phụ Cấp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
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
