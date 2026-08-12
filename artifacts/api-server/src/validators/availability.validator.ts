import { z } from "zod";

const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use formato HH:MM ou HH:MM:SS.");

export const CreateAvailabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: TimeSchema,
  endTime: TimeSchema,
  active: z.boolean().default(true),
});

export const UpdateAvailabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6).optional(),
  startTime: TimeSchema.optional(),
  endTime: TimeSchema.optional(),
  active: z.boolean().optional(),
});

export type CreateAvailabilityInput = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
