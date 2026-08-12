import { Router } from "express";
import { AvailabilityController } from "../controllers/availability.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateAvailabilitySchema, UpdateAvailabilitySchema } from "../validators/availability.validator.js";

const router = Router();

router.get("/professionals/:profId/availability", requireAuth, AvailabilityController.list);
router.post("/professionals/:profId/availability", requireAuth, requireProfessional, validateBody(CreateAvailabilitySchema), AvailabilityController.create);
router.put("/professionals/:profId/availability/:id", requireAuth, requireProfessional, validateBody(UpdateAvailabilitySchema), AvailabilityController.update);
router.delete("/professionals/:profId/availability/:id", requireAuth, requireProfessional, AvailabilityController.remove);

export default router;
