/**
 * T-003 (F17.3) — Tela "Esqueci minha senha"
 *
 * Solicita o e-mail e chama POST /api/auth/forgot-password.
 * A resposta é sempre genérica — o backend não revela se o e-mail existe.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const ForgotSchema = z.object({
  email: z.string().min(1, "E-mail obrigatório.").email("E-mail inválido."),
});

type ForgotFormValues = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(ForgotSchema),
  });

  async function onSubmit(values: ForgotFormValues) {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ??
            `HTTP ${response.status}`,
        );
      }
      setSent(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erro ao solicitar recuperação.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe seu e-mail para receber as instruções
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <Alert data-testid="alert-forgot-sent">
              <AlertDescription>
                Se o e-mail estiver cadastrado, você receberá as instruções de
                recuperação em instantes. Verifique também a caixa de spam.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Voltar para o login</Link>
            </Button>
          </div>
        ) : (
          <>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="seu@email.com"
                  aria-invalid={!!errors.email}
                  data-testid="input-forgot-email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-forgot-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Enviando…
                  </span>
                ) : (
                  "Enviar instruções"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline underline-offset-4">
                  Voltar para o login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
