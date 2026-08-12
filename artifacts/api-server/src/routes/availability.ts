import { Router } from "express";
import { AvailabilityController } from "../controllers/availability.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateAvailabilitySchema, UpdateAvailabilitySchema } from "../validators/availability.validator.js";
import {
  ParamsProfIdSchema,
  ParamsProfIdAndIdSchema,
} from "../validators/params.validator.js";

const router = Router();

// P6: UUID de profId (e id quando aplicável) validado antes de chegar ao controller
router.get("/professionals/:profId/availability", requireAuth, validateParams(ParamsProfIdSchema), AvailabilityController.list);
router.post("/professionals/:profId/availability", requireAuth, requireProfessional, validateParams(ParamsProfIdSchema), validateBody(CreateAvailabilitySchema), AvailabilityController.create);
router.put("/professionals/:profId/availability/:id", requireAuth, requireProfessional, validateParams(ParamsProfIdAndIdSchema), validateBody(UpdateAvailabilitySchema), AvailabilityController.update);
router.delete("/professionals/:profId/availability/:id", requireAuth, requireProfessional, validateParams(ParamsProfIdAndIdSchema), AvailabilityController.remove);

export default router;
