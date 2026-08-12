import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { BlockedPeriodsRepository } from "../repositories/blocked-periods.repository.js";
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

export const BlockedPeriodsController = {
  /** GET /api/professionals/:profId/blocked-periods */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      await assertProfOwnership(req, profId);

      const prof = await ProfessionalsRepository.findById(db, profId);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");

      const list = await BlockedPeriodsRepository.findByProfessionalId(db, profId);
      res.json({ blockedPeriods: list });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/professionals/:profId/blocked-periods */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const { startDatetime, endDatetime, reason } = req.body as {
        startDatetime: string;
        endDatetime: string;
        reason?: string;
      };

      const bp = await db.transaction(async (tx) => {
        const bp = await BlockedPeriodsRepository.create(tx as typeof db, {
          professionalId: profId,
          startDatetime: new Date(startDatetime),
          endDatetime: new Date(endDatetime),
          reason: reason ?? null,
          createdBy: session.userId,
        });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "BLOCKED_PERIOD_CREATED",
          entityType: "blocked_periods",
          entityId: bp.id,
          newData: bp,
          ipAddress: getIp(req),
        });
        return bp;
      });

      res.status(201).json({ blockedPeriod: bp });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/professionals/:profId/blocked-periods/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId, id } = req.params as { profId: string; id: string };

      // Apenas ADMIN pode alterar blocked_periods
      const session = req.session.user!;
      if (session.roleId !== ROLES.ADMIN) throw new ForbiddenError();

      const old = await BlockedPeriodsRepository.findById(db, id);
      if (!old || old.professionalId !== profId) throw new NotFoundError("Período bloqueado não encontrado.");

      const { status, reason } = req.body as { status: string; reason?: string };

      const updated = await db.transaction(async (tx) => {
        const updated = await BlockedPeriodsRepository.updateStatus(tx as typeof db, id, status, reason);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "BLOCKED_PERIOD_UPDATED",
          entityType: "blocked_periods",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getIp(req),
        });
        return updated;
      });

      res.json({ blockedPeriod: updated });
    } catch (err) {
      next(err);
    }
  },
};
