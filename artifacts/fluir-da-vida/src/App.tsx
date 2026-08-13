/**
 * App.tsx — Roteamento principal com autenticação por role.
 *
 * Fase 13: Todas as rotas administrativas adicionadas.
 *
 * Estrutura de rotas:
 * /login              → público (Login)
 * /admin              → protegido — apenas ADMIN (roleId=1)
 * /admin/schedule     → agenda
 * /admin/appointments/new → novo agendamento
 * /admin/appointments/:id → detalhes do agendamento
 * /admin/clients      → clientes
 * /admin/clients/new  → cadastro de cliente
 * /admin/clients/:id  → perfil do cliente
 * /admin/professionals → profissionais
 * /admin/professionals/:id → perfil do profissional
 * /admin/services     → serviços
 * /admin/services/new → cadastro de serviço
 * /admin/resources    → recursos
 * /admin/resources/:id → detalhes do recurso
 * /admin/reports      → relatórios
 * /admin/audit        → auditoria
 * /admin/settings     → configurações (placeholder)
 * /admin/notifications → notificações (placeholder)
 * /professional       → protegido — apenas PROFESSIONAL (roleId=2)
 * /client             → protegido — apenas CLIENT (roleId=3)
 * /                   → redireciona para dashboard do perfil ou /login
 * *                   → 404
 */
import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { PrivateRoute } from "@/components/private-route";
import { getDashboardPath, ROLES } from "@/lib/roles";
import { Spinner } from "@/components/ui/spinner";
import NotFound from "@/pages/not-found";

// Páginas síncronas (marco visual F11)
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import ProfessionalDashboard from "@/pages/professional/dashboard";
import ClientDashboard from "@/pages/client/dashboard";

// Professional — carregamento lazy (F14)
const ProfessionalSchedule = lazy(() => import("@/pages/professional/schedule"));
const ProfessionalAppointmentDetail = lazy(() => import("@/pages/professional/appointment-detail"));
const ProfessionalClients = lazy(() => import("@/pages/professional/clients"));
const ProfessionalClientDetail = lazy(() => import("@/pages/professional/client-detail"));
const ProfessionalAvailability = lazy(() => import("@/pages/professional/availability"));
const ProfessionalBlockedPeriods = lazy(() => import("@/pages/professional/blocked-periods"));
const ProfessionalProfile = lazy(() => import("@/pages/professional/profile"));
const ProfessionalNotifications = lazy(() => import("@/pages/professional/notifications"));

// Admin — carregamento lazy (F13)
const AdminSchedule = lazy(() => import("@/pages/admin/schedule"));
const AdminAppointmentNew = lazy(() => import("@/pages/admin/appointments/new"));
const AdminAppointmentDetail = lazy(() => import("@/pages/admin/appointments/detail"));
const AdminClients = lazy(() => import("@/pages/admin/clients/index"));
const AdminClientNew = lazy(() => import("@/pages/admin/clients/new"));
const AdminClientDetail = lazy(() => import("@/pages/admin/clients/detail"));
const AdminProfessionals = lazy(() => import("@/pages/admin/professionals/index"));
const AdminProfessionalDetail = lazy(() => import("@/pages/admin/professionals/detail"));
const AdminServices = lazy(() => import("@/pages/admin/services/index"));
const AdminServiceNew = lazy(() => import("@/pages/admin/services/new"));
const AdminResources = lazy(() => import("@/pages/admin/resources/index"));
const AdminResourceDetail = lazy(() => import("@/pages/admin/resources/detail"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminAudit = lazy(() => import("@/pages/admin/audit"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminNotifications = lazy(() => import("@/pages/admin/notifications"));

// Client — carregamento lazy (F15)
const ClientBook = lazy(() => import("@/pages/client/book"));
const ClientAppointments = lazy(() => import("@/pages/client/appointments"));
const ClientAppointmentDetail = lazy(() => import("@/pages/client/appointment-detail"));
const ClientAddresses = lazy(() => import("@/pages/client/addresses"));
const ClientProfile = lazy(() => import("@/pages/client/profile"));
const ClientNotifications = lazy(() => import("@/pages/client/notifications"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (
          error instanceof Error &&
          (error.message.includes("401") || error.message.includes("403"))
        ) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function AdminWrap({ children }: { children: ReactNode }) {
  return (
    <PrivateRoute allowedRoles={[ROLES.ADMIN]}>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </PrivateRoute>
  );
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={getDashboardPath(user.roleId)} />;
}

function Router() {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        {/* Públicas */}
        <Route path="/login" component={LoginPage} />

        {/* ── Admin (ordem importa: mais específicas primeiro) ─────────────── */}
        <Route path="/admin/appointments/new">
          <AdminWrap><AdminAppointmentNew /></AdminWrap>
        </Route>
        <Route path="/admin/appointments/:id">
          <AdminWrap><AdminAppointmentDetail /></AdminWrap>
        </Route>
        <Route path="/admin/clients/new">
          <AdminWrap><AdminClientNew /></AdminWrap>
        </Route>
        <Route path="/admin/clients/:id">
          <AdminWrap><AdminClientDetail /></AdminWrap>
        </Route>
        <Route path="/admin/clients">
          <AdminWrap><AdminClients /></AdminWrap>
        </Route>
        <Route path="/admin/professionals/:id">
          <AdminWrap><AdminProfessionalDetail /></AdminWrap>
        </Route>
        <Route path="/admin/professionals">
          <AdminWrap><AdminProfessionals /></AdminWrap>
        </Route>
        <Route path="/admin/services/new">
          <AdminWrap><AdminServiceNew /></AdminWrap>
        </Route>
        <Route path="/admin/services">
          <AdminWrap><AdminServices /></AdminWrap>
        </Route>
        <Route path="/admin/resources/:id">
          <AdminWrap><AdminResourceDetail /></AdminWrap>
        </Route>
        <Route path="/admin/resources">
          <AdminWrap><AdminResources /></AdminWrap>
        </Route>
        <Route path="/admin/schedule">
          <AdminWrap><AdminSchedule /></AdminWrap>
        </Route>
        <Route path="/admin/reports">
          <AdminWrap><AdminReports /></AdminWrap>
        </Route>
        <Route path="/admin/audit">
          <AdminWrap><AdminAudit /></AdminWrap>
        </Route>
        <Route path="/admin/settings">
          <AdminWrap><AdminSettings /></AdminWrap>
        </Route>
        <Route path="/admin/notifications">
          <AdminWrap><AdminNotifications /></AdminWrap>
        </Route>
        <Route path="/admin">
          <PrivateRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboard />
          </PrivateRoute>
        </Route>

        {/* ── Professional (ordem: mais específicas primeiro) ──────────────── */}
        <Route path="/professional/schedule/:id">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalAppointmentDetail />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/schedule">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalSchedule />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/clients/:clientId">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalClientDetail />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/clients">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalClients />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/availability">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalAvailability />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/blocked-periods">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalBlockedPeriods />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/profile">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalProfile />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional/notifications">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <Suspense fallback={<LoadingScreen />}>
              <ProfessionalNotifications />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/professional">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <ProfessionalDashboard />
          </PrivateRoute>
        </Route>

        {/* ── Client (F15 — ordem importa: mais específicas primeiro) ─────── */}
        <Route path="/client/book">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientBook />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client/appointments/:id">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientAppointmentDetail />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client/appointments">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientAppointments />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client/addresses">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientAddresses />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client/profile">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientProfile />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client/notifications">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <Suspense fallback={<LoadingScreen />}>
              <ClientNotifications />
            </Suspense>
          </PrivateRoute>
        </Route>
        <Route path="/client">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <ClientDashboard />
          </PrivateRoute>
        </Route>

        {/* Raiz */}
        <Route path="/" component={RootRedirect} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
