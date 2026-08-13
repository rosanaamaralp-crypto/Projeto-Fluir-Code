/**
 * T-012 — Perfil do Profissional
 *
 * Exibe dados do profissional, disponibilidade, serviços vinculados e agendamentos.
 * LIMITAÇÃO: nome/email do profissional não retornados por GET /api/professionals/:id
 * (ficam na tabela users).
 */
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetProfessional,
  useUpdateProfessional,
  useListProfessionalAvailability,
  useListProfessionalServices,
  useListAppointments,
  useListServices,
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
import { ArrowLeft, Calendar, Briefcase, Clock } from "lucide-react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmStatus, setConfirmStatus] = useState<"ACTIVE" | "INACTIVE" | null>(null);

  const profQ = useGetProfessional(id!);
  const availQ = useListProfessionalAvailability(id!);
  const psQ = useListProfessionalServices(id!);
  const apptQ = useListAppointments({ professionalId: id! });
  const svcsQ = useListServices();

  const { mutate: updateProf, isPending: isUpdating } = useUpdateProfessional();

  // Build service name map
  const serviceMap: Record<string, string> = {};
  (svcsQ.data?.services ?? []).forEach((s) => { serviceMap[s.id] = s.name; });

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
              Perfil do Profissional
            </h1>
            <p className="text-xs font-mono text-muted-foreground">{prof.id}</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
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
                    <p className="text-xs text-muted-foreground">ID do Usuário</p>
                    <p className="font-mono text-xs">{prof.userId}</p>
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
              <CardContent>
                {psQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (psQ.data?.professionalServices ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum serviço vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {psQ.data?.professionalServices.map((ps) => (
                      <div key={ps.id} className="flex items-center justify-between py-1 border-b last:border-0 text-sm">
                        <span>{serviceMap[ps.serviceId] || ps.serviceId.slice(0, 8) + "…"}</span>
                        <Badge variant={ps.active ? "default" : "secondary"} className="text-xs">
                          {ps.active ? "Ativo" : "Inativo"}
                        </Badge>
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
      </div>
    </AppLayout>
  );
}
