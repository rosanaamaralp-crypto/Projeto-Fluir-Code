import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ServicesRepository } from "../repositories/services.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

export const ServicesController = {
  /** GET /api/services */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const onlyActive = session.roleId !== ROLES.ADMIN;
      const list = await ServicesRepository.findAll(db, onlyActive);
      res.json({ services: list });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/services/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const svc = await ServicesRepository.findById(db, req.params["id"]!);
      if (!svc) throw new NotFoundError("Serviço não encontrado.");
      res.json({ service: svc });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/services — ADMIN only */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { name, description, durationMinutes, price, allowedModalities } =
        req.body as {
          name: string;
          description?: string;
          durationMinutes: number;
          price: number;
          allowedModalities: string;
        };

      const svc = await db.transaction(async (tx) => {
        const svc = await ServicesRepository.create(tx as typeof db, {
          name, description, durationMinutes, price, allowedModalities,
        });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "SERVICE_CREATED",
          entityType: "services",
          entityId: svc.id,
          newData: svc,
          ipAddress: getIp(req),
        });
        return svc;
      });

      res.status(201).json({ service: svc });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/services/:id — ADMIN only */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"]!;
      const session = req.session.user!;
      const old = await ServicesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Serviço não encontrado.");

      const { name, description, durationMinutes, price, allowedModalities, status } =
        req.body as Record<string, unknown>;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData["name"] = name;
      if (description !== undefined) updateData["description"] = description;
      if (durationMinutes !== undefined) updateData["durationMinutes"] = durationMinutes;
      if (price !== undefined) updateData["price"] = String(price);
      if (allowedModalities !== undefined) updateData["allowedModalities"] = allowedModalities;
      if (status !== undefined) updateData["status"] = status;

      const updated = await db.transaction(async (tx) => {
        const updated = await ServicesRepository.update(tx as typeof db, id, updateData as never);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "SERVICE_UPDATED",
          entityType: "services",
          entityId: id,
          oldData: old,
          newData: updated,
          ipAddress: getIp(req),
        });
        return updated;
      });

      res.json({ service: updated });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /api/services/:id — ADMIN only (soft delete) */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"]!;
      const session = req.session.user!;
      const old = await ServicesRepository.findById(db, id);
      if (!old) throw new NotFoundError("Serviço não encontrado.");

      await db.transaction(async (tx) => {
        await ServicesRepository.update(tx as typeof db, id, { status: "INACTIVE" });
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "SERVICE_DEACTIVATED",
          entityType: "services",
          entityId: id,
          oldData: old,
          ipAddress: getIp(req),
        });
      });

      res.status(200).json({ message: "Serviço desativado com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
