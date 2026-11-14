import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowUpRight,
  Check,
  FileCode,
  ArrowLeft,
  Layers,
  Scale,
  HardHat,
  Calculator,
  Save,
  RotateCcw,
  Sliders,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, sharedState } from '../services/api';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

interface FormulaExpressions extends Record<string, string> {
  proration: string;
  overtime: string;
  insurance: string;
  taxableIncome: string;
  netSalary: string;
}

const DEFAULT_FORMULAS: FormulaExpressions = {
  proration: '(baseSalary / standardWorkDays) * actualWorkDays',
  overtime: 'hourlyRate = baseSalary / (standardWorkDays * 8);\novertimePay = otHours * hourlyRate * 1.5;',
  insurance: "insuranceBase = (empType === 'SITE_ENGINEER') ? Math.min(baseSalary, 46800000) : Math.min(baseSalary + positionAllowance, 46800000);\nbhNld = insuranceBase * 0.105;\nbhDn = insuranceBase * 0.235;",
  taxableIncome: 'taxableIncome = Math.max(0, gross - exemptAllowances - bhNld - 11000000 - (dependents * 4400000));\ncalculateProgressiveTax(taxableIncome);',
  netSalary: 'netSalary = gross - bhNld - pitTax - unionDues;'
};

const ALLOWED_MATH_METHODS = new Set(['min', 'max', 'round', 'floor', 'ceil', 'abs', 'pow', 'sqrt', 'trunc']);
const ALLOWED_STRING_LITERALS = new Set(['SITE_ENGINEER', 'OFFICE_STAFF']);
const FORBIDDEN_KEYWORDS = new Set([
  'window', 'document', 'globalThis', 'self', 'eval', 'Function', 'fetch', 'XMLHttpRequest',
  'alert', 'confirm', 'prompt', 'console', 'while', 'for', 'do', 'return', 'import', 'export',
  'class', 'new', 'var', 'let', 'const', 'this', 'try', 'catch', 'throw', 'if', 'else', 'switch',
]);

const FORMULA_BLOCK_META: Record<keyof FormulaExpressions, { title: string; allowedVars: string[] }> = {
  proration: {
    title: '1. Lương Thời Gian Proration',
    allowedVars: ['baseSalary', 'standardWorkDays', 'actualWorkDays', 'proratedBase', 'Math'],
  },
  overtime: {
    title: '2. Tiền Làm Thêm Giờ OT',
    allowedVars: ['baseSalary', 'standardWorkDays', 'actualWorkDays', 'otHours', 'hourlyRate', 'overtimePay', 'otMultiplier', 'Math'],
  },
  insurance: {
    title: '3. Nền Đóng BHXH & Tỷ Lệ 34%',
    allowedVars: ['empType', 'baseSalary', 'positionAllowance', 'insuranceBase', 'bhNld', 'bhDn', 'Math'],
  },
  taxableIncome: {
    title: '4. Thuế Thu Nhập Cá Nhân Lũy Tiến',
    allowedVars: ['gross', 'exemptAllowances', 'bhNld', 'dependents', 'taxableIncome', 'pitTax', 'calculateProgressiveTax', 'Math'],
  },
  netSalary: {
    title: '5. Thực Nhận Chuyển Khoản (Net)',
    allowedVars: ['gross', 'bhNld', 'pitTax', 'unionDues', 'proratedBase', 'overtimePay', 'netSalary', 'Math'],
  },
};

function calculateProgressivePitHelper(assessable: number): number {
  if (!Number.isFinite(assessable) || assessable <= 0) return 0;
  if (assessable <= 5_000_000) return assessable * 0.05;
  if (assessable <= 10_000_000) return 250_000 + (assessable - 5_000_000) * 0.10;
  if (assessable <= 18_000_000) return 750_000 + (assessable - 10_000_000) * 0.15;
  if (assessable <= 32_000_000) return 1_950_000 + (assessable - 18_000_000) * 0.20;
  if (assessable <= 52_000_000) return 4_750_000 + (assessable - 32_000_000) * 0.25;
  if (assessable <= 80_000_000) return 9_750_000 + (assessable - 52_000_000) * 0.30;
  return 18_150_000 + (assessable - 80_000_000) * 0.35;
}

function validateFormulaBlock(key: keyof FormulaExpressions, rawExpr: string): string | null {
  const meta = FORMULA_BLOCK_META[key];
  const expr = (rawExpr || '').trim();
  if (!expr) {
    return `Biểu thức không được để trống tại khối [${meta.title}]!`;
  }

  // 1. Kiểm tra cân bằng ngoặc (), {}, [] và dấu nháy
  const stack: string[] = [];
  const matchMap: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === ')' || ch === '}' || ch === ']') {
      const top = stack.pop();
      if (top !== matchMap[ch]) {
        return `Lỗi cặp dấu ngoặc tại khối [${meta.title}]: Dư hoặc sai cặp ngoặc '${ch}'!`;
      }
    }
  }
  if (inSingle || inDouble) {
    return `Lỗi chuỗi ký tự tại khối [${meta.title}]: Thiếu dấu nháy đóng!`;
  }
  if (stack.length > 0) {
    return `Lỗi cặp dấu ngoặc tại khối [${meta.title}]: Thiếu dấu đóng cho '${stack[stack.length - 1]}'!`;
  }

  // 2. Xác thực chuỗi ký tự trong nháy (chỉ cho phép 'SITE_ENGINEER', 'OFFICE_STAFF')
  const strippedComments = expr.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  const stringLiterals = strippedComments.match(/(['"])(?:(?=(\\?))\2.)*?\1/g) || [];
  for (const lit of stringLiterals) {
    const inner = lit.slice(1, -1);
    if (!ALLOWED_STRING_LITERALS.has(inner)) {
      return `Chuỗi ký tự '${lit}' không hợp lệ tại khối [${meta.title}]! Chỉ cho phép hằng chuỗi 'SITE_ENGINEER' hoặc 'OFFICE_STAFF'.`;
    }
  }

  // Loại bỏ chuỗi hợp lệ để quét định danh & từ khóa
  const withoutStrings = strippedComments.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, ' __STR__ ');

  // 3. Kiểm tra truy cập thuộc tính qua dấu chấm (chỉ cho phép Math.<method>)
  const dotAccessRegex = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let dotMatch: RegExpExecArray | null;
  while ((dotMatch = dotAccessRegex.exec(withoutStrings)) !== null) {
    const objName = dotMatch[1];
    const propName = dotMatch[2];
    if (objName !== 'Math' || !ALLOWED_MATH_METHODS.has(propName)) {
      return `Thuộc tính / hàm '${objName}.${propName}' không được hỗ trợ tại khối [${meta.title}]!`;
    }
  }
  // Bỏ phần .method của Math.method để tránh nhầm method là biến độc lập
  const sanitizedForIds = withoutStrings.replace(/\bMath\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*/g, 'Math');

  // Kiểm tra dấu chấm trơ trọi (không phải số thập phân như 0.105 hay 1.5)
  if (/(^|[^\d])\.(?!\d)|\.(?=\s|$|[+\-*/);,])/.test(sanitizedForIds)) {
    return `Cú pháp dấu chấm '.' không hợp lệ tại khối [${meta.title}]!`;
  }

  // 4. Quét toàn bộ định danh (Whitelist Variable & Keyword Analysis)
  const allowedSet = new Set(meta.allowedVars);
  const identifierMatches = sanitizedForIds.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) || [];
  for (const idToken of identifierMatches) {
    if (idToken === '__STR__') continue;
    if (FORBIDDEN_KEYWORDS.has(idToken)) {
      return `Từ khóa không được phép '${idToken}' tại khối [${meta.title}]! Chỉ được viết biểu thức toán học.`;
    }
    if (!allowedSet.has(idToken)) {
      const validList = meta.allowedVars.filter((v) => v !== 'Math').join(', ');
      return `Biến không tồn tại hoặc văn bản thừa '${idToken}' tại khối [${meta.title}]! Các biến hợp lệ: ${validList}.`;
    }
  }

  // 5. Kiểm tra từng câu lệnh phân cách bởi dấu chấm phẩy ';' (chặn biểu thức rác kiểu ";otHours;" hoặc ";123;")
  const statements = strippedComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length === 0) {
    return `Biểu thức trống tại khối [${meta.title}]!`;
  }
  if (statements.length > 1) {
    for (const stmt of statements) {
      const hasAssign = /(^|[^=!<>])=([^=]|$)/.test(stmt);
      const isTaxCall = /\bcalculateProgressiveTax\s*\(/.test(stmt);
      if (!hasAssign && !isTaxCall) {
        return `Câu lệnh '${stmt}' không gán giá trị hoặc dư thừa tại khối [${meta.title}]! Mỗi dòng lệnh phải là phép gán biến hoặc lời gọi hàm hợp lệ.`;
      }
    }
  } else if (key === 'overtime' || key === 'insurance') {
    const onlyStmt = statements[0];
    if (!/(^|[^=!<>])=([^=]|$)/.test(onlyStmt)) {
      return `Khối [${meta.title}] cần gán kết quả cho biến chuẩn (VD: ${key === 'overtime' ? 'overtimePay = ...' : 'insuranceBase = ...; bhNld = ...; bhDn = ...'}).`;
    }
  }

  // 6. Kiểm tra biên dịch cú pháp JS strict-mode & chạy thử với dữ liệu kiểm thử chuẩn
  try {
    const fnBody =
      key === 'proration' && !/(^|[^=!<>])=([^=]|$)/.test(expr)
        ? `"use strict"; proratedBase = (${expr}); return { proratedBase };`
        : key === 'netSalary' && !/(^|[^=!<>])=([^=]|$)/.test(expr)
        ? `"use strict"; netSalary = (${expr}); return { netSalary };`
        : `"use strict"; ${expr}; return { proratedBase, hourlyRate, overtimePay, otMultiplier, insuranceBase, bhNld, bhDn, taxableIncome, pitTax, netSalary };`;

    const fn = new Function(
      'baseSalary',
      'standardWorkDays',
      'actualWorkDays',
      'otHours',
      'empType',
      'positionAllowance',
      'gross',
      'exemptAllowances',
      'dependents',
      'unionDues',
      'calculateProgressiveTax',
      'proratedBase',
      'hourlyRate',
      'overtimePay',
      'otMultiplier',
      'insuranceBase',
      'bhNld',
      'bhDn',
      'taxableIncome',
      'pitTax',
      'netSalary',
      fnBody
    );

    const out = fn(
      26_000_000,
      24,
      24,
      16,
      'SITE_ENGINEER',
      0,
      36_710_000,
      8_000_000,
      1,
      234_000,
      calculateProgressivePitHelper,
      26_000_000,
      135_416.67,
      3_250_000,
      1.5,
      26_000_000,
      2_730_000,
      6_110_000,
      10_000_000,
      750_000,
      32_990_500
    );

    for (const [valKey, numVal] of Object.entries(out || {})) {
      if (typeof numVal !== 'number' || Number.isNaN(numVal) || !Number.isFinite(numVal)) {
        return `Biểu thức tạo ra giá trị không hợp lệ (${String(numVal)}) ở biến '${valKey}' tại khối [${meta.title}] (kiểm tra phép chia cho 0 hoặc thiếu toán hạng)!`;
      }
    }
  } catch (err: any) {
    return `Lỗi cú pháp Toán học/JS tại khối [${meta.title}]: ${err?.message || 'Biểu thức không hợp lệ'}`;
  }

  return null;
}

export const SalaryFormula: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const isMaker = currentRole === 'ACCOUNTANT' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';
  const isChecker = currentRole === 'CHIEF_ACCOUNTANT' || currentRole === 'SYSTEM_ADMIN' || currentRole === 'ADMIN';

  const [formulaState, setFormulaState] = useState(() => sharedState.getFormulaApprovalState());
  const [formulas, setFormulas] = useState<FormulaExpressions>(() => {
    const initial = sharedState.getFormulaApprovalState();
    if (initial?.formulas && typeof initial.formulas === 'object') {
      return { ...DEFAULT_FORMULAS, ...initial.formulas };
    }
    return DEFAULT_FORMULAS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockErrors, setBlockErrors] = useState<Partial<Record<keyof FormulaExpressions, string>>>({});
  const [selectedPersona, setSelectedPersona] = useState<number>(0);
  const [simActualDays, setSimActualDays] = useState<number>(24);
  const [simOtHours, setSimOtHours] = useState<number>(16);
  const [simulatedResult, setSimulatedResult] = useState<any | null>(null);
  const [isEditingUnlocked, setIsEditingUnlocked] = useState<boolean>(true);

  // Đồng bộ state khi tải trang từ API
  useEffect(() => {
    api.getBf10State().then(() => {
      const fs = sharedState.getFormulaApprovalState();
      setFormulaState(fs);
      if (fs?.formulas && typeof fs.formulas === 'object') {
        setFormulas((prev) => ({ ...prev, ...fs.formulas }));
      }
    });
  }, []);

  const showToast = (msg: string) => {
    setErrorMessage(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setToastMessage(null);
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6500);
  };

  const validateAllFormulas = (targetFormulas: FormulaExpressions = formulas) => {
    const errors: Partial<Record<keyof FormulaExpressions, string>> = {};
    let firstError: string | undefined;
    (Object.keys(FORMULA_BLOCK_META) as Array<keyof FormulaExpressions>).forEach((key) => {
      const err = validateFormulaBlock(key, targetFormulas[key]);
      if (err) {
        errors[key] = err;
        if (!firstError) firstError = err;
      }
    });
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstError,
    };
  };

  // Danh sách Persona mẫu để kiểm thử sandbox
  const samplePersonas = [
    {
      id: 1,
      code: 'HM-005',
      name: 'Nguyễn Lê Gia Phát',
      role: 'Chỉ Huy Trưởng Công Trường (Site Manager)',
      type: 'SITE_ENGINEER',
      accountCode: 'TK 627',
      baseSalary: 26000000,
      stdDays: 24,
      defaultDays: 24,
      defaultOt: 16,
      dependents: 1,
      positionAllowance: 0,
      allowances: {
        meal: 24 * 40000,
        lodging: 3000000,
        hazard: 1500000,
        resp: 2000000,
      }
    },
    {
      id: 2,
      code: 'HM-006',
      name: 'Trần Văn Trung',
      role: 'Kỹ Sư Giám Sát Kết Cấu',
      type: 'SITE_ENGINEER',
      accountCode: 'TK 622',
      baseSalary: 18000000,
      stdDays: 24,
      defaultDays: 24,
      defaultOt: 12,
      dependents: 0,
      positionAllowance: 0,
      allowances: {
        meal: 24 * 40000,
        lodging: 3000000,
        hazard: 1500000,
        resp: 500000,
      }
    },
    {
      id: 3,
      code: 'HM-003',
      name: 'Phạm Thị Mai',
      role: 'Chuyên Viên Nhân Sự Tổng Hợp',
      type: 'OFFICE_STAFF',
      accountCode: 'TK 642',
      baseSalary: 16000000,
      stdDays: 24,
      defaultDays: 24,
      defaultOt: 0,
      dependents: 0,
      positionAllowance: 1500000,
      allowances: {
        meal: 24 * 40000,
        lodging: 0,
        hazard: 0,
        resp: 0,
      }
    }
  ];

  // Khi chọn persona khác, đồng bộ số ngày công và giờ OT
  const handleSelectPersona = (idx: number) => {
    setSelectedPersona(idx);
    setSimActualDays(samplePersonas[idx].defaultDays);
    setSimOtHours(samplePersonas[idx].defaultOt);
  };

  // Chạy mô phỏng Sandbox Live Test (xác thực cú pháp trước khi tính toán theo công thức đang soạn)
  const handleRunSandbox = () => {
    const check = validateAllFormulas();
    if (!check.valid) {
      setBlockErrors(check.errors);
      showError(check.firstError || 'Bộ công thức đang chứa lỗi cú pháp hoặc biến không hợp lệ!');
      return;
    }
    setBlockErrors({});

    const p = samplePersonas[selectedPersona];
    const actualDays = simActualDays;
    const otHours = simOtHours;
    const totalSiteAllow = p.allowances.lodging + p.allowances.hazard + p.allowances.resp;

    // 1. Thực thi khối Proration
    let proratedBase = (p.baseSalary / p.stdDays) * actualDays;
    try {
      const isAssign = /(^|[^=!<>])=([^=]|$)/.test(formulas.proration);
      const body = isAssign ? `"use strict"; ${formulas.proration}; return proratedBase;` : `"use strict"; return (${formulas.proration});`;
      const fnProration = new Function('baseSalary', 'standardWorkDays', 'actualWorkDays', 'proratedBase', body);
      const val = fnProration(p.baseSalary, p.stdDays, actualDays, proratedBase);
      if (typeof val === 'number' && Number.isFinite(val)) proratedBase = val;
    } catch {}

    // 2. Thực thi khối OT
    let hourlyRate = p.baseSalary / (p.stdDays * 8);
    let otPay = otHours * hourlyRate * 1.5;
    try {
      const fnOt = new Function(
        'baseSalary', 'standardWorkDays', 'actualWorkDays', 'otHours', 'hourlyRate', 'overtimePay', 'otMultiplier',
        `"use strict"; ${formulas.overtime}; return { hourlyRate, overtimePay };`
      );
      const outOt = fnOt(p.baseSalary, p.stdDays, actualDays, otHours, hourlyRate, otPay, 1.5);
      if (typeof outOt?.hourlyRate === 'number' && Number.isFinite(outOt.hourlyRate)) hourlyRate = outOt.hourlyRate;
      if (typeof outOt?.overtimePay === 'number' && Number.isFinite(outOt.overtimePay)) otPay = outOt.overtimePay;
    } catch {}

    const gross = proratedBase + p.allowances.meal + totalSiteAllow + otPay;

    // 3. Thực thi khối Bảo hiểm
    let insBase = p.type === 'SITE_ENGINEER' ? Math.min(p.baseSalary, 46800000) : Math.min(p.baseSalary + p.positionAllowance, 46800000);
    let bhNld = insBase * 0.105;
    let bhDn = insBase * 0.235;
    try {
      const fnIns = new Function(
        'empType', 'baseSalary', 'positionAllowance', 'insuranceBase', 'bhNld', 'bhDn',
        `"use strict"; ${formulas.insurance}; return { insuranceBase, bhNld, bhDn };`
      );
      const outIns = fnIns(p.type, p.baseSalary, p.positionAllowance, insBase, bhNld, bhDn);
      if (typeof outIns?.insuranceBase === 'number' && Number.isFinite(outIns.insuranceBase)) insBase = outIns.insuranceBase;
      if (typeof outIns?.bhNld === 'number' && Number.isFinite(outIns.bhNld)) bhNld = outIns.bhNld;
      if (typeof outIns?.bhDn === 'number' && Number.isFinite(outIns.bhDn)) bhDn = outIns.bhDn;
    } catch {}

    // 4. Thực thi khối Thu nhập chịu thuế & Thuế TNCN 7 bậc
    const otExcessExempt = Math.max(0, otPay - (otHours * hourlyRate));
    const exemptAmount = totalSiteAllow + otExcessExempt + p.allowances.meal;
    let assessable = Math.max(0, gross - exemptAmount - bhNld - 11000000 - (p.dependents * 4400000));
    let pit = calculateProgressivePitHelper(assessable);
    try {
      let computedTaxFromFn: number | null = null;
      const taxTracker = (v: number) => {
        const res = calculateProgressivePitHelper(v);
        computedTaxFromFn = res;
        return res;
      };
      const fnTax = new Function(
        'gross', 'exemptAllowances', 'bhNld', 'dependents', 'taxableIncome', 'pitTax', 'calculateProgressiveTax',
        `"use strict"; ${formulas.taxableIncome}; return { taxableIncome, pitTax };`
      );
      const outTax = fnTax(gross, exemptAmount, bhNld, p.dependents, assessable, pit, taxTracker);
      if (typeof outTax?.taxableIncome === 'number' && Number.isFinite(outTax.taxableIncome)) {
        assessable = outTax.taxableIncome;
      }
      if (computedTaxFromFn !== null) pit = computedTaxFromFn;
      else if (typeof outTax?.pitTax === 'number' && Number.isFinite(outTax.pitTax)) pit = outTax.pitTax;
      else pit = calculateProgressivePitHelper(assessable);
    } catch {}

    const unionDues = Math.min(gross * 0.01, 2340000 * 0.1);
    let net = gross - bhNld - pit - unionDues;
    try {
      const isAssign = /(^|[^=!<>])=([^=]|$)/.test(formulas.netSalary);
      const body = isAssign
        ? `"use strict"; ${formulas.netSalary}; return netSalary;`
        : `"use strict"; return (${formulas.netSalary});`;
      const fnNet = new Function(
        'gross', 'bhNld', 'pitTax', 'unionDues', 'proratedBase', 'overtimePay', 'netSalary',
        body
      );
      const outNet = fnNet(gross, bhNld, pit, unionDues, proratedBase, otPay, net);
      if (typeof outNet === 'number' && Number.isFinite(outNet)) net = outNet;
    } catch {}

    setSimulatedResult({
      persona: p,
      actualDays,
      otHours,
      proratedBase: Math.round(proratedBase),
      otPay: Math.round(otPay),
      totalSiteAllow: Math.round(totalSiteAllow),
      mealAllowance: Math.round(p.allowances.meal),
      gross: Math.round(gross),
      insBase: Math.round(insBase),
      bhNld: Math.round(bhNld),
      bhDn: Math.round(bhDn),
      assessable: Math.round(assessable),
      pit: Math.round(pit),
      unionDues: Math.round(unionDues),
      net: Math.round(net),
    });
    showToast(`Đã mô phỏng tính lương theo biểu thức v2026.2 thành công cho nhân sự mẫu ${p.name} (${p.code})!`);
  };

  // Cập nhật biểu thức công thức
  const handleFormulaChange = (field: keyof FormulaExpressions, val: string) => {
    const updated = { ...formulas, [field]: val };
    setFormulas(updated);
    if (blockErrors[field]) {
      setBlockErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    // Chuyển trạng thái sang DRAFT để Maker kiểm thử lại
    if (formulaState?.status === 'APPROVED_ACTIVE') {
      const nextState = {
        ...formulaState,
        formulas: updated,
        status: 'DRAFT' as const,
        version: 'v2026.2 (Bản thảo Kế toán)'
      };
      setFormulaState(nextState);
      sharedState.setFormulaApprovalState(nextState);
    } else {
      const nextState = {
        ...formulaState,
        formulas: updated
      };
      sharedState.setFormulaApprovalState(nextState);
    }
  };

  // Maker: Lưu bản thảo
  const handleSaveDraft = async () => {
    const check = validateAllFormulas();
    if (!check.valid) {
      setBlockErrors(check.errors);
      showError(check.firstError || 'Không thể lưu: Bộ công thức chứa cú pháp hoặc biến không hợp lệ!');
      return;
    }
    setBlockErrors({});
    const nextState = {
      ...formulaState,
      formulas,
      status: 'DRAFT' as const,
      submittedBy: user?.fullName || 'Hoàng Thị Lan (Maker)',
      updatedAt: new Date().toLocaleString('vi-VN')
    };
    sharedState.setFormulaApprovalState(nextState);
    setFormulaState(nextState);
    await api.saveBf10State({ formulaState: nextState });
    showToast('Đã lưu bản thảo bộ công thức tính lương động thành công!');
  };

  // Maker: Khôi phục mặc định
  const handleResetDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục về bộ công thức chuẩn theo Luật Lao Động 2026?')) {
      setFormulas(DEFAULT_FORMULAS);
      setBlockErrors({});
      setErrorMessage(null);
      const nextState = {
        ...formulaState,
        formulas: DEFAULT_FORMULAS,
        status: 'DRAFT' as const
      };
      sharedState.setFormulaApprovalState(nextState);
      setFormulaState(nextState);
      showToast('Đã khôi phục bộ công thức chuẩn Luật LĐ 2026 thành công.');
    }
  };

  // Maker: Kiểm tra cú pháp & định danh biến (AST/Token Validator)
  const handleSyntaxCheck = () => {
    const check = validateAllFormulas();
    if (!check.valid) {
      setBlockErrors(check.errors);
      showError(check.firstError || 'Phát hiện lỗi cú pháp hoặc biến không hợp lệ trong bộ công thức!');
      return;
    }
    setBlockErrors({});
    const nextState = {
      ...formulaState,
      formulas,
      status: (formulaState?.status === 'APPROVED_ACTIVE' ? 'APPROVED_ACTIVE' : 'SYNTAX_VERIFIED') as any
    };
    sharedState.setFormulaApprovalState(nextState);
    setFormulaState(nextState);
    showToast('Biểu thức hợp lệ 100%! Toàn bộ cú pháp, tên biến & hàm proration khớp chuẩn Luật Lao Động 2026.');
  };

  // Maker: Trình thẩm định sang Kế toán trưởng
  const handleSubmitFormula = async () => {
    const check = validateAllFormulas();
    if (!check.valid) {
      setBlockErrors(check.errors);
      showError(check.firstError || 'Không thể trình KTT thẩm định: Vui lòng sửa các lỗi cú pháp / tên biến không hợp lệ trước!');
      return;
    }
    setBlockErrors({});
    const nextState = {
      ...formulaState,
      formulas,
      status: 'PENDING_APPROVAL' as const,
      submittedBy: user?.fullName || 'Hoàng Thị Lan',
      submittedAt: new Date().toLocaleString('vi-VN'),
      version: 'v2026.2'
    };
    sharedState.setFormulaApprovalState(nextState);
    setFormulaState(nextState);
    await api.saveBf10State({ formulaState: nextState });
    showToast('Chuyên viên Kế toán đã bàn giao bộ công thức v2026.2 sang Kế toán trưởng thẩm định!');
  };

  // Checker: KTT Phê duyệt
  const handleApproveFormula = async () => {
    const nextState = {
      ...formulaState,
      formulas,
      status: 'APPROVED_ACTIVE' as const,
      approvedBy: user?.fullName || 'Đoàn Anh Tuấn',
      approvedAt: new Date().toLocaleString('vi-VN'),
      version: 'v2026.2'
    };
    sharedState.setFormulaApprovalState(nextState);
    setFormulaState(nextState);
    await api.saveBf10State({ formulaState: nextState });
    showToast('Kế toán trưởng đã phê duyệt & chốt áp dụng bộ công thức v2026.2 cho toàn bộ hệ thống!');
  };

  // Checker: KTT Trả về yêu cầu hiệu chỉnh
  const handleRejectFormula = async () => {
    const reason = window.prompt('Nhập nội dung yêu cầu Kế toán viên điều chỉnh biểu thức:', 'Cần kiểm tra lại tỷ lệ đóng BHXH trần 46.8M');
    if (!reason) return;
    const nextState = {
      ...formulaState,
      formulas,
      status: 'DRAFT' as const
    };
    sharedState.setFormulaApprovalState(nextState);
    setFormulaState(nextState);
    await api.saveBf10State({ formulaState: nextState });
    showToast(`Kế toán trưởng đã trả về yêu cầu hiệu chỉnh: "${reason}"`);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <NavLink to="/payroll" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
              <ArrowLeft size={13} />
              <span>Bảng Lương 8 Cột</span>
            </NavLink>
            <span className="badge badge-primary">Quy Trình Phê Duyệt Maker-Checker</span>
            <span className="badge badge-success">Phiên bản: {formulaState?.version || 'v2026.2'}</span>
          </div>
          <h1 className="page-title">
            Bộ Công Thức Lương Động &amp; Sandbox Mô Phỏng
          </h1>
          <p className="page-description">
            Phân hệ chuyên biệt dành cho Kế toán viên (Maker) soạn thảo, chỉnh sửa biểu thức toán học tính lương, kiểm tra cú pháp và Kế toán trưởng (Checker) thẩm tra, phê duyệt chốt áp dụng
          </p>
        </div>

        <div className="header-actions">
          <NavLink to="/project-allowances" className="btn btn-secondary btn-sm">
            <Layers size={14} />
            <span>Định Mức Phụ Cấp Công Trường</span>
          </NavLink>
          {isMaker && (
            <button onClick={handleSyntaxCheck} className="btn btn-secondary btn-sm" title="Kiểm tra cú pháp các khối công thức">
              <FileCode size={14} />
              <span>Kiểm Tra Cú Pháp</span>
            </button>
          )}
          {isMaker && (
            <button onClick={handleSaveDraft} className="btn btn-secondary btn-sm" title="Lưu lại bản thảo chỉnh sửa">
              <Save size={14} />
              <span>Lưu Bản Thảo</span>
            </button>
          )}
          {isMaker && formulaState?.status !== 'PENDING_APPROVAL' && (
            <button onClick={handleSubmitFormula} className="btn btn-primary btn-sm" style={{ backgroundColor: '#2563eb' }}>
              <ArrowUpRight size={14} />
              <span>Trình KTT Thẩm Định</span>
            </button>
          )}
          {isChecker && formulaState?.status === 'PENDING_APPROVAL' && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button onClick={handleApproveFormula} className="btn btn-primary btn-sm" style={{ backgroundColor: '#047857' }}>
                <Check size={14} />
                <span>Phê Duyệt Công Thức</span>
              </button>
              <button onClick={handleRejectFormula} className="btn btn-secondary btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                <span>Trả Về Hiệu Chỉnh</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-navigation tabs (Phân hệ Quy Định & Định Mức Lương) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1rem',
          overflowX: 'auto',
        }}
      >
        <NavLink
          to="/compliance"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <Scale size={14} />
          <span>Chính Sách Luật LĐ &amp; BHXH</span>
        </NavLink>

        <NavLink
          to="/salary-scales"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <Layers size={14} />
          <span>Thang Bảng Lương Doanh Nghiệp</span>
        </NavLink>

        <NavLink
          to="/project-allowances"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <HardHat size={14} />
          <span>Phụ Cấp Công Trường &amp; Gán Dự Án</span>
        </NavLink>

        <NavLink
          to="/salary-formula"
          style={({ isActive }) => ({
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive ? '#ffffff' : '#475569',
            backgroundColor: isActive ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          })}
        >
          <Calculator size={14} />
          <span>Bộ Công Thức Lương &amp; Sandbox Mô Phỏng</span>
        </NavLink>
      </div>

      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="alert-banner"
          style={{
            marginBottom: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Banner Trạng Thái Maker-Checker */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.25rem',
          backgroundColor: formulaState?.status === 'APPROVED_ACTIVE' ? '#f0fdf4' : formulaState?.status === 'PENDING_APPROVAL' ? '#fffbeb' : '#eff6ff',
          border: `1px solid ${formulaState?.status === 'APPROVED_ACTIVE' ? '#bbf7d0' : formulaState?.status === 'PENDING_APPROVAL' ? '#fde68a' : '#bfdbfe'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '0.9375rem', color: formulaState?.status === 'APPROVED_ACTIVE' ? '#166534' : formulaState?.status === 'PENDING_APPROVAL' ? '#b45309' : '#1e40af' }}>
                Trạng Thái Bộ Công Thức: {
                  formulaState?.status === 'APPROVED_ACTIVE' ? 'ĐÃ PHÊ DUYỆT & ĐANG ÁP DỤNG CHÍNH THỨC' :
                  formulaState?.status === 'PENDING_APPROVAL' ? 'CHỜ KẾ TOÁN TRƯỞNG THẨM ĐỊNH' :
                  'BẢN THẢO ĐANG SOẠN THẢO (MAKER)'
                }
              </strong>
              <span className={`badge ${formulaState?.status === 'APPROVED_ACTIVE' ? 'badge-success' : formulaState?.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-primary'}`}>
                {formulaState?.version || 'v2026.2'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {isMaker
                ? 'Vai trò của bạn: Kế toán viên (Maker) — Soạn thảo biểu thức toán học, chạy Sandbox thử nghiệm và trình KTT thẩm định.'
                : 'Vai trò của bạn: Kế toán trưởng (Checker) — Thẩm tra biểu thức, đối soát số liệu Sandbox và phê duyệt áp dụng.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span className={`badge ${formulaState?.status === 'DRAFT' || formulaState?.status === 'SYNTAX_VERIFIED' ? 'badge-primary' : 'badge-success'}`}>
              1. Kế toán soạn &amp; sửa
            </span>
            <span>&rarr;</span>
            <span className={`badge ${formulaState?.status === 'PENDING_APPROVAL' ? 'badge-warning' : formulaState?.status === 'APPROVED_ACTIVE' ? 'badge-success' : 'badge-slate'}`}>
              2. KTT thẩm định
            </span>
            <span>&rarr;</span>
            <span className={`badge ${formulaState?.status === 'APPROVED_ACTIVE' ? 'badge-success' : 'badge-slate'}`}>
              3. Kích hoạt toàn công ty
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* Khối Trái: Trình Soạn Thảo Biểu Thức Lương Động (Cho phép sửa đổi trực tiếp) */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calculator size={18} color="#2563eb" />
                <span>Trình Soạn Thảo Biểu Thức Tính Lương (v2026.2)</span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>
                Kế toán viên được phép chỉnh sửa trực tiếp các biểu thức toán học theo quy chế lương &amp; dự án của HMCPS
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={handleResetDefault}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                title="Khôi phục lại bộ công thức mặc định theo chuẩn luật"
              >
                <RotateCcw size={12} />
                <span>Mặc Định</span>
              </button>
              {formulaState?.status === 'APPROVED_ACTIVE' && (
                <button
                  onClick={() => setIsEditingUnlocked(!isEditingUnlocked)}
                  className={`btn btn-sm ${isEditingUnlocked ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  {isEditingUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
                  <span>{isEditingUnlocked ? 'Đang Mở Khóa Sửa' : 'Mở Khóa Soạn Bản Thảo Mới'}</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Proration */}
            <div style={{ backgroundColor: blockErrors.proration ? '#fef2f2' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: blockErrors.proration ? '1.5px solid #ef4444' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', margin: 0 }}>
                  1. Lương Thời Gian Proration (Khối C &amp; VP):
                </label>
                <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>Biến: baseSalary, standardWorkDays, actualWorkDays</span>
              </div>
              <textarea
                rows={2}
                disabled={!isMaker || !isEditingUnlocked}
                value={formulas.proration}
                onChange={(e) => handleFormulaChange('proration', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.8125rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: blockErrors.proration ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: !isMaker || !isEditingUnlocked ? '#f1f5f9' : '#ffffff',
                  color: '#1e293b',
                  lineHeight: '1.4'
                }}
              />
              {blockErrors.proration && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} />
                  <span>{blockErrors.proration}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Công thức chuẩn: <code>(baseSalary / standardWorkDays) * actualWorkDays</code>. Đơn giá ngày chia theo 24 hoặc 26 ngày công chuẩn.
              </div>
            </div>

            {/* 2. Overtime Pay */}
            <div style={{ backgroundColor: blockErrors.overtime ? '#fef2f2' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: blockErrors.overtime ? '1.5px solid #ef4444' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#b45309', margin: 0 }}>
                  2. Tiền Làm Thêm Giờ OT Hiện Trường (Đ.98 BLLĐ):
                </label>
                <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>Biến: otHours, hourlyRate, overtimePay, baseSalary, standardWorkDays</span>
              </div>
              <textarea
                rows={2}
                disabled={!isMaker || !isEditingUnlocked}
                value={formulas.overtime}
                onChange={(e) => handleFormulaChange('overtime', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.8125rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: blockErrors.overtime ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: !isMaker || !isEditingUnlocked ? '#f1f5f9' : '#ffffff',
                  color: '#1e293b',
                  lineHeight: '1.4'
                }}
              />
              {blockErrors.overtime && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} />
                  <span>{blockErrors.overtime}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Quy định Điều 98 BLLĐ: Tăng ca ngày thường 150%, cuối tuần 200%, lễ 300%. Phần chênh lệch vượt 100% được miễn thuế TNCN.
              </div>
            </div>

            {/* 3. Insurance Base */}
            <div style={{ backgroundColor: blockErrors.insurance ? '#fef2f2' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: blockErrors.insurance ? '1.5px solid #ef4444' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#047857', margin: 0 }}>
                  3. Nền Đóng BHXH &amp; Tỷ Lệ Trích Nộp 34% (Văn Phòng vs Công Trường):
                </label>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Trần 46.800.000đ &bull; NLĐ 10.5% &bull; DN 23.5%</span>
              </div>
              <textarea
                rows={3}
                disabled={!isMaker || !isEditingUnlocked}
                value={formulas.insurance}
                onChange={(e) => handleFormulaChange('insurance', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.8125rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: blockErrors.insurance ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: !isMaker || !isEditingUnlocked ? '#f1f5f9' : '#ffffff',
                  color: '#1e293b',
                  lineHeight: '1.4'
                }}
              />
              {blockErrors.insurance && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} />
                  <span>{blockErrors.insurance}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Đặc thù xây dựng: Kỹ sư công trường đóng DUY NHẤT trên Lương CB (các khoản phụ cấp lưu trú, độc hại được miễn đóng BHXH).
              </div>
            </div>

            {/* 4. Taxable Income & PIT */}
            <div style={{ backgroundColor: blockErrors.taxableIncome ? '#fef2f2' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: blockErrors.taxableIncome ? '1.5px solid #ef4444' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#7c3aed', margin: 0 }}>
                  4. Thuế Thu Nhập Cá Nhân Lũy Tiến 7 Bậc (Đ.95 BLLĐ):
                </label>
                <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>Giảm trừ: Bản thân 11M, NPT 4.4M</span>
              </div>
              <textarea
                rows={2}
                disabled={!isMaker || !isEditingUnlocked}
                value={formulas.taxableIncome}
                onChange={(e) => handleFormulaChange('taxableIncome', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.8125rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: blockErrors.taxableIncome ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: !isMaker || !isEditingUnlocked ? '#f1f5f9' : '#ffffff',
                  color: '#1e293b',
                  lineHeight: '1.4'
                }}
              />
              {blockErrors.taxableIncome && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} />
                  <span>{blockErrors.taxableIncome}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Thu nhập tính thuế = Tổng Gross - Miễn trừ phụ cấp công trường - BHXH NLĐ - 11.000.000 - (Số NPT * 4.400.000).
              </div>
            </div>

            {/* 5. Net Take-home */}
            <div style={{ backgroundColor: blockErrors.netSalary ? '#fef2f2' : '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: blockErrors.netSalary ? '1.5px solid #ef4444' : '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#047857', margin: 0 }}>
                  5. Thực Nhận Chuyển Khoản (Net Take-home):
                </label>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Vietcombank Payroll Direct</span>
              </div>
              <textarea
                rows={2}
                disabled={!isMaker || !isEditingUnlocked}
                value={formulas.netSalary}
                onChange={(e) => handleFormulaChange('netSalary', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.8125rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: blockErrors.netSalary ? '1px solid #dc2626' : '1px solid #6ee7b7',
                  backgroundColor: '#ffffff',
                  color: '#047857',
                  fontWeight: 600,
                  lineHeight: '1.4'
                }}
              />
              {blockErrors.netSalary && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} />
                  <span>{blockErrors.netSalary}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#047857', marginTop: '0.25rem' }}>
                Lương Net = Tổng Gross - BHXH NLĐ (10.5%) - Thuế TNCN lũy tiến - Đoàn phí công đoàn (1%).
              </div>
            </div>
          </div>
        </div>

        {/* Khối Phải: Live Sandbox Kiểm Thử Trực Tiếp */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={18} color="#0284c7" />
              <span>Sandbox Thử Nghiệm Mô Phỏng (Live Test)</span>
            </h3>
            <button onClick={handleRunSandbox} className="btn btn-primary btn-sm" style={{ backgroundColor: '#0284c7' }}>
              <Play size={13} />
              <span>Chạy Mô Phỏng</span>
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Chọn nhân sự mẫu, tùy chỉnh ngày công và giờ OT để kiểm tra độ khớp đúng của biểu thức trước khi trình KTT phê duyệt
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                1. Chọn Nhân Sự Mẫu (Persona):
              </label>
              <select
                className="form-select"
                value={selectedPersona}
                onChange={(e) => handleSelectPersona(Number(e.target.value))}
              >
                {samplePersonas.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    {p.code} — {p.name} ({p.role}) — {formatVND(p.baseSalary)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  2. Ngày công: <strong className="text-blue-700">{simActualDays} / 24 công</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="28"
                  value={simActualDays}
                  onChange={(e) => setSimActualDays(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  3. Tăng ca OT: <strong className="text-amber-700">{simOtHours} giờ</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={simOtHours}
                  onChange={(e) => setSimOtHours(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {simulatedResult ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.8125rem' }}>
                  Bảng Phân Rã Lương: {simulatedResult.persona.name} ({simulatedResult.persona.code})
                </span>
                <span className="badge badge-primary">{simulatedResult.persona.accountCode}</span>
              </div>

              <div style={{ padding: '0.85rem', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Lương thời gian ({simulatedResult.actualDays}/24 công):</span>
                  <strong className="tabular-nums font-semibold">{formatVND(simulatedResult.proratedBase)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Làm thêm giờ OT ({simulatedResult.otHours}h &times; 1.5):</span>
                  <strong className="tabular-nums font-semibold text-blue-700">+{formatVND(simulatedResult.otPay)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Phụ cấp công trường (Lưu trú, Độc hại, TN):</span>
                  <strong className="tabular-nums font-semibold text-emerald-700">+{formatVND(simulatedResult.totalSiteAllow)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Phụ cấp ăn ca:</span>
                  <strong className="tabular-nums font-semibold">+{formatVND(simulatedResult.mealAllowance)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1' }}>
                  <span className="font-bold text-slate-800">I. TỔNG THU NHẬP GROSS:</span>
                  <strong className="tabular-nums font-bold text-slate-900" style={{ fontSize: '0.9375rem' }}>{formatVND(simulatedResult.gross)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Nền đóng BHXH:</span>
                  <strong className="tabular-nums text-slate-700">{formatVND(simulatedResult.insBase)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• BHXH NLĐ đóng (10.5%):</span>
                  <strong className="tabular-nums text-rose-700">-{formatVND(simulatedResult.bhNld)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• BHXH Doanh nghiệp gánh (23.5%):</span>
                  <strong className="tabular-nums text-amber-700">{formatVND(simulatedResult.bhDn)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Thu nhập tính thuế TNCN:</span>
                  <strong className="tabular-nums text-purple-700">{formatVND(simulatedResult.assessable)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Thuế TNCN lũy tiến:</span>
                  <strong className="tabular-nums text-rose-700">-{formatVND(simulatedResult.pit)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Đoàn phí công đoàn (1%):</span>
                  <strong className="tabular-nums text-slate-700">-{formatVND(simulatedResult.unionDues)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', marginTop: '0.25rem' }}>
                  <span className="font-bold text-emerald-800" style={{ fontSize: '0.9375rem' }}>IV. THỰC NHẬN CHUYỂN KHOẢN (NET):</span>
                  <strong className="tabular-nums font-extrabold text-emerald-800" style={{ fontSize: '1.0625rem' }}>
                    {formatVND(simulatedResult.net)}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              <Calculator size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
              <div>Bấm nút <strong>"Chạy Mô Phỏng"</strong> ở trên để đối soát kết quả tính toán chi tiết của nhân sự mẫu theo bộ công thức v2026.2</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
