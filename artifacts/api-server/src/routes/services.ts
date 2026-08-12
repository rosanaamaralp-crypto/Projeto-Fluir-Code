import { Router } from "express";
import { ServicesController } from "../controllers/services.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateServiceSchema, UpdateServiceSchema } from "../validators/services.validator.js";
import { ParamsIdSchema } from "../validators/params.validator.js";

const router = Router();

router.get("/services", requireAuth, ServicesController.list);

// P6: UUID validado antes de chegar ao controller
router.get("/services/:id", requireAuth, validateParams(ParamsIdSchema), ServicesController.get);

router.post("/services", requireAuth, requireAdmin, validateBody(CreateServiceSchema), ServicesController.create);
router.patch("/services/:id", requireAuth, requireAdmin, validateParams(ParamsIdSchema), validateBody(UpdateServiceSchema), ServicesController.update);
router.delete("/services/:id", requireAuth, requireAdmin, validateParams(ParamsIdSchema), ServicesController.remove);

export default router;
