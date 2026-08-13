/**
 * MeProfessionalClientsController — T-023 / T-025
 *
 * GET /api/me/professional/clients        — lista clientes do profissional autenticado
 * GET /api/me/professional/clients/:clientId — detalhe de um cliente com histórico
 *
 * Ownership: professionalId derivado EXCLUSIVAMENTE da sessão.
 * Nunca aceita professionalId do frontend como parâmetro de autorização.
 * IDOR: findByIdForProfessional verifica via JOIN que o cliente tem atendimento
 *       com o profissional autenticado — 404 se não tiver.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { AddressesRepository } from "../repositories/addresses.repository.js";
import { AppointmentsRepository } from "../repositories/appointments.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { NotFoundError, mapDbError } from "../lib/errors.js";

export const MeProfessionalClientsController = {
  /**
   * GET /api/me/professional/clients
   *
   * Retorna lista de clientes únicos que têm atendimentos com o profissional
   * autenticado, enriquecidos com name/email/phone via JOIN com users.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const prof = await ProfessionalsRepository.findByUserId(db, session.userId);
      if (!prof) throw new NotFoundError("Perfil profissional não encontrado.");

      const clients = await ClientsRepository.findByProfessionalId(db, prof.id);
      res.json({ clients });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /**
   * GET /api/me/professional/clients/:clientId
   *
   * Retorna detalhe de um cliente específico, incluindo:
   * - dados do cliente (name, email, phone, birthDate)
   * - endereço (se existir — necessário para Home Care)
   * - histórico de atendimentos com este profissional
   *
   * IDOR: verifica via JOIN que o cliente possui atendimento com o profissional.
   * Se não houver relacionamento → 404 (igual a não encontrado, sem vazar dados).
   */
  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const { clientId } = req.params as { clientId: string };

      const prof = await ProfessionalsRepository.findByUserId(db, session.userId);
      if (!prof) throw new NotFoundError("Perfil profissional não encontrado.");

      const client = await ClientsRepository.findByIdForProfessional(db, clientId, prof.id);
      if (!client) throw new NotFoundError("Cliente não encontrado.");

      const [address, appointments] = await Promise.all([
        AddressesRepository.findByClientId(db, clientId),
        AppointmentsRepository.findByClientAndProfessional(db, clientId, prof.id),
      ]);

      res.json({ client, address: address ?? null, appointments });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
