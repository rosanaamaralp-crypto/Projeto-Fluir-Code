import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../lib/errors.js";

/**
 * Garante que o request tem uma sessão ativa.
 * Retorna 401 se não houver sessão autenticada.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session?.user) {
    next(new UnauthorizedError());
    return;
  }
  next();
}
