/**
 * T-012 — Perfil do Profissional
 *
 * Exibe dados do profissional (com nome, e-mail e telefone reais via JOIN com users),
 * disponibilidade, serviços vinculados, agendamentos e períodos bloqueados.
 */
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetProfessional,
  useUpdateProfessional,
  useListProfessionalAvailability,
  useListProfessionalServices,
  useListProfessionalBlockedPeriods,
  useListAppointments,
  useListServices,
  useAddProfessionalService,
  useRemoveProfessionalService,
} from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/status-badge";
import { ModalityBadge } from "@/components/admin/modality-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ArrowLeft, Calendar, Briefcase, Clock, Ban } from "lucide-react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmStatus, setConfirmStatus] = useState<"ACTIVE" | "INACTIVE" | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [confirmRemoveServiceId, setConfirmRemoveServiceId] = useState<string | null>(null);
  const [serviceActionError, setServiceActionError] = useState<string | null>(null);

  const profQ = useGetProfessional(id!);
  const availQ = useListProfessionalAvailability(id!);
  const psQ = useListProfessionalServices(id!);
  const apptQ = useListAppointments({ professionalId: id! });
  const blockedQ = useListProfessionalBlockedPeriods(id!);
  const svcsQ = useListServices();

  const { mutate: updateProf, isPending: isUpdating } = useUpdateProfessional();
  const { mutate: addService, isPending: isAddingService } = useAddProfessionalService();
  const { mutate: removeService, isPending: isRemovingService } = useRemoveProfessionalService();

  const serviceMap: Record<string, string> = {};
  (svcsQ.data?.services ?? []).forEach((s) => { serviceMap[s.id] = s.name; });

  // Serviços já vinculados (ativos) não podem ser vinculados novamente
  const linkedActiveServiceIds = new Set(
    (psQ.data?.professionalServices ?? []).filter((ps) => ps.active).map((ps) => ps.serviceId),
  );
  const availableServices = (svcsQ.data?.services ?? []).filter(
    (s) => s.status === "ACTIVE" && !linkedActiveServiceIds.has(s.id),
  );

  function handleAddService() {
    if (!selectedServiceId || linkedActiveServiceIds.has(selectedServiceId)) return;
    setServiceActionError(null);
    addService(
      { profId: id!, data: { serviceId: selectedServiceId } },
      {
        onSuccess: () => { setSelectedServiceId(""); psQ.refetch(); },
        onError: (err) =>
          setServiceActionError(err instanceof Error ? err.message : "Erro ao vincular serviço."),
      },
    );
  }

  function confirmRemoveService() {
    if (!confirmRemoveServiceId) return;
    setServiceActionError(null);
    removeService(
      { profId: id!, serviceId: confirmRemoveServiceId },
      {
        onSuccess: () => { setConfirmRemoveServiceId(null); psQ.refetch(); },
        onError: (err) => {
          setConfirmRemoveServiceId(null);
          setServiceActionError(err instanceof Error ? err.message : "Erro ao remover vínculo.");
        },
      },
    );
  }

  function confirmStatusChange() {
    if (!confirmStatus) return;
    updateProf(
      { id: id!, data: { status: confirmStatus } },
      {
        onSuccess: () => { profQ.refetch(); setConfirmStatus(null); },
        onError: () => setConfirmStatus(null),
      },
    );
  }

  if (profQ.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (profQ.isError) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link href="/admin/professionals">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <Alert variant="destructive">
            <AlertDescription>
              {profQ.error instanceof Error ? profQ.error.message : "Erro ao carregar profissional."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const prof = profQ.data?.professional;
  if (!prof) return null;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Link href="/admin/professionals">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {prof.name || "Perfil do Profissional"}
            </h1>
            <p className="text-xs text-muted-foreground">{prof.email}</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="blocked">Períodos Bloqueados</TabsTrigger>
          </TabsList>

          {/* Info */}
          <TabsContent value="info" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base">Dados</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={prof.status === "ACTIVE" ? "default" : "secondary"}>
                    {prof.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                  <Select
                    value={prof.status}
                    onValueChange={(v) => setConfirmStatus(v as "ACTIVE" | "INACTIVE")}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativar</SelectItem>
                      <SelectItem value="INACTIVE">Desativar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{prof.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p>{prof.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p>{prof.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Especialidade</p>
                    <p>{prof.specialty || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastrado em</p>
                    <p>{new Date(prof.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                {prof.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm bg-muted rounded p-2">{prof.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability */}
          <TabsContent value="availability" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Janelas de Disponibilidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (availQ.data?.availability ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {availQ.data?.availability.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-1 border-b last:border-0 text-sm">
                        <span className="font-medium w-10">{WEEKDAYS[a.weekday]}</span>
                        <span className="text-muted-foreground">{a.startTime} – {a.endTime}</span>
                        <Badge variant={a.active ? "default" : "secondary"} className="text-xs">
                          {a.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Serviços Vinculados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceActionError && (
                  <Alert variant="destructive">
                    <AlertDescription>{serviceActionError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedServiceId || undefined}
                    onValueChange={setSelectedServiceId}
                    disabled={isAddingService || svcsQ.isLoading || availableServices.length === 0}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-service-to-link">
                      <SelectValue
                        placeholder={
                          svcsQ.isLoading
                            ? "Carregando serviços..."
                            : availableServices.length === 0
                              ? "Nenhum serviço disponível para vincular"
                              : "Selecione um serviço para vincular"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddService}
                    disabled={!selectedServiceId || isAddingService}
                    data-testid="button-link-service"
                  >
                    {isAddingService ? "Vinculando..." : "Vincular"}
                  </Button>
                </div>
                {psQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (psQ.data?.professionalServices ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum serviço vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {psQ.data?.professionalServices.map((ps) => (
                      <div key={ps.id} className="flex items-center justify-between py-1 border-b last:border-0 text-sm gap-2">
                        <span>{serviceMap[ps.serviceId] || ps.serviceId.slice(0, 8) + "…"}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={ps.active ? "default" : "secondary"} className="text-xs">
                            {ps.active ? "Ativo" : "Inativo"}
                          </Badge>
                          {ps.active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={isRemovingService}
                              onClick={() => setConfirmRemoveServiceId(ps.serviceId)}
                              data-testid={`button-remove-service-${ps.serviceId}`}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments */}
          <TabsContent value="appointments" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {apptQ.isLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (apptQ.data?.appointments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {apptQ.data?.appointments.map((appt) => (
                      <div key={appt.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-2">
                        <div className="text-sm">
                          <p className="font-medium">
                            {new Date(appt.startDatetime).toLocaleDateString("pt-BR")}
                            {" "}{new Date(appt.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{appt.id.slice(0, 8)}…</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <ModalityBadge modality={appt.modality} />
                          <StatusBadge status={appt.status} />
                          <Link href={`/admin/appointments/${appt.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Periods */}
          <TabsContent value="blocked" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  Períodos Bloqueados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blockedQ.isLoading ? (
                  <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : blockedQ.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {blockedQ.error instanceof Error ? blockedQ.error.message : "Erro ao carregar períodos bloqueados."}
                    </AlertDescription>
                  </Alert>
                ) : (blockedQ.data?.blockedPeriods ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum período bloqueado cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {blockedQ.data?.blockedPeriods.map((bp) => (
                      <div key={bp.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-2">
                        <div className="text-sm">
                          <p className="font-medium">
                            {new Date(bp.startDatetime).toLocaleDateString("pt-BR")}
                            {" "}
                            {new Date(bp.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {" → "}
                            {new Date(bp.endDatetime).toLocaleDateString("pt-BR")}
                            {" "}
                            {new Date(bp.endDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {bp.reason && (
                            <p className="text-xs text-muted-foreground">{bp.reason}</p>
                          )}
                        </div>
                        <Badge variant={bp.status === "ACTIVE" ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {bp.status === "ACTIVE" ? "Ativo" : "Cancelado"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ConfirmDialog
          open={!!confirmStatus}
          onOpenChange={(open) => !open && setConfirmStatus(null)}
          title={confirmStatus === "INACTIVE" ? "Desativar profissional?" : "Ativar profissional?"}
          description={
            confirmStatus === "INACTIVE"
              ? "O profissional não ficará disponível para novos agendamentos."
              : "O profissional voltará a estar disponível para agendamentos."
          }
          confirmLabel={confirmStatus === "INACTIVE" ? "Desativar" : "Ativar"}
          onConfirm={confirmStatusChange}
          destructive={confirmStatus === "INACTIVE"}
        />

        <ConfirmDialog
          open={!!confirmRemoveServiceId}
          onOpenChange={(open) => !open && setConfirmRemoveServiceId(null)}
          title="Remover vínculo do serviço?"
          description={`O serviço "${confirmRemoveServiceId ? (serviceMap[confirmRemoveServiceId] ?? "selecionado") : ""}" deixará de ser oferecido por este profissional em novos agendamentos.`}
          confirmLabel="Remover"
          onConfirm={confirmRemoveService}
          destructive
        />
      </div>
    </AppLayout>
  );
}
