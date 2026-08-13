/**
 * Rotas de appointments.
 *
 * RBAC:
 * - POST:  requireAuth + requireRole(CLIENT, ADMIN, PROFESSIONAL) — F19:
 *          PROFESSIONAL agenda em nome de um cliente (professionalId forçado
 *          ao próprio profissional no service; clientId obrigatório)
 * - GET /appointments e GET /appointments/:id: requireAuth (ownership no service)
 * - GET /appointments/:id/history: requireAuth (ownership no service)
 * - PATCH /appointments/:id: requireAuth (ownership e transições no service)
 *
 * validateParams garante que UUIDs malformados retornam 400 antes do service.
 * O body do PATCH é validado diretamente no controller (discriminated union).
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireRole, ROLES } from "../middlewares/require-role.js";
import { validateParams, validateBody, validateQuery } from "../middlewares/validate.js";
import { ParamsIdSchema } from "../validators/params.validator.js";
import {
  CreateAppointmentSchema,
  ListAppointmentsQuerySchema,
} from "../validators/appointments.validator.js";
import { AppointmentsController } from "../controllers/appointments.controller.js";

const router = Router();

/** POST /api/appointments — CLIENT, ADMIN e PROFESSIONAL (F19) */
router.post(
  "/appointments",
  requireAuth,
  requireRole([ROLES.ADMIN, ROLES.CLIENT, ROLES.PROFESSIONAL]),
  validateBody(CreateAppointmentSchema),
  AppointmentsController.create,
);

/** GET /api/appointments — ownership aplicado no service por role */
router.get(
  "/appointments",
  requireAuth,
  validateQuery(ListAppointmentsQuerySchema),
  AppointmentsController.list,
);

/** GET /api/appointments/:id */
router.get(
  "/appointments/:id",
  requireAuth,
  validateParams(ParamsIdSchema),
  AppointmentsController.get,
);

/** GET /api/appointments/:id/history */
router.get(
  "/appointments/:id/history",
  requireAuth,
  validateParams(ParamsIdSchema),
  AppointmentsController.getHistory,
);

/** PATCH /api/appointments/:id — cancelamento, mudança de status ou remarcação */
router.patch(
  "/appointments/:id",
  requireAuth,
  validateParams(ParamsIdSchema),
  AppointmentsController.patch,
);

export default router;
