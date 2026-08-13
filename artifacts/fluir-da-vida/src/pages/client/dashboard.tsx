/**
 * T-027 — Dashboard Cliente
 *
 * Doc 15 §34: próximo atendimento, novo agendamento, meus agendamentos, histórico.
 * Doc 18 §30: tratar LOADING, EMPTY, ERROR.
 *
 * Endpoint: GET /api/dashboard/client (CLIENT usa sessão)
 * Resposta: { dashboard: ClientDashboard }
 */
import { useGetClientDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, History, Clock } from "lucide-react";

function formatDatetime(dt: string): string {
  return new Date(dt).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
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

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useGetClientDashboard();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {user?.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Seus agendamentos e histórico
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
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
                    <p className="text-lg font-semibold capitalize">
                      {formatDatetime(data.dashboard.nextAppointment.startDatetime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Profissional:{" "}
                      {data.dashboard.nextAppointment.professionalName ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Serviço: {data.dashboard.nextAppointment.serviceName ?? "—"}
                    </p>
                    <Badge variant="outline">
                      {modalityLabel(data.dashboard.nextAppointment.modality)}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Você não tem agendamentos futuros confirmados.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Próximos agendamentos */}
            {data.dashboard.upcomingAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Meus Próximos Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.dashboard.upcomingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {formatDatetime(apt.startDatetime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.professionalName ?? "—"} · {apt.serviceName ?? "—"}
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

            {/* Histórico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.dashboard.pastAppointmentsCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento anterior.
                  </p>
                ) : (
                  <p className="text-sm">
                    Você realizou{" "}
                    <span className="font-semibold">
                      {data.dashboard.pastAppointmentsCount}
                    </span>{" "}
                    atendimento
                    {data.dashboard.pastAppointmentsCount !== 1 ? "s" : ""} até
                    agora.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
