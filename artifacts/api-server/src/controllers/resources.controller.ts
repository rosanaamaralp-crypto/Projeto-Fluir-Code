import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ResourcesRepository } from "../repositories/resources.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import { getClientIp } from "../lib/ip.js";

export const ResourcesController = {
  /** GET /api/resources */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const onlyActive = session.roleId !== ROLES.ADMIN;
      const list = await ResourcesRepository.findAll(db, onlyActive);
      res.json({ resources: list });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/resources/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const res_ = await ResourcesRepository.findById(db, id);
      if (!res_) throw new NotFoundError("Recurso não encontrado.");
      res.json({ resource: res_ });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/resources — ADMIN only */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { name, type } = req.body as { name: string; type: string };

      const resource = await db.transaction(async (tx) => {
        const resource = await ResourcesRepository.create(tx, { name, type });
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "RESOURCE_CREATED",
          entityType: "resources",
          entityId: resource.id,
          newData: resource,
          ipAddress: getClientIp(req),
        });
        return resource;
      });

      res.status(201).json({ resource });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/resources/:id — ADMIN only */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const session = req.session.user!;
      const old = await ResourcesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Recurso não encontrado.");

      const { name, type, status } = req.body as Partial<{ name: string; type: string; status: string }>;
      const updateData: Partial<{ name: string; type: string; status: string }> = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (status !== undefined) updateData.status = status;

      const updated = await db.transaction(async (tx) => {
        const updated = await ResourcesRepository.update(tx, id, updateData);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "RESOURCE_UPDATED",
          entityType: "resources",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getClientIp(req),
        });
        return updated;
      });

      res.json({ resource: updated });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /api/resources/:id — ADMIN only (soft delete) */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const session = req.session.user!;
      const old = await ResourcesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Recurso não encontrado.");

      await db.transaction(async (tx) => {
        await ResourcesRepository.update(tx, id, { status: "INACTIVE" });
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "RESOURCE_DEACTIVATED",
          entityType: "resources",
          entityId: id,
          oldData: old,
          ipAddress: getClientIp(req),
        });
      });

      res.status(200).json({ message: "Recurso desativado com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
