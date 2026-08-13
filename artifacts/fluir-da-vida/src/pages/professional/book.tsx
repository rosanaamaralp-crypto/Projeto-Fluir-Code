/**
 * F19 — Novo Agendamento (Wizard) — Profissional em nome do cliente
 *
 * Adaptado do wizard do cliente (src/pages/client/book.tsx).
 * O profissional autenticado é sempre o profissional do atendimento
 * (o backend força o professionalId da sessão — segurança F19).
 *
 * Etapas:
 *   1. Cliente (clientes do profissional)
 *   2. Serviço (somente serviços vinculados ao profissional)
 *   3. Modalidade
 *   4. Data
 *   5. Horário
 *   6. Confirmação (+ validação Home Care com endereço do cliente)
 *   7. Sucesso
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  useListServices,
  useListProfessionalServices,
  useListMyProfessionalClients,
  useGetMyProfessionalClient,
  useListSlots,
  useCreateAppointment,
} from "@workspace/api-client-react";
import type { ServiceRow, ProfessionalClientItem } from "@workspace/api-client-react";
import { useProfessionalSelf } from "@/hooks/use-professional-self";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Home,
  MapPin,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Modality = "IN_PERSON" | "HOME_CARE";

interface WizardState {
  step: Step;
  client: ProfessionalClientItem | null;
  service: ServiceRow | null;
  modality: Modality | null;
  date: string; // YYYY-MM-DD
  startDatetime: string | null;
  notes: string;
  createdAppointmentId: string | null;
}

const INITIAL: WizardState = {
  step: 1,
  client: null,
  service: null,
  modality: null,
  date: "",
  startDatetime: null,
  notes: "",
  createdAppointmentId: null,
};

const STEP_LABELS: Record<Step, string> = {
  1: "Cliente",
  2: "Serviço",
  3: "Modalidade",
  4: "Data",
  5: "Horário",
  6: "Confirmação",
  7: "Sucesso",
};

function modalityLabel(m: string) {
  return m === "HOME_CARE" ? "Home Care" : "Presencial";
}

function allowedModalities(svc: ServiceRow): Modality[] {
  if (svc.allowedModalities === "IN_PERSON") return ["IN_PERSON"];
  if (svc.allowedModalities === "HOME_CARE") return ["HOME_CARE"];
  return ["IN_PERSON", "HOME_CARE"];
}

function fmtDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Progresso ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const total = 6;
  const pct = ((Math.min(current, 6) - 1) / (total - 1)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Etapa {Math.min(current, 6)} de {total}</span>
        <span>{STEP_LABELS[current]}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export default function ProfessionalBook() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ── Dados remotos ────────────────────────────────────────────────────────
  const { professional, isLoading: selfLoading, isError: selfError } =
    useProfessionalSelf();

  const { data: clientsData, isLoading: clientsLoading, isError: clientsError } =
    useListMyProfessionalClients();

  const { data: servicesData, isLoading: svcLoading, isError: svcError } =
    useListServices();
  const { data: psData, isLoading: psLoading } = useListProfessionalServices(
    professional?.id ?? "",
    { query: { enabled: !!professional?.id } } as any,
  );

  // Serviços ativos vinculados (ativos) ao profissional autenticado
  const linkedServiceIds = new Set(
    (psData?.professionalServices ?? []).filter((ps) => ps.active).map((ps) => ps.serviceId),
  );
  const myServices = (servicesData?.services ?? []).filter(
    (s) => s.status === "ACTIVE" && linkedServiceIds.has(s.id),
  );

  // Detalhe do cliente selecionado (inclui endereço — necessário para Home Care)
  const { data: clientDetail } = useGetMyProfessionalClient(
    state.client?.id ?? "",
    { query: { enabled: !!state.client?.id } } as any,
  );
  const clientAddress = clientDetail?.address ?? null;

  const slotsEnabled =
    state.step >= 5 && !!professional && !!state.service && !!state.date;
  const { data: slotsData, isLoading: slotsLoading } = useListSlots(
    {
      professionalId: professional?.id ?? "",
      serviceId: state.service?.id ?? "",
      date: state.date,
      modality: state.modality ?? undefined,
    },
    { query: { enabled: slotsEnabled } } as any,
  );

  const createAppointment = useCreateAppointment();

  // F20: pré-seleção de cliente via ?clientId= (vindo do cadastro de cliente)
  const search = useSearch();
  const preselectDone = useRef(false);
  useEffect(() => {
    if (preselectDone.current) return;
    const preselectId = new URLSearchParams(search).get("clientId");
    if (!preselectId || !clientsData?.clients) return;
    const found = clientsData.clients.find(
      (c) => c.id === preselectId && c.status === "ACTIVE",
    );
    // Só marca como concluído quando o cliente foi de fato encontrado —
    // uma lista ainda desatualizada (cache) pode não conter o recém-criado.
    if (found) {
      preselectDone.current = true;
      setState((s) =>
        s.step === 1 && !s.client ? { ...s, client: found, step: 2 } : s,
      );
    }
  }, [search, clientsData]);

  // ── Navegação ────────────────────────────────────────────────────────────
  function goTo(step: Step) {
    setState((s) => ({ ...s, step }));
  }

  function back() {
    if (state.step <= 1) return;
    goTo((state.step - 1) as Step);
  }

  // ── Submissão final ──────────────────────────────────────────────────────
  function handleConfirm() {
    if (
      !professional ||
      !state.client ||
      !state.service ||
      !state.modality ||
      !state.startDatetime
    )
      return;

    const payload: Parameters<typeof createAppointment.mutate>[0]["data"] = {
      serviceId: state.service.id,
      // O backend ignora este valor para PROFESSIONAL e usa o da sessão,
      // mas o contrato exige o campo.
      professionalId: professional.id,
      clientId: state.client.id,
      startDatetime: state.startDatetime,
      modality: state.modality,
      notes: state.notes.trim() || undefined,
    };

    if (state.modality === "HOME_CARE" && clientAddress) {
      payload.addressId = clientAddress.id;
    }

    createAppointment.mutate(
      { data: payload },
      {
        onSuccess: (res) => {
          setState((s) => ({
            ...s,
            step: 7,
            createdAppointmentId: res.appointment.id,
          }));
        },
        onError: (err) => {
          toast({
            title: "Erro ao criar agendamento",
            description: err instanceof Error ? err.message : "Tente novamente.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Agendamento</h1>
          <p className="text-sm text-muted-foreground">
            Agende um atendimento em nome de um cliente
          </p>
        </div>

        {selfError && (
          <Alert variant="destructive">
            <AlertDescription>Erro ao carregar seu perfil profissional.</AlertDescription>
          </Alert>
        )}

        {state.step < 7 && <StepIndicator current={state.step} />}

        {/* ── ETAPA 1: Cliente ─────────────────────────────────────────────── */}
        {state.step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Selecione o Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(clientsLoading || selfLoading) && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              )}
              {clientsError && (
                <Alert variant="destructive">
                  <AlertDescription>Erro ao carregar clientes.</AlertDescription>
                </Alert>
              )}
              {clientsData && (
                <div className="space-y-2">
                  {clientsData.clients
                    .filter((c) => c.status === "ACTIVE")
                    .map((c) => (
                      <button
                        key={c.id}
                        data-testid={`button-select-client-${c.id}`}
                        className={[
                          "w-full text-left rounded-md border p-4 flex items-center gap-3 transition-colors",
                          "hover:bg-muted/60",
                          state.client?.id === c.id ? "border-primary bg-primary/5" : "",
                        ].join(" ")}
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            client: c,
                            modality: null,
                            date: "",
                            startDatetime: null,
                          }))
                        }
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {c.name ?? "Cliente"}
                          </p>
                          {(c.email || c.phone) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {c.email ?? c.phone}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  {clientsData.clients.filter((c) => c.status === "ACTIVE").length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Você ainda não possui clientes com atendimentos. É necessário
                        que o cliente seja cadastrado pelo administrador (e tenha um
                        atendimento com você) antes de realizar o agendamento.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button disabled={!state.client} onClick={() => goTo(2)}>
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 2: Serviço ─────────────────────────────────────────────── */}
        {state.step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                Selecione o Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(svcLoading || psLoading) && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
              {svcError && (
                <Alert variant="destructive">
                  <AlertDescription>Erro ao carregar serviços.</AlertDescription>
                </Alert>
              )}
              {!svcLoading && !psLoading && (
                <div className="space-y-2">
                  {myServices.map((svc) => (
                    <button
                      key={svc.id}
                      data-testid={`button-select-service-${svc.id}`}
                      className={[
                        "w-full text-left rounded-md border p-4 transition-colors",
                        "hover:bg-muted/60",
                        state.service?.id === svc.id ? "border-primary bg-primary/5" : "",
                      ].join(" ")}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          service: svc,
                          modality: null,
                          date: "",
                          startDatetime: null,
                        }))
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {svc.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-semibold">
                            R$ {Number(svc.price).toFixed(2).replace(".", ",")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {svc.durationMinutes} min
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {myServices.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum serviço vinculado ao seu perfil. Fale com o administrador.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button disabled={!state.service} onClick={() => goTo(3)}>
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 3: Modalidade ─────────────────────────────────────────── */}
        {state.step === 3 && state.service && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Selecione a Modalidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allowedModalities(state.service).map((m) => (
                <button
                  key={m}
                  data-testid={`button-select-modality-${m}`}
                  className={[
                    "w-full text-left rounded-md border p-4 flex items-center gap-3 transition-colors",
                    "hover:bg-muted/60",
                    state.modality === m ? "border-primary bg-primary/5" : "",
                  ].join(" ")}
                  onClick={() =>
                    setState((s) =>
                      s.modality === m
                        ? s
                        : { ...s, modality: m, date: "", startDatetime: null }
                    )
                  }
                >
                  {m === "IN_PERSON" ? (
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <Home className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{modalityLabel(m)}</p>
                    <p className="text-xs text-muted-foreground">
                      {m === "IN_PERSON"
                        ? "Atendimento no local (com maca)"
                        : "Atendimento no endereço do cliente"}
                    </p>
                  </div>
                </button>
              ))}

              {/* Aviso HOME_CARE sem endereço do cliente */}
              {state.modality === "HOME_CARE" && !clientAddress && (
                <Alert>
                  <AlertDescription>
                    Este cliente não possui endereço cadastrado. O endereço precisa
                    ser cadastrado (pelo cliente ou pelo administrador) antes de um
                    agendamento Home Care.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-2">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  disabled={
                    !state.modality ||
                    (state.modality === "HOME_CARE" && !clientAddress)
                  }
                  onClick={() => goTo(4)}
                >
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 4: Data ───────────────────────────────────────────────── */}
        {state.step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Selecione a Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Data do atendimento</Label>
                <Input
                  id="date"
                  type="date"
                  value={state.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      date: e.target.value,
                      startDatetime: null,
                    }))
                  }
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button disabled={!state.date} onClick={() => goTo(5)}>
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 5: Horário ────────────────────────────────────────────── */}
        {state.step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Selecione o Horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {slotsLoading && (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              )}

              {!slotsLoading && (slotsData?.slots?.length ?? 0) === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum horário disponível nesta data.
                  </p>
                  <Button variant="outline" onClick={() => goTo(4)}>
                    Escolher outra data
                  </Button>
                </div>
              )}

              {!slotsLoading && (slotsData?.slots?.length ?? 0) > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {slotsData!.slots.map((slot) => {
                    const isSelected = state.startDatetime === slot.startDatetime;
                    return (
                      <button
                        key={slot.startDatetime}
                        type="button"
                        className={[
                          "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted",
                        ].join(" ")}
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            startDatetime: isSelected ? null : slot.startDatetime,
                          }))
                        }
                      >
                        {fmtTime(slot.startDatetime)}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button disabled={!state.startDatetime} onClick={() => goTo(6)}>
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 6: Confirmação ─────────────────────────────────────────── */}
        {state.step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-right">
                    {state.client?.name ?? "—"}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium text-right">{state.service?.name}</span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Modalidade</span>
                  <span className="font-medium text-right">
                    {modalityLabel(state.modality!)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium text-right">
                    {professional?.name ?? "Você"}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Data e horário</span>
                  <span className="font-medium capitalize text-right">
                    {state.startDatetime ? fmtDatetime(state.startDatetime) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium text-right">
                    R${" "}
                    {Number(state.service?.price ?? 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
                {state.modality === "HOME_CARE" && clientAddress && (
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 border-b">
                    <span className="text-muted-foreground">Endereço</span>
                    <span className="font-medium text-right">
                      {clientAddress.street}, {clientAddress.number}
                      <br />
                      {clientAddress.city}/{clientAddress.state}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input
                  id="notes"
                  value={state.notes}
                  onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Alguma informação adicional"
                  maxLength={500}
                />
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  disabled={createAppointment.isPending || !professional}
                  onClick={handleConfirm}
                  data-testid="button-confirm-appointment"
                >
                  {createAppointment.isPending
                    ? "Confirmando..."
                    : "Confirmar agendamento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 7: Sucesso ─────────────────────────────────────────────── */}
        {state.step === 7 && (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold">Agendamento confirmado!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O agendamento foi realizado com sucesso em nome do cliente.
                </p>
              </div>

              {state.startDatetime && (
                <div className="rounded-md bg-muted p-4 text-sm text-left space-y-1">
                  <p>
                    <span className="text-muted-foreground">Cliente: </span>
                    <span className="font-medium">{state.client?.name ?? "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Serviço: </span>
                    <span className="font-medium">{state.service?.name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Data: </span>
                    <span className="font-medium capitalize">
                      {fmtDatetime(state.startDatetime)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Modalidade: </span>
                    <span className="font-medium">{modalityLabel(state.modality!)}</span>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (state.createdAppointmentId) {
                      navigate(`/professional/schedule/${state.createdAppointmentId}`);
                    } else {
                      navigate("/professional/schedule");
                    }
                  }}
                >
                  Ver minha agenda
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setState(INITIAL)}
                >
                  Novo agendamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
