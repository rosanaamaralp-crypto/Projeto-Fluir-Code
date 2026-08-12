import { z } from "zod";

export const SlotsQuerySchema = z.object({
  professionalId: z.string().uuid("professionalId deve ser UUID."),
  serviceId: z.string().uuid("serviceId deve ser UUID."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date deve estar no formato YYYY-MM-DD."),
  modality: z.enum(["IN_PERSON", "HOME_CARE"]).optional(),
});

export type SlotsQuery = z.infer<typeof SlotsQuerySchema>;
