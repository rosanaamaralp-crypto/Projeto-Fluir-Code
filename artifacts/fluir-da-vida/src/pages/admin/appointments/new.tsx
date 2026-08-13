/**
 * T-006 — Novo Agendamento
 *
 * Cria um agendamento como ADMIN.
 * Fluxo: cliente → profissional → serviço → modalidade → data → slot → criação.
 *
 * Cliente selecionado via dropdown com nome real (API enriquecida com users JOIN).
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListProfessionals,
  useListServices,
  useListSlots,
  useListClients,
  useCreateAppointment,
} from "@workspace/api-client-react";
import type { AvailableSlot } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Clock } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao criar agendamento.";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAppointmentNew() {
  const [, navigate] = useLocation();

  const [clientId, setClientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [modality, setModality] = useState<"IN_PERSON" | "HOME_CARE" | "">("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [addressId, setAddressId] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clientsQ = useListClients();
  const profsQ = useListProfessionals();
  const svcsQ = useListServices();

  const slotsEnabled = !!(professionalId && serviceId && date);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slotsQ = useListSlots(
    slotsEnabled
      ? { professionalId, serviceId, date, modality: modality || undefined }
      : { professionalId: "", serviceId: "", date: "" },
    { query: { enabled: slotsEnabled } as any },
  );

  const { mutate: createAppt, isPending, isError, error } = useCreateAppointment();

  const services = svcsQ.data?.services ?? [];
  const selectedService = services.find((s) => s.id === serviceId);

  const allowedModalities: Array<"IN_PERSON" | "HOME_CARE"> =
    selectedService?.allowedModalities === "IN_PERSON"
      ? ["IN_PERSON"]
      : selectedService?.allowedModalities === "HOME_CARE"
      ? ["HOME_CARE"]
      : ["IN_PERSON", "HOME_CARE"];

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!clientId) errs.clientId = "Selecione um cliente.";
    if (!professionalId) errs.professionalId = "Selecione um profissional.";
    if (!serviceId) errs.serviceId = "Selecione um serviço.";
    if (!date) errs.date = "Selecione uma data.";
    if (!modality) errs.modality = "Selecione a modalidade.";
    if (!selectedSlot) errs.slot = "Selecione um horário disponível.";
    if (modality === "HOME_CARE" && !addressId.trim()) {
      errs.addressId = "Para Home Care, informe o ID do endereço do cliente.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !selectedSlot) return;

    createAppt(
      {
        data: {
          clientId,
          professionalId,
          serviceId,
          startDatetime: selectedSlot.startDatetime,
          modality,
          addressId: modality === "HOME_CARE" ? addressId.trim() : undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: (data) => {
          navigate(`/admin/appointments/${data.appointment.id}`);
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Link href="/admin/schedule">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Novo Agendamento</h1>
            <p className="text-sm text-muted-foreground">Crie um agendamento como administrador</p>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Cliente */}
          <Card>
            <CardHeader><CardTitle className="text-sm">1. Cliente</CardTitle></CardHeader>
            <CardContent>
              {clientsQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando clientes…</p>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsQ.data?.clients ?? []).filter((c) => c.status === "ACTIVE").map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {fieldErrors.clientId && <p className="text-xs text-destructive mt-1">{fieldErrors.clientId}</p>}
            </CardContent>
          </Card>

          {/* 2. Profissional */}
          <Card>
            <CardHeader><CardTitle className="text-sm">2. Profissional</CardTitle></CardHeader>
            <CardContent>
              <Select value={professionalId} onValueChange={(v) => { setProfessionalId(v); setSelectedSlot(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional…" />
                </SelectTrigger>
                <SelectContent>
                  {(profsQ.data?.professionals ?? []).filter((p) => p.status === "ACTIVE").map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.specialty ? ` — ${p.specialty}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.professionalId && <p className="text-xs text-destructive mt-1">{fieldErrors.professionalId}</p>}
            </CardContent>
          </Card>

          {/* 3. Serviço */}
          <Card>
            <CardHeader><CardTitle className="text-sm">3. Serviço</CardTitle></CardHeader>
            <CardContent>
              <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setModality(""); setSelectedSlot(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço…" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.status === "ACTIVE").map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.durationMinutes}min — {Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.serviceId && <p className="text-xs text-destructive mt-1">{fieldErrors.serviceId}</p>}
            </CardContent>
          </Card>

          {/* 4. Modalidade */}
          {serviceId && (
            <Card>
              <CardHeader><CardTitle className="text-sm">4. Modalidade</CardTitle></CardHeader>
              <CardContent className="flex gap-3">
                {allowedModalities.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModality(m); setSelectedSlot(null); }}
                    className={`flex-1 rounded-md border py-2 px-3 text-sm transition-colors ${
                      modality === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {m === "HOME_CARE" ? "🏠 Home Care" : "🏢 Presencial"}
                  </button>
                ))}
                {fieldErrors.modality && <p className="text-xs text-destructive mt-1">{fieldErrors.modality}</p>}
              </CardContent>
            </Card>
          )}

          {/* 5. Data e Slots */}
          <Card>
            <CardHeader><CardTitle className="text-sm">5. Data e Horário</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
                />
                {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
              </div>

              {slotsEnabled && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horários disponíveis
                  </Label>
                  {slotsQ.isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando horários…</p>
                  ) : slotsQ.isError ? (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        {getErrorMessage(slotsQ.error)}
                      </AlertDescription>
                    </Alert>
                  ) : (slotsQ.data?.slots ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível para os filtros selecionados.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotsQ.data?.slots.map((slot) => (
                        <button
                          key={slot.startDatetime}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                            selectedSlot?.startDatetime === slot.startDatetime
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {new Date(slot.startDatetime).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </button>
                      ))}
                    </div>
                  )}
                  {fieldErrors.slot && <p className="text-xs text-destructive">{fieldErrors.slot}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Home Care address */}
          {modality === "HOME_CARE" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">6. Endereço (Home Care)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <Label>ID do Endereço (UUID)</Label>
                  <Input
                    value={addressId}
                    onChange={(e) => setAddressId(e.target.value)}
                    placeholder="ID do endereço do cliente para Home Care"
                    disabled={isPending}
                  />
                  {fieldErrors.addressId && <p className="text-xs text-destructive">{fieldErrors.addressId}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7. Observações */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{modality === "HOME_CARE" ? "7." : "6."} Observações (opcional)</CardTitle></CardHeader>
            <CardContent>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre o agendamento"
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Criando…" : "Criar Agendamento"}
            </Button>
            <Link href="/admin/schedule">
              <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
            </Link>
          </div>

          {selectedSlot && (
            <div className="rounded-md border bg-muted p-3 text-sm">
              <p className="font-medium">Resumo do Agendamento</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                <span>Data: {new Date(selectedSlot.startDatetime).toLocaleDateString("pt-BR")}</span>
                <span>Horário: {new Date(selectedSlot.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                {modality && <Badge variant="outline" className="text-xs">{modality === "HOME_CARE" ? "Home Care" : "Presencial"}</Badge>}
              </div>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
