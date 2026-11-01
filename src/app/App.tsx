import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HashRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { WorkspaceProvider } from './WorkspaceProvider';
import { AppShell } from './AppShell';
import SetupPage from '../features/attendance/SetupPage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import LoginPage from '../features/auth/LoginPage';
import { ProtectedApp, Permission } from '../features/auth/ProtectedApp';
import { leaveReview } from './runtime';

const ReportPage = lazy(() => import('../features/payroll/ReportPage'));
const EmployeesPage = lazy(() => import('../features/employees/EmployeesPage'));
const SalariesPage = lazy(() => import('../features/employees/SalariesPage'));
const UsersPage = lazy(() => import('../features/auth/UsersPage'));
const SupportPage = lazy(() => import('../features/support/SupportPage'));
const LeavePage = lazy(() => import('../features/leave/LeavePage'));
const LeaveSettingsPage = lazy(() => import('../features/leave/LeaveSettingsPage'));
function LeaveAccess() {
  const auth = useAuth();
  return auth.can('leave.read.own') || auth.can('leave.read.all') ? (
    <LeavePage />
  ) : (
    <Permission permission="leave.read.own">
      <LeavePage />
    </Permission>
  );
}
function HomePage() {
  const auth = useAuth();
  return leaveReview && auth.user?.role === 'Employee' ? (
    <Navigate to="/leave" replace />
  ) : (
    <Permission permission="reports.read">
      <SetupPage />
    </Permission>
  );
}
function PrivateLayout() {
  const { user } = useAuth();
  return (
    <ProtectedApp>
      <WorkspaceProvider key={user?.id}>
        <AppShell>
          <Outlet />
        </AppShell>
      </WorkspaceProvider>
    </ProtectedApp>
  );
}
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <Box role="status" sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateLayout />}>
              <Route path="/" element={<HomePage />} />
              {leaveReview && (
                <>
                  <Route path="/leave" element={<LeaveAccess />} />
                  <Route
                    path="/admin/settings"
                    element={
                      <Permission permission="settings.leave">
                        <LeaveSettingsPage />
                      </Permission>
                    }
                  />
                </>
              )}
              <Route
                path="/report"
                element={
                  <Permission permission="reports.read">
                    <ReportPage />
                  </Permission>
                }
              />
              <Route
                path="/employees"
                element={
                  <Permission permission="employees.write">
                    <EmployeesPage />
                  </Permission>
                }
              />
              <Route
                path="/salaries"
                element={
                  <Permission permission="salaries.write">
                    <SalariesPage />
                  </Permission>
                }
              />
              <Route
                path="/users"
                element={
                  <Permission permission="users.manage">
                    <UsersPage />
                  </Permission>
                }
              />
              <Route
                path="/support"
                element={
                  <Permission permission="support.send">
                    <SupportPage />
                  </Permission>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </HashRouter>
  );
}
