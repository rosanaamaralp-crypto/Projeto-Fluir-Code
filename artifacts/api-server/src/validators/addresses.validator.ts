import { z } from "zod";

export const UpsertAddressSchema = z.object({
  street: z.string().min(2).max(255),
  number: z.string().min(1).max(20),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  state: z.string().length(2, "Estado deve ter exatamente 2 caracteres.").toUpperCase(),
  postalCode: z.string().min(8).max(10),
  reference: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

export const ParamsClientIdSchema = z.object({
  clientId: z.string().uuid(),
});

export type UpsertAddressInput = z.infer<typeof UpsertAddressSchema>;
