import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { LogIn, KeyRound, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const EmployeeLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();
  const { theme, toggleTheme } = useTheme();
  
  const [tenantName, setTenantName] = useState<string>('جاري تحميل اسم الشركة...');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in for this tenant, redirect
  useEffect(() => {
    const sessionStr = localStorage.getItem('employeeSession');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.tenantId === tenantId) {
        navigate(`/t/${tenantId}/employee/dashboard`);
      }
    }
  }, [navigate, tenantId]);

  // Load Tenant name
  useEffect(() => {
    async function loadTenantDetails() {
      if (!tenantId) return;
      try {
        const { data, error } = await supabase.rpc('get_tenant_name', {
          p_tenant_id: tenantId
        });
        if (error) throw error;
        if (data) {
          setTenantName(data);
        } else {
          setTenantName('منشأة غير معروفة');
        }
      } catch (err) {
        console.error('Error fetching tenant name:', err);
        setTenantName('منشأة افتراضية');
      }
    }
    loadTenantDetails();
  }, [tenantId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('login_employee', {
        p_username: username.trim(),
        p_password: password.trim(),
        p_tenant_id: tenantId
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const emp = data[0];
        // Save session
        localStorage.setItem('employeeSession', JSON.stringify({
          employeeId: emp.id,
          username: username.trim(),
          password: password.trim(),
          name: emp.name,
          tenantId: tenantId
        }));
        navigate(`/t/${tenantId}/employee/dashboard`);
      } else {
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة لهذه المنشأة');
      }
    } catch (err: any) {
      console.error('Error logging in employee:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقًا.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans" dir="rtl">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 mb-3 shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">بوابة الموظفين - {tenantName}</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">سجل الدخول لعرض تفاصيل الراتب الشهري، الخصومات، السلف، والإجازات</p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-md transition-colors duration-300">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900/30">
                {errorMsg}
              </div>
            )}

            {/* Username input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">اسم المستخدم</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  className="w-full pr-9 pl-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                  placeholder="مثال: ahmed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">كلمة المرور</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full pr-9 pl-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>جاري التحقق والدخول...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6 text-[10px] text-slate-400">
          حقوق الطبع والنشر © {new Date().getFullYear()} نظام إدارة الموارد البشرية. جميع الحقوق محفوظة.
        </div>
      </div>
    </div>
  );
};
export default EmployeeLoginPage;
