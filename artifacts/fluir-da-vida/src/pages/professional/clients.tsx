/**
 * T-023 — Meus Clientes (Profissional)
 *
 * Doc 15 §29: lista de clientes relacionados aos atendimentos do profissional.
 * RN-012: profissional vê informações de clientes necessárias para seus atendimentos.
 *
 * NOTA DE IMPLEMENTAÇÃO (F14):
 * Não existe endpoint que retorne clientes filtrados por profissional com dados enriquecidos
 * (nome, contato). GET /api/clients retorna apenas o registro do próprio usuário para
 * não-ADMIN. GET /api/appointments (auto-escopado ao profissional) retorna clientId (UUID)
 * mas sem clientName no AppointmentRow.
 *
 * Esta tela exibe os atendimentos únicos por cliente (clientId) com os dados disponíveis
 * no contrato existente. Um endpoint enriquecido (/api/me/clients ou similar) seria
 * necessário para exibir nomes — documentado como pendência para fase futura.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListAppointments } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em Atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Ausência",
};

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "🏠 Home Care" : "Presencial";
}

interface ClientGroup {
  clientId: string;
  appointments: Array<{
    id: string;
    startDatetime: string;
    status: string;
    modality: string;
  }>;
}

export default function ProfessionalClients() {
  const [showAll, setShowAll] = useState(false);

  // Backend auto-escopa ao profissional autenticado (PROFESSIONAL role)
  const { data, isLoading, isError, error, refetch } = useListAppointments();

  // Agrupar por clientId e ordenar pelo atendimento mais recente
  const clientGroups: ClientGroup[] = [];
  if (data?.appointments) {
    const map = new Map<string, ClientGroup>();
    for (const apt of data.appointments) {
      if (!map.has(apt.clientId)) {
        map.set(apt.clientId, { clientId: apt.clientId, appointments: [] });
      }
      map.get(apt.clientId)!.appointments.push({
        id: apt.id,
        startDatetime: apt.startDatetime,
        status: apt.status,
        modality: apt.modality,
      });
    }
    // Ordenar appointments dentro de cada grupo (mais recente primeiro)
    for (const group of map.values()) {
      group.appointments.sort(
        (a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime(),
      );
      clientGroups.push(group);
    }
    // Ordenar grupos pelo atendimento mais recente
    clientGroups.sort(
      (a, b) =>
        new Date(b.appointments[0]!.startDatetime).getTime() -
        new Date(a.appointments[0]!.startDatetime).getTime(),
    );
  }

  const displayed = showAll ? clientGroups : clientGroups.slice(0, 20);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Meus Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Clientes com atendimentos relacionados à sua agenda
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar clientes."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {!isLoading && !isError && clientGroups.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado. Os clientes aparecem aqui após o primeiro agendamento.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && clientGroups.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {clientGroups.length} cliente(s) encontrado(s)
            </p>
            <div className="space-y-3 overflow-x-auto">
              {displayed.map((group) => {
                const last = group.appointments[0]!;
                return (
                  <Link
                    key={group.clientId}
                    href={`/professional/schedule/${last.id}`}
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-sm">
                              Cliente #{group.clientId.slice(0, 8)}…
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Último: {formatDatetime(last.startDatetime)}
                              </span>
                              <Badge variant="outline">
                                {modalityLabel(last.modality)}
                              </Badge>
                              <Badge variant="secondary">
                                {STATUS_LABELS[last.status] ?? last.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {group.appointments.length} atendimento(s) no total
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            {clientGroups.length > 20 && !showAll && (
              <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
                Ver todos ({clientGroups.length})
              </Button>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
