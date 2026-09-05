import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const isResetSuccess = searchParams.get('reset') === 'success';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Save rememberMe configuration
    localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');

    try {
      const user = await login(email, password);
      if (user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'tenant_admin' && user.tenantId) {
        navigate(`/t/${user.tenantId}/dashboard`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">نظام إدارة الموارد البشرية</h1>
          <p className="text-sm text-slate-500 mt-2">تسجيل الدخول إلى حسابك</p>
        </div>

        {isResetSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-md text-sm text-right">
            تم تحديث كلمة المرور بنجاح. يرجى تسجيل الدخول بكلمة المرور الجديدة.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-md text-sm text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            type="email"
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label="كلمة المرور"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-xs -mt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-500 hover:text-slate-700 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/10 h-3.5 w-3.5"
              />
              <span>تذكرني</span>
            </label>

            <Link
              to="/forgot-password"
              className="font-semibold text-slate-500 hover:text-slate-800 hover:underline"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          <Button type="submit" isLoading={isLoading} className="mt-2">
            تسجيل الدخول
          </Button>
        </form>
      </div>
    </div>
  );
};
export default LoginPage;
