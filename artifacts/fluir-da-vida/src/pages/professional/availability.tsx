/**
 * T-024 — Disponibilidade (Profissional)
 *
 * Doc 15 §30: profissional configura sua disponibilidade conforme permissões.
 * Doc 16 §25-26: GET/POST /professionals/:profId/availability
 *                PUT /professionals/:profId/availability/:id
 *                DELETE /professionals/:profId/availability/:id
 *
 * RN-024: profissional só recebe atendimentos dentro de sua disponibilidade.
 * O profissional só pode manipular SUA PRÓPRIA disponibilidade (ownership verificado no backend).
 */
import { useState } from "react";
import {
  useListProfessionalAvailability,
  useCreateProfessionalAvailability,
  useUpdateProfessionalAvailability,
  useDeleteProfessionalAvailability,
} from "@workspace/api-client-react";
import { useProfessionalSelf } from "@/hooks/use-professional-self";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface AvailabilityForm {
  weekday: string;
  startTime: string;
  endTime: string;
}

const DEFAULT_FORM: AvailabilityForm = {
  weekday: "1",
  startTime: "08:00",
  endTime: "18:00",
};

export default function ProfessionalAvailability() {
  const queryClient = useQueryClient();
  const { professional, isLoading: profLoading, isError: profError } = useProfessionalSelf();
  const profId = professional?.id;

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AvailabilityForm>(DEFAULT_FORM);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AvailabilityForm>(DEFAULT_FORM);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
    refetch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useListProfessionalAvailability(profId ?? "", { query: { enabled: !!profId } } as any);

  const createMutation = useCreateProfessionalAvailability({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listProfessionalAvailability"] });
        setShowForm(false);
        setForm(DEFAULT_FORM);
        toast({ title: "Disponibilidade adicionada com sucesso." });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao adicionar disponibilidade.",
        });
      },
    },
  });

  const updateMutation = useUpdateProfessionalAvailability({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listProfessionalAvailability"] });
        setEditingId(null);
        setEditForm(DEFAULT_FORM);
        toast({ title: "Disponibilidade atualizada com sucesso." });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao atualizar disponibilidade.",
        });
      },
    },
  });

  const deleteMutation = useDeleteProfessionalAvailability({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listProfessionalAvailability"] });
        setDeletingId(null);
        toast({ title: "Disponibilidade removida." });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao remover disponibilidade.",
        });
      },
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profId) return;
    createMutation.mutate({
      profId,
      data: {
        weekday: parseInt(form.weekday, 10),
        startTime: form.startTime,
        endTime: form.endTime,
      },
    });
  }

  function handleEditClick(avail: { id: string; weekday: number; startTime: string; endTime: string }) {
    setShowForm(false);
    setDeletingId(null);
    setEditingId(avail.id);
    setEditForm({
      weekday: String(avail.weekday),
      startTime: avail.startTime,
      endTime: avail.endTime,
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!profId || !editingId) return;
    updateMutation.mutate({
      profId,
      id: editingId,
      data: {
        weekday: parseInt(editForm.weekday, 10),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      },
    });
  }

  function handleDelete(id: string) {
    if (!profId) return;
    deleteMutation.mutate({ profId, id });
  }

  const isLoading = profLoading || listLoading;
  const isError = profError || listError;

  const availability = data?.availability ?? [];
  const sorted = [...availability].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Disponibilidade
            </h1>
            <p className="text-sm text-muted-foreground">
              Seus horários de atendimento por dia da semana
            </p>
          </div>
          {profId && !editingId && (
            <Button onClick={() => setShowForm((v) => !v)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Formulário de nova disponibilidade */}
        {showForm && profId && !editingId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select
                    value={form.weekday}
                    onValueChange={(v) => setForm((f) => ({ ...f, weekday: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando…" : "Salvar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Formulário de edição de disponibilidade */}
        {editingId && profId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editar Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select
                    value={editForm.weekday}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, weekday: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setEditingId(null); setEditForm(DEFAULT_FORM); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {listErr instanceof Error ? listErr.message : "Erro ao carregar disponibilidade."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {!isLoading && !isError && sorted.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma janela de disponibilidade cadastrada. Use "Adicionar" para configurar seus horários.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && sorted.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left font-medium">Dia</th>
                      <th className="py-3 px-4 text-left font-medium">Início</th>
                      <th className="py-3 px-4 text-left font-medium">Fim</th>
                      <th className="py-3 px-4 text-left font-medium">Status</th>
                      <th className="py-3 px-4 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((avail, idx) => (
                      <tr
                        key={avail.id}
                        className={[
                          idx !== sorted.length - 1 ? "border-b" : "",
                          editingId === avail.id ? "bg-muted/30" : "",
                        ].join(" ")}
                      >
                        <td className="py-3 px-4 font-medium">
                          {WEEKDAYS[avail.weekday] ?? avail.weekday}
                        </td>
                        <td className="py-3 px-4">{avail.startTime}</td>
                        <td className="py-3 px-4">{avail.endTime}</td>
                        <td className="py-3 px-4">
                          <Badge variant={avail.active ? "default" : "secondary"}>
                            {avail.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {deletingId === avail.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-destructive">Remover?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(avail.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Sim
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingId(null)}
                              >
                                Não
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(avail)}
                                disabled={!!editingId}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingId(avail.id)}
                                disabled={!!editingId}
                                className="text-destructive hover:text-destructive"
                                title="Remover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
