/**
 * P8: PATCH /api/clients/:id usa schemas distintos por role.
 * UpdateClientSchemaSelf (sem status) para CLIENT.
 * UpdateClientSchemaAdmin (com status) para ADMIN.
 * O schema é selecionado no controller antes da validação.
 *
 * Fase 13 — Resolução de bloqueadores:
 * list() e get() retornam dados enriquecidos (com name/email/phone via JOIN com users).
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { UsersRepository } from "../repositories/users.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { AuthService } from "../services/auth.service.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import {
  UpdateClientSchemaSelf,
  UpdateClientSchemaAdmin,
} from "../validators/clients.validator.js";
import { formatZodError } from "../middlewares/validate.js";
import { getClientIp } from "../lib/ip.js";

async function assertOwnership(req: Request, clientId: string): Promise<void> {
  const session = req.session.user!;
  if (session.roleId === ROLES.ADMIN) return;

  const client = await ClientsRepository.findById(db, clientId);
  if (!client) throw new NotFoundError("Cliente não encontrado.");
  if (client.userId !== session.userId) throw new ForbiddenError();
}

export const ClientsController = {
  /** GET /api/clients — ADMIN lista todos (com nome/email/phone); CLIENT vê o próprio */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      if (session.roleId === ROLES.ADMIN) {
        const all = await ClientsRepository.findAllWithUser(db);
        res.json({ clients: all });
        return;
      }
      // CLIENT: retorna apenas o próprio, enriquecido
      const own = await ClientsRepository.findByUserIdWithUser(db, session.userId);
      res.json({ clients: own ? [own] : [] });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/clients/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await assertOwnership(req, id);
      const client = await ClientsRepository.findByIdWithUser(db, id);
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
        const user = await UsersRepository.create(tx, {
          roleId: ROLES.CLIENT,
          name,
          email,
          passwordHash,
          phone: phone ?? null,
        });

        const client = await ClientsRepository.create(tx, {
          userId: user.id,
          birthDate: birthDate ?? null,
          notes: notes ?? null,
        });

        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "CLIENT_CREATED",
          entityType: "clients",
          entityId: client.id,
          newData: { user, client },
          ipAddress: getClientIp(req),
        });

        return { user, client };
      });

      res.status(201).json({ user, client });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/clients/:id
   *
   * Seleção de schema por role (P8):
   * - ADMIN: UpdateClientSchemaAdmin (inclui status)
   * - CLIENT/outros: UpdateClientSchemaSelf (sem status)
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await assertOwnership(req, id);

      const session = req.session.user!;
      const isAdmin = session.roleId === ROLES.ADMIN;

      const schema = isAdmin ? UpdateClientSchemaAdmin : UpdateClientSchemaSelf;
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        next(new ValidationError(formatZodError(parseResult.error), parseResult.error.issues));
        return;
      }
      const body = parseResult.data;

      const client = await ClientsRepository.findById(db, id);
      if (!client) throw new NotFoundError("Cliente não encontrado.");

      const updateData: Record<string, unknown> = {};
      if (body.birthDate !== undefined) updateData["birthDate"] = body.birthDate;
      if (body.notes !== undefined) updateData["notes"] = body.notes;
      if ("status" in body && body.status !== undefined) updateData["status"] = body.status;

      if (Object.keys(updateData).length === 0) {
        res.json({ client });
        return;
      }

      const updated = await db.transaction(async (tx) => {
        const updated = await ClientsRepository.update(tx, id, updateData);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "CLIENT_UPDATED",
          entityType: "clients",
          entityId: id,
          oldData: client,
          newData: updated,
          ipAddress: getClientIp(req),
        });
        return updated;
      });

      res.json({ client: updated });
    } catch (err) {
      next(err);
    }
  },
};
