/**
 * T-026 — Meu Perfil (Profissional)
 *
 * Doc 15 §32: exibe nome, telefone, e-mail, especialidade.
 * Doc 16 §17-20: dados do profissional via GET /professionals/:id.
 * Doc autorização F14: usar endpoints existentes; não criar endpoint novo se suficiente.
 *
 * Dados da sessão (AuthContext): userId, name, email.
 * Dados enriquecidos (ProfessionalRow): specialty, bio, phone, status.
 */
import { useAuth } from "@/contexts/auth-context";
import { useProfessionalSelf } from "@/hooks/use-professional-self";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User } from "lucide-react";

export default function ProfessionalProfile() {
  const { user } = useAuth();
  const { professional, isLoading, isError } = useProfessionalSelf();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6" />
            Meu Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Suas informações profissionais
          </p>
        </div>

        {/* LOADING */}
        {isLoading && <Skeleton className="h-64 w-full" />}

        {/* ERROR */}
        {isError && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar os dados do perfil. Tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {!isLoading && (user || professional) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Informações</span>
                {professional?.status && (
                  <Badge variant={professional.status === "ACTIVE" ? "default" : "secondary"}>
                    {professional.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-y-3">
                <span className="text-muted-foreground">Nome</span>
                <span className="col-span-2 font-medium">
                  {professional?.name ?? user?.name ?? "—"}
                </span>

                <span className="text-muted-foreground">E-mail</span>
                <span className="col-span-2">
                  {professional?.email ?? user?.email ?? "—"}
                </span>

                <span className="text-muted-foreground">Telefone</span>
                <span className="col-span-2">
                  {professional?.phone ?? "—"}
                </span>

                <span className="text-muted-foreground">Especialidade</span>
                <span className="col-span-2">
                  {professional?.specialty ?? "—"}
                </span>
              </div>

              {professional?.bio && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Bio</p>
                    <p>{professional.bio}</p>
                  </div>
                </>
              )}

              <Separator />
              <p className="text-xs text-muted-foreground">
                Para alterar seus dados, entre em contato com a administração.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
