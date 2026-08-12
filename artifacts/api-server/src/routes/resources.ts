import { Router } from "express";
import { ResourcesController } from "../controllers/resources.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateResourceSchema, UpdateResourceSchema } from "../validators/resources.validator.js";
import { ParamsIdSchema } from "../validators/params.validator.js";

const router = Router();

router.get("/resources", requireAuth, ResourcesController.list);

// P6: UUID validado antes de chegar ao controller
router.get("/resources/:id", requireAuth, validateParams(ParamsIdSchema), ResourcesController.get);

router.post("/resources", requireAuth, requireAdmin, validateBody(CreateResourceSchema), ResourcesController.create);
router.patch("/resources/:id", requireAuth, requireAdmin, validateParams(ParamsIdSchema), validateBody(UpdateResourceSchema), ResourcesController.update);
router.delete("/resources/:id", requireAuth, requireAdmin, validateParams(ParamsIdSchema), ResourcesController.remove);

export default router;
