/**
 * T-002 — Tela de Login
 *
 * Doc 15 §5: campos e-mail + senha, ação "entrar".
 * Doc 18 §47: login real via API, sessão por cookie.
 * Doc 10 §4: MVP obrigatório.
 *
 * Após login bem-sucedido, redireciona para o dashboard do perfil do usuário.
 * Mensagem de erro genérica para credenciais inválidas (sem diferenciação
 * e-mail/senha — alinhado ao backend para mitigar timing attacks).
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { getDashboardPath } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const LoginSchema = z.object({
  email: z.string().min(1, "E-mail obrigatório.").email("E-mail inválido."),
  password: z.string().min(1, "Senha obrigatória."),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  // Já autenticado → redirecionar direto
  if (user) {
    navigate(getDashboardPath(user.roleId));
    return null;
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      // useAuth já atualizou o estado; o redirect acontece no próximo render
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao fazer login.";
      // Normalize a mensagem do backend para UX consistente
      setServerError(
        msg.toLowerCase().includes("inválid")
          ? "E-mail ou senha incorretos."
          : msg,
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        {/* Cabeçalho */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Fluir da Vida
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu e-mail e senha
          </p>
        </div>

        {/* Erro do servidor */}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              data-testid="link-forgot-password"
            >
              Esqueci minha senha
            </Link>
          </p>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Entrando…
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
