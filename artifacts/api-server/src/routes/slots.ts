import { Router } from "express";
import { SlotsController } from "../controllers/slots.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateQuery } from "../middlewares/validate.js";
import { SlotsQuerySchema } from "../validators/slots.validator.js";

const router = Router();

router.get("/slots", requireAuth, validateQuery(SlotsQuerySchema), SlotsController.list);

export default router;
