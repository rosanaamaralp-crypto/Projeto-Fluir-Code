import { z } from "zod";

export const CreateResourceSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["MASSAGE_TABLE", "ROOM", "EQUIPMENT", "OTHER"]).default("MASSAGE_TABLE"),
});

export const UpdateResourceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["MASSAGE_TABLE", "ROOM", "EQUIPMENT", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
