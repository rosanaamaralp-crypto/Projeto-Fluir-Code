/**
 * T-010 — Perfil do Cliente
 *
 * Exibe dados do cliente (com nome, e-mail e telefone reais via JOIN com users),
 * endereço e agendamentos.
 */
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetClient,
  useGetClientAddress,
  useListAppointments,
  useUpdateClient,
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
import { ArrowLeft, MapPin, Calendar, User } from "lucide-react";

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmStatus, setConfirmStatus] = useState<"ACTIVE" | "INACTIVE" | null>(null);

  const clientQ = useGetClient(id!);
  const addressQ = useGetClientAddress(id!);
  const apptQ = useListAppointments({ clientId: id! });
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();

  function handleStatusChange(newStatus: "ACTIVE" | "INACTIVE") {
    setConfirmStatus(newStatus);
  }

  function confirmStatusChange() {
    if (!confirmStatus) return;
    updateClient(
      { id: id!, data: { status: confirmStatus } },
      {
        onSuccess: () => {
          clientQ.refetch();
          setConfirmStatus(null);
        },
        onError: () => setConfirmStatus(null),
      },
    );
  }

  if (clientQ.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (clientQ.isError) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link href="/admin/clients">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <Alert variant="destructive">
            <AlertDescription>
              {clientQ.error instanceof Error ? clientQ.error.message : "Erro ao carregar cliente."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const client = clientQ.data?.client;
  if (!client) return null;

  const address = addressQ.data?.address;
  const appointments = apptQ.data?.appointments ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/clients">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <User className="h-5 w-5" />
              {client.name || "Perfil do Cliente"}
            </h1>
            <p className="text-xs text-muted-foreground">{client.email}</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="appointments">
              Agendamentos {apptQ.data ? `(${appointments.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Info */}
          <TabsContent value="info" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base">Dados do Cliente</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
                    {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                  <Select
                    value={client.status}
                    onValueChange={(v) => handleStatusChange(v as "ACTIVE" | "INACTIVE")}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
                    <p className="font-medium">{client.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p>{client.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p>{client.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                    <p>
                      {client.birthDate
                        ? new Date(client.birthDate + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastrado em</p>
                    <p>{new Date(client.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atualizado em</p>
                    <p>{new Date(client.updatedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                {client.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted rounded p-2">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address */}
          <TabsContent value="address" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addressQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : address ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Logradouro</p><p>{address.street}, {address.number}</p></div>
                    {address.complement && <div><p className="text-xs text-muted-foreground">Complemento</p><p>{address.complement}</p></div>}
                    <div><p className="text-xs text-muted-foreground">Bairro</p><p>{address.neighborhood}</p></div>
                    <div><p className="text-xs text-muted-foreground">Cidade/UF</p><p>{address.city} — {address.state}</p></div>
                    <div><p className="text-xs text-muted-foreground">CEP</p><p>{address.postalCode}</p></div>
                    {address.reference && <div><p className="text-xs text-muted-foreground">Referência</p><p>{address.reference}</p></div>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
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
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between py-2 border-b last:border-0 gap-2"
                      >
                        <div className="text-sm">
                          <p className="font-medium">
                            {new Date(appt.startDatetime).toLocaleDateString("pt-BR")}
                            {" "}
                            {new Date(appt.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={!!confirmStatus}
          onOpenChange={(open) => !open && setConfirmStatus(null)}
          title={confirmStatus === "INACTIVE" ? "Desativar cliente?" : "Ativar cliente?"}
          description={
            confirmStatus === "INACTIVE"
              ? "O cliente não conseguirá fazer login após ser desativado."
              : "O cliente voltará a ter acesso ao sistema."
          }
          confirmLabel={confirmStatus === "INACTIVE" ? "Desativar" : "Ativar"}
          onConfirm={confirmStatusChange}
          destructive={confirmStatus === "INACTIVE"}
        />
      </div>
    </AppLayout>
  );
}
