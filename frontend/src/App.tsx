import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Shell } from './components/layout/Shell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Projects } from './pages/Projects';
import { FaceCheckIn } from './pages/FaceCheckIn';
import { Payroll } from './pages/Payroll';
import { Compliance } from './pages/Compliance';
import { RequestsWorkflow } from './pages/RequestsWorkflow';
import { Timesheet } from './pages/Timesheet';
import { SiteManagement } from './pages/SiteManagement';
import { SiteEngineerPortal } from './pages/SiteEngineerPortal';
import type { Role } from './types';

export const getDefaultRouteForRole = (role?: Role): string => {
  switch (role) {
    case 'SITE_MANAGER':
      return '/site-management';
    case 'SITE_ENGINEER':
      return '/engineer-portal';
    case 'HR_STAFF':
    case 'HR_MANAGER':
      return '/employees';
    case 'CHIEF_ACCOUNTANT':
    case 'ACCOUNTANT':
      return '/payroll';
    case 'OFFICE_STAFF':
      return '/timesheet';
    case 'DIRECTOR':
    case 'SYSTEM_ADMIN':
    default:
      return '/';
  }
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, mustChangePassword } = useAuth();

  if (!isAuthenticated && !mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleRoute: React.FC<{ allowedRoles: Role[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const currentRole = user?.role;

  if (currentRole && !allowedRoles.includes(currentRole)) {
    // Automatically redirect to role's designated landing page
    const target = getDefaultRouteForRole(currentRole);
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

const RoleDashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'SITE_MANAGER') {
    return <Navigate to="/site-management" replace />;
  }
  if (user?.role === 'SITE_ENGINEER') {
    return <Navigate to="/engineer-portal" replace />;
  }
  return <Dashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            {/* Root index route adapts to Role */}
            <Route index element={<RoleDashboardRedirect />} />

            {/* Dedicated Site Manager Module */}
            <Route
              path="site-management"
              element={
                <RoleRoute allowedRoles={['SITE_MANAGER', 'SYSTEM_ADMIN', 'ADMIN', 'DIRECTOR']}>
                  <SiteManagement />
                </RoleRoute>
              }
            />

            {/* Dedicated Site Engineer Module */}
            <Route
              path="engineer-portal"
              element={
                <RoleRoute allowedRoles={['SITE_ENGINEER', 'SITE_MANAGER', 'SYSTEM_ADMIN', 'ADMIN']}>
                  <SiteEngineerPortal />
                </RoleRoute>
              }
            />

            {/* Role-protected HR & Company routes */}
            <Route
              path="employees"
              element={
                <RoleRoute allowedRoles={['HR_STAFF', 'HR_MANAGER', 'SYSTEM_ADMIN', 'ADMIN', 'DIRECTOR']}>
                  <Employees />
                </RoleRoute>
              }
            />
            <Route
              path="projects"
              element={
                <RoleRoute allowedRoles={['SITE_MANAGER', 'HR_STAFF', 'CHIEF_ACCOUNTANT', 'DIRECTOR', 'SYSTEM_ADMIN', 'ADMIN']}>
                  <Projects />
                </RoleRoute>
              }
            />
            <Route
              path="compliance"
              element={
                <RoleRoute allowedRoles={['HR_MANAGER', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'DIRECTOR', 'SYSTEM_ADMIN', 'ADMIN']}>
                  <Compliance />
                </RoleRoute>
              }
            />

            {/* Cross-functional workflows (internally adapted to role) */}
            <Route path="face-checkin" element={<FaceCheckIn />} />
            <Route path="timesheet" element={<Timesheet />} />
            <Route path="requests" element={<RequestsWorkflow />} />
            <Route path="payroll" element={<Payroll />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
