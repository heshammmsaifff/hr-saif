import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordResetEmail } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال البريد الإلكتروني. يرجى التحقق من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">استعادة كلمة المرور</h1>
          <p className="text-sm text-slate-500 mt-2">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-md text-sm text-right">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-md text-sm text-right">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى التحقق من صندوق الوارد (أو البريد المزعج).
            </div>
            <Link
              to="/login"
              className="inline-block text-sm font-semibold text-slate-900 hover:underline"
            >
              العودة لصفحة تسجيل الدخول
            </Link>
          </div>
        ) : (
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

            <Button type="submit" isLoading={isLoading} className="mt-2">
              إرسال رابط إعادة التعيين
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
