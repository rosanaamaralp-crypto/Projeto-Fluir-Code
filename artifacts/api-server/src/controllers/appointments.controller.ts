/**
 * AppointmentsController — controller fino.
 * Toda regra de negócio está no AppointmentsService.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppointmentsService } from "../services/appointments.service.js";
import { AppointmentStatusHistoryRepository } from "../repositories/appointment-status-history.repository.js";
import { mapDbError } from "../lib/errors.js";
import type { CreateAppointmentInput, ListAppointmentsQuery } from "../validators/appointments.validator.js";
import { formatZodError } from "../middlewares/validate.js";
import { PatchAppointmentSchema, type AlterAppointmentInput } from "../validators/appointments.validator.js";
import { ValidationError } from "../lib/errors.js";
import { getClientIp } from "../lib/ip.js";

export const AppointmentsController = {
  /** POST /api/appointments */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const input = req.body as CreateAppointmentInput;

      const appointment = await AppointmentsService.create(db, {
        input,
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ appointment });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/appointments */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const query = req.query as ListAppointmentsQuery;

      const appointments = await AppointmentsService.list(db, {
        query,
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
      });

      res.json({ appointments });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/appointments/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { id } = req.params as { id: string };

      const appointment = await AppointmentsService.getById(db, {
        appointmentId: id,
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
      });

      res.json({ appointment });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/appointments/:id/history */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { id } = req.params as { id: string };

      // Verify ownership antes de retornar histórico
      await AppointmentsService.getById(db, {
        appointmentId: id,
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
      });

      const history = await AppointmentStatusHistoryRepository.findByAppointmentId(db, id);
      res.json({ history });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /**
   * PATCH /api/appointments/:id
   *
   * Aceita 4 formas de payload (validadas via Zod):
   *   1. { status: "CANCELLED", reason?: string }                     → cancelamento
   *   2. { status: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" }          → mudança de status
   *   3. { reschedule: { startDatetime, resourceId?, addressId? } }    → remarcação
   *   4. { professionalId?, modality?, addressId?, startDatetime? }    → alteração in-place (F5.6)
   *
   * Discriminação por narrowing TypeScript:
   *   "reschedule" in body → (3)
   *   "status" in body     → (1) ou (2)
   *   else                 → (4)
   */
  async patch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { id } = req.params as { id: string };
      const ipAddress = getClientIp(req);

      // Validar payload dinamicamente
      const parseResult = PatchAppointmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        next(new ValidationError(formatZodError(parseResult.error), parseResult.error.issues));
        return;
      }

      const body = parseResult.data;

      if ("reschedule" in body) {
        // (3) Remarcação
        const result = await AppointmentsService.reschedule(db, {
          appointmentId: id,
          rescheduleInput: body.reschedule,
          sessionUserId: session.userId,
          sessionRoleId: session.roleId,
          ipAddress,
        });
        res.json({ cancelled: result.old, appointment: result.new });
        return;
      }

      if ("status" in body) {
        // (1) Cancelamento ou (2) mudança de status
        const updated = await AppointmentsService.updateStatus(db, {
          appointmentId: id,
          newStatus: body.status,
          reason: "reason" in body ? body.reason : undefined,
          sessionUserId: session.userId,
          sessionRoleId: session.roleId,
          ipAddress,
        });
        res.json({ appointment: updated });
        return;
      }

      // (4) Alteração in-place — F5.6
      const updated = await AppointmentsService.update(db, {
        appointmentId: id,
        input: body as AlterAppointmentInput,
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
        ipAddress,
      });
      res.json({ appointment: updated });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
