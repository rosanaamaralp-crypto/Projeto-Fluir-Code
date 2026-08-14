/**
 * T-007 — Detalhes do Agendamento
 *
 * Exibe dados do agendamento, histórico de status.
 * Permite cancelamento e remarcação.
 */
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetAppointment,
  useGetAppointmentHistory,
  usePatchAppointment,
} from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/status-badge";
import { ModalityBadge } from "@/components/admin/modality-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ArrowLeft, Calendar, History, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao processar operação.";
}

export default function AdminAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  const apptQ = useGetAppointment(id!);
  const histQ = useGetAppointmentHistory(id!);
  const { mutate: patchAppt, isPending, isError, error } = usePatchAppointment();

  const appt = apptQ.data?.appointment;

  function handleCancel() {
    patchAppt(
      {
        id: id!,
        data: { status: "CANCELLED", reason: cancelReason || undefined },
      },
      {
        onSuccess: () => {
          setConfirmCancel(false);
          setCancelReason("");
          apptQ.refetch();
          histQ.refetch();
        },
      },
    );
  }

  function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Informe data e horário para a remarcação.");
      return;
    }
    const startDatetime = `${rescheduleDate}T${rescheduleTime}:00.000Z`;
    setRescheduleError("");
    patchAppt(
      {
        id: id!,
        data: {
          reschedule: { startDatetime },
        },
      },
      {
        onSuccess: () => {
          setRescheduleDate("");
          setRescheduleTime("");
          apptQ.refetch();
          histQ.refetch();
        },
        onError: (err) => {
          setRescheduleError(getErrorMessage(err));
        },
      },
    );
  }

  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW"];
  const isTerminal = appt ? TERMINAL.includes(appt.status) : false;

  if (apptQ.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (apptQ.isError || !appt) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link href="/admin/schedule">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <Alert variant="destructive">
            <AlertDescription>
              {apptQ.error instanceof Error ? apptQ.error.message : "Agendamento não encontrado."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/schedule">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalhes do Agendamento
            </h1>
            <p className="text-xs font-mono text-muted-foreground">{appt.id}</p>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            {!isTerminal && <TabsTrigger value="actions">Ações</TabsTrigger>}
          </TabsList>

          {/* Info */}
          <TabsContent value="info" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base">Dados do Agendamento</CardTitle>
                <div className="flex gap-2">
                  <StatusBadge status={appt.status} />
                  <ModalityBadge modality={appt.modality} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">
                      {new Date(appt.startDatetime).toLocaleDateString("pt-BR")}
                      {" "}
                      {new Date(appt.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(appt.endDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p>
                      {Number(appt.priceAtBooking).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID do Cliente</p>
                    <p className="font-mono text-xs">
                      <Link href={`/admin/clients/${appt.clientId}`}>
                        <span className="underline cursor-pointer">{appt.clientId.slice(0, 16)}…</span>
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID do Profissional</p>
                    <p className="font-mono text-xs">
                      <Link href={`/admin/professionals/${appt.professionalId}`}>
                        <span className="underline cursor-pointer">{appt.professionalId.slice(0, 16)}…</span>
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID do Serviço</p>
                    <p className="font-mono text-xs">{appt.serviceId.slice(0, 16)}…</p>
                  </div>
                  {appt.resourceId && (
                    <div>
                      <p className="text-xs text-muted-foreground">ID do Recurso</p>
                      <p className="font-mono text-xs">{appt.resourceId.slice(0, 16)}…</p>
                    </div>
                  )}
                  {appt.addressId && (
                    <div>
                      <p className="text-xs text-muted-foreground">ID do Endereço</p>
                      <p className="font-mono text-xs">{appt.addressId.slice(0, 16)}…</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-xs">{new Date(appt.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                {appt.notes && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted rounded p-2">{appt.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {histQ.isLoading ? (
                  <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (histQ.data?.history ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {histQ.data?.history.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.oldStatus && (
                              <>
                                <StatusBadge status={h.oldStatus} />
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <StatusBadge status={h.newStatus} />
                          </div>
                          {h.reason && (
                            <p className="text-xs text-muted-foreground mt-1">Motivo: {h.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(h.changedAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions */}
          {!isTerminal && (
            <TabsContent value="actions" className="pt-4 space-y-4">
              {/* Cancelamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Cancelar Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Motivo do cancelamento (opcional)</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={2}
                      placeholder="Informe o motivo do cancelamento…"
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                    disabled={isPending}
                  >
                    Cancelar Agendamento
                  </Button>
                </CardContent>
              </Card>

              {/* Remarcação */}
              {appt.status === "CONFIRMED" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Remarcar Agendamento</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      O agendamento atual será cancelado e um novo será criado.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleReschedule} className="space-y-3">
                      {rescheduleError && (
                        <Alert variant="destructive">
                          <AlertDescription className="text-xs">{rescheduleError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Nova Data</Label>
                          <Input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 10)}
                            disabled={isPending}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Novo Horário (UTC)</Label>
                          <Input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            disabled={isPending}
                          />
                        </div>
                      </div>
                      <Button type="submit" size="sm" disabled={isPending} className="gap-2">
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmar Remarcação
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Confirm cancel */}
        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={(open) => !open && setConfirmCancel(false)}
          title="Cancelar agendamento?"
          description="Esta ação não pode ser desfeita. O agendamento será marcado como cancelado."
          confirmLabel="Cancelar Agendamento"
          onConfirm={handleCancel}
          destructive
        />
      </div>
    </AppLayout>
  );
}
