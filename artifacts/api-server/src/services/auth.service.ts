import bcrypt from "bcrypt";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { UsersRepository } from "../repositories/users.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import { UnauthorizedError } from "../lib/errors.js";

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
