/**
 * T-014 — Cadastro de Serviço
 *
 * Cria um novo serviço. POST /api/services — ADMIN only.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateService } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as { error?: { message?: string } }).error;
    return e?.message ?? "Erro desconhecido.";
  }
  if (err instanceof Error) return err.message;
  return "Erro ao cadastrar serviço.";
}

export default function AdminServiceNew() {
  const [, navigate] = useLocation();
  const { mutate, isPending, isError, error } = useCreateService();

  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: "",
    price: "",
    allowedModalities: "BOTH",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Nome deve ter pelo menos 2 caracteres.";
    const dur = Number(form.durationMinutes);
    if (!form.durationMinutes || isNaN(dur) || dur <= 0 || !Number.isInteger(dur))
      errs.durationMinutes = "Duração deve ser um número inteiro positivo (em minutos).";
    const price = Number(form.price);
    if (!form.price || isNaN(price) || price < 0)
      errs.price = "Preço deve ser um valor não-negativo.";
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
          description: form.description || undefined,
          durationMinutes: Number(form.durationMinutes),
          price: Number(form.price),
          allowedModalities: form.allowedModalities,
        },
      },
      {
        onSuccess: (data) => {
          navigate(`/admin/services`);
          void data;
        },
      },
    );
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Link href="/admin/services">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Novo Serviço</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados do serviço</p>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="svc-name">Nome *</Label>
                <Input id="svc-name" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={isPending} placeholder="Ex: Massagem Relaxante" />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="svc-desc">Descrição</Label>
                <Textarea id="svc-desc" value={form.description} onChange={(e) => set("description", e.target.value)} disabled={isPending} rows={3} placeholder="Descrição do serviço (opcional)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="svc-dur">Duração (min) *</Label>
                  <Input id="svc-dur" type="number" min={1} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} disabled={isPending} placeholder="60" />
                  {fieldErrors.durationMinutes && <p className="text-xs text-destructive">{fieldErrors.durationMinutes}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="svc-price">Preço (R$) *</Label>
                  <Input id="svc-price" type="number" min={0} step={0.01} value={form.price} onChange={(e) => set("price", e.target.value)} disabled={isPending} placeholder="120.00" />
                  {fieldErrors.price && <p className="text-xs text-destructive">{fieldErrors.price}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="svc-mod">Modalidades *</Label>
                <Select value={form.allowedModalities} onValueChange={(v) => set("allowedModalities", v)}>
                  <SelectTrigger id="svc-mod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">Presencial + Home Care</SelectItem>
                    <SelectItem value="IN_PERSON">Somente Presencial</SelectItem>
                    <SelectItem value="HOME_CARE">Somente Home Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? "Cadastrando…" : "Cadastrar Serviço"}
                </Button>
                <Link href="/admin/services">
                  <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
