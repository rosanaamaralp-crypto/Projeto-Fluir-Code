/**
 * T-022 — Detalhes do Atendimento (Profissional)
 *
 * Doc 15 §28: informações do atendimento, ações Iniciar / Concluir / Ausência / Cancelar.
 * Doc 16 §42-44: status transitions via PATCH /appointments/:id.
 * RN-083: validação definitiva no backend; frontend apenas dispara a requisição.
 *
 * Dados legíveis (Decisão B — Autorização Formal T-022):
 *   - clientName:  useGetMyProfessionalClient(apt.clientId) → client.name
 *   - serviceName: useListServices()                        → serviceMap[apt.serviceId]
 *   - resourceName: useListResources()                     → resourceMap[apt.resourceId]
 *   - address:     useGetMyProfessionalClient(apt.clientId) → address (Home Care)
 *
 * Transições permitidas:
 *   CONFIRMED  → IN_PROGRESS  (Iniciar)
 *   IN_PROGRESS → COMPLETED   (Concluir)
 *   CONFIRMED  → NO_SHOW      (Registrar Ausência)
 *   CONFIRMED/IN_PROGRESS → CANCELLED (Cancelar — requer confirmação)
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetAppointment,
  useGetAppointmentHistory,
  usePatchAppointment,
  useListServices,
  useListResources,
  useGetMyProfessionalClient,
} from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, MapPin, Home } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "🏠 Home Care" : "🛏️ Presencial";
}

export default function ProfessionalAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ── Dados do atendimento ──────────────────────────────────────────────────
  const {
    data: aptData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAppointment(id!);

  const {
    data: histData,
    isLoading: histLoading,
  } = useGetAppointmentHistory(id!);

  const apt = aptData?.appointment;

  // ── Dados legíveis (Decisão B) ────────────────────────────────────────────
  // Chamadas independentes; executadas em paralelo pelo React Query.
  // Habilitadas somente após o appointment carregar (enabled: !!apt?.clientId).

  const { data: clientData } = useGetMyProfessionalClient(
    apt?.clientId ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!apt?.clientId } } as any,
  );

  const { data: svcsData } = useListServices();
  const { data: resourcesData } = useListResources();

  // Mapas de resolução ID → nome
  const serviceMap: Record<string, string> = {};
  (svcsData?.services ?? []).forEach((s) => { serviceMap[s.id] = s.name; });

  const resourceMap: Record<string, string> = {};
  (resourcesData?.resources ?? []).forEach((r) => { resourceMap[r.id] = r.name; });

  const clientName = clientData?.client?.name ?? null;
  const clientAddress = clientData?.address ?? null;

  // ── Mutação de status ─────────────────────────────────────────────────────
  const patchMutation = usePatchAppointment({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["getAppointment"] });
        void queryClient.invalidateQueries({ queryKey: ["listAppointments"] });
        void queryClient.invalidateQueries({ queryKey: ["getProfessionalDashboard"] });
        setConfirmCancel(false);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar o atendimento.";
        toast({ variant: "destructive", title: "Erro", description: message });
      },
    },
  });

  function applyStatus(status: string, reason?: string) {
    patchMutation.mutate({
      id: id!,
      data: { status, ...(reason ? { reason } : {}) },
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/professional/schedule")}
            className="gap-1 shrink-0 -ml-2 sm:ml-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Agenda
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Detalhes do Atendimento
          </h1>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar o atendimento."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="sm:ml-4 self-start sm:self-auto">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {apt && (
          <>
            {/* Dados do atendimento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Atendimento</span>
                  <Badge variant={STATUS_VARIANTS[apt.status] ?? "outline"}>
                    {STATUS_LABELS[apt.status] ?? apt.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Horário */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDatetime(apt.startDatetime as unknown as string)}
                    {" — "}
                    {formatDatetime(apt.endDatetime as unknown as string)}
                  </span>
                </div>

                {/* Modalidade */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  {apt.modality === "HOME_CARE" ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span>{modalityLabel(apt.modality)}</span>
                </div>

                <Separator />

                {/* Dados legíveis — Decisão B */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 sm:gap-y-2">
                  {/* Cliente */}
                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Cliente</span>
                  <span className="col-span-3 sm:col-span-2 font-medium mb-2 sm:mb-0 break-words">
                    {clientData === undefined
                      ? <span className="text-muted-foreground italic">carregando…</span>
                      : (clientName ?? "Nome não informado")}
                  </span>

                  {/* Serviço */}
                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Serviço</span>
                  <span className="col-span-3 sm:col-span-2 mb-2 sm:mb-0 break-words">
                    {svcsData === undefined
                      ? <span className="text-muted-foreground italic">carregando…</span>
                      : (serviceMap[apt.serviceId] ?? "Serviço não encontrado")}
                  </span>

                  {/* Recurso / Maca — somente presencial */}
                  {apt.modality === "IN_PERSON" && apt.resourceId && (
                    <>
                      <span className="col-span-3 sm:col-span-1 text-muted-foreground">Maca</span>
                      <span className="col-span-3 sm:col-span-2 mb-2 sm:mb-0 break-words">
                        {resourcesData === undefined
                          ? <span className="text-muted-foreground italic">carregando…</span>
                          : (resourceMap[apt.resourceId] ?? "Maca não encontrada")}
                      </span>
                    </>
                  )}

                  {/* Endereço — somente Home Care */}
                  {apt.modality === "HOME_CARE" && (
                    <>
                      <span className="col-span-3 sm:col-span-1 text-muted-foreground">Endereço</span>
                      <span className="col-span-3 sm:col-span-2 mb-2 sm:mb-0 break-words">
                        {clientData === undefined ? (
                          <span className="text-muted-foreground italic">carregando…</span>
                        ) : clientAddress ? (
                          <span>
                            {clientAddress.street}, {clientAddress.number}
                            {clientAddress.complement ? ` — ${clientAddress.complement}` : ""}
                            {" · "}
                            {clientAddress.neighborhood}, {clientAddress.city}
                            {" — "}
                            {clientAddress.state}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Endereço não cadastrado</span>
                        )}
                      </span>
                    </>
                  )}

                  {/* Preço */}
                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Valor</span>
                  <span className="col-span-3 sm:col-span-2 break-words">R$ {apt.priceAtBooking}</span>
                </div>

                {apt.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Observações</p>
                      <p>{apt.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Ações de status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Iniciar — apenas se CONFIRMED */}
                {apt.status === "CONFIRMED" && (
                  <Button
                    className="w-full"
                    onClick={() => applyStatus("IN_PROGRESS")}
                    disabled={patchMutation.isPending}
                  >
                    Iniciar Atendimento
                  </Button>
                )}

                {/* Concluir — apenas se IN_PROGRESS */}
                {apt.status === "IN_PROGRESS" && (
                  <Button
                    className="w-full"
                    onClick={() => applyStatus("COMPLETED")}
                    disabled={patchMutation.isPending}
                  >
                    Concluir Atendimento
                  </Button>
                )}

                {/* Registrar Ausência — apenas se CONFIRMED */}
                {apt.status === "CONFIRMED" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => applyStatus("NO_SHOW")}
                    disabled={patchMutation.isPending}
                  >
                    Registrar Ausência
                  </Button>
                )}

                {/* Cancelar — se CONFIRMED ou IN_PROGRESS */}
                {(apt.status === "CONFIRMED" || apt.status === "IN_PROGRESS") && (
                  <>
                    {!confirmCancel ? (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setConfirmCancel(true)}
                        disabled={patchMutation.isPending}
                      >
                        Cancelar Atendimento
                      </Button>
                    ) : (
                      <div className="border border-destructive rounded-md p-3 space-y-2">
                        <p className="text-sm text-destructive font-medium">
                          Confirmar cancelamento?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => applyStatus("CANCELLED")}
                            disabled={patchMutation.isPending}
                          >
                            Sim, cancelar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfirmCancel(false)}
                            disabled={patchMutation.isPending}
                          >
                            Não
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Status finais — sem ações */}
                {(apt.status === "COMPLETED" || apt.status === "CANCELLED" || apt.status === "NO_SHOW") && (
                  <p className="text-sm text-muted-foreground text-center">
                    Este atendimento está encerrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                {histLoading && <Skeleton className="h-16 w-full" />}
                {!histLoading && (histData?.history?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro de histórico.
                  </p>
                )}
                {!histLoading && (histData?.history?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {histData!.history.map((h) => (
                      <div key={h.id} className="flex items-start justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                        <div>
                          <span className="font-medium">
                            {h.oldStatus ? `${STATUS_LABELS[h.oldStatus] ?? h.oldStatus} → ` : ""}
                            {STATUS_LABELS[h.newStatus] ?? h.newStatus}
                          </span>
                          {h.reason && (
                            <p className="text-muted-foreground text-xs">{h.reason}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {new Date(h.changedAt as unknown as string).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
