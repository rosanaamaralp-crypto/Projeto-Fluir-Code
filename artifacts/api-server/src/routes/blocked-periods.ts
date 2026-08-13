/**
 * P9: PATCH de blocked_periods é exclusivo para ADMIN.
 * Alterado de `requireAuth` para `requireAuth + requireAdmin` na rota,
 * consistente com o padrão do restante da arquitetura (services, resources).
 * A verificação redundante foi removida do controller.
 */
import { Router } from "express";
import { BlockedPeriodsController } from "../controllers/blocked-periods.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin, requireProfessional } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateBlockedPeriodSchema, UpdateBlockedPeriodSchema } from "../validators/blocked-periods.validator.js";
import {
  ParamsIdSchema,
  ParamsProfIdSchema,
  ParamsProfIdAndIdSchema,
} from "../validators/params.validator.js";

const router = Router();

// P6: UUIDs validados antes de chegar ao controller
router.get("/professionals/:profId/blocked-periods", requireAuth, requireProfessional, validateParams(ParamsProfIdSchema), BlockedPeriodsController.list);
router.post("/professionals/:profId/blocked-periods", requireAuth, requireProfessional, validateParams(ParamsProfIdSchema), validateBody(CreateBlockedPeriodSchema), BlockedPeriodsController.create);

// P9: requireAdmin na rota — somente ADMIN pode alterar blocked_periods
router.patch("/professionals/:profId/blocked-periods/:id", requireAuth, requireAdmin, validateParams(ParamsProfIdAndIdSchema), validateBody(UpdateBlockedPeriodSchema), BlockedPeriodsController.update);

// F14: PROFESSIONAL pode remover (soft-delete) seus próprios bloqueios; ADMIN pode remover qualquer um
router.delete("/blocked-periods/:id", requireAuth, requireProfessional, validateParams(ParamsIdSchema), BlockedPeriodsController.remove);

export default router;
