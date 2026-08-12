/**
 * DashboardService — resolve RBAC e delega ao DashboardRepository.
 *
 * FASE 6 (Doc 16 §48–50, Doc 03, RN-080):
 * - Admin: nenhuma resolução de ID necessária; acessa dados globais.
 * - Professional: PROFESSIONAL usa userId da sessão para obter professionalId;
 *   ADMIN deve fornecer ?professionalId (obrigatório; 400 se ausente; 404 se inexistente).
 * - Client: CLIENT usa userId da sessão para obter clientId;
 *   ADMIN deve fornecer ?clientId (obrigatório; 400 se ausente; 404 se inexistente).
 * - Leitura pura: sem escrita, sem audit log, sem transação.
 */
import { ROLES } from "../middlewares/require-role.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import type {
  AdminDashboardData,
  ProfessionalDashboardData,
  ClientDashboardData,
} from "../repositories/dashboard.repository.js";

/** Calcula início e fim do dia corrente em UTC. */
function todayBounds(now: Date): { todayStart: Date; todayEnd: Date } {
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);
  return { todayStart, todayEnd };
}

export const DashboardService = {
  /** GET /api/dashboard/admin — apenas ADMIN */
  async getAdminDashboard(db: DB): Promise<AdminDashboardData> {
    const now = new Date();
    const { todayStart, todayEnd } = todayBounds(now);
    return DashboardRepository.getAdminDashboard(db, { now, todayStart, todayEnd });
  },

  /**
   * GET /api/dashboard/professional
   * - PROFESSIONAL: usa userId da sessão para resolver professionalId.
   * - ADMIN: requer professionalIdParam (400 se ausente, 404 se inexistente).
   * - Proteção IDOR: PROFESSIONAL nunca usa professionalIdParam — usa sempre a sessão.
   */
  async getProfessionalDashboard(
    db: DB,
    {
      sessionUserId,
      sessionRoleId,
      professionalIdParam,
    }: {
      sessionUserId: string;
      sessionRoleId: number;
      professionalIdParam?: string;
    },
  ): Promise<ProfessionalDashboardData> {
    let professionalId: string;

    if (sessionRoleId === ROLES.ADMIN) {
      if (!professionalIdParam) {
        throw new ValidationError("professionalId é obrigatório para ADMIN.");
      }
      const prof = await ProfessionalsRepository.findById(db, professionalIdParam);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");
      professionalId = professionalIdParam;
    } else {
      // PROFESSIONAL — sempre usa a própria sessão; ignora qualquer query param
      const prof = await ProfessionalsRepository.findByUserId(db, sessionUserId);
      if (!prof) throw new NotFoundError("Profissional não encontrado.");
      professionalId = prof.id;
    }

    const now = new Date();
    const { todayStart, todayEnd } = todayBounds(now);
    return DashboardRepository.getProfessionalDashboard(db, {
      professionalId,
      now,
      todayStart,
      todayEnd,
    });
  },

  /**
   * GET /api/dashboard/client
   * - CLIENT: usa userId da sessão para resolver clientId.
   * - ADMIN: requer clientIdParam (400 se ausente, 404 se inexistente).
   * - Proteção IDOR: CLIENT nunca usa clientIdParam — usa sempre a sessão.
   */
  async getClientDashboard(
    db: DB,
    {
      sessionUserId,
      sessionRoleId,
      clientIdParam,
    }: {
      sessionUserId: string;
      sessionRoleId: number;
      clientIdParam?: string;
    },
  ): Promise<ClientDashboardData> {
    let clientId: string;

    if (sessionRoleId === ROLES.ADMIN) {
      if (!clientIdParam) {
        throw new ValidationError("clientId é obrigatório para ADMIN.");
      }
      const client = await ClientsRepository.findById(db, clientIdParam);
      if (!client) throw new NotFoundError("Cliente não encontrado.");
      clientId = clientIdParam;
    } else {
      // CLIENT — sempre usa a própria sessão; ignora qualquer query param
      const client = await ClientsRepository.findByUserId(db, sessionUserId);
      if (!client) throw new NotFoundError("Cliente não encontrado.");
      clientId = client.id;
    }

    const now = new Date();
    return DashboardRepository.getClientDashboard(db, { clientId, now });
  },
};
