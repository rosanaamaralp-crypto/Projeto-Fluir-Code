import { Router } from "express";
import { ProfessionalServicesController } from "../controllers/professional-services.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { AddProfessionalServiceSchema } from "../validators/professional-services.validator.js";

const router = Router({ mergeParams: true });

router.get("/professionals/:profId/services", requireAuth, ProfessionalServicesController.list);
router.post("/professionals/:profId/services", requireAuth, requireProfessional, validateBody(AddProfessionalServiceSchema), ProfessionalServicesController.add);
router.delete("/professionals/:profId/services/:serviceId", requireAuth, requireProfessional, ProfessionalServicesController.remove);

export default router;
