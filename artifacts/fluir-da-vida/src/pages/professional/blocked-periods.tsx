/**
 * T-025 — Bloqueios (Profissional)
 *
 * Doc 15 §31: visualizar e, se autorizado, criar/remover bloqueios.
 * Doc 16 §27: GET/POST /professionals/:profId/blocked-periods
 *              DELETE /blocked-periods/:id
 *
 * RN-025: bloqueios tornam o profissional indisponível.
 * RN-026: bloqueio impede novos agendamentos sobrepostos.
 * Ações ADMIN-only (PATCH) não são expostas ao profissional.
 * Confirmação obrigatória antes de remover (Doc autorização F14).
 */
import { useState } from "react";
import {
  useListProfessionalBlockedPeriods,
  useCreateProfessionalBlockedPeriod,
  useDeleteProfessionalBlockedPeriod,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Ban, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface NewBlockedPeriod {
  startDatetime: string;
  endDatetime: string;
  reason: string;
}

function localDatetimeInputValue(date = new Date()) {
  // Retorna string no formato YYYY-MM-DDTHH:MM para uso em input[type=datetime-local]
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DEFAULT_FORM: NewBlockedPeriod = {
  startDatetime: localDatetimeInputValue(),
  endDatetime: localDatetimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  reason: "",
};

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ProfessionalBlockedPeriods() {
  const queryClient = useQueryClient();
  const { professional, isLoading: profLoading, isError: profError } = useProfessionalSelf();
  const profId = professional?.id;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewBlockedPeriod>(DEFAULT_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    data,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
    refetch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useListProfessionalBlockedPeriods(profId ?? "", { query: { enabled: !!profId } } as any);

  const createMutation = useCreateProfessionalBlockedPeriod({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listProfessionalBlockedPeriods"] });
        setShowForm(false);
        setForm(DEFAULT_FORM);
        toast({ title: "Bloqueio criado com sucesso." });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao criar bloqueio.",
        });
      },
    },
  });

  const deleteMutation = useDeleteProfessionalBlockedPeriod({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listProfessionalBlockedPeriods"] });
        setConfirmDeleteId(null);
        toast({ title: "Bloqueio removido." });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao remover bloqueio.",
        });
      },
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profId) return;
    // Converter datetime-local para ISO 8601 com offset
    const start = new Date(form.startDatetime).toISOString();
    const end = new Date(form.endDatetime).toISOString();
    createMutation.mutate({
      profId,
      data: {
        startDatetime: start,
        endDatetime: end,
        ...(form.reason ? { reason: form.reason } : {}),
      },
    });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate({ id });
  }

  const isLoading = profLoading || listLoading;
  const isError = profError || listError;

  // Mostrar apenas bloqueios ACTIVE (CANCELLED = removidos)
  const activePeriods = (data?.blockedPeriods ?? []).filter(
    (bp) => bp.status === "ACTIVE",
  ).sort(
    (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime(),
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Ban className="h-6 w-6" />
              Bloqueios
            </h1>
            <p className="text-sm text-muted-foreground">
              Períodos em que você não estará disponível para atendimentos
            </p>
          </div>
          {profId && (
            <Button onClick={() => setShowForm((v) => !v)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Novo Bloqueio
            </Button>
          )}
        </div>

        {/* Formulário de novo bloqueio */}
        {showForm && profId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo Período Bloqueado</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="datetime-local"
                      value={form.startDatetime}
                      onChange={(e) => setForm((f) => ({ ...f, startDatetime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="datetime-local"
                      value={form.endDatetime}
                      onChange={(e) => setForm((f) => ({ ...f, endDatetime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    placeholder="Ex: férias, compromisso pessoal…"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    rows={2}
                    maxLength={2000}
                  />
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

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {listErr instanceof Error ? listErr.message : "Erro ao carregar bloqueios."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {!isLoading && !isError && activePeriods.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum período bloqueado ativo. Use "Novo Bloqueio" para bloquear um período.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && activePeriods.length > 0 && (
          <div className="space-y-3">
            {activePeriods.map((bp) => (
              <Card key={bp.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">Ativo</Badge>
                        <span className="text-sm font-medium">
                          {formatDatetime(bp.startDatetime)} → {formatDatetime(bp.endDatetime)}
                        </span>
                      </div>
                      {bp.reason && (
                        <p className="text-xs text-muted-foreground truncate">{bp.reason}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {confirmDeleteId === bp.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-destructive">Remover?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(bp.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Sim
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Não
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(bp.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
