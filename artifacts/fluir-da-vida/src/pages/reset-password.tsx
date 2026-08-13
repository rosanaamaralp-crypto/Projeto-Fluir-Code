/**
 * T-003 (F17.3) — Tela "Definir nova senha"
 *
 * Lê o token da querystring (?token=...) e chama POST /api/auth/reset-password.
 * Token inválido/expirado → mensagem clara com link para nova solicitação.
 */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const ResetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres.")
      .max(128),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof ResetSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // wouter não expõe querystring — ler direto de window.location
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(ResetSchema),
  });

  async function onSubmit(values: ResetFormValues) {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ??
            `HTTP ${response.status}`,
        );
      }
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erro ao redefinir a senha.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Definir nova senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Link inválido: token de recuperação ausente.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Solicitar novo link</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <Alert data-testid="alert-reset-done">
              <AlertDescription>
                Senha redefinida com sucesso. Faça login com a nova senha.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={() => navigate("/login")}
              data-testid="button-reset-go-login"
            >
              Ir para o login
            </Button>
          </div>
        ) : (
          <>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {serverError}{" "}
                  <Link
                    href="/forgot-password"
                    className="underline underline-offset-4"
                  >
                    Solicitar novo link
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  data-testid="input-reset-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirmPassword}
                  data-testid="input-reset-confirm"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-reset-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Salvando…
                  </span>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
