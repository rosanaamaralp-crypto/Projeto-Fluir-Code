import { Router } from "express";
import { ServicesController } from "../controllers/services.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateServiceSchema, UpdateServiceSchema } from "../validators/services.validator.js";

const router = Router();

router.get("/services", requireAuth, ServicesController.list);
router.get("/services/:id", requireAuth, ServicesController.get);
router.post("/services", requireAuth, requireAdmin, validateBody(CreateServiceSchema), ServicesController.create);
router.patch("/services/:id", requireAuth, requireAdmin, validateBody(UpdateServiceSchema), ServicesController.update);
router.delete("/services/:id", requireAuth, requireAdmin, ServicesController.remove);

export default router;
