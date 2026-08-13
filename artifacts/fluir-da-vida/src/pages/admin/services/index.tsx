/**
 * T-013 — Serviços
 *
 * Lista todos os serviços (ADMIN vê ativos e inativos).
 * Serviços possuem nome — sem limitação de API para este módulo.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListServices, useUpdateService } from "@workspace/api-client-react";
import type { ServiceRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Plus, RefreshCw } from "lucide-react";

export default function AdminServices() {
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmToggle, setConfirmToggle] = useState<ServiceRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useListServices();
  const { mutate: updateService, isPending } = useUpdateService();

  const filtered = statusFilter
    ? (data?.services ?? []).filter((s) => s.status === statusFilter)
    : (data?.services ?? []);

  function handleToggle(svc: ServiceRow) {
    setConfirmToggle(svc);
  }

  function confirmToggleStatus() {
    if (!confirmToggle) return;
    const newStatus = confirmToggle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateService(
      { id: confirmToggle.id, data: { status: newStatus } },
      {
        onSuccess: () => { refetch(); setConfirmToggle(null); },
        onError: () => setConfirmToggle(null),
      },
    );
  }

  const columns: Column<ServiceRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "modalities",
      header: "Modalidades",
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.allowedModalities === "BOTH"
            ? "Presencial + Home Care"
            : row.allowedModalities === "HOME_CARE"
            ? "Home Care"
            : "Presencial"}
        </Badge>
      ),
    },
    {
      key: "duration",
      header: "Duração",
      cell: (row) => <span className="text-sm">{row.durationMinutes} min</span>,
    },
    {
      key: "price",
      header: "Preço",
      cell: (row) => (
        <span className="text-sm font-medium">
          {Number(row.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
          {row.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex gap-1">
          <Link href={`/admin/services/${row.id}`}>
            <Button variant="ghost" size="sm">Ver</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggle(row)}
            disabled={isPending}
            className={row.status === "ACTIVE" ? "text-destructive hover:text-destructive" : ""}
          >
            {row.status === "ACTIVE" ? "Desativar" : "Ativar"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de serviços oferecidos</p>
          </div>
          <Link href="/admin/services/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 w-48">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" />Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error instanceof Error ? error.message : "Erro ao carregar serviços."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">Tentar novamente</button>
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyTitle="Nenhum serviço encontrado"
          emptyDescription="Cadastre o primeiro serviço usando o botão acima."
        />

        <ConfirmDialog
          open={!!confirmToggle}
          onOpenChange={(open) => !open && setConfirmToggle(null)}
          title={confirmToggle?.status === "ACTIVE" ? "Desativar serviço?" : "Ativar serviço?"}
          description={
            confirmToggle?.status === "ACTIVE"
              ? `"${confirmToggle.name}" não estará disponível para novos agendamentos.`
              : `"${confirmToggle?.name}" voltará a estar disponível.`
          }
          confirmLabel={confirmToggle?.status === "ACTIVE" ? "Desativar" : "Ativar"}
          onConfirm={confirmToggleStatus}
          destructive={confirmToggle?.status === "ACTIVE"}
        />
      </div>
    </AppLayout>
  );
}
