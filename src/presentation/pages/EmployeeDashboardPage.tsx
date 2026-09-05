import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { 
  LogOut, 
  Coins, 
  CalendarRange, 
  Percent, 
  User, 
  Building, 
  Briefcase, 
  Calendar, 
  Printer, 
  Sun, 
  Moon,
  TrendingDown,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();
  const { theme, toggleTheme } = useTheme();

  // Employee details from session
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Submit request states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqType, setReqType] = useState<'advance' | 'leave'>('leave');
  const [reqAmount, setReqAmount] = useState('');
  const reqLeaveType = 'paid_leave';
  const [reqDays, setReqDays] = useState('');
  const [reqStartDate, setReqStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reqReason, setReqReason] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');
  const [reqErrorMsg, setReqErrorMsg] = useState('');

  // Month selection
  const [availableMonths, setAvailableMonths] = useState<{ label: string; value: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Format: YYYY-MM

  // Check login
  useEffect(() => {
    const sessionStr = localStorage.getItem('employeeSession');
    if (!sessionStr) {
      navigate(`/t/${tenantId}/employee/login`);
      return;
    }
    const sess = JSON.parse(sessionStr);
    if (sess.tenantId !== tenantId) {
      localStorage.removeItem('employeeSession');
      navigate(`/t/${tenantId}/employee/login`);
      return;
    }
    setSession(sess);

    // Generate last 6 months for dropdown
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
      months.push({ label, value: `${year}-${month}` });
      date.setMonth(date.getMonth() - 1);
    }
    setAvailableMonths(months);
    setSelectedMonth(months[0].value);
  }, [navigate, tenantId]);

  // Load employee data
  const loadEmployeeData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { employeeId, password } = session;

      // 1. Fetch Profile
      const { data: profData, error: profErr } = await supabase.rpc('get_employee_profile', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (profErr) throw profErr;
      if (profData && profData.length > 0) {
        setProfile(profData[0]);
      }

      // 2. Fetch Deductions
      const { data: dedData, error: dedErr } = await supabase.rpc('get_employee_deductions', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (dedErr) throw dedErr;
      setDeductions(dedData || []);

      // 3. Fetch Advances
      const { data: advData, error: advErr } = await supabase.rpc('get_employee_advances', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (advErr) throw advErr;
      setAdvances(advData || []);

      // 4. Fetch Leaves
      const { data: leaveData, error: leaveErr } = await supabase.rpc('get_employee_leaves', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (leaveErr) throw leaveErr;
      setLeaves(leaveData || []);

      // 5. Fetch settings
      const { data: settsData, error: settsErr } = await supabase.rpc('get_employee_settings', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (settsErr) throw settsErr;
      if (settsData && settsData.length > 0) {
        setSettings(settsData[0]);
      } else {
        // Fallback default settings
        setSettings({
          paid_leaves_limit: 2,
          excused_absence_deduction: 1.0,
          unexcused_absence_deduction: 2.0,
          allow_employee_view_salary: true,
          allow_employee_submit_requests: true
        });
      }

      // 6. Fetch requests
      const { data: reqData, error: reqErr } = await supabase.rpc('get_employee_requests', {
        p_employee_id: employeeId,
        p_password: password
      });
      if (reqErr) throw reqErr;
      setRequests(reqData || []);

    } catch (err) {
      console.error('Error fetching employee dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadEmployeeData();
    }
  }, [session]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (settings && settings.allow_employee_submit_requests === false) {
      setReqErrorMsg('تقديم الطلبات مغلق حالياً بواسطة إدارة المنشأة.');
      return;
    }
    setSubmittingReq(true);
    setReqSuccessMsg('');
    setReqErrorMsg('');
    try {
      const { employeeId, password } = session;
      const amountVal = reqType === 'advance' ? Number(reqAmount) : null;
      const leaveTypeVal = reqType === 'leave' ? reqLeaveType : null;
      const daysVal = reqType === 'leave' ? Number(reqDays) : null;

      const { error } = await supabase.rpc('create_employee_request', {
        p_employee_id: employeeId,
        p_password: password,
        p_request_type: reqType,
        p_amount: amountVal,
        p_leave_type: leaveTypeVal,
        p_days: daysVal,
        p_start_date: reqStartDate,
        p_reason: reqReason
      });

      if (error) throw error;

      setReqSuccessMsg('تم تقديم الطلب بنجاح وهو قيد الانتظار لموافقة الإدارة.');
      setReqAmount('');
      setReqDays('');
      setReqReason('');
      
      const { data: reqData } = await supabase.rpc('get_employee_requests', {
        p_employee_id: employeeId,
        p_password: password
      });
      setRequests(reqData || []);

      setTimeout(() => {
        setShowRequestModal(false);
        setReqSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setReqErrorMsg(err.message || 'فشل تقديم الطلب. يرجى التحقق من المدخلات.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('employeeSession');
    navigate(`/t/${tenantId}/employee/login`);
  };

  // Helper filters for selected month
  const getMonthDeductions = () => {
    return deductions.filter(d => d.deduction_date.startsWith(selectedMonth));
  };

  const getMonthAdvances = () => {
    return advances.filter(a => a.advance_date.startsWith(selectedMonth));
  };

  const getMonthLeaves = () => {
    // Check if start_date or end_date falls within the selected month
    return leaves.filter(l => l.start_date.startsWith(selectedMonth) || l.end_date.startsWith(selectedMonth));
  };

  // Calculation variables
  const salary = profile ? Number(profile.salary) : 0;
  const dailyRate = salary / 30;

  // Proration Logic based on Hire Date & End of Service Date
  const getProrationInfo = () => {
    if (!profile || !selectedMonth) return { activeDays: 30, isProrated: false, proratedBasicEarnings: salary };

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);

    const parseDateOnly = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    const hireDate = parseDateOnly(profile.hire_date);
    const endDate = profile.end_of_service_date ? parseDateOnly(profile.end_of_service_date) : null;

    if (hireDate > monthEnd || (endDate && endDate < monthStart)) {
      return { activeDays: 0, isProrated: true, proratedBasicEarnings: 0 };
    }

    const activeStart = hireDate > monthStart ? hireDate : monthStart;
    const activeEnd = endDate && endDate < monthEnd ? endDate : monthEnd;

    // Check if worked the entire full month (no proration)
    if (hireDate <= monthStart && (!endDate || endDate >= monthEnd)) {
      return { activeDays: 30, isProrated: false, proratedBasicEarnings: salary };
    }

    const diffTime = Math.abs(activeEnd.getTime() - activeStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const activeDays = Math.min(30, diffDays);

    return {
      activeDays,
      isProrated: true,
      proratedBasicEarnings: Math.min(salary, dailyRate * activeDays)
    };
  };

  const { activeDays, isProrated, proratedBasicEarnings } = getProrationInfo();

  // Filtered lists
  const currentMonthDeductions = getMonthDeductions();
  const currentMonthAdvances = getMonthAdvances();
  const currentMonthLeaves = getMonthLeaves();

  // 1. Direct monetary deductions sum
  const directDeductionsAmount = currentMonthDeductions
    .filter(d => d.deduction_type === 'amount')
    .reduce((sum, d) => sum + Number(d.value), 0);

  // 2. Day-based deductions sum (e.g. penalty days)
  const dayDeductionsDays = currentMonthDeductions
    .filter(d => d.deduction_type === 'days')
    .reduce((sum, d) => sum + Number(d.value), 0);
  const dayDeductionsAmount = dayDeductionsDays * dailyRate;

  // 3. Excused absence deduction
  const excusedAbsenceDays = currentMonthLeaves
    .filter(l => l.leave_type === 'excused_absence')
    .reduce((sum, l) => sum + Number(l.days), 0);
  const excusedAbsenceFactor = settings ? Number(settings.excused_absence_deduction) : 1.0;
  const excusedAbsenceAmount = excusedAbsenceDays * excusedAbsenceFactor * dailyRate;

  // 4. Unexcused absence deduction
  const unexcusedAbsenceDays = currentMonthLeaves
    .filter(l => l.leave_type === 'unexcused_absence')
    .reduce((sum, l) => sum + Number(l.days), 0);
  const unexcusedAbsenceFactor = settings ? Number(settings.unexcused_absence_deduction) : 2.0;
  const unexcusedAbsenceAmount = unexcusedAbsenceDays * unexcusedAbsenceFactor * dailyRate;

  // 5. Exceeded Paid Leaves deduction
  const paidLeavesDays = currentMonthLeaves
    .filter(l => l.leave_type === 'paid_leave')
    .reduce((sum, l) => sum + Number(l.days), 0);
  const paidLeavesLimit = settings ? Number(settings.paid_leaves_limit) : 2;
  const exceededLeavesDays = Math.max(0, paidLeavesDays - paidLeavesLimit);
  const exceededLeavesAmount = exceededLeavesDays * dailyRate;

  // 6. Advances sum
  const advancesAmount = currentMonthAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

  // Totals
  const totalDeductions = directDeductionsAmount + dayDeductionsAmount + excusedAbsenceAmount + unexcusedAbsenceAmount + exceededLeavesAmount;
  const netSalary = Math.max(0, proratedBasicEarnings - totalDeductions - advancesAmount);


  // Selected month label
  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans pb-12" dir="rtl">
      {/* Top Navbar */}
      <header className="print:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors duration-300 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">بوابة الموظف</h1>
            <p className="text-[10px] text-slate-400 font-medium">نظام الخدمة الذاتية</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Submit Request */}
          {(!settings || settings.allow_employee_submit_requests) && (
            <button
              onClick={() => {
                setReqStartDate(new Date().toISOString().split('T')[0]);
                setShowRequestModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-semibold transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>تقديم طلب جديد</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 rounded-md text-xs font-semibold transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-slate-500 text-xs">
            <svg className="animate-spin h-5 w-5 text-slate-700 dark:text-slate-300 ml-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            جاري تحميل تفاصيل الراتب...
          </div>
        ) : !profile ? (
          <div className="p-8 text-center text-red-500 font-sans text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            فشل تحميل الملف الشخصي. يرجى تسجيل الخروج والمحاولة مرة أخرى.
          </div>
        ) : (
          <>
            {/* Welcoming and Selection Section */}
            <section className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <User className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{profile.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-1 font-medium">
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {profile.job_title}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {profile.branch_name}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> تعيين: {profile.hire_date}</span>
                    {profile.end_of_service_date && (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="flex items-center gap-1 text-red-500 font-semibold bg-red-50/50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                          نهاية الخدمة: {profile.end_of_service_date}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Month selector */}
              <div className="space-y-1 self-start md:self-center">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">حدد الشهر المالي</label>
                <select
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none w-48 font-semibold"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Print Specific Header */}
            <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-6">
              <h1 className="text-xl font-bold text-slate-900">{profile.tenant_name}</h1>
              <p className="text-xs text-slate-500 font-medium">تقرير مفردات المرتب الشهري (Pay Slip)</p>
            </div>

            {/* Statistics Cards & Payslip Details */}
            {settings && settings.allow_employee_view_salary === false ? (
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 text-center shadow-sm">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">تفاصيل الراتب غير متاحة</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                  لقد تم إيقاف صلاحية عرض تفاصيل الرواتب وكشف مفردات المرتب حالياً بواسطة إدارة المنشأة. يرجى مراجعة الموارد البشرية لأي استفسارات مالية.
                </p>
              </section>
            ) : (
              <>
                {/* Statistics Cards */}
                <section className="print:hidden grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-400">الراتب المستحق (الأساسي)</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {proratedBasicEarnings.toLocaleString()} ج.م
                      {isProrated && (
                        <span className="text-[9px] block text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                          (محتسب عن {activeDays} يوم عمل)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-400">الخصومات لشهر {selectedMonthLabel}</span>
                    <span className="text-base font-bold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      <span>{totalDeductions.toLocaleString()} ج.م</span>
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-400">السلف المستقطعة</span>
                    <span className="text-base font-bold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      <span>{advancesAmount.toLocaleString()} ج.م</span>
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col justify-between bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">صافي الراتب المستحق</span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-5 w-5" />
                      <span>{netSalary.toLocaleString()} ج.م</span>
                    </span>
                  </div>
                </section>

                {/* Detailed Pay Slip Card */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
                  {/* Card Title */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-slate-500" />
                        <span>مفردات الراتب لشهر: {selectedMonthLabel}</span>
                      </h3>
                      <p className="text-[9px] text-slate-400 font-medium print:hidden">التقرير المالي للراتب والاستقطاعات التفصيلية</p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="print:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-[10px] font-bold transition-all shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>طباعة أو حفظ PDF</span>
                    </button>
                  </div>

                  {/* Employee summary in Print */}
                  <div className="hidden print:grid grid-cols-2 gap-4 p-4 border-b border-slate-200 text-xs">
                    <div>
                      <strong>اسم الموظف:</strong> {profile.name} <br />
                      <strong>المسمى الوظيفي:</strong> {profile.job_title} <br />
                      <strong>الفرع:</strong> {profile.branch_name}
                    </div>
                    <div className="text-left">
                      <strong>الشركة / المنشأة:</strong> {profile.tenant_name} <br />
                      <strong>تاريخ التعيين:</strong> {profile.hire_date} <br />
                      {profile.end_of_service_date && (
                        <>
                          <strong>تاريخ نهاية الخدمة:</strong> {profile.end_of_service_date} <br />
                        </>
                      )}
                      <strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('ar-EG')}
                    </div>
                  </div>

                  {/* Pay breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-slate-800">
                    {/* Earnings Column */}
                    <div className="p-6 space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>الاستحقاقات (المدخولات)</span>
                      </h4>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">الراتب التعاقدي الأساسي</span>
                        <span className="font-mono font-semibold">{salary.toLocaleString()} ج.م</span>
                      </div>
                      {isProrated && (
                        <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span>أيام العمل الفعلية في الشهر</span>
                          <span className="font-mono font-semibold">{activeDays} / 30 يوم</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">{isProrated ? 'الراتب المستحق عن فترة العمل' : 'الراتب الأساسي الثابت'}</span>
                        <span className="font-mono font-semibold">{proratedBasicEarnings.toLocaleString()} ج.م</span>
                      </div>
                      <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <span>إجمالي الاستحقاقات</span>
                        <span className="font-mono">{proratedBasicEarnings.toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div className="p-6 space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5 text-red-500 dark:text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span>الاستقطاعات (الخصومات والعهود)</span>
                      </h4>
                      <div className="space-y-2.5 text-xs font-medium">
                        {/* direct deductions */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">خصومات مالية مباشرة</span>
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {directDeductionsAmount > 0 ? `-${directDeductionsAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* penalty days */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">خصومات عقوبات أيام العمل ({dayDeductionsDays} يوم)</span>
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {dayDeductionsAmount > 0 ? `-${dayDeductionsAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* excused absence */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">غياب بإذن ({excusedAbsenceDays} يوم × معامل {excusedAbsenceFactor})</span>
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {excusedAbsenceAmount > 0 ? `-${excusedAbsenceAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* unexcused absence */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">غياب بدون إذن ({unexcusedAbsenceDays} يوم × معامل {unexcusedAbsenceFactor})</span>
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {unexcusedAbsenceAmount > 0 ? `-${unexcusedAbsenceAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* exceeded leaves */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">إجازات زائدة عن رصيد الحد ({exceededLeavesDays} يوم)</span>
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {exceededLeavesAmount > 0 ? `-${exceededLeavesAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* advances */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">سلف وعهود مستقطعة</span>
                          <span className="font-mono text-red-600 dark:text-red-400 font-semibold">
                            {advancesAmount > 0 ? `-${advancesAmount.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-1 text-xs text-red-700 dark:text-red-400">
                        <div className="flex items-center justify-between font-bold">
                          <span>إجمالي الخصومات المستقطعة</span>
                          <span className="font-mono">-{totalDeductions.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex items-center justify-between font-bold">
                          <span>إجمالي السلف المستحقة</span>
                          <span className="font-mono">-{advancesAmount.toLocaleString()} ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net pay summary footer block */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 px-6 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">الصافي النهائي للاستلام</span>
                      <p className="text-sm font-medium mt-0.5">صافي الراتب المستحق في اليد بعد خصم الاستقطاعات والسلف</p>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                      {netSalary.toLocaleString()} ج.م
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Month Logs & Details Lists */}
            <section className="print:hidden space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">سجل حركات وتفاصيل شهر {selectedMonthLabel}</h3>
              </div>

              <div className={settings && settings.allow_employee_view_salary === false ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 md:grid-cols-3 gap-6"}>
                {(!settings || settings.allow_employee_view_salary !== false) && (
                  <>
                    {/* 1. Deductions List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Percent className="h-4 w-4 text-slate-400" />
                        <span>الخصومات المسجلة ({currentMonthDeductions.length})</span>
                      </h4>
                      {currentMonthDeductions.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4">لا يوجد خصومات مسجلة هذا الشهر.</p>
                      ) : (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                          {currentMonthDeductions.map((d) => (
                            <div key={d.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-red-600 dark:text-red-400">
                                  {d.deduction_type === 'days' ? `${d.value} يوم` : `${Number(d.value).toLocaleString()} ج.م`}
                                </span>
                                <span className="font-mono text-slate-400">{d.deduction_date}</span>
                              </div>
                              <p className="text-slate-500 font-medium">{d.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Advances List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-slate-400" />
                        <span>السلف المستلمة ({currentMonthAdvances.length})</span>
                      </h4>
                      {currentMonthAdvances.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4">لا يوجد سلف مسجلة هذا الشهر.</p>
                      ) : (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                          {currentMonthAdvances.map((a) => (
                            <div key={a.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-red-600 dark:text-red-400">
                                  {Number(a.amount).toLocaleString()} ج.م
                                </span>
                                <span className="font-mono text-slate-400">{a.advance_date}</span>
                              </div>
                              <p className="text-slate-500 font-medium">{a.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 3. Leaves & Absences List */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CalendarRange className="h-4 w-4 text-slate-400" />
                    <span>الإجازات والغياب ({currentMonthLeaves.length})</span>
                  </h4>
                  {currentMonthLeaves.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">لا يوجد إجازات أو غيابات مسجلة.</p>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {currentMonthLeaves.map((l) => (
                        <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className={
                              l.leave_type === 'paid_leave' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : l.leave_type === 'excused_absence' 
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-red-600 dark:text-red-400'
                            }>
                              {l.leave_type === 'paid_leave' && 'إجازة مدفوعة'}
                              {l.leave_type === 'excused_absence' && 'غياب بإذن'}
                              {l.leave_type === 'unexcused_absence' && 'غياب بدون إذن'}
                            </span>
                            <span className="font-mono text-slate-400">{l.start_date}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                            <span>المدة: {l.days} يوم</span>
                            {l.start_date !== l.end_date && <span>حتى: {l.end_date}</span>}
                          </div>
                          <p className="text-slate-500 font-medium mt-1">{l.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Requests Section */}
            <section className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>طلباتي السابقة والجديدة ({requests.length})</span>
              </h3>
              {requests.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-6">لا توجد طلبات سلف أو إجازات مقدمة حالياً.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2">نوع الطلب</th>
                        <th className="py-2">التفاصيل</th>
                        <th className="py-2">السبب</th>
                        <th className="py-2">تاريخ التقديم</th>
                        <th className="py-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {requests.map((r) => (
                        <tr key={r.id} className="text-slate-600 dark:text-slate-300">
                          <td className="py-3.5 font-bold">
                            {r.request_type === 'advance' ? 'طلب سلفة' : 'طلب إجازة'}
                          </td>
                          <td className="py-3.5">
                            {r.request_type === 'advance' ? (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                {settings && settings.allow_employee_view_salary === false ? 'طلب سلفة (المبلغ مخفي)' : `${Number(r.amount).toLocaleString()} ج.م`}
                              </span>
                            ) : (
                              <span>
                                {r.leave_type === 'paid_leave' && 'إجازة مدفوعة'}
                                {r.leave_type === 'excused_absence' && 'غياب بإذن'}
                                {r.leave_type === 'unexcused_absence' && 'غياب بدون إذن'}
                                {' '}
                                ({r.days} يوم) ابتداءً من {r.start_date}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 max-w-[200px] truncate font-medium" title={r.reason}>
                            {r.reason}
                          </td>
                          <td className="py-3.5 text-slate-400 font-mono">
                            {new Date(r.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              r.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                                : r.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                            }`}>
                              {r.status === 'pending' && <Clock className="h-2.5 w-2.5" />}
                              {r.status === 'approved' && <CheckCircle className="h-2.5 w-2.5" />}
                              {r.status === 'rejected' && <XCircle className="h-2.5 w-2.5" />}
                              {r.status === 'pending' && 'قيد الانتظار'}
                              {r.status === 'approved' && 'تمت الموافقة'}
                              {r.status === 'rejected' && 'تم الرفض'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Request Submission Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-xl animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-slate-500" />
                <span>تقديم طلب مالي أو إداري جديد</span>
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
              {reqSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 rounded text-[11px] font-semibold text-center">
                  {reqSuccessMsg}
                </div>
              )}
              {reqErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 rounded text-[11px] font-semibold text-center">
                  {reqErrorMsg}
                </div>
              )}

              {/* Request Type Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">نوع الطلب</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReqType('leave')}
                    className={`py-2 text-xs font-bold rounded border transition-colors ${
                      reqType === 'leave'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-transparent border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                    }`}
                  >
                    طلب إجازة
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('advance')}
                    className={`py-2 text-xs font-bold rounded border transition-colors ${
                      reqType === 'advance'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-transparent border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                    }`}
                  >
                    طلب سلفة مالية
                  </button>
                </div>
              </div>

              {reqType === 'advance' ? (
                /* Advance Request Fields */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">مبلغ السلفة (ج.م)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="مثال: 500"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-950 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                      value={reqAmount}
                      onChange={(e) => setReqAmount(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                /* Leave Request Fields */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">عدد الأيام المطلوبة</label>
                    <input
                      type="number"
                      required
                      min="0.25"
                      step="0.25"
                      placeholder="مثال: 2"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-950 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                      value={reqDays}
                      onChange={(e) => setReqDays(e.target.value)}
                    />
                  </div>

                  {/* EXCEEDED LEAVES LIMIT WARNING */}
                  {reqLeaveType === 'paid_leave' && Number(reqDays) > 0 && (() => {
                    const limit = settings ? Number(settings.paid_leaves_limit) : 2;
                    const remaining = Math.max(0, limit - paidLeavesDays);
                    if (Number(reqDays) > remaining) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30 rounded text-[10px] space-y-1 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block">تنبيه: تجاوز رصيد الإجازات المتاحة!</strong>
                            رصيد إجازاتك المدفوعة المتبقي لهذا الشهر هو <strong>{remaining} يوم</strong> (المستهلك: {paidLeavesDays} من أصل {limit}).
                            طلب <strong>{reqDays} أيام</strong> سيؤدي لخصم <strong>{Number(reqDays) - remaining} يوم</strong> من راتبك كغياب غير مدفوع في حال تمت الموافقة.
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">تاريخ بداية الإجازة أو تاريخ السلفة المطلوبة</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
                  value={reqStartDate}
                  onChange={(e) => setReqStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">السبب بالتفصيل</label>
                <textarea
                  required
                  rows={3}
                  placeholder="يرجى كتابة سبب تقديم الطلب..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="flex-1 py-2 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                >
                  {submittingReq ? 'جاري التقديم...' : 'تقديم الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default EmployeeDashboardPage;
