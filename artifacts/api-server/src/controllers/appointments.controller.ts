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
import { PatchAppointmentSchema } from "../validators/appointments.validator.js";
import { ValidationError } from "../lib/errors.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

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
        ipAddress: getIp(req),
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
   * Aceita 3 formas de payload (validadas via Zod):
   *   1. { status: "CANCELLED", reason?: string }       → cancelamento
   *   2. { status: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" }  → mudança de status
   *   3. { reschedule: { startDatetime, resourceId?, addressId? } }  → remarcação
   */
  async patch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { id } = req.params as { id: string };
      const ipAddress = getIp(req);

      // Validar payload dinamicamente
      const parseResult = PatchAppointmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        next(new ValidationError(formatZodError(parseResult.error), parseResult.error.issues));
        return;
      }

      const body = parseResult.data;

      if ("reschedule" in body) {
        // Remarcação
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

      // Mudança de status (cancelamento ou outro)
      const updated = await AppointmentsService.updateStatus(db, {
        appointmentId: id,
        newStatus: body.status,
        reason: "reason" in body ? body.reason : undefined,
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
