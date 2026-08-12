/**
 * Rotas de notificações.
 *
 * F8 — GET /api/notifications (Doc 16 §46 / Doc 17 §43)
 *       POST /api/notifications/:id/read (Doc 16 §47)
 *
 * RBAC: requireAuth sem requireAdmin — qualquer usuário autenticado acessa
 * as próprias notificações. IDOR é protegido no controller.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateQuery, validateParams } from "../middlewares/validate.js";
import { ListNotificationsQuerySchema, NotificationParamsSchema } from "../validators/notifications.validator.js";
import { NotificationsController } from "../controllers/notifications.controller.js";

const router = Router();

/** GET /api/notifications — notificações do usuário autenticado */
router.get(
  "/notifications",
  requireAuth,
  validateQuery(ListNotificationsQuerySchema),
  NotificationsController.list,
);

/** POST /api/notifications/:id/read — marcar notificação como lida */
router.post(
  "/notifications/:id/read",
  requireAuth,
  validateParams(NotificationParamsSchema),
  NotificationsController.markAsRead,
);

export default router;
