import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Building,
  RefreshCw,
  Eye,
  Calculator,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, sharedState } from '../services/api';
import type { PayrollTicket, Employee } from '../types';

export const PayrollTickets: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';
  const isAccountant = ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'SYSTEM_ADMIN', 'ADMIN'].includes(currentRole);

  const [payrollTickets, setPayrollTickets] = useState<PayrollTicket[]>(() => sharedState.getPayrollTickets());
  const [employeesState, setEmployeesState] = useState<Employee[]>(() => sharedState.getEmployees());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [replyingTicket, setReplyingTicket] = useState<PayrollTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [viewingTicket, setViewingTicket] = useState<PayrollTicket | null>(null);

  const reloadData = () => {
    Promise.all([api.getEmployees(), api.getProjects()])
      .then(() => {
        setEmployeesState(sharedState.getEmployees());
        setPayrollTickets(sharedState.getPayrollTickets());
      })
      .catch(() => {
        setEmployeesState(sharedState.getEmployees());
        setPayrollTickets(sharedState.getPayrollTickets());
      });
  };

  useEffect(() => {
    reloadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return payrollTickets.filter((tk) => {
      // Status filter
      if (statusFilter === 'PENDING' && tk.status === 'RESOLVED') return false;
      if (statusFilter === 'RESOLVED' && tk.status !== 'RESOLVED') return false;

      // Period filter
      if (periodFilter !== 'ALL' && tk.period !== periodFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = tk.employeeName?.toLowerCase().includes(query);
        const matchCode = tk.employeeCode?.toLowerCase().includes(query);
        const matchSubject = tk.subject?.toLowerCase().includes(query);
        const matchContent = tk.content?.toLowerCase().includes(query);
        const matchId = String(tk.id).includes(query);
        return matchName || matchCode || matchSubject || matchContent || matchId;
      }

      return true;
    });
  }, [payrollTickets, statusFilter, periodFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = payrollTickets.length;
    const pending = payrollTickets.filter((t) => t.status !== 'RESOLVED').length;
    const resolved = payrollTickets.filter((t) => t.status === 'RESOLVED').length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, pending, resolved, rate };
  }, [payrollTickets]);

  // Handle Submit Reply
  const handleRespondTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket) return;
    if (!replyText.trim()) {
      alert('Vui lòng nhập nội dung phản hồi giải quyết khiếu nại lương!');
      return;
    }

    sharedState.respondPayrollTicket(replyingTicket.id, replyText.trim());
    setPayrollTickets(sharedState.getPayrollTickets());
    showToast(`Đã phản hồi và xử lý hoàn tất Ticket #${replyingTicket.id} của nhân sự ${replyingTicket.employeeName}!`);
    setReplyingTicket(null);
    setReplyText('');
  };

  const quickTemplates = [
    'Đã đối soát Bảng công công trường: Số giờ tăng ca OT đêm đã được xác nhận chính xác và bù trừ vào kỳ quyết toán.',
    'Khoản phụ cấp công trường đặc thù đã được miễn trích nộp BHXH theo đúng quy định tại NĐ 115/2015 & Thông tư 06/2021/TT-BLĐTBXH.',
    'Đã kiểm tra lại dữ liệu máy chấm công Face ID: Hệ số ngày công thực tế hoàn toàn khớp đúng với dữ liệu phê duyệt của Chỉ huy trưởng.',
    'Kế toán đã tiếp nhận và điều chỉnh chênh lệch phụ cấp độc hại vào bảng lương bổ sung kỳ tới.',
  ];

  return (
    <div className="page-wrapper">
      {/* 1. Header & Breadcrumb */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-primary" style={{ fontWeight: 600 }}>Phân Hệ Kế Toán Tiền Lương</span>
            <span className="badge badge-warning" style={{ fontWeight: 600 }}>Dịch Vụ Khách Hàng Nội Bộ (SLA 24h)</span>
          </div>
          <h1 className="page-title">
            Hộp Thư Tiếp Nhận &amp; Xử Lý Khiếu Nại Phiếu Lương
          </h1>
          <p className="page-description">
            Tiếp nhận, đối soát bảng công và phản hồi giải quyết thắc mắc về tiền lương, giờ OT, phụ cấp công trường của nhân viên &amp; kỹ sư
          </p>
        </div>

        <div className="header-actions">
          <button onClick={reloadData} className="btn btn-secondary" title="Làm mới danh sách ticket khiếu nại">
            <RefreshCw size={15} />
            <span>Làm Mới</span>
          </button>
          <NavLink to="/payroll" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calculator size={15} />
            <span>Về Bảng Lương Tập Trung</span>
          </NavLink>
        </div>
      </div>

      {/* 2. Sub-navigation tabs (Phân hệ Kế Toán Tiền Lương Chuẩn Nghiệp Vụ) */}
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
          <MessageSquare size={14} />
          <span>Xử Lý Khiếu Nại Lương</span>
          {stats.pending > 0 && (
            <span
              style={{
                marginLeft: '4px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.6875rem',
                backgroundColor: '#dc2626',
                color: '#fff',
                borderRadius: '999px',
                fontWeight: 700,
              }}
            >
              {stats.pending}
            </span>
          )}
        </NavLink>
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

      {/* 3. KPI Strip */}
      <div className="kpi-strip" style={{ marginBottom: '1.25rem' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng Số Khiếu Nại</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <MessageSquare size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{stats.total}</div>
          <div className="kpi-subtext">Toàn bộ kỳ lương đã ghi nhận</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Chờ Kế Toán Xử Lý</span>
            <div className="kpi-icon-wrap" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: stats.pending > 0 ? '#d97706' : '#10b981' }}>
            {stats.pending}
          </div>
          <div className="kpi-subtext">Cần giải quyết trong vòng 24h</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đã Giải Quyết Xong</span>
            <div className="kpi-icon-wrap" style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#16a34a' }}>
            {stats.resolved}
          </div>
          <div className="kpi-subtext">Đã phản hồi chi tiết tới nhân sự</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tỷ Lệ Hoàn Tất Xử Lý</span>
            <div className="kpi-icon-wrap" style={{ color: '#4f46e5', backgroundColor: '#eef2ff' }}>
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#4f46e5' }}>
            {stats.rate}%
          </div>
          <div className="kpi-subtext">Chất lượng dịch vụ giải trình tiền lương</div>
        </div>
      </div>

      {/* 4. Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: '0.875rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NV, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '0.8125rem', height: '34px' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Trạng thái:</span>
            <div style={{ display: 'inline-flex', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: statusFilter === 'ALL' ? 600 : 500,
                  backgroundColor: statusFilter === 'ALL' ? '#eff6ff' : '#ffffff',
                  color: statusFilter === 'ALL' ? '#2563eb' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Tất Cả ({payrollTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: statusFilter === 'PENDING' ? 600 : 500,
                  backgroundColor: statusFilter === 'PENDING' ? '#fffbeb' : '#ffffff',
                  color: statusFilter === 'PENDING' ? '#b45309' : '#475569',
                  borderLeft: '1px solid var(--border-subtle)',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  cursor: 'pointer',
                }}
              >
                Chờ Xử Lý ({stats.pending})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RESOLVED')}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: statusFilter === 'RESOLVED' ? 600 : 500,
                  backgroundColor: statusFilter === 'RESOLVED' ? '#f0fdf4' : '#ffffff',
                  color: statusFilter === 'RESOLVED' ? '#16a34a' : '#475569',
                  borderLeft: '1px solid var(--border-subtle)',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  cursor: 'pointer',
                }}
              >
                Đã Xong ({stats.resolved})
              </button>
            </div>
          </div>

          {/* Period Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Kỳ lương:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.75rem', height: '34px', width: '130px' }}
            >
              <option value="ALL">Mọi kỳ</option>
              <option value="2026-10">Tháng 10/2026</option>
              <option value="2026-09">Tháng 09/2026</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Hiển thị <strong>{filteredTickets.length}</strong> / {payrollTickets.length} ticket
        </div>
      </div>

      {/* 5. Ticket Data Table */}
      <div className="card">
        <div className="table-container">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '90px' }}>Mã Ticket</th>
                <th className="text-left" style={{ width: '220px' }}>Nhân Sự Gửi</th>
                <th className="text-center" style={{ width: '100px' }}>Kỳ Lương</th>
                <th className="text-left">Nội Dung Khiếu Nại &amp; Thắc Mắc</th>
                <th className="text-left" style={{ width: '280px' }}>Phản Hồi Từ Kế Toán</th>
                <th className="text-center" style={{ width: '120px' }}>Trạng Thái</th>
                <th className="text-right" style={{ width: '150px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} style={{ margin: '0 auto 0.5rem', color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 600 }}>Không tìm thấy ticket khiếu nại lương nào phù hợp</div>
                    <div style={{ fontSize: '0.75rem' }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((tk) => {
                  const emp = employeesState.find((e) => e.employeeCode === tk.employeeCode || e.id === tk.employeeId);
                  const isResolved = tk.status === 'RESOLVED';

                  return (
                    <tr key={tk.id}>
                      <td className="text-left font-mono font-bold text-slate-700">
                        #{tk.id}
                      </td>
                      <td className="text-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '999px',
                              backgroundColor: emp?.employeeType === 'SITE_ENGINEER' ? '#fef3c7' : '#eff6ff',
                              color: emp?.employeeType === 'SITE_ENGINEER' ? '#b45309' : '#1d4ed8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {tk.employeeName ? tk.employeeName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900" style={{ fontSize: '0.8125rem' }}>
                              {tk.employeeName}
                            </div>
                            <div className="text-xs font-mono text-slate-500">
                              {tk.employeeCode} • {emp?.role || 'Nhân sự'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center font-mono text-xs">
                        <span className="badge badge-slate" style={{ fontSize: '0.6875rem' }}>
                          {tk.period}
                        </span>
                      </td>
                      <td className="text-left text-xs">
                        <div className="font-semibold text-slate-900" style={{ marginBottom: '0.2rem' }}>
                          {tk.subject}
                        </div>
                        <div
                          className="text-slate-600"
                          style={{
                            maxWidth: '360px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={tk.content}
                        >
                          {tk.content}
                        </div>
                      </td>
                      <td className="text-left text-xs">
                        {tk.response ? (
                          <div
                            style={{
                              color: '#047857',
                              fontWeight: 500,
                              backgroundColor: '#ecfdf5',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              maxWidth: '280px',
                              lineHeight: '1.4',
                            }}
                          >
                            {tk.response}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic" style={{ fontSize: '0.75rem' }}>
                            Chưa có phản hồi
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {isResolved ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={12} /> Đã Giải Quyết
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> Chờ Xử Lý
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setViewingTicket(tk)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                            title="Xem chi tiết ticket"
                          >
                            <Eye size={12} />
                          </button>
                          {isAccountant && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTicket(tk);
                                setReplyText(tk.response || '');
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.2rem 0.55rem', fontSize: '0.6875rem' }}
                            >
                              <span>{isResolved ? 'Sửa' : 'Xử Lý'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal Phản Hồi Ticket Khiếu Nại (Maker/Accountant Reply) */}
      {replyingTicket && (
        <div className="modal-backdrop" onClick={() => setReplyingTicket(null)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Phản Hồi &amp; Xử Lý Khiếu Nại Lương #{replyingTicket.id}
                </h3>
                <span className="text-xs text-slate-500">
                  Nhân sự: <strong>{replyingTicket.employeeName}</strong> ({replyingTicket.employeeCode}) • Kỳ: {replyingTicket.period}
                </span>
              </div>
            </div>
            <form onSubmit={handleRespondTicket}>
              <div className="modal-body">
                {/* Details Box */}
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '0.875rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                    Chủ đề: {replyingTicket.subject}
                  </div>
                  <div style={{ color: '#475569', lineHeight: '1.5' }}>
                    {replyingTicket.content}
                  </div>
                </div>

                {/* Quick Templates */}
                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: '#475569' }}>
                    Mẫu phản hồi nhanh kế toán:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {quickTemplates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReplyText(tpl)}
                        className="btn btn-secondary btn-sm"
                        style={{ textAlign: 'left', fontSize: '0.6875rem', padding: '0.3rem 0.5rem', whiteSpace: 'normal', lineHeight: '1.3' }}
                      >
                        • {tpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Nội dung kết luận &amp; hướng xử lý của Kế toán <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung giải trình, đối soát chi tiết hoặc căn cứ pháp lý để gửi lại cho người lao động..."
                    className="form-control"
                    style={{ fontSize: '0.8125rem', width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setReplyingTicket(null)}
                  className="btn btn-secondary"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={14} />
                  <span>Xác Nhận &amp; Gửi Phản Hồi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Xem Chi Tiết Ticket */}
      {viewingTicket && (
        <div className="modal-backdrop" onClick={() => setViewingTicket(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Chi Tiết Ticket Khiếu Nại #{viewingTicket.id}
              </h3>
            </div>
            <div className="modal-body" style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span className="text-slate-500">Người gửi:</span>{' '}
                <strong>{viewingTicket.employeeName}</strong> ({viewingTicket.employeeCode})
              </div>
              <div>
                <span className="text-slate-500">Kỳ quyết toán:</span>{' '}
                <span className="font-mono">{viewingTicket.period}</span>
              </div>
              <div>
                <span className="text-slate-500">Chủ đề:</span>{' '}
                <strong>{viewingTicket.subject}</strong>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span className="text-slate-500" style={{ display: 'block', marginBottom: '0.25rem' }}>Nội dung khiếu nại:</span>
                <div style={{ color: '#1e293b' }}>{viewingTicket.content}</div>
              </div>
              <div>
                <span className="text-slate-500" style={{ display: 'block', marginBottom: '0.25rem' }}>Phản hồi giải quyết của Kế toán:</span>
                {viewingTicket.response ? (
                  <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#047857', fontWeight: 500 }}>
                    {viewingTicket.response}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Chưa có phản hồi nào được ghi nhận.</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setViewingTicket(null)} className="btn btn-secondary">
                Đóng
              </button>
              {isAccountant && (
                <button
                  onClick={() => {
                    setReplyingTicket(viewingTicket);
                    setReplyText(viewingTicket.response || '');
                    setViewingTicket(null);
                  }}
                  className="btn btn-primary"
                >
                  Phản Hồi Ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollTickets;
