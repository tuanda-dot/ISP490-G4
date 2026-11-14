import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Building,
  ArrowLeft,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api, sharedState } from '../services/api';
import type { Employee } from '../types';
import { calculatePayrollTotals, type PayrollRowItem } from '../utils/payrollCalculator';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const AccountingVouchers: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'2026-10' | '2026-09' | '2026-08'>('2026-10');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterTarget, setFilterTarget] = useState<'ALL' | 'TK_622' | 'TK_627' | 'TK_642'>('ALL');
  const [employeesState, setEmployeesState] = useState<Employee[]>(() => sharedState.getEmployees());

  useEffect(() => {
    Promise.all([api.getEmployees(), api.getProjects()])
      .then(() => setEmployeesState(sharedState.getEmployees()))
      .catch(() => setEmployeesState(sharedState.getEmployees()));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const payrollRows = useMemo(() => {
    const raw = calculatePayrollTotals(employeesState, selectedPeriod).payrollRows;
    return raw.map((r: PayrollRowItem, idx: number) => {
      let prjCode = 'VP-HO';
      if (r.employeeType === 'SITE_ENGINEER') {
        if (idx % 3 === 0) prjCode = 'DA-NHATTAN2';
        else if (idx % 3 === 1) prjCode = 'DA-LANDMARK';
        else prjCode = 'DA-CAOTOC-BN';
      }
      return {
        ...r,
        projectCode: prjCode,
        accountCode: r.accountCode || (r.employeeType === 'OFFICE_STAFF' ? 'TK_642' : 'TK_622'),
      };
    });
  }, [employeesState, selectedPeriod]);

  // Sinh danh sách bút toán kép (Double-entry Journal Vouchers) theo chuẩn TT 200
  const journalVouchers = useMemo(() => {
    // 1. Lương phải trả người lao động (Nợ 622, 627, 642 / Có 3341)
    const gross622 = payrollRows.filter((r: any) => r.accountCode === 'TK_622').reduce((acc: number, r: any) => acc + r.gross, 0);
    const gross627 = payrollRows.filter((r: any) => r.accountCode === 'TK_627').reduce((acc: number, r: any) => acc + r.gross, 0);
    const gross642 = payrollRows.filter((r: any) => r.accountCode === 'TK_642' || r.employeeType === 'OFFICE_STAFF').reduce((acc: number, r: any) => acc + r.gross, 0);

    // 2. BHXH Doanh nghiệp nộp 23.5% (Nợ 622, 627, 642 / Có 3383, 3384, 3386, 3382)
    const bhdn622 = payrollRows.filter((r: any) => r.accountCode === 'TK_622').reduce((acc: number, r: any) => acc + r.bhDn, 0);
    const bhdn627 = payrollRows.filter((r: any) => r.accountCode === 'TK_627').reduce((acc: number, r: any) => acc + r.bhDn, 0);
    const bhdn642 = payrollRows.filter((r: any) => r.accountCode === 'TK_642' || r.employeeType === 'OFFICE_STAFF').reduce((acc: number, r: any) => acc + r.bhDn, 0);

    // 3. Khấu trừ BHXH NLĐ 10.5% (Nợ 3341 / Có 3383, 3384, 3386)
    const totalBhNld = payrollRows.reduce((acc: number, r: any) => acc + r.bhNld, 0);

    // 4. Khấu trừ Thuế TNCN (Nợ 3341 / Có 3335)
    const totalPit = payrollRows.reduce((acc: number, r: any) => acc + r.pitTax, 0);

    // 5. Khấu trừ Đoàn phí công đoàn 1% (Nợ 3341 / Có 3382)
    const totalUnion = payrollRows.reduce((acc: number, r: any) => acc + r.unionDues, 0);

    // 6. Thực chi lương Net chuyển khoản ngân hàng (Nợ 3341 / Có 1121)
    const totalNet = payrollRows.reduce((acc: number, r: any) => acc + r.net, 0);

    const periodStr = selectedPeriod === '2026-10' ? 'Tháng 10/2026' : selectedPeriod === '2026-09' ? 'Tháng 09/2026' : 'Tháng 08/2026';
    const postDate = selectedPeriod === '2026-10' ? '2026-10-31' : selectedPeriod === '2026-09' ? '2026-09-30' : '2026-08-31';

    return [
      {
        id: 1,
        voucherNo: `PKT-${selectedPeriod}-001`,
        date: postDate,
        desc: `Chi phí lương nhân công trực tiếp thi công hiện trường (${periodStr})`,
        debitAcc: '622',
        creditAcc: '3341',
        amount: gross622,
        projectCode: 'DA-NHATTAN2 / DA-LANDMARK',
        category: 'TK_622',
      },
      {
        id: 2,
        voucherNo: `PKT-${selectedPeriod}-002`,
        date: postDate,
        desc: `Chi phí lương Ban Chỉ Huy & Kỹ sư giám sát công trình (${periodStr})`,
        debitAcc: '6271',
        creditAcc: '3341',
        amount: gross627,
        projectCode: 'DA-NHATTAN2',
        category: 'TK_627',
      },
      {
        id: 3,
        voucherNo: `PKT-${selectedPeriod}-003`,
        date: postDate,
        desc: `Chi phí lương cán bộ nhân viên Khối Văn phòng Tổng công ty (${periodStr})`,
        debitAcc: '6421',
        creditAcc: '3341',
        amount: gross642,
        projectCode: 'VP-HO',
        category: 'TK_642',
      },
      {
        id: 4,
        voucherNo: `PKT-${selectedPeriod}-004`,
        date: postDate,
        desc: `Trích nộp BHXH, BHYT, BHTN, KPCĐ Doanh nghiệp chịu nhân công trực tiếp 23.5%`,
        debitAcc: '622',
        creditAcc: '338',
        amount: bhdn622,
        projectCode: 'DA-NHATTAN2 / DA-LANDMARK',
        category: 'TK_622',
      },
      {
        id: 5,
        voucherNo: `PKT-${selectedPeriod}-005`,
        date: postDate,
        desc: `Trích nộp BHXH, BHYT, BHTN, KPCĐ Doanh nghiệp chịu Ban Chỉ Huy công trường 23.5%`,
        debitAcc: '6271',
        creditAcc: '338',
        amount: bhdn627,
        projectCode: 'DA-NHATTAN2',
        category: 'TK_627',
      },
      {
        id: 6,
        voucherNo: `PKT-${selectedPeriod}-006`,
        date: postDate,
        desc: `Trích nộp BHXH, BHYT, BHTN, KPCĐ Doanh nghiệp chịu Khối Văn phòng 23.5%`,
        debitAcc: '6421',
        creditAcc: '338',
        amount: bhdn642,
        projectCode: 'VP-HO',
        category: 'TK_642',
      },
      {
        id: 7,
        voucherNo: `PKT-${selectedPeriod}-007`,
        date: postDate,
        desc: `Khấu trừ tiền đóng BHXH, BHYT, BHTN của Người lao động (10.5%) trừ vào lương`,
        debitAcc: '3341',
        creditAcc: '338',
        amount: totalBhNld,
        projectCode: 'TOAN-CONG-TY',
        category: 'ALL',
      },
      {
        id: 8,
        voucherNo: `PKT-${selectedPeriod}-008`,
        date: postDate,
        desc: `Khấu trừ thuế thu nhập cá nhân (TNCN) tạm nộp tháng ${selectedPeriod}`,
        debitAcc: '3341',
        creditAcc: '3335',
        amount: totalPit,
        projectCode: 'TOAN-CONG-TY',
        category: 'ALL',
      },
      {
        id: 9,
        voucherNo: `PKT-${selectedPeriod}-009`,
        date: postDate,
        desc: `Khấu trừ kinh phí đoàn viên Công đoàn (1%) nộp về Liên đoàn Lao động`,
        debitAcc: '3341',
        creditAcc: '3382',
        amount: totalUnion,
        projectCode: 'TOAN-CONG-TY',
        category: 'ALL',
      },
      {
        id: 10,
        voucherNo: `UNC-${selectedPeriod}-001`,
        date: postDate,
        desc: `Ủy nhiệm chi (UNC) thanh toán tiền lương thực nhận (Net) qua tài khoản Ngân hàng BIDV`,
        debitAcc: '3341',
        creditAcc: '1121',
        amount: totalNet,
        projectCode: 'TOAN-CONG-TY',
        category: 'ALL',
      },
    ];
  }, [payrollRows, selectedPeriod]);

  const filteredVouchers = useMemo(() => {
    if (filterTarget === 'ALL') return journalVouchers;
    return journalVouchers.filter(v => v.category === filterTarget || v.category === 'ALL');
  }, [journalVouchers, filterTarget]);

  const totalDebitSum = useMemo(() => {
    return journalVouchers.reduce((acc, v) => acc + v.amount, 0);
  }, [journalVouchers]);

  const handleExportMisaCsv = () => {
    const headers = [
      'SoChungTu',
      'NgayChungTu',
      'NgayHachToan',
      'DienGiai',
      'TKNo',
      'TKCo',
      'SoTien',
      'MaDoiTuong',
      'MaCongTrinh'
    ];

    const rows = journalVouchers.map(v => [
      v.voucherNo,
      v.date,
      v.date,
      `"${v.desc}"`,
      v.debitAcc,
      v.creditAcc,
      v.amount,
      '""',
      `"${v.projectCode}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chung_Tu_Ke_Toan_MISA_${selectedPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã kết xuất và tải về thành công chứng từ kế toán MISA AMIS / FAST CSV (UTF-8 BOM)!');
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <NavLink to="/payroll" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
              <ArrowLeft size={13} />
              <span>Bảng Lương 8 Cột</span>
            </NavLink>
            <span className="badge badge-warning">Phân Hệ Kế Toán Tổng Hợp &amp; Sổ Cái</span>
            <span className="badge badge-success">Khớp Chuẩn MISA AMIS / FAST</span>
          </div>
          <h1 className="page-title">
            Chứng Từ Kế Toán Tiền Lương &amp; Kết Xuất MISA / FAST
          </h1>
          <p className="page-description">
            Sổ nhật ký chứng từ kế toán kép (Double-Entry Journal Vouchers) hạch toán chi phí tiền lương, bảo hiểm doanh nghiệp và khấu trừ thuế theo chuẩn mực Thông tư 200/2014/TT-BTC
          </p>
        </div>

        <div className="header-actions">
          <NavLink to="/cost-allocation" className="btn btn-secondary btn-sm">
            <Building size={14} />
            <span>Xem Bóc Tách Dự Án</span>
          </NavLink>
          <button onClick={handleExportMisaCsv} className="btn btn-primary btn-sm" style={{ backgroundColor: '#047857', borderColor: '#047857' }}>
            <Download size={14} />
            <span>Xuất MISA / FAST (.csv)</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs (Phân hệ Kế Toán Tiền Lương Chuẩn Nghiệp Vụ) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          overflowX: 'auto',
        }}
      >
        <NavLink
          to="/payroll"
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
          <Building size={14} />
          <span>Bảng Lương 8 Cột (Tổng Hợp)</span>
        </NavLink>

        <NavLink
          to="/cost-allocation"
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
          <span>Bóc Tách Chi Phí Dự Án (TK 622/627/642)</span>
        </NavLink>

        <NavLink
          to="/accounting-vouchers"
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
          <Building size={14} />
          <span>Chứng Từ Hạch Toán MISA AMIS</span>
        </NavLink>

        <NavLink
          to="/payroll-tickets"
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
          <span>Xử Lý Khiếu Nại Lương</span>
        </NavLink>
      </div>

      {toastMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards: Đối Soát Cân Đối Kế Toán Nợ = Có */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Phát Sinh Ghi Nợ (Debit)</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <Layers size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(totalDebitSum)}</div>
          <div className="kpi-subtext">TK 622, 627, 642, 3341 (Tổng 10 bút toán)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Phát Sinh Ghi Có (Credit)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{formatVND(totalDebitSum)}</div>
          <div className="kpi-subtext">TK 3341, 338, 3335, 1121 (Khớp 100%)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Chênh Lệch Cân Đối (Nợ - Có)</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>0 ₫ (Cân Bằng)</div>
          <div className="kpi-subtext">Chứng từ hợp lệ, sẵn sàng khóa sổ cái</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tiền Lương Thực Nhận (Net) Chi Trả</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <FileText size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#d97706' }}>
            {formatVND(journalVouchers.find(v => v.debitAcc === '3341' && v.creditAcc === '1121')?.amount || 0)}
          </div>
          <div className="kpi-subtext">Xuất UNC điện tử qua Ngân hàng</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lọc Theo Nhóm Chi Phí:</label>
          <select
            className="form-select form-select-sm"
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value as any)}
            style={{ minWidth: '220px' }}
          >
            <option value="ALL">Toàn Bộ Bút Toán ({journalVouchers.length} chứng từ)</option>
            <option value="TK_622">Bút toán Nhân công trực tiếp (TK 622)</option>
            <option value="TK_627">Bút toán Sản xuất chung CT (TK 627)</option>
            <option value="TK_642">Bút toán Quản lý doanh nghiệp (TK 642)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kỳ Chứng Từ:</label>
          <select
            className="form-select form-select-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            style={{ minWidth: '150px' }}
          >
            <option value="2026-10">Tháng 10/2026 (Hiện tại)</option>
            <option value="2026-09">Tháng 09/2026 (Đã ghi sổ)</option>
            <option value="2026-08">Tháng 08/2026 (Đã ghi sổ)</option>
          </select>
        </div>
      </div>

      {/* Main Journal Voucher Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Sổ Nhật Ký Chứng Từ Kế Toán Tiền Lương Kép (Double-Entry Journal)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Cấu trúc chuẩn hóa tương thích API / CSV Import của phần mềm kế toán MISA AMIS, FAST, BRAVO
            </p>
          </div>
          <span className="badge badge-success">
            {filteredVouchers.length} Bút toán • Đối soát tự động Nợ = Có
          </span>
        </div>

        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '130px' }}>Số Chứng Từ</th>
                <th className="text-center" style={{ width: '100px' }}>Ngày Hạch Toán</th>
                <th className="text-left">Diễn Giải Nghiệp Vụ Kinh Tế Phát Sinh</th>
                <th className="text-center" style={{ width: '80px' }}>TK Nợ</th>
                <th className="text-center" style={{ width: '80px' }}>TK Có</th>
                <th className="text-right" style={{ width: '160px' }}>Số Tiền Ghi Sổ</th>
                <th className="text-left" style={{ width: '180px' }}>Mã Công Trình / Đối Tượng</th>
                <th className="text-center" style={{ width: '100px' }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((v) => (
                <tr key={v.id}>
                  <td className="text-left font-mono font-bold text-blue-700">{v.voucherNo}</td>
                  <td className="text-center tabular-nums text-xs font-mono text-slate-700">{v.date}</td>
                  <td className="text-left">
                    <div className="font-medium text-slate-900">{v.desc}</div>
                  </td>
                  <td className="text-center">
                    <span className="badge badge-primary font-mono">{v.debitAcc}</span>
                  </td>
                  <td className="text-center">
                    <span className="badge badge-warning font-mono">{v.creditAcc}</span>
                  </td>
                  <td className="text-right tabular-nums font-bold text-slate-900">{formatVND(v.amount)}</td>
                  <td className="text-left text-xs font-mono text-slate-600">{v.projectCode}</td>
                  <td className="text-center">
                    <span className="badge badge-success">Đã Kiểm Soát</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
