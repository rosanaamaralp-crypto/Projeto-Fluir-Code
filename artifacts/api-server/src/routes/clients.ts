import { Router } from "express";
import { ClientsController } from "../controllers/clients.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireRole, ROLES } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { CreateClientSchema } from "../validators/clients.validator.js";
import { ParamsIdSchema } from "../validators/params.validator.js";

const router = Router();

router.get("/clients", requireAuth, ClientsController.list);

// P6: UUID validado antes de chegar ao controller (400 em vez de 500 para UUIDs inválidos)
router.get("/clients/:id", requireAuth, validateParams(ParamsIdSchema), ClientsController.get);

// F20: ADMIN e PROFESSIONAL podem cadastrar clientes (CLIENT continua proibido).
// O criador é registrado em audit_logs (CLIENT_CREATED), o que estabelece o
// relacionamento profissional → cliente usado pela F19.
router.post(
  "/clients",
  requireAuth,
  requireRole([ROLES.ADMIN, ROLES.PROFESSIONAL]),
  validateBody(CreateClientSchema),
  ClientsController.create,
);

// P8: validateBody removido da rota — o controller seleciona o schema correto por role
// P6: UUID validado antes de chegar ao controller
router.patch("/clients/:id", requireAuth, validateParams(ParamsIdSchema), ClientsController.update);

export default router;
