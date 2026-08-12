/**
 * Rotas de relatórios.
 *
 * FASE 7 — Doc 16 §51–52.
 *
 * RBAC:
 * - GET /reports/appointments: requireAuth + requireAdmin — somente ADMIN
 * - GET /reports/resources:    requireAuth + requireAdmin — somente ADMIN
 *   PROFESSIONAL e CLIENT recebem 403.
 *   Anônimos recebem 401.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateQuery } from "../middlewares/validate.js";
import {
  ReportAppointmentsQuerySchema,
  ReportResourcesQuerySchema,
} from "../validators/reports.validator.js";
import { ReportsController } from "../controllers/reports.controller.js";

const router = Router();

/** GET /api/reports/appointments — somente ADMIN */
router.get(
  "/reports/appointments",
  requireAuth,
  requireAdmin,
  validateQuery(ReportAppointmentsQuerySchema),
  ReportsController.appointments,
);

/** GET /api/reports/resources — somente ADMIN */
router.get(
  "/reports/resources",
  requireAuth,
  requireAdmin,
  validateQuery(ReportResourcesQuerySchema),
  ReportsController.resources,
);

export default router;
