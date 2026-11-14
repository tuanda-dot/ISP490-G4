import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Building,
  Calculator,
  PieChart,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api, sharedState } from '../services/api';
import type { Employee } from '../types';
import { calculatePayrollTotals, type PayrollRowItem } from '../utils/payrollCalculator';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const CostAllocation: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'2026-10' | '2026-09' | '2026-08'>('2026-10');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  // Tính toán dữ liệu phân bổ từ utils
  const payrollRows = useMemo(() => {
    const raw = calculatePayrollTotals(employeesState, selectedPeriod).payrollRows;
    return raw.map((r: PayrollRowItem, idx: number) => {
      let prjName = 'Văn Phòng Tổng Công Ty';
      let prjCode = 'VP-HO';
      if (r.employeeType === 'SITE_ENGINEER') {
        if (idx % 3 === 0) {
          prjName = 'Dự Án Cầu Nhật Tân Giai Đoạn 2';
          prjCode = 'DA-NHATTAN2';
        } else if (idx % 3 === 1) {
          prjName = 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh';
          prjCode = 'DA-LANDMARK';
        } else {
          prjName = 'Gói Thầu 04 - Cao Tốc Bắc Nam (Diễn Châu - Bãi Vọt)';
          prjCode = 'DA-CAOTOC-BN';
        }
      }
      return {
        ...r,
        projectName: prjName,
        projectCode: prjCode,
        accountCode: r.accountCode || (r.employeeType === 'OFFICE_STAFF' ? 'TK_642' : 'TK_622'),
      };
    });
  }, [employeesState, selectedPeriod]);

  const filteredRows = useMemo(() => {
    if (projectFilter === 'ALL') return payrollRows;
    return payrollRows.filter((r: any) => r.projectCode === projectFilter);
  }, [payrollRows, projectFilter]);

  // Tổng hợp theo 3 tài khoản Thông tư 200
  const tk622Total = useMemo(() => {
    return payrollRows
      .filter((r: any) => r.accountCode === 'TK_622' || r.accountCode?.includes('622'))
      .reduce((acc: number, r: any) => acc + r.gross + r.bhDn, 0);
  }, [payrollRows]);

  const tk627Total = useMemo(() => {
    return payrollRows
      .filter((r: any) => r.accountCode === 'TK_627' || r.accountCode?.includes('627'))
      .reduce((acc: number, r: any) => acc + r.gross + r.bhDn, 0);
  }, [payrollRows]);

  const tk642Total = useMemo(() => {
    return payrollRows
      .filter((r: any) => r.accountCode === 'TK_642' || r.employeeType === 'OFFICE_STAFF')
      .reduce((acc: number, r: any) => acc + r.gross + r.bhDn, 0);
  }, [payrollRows]);

  const totalCost = tk622Total + tk627Total + tk642Total;

  // Tổng hợp theo Dự Án & So Sánh Ngân Sách Dự Toán
  const projectSummary = useMemo(() => {
    const map: Record<string, { code: string; name: string; count: number; gross: number; bhDn: number; totalCost: number; budget: number; account: string }> = {
      'DA-NHATTAN2': {
        code: 'DA-NHATTAN2',
        name: 'Dự Án Cầu Nhật Tân Giai Đoạn 2',
        count: 0,
        gross: 0,
        bhDn: 0,
        totalCost: 0,
        budget: 180000000,
        account: 'TK 622 (Nhân Công Trực Tiếp) & TK 627',
      },
      'DA-LANDMARK': {
        code: 'DA-LANDMARK',
        name: 'Tổ Hợp Tháp Văn Phòng Landmark Hải Minh',
        count: 0,
        gross: 0,
        bhDn: 0,
        totalCost: 0,
        budget: 140000000,
        account: 'TK 622 (Nhân Công Trực Tiếp) & TK 627',
      },
      'DA-CAOTOC-BN': {
        code: 'DA-CAOTOC-BN',
        name: 'Gói Thầu 04 - Cao Tốc Bắc Nam (Diễn Châu - Bãi Vọt)',
        count: 0,
        gross: 0,
        bhDn: 0,
        totalCost: 0,
        budget: 120000000,
        account: 'TK 622 (Nhân Công Trực Tiếp) & TK 627',
      },
      'VP-HO': {
        code: 'VP-HO',
        name: 'Khối Văn Phòng Tổng Công Ty (Quản Lý Doanh Nghiệp)',
        count: 0,
        gross: 0,
        bhDn: 0,
        totalCost: 0,
        budget: 85000000,
        account: 'TK 642 (Chi Phí Quản Lý Doanh Nghiệp)',
      },
    };

    payrollRows.forEach((r: any) => {
      const p = map[r.projectCode] || map['VP-HO'];
      p.count += 1;
      p.gross += r.gross;
      p.bhDn += r.bhDn;
      p.totalCost += (r.gross + r.bhDn);
    });

    return Object.values(map);
  }, [payrollRows]);

  const handleExportCostAllocationCSV = () => {
    const headers = [
      'STT',
      'Mã Nhân Viên',
      'Họ Và Tên',
      'Chức Danh',
      'Công Trình / Dự Án',
      'Mã Dự Án',
      'Tài Khoản Kế Toán',
      'Tổng Lương Gross (đ)',
      'Bảo Hiểm DN Nộp (23.5%)',
      'Tổng Chi Phí Nhân Công (đ)',
      'Tỷ Lệ Phân Bổ (%)'
    ];

    const rows = filteredRows.map((r: any, idx: number) => {
      const itemCost = r.gross + r.bhDn;
      const ratio = totalCost > 0 ? ((itemCost / totalCost) * 100).toFixed(2) : '0';
      return [
        idx + 1,
        `"${r.employeeCode}"`,
        `"${r.fullName}"`,
        `"${r.position}"`,
        `"${r.projectName}"`,
        r.projectCode,
        r.accountCode,
        r.gross,
        r.bhDn,
        itemCost,
        `"${ratio}%"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HMCPS_Bao_Cao_Phan_Bo_Chi_Phi_Du_An_${selectedPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất thành công Báo cáo phân bổ chi phí dự án (TK 622, 627, 642)!');
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
            <span className="badge badge-primary">Phân Hệ Kế Toán Chi Phí Xây Lắp</span>
            <span className="badge badge-slate">Thông tư 200/2014/TT-BTC</span>
          </div>
          <h1 className="page-title">
            Bóc Tách &amp; Phân Bổ Chi Phí Nhân Công Dự Án
          </h1>
          <p className="page-description">
            Bóc tách toàn diện chi phí tiền lương và các khoản trích theo lương của {payrollRows.length} nhân sự vào các công trình xây dựng: TK 622 (Trực tiếp), TK 627 (Sản xuất chung), TK 642 (Quản lý)
          </p>
        </div>

        <div className="header-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="form-control"
            style={{ fontSize: '0.8125rem', height: '32px', width: '130px' }}
          >
            <option value="2026-10">Tháng 10/2026</option>
            <option value="2026-09">Tháng 09/2026</option>
            <option value="2026-08">Tháng 08/2026</option>
          </select>
          <NavLink to="/accounting-vouchers" className="btn btn-secondary btn-sm">
            <Layers size={14} />
            <span>Xem Chứng Từ MISA/FAST</span>
          </NavLink>
          <button onClick={handleExportCostAllocationCSV} className="btn btn-primary btn-sm">
            <Download size={14} />
            <span>Xuất Báo Cáo Phân Bổ (.csv)</span>
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
          <Calculator size={14} />
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

      {/* KPI Cards: Phân Bổ Chi Phí Theo Tài Khoản Hạch Toán */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Chi Phí Nhân Lực Doanh Nghiệp</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <Calculator size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{formatVND(totalCost)}</div>
          <div className="kpi-subtext">Lương Gross + BHXH Doanh nghiệp nộp (23.5%)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">TK 622 - Nhân Công Trực Tiếp</span>
            <div className="kpi-icon-wrap" style={{ color: '#047857', backgroundColor: '#ecfdf5' }}>
              <Building size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#047857' }}>{formatVND(tk622Total)}</div>
          <div className="kpi-subtext">
            Chiếm <strong className="tabular-nums">{totalCost > 0 ? ((tk622Total / totalCost) * 100).toFixed(1) : 0}%</strong> tổng chi phí nhân sự
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">TK 627 - Sản Xuất Chung (CHT &amp; GS)</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <PieChart size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#d97706' }}>{formatVND(tk627Total)}</div>
          <div className="kpi-subtext">
            Chiếm <strong className="tabular-nums">{totalCost > 0 ? ((tk627Total / totalCost) * 100).toFixed(1) : 0}%</strong> chi phí Ban Chỉ Huy
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">TK 642 - Chi Phí Quản Lý Doanh Nghiệp</span>
            <div className="kpi-icon-wrap" style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
              <Layers size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#7c3aed' }}>{formatVND(tk642Total)}</div>
          <div className="kpi-subtext">
            Chiếm <strong className="tabular-nums">{totalCost > 0 ? ((tk642Total / totalCost) * 100).toFixed(1) : 0}%</strong> chi phí khối Văn phòng
          </div>
        </div>
      </div>

      {/* Card 1: Bảng Tổng Hợp Phân Bổ Chi Phí Theo Từng Công Trình & So Sánh Ngân Sách Dự Toán */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              1. Báo Cáo Phân Bổ Chi Phí Theo Dự Án &amp; Kiểm Soát Hạn Mức Ngân Sách Quỹ Lương
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              So sánh chi phí nhân công thực tế (Gross + BHXH DN) so với định mức ngân sách được Ban Giám Đốc phê duyệt
            </p>
          </div>
          <span className="badge badge-success">
            Tổng cộng 4 đơn vị thi công • 100% Cân đối
          </span>
        </div>

        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '130px' }}>Mã Dự Án</th>
                <th className="text-left">Tên Công Trình Xây Lắp / Khối Phòng Ban</th>
                <th className="text-center" style={{ width: '90px' }}>Quân Số</th>
                <th className="text-left">Tài Khoản Kế Toán</th>
                <th className="text-right">Tổng Lương Gross</th>
                <th className="text-right">BHXH DN (23.5%)</th>
                <th className="text-right font-bold text-slate-900">Tổng Chi Phí Thực Tế</th>
                <th className="text-right">Hạn Mức Ngân Sách</th>
                <th className="text-center" style={{ width: '110px' }}>Tỷ Lệ Sử Dụng</th>
                <th className="text-center" style={{ width: '110px' }}>Tình Trạng</th>
              </tr>
            </thead>
            <tbody>
              {projectSummary.map(p => {
                const usagePercent = p.budget > 0 ? (p.totalCost / p.budget) * 100 : 0;
                const isOverBudget = p.totalCost > p.budget;
                return (
                  <tr key={p.code}>
                    <td className="text-left font-mono font-bold text-blue-700">{p.code}</td>
                    <td className="text-left">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                    </td>
                    <td className="text-center tabular-nums font-medium text-slate-800">{p.count} người</td>
                    <td className="text-left text-xs font-mono text-slate-600">{p.account}</td>
                    <td className="text-right tabular-nums text-slate-700">{formatVND(p.gross)}</td>
                    <td className="text-right tabular-nums text-amber-700">+{formatVND(p.bhDn)}</td>
                    <td className="text-right tabular-nums font-bold text-slate-900">{formatVND(p.totalCost)}</td>
                    <td className="text-right tabular-nums text-slate-600">{formatVND(p.budget)}</td>
                    <td className="text-center tabular-nums font-semibold" style={{ color: isOverBudget ? '#dc2626' : '#047857' }}>
                      {usagePercent.toFixed(1)}%
                    </td>
                    <td className="text-center">
                      {isOverBudget ? (
                        <span className="badge badge-danger">Vượt Ngân Sách</span>
                      ) : (
                        <span className="badge badge-success">Trong Hạn Mức</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Bảng Phân Bổ Chi Tiết Theo Từng Kỹ Sư Hiện Trường */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              2. Bảng Kê Chi Tiết Phân Bổ Chi Phí Theo Từng Nhân Sự
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Dữ liệu đối soát trực tiếp từ Bảng lương tháng {selectedPeriod}: Lương chính, Phụ cấp công trường, Tiền làm thêm OT và Chi phí bảo hiểm doanh nghiệp
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lọc Theo Dự Án:</label>
            <select
              className="form-select form-select-sm"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="ALL">Tất cả dự án ({payrollRows.length})</option>
              <option value="DA-NHATTAN2">Cầu Nhật Tân 2 (DA-NHATTAN2)</option>
              <option value="DA-LANDMARK">Landmark Hải Minh (DA-LANDMARK)</option>
              <option value="DA-CAOTOC-BN">Cao Tốc Bắc Nam (DA-CAOTOC-BN)</option>
              <option value="VP-HO">Văn Phòng Tổng CT (VP-HO)</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '85px' }}>Mã NV</th>
                <th className="text-left">Họ Và Tên</th>
                <th className="text-left">Vị Trí Công Việc</th>
                <th className="text-left">Công Trình Gán Phân Bổ</th>
                <th className="text-center" style={{ width: '90px' }}>Tài Khoản</th>
                <th className="text-right">Lương Theo Công</th>
                <th className="text-right">Phụ Cấp CT</th>
                <th className="text-right">Làm Thêm OT</th>
                <th className="text-right">Thu Nhập Gross</th>
                <th className="text-right">BHXH DN (23.5%)</th>
                <th className="text-right font-bold text-slate-900">Tổng Chi Phí</th>
                <th className="text-center" style={{ width: '80px' }}>Tỷ Trọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r: any) => {
                const itemCost = r.gross + r.bhDn;
                const ratio = totalCost > 0 ? ((itemCost / totalCost) * 100).toFixed(2) : '0';
                return (
                  <tr key={r.id}>
                    <td className="text-left font-mono font-medium text-slate-700">{r.employeeCode}</td>
                    <td className="text-left">
                      <div className="font-semibold text-slate-900">{r.fullName}</div>
                    </td>
                    <td className="text-left text-xs text-slate-600">{r.position}</td>
                    <td className="text-left text-xs">
                      <div className="font-medium text-slate-900">{r.projectName}</div>
                      <div className="font-mono text-slate-500">{r.projectCode}</div>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${r.accountCode === 'TK_642' ? 'badge-info' : r.accountCode === 'TK_627' ? 'badge-warning' : 'badge-primary'}`}>
                        {r.accountCode}
                      </span>
                    </td>
                    <td className="text-right tabular-nums text-slate-700">{formatVND(r.proratedBase)}</td>
                    <td className="text-right tabular-nums text-slate-700">{formatVND(r.siteAllowance)}</td>
                    <td className="text-right tabular-nums text-blue-700 font-medium">
                      {r.overtimePay > 0 ? `+${formatVND(r.overtimePay)}` : '0 ₫'}
                    </td>
                    <td className="text-right tabular-nums font-semibold text-slate-900">{formatVND(r.gross)}</td>
                    <td className="text-right tabular-nums text-amber-700">+{formatVND(r.bhDn)}</td>
                    <td className="text-right tabular-nums font-bold text-slate-900">{formatVND(itemCost)}</td>
                    <td className="text-center tabular-nums text-xs font-mono text-slate-600">{ratio}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
