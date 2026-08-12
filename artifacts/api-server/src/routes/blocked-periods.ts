import { Router } from "express";
import { BlockedPeriodsController } from "../controllers/blocked-periods.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateBlockedPeriodSchema, UpdateBlockedPeriodSchema } from "../validators/blocked-periods.validator.js";

const router = Router();

router.get("/professionals/:profId/blocked-periods", requireAuth, requireProfessional, BlockedPeriodsController.list);
router.post("/professionals/:profId/blocked-periods", requireAuth, requireProfessional, validateBody(CreateBlockedPeriodSchema), BlockedPeriodsController.create);
router.patch("/professionals/:profId/blocked-periods/:id", requireAuth, validateBody(UpdateBlockedPeriodSchema), BlockedPeriodsController.update);

export default router;
