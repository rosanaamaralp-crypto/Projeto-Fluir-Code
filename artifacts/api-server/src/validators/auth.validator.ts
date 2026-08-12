import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Email inválido.").max(255),
  password: z.string().min(1, "Senha obrigatória.").max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;
