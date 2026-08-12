import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { UsersRepository } from "../repositories/users.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { AuthService } from "../services/auth.service.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

async function assertOwnership(req: Request, clientId: string): Promise<void> {
  const session = req.session.user!;
  if (session.roleId === ROLES.ADMIN) return;

  const client = await ClientsRepository.findById(db, clientId);
  if (!client) throw new NotFoundError("Cliente não encontrado.");
  if (client.userId !== session.userId) throw new ForbiddenError();
}

export const ClientsController = {
  /** GET /api/clients — ADMIN lista todos; CLIENT vê o próprio */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      if (session.roleId === ROLES.ADMIN) {
        const all = await ClientsRepository.findAll(db);
        res.json({ clients: all });
        return;
      }
      // CLIENT: retorna apenas o próprio
      const own = await ClientsRepository.findByUserId(db, session.userId);
      res.json({ clients: own ? [own] : [] });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/clients/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertOwnership(req, req.params["id"]!);
      const client = await ClientsRepository.findById(db, req.params["id"]!);
      if (!client) throw new NotFoundError("Cliente não encontrado.");
      res.json({ client });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/clients — ADMIN only; cria user + client em transaction */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { name, email, password, phone, birthDate, notes } = req.body as {
        name: string;
        email: string;
        password: string;
        phone?: string;
        birthDate?: string;
        notes?: string;
      };

      const passwordHash = await AuthService.hashPassword(password);

      const { user, client } = await db.transaction(async (tx) => {
        const user = await UsersRepository.create(tx as typeof db, {
          roleId: ROLES.CLIENT,
          name,
          email,
          passwordHash,
          phone: phone ?? null,
        });

        const client = await ClientsRepository.create(tx as typeof db, {
          userId: user.id,
          birthDate: birthDate ?? null,
          notes: notes ?? null,
        });

        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "CLIENT_CREATED",
          entityType: "clients",
          entityId: client.id,
          newData: { user, client },
          ipAddress: getIp(req),
        });

        return { user, client };
      });

      res.status(201).json({ user, client });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/clients/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"]!;
      await assertOwnership(req, id);

      const session = req.session.user!;
      const client = await ClientsRepository.findById(db, id);
      if (!client) throw new NotFoundError("Cliente não encontrado.");

      const { birthDate, notes, status } = req.body as {
        birthDate?: string;
        notes?: string;
        status?: string;
      };

      // Apenas ADMIN pode alterar status
      const isAdmin = session.roleId === ROLES.ADMIN;
      const updateData: Record<string, unknown> = {};
      if (birthDate !== undefined) updateData["birthDate"] = birthDate;
      if (notes !== undefined) updateData["notes"] = notes;
      if (status !== undefined && isAdmin) updateData["status"] = status;

      // Nenhum campo permitido foi enviado — retornar cliente atual sem atualizar
      if (Object.keys(updateData).length === 0) {
        res.json({ client });
        return;
      }

      const updated = await db.transaction(async (tx) => {
        const updated = await ClientsRepository.update(tx as typeof db, id, updateData);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "CLIENT_UPDATED",
          entityType: "clients",
          entityId: id,
          oldData: client,
          newData: updated,
          ipAddress: getIp(req),
        });
        return updated;
      });

      res.json({ client: updated });
    } catch (err) {
      next(err);
    }
  },
};
