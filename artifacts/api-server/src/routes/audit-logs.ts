/**
 * Rotas de audit-logs.
 *
 * F5.7 — GET /api/audit-logs (Doc 16 §53 / Doc 17 FASE 17)
 *
 * RBAC:
 * - GET /audit-logs: requireAuth + requireAdmin — somente ADMIN
 *   CLIENT e PROFESSIONAL recebem 403.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateQuery } from "../middlewares/validate.js";
import { ListAuditLogsQuerySchema } from "../validators/audit-logs.validator.js";
import { AuditLogsController } from "../controllers/audit-logs.controller.js";

const router = Router();

/** GET /api/audit-logs — somente ADMIN */
router.get(
  "/audit-logs",
  requireAuth,
  requireAdmin,
  validateQuery(ListAuditLogsQuerySchema),
  AuditLogsController.list,
);

export default router;
