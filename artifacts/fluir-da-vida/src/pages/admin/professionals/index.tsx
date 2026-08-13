/**
 * T-011 — Profissionais
 *
 * Lista todos os profissionais (ADMIN vê ativos e inativos) com nome e e-mail reais.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useListProfessionals, useCreateProfessional } from "@workspace/api-client-react";
import type { ProfessionalRow } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { Plus, RefreshCw, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao cadastrar profissional.";
}

export default function AdminProfessionals() {
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", specialty: "", bio: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useListProfessionals();
  const { mutate: createProf, isPending: isCreating, isError: createError, error: createErr } = useCreateProfessional();

  const filtered = statusFilter
    ? (data?.professionals ?? []).filter((p) => p.status === statusFilter)
    : (data?.professionals ?? []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Nome deve ter pelo menos 2 caracteres.";
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "E-mail inválido.";
    if (form.password.length < 8) errs.password = "Senha deve ter pelo menos 8 caracteres.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createProf(
      {
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || undefined,
          specialty: form.specialty || undefined,
          bio: form.bio || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({ name: "", email: "", password: "", phone: "", specialty: "", bio: "" });
          refetch();
        },
      },
    );
  }

  const columns: Column<ProfessionalRow>[] = [
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
      key: "specialty",
      header: "Especialidade",
      cell: (row) => (
        <span className="text-sm">{row.specialty || <span className="text-muted-foreground italic">—</span>}</span>
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
        <Link href={`/admin/professionals/${row.id}`}>
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
            <h1 className="text-2xl font-semibold tracking-tight">Profissionais</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de profissionais</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Novo Profissional
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
              <span>{error instanceof Error ? error.message : "Erro ao carregar profissionais."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">Tentar novamente</button>
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyTitle="Nenhum profissional encontrado"
          emptyDescription="Cadastre o primeiro profissional usando o botão acima."
        />

        {/* Modal de criação */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Profissional</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(createErr)}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Label htmlFor="p-name">Nome *</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} disabled={isCreating} />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-email">E-mail *</Label>
                <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} disabled={isCreating} />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-pw">Senha *</Label>
                <Input id="p-pw" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} disabled={isCreating} />
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-phone">Telefone</Label>
                <Input id="p-phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} disabled={isCreating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-spec">Especialidade</Label>
                <Input id="p-spec" value={form.specialty} onChange={(e) => setForm(f => ({ ...f, specialty: e.target.value }))} disabled={isCreating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-bio">Bio</Label>
                <Textarea id="p-bio" value={form.bio} rows={2} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} disabled={isCreating} />
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
