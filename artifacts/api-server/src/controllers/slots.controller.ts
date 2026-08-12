import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { SlotsService } from "../services/slots.service.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { ROLES } from "../middlewares/require-role.js";

export const SlotsController = {
  /** GET /api/slots?professionalId=&serviceId=&date=&modality= */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { professionalId, serviceId, date, modality } = req.query as {
        professionalId: string;
        serviceId: string;
        date: string;
        modality?: "IN_PERSON" | "HOME_CARE";
      };

      const session = req.session.user!;

      // Se o usuário autenticado for CLIENT, checar conflitos do próprio cliente
      let clientId: string | undefined;
      if (session.roleId === ROLES.CLIENT) {
        const client = await ClientsRepository.findByUserId(db, session.userId);
        if (client) clientId = client.id;
      }

      const slots = await SlotsService.getAvailableSlots(db, {
        professionalId,
        serviceId,
        date,
        modality,
        clientId,
      });

      res.json({ slots, date, professionalId, serviceId, modality: modality ?? null });
    } catch (err) {
      next(err);
    }
  },
};
