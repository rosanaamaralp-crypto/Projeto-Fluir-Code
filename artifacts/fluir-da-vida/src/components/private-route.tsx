/**
 * PrivateRoute — proteção de rotas por autenticação e role.
 *
 * Comportamento:
 * - isLoading → spinner de autenticação (aguarda restauração da sessão)
 * - Não autenticado → redireciona para /login
 * - Role não permitido → redireciona para o dashboard do próprio perfil
 * - Autenticado + role correto → renderiza children
 */
import { type ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { getDashboardPath } from "@/lib/roles";
import { Spinner } from "@/components/ui/spinner";

interface PrivateRouteProps {
  children: ReactNode;
  /** Roles permitidos para acessar esta rota. Se omitido, exige apenas autenticação. */
  allowedRoles?: number[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.roleId)) {
    return <Redirect to={getDashboardPath(user.roleId)} />;
  }

  return <>{children}</>;
}
