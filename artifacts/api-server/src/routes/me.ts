/**
 * Rotas do contexto autenticado "/me"
 *
 * T-023: GET /me/professional/clients       — clientes do profissional autenticado
 * T-025: GET /me/professional/clients/:clientId — detalhe do cliente
 *
 * Middleware: requireAuth + requireProfessional (ADMIN e PROFESSIONAL passam).
 * Ownership garantido no controller via ProfessionalsRepository.findByUserId(session.userId).
 */
import { Router } from "express";
import { MeProfessionalClientsController } from "../controllers/me-professional-clients.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireProfessional } from "../middlewares/require-role.js";
import { validateParams } from "../middlewares/validate.js";
import { ParamsClientIdSchema } from "../validators/params.validator.js";

const router = Router();

router.get(
  "/me/professional/clients",
  requireAuth,
  requireProfessional,
  MeProfessionalClientsController.list,
);

router.get(
  "/me/professional/clients/:clientId",
  requireAuth,
  requireProfessional,
  validateParams(ParamsClientIdSchema),
  MeProfessionalClientsController.detail,
);

export default router;
