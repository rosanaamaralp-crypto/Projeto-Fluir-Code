/**
 * Validators Zod para o módulo de dashboards.
 *
 * FASE 6 — GET /api/dashboard/admin | /professional | /client
 * Doc 16 §48–50.
 *
 * Admin dashboard: sem query params (dados do dia calculados pelo backend).
 * Professional dashboard: PROFESSIONAL usa sessão; ADMIN deve fornecer ?professionalId=uuid.
 * Client dashboard: CLIENT usa sessão; ADMIN deve fornecer ?clientId=uuid.
 */
import { z } from "zod";

const UUID = z.string().uuid("Deve ser um UUID válido.");

// ─── GET /api/dashboard/professional ─────────────────────────────────────────

export const DashboardProfessionalQuerySchema = z.object({
  professionalId: UUID.optional(),
});

export type DashboardProfessionalQuery = z.infer<typeof DashboardProfessionalQuerySchema>;

// ─── GET /api/dashboard/client ────────────────────────────────────────────────

export const DashboardClientQuerySchema = z.object({
  clientId: UUID.optional(),
});

export type DashboardClientQuery = z.infer<typeof DashboardClientQuerySchema>;
