/**
 * ReportsController — controller fino.
 *
 * FASE 7 — GET /api/reports/appointments | GET /api/reports/resources
 * Doc 16 §51–52. Acesso restrito a ADMIN.
 * Leitura pura: sem escrita, sem audit log.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { ReportsRepository } from "../repositories/reports.repository.js";
import { mapDbError } from "../lib/errors.js";
import type {
  ReportAppointmentsQuery,
  ReportResourcesQuery,
} from "../validators/reports.validator.js";

export const ReportsController = {
  /** GET /api/reports/appointments */
  async appointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ReportAppointmentsQuery;
      const { page, limit } = query;

      const { data, summary, total } = await ReportsRepository.getAppointmentsReport(db, query);
      const totalPages = Math.ceil(total / limit);

      res.json({
        data,
        summary,
        pagination: { page, limit, total, totalPages },
      });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /** GET /api/reports/resources */
  async resources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ReportResourcesQuery;

      const data = await ReportsRepository.getResourcesReport(db, query);

      res.json({
        data,
        period: {
          startDate: query.startDate ?? null,
          endDate: query.endDate ?? null,
        },
      });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
