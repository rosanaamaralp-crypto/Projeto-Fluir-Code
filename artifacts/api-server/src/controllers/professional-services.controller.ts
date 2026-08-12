import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ProfessionalServicesRepository } from "../repositories/professional-services.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { ServicesRepository } from "../repositories/services.repository.js";
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

export const ProfessionalServicesController = {
  /** GET /api/professionals/:profId/services */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      const prof = await ProfessionalsRepository.findById(db, profId);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");

      const list = await ProfessionalServicesRepository.findByProfessionalId(db, profId);
      res.json({ professionalServices: list });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/professionals/:profId/services */
  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId } = req.params as { profId: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const { serviceId } = req.body as { serviceId: string };

      const svc = await ServicesRepository.findById(db, serviceId);
      if (!svc) throw new NotFoundError("Serviço não encontrado.");

      const ps = await db.transaction(async (tx) => {
        const ps = await ProfessionalServicesRepository.upsert(tx as typeof db, {
          professionalId: profId,
          serviceId,
        });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "PROFESSIONAL_SERVICE_ADDED",
          entityType: "professional_services",
          entityId: ps.id,
          newData: ps,
          ipAddress: getIp(req),
        });
        return ps;
      });

      res.status(201).json({ professionalService: ps });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /api/professionals/:profId/services/:serviceId */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profId, serviceId } = req.params as { profId: string; serviceId: string };
      await assertProfOwnership(req, profId);

      const session = req.session.user!;
      const old = await ProfessionalServicesRepository.findOne(db, profId, serviceId);
      if (!old) throw new NotFoundError("Serviço do profissional não encontrado.");

      await db.transaction(async (tx) => {
        await ProfessionalServicesRepository.deactivate(tx as typeof db, profId, serviceId);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "PROFESSIONAL_SERVICE_DEACTIVATED",
          entityType: "professional_services",
          entityId: old.id,
          oldData: old,
          ipAddress: getIp(req),
        });
      });

      res.status(200).json({ message: "Serviço removido do profissional com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
