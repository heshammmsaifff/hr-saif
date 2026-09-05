import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./presentation/hooks/useAuth";
import { ThemeProvider } from "./presentation/hooks/useTheme";
import { LoginPage } from "./presentation/pages/LoginPage";
import { DashboardPage } from "./presentation/pages/DashboardPage";
import { TenantDashboardPage } from "./presentation/pages/TenantDashboardPage";
import { ForgotPasswordPage } from "./presentation/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./presentation/pages/ResetPasswordPage";
import { EmployeeLoginPage } from "./presentation/pages/EmployeeLoginPage";
import { EmployeeDashboardPage } from "./presentation/pages/EmployeeDashboardPage";

// Loading screen
const LoadingScreen = () => (
  <div
    className="min-h-screen bg-slate-50 flex items-center justify-center"
    dir="rtl"
  >
    <div className="text-center text-slate-600 font-medium">
      <svg
        className="animate-spin h-8 w-8 text-slate-800 mx-auto mb-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      جاري تحميل النظام...
    </div>
  </div>
);

// Route Guard: Requires authentication and super_admin role
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== "super_admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route Guard: Requires authentication and tenant_admin role matching the URL tenant ID
const TenantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { tenantId } = useParams<{ tenantId: string }>();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== "tenant_admin" || user.tenantId !== tenantId) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route Guard: Requires employee credentials session in localStorage
const EmployeeRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const sessionStr = localStorage.getItem("employeeSession");
  if (!sessionStr) {
    return <Navigate to={`/t/${tenantId}/employee/login`} replace />;
  }
  const sess = JSON.parse(sessionStr);
  if (sess.tenantId !== tenantId) {
    localStorage.removeItem("employeeSession");
    return <Navigate to={`/t/${tenantId}/employee/login`} replace />;
  }
  return <>{children}</>;
};

// Root Router logic
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Super Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />

      {/* Tenant Owner Routes */}
      <Route
        path="/t/:tenantId/dashboard"
        element={
          <TenantRoute>
            <TenantDashboardPage />
          </TenantRoute>
        }
      />

      {/* Employee Self-Service Routes */}
      <Route
        path="/t/:tenantId/employee/login"
        element={<EmployeeLoginPage />}
      />
      <Route
        path="/t/:tenantId/employee/dashboard"
        element={
          <EmployeeRoute>
            <EmployeeDashboardPage />
          </EmployeeRoute>
        }
      />

      {/* Root Route Redirect */}
      <Route
        path="/"
        element={
          user ? (
            user.role === "super_admin" ? (
              <Navigate to="/admin/dashboard" replace />
            ) : user.role === "tenant_admin" && user.tenantId ? (
              <Navigate to={`/t/${user.tenantId}/dashboard`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          ) : (
            (() => {
              const sessionStr = localStorage.getItem("employeeSession");
              if (sessionStr) {
                try {
                  const sess = JSON.parse(sessionStr);
                  if (sess && sess.tenantId) {
                    return (
                      <Navigate
                        to={`/t/${sess.tenantId}/employee/dashboard`}
                        replace
                      />
                    );
                  }
                } catch {
                  localStorage.removeItem("employeeSession");
                }
              }
              return <Navigate to="/login" replace />;
            })()
          )
        }
      />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
