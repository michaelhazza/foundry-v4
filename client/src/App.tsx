import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppLayout } from '@/components/layout/app-layout';

// Auth pages
import { LoginPage } from '@/pages/auth/login';
import { AcceptInvitationPage } from '@/pages/auth/accept-invitation';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';

// App pages
import { DashboardPage } from '@/pages/dashboard';
import { ProjectListPage } from '@/pages/projects/project-list';
import { ProjectDetailPage } from '@/pages/projects/project-detail';
import { TeamPage } from '@/pages/team';
import { AuditLogPage } from '@/pages/audit-log';
import { SettingsPage } from '@/pages/settings';

// Admin pages
import { AdminOrganizationsPage } from '@/pages/admin/organizations';
import { AdminHealthPage } from '@/pages/admin/health';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id/*" element={<ProjectDetailPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Admin routes */}
        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <AdminOrganizationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <AdminHealthPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold">404</h1>
              <p className="mt-2 text-muted-foreground">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
