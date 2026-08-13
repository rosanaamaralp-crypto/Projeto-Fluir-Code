import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AuthService } from "../services/auth.service.js";
import { logger } from "../lib/logger.js";
import { getClientIp } from "../lib/ip.js";

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
      AuthService.recordLogin(db, user.id, getClientIp(req)).catch((err) =>
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
        AuthService.recordLogout(db, userId, getClientIp(req)).catch((err) =>
          logger.error({ err }, "Failed to record logout audit"),
        );
      }

      res.status(200).json({ message: "Logout realizado com sucesso." });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/auth/forgot-password — T-003 */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email: string };

      // Base do link de redefinição: configurável por ambiente (produção),
      // com fallback para a origem do frontend em desenvolvimento no Replit.
      const configured = process.env["APP_PUBLIC_URL"];
      const devDomain = process.env["REPLIT_DEV_DOMAIN"];
      const base = configured ?? (devDomain ? `https://${devDomain}/fluir-da-vida` : "http://localhost:5173");
      const resetUrlBase = `${base.replace(/\/$/, "")}/reset-password`;

      // Fire-and-forget: a resposta NÃO aguarda consulta/envio de e-mail —
      // tempo de resposta idêntico para e-mail existente e inexistente
      // (mitiga enumeração por latência).
      AuthService.requestPasswordReset(db, email, resetUrlBase).catch((err) =>
        logger.error({ err }, "T-003: falha no processamento de forgot-password"),
      );

      // Resposta sempre idêntica — não revela se o e-mail existe.
      res.status(200).json({
        message: "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.",
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/auth/reset-password — T-003 */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as { token: string; password: string };
      await AuthService.resetPassword(db, token, password);
      res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/auth/me */
  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ user: req.session.user });
  },
};
