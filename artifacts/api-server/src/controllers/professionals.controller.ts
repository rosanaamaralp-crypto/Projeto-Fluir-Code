/**
 * P2: UsersRepository.update (name/phone) movido para dentro da transação.
 *     Atomicidade garantida: users + professionals + audit_logs em uma única tx.
 * P3: Usa os dados já validados pelo UpdateProfessionalSchema (name e phone
 *     incluídos), sem segundo cast de req.body.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { UsersRepository } from "../repositories/users.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { AuthService } from "../services/auth.service.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import type { UpdateProfessionalInput } from "../validators/professionals.validator.js";
import { getClientIp } from "../lib/ip.js";

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
      const { id } = req.params as { id: string };
      const prof = await ProfessionalsRepository.findById(db, id);
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
        const user = await UsersRepository.create(tx, {
          roleId: ROLES.PROFESSIONAL,
          name,
          email,
          passwordHash,
          phone: phone ?? null,
        });

        const professional = await ProfessionalsRepository.create(tx, {
          userId: user.id,
          specialty: specialty ?? null,
          bio: bio ?? null,
        });

        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "PROFESSIONAL_CREATED",
          entityType: "professionals",
          entityId: professional.id,
          newData: { user, professional },
          ipAddress: getClientIp(req),
        });

        return { user, professional };
      });

      res.status(201).json({ user, professional });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/professionals/:id
   *
   * P2: users + professionals + audit_logs dentro de uma única transação.
   * P3: Campos name e phone validados pelo UpdateProfessionalSchema antes de chegar aqui.
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await assertOwnership(req, id);

      const session = req.session.user!;
      const isAdmin = session.roleId === ROLES.ADMIN;

      const prof = await ProfessionalsRepository.findById(db, id);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");

      // req.body já foi validado pelo validateBody(UpdateProfessionalSchema) na rota
      // que inclui name, phone, specialty, bio, status com limites corretos
      const { name, phone, specialty, bio, status } = req.body as UpdateProfessionalInput;

      const profUpdateData: Partial<{ specialty: string | null; bio: string | null; status: string }> = {};
      if (specialty !== undefined) profUpdateData.specialty = specialty;
      if (bio !== undefined) profUpdateData.bio = bio;
      if (status !== undefined && isAdmin) profUpdateData.status = status;

      const hasUserUpdate = name !== undefined || phone !== undefined;
      const hasProfUpdate = Object.keys(profUpdateData).length > 0;

      // Executar todas as operações dentro de uma única transação (P2)
      const updated = await db.transaction(async (tx) => {
        // 1. Atualizar users (name/phone) — dentro da mesma tx
        if (hasUserUpdate) {
          await UsersRepository.update(tx, prof.userId, {
            ...(name !== undefined ? { name } : {}),
            ...(phone !== undefined ? { phone: phone ?? null } : {}),
          });
        }

        // 2. Atualizar professionals (specialty/bio/status)
        const updated = hasProfUpdate
          ? await ProfessionalsRepository.update(tx, id, profUpdateData)
          : await ProfessionalsRepository.findById(tx, id);

        // 3. Audit log — dentro da mesma tx
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "PROFESSIONAL_UPDATED",
          entityType: "professionals",
          entityId: id,
          oldData: prof,
          newData: updated,
          ipAddress: getClientIp(req),
        });

        return updated;
      });

      res.json({ professional: updated });
    } catch (err) {
      next(err);
    }
  },
};
