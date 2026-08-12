import { Router } from "express";
import { ProfessionalServicesController } from "../controllers/professional-services.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { AddProfessionalServiceSchema } from "../validators/professional-services.validator.js";
import {
  ParamsProfIdSchema,
  ParamsProfIdAndServiceIdSchema,
} from "../validators/params.validator.js";

const router = Router({ mergeParams: true });

// P6: UUID de profId validado antes de chegar ao controller
router.get("/professionals/:profId/services", requireAuth, validateParams(ParamsProfIdSchema), ProfessionalServicesController.list);
router.post("/professionals/:profId/services", requireAuth, requireProfessional, validateParams(ParamsProfIdSchema), validateBody(AddProfessionalServiceSchema), ProfessionalServicesController.add);
router.delete("/professionals/:profId/services/:serviceId", requireAuth, requireProfessional, validateParams(ParamsProfIdAndServiceIdSchema), ProfessionalServicesController.remove);

export default router;
