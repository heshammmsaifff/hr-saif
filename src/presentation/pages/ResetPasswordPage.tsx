import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, logout } = useAuth();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear URL recovery token hash immediately to prevent auto-reauth loops
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة.');
      return;
    }

    setIsLoading(true);

    try {
      const updatePromise = updatePassword(password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.")), 5000)
      );

      await Promise.race([updatePromise, timeoutPromise]);
      // Sign out to clean up the recovery session securely
      await logout();
      // Redirect to login page with success query parameter
      navigate('/login?reset=success', { replace: true });
    } catch (err: any) {
      setError(err.message || 'فشل تحديث كلمة المرور. قد يكون الرابط قد انتهت صلاحيته.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">تعيين كلمة مرور جديدة</h1>
          <p className="text-sm text-slate-500 mt-2">أدخل كلمة المرور الجديدة لحسابك</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-md text-sm text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="password"
            type="password"
            label="كلمة المرور الجديدة"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            type="password"
            label="تأكيد كلمة المرور الجديدة"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" isLoading={isLoading} className="mt-2">
            تحديث كلمة المرور
          </Button>
        </form>
      </div>
    </div>
  );
};
export default ResetPasswordPage;
