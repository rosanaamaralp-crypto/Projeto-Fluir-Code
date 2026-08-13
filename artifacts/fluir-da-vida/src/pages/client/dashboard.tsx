/**
 * T-027 — Dashboard Cliente
 *
 * Doc 15 §34 / Doc 08 TELA 10 / AuthDoc D3.
 * Exibe:
 *  - próximo atendimento
 *  - próximos atendimentos
 *  - histórico resumido (últimos 3 completados via GET /api/appointments)
 *  - acesso rápido a Novo Agendamento e Meus Agendamentos
 *
 * Endpoints: GET /api/dashboard/client + GET /api/appointments (segunda consulta).
 */
import { useGetClientDashboard, useListAppointments } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, History, Clock, Plus, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

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

function formatShort(dt: string): string {
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

export default function ClientDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, isError, error, refetch } = useGetClientDashboard();

  // Segunda consulta: histórico resumido (últimos completados/cancelados)
  const { data: histData, isLoading: histLoading } = useListAppointments(
    { status: "COMPLETED" },
    { query: { enabled: true } } as any,
  );
  const recentHistory = (histData?.appointments ?? []).slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {user?.name?.split(" ")[0] ?? ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Seus agendamentos e histórico
            </p>
          </div>
          <Button
            onClick={() => navigate("/client/book")}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Agendamento
          </Button>
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
                  <div className="space-y-1.5">
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {modalityLabel(data.dashboard.nextAppointment.modality)}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Você não tem agendamentos futuros confirmados.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => navigate("/client/book")}
                    >
                      Agendar agora
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Próximos agendamentos */}
            {data.dashboard.upcomingAppointments.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Meus Próximos Agendamentos
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/client/appointments")}
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.dashboard.upcomingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {formatDatetime(apt.startDatetime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.professionalName ?? "—"} · {apt.serviceName ?? "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {modalityLabel(apt.modality)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico resumido */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Histórico
                </CardTitle>
                {data.dashboard.pastAppointmentsCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/client/appointments")}
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {data.dashboard.pastAppointmentsCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento anterior.
                  </p>
                ) : (
                  <>
                    {histLoading && (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    )}
                    {!histLoading && recentHistory.length > 0 && (
                      <div className="space-y-2">
                        {recentHistory.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between py-1.5 border-b last:border-0"
                          >
                            <p className="text-sm">
                              {formatShort(apt.startDatetime)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {modalityLabel(apt.modality)}
                            </Badge>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground pt-1">
                          Total:{" "}
                          <span className="font-semibold">
                            {data.dashboard.pastAppointmentsCount}
                          </span>{" "}
                          atendimento
                          {data.dashboard.pastAppointmentsCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    {!histLoading && recentHistory.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Você realizou{" "}
                        <span className="font-semibold">
                          {data.dashboard.pastAppointmentsCount}
                        </span>{" "}
                        atendimento
                        {data.dashboard.pastAppointmentsCount !== 1 ? "s" : ""}{" "}
                        até agora.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
