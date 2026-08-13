/**
 * T-026 — Meu Perfil (Profissional)
 *
 * Doc 15 §32: exibe nome, telefone, e-mail, especialidade, serviços.
 * Doc 16 §17-20: dados do profissional via GET /professionals/:id.
 * Doc 16 §22: GET /professionals/:profId/services.
 * Doc autorização F14: usar endpoints existentes; não criar endpoint novo.
 *
 * Dados da sessão (AuthContext): userId, name, email.
 * Dados enriquecidos (ProfessionalRow): specialty, bio, phone, status.
 * Serviços: useListProfessionalServices + useListServices (para nomes).
 */
import { useAuth } from "@/contexts/auth-context";
import { useProfessionalSelf } from "@/hooks/use-professional-self";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Briefcase, User } from "lucide-react";
import {
  useListProfessionalServices,
  useListServices,
} from "@workspace/api-client-react";

export default function ProfessionalProfile() {
  const { user } = useAuth();
  const { professional, isLoading, isError } = useProfessionalSelf();
  const profId = professional?.id;

  // Serviços vinculados ao profissional
  const {
    data: psData,
    isLoading: psLoading,
    isError: psError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useListProfessionalServices(profId ?? "", { query: { enabled: !!profId } } as any);

  // Catálogo completo de serviços — para resolver serviceId → name
  const { data: svcsData } = useListServices();

  // Mapa serviceId → name
  const serviceMap: Record<string, string> = {};
  (svcsData?.services ?? []).forEach((s) => { serviceMap[s.id] = s.name; });

  const professionalServices = psData?.professionalServices ?? [];
  const activeServices = professionalServices.filter((ps) => ps.active);

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

        {/* LOADING — dados do profissional */}
        {isLoading && <Skeleton className="h-64 w-full" />}

        {/* ERROR — dados do profissional */}
        {isError && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar os dados do perfil. Tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS — informações principais */}
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

        {/* Seção Serviços — visível apenas quando profId disponível */}
        {profId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* LOADING */}
              {psLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              )}

              {/* ERROR */}
              {psError && !psLoading && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Não foi possível carregar os serviços. Tente novamente mais tarde.
                  </AlertDescription>
                </Alert>
              )}

              {/* EMPTY */}
              {!psLoading && !psError && activeServices.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum serviço vinculado ao seu perfil.
                </p>
              )}

              {/* SUCCESS */}
              {!psLoading && !psError && activeServices.length > 0 && (
                <ul className="space-y-2">
                  {activeServices.map((ps) => (
                    <li key={ps.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="shrink-0">
                        {serviceMap[ps.serviceId] ?? ps.serviceId.slice(0, 8) + "…"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
