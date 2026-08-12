import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres.")
  .max(128);

export const CreateClientSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  password: PasswordSchema,
  phone: z.string().max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateClientSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
