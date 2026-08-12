import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AvailabilityRepository } from "../repositories/availability.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

async function assertProfOwnership(req: Request, profId: string): Promise<void> {
  const session = req.session.user!;
  if (session.roleId === ROLES.ADMIN) return;
  const prof = await ProfessionalsRepository.findById(db, profId);
  if (!prof) throw new NotFoundError("Profissional não encontrado.");
  if (prof.userId !== session.userId) throw new ForbiddenError();
}

export const AvailabilityController = {
  /** GET /api/professionals/:profId/availability */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      const prof = await ProfessionalsRepository.findById(db, profId);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");
      const list = await AvailabilityRepository.findByProfessionalId(db, profId);
      res.json({ availability: list });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/professionals/:profId/availability */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const { weekday, startTime, endTime, active } = req.body as {
        weekday: number;
        startTime: string;
        endTime: string;
        active?: boolean;
      };

      const avail = await db.transaction(async (tx) => {
        const avail = await AvailabilityRepository.create(tx, {
          professionalId: profId,
          weekday,
          startTime,
          endTime,
          active: active ?? true,
        });
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "AVAILABILITY_CREATED",
          entityType: "availability",
          entityId: avail.id,
          newData: avail,
          ipAddress: getIp(req),
        });
        return avail;
      });

      res.status(201).json({ availability: avail });
    } catch (err) {
      next(err);
    }
  },

  /** PUT /api/professionals/:profId/availability/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId, id } = req.params as { profId: string; id: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const old = await AvailabilityRepository.findById(db, id);
      if (!old || old.professionalId !== profId) throw new NotFoundError("Disponibilidade não encontrada.");

      const { weekday, startTime, endTime, active } = req.body as {
        weekday?: number;
        startTime?: string;
        endTime?: string;
        active?: boolean;
      };

      const updateData: Partial<{ weekday: number; startTime: string; endTime: string; active: boolean }> = {};
      if (weekday !== undefined) updateData.weekday = weekday;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (active !== undefined) updateData.active = active;

      const updated = await db.transaction(async (tx) => {
        const updated = await AvailabilityRepository.update(tx, id, updateData);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "AVAILABILITY_UPDATED",
          entityType: "availability",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getIp(req),
        });
        return updated;
      });

      res.json({ availability: updated });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /api/professionals/:profId/availability/:id (soft delete) */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId, id } = req.params as { profId: string; id: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const old = await AvailabilityRepository.findById(db, id);
      if (!old || old.professionalId !== profId) throw new NotFoundError("Disponibilidade não encontrada.");

      await db.transaction(async (tx) => {
        await AvailabilityRepository.update(tx, id, { active: false });
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "AVAILABILITY_DEACTIVATED",
          entityType: "availability",
          entityId: id,
          oldData: old,
          ipAddress: getIp(req),
        });
      });

      res.status(200).json({ message: "Disponibilidade desativada com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
