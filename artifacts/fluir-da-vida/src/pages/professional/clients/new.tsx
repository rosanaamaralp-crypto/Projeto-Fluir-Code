/**
 * F20 — Novo Cliente (Profissional)
 *
 * Reutiliza o formulário de cadastro de cliente do ADMIN (T-009).
 * POST /api/clients — F20: ADMIN e PROFESSIONAL podem cadastrar.
 * O backend registra o criador (audit log), o que estabelece o
 * relacionamento profissional → cliente usado pela F19.
 * Após salvar, o profissional pode ir direto para o agendamento.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useCreateClient,
  getListMyProfessionalClientsQueryKey,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao cadastrar cliente.";
}

export default function ProfessionalClientNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { mutate, isPending, isError, error } = useCreateClient();

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    birthDate: "",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Nome deve ter pelo menos 2 caracteres.";
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "E-mail inválido.";
    if (form.password.length < 8) errs.password = "Senha deve ter pelo menos 8 caracteres.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    mutate(
      {
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: (data) => {
          // F20: invalida a lista "Meus Clientes" para que o novo cliente
          // apareça imediatamente (inclusive na pré-seleção do wizard).
          void queryClient.invalidateQueries({
            queryKey: getListMyProfessionalClientsQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getListClientsQueryKey(),
          });
          setCreatedId(data.client.id);
          setCreatedName(data.user.name ?? form.name.trim());
        },
      },
    );
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  // ── Sucesso ──────────────────────────────────────────────────────────────
  if (createdId) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-xl">
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-semibold">Cliente cadastrado!</p>
                <p className="text-sm text-muted-foreground">
                  {createdName} já está disponível para agendamento.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={() => navigate(`/professional/book?clientId=${createdId}`)}>
                  Novo Agendamento
                </Button>
                <Button variant="outline" onClick={() => navigate(`/professional/clients/${createdId}`)}>
                  Ver Cliente
                </Button>
                <Button variant="ghost" onClick={() => navigate("/professional/clients")}>
                  Meus Clientes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Link href="/professional/clients">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Novo Cliente</h1>
            <p className="text-sm text-muted-foreground">Cadastre um cliente para seus atendimentos</p>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nome do cliente"
                  disabled={isPending}
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={isPending}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={isPending}
                />
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Informações adicionais sobre o cliente"
                  rows={3}
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? "Cadastrando…" : "Cadastrar Cliente"}
                </Button>
                <Link href="/professional/clients">
                  <Button type="button" variant="outline" disabled={isPending}>
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
