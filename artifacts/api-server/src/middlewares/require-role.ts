import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export const ROLES = {
  ADMIN: 1,
  PROFESSIONAL: 2,
  CLIENT: 3,
} as const;

/**
 * Retorna um middleware que verifica se o usuário autenticado possui
 * pelo menos um dos roles permitidos.
 *
 * Sempre use requireAuth antes (ou use requireRole que já implica auth).
 */
export function requireRole(allowedRoleIds: number[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoleIds.includes(req.session.user.roleId)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

/** Atalho: apenas ADMIN */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireRole([ROLES.ADMIN])(req, res, next);
}

/** Atalho: ADMIN ou PROFESSIONAL */
export function requireProfessional(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireRole([ROLES.ADMIN, ROLES.PROFESSIONAL])(req, res, next);
}

/** Atalho: ADMIN ou CLIENT */
export function requireClient(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireRole([ROLES.ADMIN, ROLES.CLIENT])(req, res, next);
}
