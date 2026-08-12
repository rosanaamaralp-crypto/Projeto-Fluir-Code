/**
 * Validators Zod para o módulo de relatórios.
 *
 * FASE 7 — GET /api/reports/appointments e GET /api/reports/resources
 * Doc 16 §51–52. Acesso restrito a ADMIN.
 *
 * startDate / endDate: formato YYYY-MM-DD (opcionais).
 * Se não informados, consulta todo o histórico disponível (D1, D2).
 */
import { z } from "zod";

const UUID = z.string().uuid("Deve ser um UUID válido.");
const DateString = z.string().date("Data inválida. Use formato YYYY-MM-DD.");

const dateRangeRefinement = (data: { startDate?: string; endDate?: string }) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
};

// ─── GET /api/reports/appointments ────────────────────────────────────────────

export const ReportAppointmentsQuerySchema = z
  .object({
    /** Início do período (YYYY-MM-DD). Inclusivo. Opcional — sem filtro retorna todo o histórico. */
    startDate: DateString.optional(),
    /** Fim do período (YYYY-MM-DD). Inclusivo. Opcional. */
    endDate: DateString.optional(),
    /** Filtro por UUID do profissional. */
    professionalId: UUID.optional(),
    /** Filtro por UUID do serviço. */
    serviceId: UUID.optional(),
    /** Filtro por modalidade. */
    modality: z.enum(["IN_PERSON", "HOME_CARE"]).optional(),
    /** Filtro por status. */
    status: z
      .enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"])
      .optional(),
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
  .refine(dateRangeRefinement, {
    message: "endDate deve ser maior ou igual a startDate.",
    path: ["endDate"],
  });

export type ReportAppointmentsQuery = z.infer<typeof ReportAppointmentsQuerySchema>;

// ─── GET /api/reports/resources ───────────────────────────────────────────────

export const ReportResourcesQuerySchema = z
  .object({
    /** Início do período (YYYY-MM-DD). Inclusivo. Opcional. */
    startDate: DateString.optional(),
    /** Fim do período (YYYY-MM-DD). Inclusivo. Opcional. */
    endDate: DateString.optional(),
  })
  .refine(dateRangeRefinement, {
    message: "endDate deve ser maior ou igual a startDate.",
    path: ["endDate"],
  });

export type ReportResourcesQuery = z.infer<typeof ReportResourcesQuerySchema>;
