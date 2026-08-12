import { z } from "zod";

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(5000).optional(),
  durationMinutes: z.number().int().positive("Duração deve ser positiva."),
  price: z
    .number()
    .nonnegative("Preço não pode ser negativo.")
    .multipleOf(0.01),
  allowedModalities: z.enum(["IN_PERSON", "HOME_CARE", "BOTH"]).default("BOTH"),
});

export const UpdateServiceSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional(),
  durationMinutes: z.number().int().positive().optional(),
  price: z.number().nonnegative().multipleOf(0.01).optional(),
  allowedModalities: z.enum(["IN_PERSON", "HOME_CARE", "BOTH"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
