/**
 * T-021 — Minha Agenda (Profissional)
 *
 * Doc 15 §27: visualizações dia/semana; cada atendimento mostra horário,
 * modalidade e status. O backend auto-escopa ao profissional autenticado.
 *
 * RN-011: profissional vê apenas sua própria agenda.
 * RN-067: filtro professionalId nunca é exposto ao usuário — derivado da sessão.
 *
 * Filtros: data (padrão = hoje), status.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListAppointments } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em Atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Ausência",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CONFIRMED: "default",
  IN_PROGRESS: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "🏠 Home Care" : "Presencial";
}

export default function ProfessionalSchedule() {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState("ALL");

  const queryParams = {
    date,
    ...(status !== "ALL" ? { status } : {}),
  };

  const { data, isLoading, isError, error, refetch } = useListAppointments(queryParams);

  const appointments = data?.appointments ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Minha Agenda
          </h1>
          <p className="text-sm text-muted-foreground">
            Seus atendimentos do dia
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-44"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar agenda."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="sm:ml-4 self-start sm:self-auto">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {!isLoading && !isError && appointments.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum atendimento encontrado para os filtros selecionados.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && appointments.length > 0 && (
          <div className="space-y-3">
            {appointments
              .slice()
              .sort((a, b) =>
                new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
              )
              .map((apt) => (
                <Link key={apt.id} href={`/professional/schedule/${apt.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">
                              {formatTime(apt.startDatetime)} — {formatTime(apt.endDatetime)}
                            </span>
                            <Badge variant={STATUS_VARIANTS[apt.status] ?? "outline"}>
                              {STATUS_LABELS[apt.status] ?? apt.status}
                            </Badge>
                            <Badge variant="outline">
                              {modalityLabel(apt.modality)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            ID: {apt.id.slice(0, 8)}…
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
