import bcrypt from "bcrypt";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { UsersRepository } from "../repositories/users.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { UnauthorizedError } from "../lib/errors.js";
import { createResetToken, parseResetToken, verifyResetToken } from "../lib/password-reset.js";
import { sendMail } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";

const SALT_ROUNDS = 12;

type DB = NodePgDatabase<typeof schema>;

export const AuthService = {
  /** Hash de senha */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * Autenticação: email + senha.
   * Retorna o usuário (sem password_hash) se válido.
   * IMPORTANTE: resposta indistinguível para email inválido e senha errada.
   */
  async authenticate(
    db: DB,
    email: string,
    password: string,
  ) {
    const user = await UsersRepository.findByEmailForAuth(db, email);

    // Sempre executar bcrypt.compare para mitigar timing attacks.
    // Se o usuário não existe, comparamos contra um hash fixo e retornamos erro de qualquer forma.
    const hashToCompare = user?.passwordHash ?? "$2b$12$invalidhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const valid = await bcrypt.compare(password, hashToCompare);

    if (!user || !valid || user.status !== "ACTIVE") {
      throw new UnauthorizedError("Email ou senha inválidos.");
    }

    // Retornar sem password_hash
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  },

  /** Atualiza last_login_at e registra audit log de login */
  async recordLogin(
    db: DB,
    userId: string,
    ipAddress: string | null,
  ): Promise<void> {
    await UsersRepository.updateLastLogin(db, userId);
    await AuditLogsRepository.create(db, {
      userId,
      action: "USER_LOGIN",
      entityType: "users",
      entityId: userId,
      ipAddress,
    });
  },

  /**
   * T-003 — Solicita recuperação de senha.
   * NUNCA revela se o e-mail existe: sempre resolve sem erro para o chamador.
   * Envio de e-mail é best-effort com o link contendo o token stateless.
   */
  async requestPasswordReset(db: DB, email: string, resetUrlBase: string): Promise<void> {
    const user = await UsersRepository.findByEmailForAuth(db, email);
    if (!user || user.status !== "ACTIVE") {
      // Resposta indistinguível — não revelar existência do e-mail.
      return;
    }

    const token = createResetToken(user.id, user.passwordHash);
    const link = `${resetUrlBase}?token=${encodeURIComponent(token)}`;
    const ttlMinutes = process.env["PASSWORD_RESET_TTL_MINUTES"] ?? "60";

    try {
      await sendMail({
        to: user.email,
        subject: "Fluir da Vida — Recuperação de senha",
        text:
          `Olá, ${user.name}.\n\n` +
          `Recebemos uma solicitação para redefinir a sua senha.\n` +
          `Para criar uma nova senha, acesse o link abaixo (válido por ${ttlMinutes} minutos e de uso único):\n\n` +
          `${link}\n\n` +
          `Se você não solicitou esta alteração, ignore este e-mail — sua senha permanecerá inalterada.`,
      });
    } catch (err) {
      // Não propagar: resposta deve permanecer indistinguível para o chamador.
      logger.error({ err }, "T-003: falha no envio de e-mail de recuperação");
    }

    await AuditLogsRepository.create(db, {
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "users",
      entityId: user.id,
      ipAddress: null,
    });
  },

  /**
   * T-003 — Redefine a senha a partir de um token válido.
   * Token expira (TTL) e é de uso único (assinatura atrelada ao hash atual —
   * após a troca, tokens antigos deixam de validar).
   */
  async resetPassword(db: DB, token: string, newPassword: string): Promise<void> {
    const invalid = new UnauthorizedError("Token inválido ou expirado.");

    const parsed = parseResetToken(token);
    if (!parsed) throw invalid;

    const user = await UsersRepository.findByIdWithHash(db, parsed.userId);
    if (!user || user.status !== "ACTIVE") throw invalid;

    if (!verifyResetToken(parsed, user.passwordHash)) throw invalid;

    const passwordHash = await this.hashPassword(newPassword);
    // Update condicional: sob corrida com o mesmo token, só um reset vence.
    const updated = await UsersRepository.updatePasswordHash(
      db, user.id, passwordHash, user.passwordHash,
    );
    if (!updated) throw invalid;

    await AuditLogsRepository.create(db, {
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "users",
      entityId: user.id,
      ipAddress: null,
    });
  },

  /** Registra audit log de logout */
  async recordLogout(
    db: DB,
    userId: string,
    ipAddress: string | null,
  ): Promise<void> {
    await AuditLogsRepository.create(db, {
      userId,
      action: "USER_LOGOUT",
      entityType: "users",
      entityId: userId,
      ipAddress,
    });
  },
};
