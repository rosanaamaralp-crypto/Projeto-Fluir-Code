/**
 * T-008 — Clientes
 *
 * Lista todos os clientes (ADMIN) com nome e e-mail reais via JOIN com users.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListClients } from "@workspace/api-client-react";
import type { ClientRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { Plus, RefreshCw } from "lucide-react";

export default function AdminClients() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading, isError, error, refetch } = useListClients();

  const filtered = statusFilter
    ? (data?.clients ?? []).filter((c) => c.status === statusFilter)
    : (data?.clients ?? []);

  const columns: Column<ClientRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (row) => (
        <span className="text-sm font-medium">{row.name || <span className="text-muted-foreground italic">—</span>}</span>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email || "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      cell: (row) => (
        <span className="text-sm">{row.phone || <span className="text-muted-foreground">—</span>}</span>
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
      key: "createdAt",
      header: "Criado em",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Link href={`/admin/clients/${row.id}`}>
          <Button variant="ghost" size="sm">Ver perfil</Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de clientes cadastrados
            </p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </Link>
        </div>

        {/* Filtros client-side por status */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 w-48">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error instanceof Error ? error.message : "Erro ao carregar clientes."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyTitle="Nenhum cliente encontrado"
          emptyDescription="Cadastre o primeiro cliente usando o botão acima."
        />
      </div>
    </AppLayout>
  );
}
