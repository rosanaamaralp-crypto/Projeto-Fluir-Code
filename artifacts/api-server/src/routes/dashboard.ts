/**
 * Rotas de dashboard.
 *
 * FASE 6 — Doc 16 §48–50.
 *
 * RBAC:
 * - GET /dashboard/admin:        requireAuth + requireAdmin
 *   → PROFESSIONAL/CLIENT: 403; anônimo: 401
 *
 * - GET /dashboard/professional: requireAuth + requireRole([PROFESSIONAL, ADMIN])
 *   → CLIENT: 403; anônimo: 401
 *   → PROFESSIONAL: usa sessão (IDOR protegido no service)
 *   → ADMIN: deve fornecer ?professionalId=uuid (400 se ausente, 404 se inexistente)
 *
 * - GET /dashboard/client:       requireAuth + requireRole([CLIENT, ADMIN])
 *   → PROFESSIONAL: 403; anônimo: 401
 *   → CLIENT: usa sessão (IDOR protegido no service)
 *   → ADMIN: deve fornecer ?clientId=uuid (400 se ausente, 404 se inexistente)
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin, requireProfessional, requireClient } from "../middlewares/require-role.js";
import { validateQuery } from "../middlewares/validate.js";
import {
  DashboardProfessionalQuerySchema,
  DashboardClientQuerySchema,
} from "../validators/dashboard.validator.js";
import { DashboardController } from "../controllers/dashboard.controller.js";

const router = Router();

/** GET /api/dashboard/admin — somente ADMIN */
router.get(
  "/dashboard/admin",
  requireAuth,
  requireAdmin,
  DashboardController.adminDashboard,
);

/** GET /api/dashboard/professional — PROFESSIONAL (próprio) ou ADMIN (via ?professionalId) */
router.get(
  "/dashboard/professional",
  requireAuth,
  requireProfessional,
  validateQuery(DashboardProfessionalQuerySchema),
  DashboardController.professionalDashboard,
);

/** GET /api/dashboard/client — CLIENT (próprio) ou ADMIN (via ?clientId) */
router.get(
  "/dashboard/client",
  requireAuth,
  requireClient,
  validateQuery(DashboardClientQuerySchema),
  DashboardController.clientDashboard,
);

export default router;
