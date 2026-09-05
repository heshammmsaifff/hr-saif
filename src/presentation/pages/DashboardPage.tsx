import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../../utils/supabase';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  // Database size states
  const [dbSizeMB, setDbSizeMB] = useState<number | null>(null);
  const [loadingDbSize, setLoadingDbSize] = useState(true);
  const [dbSizeError, setDbSizeError] = useState<boolean>(false);
  
  // Form states
  const [tenantName, setTenantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch database size
  const fetchDbSize = async () => {
    setLoadingDbSize(true);
    setDbSizeError(false);
    try {
      const { data, error } = await supabase.rpc('get_database_size');
      if (error) {
        throw new Error(error.message);
      }
      const bytes = Number(data);
      if (!isNaN(bytes)) {
        const mb = bytes / (1024 * 1024);
        setDbSizeMB(Number(mb.toFixed(2)));
      } else {
        throw new Error('Invalid database size value');
      }
    } catch (err) {
      console.error('Error fetching database size:', err);
      setDbSizeError(true);
    } finally {
      setLoadingDbSize(false);
    }
  };

  // Fetch active tenants
  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setTenants(data || []);
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchDbSize();
  }, []);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (adminPassword.length < 6) {
      setError('يجب أن تكون كلمة مرور المالك 6 أحرف على الأقل.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create the new tenant in tenants table
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: tenantName })
        .select()
        .single();

      if (tenantError) {
        throw new Error(`خطأ أثناء إنشاء المشترك: ${tenantError.message}`);
      }

      // 2. Create secondary client to sign up the tenant admin without logging out super_admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'supabase.auth.temp-token-' + Math.random().toString(36).substring(7),
        },
      });

      // 3. Sign up the new tenant admin
      const { error: signUpError } = await tempClient.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            name: adminName,
            tenant_id: tenant.id,
            role: 'tenant_admin',
          },
        },
      });

      if (signUpError) {
        // Rollback the created tenant if signup fails to keep DB clean
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error(`خطأ أثناء تسجيل حساب المالك: ${signUpError.message}`);
      }

      setSuccess(`تم إنشاء المنشأة "${tenantName}" بنجاح، وتسجيل حساب المالك (${adminEmail}).`);
      
      // Reset form
      setTenantName('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      
      // Refresh tenants list
      fetchTenants();
    } catch (err: any) {
      setError(err.message || 'فشلت العملية. يرجى مراجعة البيانات.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-reverse space-x-3">
          <span className="text-lg font-bold text-slate-900 tracking-tight">نظام الموارد البشرية (SaaS)</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">لوحة التحكم الفائقة</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-left text-xs text-slate-500">
            <div className="font-semibold text-slate-800 text-right">{user?.name || 'Hesham Saif'}</div>
            <div className="text-right">{user?.email}</div>
          </div>
          <Button variant="secondary" onClick={logout} className="w-auto py-1.5 px-3">
            تسجيل الخروج
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-500">المشتركين النشطين (الشركات)</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{tenants.length}</p>
            </div>
            <span className="text-xs text-slate-400 mt-3 block">إجمالي المطاعم والكافيهات والشركات</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-500">حالة خادم التوثيق والشبكة</h3>
              <p className="text-sm font-semibold text-emerald-600 mt-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                مستقر ومتصل بنجاح
              </p>
            </div>
            <span className="text-xs text-slate-400 mt-3 block">Supabase Client initialized</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-500">مساحة قاعدة البيانات المستهلكة</h3>
              {loadingDbSize ? (
                <p className="text-xs text-slate-400 mt-3 animate-pulse">جاري قياس المساحة...</p>
              ) : dbSizeError ? (
                <div className="mt-2 text-right">
                  <p className="text-xs font-semibold text-amber-600">كود القياس غير مفعل</p>
                  <span className="text-[9px] text-slate-400 mt-1 block leading-normal font-sans">
                    يرجى تشغيل ملف الهجرة <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1 py-0.2 rounded">013</span> في Supabase.
                  </span>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900">{dbSizeMB}</span>
                    <span className="text-xs font-semibold text-slate-500 font-sans">ميجا بايت</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">من أصل 500 ميجا بايت (الخطة المجانية)</span>
                </div>
              )}
            </div>

            {!loadingDbSize && !dbSizeError && dbSizeMB !== null && (
              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      (dbSizeMB / 500) > 0.8 
                        ? 'bg-red-500' 
                        : (dbSizeMB / 500) > 0.5 
                        ? 'bg-amber-500' 
                        : 'bg-slate-900'
                    }`}
                    style={{ width: `${Math.min(100, (dbSizeMB / 500) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1 font-mono">
                  <span>{((dbSizeMB / 500) * 100).toFixed(1)}% مستهلك</span>
                  <span>المتبقي: {(500 - dbSizeMB).toFixed(1)} ميجا</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-500">نوع الترخيص الفعّال</h3>
              <p className="text-md font-bold text-slate-800 mt-2">ترخيص SaaS غير محدود</p>
            </div>
            <span className="text-xs text-slate-400 mt-3 block">Super Admin Dashboard</span>
          </div>
        </section>

        {/* Dashboard Split Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Active Tenants List (60%) */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">المشتركين النشطين في النظام</h2>
              <span className="text-xs font-semibold text-slate-500">العدد الإجمالي: {tenants.length}</span>
            </div>

            {loadingTenants ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                جاري تحميل قائمة الشركات...
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                لا يوجد أي مشتركين مسجلين في النظام حالياً. استخدم النموذج لإضافة أول مشترك.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 rounded-r-md">اسم المنشأة/الشركة</th>
                      <th className="py-3 px-4">رقم التعريف (ID)</th>
                      <th className="py-3 px-4 rounded-l-md">تاريخ الاشتراك</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{t.name}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{t.id}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(t.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Add New Tenant Form (40%) */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 lg:col-span-2 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">إضافة منشأة/مشترك جديد</h2>
              <p className="text-xs text-slate-400 mt-1">قم بتسجيل شركة جديدة وتعيين حساب المالك المسئول عنها.</p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-md text-xs text-right">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-md text-xs text-right">
                {success}
              </div>
            )}

            <form onSubmit={handleAddTenant} className="space-y-4">
              <Input
                id="tenantName"
                type="text"
                label="اسم المنشأة (كافيه، مطعم، شركة)"
                placeholder="مثال: مطعم الشيف"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />

              <Input
                id="adminName"
                type="text"
                label="اسم مالك المنشأة (المدير)"
                placeholder="مثال: محمد أحمد"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />

              <Input
                id="adminEmail"
                type="email"
                label="البريد الإلكتروني للمالك"
                placeholder="owner@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                id="adminPassword"
                type="password"
                label="كلمة مرور حساب المالك"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button type="submit" isLoading={submitting} className="mt-2">
                إنشاء المنشأة والمالك
              </Button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};
export default DashboardPage;
