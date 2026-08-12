import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres.")
  .max(128);

export const CreateProfessionalSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  password: PasswordSchema,
  phone: z.string().max(20).optional(),
  specialty: z.string().max(255).optional(),
  bio: z.string().max(5000).optional(),
});

export const UpdateProfessionalSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
  specialty: z.string().max(255).optional(),
  bio: z.string().max(5000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateProfessionalInput = z.infer<typeof CreateProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof UpdateProfessionalSchema>;
