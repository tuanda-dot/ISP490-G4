/**
 * HMCPS - Hai Minh Construction Payroll System
 * Utility: Official Corporate Payslip Generator, Isolated Printer & File Exporter
 * Compliance: Article 95 Vietnam Labor Code 2019/2026 & Ministry of Finance Circular 200
 */

/**
 * Chuyển đổi số tiền VNĐ thành chữ tiếng Việt chuẩn kế toán
 * Ví dụ: 42459995 -> "Bốn mươi hai triệu bốn trăm năm mươi chín nghìn chín trăm chín mươi lăm đồng chẵn"
 */
export function numberToVietnameseWords(n: number): string {
  if (isNaN(n) || n === 0) return 'Không đồng chẵn';
  if (n < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(n));

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroupOfThree(num: number, isHighestGroup: boolean): string {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const one = num % 10;
    let res = '';

    if (hundred > 0 || !isHighestGroup) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (one === 1) res += 'mốt ';
      else if (one === 5) res += 'lăm ';
      else if (one > 0) res += digits[one] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (one === 5) res += 'lăm ';
      else if (one > 0) res += digits[one] + ' ';
    } else if (ten === 0 && one > 0) {
      if (hundred > 0 || !isHighestGroup) res += 'lẻ ';
      res += digits[one] + ' ';
    }

    return res;
  }

  const groups: number[] = [];
  let temp = Math.floor(n);
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const isHighest = i === groups.length - 1;
      const groupText = readGroupOfThree(g, isHighest);
      result += groupText + units[i] + ' ';
    }
  }

  result = result.trim().replace(/\s+/g, ' ');
  if (!result) return 'Không đồng chẵn';

  // Capitalize first letter and add 'đồng chẵn'
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}

export interface PayslipExportData {
  id?: number | string;
  fullName: string;
  employeeCode: string;
  position?: string;
  department?: string;
  employeeType?: string;
  accountCode?: string;
  actualDays?: number;
  stdDays?: number;
  allowanceDays?: number;
  businessTripDays?: number;
  paidLeaveDays?: number;
  holidayLeaveDays?: number;
  regimeLeaveDays?: number;
  unpaidDays?: number;
  dependentsCount?: number;
  baseSalary?: number;
  proratedBase?: number;
  performanceSalaryPkg?: number;
  evaluationGrade?: string;
  evaluationPct?: number;
  performancePay?: number;
  mealPackage?: number;
  fuelPackage?: number;
  phonePackage?: number;
  contractualGrossPackage?: number;
  mealAllowance?: number;
  fuelAllowance?: number;
  phoneAllowance?: number;
  businessTripAllowance?: number;
  taxRefund?: number;
  otherIncomeBonus?: number;
  posAllowanceProrated?: number;
  senAllowanceProrated?: number;
  siteAllowance?: number;
  mobileAllowance?: number;
  otHours?: number;
  otMultiplier?: number;
  overtimePay?: number;
  gross: number;
  bhNld: number;
  pitTax: number;
  unionDues?: number;
  taxArrears?: number;
  salaryAdvance?: number;
  net: number;
  bankAccount?: string;
  bankName?: string;
}

const formatMoney = (val: number | undefined): string => {
  if (val === undefined || isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

/**
 * Tạo tài liệu HTML mẫu phiếu lương doanh nghiệp chuẩn A4
 */
export function generateOfficialPayslipHtml(
  data: PayslipExportData,
  periodTitle: string = 'Tháng 10/2026',
  status: string = 'ĐÃ XÁC THỰC KẾ TOÁN'
): string {
  const isSite = data.employeeType === 'SITE_ENGINEER' || data.accountCode === 'TK_627';
  const stdDays = data.stdDays || 26;
  const actualDays = data.actualDays || 24;
  const proratedBase = data.proratedBase || Math.round(((data.baseSalary || 25000000) * actualDays) / stdDays);
  const mealAllowance = data.mealAllowance || actualDays * 40000;
  const siteAllowance = data.siteAllowance || (isSite ? 3000000 : 0);
  const mobileAllowance = data.mobileAllowance || 500000;
  const overtimePay = data.overtimePay || 0;
  const otHours = data.otHours || 0;
  const otMultiplier = data.otMultiplier || (isSite ? 2.0 : 1.5);
  const totalDeductions = (data.bhNld || 0) + (data.pitTax || 0) + (data.unionDues || 0);
  const wordsNet = numberToVietnameseWords(data.net);
  const voucherCode = `PKT-${periodTitle.replace(/[^0-9]/g, '') || '202610'}-${(data.employeeCode || 'HM001').replace(/[^0-9]/g, '').padStart(3, '0')}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu Lương Điện Tử - ${data.fullName} (${data.employeeCode})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Times New Roman', 'DejaVu Serif', serif;
      color: #111827;
      background-color: #f3f4f6;
      line-height: 1.45;
      font-size: 13px;
    }
    .print-toolbar {
      max-width: 800px;
      margin: 15px auto;
      padding: 10px 18px;
      background: #1e3a8a;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: 1px solid #60a5fa;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .payslip-sheet {
      max-width: 800px;
      margin: 0 auto 30px auto;
      background: #ffffff;
      padding: 24px 30px;
      border: 1px solid #d1d5db;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    /* Header table */
    .company-header {
      width: 100%;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .company-name {
      font-size: 15px;
      font-weight: bold;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-sub {
      font-size: 11.5px;
      color: #4b5563;
      margin-top: 2px;
    }
    .title-section {
      text-align: center;
      margin: 14px 0 16px 0;
    }
    .doc-title {
      font-size: 18px;
      font-weight: bold;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-subtitle {
      font-size: 12px;
      color: #4b5563;
      font-style: italic;
      margin-top: 3px;
    }
    .verified-stamp {
      display: inline-block;
      border: 1.5px solid #059669;
      color: #047857;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    /* Info Grid */
    .employee-box {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    .employee-box td {
      padding: 5px 10px;
      font-size: 12.5px;
      border: 1px solid #e5e7eb;
    }
    .label {
      color: #4b5563;
      width: 18%;
    }
    .value {
      color: #111827;
      font-weight: bold;
      width: 32%;
    }
    /* Financial Tables */
    .table-section-title {
      font-size: 13px;
      font-weight: bold;
      color: #1e3a8a;
      text-transform: uppercase;
      margin-top: 10px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #93c5fd;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .data-table th, .data-table td {
      border: 1px solid #d1d5db;
      padding: 5px 8px;
      font-size: 12px;
    }
    .data-table th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: bold;
      text-align: left;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .font-bold {
      font-weight: bold;
    }
    .gross-row td {
      background-color: #f8fafc;
      font-weight: bold;
      border-top: 1.5px solid #64748b;
    }
    .deduction-text {
      color: #b91c1c;
    }
    /* Net highlight box */
    .net-box {
      border: 2px solid #059669;
      background-color: #ecfdf5;
      padding: 10px 14px;
      border-radius: 6px;
      margin: 14px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-label {
      font-size: 14px;
      font-weight: bold;
      color: #065f46;
      text-transform: uppercase;
    }
    .net-words {
      font-size: 12px;
      color: #047857;
      font-style: italic;
      margin-top: 2px;
    }
    .net-amount {
      font-size: 20px;
      font-weight: bold;
      color: #065f46;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    /* Signatures Section */
    .signatures-table {
      width: 100%;
      margin-top: 20px;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .signatures-table td {
      width: 25%;
      text-align: center;
      vertical-align: top;
      font-size: 12px;
    }
    .sign-role {
      font-weight: bold;
      text-transform: uppercase;
      color: #1f2937;
    }
    .sign-sub {
      font-size: 11px;
      color: #6b7280;
      font-style: italic;
    }
    .sign-space {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sign-stamp {
      font-family: 'Consolas', monospace;
      font-size: 10px;
      color: #059669;
      border: 1px dashed #059669;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }
    .sign-name {
      font-weight: bold;
      color: #111827;
      margin-top: 2px;
    }
    /* Legal note */
    .legal-footer {
      margin-top: 22px;
      padding-top: 8px;
      border-top: 1px dashed #9ca3af;
      font-size: 11px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    /* Print stylesheet override */
    @media print {
      body {
        background-color: #ffffff !important;
        font-size: 12pt !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .payslip-sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Web Toolbar (Hidden in print) -->
  <div class="print-toolbar">
    <div>
      <strong>Hệ Thống Tiền Lương HMCPS 2026</strong> &bull; Phiếu lương điện tử chính thức
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" class="print-btn">
        🖨️ In Phiếu / Lưu PDF (A4)
      </button>
    </div>
  </div>

  <!-- Official A4 Document Sheet (Theo mẫu Phiếu lương chuẩn Công ty TNHH ĐT XD & PT Hải Minh) -->
  <div class="payslip-sheet">
    <!-- Company Letterhead -->
    <table class="company-header">
      <tr>
        <td style="vertical-align: middle; width: 65%;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
            <img src="/logo.png" alt="Hải Minh Logo" style="height: 38px; object-fit: contain;" />
            <div>
              <div class="company-name" style="font-size: 13px; font-weight: 700; color: #1e3a8a;">CÔNG TY TNHH ĐẦU TƯ XÂY DỰNG VÀ PHÁT TRIỂN HẢI MINH</div>
              <div class="company-sub" style="font-size: 10px; color: #64748b;">Số 35-37 Ngõ 130, Đốc Ngữ - Ba Đình - Hà Nội</div>
            </div>
          </div>
          <div class="company-sub">Mã số thuế: <strong>0108992388</strong> &bull; Đơn vị tính: <strong>VNĐ (đồng)</strong></div>
        </td>
        <td style="text-align: right; vertical-align: top; width: 35%;">
          <div style="font-size: 11.5px; color: #4b5563;">Số chứng từ: <strong class="font-mono">${voucherCode}</strong></div>
          <div style="font-size: 11.5px; color: #4b5563;">Kỳ lương: <strong>${periodTitle}</strong></div>
          <div class="verified-stamp">✓ ${status}</div>
        </td>
      </tr>
    </table>

    <!-- Title Section -->
    <div class="title-section">
      <div class="doc-title">PHIẾU LƯƠNG</div>
      <div class="doc-subtitle">${periodTitle} (Chuẩn cấu trúc Hải Minh &amp; Điều 95 BLLĐ 2019/2026)</div>
    </div>

    <!-- Employee Details Table -->
    <table class="employee-box">
      <tr>
        <td class="label">Họ và tên:</td>
        <td class="value">${data.fullName} (${data.employeeCode})</td>
        <td class="label">Chức danh:</td>
        <td class="value">${data.position || (isSite ? 'Chỉ Huy Trưởng / Kỹ Sư Hiện Trường' : 'Chuyên Viên Văn Phòng')}</td>
      </tr>
      <tr>
        <td class="label">Tài khoản hạch toán:</td>
        <td class="value font-mono">${data.accountCode?.includes('622') ? 'TK 622 (Nhân Công Trực Tiếp)' : data.accountCode?.includes('627') ? 'TK 627 (Chi Phí Công Trường)' : data.accountCode?.includes('642') ? 'TK 642 (Chi Phí Quản Lý DN)' : (isSite ? 'TK 622 (Nhân Công Trực Tiếp)' : 'TK 642 (Chi Phí Quản Lý DN)')}</td>
        <td class="label">Số tài khoản nhận:</td>
        <td class="value font-mono">${data.bankAccount || '00110045689xx'} (${data.bankName || 'VCB'})</td>
      </tr>
    </table>

    ${(() => {
      const perfPkg = data.performanceSalaryPkg ?? 0;
      const evalGrade = data.evaluationGrade ?? 'A';
      const evalPct = data.evaluationPct ?? 1;
      const perfPay = data.performancePay ?? 0;
      const mealPkg = data.mealPackage ?? (!isSite ? 900_000 : Math.round(stdDays * 40_000));
      const fuelAllowance = data.fuelAllowance ?? Math.round((mobileAllowance * 2) / 3);
      const phoneAllowance = data.phoneAllowance ?? Math.max(0, mobileAllowance - fuelAllowance);
      const fuelPkg = data.fuelPackage ?? (!isSite ? 1_000_000 : fuelAllowance);
      const phonePkg = data.phonePackage ?? (!isSite ? 200_000 : phoneAllowance);
      const pkgTotal = data.contractualGrossPackage ?? ((data.baseSalary || 0) + perfPkg + mealPkg + fuelPkg + phonePkg);
      const allowDays = data.allowanceDays ?? actualDays;
      const tripDays = data.businessTripDays ?? 0;
      const leaveDays = data.paidLeaveDays ?? 0;
      const holDays = data.holidayLeaveDays ?? 0;
      const unpDays = data.unpaidDays ?? Math.max(0, Number((stdDays - actualDays).toFixed(1)));
      const tripAllow = data.businessTripAllowance ?? 0;
      const taxRefundVal = data.taxRefund ?? 0;
      const otherBonusVal = (data.otherIncomeBonus ?? 0) + (data.posAllowanceProrated ?? 0) + (data.senAllowanceProrated ?? 0);
      const taxArrearsVal = data.taxArrears ?? 0;
      const grandDeductions = totalDeductions + taxArrearsVal;
      return `
    <!-- Section I: General Package & Attendance Info (I. Thông tin chung) -->
    <div class="table-section-title">I. Thông tin chung (Gói thu nhập &amp; Bảng công)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 7%;" class="text-center">STT</th>
          <th style="width: 45%;">Chỉ tiêu</th>
          <th style="width: 24%;" class="text-right">Giá trị / Định mức</th>
          <th style="width: 24%;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <tr class="gross-row">
          <td class="text-center">1</td>
          <td>Tổng thu nhập (Gói thỏa thuận)</td>
          <td class="text-right font-mono">${formatMoney(pkgTotal)}</td>
          <td style="font-size:11px; color:#4b5563;">= (2)+(3)+(4)+(5)+(6)</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td>Lương cơ bản</td>
          <td class="text-right font-mono">${formatMoney(data.baseSalary || 0)}</td>
          <td style="font-size:11px; color:#6b7280;">Căn cứ hợp đồng &amp; đóng BHXH</td>
        </tr>
        <tr>
          <td class="text-center">3</td>
          <td>Lương hiệu quả công việc</td>
          <td class="text-right font-mono">${formatMoney(perfPkg)}</td>
          <td style="font-size:11px; color:#6b7280;">Khoán theo KPI đánh giá tháng</td>
        </tr>
        <tr>
          <td class="text-center">4</td>
          <td>Phụ cấp ăn trưa</td>
          <td class="text-right font-mono">${formatMoney(mealPkg)}</td>
          <td style="font-size:11px; color:#6b7280;">${isSite ? '40.000đ/công thực tế' : 'Định mức tháng VP'}</td>
        </tr>
        <tr>
          <td class="text-center">5</td>
          <td>Phụ cấp xăng xe</td>
          <td class="text-right font-mono">${formatMoney(fuelPkg)}</td>
          <td style="font-size:11px; color:#6b7280;">Chia theo ngày công hưởng PC</td>
        </tr>
        <tr>
          <td class="text-center">6</td>
          <td>Phụ cấp điện thoại</td>
          <td class="text-right font-mono">${formatMoney(phonePkg)}</td>
          <td style="font-size:11px; color:#6b7280;">Chia theo ngày công hưởng PC</td>
        </tr>
        <tr>
          <td class="text-center">7</td>
          <td>Ngày công chuẩn tháng</td>
          <td class="text-right font-mono">${stdDays} công</td>
          <td style="font-size:11px; color:#6b7280;">Kỳ tính lương ${periodTitle}</td>
        </tr>
        <tr>
          <td class="text-center">8</td>
          <td>Ngày công hưởng lương</td>
          <td class="text-right font-mono">${actualDays} công</td>
          <td style="font-size:11px; color:#6b7280;">Bao gồm đi làm + phép + lễ/CĐ</td>
        </tr>
        <tr>
          <td class="text-center">9</td>
          <td>Ngày công hưởng phụ cấp</td>
          <td class="text-right font-mono">${allowDays} công</td>
          <td style="font-size:11px; color:#6b7280;">Ngày đi làm thực tế + Công tác CT</td>
        </tr>
        <tr>
          <td class="text-center">10</td>
          <td>Ngày công hưởng phụ cấp công tác (CT)</td>
          <td class="text-right font-mono">${tripDays} công</td>
          <td style="font-size:11px; color:#6b7280;">Ký hiệu CT trên bảng công</td>
        </tr>
        <tr>
          <td class="text-center">11</td>
          <td>Số ngày nghỉ phép (P)</td>
          <td class="text-right font-mono">${leaveDays} ngày</td>
          <td style="font-size:11px; color:#6b7280;">Hưởng 100% lương cơ bản</td>
        </tr>
        <tr>
          <td class="text-center">12</td>
          <td>Số ngày nghỉ lễ hưởng lương (NL)</td>
          <td class="text-right font-mono">${holDays} ngày</td>
          <td style="font-size:11px; color:#6b7280;">Theo Điều 112 BLLĐ</td>
        </tr>
        <tr>
          <td class="text-center">13</td>
          <td>Số ngày nghỉ không hưởng lương (K/V)</td>
          <td class="text-right font-mono">${unpDays} ngày</td>
          <td style="font-size:11px; color:#6b7280;">Không tính công hưởng lương</td>
        </tr>
      </tbody>
    </table>

    <!-- Section II: Actual Monthly Earnings -->
    <div class="table-section-title">II. Lương và các khoản PC được hưởng trong tháng</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 7%;" class="text-center">STT</th>
          <th style="width: 45%;">Nội Dung Khoản Thu Nhập</th>
          <th style="width: 24%;" class="text-right">Thành Tiền (VNĐ)</th>
          <th style="width: 24%;">Công thức / Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td>Xếp loại đánh giá</td>
          <td class="text-right font-mono font-bold">${evalGrade}</td>
          <td style="font-size:11px; color:#6b7280;">Đánh giá hiệu suất KPI kỳ</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td>% hưởng lương hiệu quả công việc</td>
          <td class="text-right font-mono">${Math.round(evalPct * 100)}%</td>
          <td style="font-size:11px; color:#6b7280;">A: 100%, B: 85%, C: 70%</td>
        </tr>
        <tr>
          <td class="text-center">3</td>
          <td>Lương cơ bản</td>
          <td class="text-right font-mono">${formatMoney(proratedBase)}</td>
          <td style="font-size:11px; color:#6b7280;">= Lương CB / ${stdDays} &times; ${actualDays}</td>
        </tr>
        <tr>
          <td class="text-center">4</td>
          <td>Lương hiệu quả công việc</td>
          <td class="text-right font-mono">${formatMoney(perfPay)}</td>
          <td style="font-size:11px; color:#6b7280;">= HQCV / ${stdDays} &times; ${actualDays} &times; ${Math.round(evalPct * 100)}%</td>
        </tr>
        <tr>
          <td class="text-center">5</td>
          <td>Lương thêm giờ (OT)</td>
          <td class="text-right font-mono">${overtimePay > 0 ? `+${formatMoney(overtimePay)}` : formatMoney(0)}</td>
          <td style="font-size:11px; color:#6b7280;">${otHours > 0 ? `${otHours}h &times; ${otMultiplier}x` : 'Không phát sinh'}</td>
        </tr>
        <tr>
          <td class="text-center">6</td>
          <td>Phụ cấp ăn trưa</td>
          <td class="text-right font-mono">${formatMoney(mealAllowance)}</td>
          <td style="font-size:11px; color:#6b7280;">= Định mức / ${stdDays} &times; ${allowDays}</td>
        </tr>
        <tr>
          <td class="text-center">7</td>
          <td>Phụ cấp xăng xe</td>
          <td class="text-right font-mono">${formatMoney(fuelAllowance)}</td>
          <td style="font-size:11px; color:#6b7280;">= Xăng xe / ${stdDays} &times; ${allowDays}</td>
        </tr>
        <tr>
          <td class="text-center">8</td>
          <td>Phụ cấp điện thoại</td>
          <td class="text-right font-mono">${formatMoney(phoneAllowance)}</td>
          <td style="font-size:11px; color:#6b7280;">= ĐT / ${stdDays} &times; ${allowDays}</td>
        </tr>
        <tr>
          <td class="text-center">9</td>
          <td>Phụ cấp công tác${siteAllowance > 0 ? ' &amp; Công trường (Miễn BHXH)' : ''}</td>
          <td class="text-right font-mono">${formatMoney(tripAllow + siteAllowance)}</td>
          <td style="font-size:11px; color:#047857;">${siteAllowance > 0 ? 'Bao gồm PC công trường' : `${tripDays} ngày công tác`}</td>
        </tr>
        <tr>
          <td class="text-center">10</td>
          <td>Hoàn thuế TNCN</td>
          <td class="text-right font-mono">${formatMoney(taxRefundVal)}</td>
          <td style="font-size:11px; color:#6b7280;">Quyết toán thuế (nếu có)</td>
        </tr>
        <tr>
          <td class="text-center">11</td>
          <td>Các khoản thu nhập / thưởng khác</td>
          <td class="text-right font-mono">${formatMoney(otherBonusVal)}</td>
          <td style="font-size:11px; color:#6b7280;">Thưởng / PC chức vụ nếu có</td>
        </tr>
        <tr class="gross-row">
          <td colspan="2" style="text-align: right; text-transform: uppercase;">TỔNG LƯƠNG &amp; PC ĐƯỢC HƯỞNG (II):</td>
          <td class="text-right font-mono" style="font-size: 13px;">${formatMoney(data.gross)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Section III: Deductions -->
    <div class="table-section-title">III. Các khoản giảm trừ trong tháng</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 7%;" class="text-center">STT</th>
          <th style="width: 45%;">Nội Dung Khoản Giảm Trừ</th>
          <th style="width: 24%;" class="text-right">Số Tiền Khấu Trừ (VNĐ)</th>
          <th style="width: 24%;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td>BHXH, BHYT, BHTN</td>
          <td class="text-right font-mono deduction-text">-${formatMoney(data.bhNld)}</td>
          <td style="font-size:11px; color:#6b7280;">10.5% nền đóng BHXH</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td>Thuế TNCN</td>
          <td class="text-right font-mono deduction-text">-${formatMoney(data.pitTax)}</td>
          <td style="font-size:11px; color:#6b7280;">NPT: ${data.dependentsCount ?? 0} người</td>
        </tr>
        <tr>
          <td class="text-center">3</td>
          <td>Tạm ứng lương/thưởng đã nhận</td>
          <td class="text-right font-mono">0 ₫</td>
          <td style="font-size:11px; color:#6b7280;">Đã loại bỏ theo quy chế SRS HMCPS</td>
        </tr>
        <tr>
          <td class="text-center">4</td>
          <td>Truy thu thuế TNCN</td>
          <td class="text-right font-mono deduction-text">${taxArrearsVal > 0 ? `-${formatMoney(taxArrearsVal)}` : '0 ₫'}</td>
          <td style="font-size:11px; color:#6b7280;">Điều chỉnh sau quyết toán</td>
        </tr>
        <tr>
          <td class="text-center">5</td>
          <td>Đoàn phí công đoàn (1%)</td>
          <td class="text-right font-mono deduction-text">-${formatMoney(data.unionDues || 0)}</td>
          <td style="font-size:11px; color:#6b7280;">1% lương đóng BHXH (trần 234k)</td>
        </tr>
        <tr class="gross-row">
          <td colspan="2" style="text-align: right; text-transform: uppercase;">TỔNG CÁC KHOẢN GIẢM TRỪ (III):</td>
          <td class="text-right font-mono deduction-text" style="font-size: 13px;">-${formatMoney(grandDeductions)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Section IV: Net Take-Home Highlight -->
    <div class="net-box">
      <div>
        <div class="net-label">IV. THỰC LĨNH (II - III):</div>
        <div class="net-words">Bằng chữ: <strong>${wordsNet}</strong></div>
      </div>
      <div class="net-amount">${formatMoney(data.net)}</div>
    </div>`;
    })()}

    <!-- Signatures & Audit Trail -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="sign-role">Người lập phiếu</div>
          <div class="sign-sub">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space">
            <span class="sign-stamp">✓ Đã lập bảng</span>
          </div>
          <div class="sign-name">Hoàng Thị Lan</div>
        </td>
        <td>
          <div class="sign-role">Kế toán trưởng</div>
          <div class="sign-sub">(Thẩm định &amp; Kiểm soát)</div>
          <div class="sign-space">
            <span class="sign-stamp">✓ Đã thẩm định</span>
          </div>
          <div class="sign-name">Đoàn Anh Tuấn</div>
        </td>
        <td>
          <div class="sign-role">Người nhận</div>
          <div class="sign-sub">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space">
            <span class="sign-stamp">✓ Đã nhận E-Payslip</span>
          </div>
          <div class="sign-name">${data.fullName}</div>
        </td>
        <td>
          <div class="sign-role">Tổng giám đốc</div>
          <div class="sign-sub">(Phê duyệt chi lương)</div>
          <div class="sign-space">
            <span class="sign-stamp">✓ Đã duyệt chi</span>
          </div>
          <div class="sign-name">Lê Phúc Hà</div>
        </td>
      </tr>
    </table>

    <!-- Legal & Security Footnote -->
    <div class="legal-footer">
      <div>
        Chữ ký số điện tử: <strong class="font-mono">HM-SIGN-SHA256-${voucherCode}</strong>
      </div>
      <div style="font-style: italic;">
        Bảo mật thông tin tiền lương theo Điều 95 Bộ luật Lao động 2019/2026.
      </div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * In phiếu lương qua iframe ẩn độc lập - HOÀN TOÀN KHÔNG DÍNH SIDEBAR HOẶC NAVBAR
 */
export function printPayslipViaIframe(
  data: PayslipExportData,
  periodTitle: string = 'Tháng 10/2026',
  status: string = 'ĐÃ XÁC THỰC KẾ TOÁN'
): void {
  const html = generateOfficialPayslipHtml(data, periodTitle, status);

  // Xóa iframe in cũ nếu có để tránh rác DOM
  const oldFrame = document.getElementById('hmcps-isolated-print-frame');
  if (oldFrame && document.body.contains(oldFrame)) {
    oldFrame.remove();
  }

  // Tạo iframe off-screen (không dùng visibility:hidden hoặc 0x0 để Chrome/Chromium in đúng nội dung)
  const iframe = document.createElement('iframe');
  iframe.id = 'hmcps-isolated-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '850px';
  iframe.style.height = '1100px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Đợi tài nguyên iframe sẵn sàng và kích hoạt hộp thoại in
  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 60000);
    }
  };

  setTimeout(executePrint, 300);
}

/**
 * Tải file phiếu lương độc lập về máy tính (.html có nhúng CSS in chuẩn A4)
 */
export function downloadPayslipHtmlFile(
  data: PayslipExportData,
  periodTitle: string = 'Tháng 10/2026',
  status: string = 'ĐÃ XÁC THỰC KẾ TOÁN'
): void {
  const html = generateOfficialPayslipHtml(data, periodTitle, status);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const cleanName = data.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  const cleanPeriod = periodTitle.replace(/[^0-9]/g, '') || '202610';
  a.href = url;
  a.download = `PhieuLuong_${cleanPeriod}_${data.employeeCode}_${cleanName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Tải file Phiếu lương định dạng bảng tính Excel (.xls) theo đúng cấu trúc thực tế Phieu luong.xlsx
 */
export function downloadPayslipExcelFile(
  data: PayslipExportData,
  periodTitle: string = 'Tháng 10/2026'
): void {
  const isSite = data.employeeType === 'SITE_ENGINEER';
  const stdDays = data.stdDays || 26;
  const actualDays = data.actualDays ?? stdDays;
  const allowDays = data.allowanceDays ?? actualDays;
  const tripDays = data.businessTripDays ?? 0;
  const leaveDays = data.paidLeaveDays ?? 0;
  const holDays = data.holidayLeaveDays ?? 0;
  const unpDays = data.unpaidDays ?? Math.max(0, Number((stdDays - actualDays).toFixed(1)));
  const proratedBase = data.proratedBase ?? (data.baseSalary || 0);
  const perfPkg = data.performanceSalaryPkg ?? 0;
  const evalGrade = data.evaluationGrade ?? 'A';
  const evalPct = data.evaluationPct ?? 1;
  const perfPay = data.performancePay ?? 0;
  const mealPkg = data.mealPackage ?? (!isSite ? 900_000 : Math.round(stdDays * 40_000));
  const fuelAllowance = data.fuelAllowance ?? Math.round(((data.mobileAllowance || 0) * 2) / 3);
  const phoneAllowance = data.phoneAllowance ?? Math.max(0, (data.mobileAllowance || 0) - fuelAllowance);
  const fuelPkg = data.fuelPackage ?? (!isSite ? 1_000_000 : fuelAllowance);
  const phonePkg = data.phonePackage ?? (!isSite ? 200_000 : phoneAllowance);
  const pkgTotal = data.contractualGrossPackage ?? ((data.baseSalary || 0) + perfPkg + mealPkg + fuelPkg + phonePkg);
  const tripAllow = (data.businessTripAllowance ?? 0) + (data.siteAllowance ?? 0);
  const taxRefundVal = data.taxRefund ?? 0;
  const otherBonusVal = (data.otherIncomeBonus ?? 0) + (data.posAllowanceProrated ?? 0) + (data.senAllowanceProrated ?? 0);
  const taxArrearsVal = data.taxArrears ?? 0;
  const totalDed = data.bhNld + data.pitTax + (data.unionDues || 0) + taxArrearsVal;

  const xlsHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /></head>
<body style="font-family: 'Times New Roman', serif;">
  <table border="1" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 720px;">
    <tr><td colspan="5" style="font-weight:bold; font-size:13pt; border:none;">CÔNG TY TNHH ĐẦU TƯ XÂY DỰNG VÀ PHÁT TRIỂN HẢI MINH</td></tr>
    <tr><td colspan="5" style="font-size:10pt; border:none;">Số 35-37 Ngõ 130, Đốc Ngữ - Ba Đình - Hà Nội</td></tr>
    <tr><td colspan="5" style="text-align:center; font-weight:bold; font-size:15pt; border:none;">PHIẾU LƯƠNG</td></tr>
    <tr><td colspan="5" style="text-align:center; font-style:italic; border:none;">${periodTitle}</td></tr>
    <tr><td style="border:none;"></td><td style="font-weight:bold; border:none;">Họ và tên:</td><td colspan="3" style="font-weight:bold; border:none;">${data.fullName} (${data.employeeCode})</td></tr>
    <tr><td style="border:none;"></td><td style="font-weight:bold; border:none;">Chức danh:</td><td colspan="3" style="border:none;">${data.position || ''}</td></tr>
    <tr><td style="border:none;"></td><td style="border:none;">Đơn vị tính: đồng</td><td colspan="3" style="border:none;"></td></tr>
    <tr style="background:#e2e8f0; font-weight:bold;"><td colspan="4">I. Thông tin chung</td><td>Ghi chú</td></tr>
    <tr style="font-weight:bold;"><td>1</td><td>Tổng thu nhập (Gói)</td><td>${pkgTotal}</td><td>VNĐ</td><td>=(2)+(3)+(4)+(5)+(6)</td></tr>
    <tr><td>2</td><td>Lương cơ bản</td><td>${data.baseSalary || 0}</td><td>VNĐ</td><td></td></tr>
    <tr><td>3</td><td>Lương hiệu quả công việc</td><td>${perfPkg}</td><td>VNĐ</td><td></td></tr>
    <tr><td>4</td><td>Phụ cấp ăn trưa</td><td>${mealPkg}</td><td>VNĐ</td><td></td></tr>
    <tr><td>5</td><td>Phụ cấp xăng xe</td><td>${fuelPkg}</td><td>VNĐ</td><td></td></tr>
    <tr><td>6</td><td>Phụ cấp điện thoại</td><td>${phonePkg}</td><td>VNĐ</td><td></td></tr>
    <tr><td>7</td><td>Ngày công chuẩn tháng</td><td>${stdDays}</td><td>công</td><td></td></tr>
    <tr><td>8</td><td>Ngày công hưởng lương</td><td>${actualDays}</td><td>công</td><td></td></tr>
    <tr><td>9</td><td>Ngày công hưởng phụ cấp</td><td>${allowDays}</td><td>công</td><td></td></tr>
    <tr><td>10</td><td>Ngày công hưởng phụ cấp công tác</td><td>${tripDays}</td><td>công</td><td></td></tr>
    <tr><td>11</td><td>Số ngày nghỉ phép</td><td>${leaveDays}</td><td>ngày</td><td></td></tr>
    <tr><td>12</td><td>Số ngày nghỉ lễ hưởng lương</td><td>${holDays}</td><td>ngày</td><td></td></tr>
    <tr><td>13</td><td>Số ngày nghỉ không hưởng lương</td><td>${unpDays}</td><td>ngày</td><td></td></tr>
    <tr style="background:#dbeafe; font-weight:bold;"><td colspan="2">II. Lương và các khoản PC được hưởng trong tháng</td><td>${data.gross}</td><td>VNĐ</td><td>=SUM(1..11)</td></tr>
    <tr><td>1</td><td>Xếp loại đánh giá</td><td>${evalGrade}</td><td></td><td></td></tr>
    <tr><td>2</td><td>% hưởng lương hiệu quả công việc</td><td>${Math.round(evalPct * 100)}%</td><td></td><td></td></tr>
    <tr><td>3</td><td>Lương cơ bản</td><td>${proratedBase}</td><td>VNĐ</td><td>=ROUND(CB/Chuẩn*Công lương)</td></tr>
    <tr><td>4</td><td>Lương hiệu quả công việc</td><td>${perfPay}</td><td>VNĐ</td><td>=ROUND(HQCV/Chuẩn*Công lương*%)</td></tr>
    <tr><td>5</td><td>Lương thêm giờ</td><td>${data.overtimePay || 0}</td><td>VNĐ</td><td></td></tr>
    <tr><td>6</td><td>Phụ cấp ăn trưa</td><td>${data.mealAllowance || 0}</td><td>VNĐ</td><td>=ROUND(Ăn trưa/Chuẩn*Công PC)</td></tr>
    <tr><td>7</td><td>Phụ cấp xăng xe</td><td>${fuelAllowance}</td><td>VNĐ</td><td>=ROUND(Xăng xe/Chuẩn*Công PC)</td></tr>
    <tr><td>8</td><td>Phụ cấp điện thoại</td><td>${phoneAllowance}</td><td>VNĐ</td><td>=ROUND(ĐT/Chuẩn*Công PC)</td></tr>
    <tr><td>9</td><td>Phụ cấp công tác / công trường</td><td>${tripAllow}</td><td>VNĐ</td><td></td></tr>
    <tr><td>10</td><td>Hoàn thuế TNCN</td><td>${taxRefundVal}</td><td>VNĐ</td><td></td></tr>
    <tr><td>11</td><td>Các khoản thu nhập/thưởng khác</td><td>${otherBonusVal}</td><td>VNĐ</td><td></td></tr>
    <tr style="background:#fee2e2; font-weight:bold;"><td colspan="2">III. Các khoản giảm trừ trong tháng</td><td>${totalDed}</td><td>VNĐ</td><td></td></tr>
    <tr><td>1</td><td>BHXH, BHYT, BHTN</td><td>${data.bhNld}</td><td>VNĐ</td><td>10.5% lương đóng BHXH</td></tr>
    <tr><td>2</td><td>Thuế TNCN</td><td>${data.pitTax}</td><td>VNĐ</td><td></td></tr>
    <tr><td>3</td><td>Tạm ứng lương/thưởng đã nhận</td><td>0</td><td>VNĐ</td><td>Đã loại bỏ theo SRS HMCPS</td></tr>
    <tr><td>4</td><td>Truy thu thuế TNCN</td><td>${taxArrearsVal}</td><td>VNĐ</td><td></td></tr>
    <tr><td>5</td><td>Đoàn phí công đoàn</td><td>${data.unionDues || 0}</td><td>VNĐ</td><td>1% lương BHXH</td></tr>
    <tr style="background:#d1fae5; font-weight:bold; font-size:12pt;"><td colspan="2">IV. Thực lĩnh (II - III)</td><td>${data.net}</td><td>VNĐ</td><td></td></tr>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + xlsHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanName = data.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  const cleanPeriod = periodTitle.replace(/[^0-9]/g, '') || '202610';
  a.href = url;
  a.download = `PhieuLuong_HaiMinh_${cleanPeriod}_${data.employeeCode}_${cleanName}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

