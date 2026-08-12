import { Router } from "express";
import { ProfessionalsController } from "../controllers/professionals.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateProfessionalSchema, UpdateProfessionalSchema } from "../validators/professionals.validator.js";

const router = Router();

router.get("/professionals", requireAuth, ProfessionalsController.list);
router.get("/professionals/:id", requireAuth, ProfessionalsController.get);
router.post("/professionals", requireAuth, requireAdmin, validateBody(CreateProfessionalSchema), ProfessionalsController.create);
router.patch("/professionals/:id", requireAuth, validateBody(UpdateProfessionalSchema), ProfessionalsController.update);

export default router;
