import { Router } from "express";
import { ProfessionalsController } from "../controllers/professionals.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateProfessionalSchema, UpdateProfessionalSchema } from "../validators/professionals.validator.js";
import { ParamsIdSchema } from "../validators/params.validator.js";

const router = Router();

router.get("/professionals", requireAuth, ProfessionalsController.list);

// P6: UUID validado antes de chegar ao controller
router.get("/professionals/:id", requireAuth, validateParams(ParamsIdSchema), ProfessionalsController.get);

router.post("/professionals", requireAuth, requireAdmin, validateBody(CreateProfessionalSchema), ProfessionalsController.create);

// P6: UUID validado + body validado pelo schema (inclui name e phone — P3)
router.patch("/professionals/:id", requireAuth, validateParams(ParamsIdSchema), validateBody(UpdateProfessionalSchema), ProfessionalsController.update);

export default router;
