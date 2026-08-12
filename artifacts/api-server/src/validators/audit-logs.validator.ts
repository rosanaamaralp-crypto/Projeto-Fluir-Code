/**
 * Validators Zod para o módulo de audit-logs.
 *
 * F5.7 — GET /api/audit-logs (Doc 16 §53 / Doc 17 FASE 17)
 * Acesso restrito a ADMIN.
 */
import { z } from "zod";

const UUID = z.string().uuid("Deve ser um UUID válido.");
const ISODatetime = z.string().datetime({
  message: "Data inválida. Use ISO-8601 com timezone (ex: 2026-09-01T10:00:00Z).",
});

// ─── GET /api/audit-logs ───────────────────────────────────────────────────

export const ListAuditLogsQuerySchema = z
  .object({
    /** Filtro por ação (string livre — ex: APPOINTMENT_ALTERED). */
    action: z.string().optional(),
    /** Filtro por tipo de entidade (ex: "appointment"). */
    entityType: z.string().optional(),
    /** Filtro por ID de entidade (UUID). */
    entityId: UUID.optional(),
    /** Filtro por ID do usuário que executou a ação (UUID). */
    userId: UUID.optional(),
    /** Início do período (ISO-8601). Inclusivo. */
    startDate: ISODatetime.optional(),
    /** Fim do período (ISO-8601). Inclusivo. */
    endDate: ISODatetime.optional(),
    /** Página solicitada (≥ 1). Default: 1. */
    page: z.coerce.number().int().min(1, "page deve ser ≥ 1.").default(1),
    /** Registros por página (1–100). Default: 20. */
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit deve ser ≥ 1.")
      .max(100, "limit deve ser ≤ 100.")
      .default(20),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: "endDate deve ser maior ou igual a startDate.", path: ["endDate"] },
  );

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;
