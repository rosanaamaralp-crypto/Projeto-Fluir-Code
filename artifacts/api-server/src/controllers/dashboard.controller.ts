/**
 * DashboardController — controller fino.
 * Toda a lógica de negócio e resolução de RBAC estão no DashboardService.
 *
 * FASE 6 — GET /api/dashboard/admin | /professional | /client
 * Doc 16 §48–50.
 * Leitura pura: sem escrita, sem audit log.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { DashboardService } from "../services/dashboard.service.js";
import { mapDbError } from "../lib/errors.js";
import type {
  DashboardProfessionalQuery,
  DashboardClientQuery,
} from "../validators/dashboard.validator.js";

export const DashboardController = {
  /** GET /api/dashboard/admin */
  async adminDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await DashboardService.getAdminDashboard(db);
      res.json({ dashboard });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/dashboard/professional */
  async professionalDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const query = req.query as unknown as DashboardProfessionalQuery;

      const dashboard = await DashboardService.getProfessionalDashboard(db, {
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
        professionalIdParam: query.professionalId,
      });

      res.json({ dashboard });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/dashboard/client */
  async clientDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = req.session.user!;
      const query = req.query as unknown as DashboardClientQuery;

      const dashboard = await DashboardService.getClientDashboard(db, {
        sessionUserId: session.userId,
        sessionRoleId: session.roleId,
        clientIdParam: query.clientId,
      });

      res.json({ dashboard });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
