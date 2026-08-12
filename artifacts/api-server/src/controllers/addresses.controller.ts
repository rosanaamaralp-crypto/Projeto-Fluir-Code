import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AddressesRepository } from "../repositories/addresses.repository.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import { getClientIp } from "../lib/ip.js";

async function assertClientOwnership(req: Request, clientId: string): Promise<void> {
  const session = req.session.user!;
  if (session.roleId === ROLES.ADMIN) return;
  const client = await ClientsRepository.findById(db, clientId);
  if (!client) throw new NotFoundError("Cliente não encontrado.");
  if (client.userId !== session.userId) throw new ForbiddenError();
}

export const AddressesController = {
  /** GET /api/clients/:clientId/addresses */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params as { clientId: string };
      await assertClientOwnership(req, clientId);
      const address = await AddressesRepository.findByClientId(db, clientId);
      res.json({ address: address ?? null });
    } catch (err) {
      next(err);
    }
  },

  /** POST /PUT /api/clients/:clientId/addresses */
  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params as { clientId: string };
      await assertClientOwnership(req, clientId);

      const session = req.session.user!;
      const client = await ClientsRepository.findById(db, clientId);
      if (!client) throw new NotFoundError("Cliente não encontrado.");

      const old = await AddressesRepository.findByClientId(db, clientId);
      const body = req.body as {
        street: string; number: string; complement?: string;
        neighborhood: string; city: string; state: string;
        postalCode: string; reference?: string;
        latitude?: number; longitude?: number; isDefault?: boolean;
      };

      const address = await db.transaction(async (tx) => {
        const address = await AddressesRepository.upsert(tx, clientId, body);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: old ? "ADDRESS_UPDATED" : "ADDRESS_CREATED",
          entityType: "addresses",
          entityId: address.id,
          oldData: old,
          newData: address,
          ipAddress: getClientIp(req),
        });
        return address;
      });

      res.status(old ? 200 : 201).json({ address });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /api/clients/:clientId/addresses */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params as { clientId: string };
      await assertClientOwnership(req, clientId);

      const session = req.session.user!;
      const old = await AddressesRepository.findByClientId(db, clientId);
      if (!old) throw new NotFoundError("Endereço não encontrado.");

      await db.transaction(async (tx) => {
        await AddressesRepository.delete(tx, clientId);
        await AuditLogsRepository.create(tx, {
          userId: session.userId,
          action: "ADDRESS_DELETED",
          entityType: "addresses",
          entityId: old.id,
          oldData: old,
          ipAddress: getClientIp(req),
        });
      });

      res.status(200).json({ message: "Endereço removido com sucesso." });
    } catch (err) {
      next(err);
    }
  },
};
