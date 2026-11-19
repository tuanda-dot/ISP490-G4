import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
  Search,
  Star,
  TrendingUp,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useAuth, normalizeRole } from '../context/AuthContext';
import { api, sharedState } from '../services/api';
import type {
  Employee,
  EvaluationCAction,
  EvaluationGrade,
  EvaluationRewardChoice,
  EvaluationRosterItem,
  PerformanceEvaluationRecord,
} from '../types';
import {
  DEFAULT_SIX_MONTH_A_BONUS_VND,
  EVALUATION_GRADE_MAP,
  MAX_A_REWARDS_PER_YEAR,
  SIX_MONTH_A_STREAK_TARGET,
  canEvaluatorGradeTarget,
  computeConsecutiveAStreakBefore,
  computeYearlyARewardsUsed,
  getDefaultEvaluationPctForGrade,
  isEligibleForSixMonthAReward,
  isManagerEvaluatorRole,
} from '../utils/evaluationPolicy';
import { buildEmployeeMonthlyAttendance } from '../utils/payrollCalculator';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount || 0));

const PERIOD_OPTIONS = Array.from({ length: 12 }, (_, idx) => {
  const m = idx + 1;
  return {
    value: `2026-${String(m).padStart(2, '0')}`,
    label: `Tháng ${String(m).padStart(2, '0')}/2026`,
    year: 2026,
    month: m,
  };
});

export const Evaluations: React.FC = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role || 'OFFICE_STAFF');

  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  const [viewScope, setViewScope] = useState<'MY_TEAM' | 'COMPANY_AUDIT'>('MY_TEAM');
  const [roster, setRoster] = useState<EvaluationRosterItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'ELIGIBLE' | 'UNGRADED'>('ALL');
  const [loading, setLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState<EvaluationRosterItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ emp: EvaluationRosterItem; records: PerformanceEvaluationRecord[] } | null>(null);

  const [formState, setFormState] = useState({
    attitudeScore: 9,
    performanceScore: 9,
    grade: 'A' as EvaluationGrade,
    evaluationPct: 1.0,
    rewardChoice: 'NONE' as EvaluationRewardChoice,
    rewardBonusAmount: DEFAULT_SIX_MONTH_A_BONUS_VND,
    salaryRaiseAmount: 1_500_000,
    cActionType: 'REMINDER' as EvaluationCAction,
    deductionAmount: 500_000,
    comment: '',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [evalYear, evalMonth] = useMemo(() => {
    const [y, m] = selectedPeriod.split('-').map(Number);
    return [y || 2026, m || 10];
  }, [selectedPeriod]);

  const allEmployees = useMemo(() => sharedState.getEmployees(), [roster]);
  const [allDepartments, setAllDepartments] = useState(() => sharedState.getDepartments());
  useEffect(() => {
    api.getDepartments().then((list) => {
      if (Array.isArray(list) && list.length > 0) setAllDepartments(list);
    }).catch(() => {});
  }, []);
  const myEmpProfile = useMemo(
    () =>
      allEmployees.find(
        (e) =>
          (user?.id && e.id === user.id) ||
          (user?.employeeCode && e.employeeCode === user.employeeCode) ||
          (user?.email && e.email === user.email)
      ) || ({
        id: user?.id,
        employeeCode: user?.employeeCode,
        role: currentRole,
        departmentId: undefined,
      } as Partial<Employee>),
    [allEmployees, user, currentRole]
  );

  const isManager = isManagerEvaluatorRole(myEmpProfile, allDepartments as any);
  const canAuditCompany = ['HR_MANAGER', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT'].includes(currentRole);

  useEffect(() => {
    setViewScope(isManager ? 'MY_TEAM' : 'COMPANY_AUDIT');
  }, [isManager, currentRole]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await api.getEvaluationRoster(evalYear, evalMonth);
      // Bổ sung số ngày công trực tiếp từ Bảng chấm công Frontend nếu BE chưa có bản ghi MonthlyTimesheet tháng tương ứng
      const enriched = data.map((item) => {
        const empObj = allEmployees.find((e) => e.id === item.employeeId || e.employeeCode === item.employeeCode);
        if (!empObj) return item;
        const att = buildEmployeeMonthlyAttendance(empObj, evalMonth, evalYear);
        const canEvalCheck = canEvaluatorGradeTarget(myEmpProfile, empObj, allDepartments as any);
        return {
          ...item,
          actualWorkDays: item.actualWorkDays > 0 ? item.actualWorkDays : att.totalPaidDays,
          standardWorkDays: item.standardWorkDays > 0 ? item.standardWorkDays : att.stdDays,
          lateEarlyCount: att.lateEarlyCount,
          canEvaluate: item.canEvaluate ?? canEvalCheck.allowed,
        };
      });
      setRoster(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, currentRole]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const openEvaluationModal = (item: EvaluationRosterItem) => {
    const cur = item.currentEvaluation;
    const defaultGrade: EvaluationGrade = (cur?.grade as EvaluationGrade) || (item.lateEarlyCount > 2 ? 'B' : 'A');
    setFormState({
      attitudeScore: cur?.attitudeScore ?? 9,
      performanceScore: cur?.performanceScore ?? 9,
      grade: defaultGrade,
      evaluationPct: cur?.evaluationPct ?? getDefaultEvaluationPctForGrade(defaultGrade, cur?.cActionType || 'REMINDER'),
      rewardChoice: cur?.rewardChoice || 'NONE',
      rewardBonusAmount: cur?.rewardBonusAmount && cur.rewardBonusAmount > 0 ? cur.rewardBonusAmount : DEFAULT_SIX_MONTH_A_BONUS_VND,
      salaryRaiseAmount: cur?.salaryRaiseAmount && cur.salaryRaiseAmount > 0 ? cur.salaryRaiseAmount : 1_500_000,
      cActionType: (cur?.cActionType && cur.cActionType !== 'NONE' ? cur.cActionType : 'REMINDER') as EvaluationCAction,
      deductionAmount: cur?.deductionAmount && cur.deductionAmount > 0 ? cur.deductionAmount : 500_000,
      comment: cur?.comment || '',
    });
    setModalError(null);
    setSelectedItem(item);
  };

  const openHistoryModal = async (item: EvaluationRosterItem) => {
    const hist = await api.getEmployeeEvaluationHistory(item.employeeId);
    setHistoryTarget({ emp: item, records: hist });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalError(null);
    try {
      const saved = await api.submitMonthlyEvaluation({
        employeeId: selectedItem.employeeId,
        evalYear,
        evalMonth,
        attitudeScore: formState.attitudeScore,
        performanceScore: formState.performanceScore,
        grade: formState.grade,
        evaluationPct: formState.evaluationPct,
        rewardChoice: formState.grade === 'A' ? formState.rewardChoice : 'NONE',
        rewardBonusAmount: formState.rewardChoice === 'FIXED_BONUS' ? formState.rewardBonusAmount : 0,
        salaryRaiseAmount: formState.rewardChoice === 'SALARY_RAISE' ? formState.salaryRaiseAmount : 0,
        cActionType: formState.grade === 'C' ? formState.cActionType : 'NONE',
        deductionAmount: formState.grade === 'C' && formState.cActionType === 'DEDUCTION' ? formState.deductionAmount : 0,
        comment: formState.comment,
        actualWorkDays: selectedItem.actualWorkDays,
        standardWorkDays: selectedItem.standardWorkDays,
        lateEarlyCount: selectedItem.lateEarlyCount,
      });

      const bonusText =
        saved.rewardChoice === 'FIXED_BONUS'
          ? ` • Cộng thưởng ${formatVND(saved.rewardBonusAmount)}`
          : saved.rewardChoice === 'SALARY_RAISE'
          ? ` • Xét tăng lương +${formatVND(saved.salaryRaiseAmount)}`
          : '';
      const cText =
        saved.grade === 'C'
          ? saved.cActionType === 'DEDUCTION'
            ? ` • Giảm trừ ${formatVND(saved.deductionAmount)}`
            : ' • Đã ghi nhận nhắc nhở'
          : '';

      showToast(
        `Đã lưu đánh giá Loại ${saved.grade} kỳ ${String(evalMonth).padStart(2, '0')}/${evalYear} cho ${selectedItem.fullName}${bonusText}${cText}!`
      );
      setSelectedItem(null);
      await loadRoster();
    } catch (err: any) {
      setModalError(err?.message || 'Không thể lưu kết quả đánh giá!');
    }
  };

  const scopedBaseRoster = useMemo(() => {
    if (isManager && viewScope === 'MY_TEAM') {
      return roster.filter((item) => item.canEvaluate);
    }
    return roster;
  }, [roster, isManager, viewScope]);

  const filteredRoster = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedBaseRoster.filter((item) => {
      if (q) {
        const hay = `${item.employeeCode} ${item.fullName} ${item.position || ''} ${item.departmentName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const curGrade = item.currentEvaluation?.grade;
      if (gradeFilter === 'ELIGIBLE') return item.eligibleForSixMonthAReward;
      if (gradeFilter === 'UNGRADED') return !curGrade;
      if (gradeFilter === 'A' || gradeFilter === 'B' || gradeFilter === 'C') return curGrade === gradeFilter;
      return true;
    });
  }, [scopedBaseRoster, searchTerm, gradeFilter]);

  const countA = scopedBaseRoster.filter((r) => r.currentEvaluation?.grade === 'A').length;
  const countB = scopedBaseRoster.filter((r) => r.currentEvaluation?.grade === 'B').length;
  const countC = scopedBaseRoster.filter((r) => r.currentEvaluation?.grade === 'C').length;
  const eligibleCount = scopedBaseRoster.filter((r) => r.eligibleForSixMonthAReward).length;

  const personalSelfItem = !isManager
    ? roster.find((r) => (user?.id && r.employeeId === user.id) || (user?.employeeCode && r.employeeCode === user.employeeCode))
    : null;

  const [personalHistoryState, setPersonalHistoryState] = useState<PerformanceEvaluationRecord[]>([]);
  useEffect(() => {
    if (!personalSelfItem) {
      setPersonalHistoryState([]);
      return;
    }
    api.getEmployeeEvaluationHistory(personalSelfItem.employeeId).then((recs) => {
      if (Array.isArray(recs)) setPersonalHistoryState(recs);
    }).catch(() => {});
  }, [personalSelfItem?.employeeId]);

  const personalHistory = useMemo(() => {
    if (!personalSelfItem) return [];
    const base =
      personalHistoryState.length > 0
        ? personalHistoryState
        : sharedState
            .getMonthlyEvaluations()
            .filter((e) => e.employeeId === personalSelfItem.employeeId || e.employeeCode === personalSelfItem.employeeCode);
    const merged = [...base];
    if (
      personalSelfItem.currentEvaluation &&
      !merged.some(
        (m) =>
          m.evalYear === personalSelfItem.currentEvaluation!.evalYear &&
          m.evalMonth === personalSelfItem.currentEvaluation!.evalMonth
      )
    ) {
      merged.unshift(personalSelfItem.currentEvaluation);
    }
    return merged.sort((a, b) => (b.evalYear !== a.evalYear ? b.evalYear - a.evalYear : b.evalMonth - a.evalMonth));
  }, [personalSelfItem, personalHistoryState, roster]);

  const personalStreakSummary = useMemo(() => {
    if (!personalSelfItem) return null;
    const streak =
      personalSelfItem.currentEvaluation?.consecutiveAMonths ??
      (computeConsecutiveAStreakBefore(personalHistory, evalYear, evalMonth) +
        (personalSelfItem.currentEvaluation?.grade === 'A' ? 1 : 0));
    const elig = isEligibleForSixMonthAReward(personalHistory, evalYear, evalMonth);
    const yearlyUsedInclCurrent = computeYearlyARewardsUsed(personalHistory, evalYear);
    const rewardThisMonth = personalSelfItem.currentEvaluation?.rewardChoice || 'NONE';
    return {
      streak,
      unrewardedStreakBefore: elig.unrewardedStreakBefore,
      yearlyUsed: yearlyUsedInclCurrent,
      eligible: elig.eligible && rewardThisMonth === 'NONE',
      rewardThisMonth,
      rewardBonusAmount: personalSelfItem.currentEvaluation?.rewardBonusAmount || 0,
      salaryRaiseAmount: personalSelfItem.currentEvaluation?.salaryRaiseAmount || 0,
    };
  }, [personalSelfItem, personalHistory, evalYear, evalMonth]);

  return (
    <div>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '5rem',
            right: '1.5rem',
            zIndex: 9999,
            backgroundColor: '#065f46',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title" data-testid="evaluations-page-title">
            Đánh Giá Xếp Loại Nhân Sự Hàng Tháng (A / B / C)
          </h1>
          <p className="page-description">
            Trưởng phòng &amp; Kỹ sư trưởng đánh giá hàng tháng theo số ngày đi làm, thái độ và hiệu suất &bull; Chuỗi 6 tháng Loại A thưởng cố định 3 triệu / tăng lương ở tháng thứ 7 (tối đa 2 lần/năm)
          </p>
        </div>

        <div className="action-toolbar">
          <select
            className="form-select"
            data-testid="eval-month-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ width: '175px' }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Policy Rule Summary Strip */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '0.95rem 1.15rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
          <Info size={15} color="#0284c7" />
          <span>Quy Chế Đánh Giá Xếp Loại Hàng Tháng Công Ty Hải Minh</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '0.6rem 0.75rem', color: '#065f46' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Loại A — Tích cực, hiệu quả cao</div>
            <div>Đạt <strong>6 tháng liên tiếp Loại A</strong> được xét tăng lương hoặc cộng thưởng cố định (<strong>3.000.000đ/đợt</strong> vào tháng thứ 7, <strong>tối đa 2 lần/năm</strong>).</div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.6rem 0.75rem', color: '#1e40af' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Loại B — Đạt yêu cầu</div>
            <div>Giữ nguyên lương hiện hưởng (100% mức thỏa thuận, không thưởng thêm, không giảm trừ; reset chuỗi A liên tiếp).</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.6rem 0.75rem', color: '#991b1b' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Loại C — Thái độ / hiệu suất kém</div>
            <div>Nhắc nhở kiểm điểm hoặc giảm trừ theo quy định (khấu trừ trên kỳ lương &amp; ghi nhận hồ sơ kỷ luật).</div>
          </div>
        </div>
      </div>

      {/* 3. KPI Summary */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Nhân Sự Đánh Giá</span>
            <div className="kpi-icon-wrap" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <UserCheck size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums">{scopedBaseRoster.length}</div>
          <div className="kpi-subtext">
            {countA + countB + countC} đã xếp loại kỳ {String(evalMonth).padStart(2, '0')}/{evalYear}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Loại A &amp; Mốc Thưởng Tháng 7</span>
            <div className="kpi-icon-wrap" style={{ color: '#059669', backgroundColor: '#ecfdf5' }}>
              <Award size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#059669' }}>
            {countA} Loại A
          </div>
          <div className="kpi-subtext" style={{ color: eligibleCount > 0 ? '#047857' : undefined, fontWeight: eligibleCount > 0 ? 600 : 400 }}>
            {eligibleCount} nhân sự đạt mốc 6 tháng A liên tiếp
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Loại B (Giữ Nguyên Lương)</span>
            <div className="kpi-icon-wrap" style={{ color: '#1d4ed8', backgroundColor: '#dbeafe' }}>
              <Star size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#1d4ed8' }}>
            {countB}
          </div>
          <div className="kpi-subtext">Đạt yêu cầu, giữ nguyên lương</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Loại C (Nhắc Nhở / Trừ)</span>
            <div className="kpi-icon-wrap" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="kpi-value tabular-nums" style={{ color: '#dc2626' }}>
            {countC}
          </div>
          <div className="kpi-subtext">Cần nhắc nhở hoặc giảm trừ quy định</div>
        </div>
      </div>

      {/* 4. Personal Progress Card for Non-Managers */}
      {!isManager && personalSelfItem && personalStreakSummary && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderColor: '#bfdbfe', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Kết Quả Xếp Loại Cá Nhân: {personalSelfItem.fullName} ({personalSelfItem.employeeCode})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                Chuỗi Loại A hiện tại: <strong>{personalStreakSummary.streak}/{SIX_MONTH_A_STREAK_TARGET} tháng liên tiếp</strong> &bull; Số đợt thưởng 6T-A năm {evalYear}: <strong>{personalStreakSummary.yearlyUsed}/{MAX_A_REWARDS_PER_YEAR} lần</strong>
              </div>
            </div>
            <span className={`badge ${personalStreakSummary.rewardThisMonth !== 'NONE' || personalStreakSummary.eligible ? 'badge-success' : 'badge-info'}`}>
              {personalStreakSummary.rewardThisMonth === 'FIXED_BONUS'
                ? `Đã nhận thưởng 6T-A (+${formatVND(personalStreakSummary.rewardBonusAmount)})`
                : personalStreakSummary.rewardThisMonth === 'SALARY_RAISE'
                ? `Đã xét tăng lương (+${formatVND(personalStreakSummary.salaryRaiseAmount)})`
                : personalStreakSummary.eligible
                ? 'Đủ điều kiện thưởng 3tr / Xét tăng lương tháng thứ 7!'
                : `Cần thêm ${Math.max(0, SIX_MONTH_A_STREAK_TARGET - personalStreakSummary.unrewardedStreakBefore)} tháng Loại A nữa`}
            </span>
          </div>
        </div>
      )}

      {/* 5. Scope Switch Tabs (Manager Own Department vs Read-only Company Audit) & Table */}
      {isManager && canAuditCompany && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="eval-tab-my-team"
            onClick={() => setViewScope('MY_TEAM')}
            className={`btn ${viewScope === 'MY_TEAM' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Nhân Sự Phòng Ban / Công Trường Của Tôi ({roster.filter((r) => r.canEvaluate).length})
          </button>
          <button
            type="button"
            data-testid="eval-tab-company-audit"
            onClick={() => setViewScope('COMPANY_AUDIT')}
            className={`btn ${viewScope === 'COMPANY_AUDIT' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Tổng Hợp Toàn Công Ty — Chỉ Xem ({roster.length})
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="card-title">
              Bảng Đánh Giá Nhân Sự Kỳ {String(evalMonth).padStart(2, '0')}/{evalYear}
            </div>
            <p className="card-subtitle">
              {isManager && viewScope === 'MY_TEAM'
                ? 'Trưởng phòng nào chỉ đánh giá nhân viên thuộc đúng phòng ban đó; Kỹ sư trưởng chỉ đánh giá kỹ sư công trường (không đánh giá chéo phòng ban).'
                : canAuditCompany
                ? 'Chế độ Chỉ Xem phục vụ kiểm soát lương toàn công ty — không được đánh giá nhân sự ngoài phòng ban của mình.'
                : 'Dữ liệu xếp loại được bảo mật và đồng bộ trực tiếp vào kỳ tính lương tháng'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã NV, họ tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem', width: '210px' }}
              />
            </div>
            <select
              className="form-select"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as any)}
              style={{ width: '185px' }}
            >
              <option value="ALL">Tất cả xếp loại</option>
              <option value="ELIGIBLE">Đủ điều kiện 6T-A</option>
              <option value="A">Đã xếp Loại A</option>
              <option value="B">Đã xếp Loại B</option>
              <option value="C">Đã xếp Loại C</option>
              <option value="UNGRADED">Chưa đánh giá kỳ này</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nhân Sự &amp; Đơn Vị</th>
                <th className="text-center">Ngày Công Tháng</th>
                <th className="text-center">Chuỗi Loại A</th>
                <th className="text-center">Thái Độ / Hiệu Suất</th>
                <th className="text-center">Xếp Loại Kỳ</th>
                <th>Kết Quả &amp; Tác Động Lương</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2rem', color: '#64748b' }}>
                    Đang tải danh sách đánh giá nhân sự...
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2rem', color: '#64748b' }}>
                    Không có nhân sự phù hợp bộ lọc trong kỳ {String(evalMonth).padStart(2, '0')}/{evalYear}.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  const cur = item.currentEvaluation;
                  const streakTotal = cur ? cur.consecutiveAMonths : item.consecutiveABefore;
                  const spec = cur?.grade ? EVALUATION_GRADE_MAP[cur.grade] : null;
                  return (
                    <tr key={item.employeeId} data-testid={`eval-row-${item.employeeCode}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {item.employeeCode} — {item.fullName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {item.position} &bull; {item.departmentName}
                        </div>
                      </td>
                      <td className="text-center tabular-nums">
                        <div style={{ fontWeight: 600 }}>
                          {item.actualWorkDays} / {item.standardWorkDays} công
                        </div>
                        {item.lateEarlyCount > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#d97706' }}>Đi muộn/về sớm: {item.lateEarlyCount}</div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#059669' }}>Chuyên cần tốt</div>
                        )}
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <span
                            className={`badge ${
                              item.eligibleForSixMonthAReward
                                ? 'badge-success'
                                : streakTotal >= 4
                                ? 'badge-info'
                                : 'badge-slate'
                            }`}
                          >
                            {streakTotal}/{SIX_MONTH_A_STREAK_TARGET} tháng A
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Thưởng năm: {cur ? cur.yearlyRewardCountUsed : item.yearlyRewardCountUsed}/{MAX_A_REWARDS_PER_YEAR} lần
                          </span>
                        </div>
                      </td>
                      <td className="text-center tabular-nums">
                        {cur ? (
                          <span>
                            Thái độ <strong>{cur.attitudeScore}/10</strong> &bull; HS <strong>{cur.performanceScore}/10</strong>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chưa chấm điểm</span>
                        )}
                      </td>
                      <td className="text-center">
                        {cur && spec ? (
                          <span
                            className="badge"
                            style={{ backgroundColor: spec.badgeBg, color: spec.badgeColor, fontWeight: 700, borderColor: spec.badgeBg }}
                          >
                            Loại {cur.grade}
                          </span>
                        ) : item.eligibleForSixMonthAReward ? (
                          <span className="badge badge-warning">Chờ xét tháng 7 (6T-A)</span>
                        ) : (
                          <span className="badge badge-slate">Chưa xếp loại</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.76rem' }}>
                        {cur ? (
                          <div>
                            {cur.rewardChoice === 'FIXED_BONUS' && (
                              <div style={{ color: '#047857', fontWeight: 700 }}>
                                <TrendingUp size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                Cộng thưởng 6 tháng A: +{formatVND(cur.rewardBonusAmount)}
                              </div>
                            )}
                            {cur.rewardChoice === 'SALARY_RAISE' && (
                              <div style={{ color: '#0369a1', fontWeight: 700 }}>
                                <TrendingUp size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                Xét tăng lương cơ bản: +{formatVND(cur.salaryRaiseAmount)}
                              </div>
                            )}
                            {cur.grade === 'B' && (
                              <div style={{ color: '#1d4ed8', fontWeight: 600 }}>Đạt yêu cầu — Giữ nguyên lương</div>
                            )}
                            {cur.grade === 'C' && (
                              <div style={{ color: '#b91c1c', fontWeight: 600 }}>
                                {cur.cActionType === 'DEDUCTION'
                                  ? `Giảm trừ quy định: -${formatVND(cur.deductionAmount)} (HQCV ${Math.round(cur.evaluationPct * 100)}%)`
                                  : 'Nhắc nhở kiểm điểm thái độ / hiệu suất'}
                              </div>
                            )}
                            {cur.comment && (
                              <div style={{ color: '#475569', marginTop: '2px' }}>{cur.comment}</div>
                            )}
                          </div>
                        ) : item.eligibleForSixMonthAReward ? (
                          <span style={{ color: '#047857', fontWeight: 600 }}>
                            Đạt 6 tháng liên tiếp Loại A → Tháng thứ 7 đủ điều kiện thưởng 3.000.000đ hoặc tăng lương!
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Chưa có dữ liệu kỳ {evalMonth}/{evalYear}</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {item.canEvaluate && viewScope === 'MY_TEAM' && (
                            <button
                              type="button"
                              data-testid={`eval-btn-${item.employeeCode}`}
                              onClick={() => openEvaluationModal(item)}
                              className="btn btn-primary btn-sm"
                            >
                              {cur ? 'Sửa Đánh Giá' : 'Đánh Giá'}
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`history-btn-${item.employeeCode}`}
                            onClick={() => openHistoryModal(item)}
                            className="btn btn-secondary btn-sm"
                            title="Xem lịch sử các tháng"
                          >
                            <History size={13} />
                          </button>
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

      {/* 6. Modal Đánh Giá Hàng Tháng */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Đánh Giá Xếp Loại Tháng {String(evalMonth).padStart(2, '0')}/{evalYear}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedItem.employeeCode} — {selectedItem.fullName} ({selectedItem.position})
                </span>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="btn-icon">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.6rem',
                    padding: '0.7rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                  }}
                >
                  <div>
                    <div style={{ color: '#64748b' }}>Ngày đi làm tháng</div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {selectedItem.actualWorkDays} / {selectedItem.standardWorkDays} công
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Chuỗi A trước kỳ này</div>
                    <div style={{ fontWeight: 700, color: '#047857' }}>
                      {selectedItem.unrewardedABefore}/{SIX_MONTH_A_STREAK_TARGET} tháng chưa xét thưởng
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Mốc năm {evalYear}</div>
                    <div style={{ fontWeight: 700, color: '#0369a1' }}>
                      Đã dùng {selectedItem.yearlyRewardCountUsed}/{MAX_A_REWARDS_PER_YEAR} lần
                    </div>
                  </div>
                </div>

                {selectedItem.eligibleForSixMonthAReward && (
                  <div
                    data-testid="six-month-a-eligible-banner"
                    style={{
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    Đạt 6 tháng liên tiếp Loại A! Bước sang tháng thứ 7 đủ điều kiện xét tăng lương hoặc cộng thưởng cố định (3.000.000đ/đợt).
                  </div>
                )}

                <div className="form-grid-2">
                  <div>
                    <label className="form-label">Điểm Thái Độ &amp; Kỷ Luật (1 - 10):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      data-testid="eval-attitude-input"
                      className="form-input"
                      value={formState.attitudeScore}
                      onChange={(e) => setFormState({ ...formState, attitudeScore: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Điểm Hiệu Suất Công Việc (1 - 10):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      data-testid="eval-performance-input"
                      className="form-input"
                      value={formState.performanceScore}
                      onChange={(e) => setFormState({ ...formState, performanceScore: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Xếp Loại Đánh Giá Tháng:</label>
                  <select
                    data-testid="eval-grade-select"
                    className="form-select"
                    value={formState.grade}
                    onChange={(e) => {
                      const nextGrade = e.target.value as EvaluationGrade;
                      const nextCAction = nextGrade === 'C' ? (formState.cActionType === 'NONE' ? 'REMINDER' : formState.cActionType) : 'NONE';
                      setFormState({
                        ...formState,
                        grade: nextGrade,
                        evaluationPct: getDefaultEvaluationPctForGrade(nextGrade, nextCAction),
                        rewardChoice: nextGrade === 'A' ? formState.rewardChoice : 'NONE',
                        cActionType: nextCAction,
                      });
                    }}
                  >
                    <option value="A">Loại A — Tích cực, hiệu quả cao (Tích lũy thưởng 6 tháng A)</option>
                    <option value="B">Loại B — Đạt yêu cầu (Giữ nguyên lương hiện hưởng)</option>
                    <option value="C">Loại C — Thái độ / hiệu suất kém (Nhắc nhở hoặc Giảm trừ)</option>
                  </select>
                </div>

                {formState.grade === 'A' && selectedItem.eligibleForSixMonthAReward && (
                  <div style={{ padding: '0.75rem', border: '1px solid #a7f3d0', borderRadius: '6px', backgroundColor: '#f0fdf4' }}>
                    <label className="form-label" style={{ color: '#065f46' }}>
                      Quyền Lợi Tháng Thứ 7 (Chuỗi 6 Tháng Loại A Liên Tiếp):
                    </label>
                    <select
                      data-testid="eval-reward-choice"
                      className="form-select"
                      value={formState.rewardChoice}
                      onChange={(e) => setFormState({ ...formState, rewardChoice: e.target.value as EvaluationRewardChoice })}
                    >
                      <option value="NONE">Chưa chọn đợt này (Bảo lưu điểm A)</option>
                      <option value="FIXED_BONUS">Cộng thưởng cố định vào kỳ lương (Mặc định 3.000.000 VNĐ)</option>
                      <option value="SALARY_RAISE">Xét tăng lương cơ bản hàng tháng</option>
                    </select>

                    {formState.rewardChoice === 'FIXED_BONUS' && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <label className="form-label">Số Tiền Thưởng Cố Định (VNĐ):</label>
                        <input
                          type="number"
                          min={0}
                          step={100000}
                          data-testid="eval-bonus-input"
                          className="form-input"
                          value={formState.rewardBonusAmount}
                          onChange={(e) => setFormState({ ...formState, rewardBonusAmount: Number(e.target.value) || 0 })}
                        />
                      </div>
                    )}

                    {formState.rewardChoice === 'SALARY_RAISE' && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <label className="form-label">
                          Mức Tăng Lương Cơ Bản (VNĐ/tháng — Lương hiện tại: {formatVND(selectedItem.baseSalary)}):
                        </label>
                        <input
                          type="number"
                          min={100000}
                          step={100000}
                          data-testid="eval-raise-input"
                          className="form-input"
                          value={formState.salaryRaiseAmount}
                          onChange={(e) => setFormState({ ...formState, salaryRaiseAmount: Number(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {formState.grade === 'B' && (
                  <div style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.78rem' }}>
                    <strong>Loại B (Đạt yêu cầu):</strong> Giữ nguyên mức lương thỏa thuận hiện tại ({formatVND(selectedItem.baseSalary)} • 100% HQCV), không thưởng thêm và không giảm trừ.
                  </div>
                )}

                {formState.grade === 'C' && (
                  <div style={{ padding: '0.75rem', border: '1px solid #fecaca', borderRadius: '6px', backgroundColor: '#fef2f2' }}>
                    <label className="form-label" style={{ color: '#991b1b' }}>
                      Hình Thức Xử Lý Loại C Theo Quy Định:
                    </label>
                    <select
                      data-testid="eval-c-action-select"
                      className="form-select"
                      value={formState.cActionType}
                      onChange={(e) => {
                        const act = e.target.value as EvaluationCAction;
                        setFormState({
                          ...formState,
                          cActionType: act,
                          evaluationPct: getDefaultEvaluationPctForGrade('C', act),
                        });
                      }}
                    >
                      <option value="REMINDER">Nhắc nhở / Kiểm điểm bằng văn bản (Chưa giảm trừ tiền lương)</option>
                      <option value="DEDUCTION">Giảm trừ theo quy định (Trừ trực tiếp trên Bảng lương &amp; hạ % HQCV)</option>
                    </select>

                    {formState.cActionType === 'DEDUCTION' && (
                      <div className="form-grid-2" style={{ marginTop: '0.6rem' }}>
                        <div>
                          <label className="form-label">Số Tiền Giảm Trừ Quy Định (VNĐ):</label>
                          <input
                            type="number"
                            min={0}
                            step={50000}
                            data-testid="eval-deduction-input"
                            className="form-input"
                            value={formState.deductionAmount}
                            onChange={(e) => setFormState({ ...formState, deductionAmount: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Tỷ Lệ Lương Hiệu Quả (0 - 1):</label>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            className="form-input"
                            value={formState.evaluationPct}
                            onChange={(e) => setFormState({ ...formState, evaluationPct: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Nhận Xét Của Trưởng Phòng / Kỹ Sư Trưởng {formState.grade === 'C' ? '(Bắt buộc)' : ''}:
                  </label>
                  <textarea
                    rows={3}
                    data-testid="eval-comment-input"
                    className="form-input"
                    placeholder="Ghi nhận thái độ làm việc, tiến độ bàn giao, kỷ luật chấm công..."
                    value={formState.comment}
                    onChange={(e) => setFormState({ ...formState, comment: e.target.value })}
                  />
                </div>

                {modalError && (
                  <div
                    data-testid="eval-modal-error"
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                    }}
                  >
                    {modalError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                  Hủy
                </button>
                <button type="submit" data-testid="eval-submit-btn" className="btn btn-primary">
                  <CheckCircle2 size={14} />
                  <span>Lưu Xếp Loại Tháng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. History Modal */}
      {historyTarget && (
        <div className="modal-backdrop" onClick={() => setHistoryTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Lịch Sử Đánh Giá Xếp Loại — {historyTarget.emp.employeeCode} {historyTarget.emp.fullName}
                </h3>
                <span className="text-xs text-slate-500">
                  Theo dõi chuỗi 6 tháng Loại A liên tiếp &amp; quyền lợi thưởng tối đa 2 lần/năm
                </span>
              </div>
              <button type="button" onClick={() => setHistoryTarget(null)} className="btn-icon">
                <XCircle size={18} />
              </button>
            </div>
            <div className="modal-body">
              {historyTarget.records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                  Chưa có lịch sử đánh giá cho nhân sự này.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kỳ</th>
                        <th className="text-center">Xếp Loại</th>
                        <th className="text-center">Chuỗi A</th>
                        <th className="text-center">Điểm (TĐ/HS)</th>
                        <th>Thưởng / Giảm Trừ</th>
                        <th>Người Đánh Giá &amp; Nhận Xét</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyTarget.records.map((rec) => {
                        const spec = EVALUATION_GRADE_MAP[rec.grade];
                        return (
                          <tr key={rec.id}>
                            <td className="tabular-nums font-semibold">
                              T{String(rec.evalMonth).padStart(2, '0')}/{rec.evalYear}
                            </td>
                            <td className="text-center">
                              <span
                                className="badge"
                                style={{ backgroundColor: spec?.badgeBg || '#f1f5f9', color: spec?.badgeColor || '#334155', fontWeight: 700 }}
                              >
                                Loại {rec.grade}
                              </span>
                            </td>
                            <td className="text-center tabular-nums">{rec.consecutiveAMonths}</td>
                            <td className="text-center tabular-nums">
                              {rec.attitudeScore}/{rec.performanceScore}
                            </td>
                            <td style={{ fontSize: '0.75rem' }}>
                              {rec.rewardChoice === 'FIXED_BONUS' && (
                                <span style={{ color: '#047857', fontWeight: 600 }}>+{formatVND(rec.rewardBonusAmount)}</span>
                              )}
                              {rec.rewardChoice === 'SALARY_RAISE' && (
                                <span style={{ color: '#0369a1', fontWeight: 600 }}>Tăng +{formatVND(rec.salaryRaiseAmount)}</span>
                              )}
                              {rec.grade === 'C' && rec.cActionType === 'DEDUCTION' && (
                                <span style={{ color: '#b91c1c', fontWeight: 600 }}>-{formatVND(rec.deductionAmount)}</span>
                              )}
                              {rec.rewardChoice === 'NONE' && rec.cActionType !== 'DEDUCTION' && (
                                <span style={{ color: '#64748b' }}>—</span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.75rem' }}>
                              <div style={{ fontWeight: 600 }}>{rec.evaluatorName}</div>
                              <div style={{ color: '#475569' }}>{rec.comment}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setHistoryTarget(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
