import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ResourcesRepository } from "../repositories/resources.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

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
      const res_ = await ResourcesRepository.findById(db, req.params["id"]!);
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
        const resource = await ResourcesRepository.create(tx as typeof db, { name, type });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "RESOURCE_CREATED",
          entityType: "resources",
          entityId: resource.id,
          newData: resource,
          ipAddress: getIp(req),
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
      const id = req.params["id"]!;
      const session = req.session.user!;
      const old = await ResourcesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Recurso não encontrado.");

      const { name, type, status } = req.body as Record<string, string | undefined>;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData["name"] = name;
      if (type !== undefined) updateData["type"] = type;
      if (status !== undefined) updateData["status"] = status;

      const updated = await db.transaction(async (tx) => {
        const updated = await ResourcesRepository.update(tx as typeof db, id, updateData as never);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "RESOURCE_UPDATED",
          entityType: "resources",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getIp(req),
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
      const id = req.params["id"]!;
      const session = req.session.user!;
      const old = await ResourcesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Recurso não encontrado.");

      await db.transaction(async (tx) => {
        await ResourcesRepository.update(tx as typeof db, id, { status: "INACTIVE" });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "RESOURCE_DEACTIVATED",
          entityType: "resources",
          entityId: id,
          oldData: old,
          ipAddress: getIp(req),
        });
      });

      res.status(200).json({ message: "Recurso desativado com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
