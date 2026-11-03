import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { ROLES } from './config/roles';
import { ROUTES } from './config/routes';

// ---- Pages (lazy-loaded so each area only ships what it needs) ----
const GatewayPage        = lazy(() => import('./pages/gateway/GatewayPage'));
const AdminLoginPage     = lazy(() => import('./pages/auth/AdminLoginPage'));
const AgentLoginPage     = lazy(() => import('./pages/auth/AgentLoginPage'));

const DashboardPage      = lazy(() => import('./pages/admin/DashboardPage'));
const MeterReadingsPage  = lazy(() => import('./pages/admin/MeterReadingsPage'));
const ReadingReviewPage  = lazy(() => import('./pages/admin/ReadingReviewPage'));
const HouseholdsPage     = lazy(() => import('./pages/admin/HouseholdsPage'));
const HouseholdFormPage  = lazy(() => import('./pages/admin/HouseholdFormPage'));
const BillingPage        = lazy(() => import('./pages/admin/BillingPage'));
const BillDetailPage     = lazy(() => import('./pages/admin/BillDetailPage'));
const ReportsPage        = lazy(() => import('./pages/admin/ReportsPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const SettingsPage       = lazy(() => import('./pages/admin/SettingsPage'));

const AgentHomePage      = lazy(() => import('./pages/agent/AgentHomePage'));
const CaptureReadingPage = lazy(() => import('./pages/agent/CaptureReadingPage'));
const SyncQueuePage      = lazy(() => import('./pages/agent/SyncQueuePage'));
const AgentProfilePage   = lazy(() => import('./pages/agent/AgentProfilePage'));

const UnauthorizedPage   = lazy(() => import('./pages/shared/UnauthorizedPage'));
const NotFoundPage       = lazy(() => import('./pages/shared/NotFoundPage'));

// ---- Route guard: only lets `role` through, otherwise sends to that area's login ----
function RequireRole({ role, loginPath }) {
  const { user, role: userRole, loading } = useAuth();
  if (loading) return null; // swap for a splash screen later
  if (!user) return <Navigate to={loginPath} replace />;
  if (userRole !== role) return <Navigate to={ROUTES.unauthorized} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Gateway: pick a direction */}
        <Route path={ROUTES.gateway} element={<GatewayPage />} />

        {/* Two separate logins */}
        <Route path={ROUTES.admin.login} element={<AdminLoginPage />} />
        <Route path={ROUTES.agent.login} element={<AgentLoginPage />} />

        {/* Admin area */}
        <Route element={<RequireRole role={ROLES.ADMIN} loginPath={ROUTES.admin.login} />}>
          <Route path={ROUTES.admin.root} element={<Navigate to={ROUTES.admin.dashboard} replace />} />
          <Route path={ROUTES.admin.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.admin.readings} element={<MeterReadingsPage />} />
          <Route path={ROUTES.admin.readingReview()} element={<ReadingReviewPage />} />
          <Route path={ROUTES.admin.households} element={<HouseholdsPage />} />
          <Route path={ROUTES.admin.householdNew} element={<HouseholdFormPage />} />
          <Route path={ROUTES.admin.householdEdit()} element={<HouseholdFormPage />} />
          <Route path={ROUTES.admin.billing} element={<BillingPage />} />
          <Route path={ROUTES.admin.billDetail()} element={<BillDetailPage />} />
          <Route path={ROUTES.admin.reports} element={<ReportsPage />} />
          <Route path={ROUTES.admin.users} element={<UserManagementPage />} />
          <Route path={ROUTES.admin.settings} element={<SettingsPage />} />
        </Route>

        {/* Field agent area */}
        <Route element={<RequireRole role={ROLES.AGENT} loginPath={ROUTES.agent.login} />}>
          <Route path={ROUTES.agent.root} element={<Navigate to={ROUTES.agent.home} replace />} />
          <Route path={ROUTES.agent.home} element={<AgentHomePage />} />
          <Route path={ROUTES.agent.capture()} element={<CaptureReadingPage />} />
          <Route path={ROUTES.agent.queue} element={<SyncQueuePage />} />
          <Route path={ROUTES.agent.profile} element={<AgentProfilePage />} />
        </Route>

        <Route path={ROUTES.unauthorized} element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}