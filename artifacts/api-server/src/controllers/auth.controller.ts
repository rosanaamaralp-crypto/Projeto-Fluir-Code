import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AuthService } from "../services/auth.service.js";
import { logger } from "../lib/logger.js";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

export const AuthController = {
  /** POST /api/auth/login */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const user = await AuthService.authenticate(db, email, password);

      // Regenerar session para prevenir session fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });

      req.session.user = {
        userId: user.id,
        roleId: user.roleId,
        name: user.name,
        email: user.email,
      };

      // Registrar login e atualizar last_login_at (fora da session — não bloqueia resposta)
      AuthService.recordLogin(db, user.id, getIp(req)).catch((err) =>
        logger.error({ err }, "Failed to record login audit"),
      );

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/auth/logout */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.session.user?.userId;

    try {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });

      res.clearCookie("connect.sid");

      if (userId) {
        AuthService.recordLogout(db, userId, getIp(req)).catch((err) =>
          logger.error({ err }, "Failed to record logout audit"),
        );
      }

      res.status(200).json({ message: "Logout realizado com sucesso." });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/auth/me */
  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ user: req.session.user });
  },
};
