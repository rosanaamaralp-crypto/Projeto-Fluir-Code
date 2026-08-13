/**
 * T-028 — Novo Agendamento (Wizard) — Cliente
 *
 * Doc 15 §36-43 / Doc 08 TELA 11 / AuthDoc D4.
 * Wizard single-route /client/book, estado local, 7 etapas:
 *   1. Serviço
 *   2. Modalidade
 *   3. Profissional
 *   4. Data
 *   5. Horário
 *   6. Confirmação (+ validação Home Care)
 *   7. Sucesso
 *
 * O backend é a autoridade final para validação no POST.
 * HOME_CARE exige endereço cadastrado (verificado na etapa 6).
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListServices,
  useListProfessionals,
  useListSlots,
  useListClients,
  useGetClientAddress,
  useCreateAppointment,
} from "@workspace/api-client-react";
import type { ServiceRow, ProfessionalRow } from "@workspace/api-client-react";
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
  CheckCircle2,
  ChevronLeft,
  Clock,
  Home,
  MapPin,
  User,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Modality = "IN_PERSON" | "HOME_CARE";

interface WizardState {
  step: Step;
  service: ServiceRow | null;
  modality: Modality | null;
  professional: ProfessionalRow | null;
  date: string; // YYYY-MM-DD
  startDatetime: string | null;
  notes: string;
  createdAppointmentId: string | null;
}

const INITIAL: WizardState = {
  step: 1,
  service: null,
  modality: null,
  professional: null,
  date: "",
  startDatetime: null,
  notes: "",
  createdAppointmentId: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<Step, string> = {
  1: "Serviço",
  2: "Modalidade",
  3: "Profissional",
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
  const total = 6; // etapas visíveis (7 = sucesso não conta como passo)
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

export default function ClientBook() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ── Dados remotos ────────────────────────────────────────────────────────
  const { data: servicesData, isLoading: svcLoading, isError: svcError } =
    useListServices();
  const { data: profsData, isLoading: profLoading, isError: profError } =
    useListProfessionals();
  const { data: clientsData } = useListClients();
  const clientId = clientsData?.clients?.[0]?.id ?? "";
  const { data: addrData } = useGetClientAddress(clientId, {
    query: { enabled: !!clientId },
  } as any);

  const slotsEnabled =
    state.step >= 5 &&
    !!state.professional &&
    !!state.service &&
    !!state.date;
  const { data: slotsData, isLoading: slotsLoading } = useListSlots(
    {
      professionalId: state.professional?.id ?? "",
      serviceId: state.service?.id ?? "",
      date: state.date,
      modality: state.modality ?? undefined,
    },
    { query: { enabled: slotsEnabled } } as any,
  );

  const createAppointment = useCreateAppointment();

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
    if (!state.service || !state.modality || !state.professional || !state.startDatetime)
      return;

    const payload: Parameters<typeof createAppointment.mutate>[0]["data"] = {
      serviceId: state.service.id,
      professionalId: state.professional.id,
      startDatetime: state.startDatetime,
      modality: state.modality,
      notes: state.notes.trim() || undefined,
    };

    if (state.modality === "HOME_CARE" && addrData?.address) {
      payload.addressId = addrData.address.id;
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
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Agendamento</h1>
          <p className="text-sm text-muted-foreground">
            Selecione serviço, profissional, data e horário
          </p>
        </div>

        {/* Progresso */}
        {state.step < 7 && <StepIndicator current={state.step} />}

        {/* ── ETAPA 1: Serviço ────────────────────────────────────────────── */}
        {state.step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                Selecione o Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              {svcLoading && (
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
              {servicesData && (
                <div className="space-y-2">
                  {servicesData.services
                    .filter((s) => s.status === "ACTIVE")
                    .map((svc) => (
                      <button
                        key={svc.id}
                        className={[
                          "w-full text-left rounded-md border p-4 transition-colors",
                          "hover:bg-muted/60",
                          state.service?.id === svc.id
                            ? "border-primary bg-primary/5"
                            : "",
                        ].join(" ")}
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            service: svc,
                            modality: null,
                            professional: null,
                            date: "",
                            startDatetime: null,
                          }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
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
                  {servicesData.services.filter((s) => s.status === "ACTIVE")
                    .length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum serviço disponível no momento.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  disabled={!state.service}
                  onClick={() => goTo(2)}
                >
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 2: Modalidade ─────────────────────────────────────────── */}
        {state.step === 2 && state.service && (
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
                  className={[
                    "w-full text-left rounded-md border p-4 flex items-center gap-3 transition-colors",
                    "hover:bg-muted/60",
                    state.modality === m ? "border-primary bg-primary/5" : "",
                  ].join(" ")}
                  onClick={() =>
                    setState((s) => ({ ...s, modality: m }))
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
                        ? "Atendimento no local do profissional"
                        : "Atendimento no seu endereço"}
                    </p>
                  </div>
                </button>
              ))}

              {/* Aviso HOME_CARE sem endereço */}
              {state.modality === "HOME_CARE" && !addrData?.address && (
                <Alert>
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      Você precisa de um endereço cadastrado para Home Care.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/client/addresses")}
                    >
                      Cadastrar endereço
                    </Button>
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
                    (state.modality === "HOME_CARE" && !addrData?.address)
                  }
                  onClick={() => goTo(3)}
                >
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 3: Profissional ───────────────────────────────────────── */}
        {state.step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Selecione o Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              )}
              {profError && (
                <Alert variant="destructive">
                  <AlertDescription>Erro ao carregar profissionais.</AlertDescription>
                </Alert>
              )}
              {profsData && (
                <div className="space-y-2">
                  {profsData.professionals
                    .filter((p) => p.status === "ACTIVE")
                    .map((prof) => (
                      <button
                        key={prof.id}
                        className={[
                          "w-full text-left rounded-md border p-4 flex items-center gap-3 transition-colors",
                          "hover:bg-muted/60",
                          state.professional?.id === prof.id
                            ? "border-primary bg-primary/5"
                            : "",
                        ].join(" ")}
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            professional: prof,
                            date: "",
                            startDatetime: null,
                          }))
                        }
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{prof.name}</p>
                          {prof.specialty && (
                            <p className="text-xs text-muted-foreground">
                              {prof.specialty}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  {profsData.professionals.filter((p) => p.status === "ACTIVE")
                    .length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum profissional disponível no momento.
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  disabled={!state.professional}
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
                <Button
                  disabled={!state.startDatetime}
                  onClick={() => goTo(6)}
                >
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
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">{state.service?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Modalidade</span>
                  <span className="font-medium">
                    {modalityLabel(state.modality!)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{state.professional?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Data e horário</span>
                  <span className="font-medium capitalize">
                    {state.startDatetime ? fmtDatetime(state.startDatetime) : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">
                    R${" "}
                    {Number(state.service?.price ?? 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
                {state.modality === "HOME_CARE" && addrData?.address && (
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">Endereço</span>
                    <span className="font-medium text-right">
                      {addrData.address.street}, {addrData.address.number}
                      <br />
                      {addrData.address.city}/{addrData.address.state}
                    </span>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input
                  id="notes"
                  value={state.notes}
                  onChange={(e) =>
                    setState((s) => ({ ...s, notes: e.target.value }))
                  }
                  placeholder="Alguma informação adicional para o profissional"
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
                  disabled={createAppointment.isPending}
                  onClick={handleConfirm}
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
                  Seu agendamento foi realizado com sucesso.
                </p>
              </div>

              {state.startDatetime && (
                <div className="rounded-md bg-muted p-4 text-sm text-left space-y-1">
                  <p>
                    <span className="text-muted-foreground">Serviço: </span>
                    <span className="font-medium">{state.service?.name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Profissional: </span>
                    <span className="font-medium">{state.professional?.name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Data: </span>
                    <span className="font-medium capitalize">
                      {fmtDatetime(state.startDatetime)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Modalidade: </span>
                    <span className="font-medium">
                      {modalityLabel(state.modality!)}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (state.createdAppointmentId) {
                      navigate(`/client/appointments/${state.createdAppointmentId}`);
                    } else {
                      navigate("/client/appointments");
                    }
                  }}
                >
                  Ver meus agendamentos
                </Button>
                <Button
                  onClick={() => {
                    setState(INITIAL);
                  }}
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
