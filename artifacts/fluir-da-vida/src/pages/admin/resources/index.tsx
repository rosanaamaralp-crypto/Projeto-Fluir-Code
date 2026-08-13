/**
 * T-015 — Recursos
 *
 * Lista todos os recursos (macas, salas, equipamentos).
 * ADMIN vê ativos e inativos. Recursos possuem nome.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListResources, useCreateResource } from "@workspace/api-client-react";
import type { ResourceRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { Plus, RefreshCw, Loader2 } from "lucide-react";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  MASSAGE_TABLE: "Maca",
  ROOM: "Sala",
  EQUIPMENT: "Equipamento",
  OTHER: "Outro",
};

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao cadastrar recurso.";
}

export default function AdminResources() {
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "MASSAGE_TABLE" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useListResources();
  const { mutate: createResource, isPending: isCreating, isError: createError, error: createErr } = useCreateResource();

  const filtered = statusFilter
    ? (data?.resources ?? []).filter((r) => r.status === statusFilter)
    : (data?.resources ?? []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Nome deve ter pelo menos 2 caracteres.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createResource(
      { data: { name: form.name.trim(), type: form.type } },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({ name: "", type: "MASSAGE_TABLE" });
          refetch();
        },
      },
    );
  }

  const columns: Column<ResourceRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {RESOURCE_TYPE_LABELS[row.type] ?? row.type}
        </Badge>
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
        <Link href={`/admin/resources/${row.id}`}>
          <Button variant="ghost" size="sm">Detalhes</Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recursos</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de macas, salas e equipamentos</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Novo Recurso
          </Button>
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
              <span>{error instanceof Error ? error.message : "Erro ao carregar recursos."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">Tentar novamente</button>
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyTitle="Nenhum recurso encontrado"
          emptyDescription="Cadastre o primeiro recurso usando o botão acima."
        />

        {/* Modal de criação */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Novo Recurso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(createErr)}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Label htmlFor="r-name">Nome *</Label>
                <Input
                  id="r-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={isCreating}
                  placeholder="Ex: Maca 1"
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-type">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger id="r-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASSAGE_TABLE">Maca</SelectItem>
                    <SelectItem value="ROOM">Sala</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipamento</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>Cancelar</Button>
                <Button type="submit" disabled={isCreating} className="gap-2">
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
