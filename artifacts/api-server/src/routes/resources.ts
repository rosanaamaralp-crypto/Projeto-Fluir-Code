import { Router } from "express";
import { ResourcesController } from "../controllers/resources.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateResourceSchema, UpdateResourceSchema } from "../validators/resources.validator.js";

const router = Router();

router.get("/resources", requireAuth, ResourcesController.list);
router.get("/resources/:id", requireAuth, ResourcesController.get);
router.post("/resources", requireAuth, requireAdmin, validateBody(CreateResourceSchema), ResourcesController.create);
router.patch("/resources/:id", requireAuth, requireAdmin, validateBody(UpdateResourceSchema), ResourcesController.update);
router.delete("/resources/:id", requireAuth, requireAdmin, ResourcesController.remove);

export default router;
