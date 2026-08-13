/**
 * T-037 — Detalhe do Agendamento (Cliente)
 *
 * Doc 15 §45 / Doc 08 TELA 16 / AuthDoc D2.
 * Ações disponíveis para CONFIRMED: Cancelar (com confirmação) e Remarcar.
 * Remarcação: seleciona nova data → novo horário via useListSlots → confirma.
 * CLIENT não pode trocar profissional, serviço ou modalidade (D2).
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetAppointment,
  useGetAppointmentHistory,
  usePatchAppointment,
  useListSlots,
  useListServices,
  getGetAppointmentQueryKey,
  getListAppointmentsQueryKey,
  getGetClientDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  ArrowLeft,
  AlertTriangle,
  History,
  MapPin,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function fmt(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "Home Care" : "Presencial";
}

// Obtém YYYY-MM-DD no fuso local sem conversão UTC
function toLocalDate(dt: string): string {
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ClientAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Dados do agendamento ───────────────────────────────────────────────────
  const {
    data: aptData,
    isLoading: aptLoading,
    isError: aptError,
    error: aptErr,
    refetch,
  } = useGetAppointment(id!);
  const { data: histData, isLoading: histLoading } = useGetAppointmentHistory(id!);
  const { data: servicesData } = useListServices();

  const apt = aptData?.appointment;
  const serviceMap = Object.fromEntries(
    (servicesData?.services ?? []).map((s) => [s.id, s.name]),
  );

  // ── Estado de cancelamento ─────────────────────────────────────────────────
  const [confirmCancel, setConfirmCancel] = useState(false);
  const patch = usePatchAppointment();

  function handleCancel() {
    if (!apt) return;
    patch.mutate(
      { id: apt.id, data: { status: "CANCELLED" } },
      {
        onSuccess: () => {
          toast({ title: "Agendamento cancelado." });
          invalidateAll();
          setConfirmCancel(false);
        },
        onError: (err) => {
          toast({
            title: "Erro ao cancelar",
            description: err instanceof Error ? err.message : "Tente novamente.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // ── Estado de remarcação ───────────────────────────────────────────────────
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState<string | null>(null);

  const slotsEnabled = rescheduleMode && !!newDate && !!apt;
  const { data: slotsData, isLoading: slotsLoading } = useListSlots(
    {
      professionalId: apt?.professionalId ?? "",
      serviceId: apt?.serviceId ?? "",
      date: newDate,
      modality: apt?.modality,
    },
    { query: { enabled: slotsEnabled } } as any,
  );

  function handleReschedule() {
    if (!apt || !newSlot) return;
    patch.mutate(
      {
        id: apt.id,
        data: {
          reschedule: {
            startDatetime: newSlot,
            resourceId: apt.resourceId ?? undefined,
            addressId: apt.addressId ?? undefined,
          },
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Agendamento remarcado com sucesso." });
          invalidateAll();
          setRescheduleMode(false);
          setNewDate("");
          setNewSlot(null);
        },
        onError: (err) => {
          toast({
            title: "Erro ao remarcar",
            description: err instanceof Error ? err.message : "Tente novamente.",
            variant: "destructive",
          });
        },
      },
    );
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(id!) });
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetClientDashboardQueryKey() });
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/client/appointments")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Detalhe do Agendamento
          </h1>
        </div>

        {/* LOADING */}
        {aptLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* ERROR */}
        {aptError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {aptErr instanceof Error ? aptErr.message : "Erro ao carregar agendamento."}
              </span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {apt && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Dados do Atendimento</CardTitle>
                  <Badge variant={STATUS_VARIANTS[apt.status] ?? "outline"}>
                    {STATUS_LABELS[apt.status] ?? apt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium capitalize">{fmt(apt.startDatetime)}</p>
                    <p className="text-xs text-muted-foreground">
                      até {fmtShort(apt.endDatetime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">{modalityLabel(apt.modality)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">
                    Serviço:{" "}
                    <span className="font-medium">
                      {serviceMap[apt.serviceId] ?? apt.serviceId}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="text-sm font-medium">
                    R$ {Number(apt.priceAtBooking).toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {apt.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Observações: {apt.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações — só para CONFIRMED */}
            {apt.status === "CONFIRMED" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!confirmCancel && !rescheduleMode && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setRescheduleMode(true)}
                      >
                        <Calendar className="h-4 w-4 mr-1.5" />
                        Remarcar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmCancel(true)}
                      >
                        Cancelar agendamento
                      </Button>
                    </div>
                  )}

                  {/* Confirmação de cancelamento */}
                  {confirmCancel && (
                    <div className="space-y-3 border border-destructive rounded-md p-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-sm font-medium">
                          Confirmar cancelamento?
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Esta ação não pode ser desfeita.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={handleCancel}
                        >
                          {patch.isPending ? "Cancelando..." : "Sim, cancelar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmCancel(false)}
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Remarcação */}
                  {rescheduleMode && (
                    <div className="space-y-4 border rounded-md p-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Selecione a nova data e horário
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Profissional, serviço e modalidade permanecem os mesmos.
                      </p>

                      <div className="space-y-1.5">
                        <Label htmlFor="newDate">Nova data</Label>
                        <Input
                          id="newDate"
                          type="date"
                          value={newDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => {
                            setNewDate(e.target.value);
                            setNewSlot(null);
                          }}
                        />
                      </div>

                      {/* Slots */}
                      {newDate && (
                        <div className="space-y-1.5">
                          <Label>Horário disponível</Label>
                          {slotsLoading && (
                            <div className="grid grid-cols-3 gap-2">
                              {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-9" />
                              ))}
                            </div>
                          )}
                          {!slotsLoading && slotsData?.slots?.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Nenhum horário disponível nesta data.
                            </p>
                          )}
                          {!slotsLoading && (slotsData?.slots?.length ?? 0) > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {slotsData!.slots.map((slot) => {
                                const label = new Date(
                                  slot.startDatetime,
                                ).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                                const isSelected = newSlot === slot.startDatetime;
                                return (
                                  <button
                                    key={slot.startDatetime}
                                    type="button"
                                    className={[
                                      "rounded-md border px-3 py-2 text-sm transition-colors",
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "hover:bg-muted",
                                    ].join(" ")}
                                    onClick={() =>
                                      setNewSlot(
                                        isSelected ? null : slot.startDatetime,
                                      )
                                    }
                                  >
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!newSlot || patch.isPending}
                          onClick={handleReschedule}
                        >
                          {patch.isPending ? "Remarcando..." : "Confirmar remarcação"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRescheduleMode(false);
                            setNewDate("");
                            setNewSlot(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Histórico de status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Histórico de Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {histLoading && <Skeleton className="h-16 w-full" />}
                {!histLoading && histData && (
                  <div className="space-y-2">
                    {histData.history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum histórico disponível.
                      </p>
                    ) : (
                      histData.history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                        >
                          <span>
                            <span className="text-muted-foreground">
                              {STATUS_LABELS[h.oldStatus ?? ""] ?? h.oldStatus ?? "—"}
                            </span>
                            {" → "}
                            <span className="font-medium">
                              {STATUS_LABELS[h.newStatus] ?? h.newStatus}
                            </span>
                            {h.reason && (
                              <span className="text-muted-foreground ml-1">
                                ({h.reason})
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fmtShort(h.changedAt)}
                          </span>
                        </div>
                      ))
                    )}
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
