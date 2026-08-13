/**
 * P9: PATCH de blocked_periods é exclusivo para ADMIN.
 * A verificação de role foi movida para a rota (requireAdmin),
 * removendo a verificação redundante que estava no controller.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { BlockedPeriodsRepository } from "../repositories/blocked-periods.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import { getClientIp } from "../lib/ip.js";

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
        const bp = await BlockedPeriodsRepository.create(tx, {
          professionalId: profId,
          startDatetime: new Date(startDatetime),
          endDatetime: new Date(endDatetime),
          reason: reason ?? null,
          createdBy: session.userId,
        });
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "BLOCKED_PERIOD_CREATED",
          entityType: "blocked_periods",
          entityId: bp.id,
          newData: bp,
          ipAddress: getClientIp(req),
        });
        return bp;
      });

      res.status(201).json({ blockedPeriod: bp });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/blocked-periods/:id
   * Soft-delete: altera status para CANCELLED.
   * ADMIN pode deletar qualquer um; PROFESSIONAL somente os próprios.
   */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const session = req.session.user!;

      const bp = await BlockedPeriodsRepository.findById(db, id);
      if (!bp) throw new NotFoundError("Período bloqueado não encontrado.");

      // Ownership check: professional só pode remover os próprios
      if (session.roleId !== ROLES.ADMIN) {
        const prof = await ProfessionalsRepository.findByUserId(db, session.userId);
        if (!prof || prof.id !== bp.professionalId) throw new ForbiddenError();
      }

      await db.transaction(async (tx) => {
        await BlockedPeriodsRepository.updateStatus(tx, id, "CANCELLED");
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "BLOCKED_PERIOD_DELETED",
          entityType: "blocked_periods",
          entityId: id,
          oldData: bp,
          ipAddress: getClientIp(req),
        });
      });

      res.json({ message: "Período bloqueado removido com sucesso." });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/professionals/:profId/blocked-periods/:id
   * Exclusivo para ADMIN — verificação de role feita no middleware da rota (requireAdmin).
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId, id } = req.params as { profId: string; id: string };

      const session = req.session.user!;
      const old = await BlockedPeriodsRepository.findById(db, id);
      if (!old || old.professionalId !== profId) throw new NotFoundError("Período bloqueado não encontrado.");

      const { status, reason } = req.body as { status: string; reason?: string };

      const updated = await db.transaction(async (tx) => {
        const updated = await BlockedPeriodsRepository.updateStatus(tx, id, status, reason);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "BLOCKED_PERIOD_UPDATED",
          entityType: "blocked_periods",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getClientIp(req),
        });
        return updated;
      });

      res.json({ blockedPeriod: updated });
    } catch (err) {
      next(err);
    }
  },
};
