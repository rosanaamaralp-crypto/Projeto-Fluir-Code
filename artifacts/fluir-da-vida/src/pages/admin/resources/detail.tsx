/**
 * T-016 — Detalhes da Maca (Recurso)
 *
 * Exibe dados do recurso, permite editar nome/tipo e desativar (soft delete).
 */
import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useGetResource, useUpdateResource, useDeleteResource } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ArrowLeft, BedDouble, Loader2 } from "lucide-react";

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
  return "Erro ao atualizar recurso.";
}

export default function AdminResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resourceQ = useGetResource(id!);
  const { mutate: updateResource, isPending: isUpdating, isError: updateError, error: updateErr } = useUpdateResource();
  const { mutate: deleteResource, isPending: isDeleting } = useDeleteResource();

  const resource = resourceQ.data?.resource;

  function startEditing() {
    if (resource) {
      setForm({ name: resource.name, type: resource.type });
      setEditing(true);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Nome deve ter pelo menos 2 caracteres.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    updateResource(
      { id: id!, data: { name: form.name.trim(), type: form.type } },
      {
        onSuccess: () => { setEditing(false); resourceQ.refetch(); },
      },
    );
  }

  function handleDeactivate() {
    deleteResource(
      { id: id! } as { id: string },
      {
        onSuccess: () => navigate("/admin/resources"),
      },
    );
  }

  if (resourceQ.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-lg">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (resourceQ.isError || !resource) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link href="/admin/resources">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <Alert variant="destructive">
            <AlertDescription>
              {resourceQ.error instanceof Error ? resourceQ.error.message : "Recurso não encontrado."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center gap-3">
          <Link href="/admin/resources">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              {resource.name}
            </h1>
            <p className="text-xs font-mono text-muted-foreground">{resource.id}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <CardTitle className="text-base">Dados do Recurso</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={resource.status === "ACTIVE" ? "default" : "secondary"}>
                {resource.status === "ACTIVE" ? "Ativo" : "Inativo"}
              </Badge>
              {!editing && (
                <Button size="sm" variant="outline" onClick={startEditing} disabled={resource.status === "INACTIVE"}>
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {updateError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{getErrorMessage(updateErr)}</AlertDescription>
              </Alert>
            )}

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="r-name">Nome *</Label>
                  <Input
                    id="r-name"
                    value={form.name}
                    onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((f) => ({ ...f, name: "" })); }}
                    disabled={isUpdating}
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
                <div className="flex gap-2">
                  <Button type="submit" disabled={isUpdating} className="gap-2">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={isUpdating}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{resource.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p>{RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p>{new Date(resource.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Atualizado em</p>
                  <p>{new Date(resource.updatedAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ação destrutiva */}
        {resource.status === "ACTIVE" && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Desativar recurso</p>
                  <p className="text-xs text-muted-foreground">
                    O recurso não ficará disponível para novos agendamentos.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeactivate(true)}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Desativar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ConfirmDialog
          open={confirmDeactivate}
          onOpenChange={setConfirmDeactivate}
          title="Desativar recurso?"
          description={`"${resource.name}" não estará disponível para agendamentos presenciais. Esta ação pode ser revertida via API.`}
          confirmLabel="Desativar"
          onConfirm={handleDeactivate}
          destructive
        />
      </div>
    </AppLayout>
  );
}
