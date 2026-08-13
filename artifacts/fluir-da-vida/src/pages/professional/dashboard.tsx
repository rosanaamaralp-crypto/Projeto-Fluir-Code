/**
 * T-020 — Dashboard Profissional
 *
 * Doc 15 §25: próximo atendimento, agenda do dia, indicadores básicos.
 * Doc 18 §30: tratar LOADING, EMPTY, ERROR.
 * Doc 18 §56: profissional vê apenas o que o seu perfil permite.
 *
 * Endpoint: GET /api/dashboard/professional (PROFESSIONAL usa sessão)
 * Resposta: { dashboard: ProfessionalDashboard }
 */
import { useGetProfessionalDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

function formatDatetime(dt: string): string {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modalityLabel(modality: string): string {
  if (modality === "HOME_CARE") return "Home Care";
  if (modality === "IN_PERSON") return "Presencial";
  return modality;
}

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } =
    useGetProfessionalDashboard();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {user?.name?.split(" ")[0] ?? "Profissional"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua agenda de hoje
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar o dashboard."}
              </span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {data && (
          <>
            {/* Próximo atendimento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Próximo Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.dashboard.nextAppointment ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">
                      {formatDatetime(data.dashboard.nextAppointment.startDatetime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {data.dashboard.nextAppointment.clientName ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Serviço: {data.dashboard.nextAppointment.serviceName ?? "—"}
                    </p>
                    <Badge variant="outline">
                      {modalityLabel(data.dashboard.nextAppointment.modality)}
                    </Badge>
                    {data.dashboard.nextAppointment.resourceName && (
                      <p className="text-xs text-muted-foreground">
                        {data.dashboard.nextAppointment.resourceName}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento agendado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Indicadores do dia */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Agendamentos hoje
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.dashboard.appointmentsToday}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Concluídos
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.dashboard.completedToday}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cancelados
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.dashboard.cancelledToday}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Próximos agendamentos */}
            {data.dashboard.upcomingAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Próximos Agendamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.dashboard.upcomingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {formatDatetime(apt.startDatetime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.clientName ?? "—"} · {apt.serviceName ?? "—"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {modalityLabel(apt.modality)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
