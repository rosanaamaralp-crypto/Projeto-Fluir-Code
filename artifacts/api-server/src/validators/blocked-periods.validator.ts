import { z } from "zod";

export const CreateBlockedPeriodSchema = z.object({
  startDatetime: z.string().datetime({ offset: true }),
  endDatetime: z.string().datetime({ offset: true }),
  reason: z.string().max(2000).optional(),
}).refine((d) => new Date(d.startDatetime) < new Date(d.endDatetime), {
  message: "endDatetime deve ser posterior a startDatetime.",
  path: ["endDatetime"],
});

export const UpdateBlockedPeriodSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]),
  reason: z.string().max(2000).optional(),
});

export type CreateBlockedPeriodInput = z.infer<typeof CreateBlockedPeriodSchema>;
export type UpdateBlockedPeriodInput = z.infer<typeof UpdateBlockedPeriodSchema>;
