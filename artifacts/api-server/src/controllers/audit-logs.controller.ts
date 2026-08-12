/**
 * AuditLogsController — controller fino.
 *
 * F5.7 — GET /api/audit-logs (Doc 16 §53 / Doc 17 FASE 17 / RN-063, RN-064)
 * Acesso restrito a ADMIN (aplicado no router via requireAdmin).
 * NÃO gera novo audit log ao consultar audit logs (evita recursão).
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { mapDbError } from "../lib/errors.js";
import type { ListAuditLogsQuery } from "../validators/audit-logs.validator.js";

export const AuditLogsController = {
  /** GET /api/audit-logs */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListAuditLogsQuery;
      const { page, limit } = query;

      const { data, total } = await AuditLogsRepository.findMany(db, query);

      const totalPages = Math.ceil(total / limit);

      res.json({
        data,
        pagination: { page, limit, total, totalPages },
      });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
