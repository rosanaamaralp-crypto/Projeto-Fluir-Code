/**
 * T-018 — Auditoria
 *
 * Lista paginada de audit logs com filtros server-side.
 * Auditoria é gerada pelo backend automaticamente.
 */
import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import type { ListAuditLogsParams, AuditLogRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { RefreshCw } from "lucide-react";

const LIMIT = 20;

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<ListAuditLogsParams>({ page: 1, limit: LIMIT });

  const { data, isLoading, isError, error, refetch } = useListAuditLogs(applied);

  function handleFilter() {
    const params: ListAuditLogsParams = {
      page: 1,
      limit: LIMIT,
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      userId: userId || undefined,
    };
    setPage(1);
    setApplied(params);
  }

  function handleClear() {
    setAction("");
    setEntityType("");
    setEntityId("");
    setUserId("");
    setPage(1);
    setApplied({ page: 1, limit: LIMIT });
  }

  function handlePageChange(p: number) {
    setPage(p);
    setApplied((prev) => ({ ...prev, page: p }));
  }

  const columns: Column<AuditLogRow>[] = [
    {
      key: "createdAt",
      header: "Data/Hora",
      cell: (row) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {new Date(row.createdAt).toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "action",
      header: "Ação",
      cell: (row) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.action}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Entidade",
      cell: (row) => <span className="text-sm">{row.entityType}</span>,
    },
    {
      key: "entityId",
      header: "ID da Entidade",
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.entityId.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: "userId",
      header: "Usuário",
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.userId.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.ipAddress ?? "—"}</span>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Registro de todas as ações realizadas no sistema
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-1 self-start">
            <RefreshCw className="h-3 w-3" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ação</label>
                <Input
                  placeholder="Ex: APPOINTMENT_CREATED"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Entidade</label>
                <Input
                  placeholder="Ex: appointments"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ID da Entidade</label>
                <Input
                  placeholder="UUID"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ID do Usuário</label>
                <Input
                  placeholder="UUID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleFilter}>Filtrar</Button>
              <Button size="sm" variant="outline" onClick={handleClear}>Limpar</Button>
            </div>
          </CardContent>
        </Card>

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error instanceof Error ? error.message : "Erro ao carregar auditoria."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          emptyTitle="Nenhum registro de auditoria"
          emptyDescription="Nenhuma ação foi registrada para os filtros selecionados."
        />
      </div>
    </AppLayout>
  );
}
