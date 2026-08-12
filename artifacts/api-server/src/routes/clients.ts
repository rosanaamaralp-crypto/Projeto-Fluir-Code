import { Router } from "express";
import { ClientsController } from "../controllers/clients.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { CreateClientSchema, UpdateClientSchema } from "../validators/clients.validator.js";

const router = Router();

router.get("/clients", requireAuth, ClientsController.list);
router.get("/clients/:id", requireAuth, ClientsController.get);
router.post("/clients", requireAuth, requireAdmin, validateBody(CreateClientSchema), ClientsController.create);
router.patch("/clients/:id", requireAuth, validateBody(UpdateClientSchema), ClientsController.update);

export default router;
