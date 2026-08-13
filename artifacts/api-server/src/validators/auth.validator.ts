import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Email inválido.").max(255),
  password: z.string().min(1, "Senha obrigatória.").max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// T-003 (F17.3) — Recuperação de senha
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido.").max(255),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(16, "Token inválido.").max(1024),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres.")
    .max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
