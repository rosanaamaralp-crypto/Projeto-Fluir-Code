/**
 * Validators Zod para o módulo de notificações.
 *
 * F8 — GET /api/notifications (Doc 16 §46 / Doc 17 §43)
 *       POST /api/notifications/:id/read (Doc 16 §47)
 * Acesso: qualquer usuário autenticado (requireAuth sem requireAdmin).
 */
import { z } from "zod";

// ─── GET /api/notifications (query params) ────────────────────────────────

export const ListNotificationsQuerySchema = z.object({
  /** Filtrar apenas não lidas. "true" → read_at IS NULL; "false" → todas. */
  unread: z.enum(["true", "false"]).optional(),
  /** Página solicitada (≥ 1). Default: 1. */
  page: z.coerce.number().int().min(1, "page deve ser ≥ 1.").default(1),
  /** Registros por página (1–50). Default: 20. */
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit deve ser ≥ 1.")
    .max(50, "limit deve ser ≤ 50.")
    .default(20),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

// ─── POST /api/notifications/:id/read (params) ───────────────────────────

export const NotificationParamsSchema = z.object({
  id: z.string().uuid("Deve ser um UUID válido."),
});

export type NotificationParams = z.infer<typeof NotificationParamsSchema>;
