/**
 * T-036 — Meus Agendamentos (Cliente)
 *
 * Doc 15 §44 / Doc 08 TELA 15/17.
 * Dois grupos: Próximos (CONFIRMED, IN_PROGRESS) e Histórico (COMPLETED, CANCELLED, NO_SHOW).
 */
import { useListAppointments } from "@workspace/api-client-react";
import type { AppointmentRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, History, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em Atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Ausência",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  CONFIRMED: "default",
  IN_PROGRESS: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const UPCOMING_STATUSES = new Set(["CONFIRMED", "IN_PROGRESS"]);
const HISTORY_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "Home Care" : m === "IN_PERSON" ? "Presencial" : m;
}

interface AppointmentCardProps {
  apt: AppointmentRow;
  onClick: () => void;
}

function AppointmentCard({ apt, onClick }: AppointmentCardProps) {
  return (
    <button
      className="w-full text-left flex items-center justify-between py-3 px-1 border-b last:border-0 hover:bg-muted/40 rounded transition-colors"
      onClick={onClick}
    >
      <div className="space-y-0.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANTS[apt.status] ?? "outline"}>
            {STATUS_LABELS[apt.status] ?? apt.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {modalityLabel(apt.modality)}
          </Badge>
        </div>
        <p className="text-sm font-medium mt-1">
          {formatDatetime(apt.startDatetime)}
        </p>
        <p className="text-xs text-muted-foreground">
          R$ {Number(apt.priceAtBooking).toFixed(2).replace(".", ",")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
    </button>
  );
}

export default function ClientAppointments() {
  const { data, isLoading, isError, error, refetch } = useListAppointments();
  const [, navigate] = useLocation();

  const upcoming =
    data?.appointments?.filter((a) => UPCOMING_STATUSES.has(a.status)) ?? [];
  const history =
    data?.appointments?.filter((a) => HISTORY_STATUSES.has(a.status)) ?? [];

  function goToDetail(id: string) {
    navigate(`/client/appointments/${id}`);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Meus Agendamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Próximos atendimentos e histórico
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar agendamentos."}
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
            {/* Próximos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Próximos Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhum atendimento futuro.
                  </p>
                ) : (
                  <div>
                    {upcoming.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        apt={apt}
                        onClick={() => goToDetail(apt.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card id="history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhum atendimento no histórico.
                  </p>
                ) : (
                  <div>
                    {history.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        apt={apt}
                        onClick={() => goToDetail(apt.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA — novo agendamento */}
            {upcoming.length === 0 && history.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Você ainda não possui agendamentos.
                </p>
                <Button onClick={() => navigate("/client/book")}>
                  Agendar agora
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
