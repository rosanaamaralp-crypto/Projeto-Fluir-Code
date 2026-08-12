import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
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

async function assertOwnership(req: Request, profId: string): Promise<void> {
  const session = req.session.user!;
  if (session.roleId === ROLES.ADMIN) return;

  const prof = await ProfessionalsRepository.findById(db, profId);
  if (!prof) throw new NotFoundError("Profissional não encontrado.");
  if (prof.userId !== session.userId) throw new ForbiddenError();
}

export const ProfessionalsController = {
  /** GET /api/professionals */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const onlyActive = session.roleId !== ROLES.ADMIN;
      const all = await ProfessionalsRepository.findAll(db, onlyActive);
      res.json({ professionals: all });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/professionals/:id */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prof = await ProfessionalsRepository.findById(db, req.params["id"]!);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");
      res.json({ professional: prof });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/professionals — ADMIN only */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { name, email, password, phone, specialty, bio } = req.body as {
        name: string;
        email: string;
        password: string;
        phone?: string;
        specialty?: string;
        bio?: string;
      };

      const passwordHash = await AuthService.hashPassword(password);

      const { user, professional } = await db.transaction(async (tx) => {
        const user = await UsersRepository.create(tx as typeof db, {
          roleId: ROLES.PROFESSIONAL,
          name,
          email,
          passwordHash,
          phone: phone ?? null,
        });

        const professional = await ProfessionalsRepository.create(tx as typeof db, {
          userId: user.id,
          specialty: specialty ?? null,
          bio: bio ?? null,
        });

        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "PROFESSIONAL_CREATED",
          entityType: "professionals",
          entityId: professional.id,
          newData: { user, professional },
          ipAddress: getIp(req),
        });

        return { user, professional };
      });

      res.status(201).json({ user, professional });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/professionals/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"]!;
      await assertOwnership(req, id);

      const session = req.session.user!;
      const prof = await ProfessionalsRepository.findById(db, id);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");

      const { specialty, bio, status } = req.body as {
        specialty?: string;
        bio?: string;
        status?: string;
      };

      const isAdmin = session.roleId === ROLES.ADMIN;
      const updateData: Record<string, unknown> = {};
      if (specialty !== undefined) updateData["specialty"] = specialty;
      if (bio !== undefined) updateData["bio"] = bio;
      if (status !== undefined && isAdmin) updateData["status"] = status;

      // Também atualizar nome/telefone do user (ADMIN ou próprio)
      const { name, phone } = req.body as { name?: string; phone?: string };
      if (name !== undefined || phone !== undefined) {
        await UsersRepository.update(db, prof.userId, {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
        });
      }

      const updated = await db.transaction(async (tx) => {
        const updated = await ProfessionalsRepository.update(tx as typeof db, id, updateData);
        await AuditLogsRepository.create(tx as typeof db, {
          userId: session.userId,
          action: "PROFESSIONAL_UPDATED",
          entityType: "professionals",
          entityId: id,
          oldData: prof,
          newData: updated,
          ipAddress: getIp(req),
        });
        return updated;
      });

      res.json({ professional: updated });
    } catch (err) {
      next(err);
    }
  },
};
