/**
 * App.tsx — Roteamento principal com autenticação por role.
 *
 * Estrutura de rotas:
 * /login              → público (Login)
 * /admin              → protegido — apenas ADMIN (roleId=1)
 * /professional       → protegido — apenas PROFESSIONAL (roleId=2)
 * /client             → protegido — apenas CLIENT (roleId=3)
 * /                   → redireciona para dashboard do perfil ou /login
 * *                   → 404
 *
 * Decisões D-01/D-02 aprovadas:
 * - Marco visual: login + auth + dashboards (telas completas virão em fases seguintes)
 * - Home estática substituída por redirect inteligente
 */
import { type ReactNode } from "react";
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

// Páginas carregadas de forma síncrona (todas fazem parte do marco visual)
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import ProfessionalDashboard from "@/pages/professional/dashboard";
import ClientDashboard from "@/pages/client/dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não retentar erros de autenticação (401/403)
      retry: (failureCount, error) => {
        if (
          error instanceof Error &&
          (error.message.includes("401") || error.message.includes("403"))
        ) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000, // 30 segundos
    },
  },
});

/** Redireciona / para o dashboard do perfil autenticado, ou para /login. */
function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  return <Redirect to={getDashboardPath(user.roleId)} />;
}

function Router() {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        {/* Rotas públicas */}
        <Route path="/login" component={LoginPage} />

        {/* Rotas protegidas — ADMIN */}
        <Route path="/admin">
          <PrivateRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboard />
          </PrivateRoute>
        </Route>

        {/* Rotas protegidas — PROFESSIONAL */}
        <Route path="/professional">
          <PrivateRoute allowedRoles={[ROLES.PROFESSIONAL]}>
            <ProfessionalDashboard />
          </PrivateRoute>
        </Route>

        {/* Rotas protegidas — CLIENT */}
        <Route path="/client">
          <PrivateRoute allowedRoles={[ROLES.CLIENT]}>
            <ClientDashboard />
          </PrivateRoute>
        </Route>

        {/* Raiz: redirect inteligente */}
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
