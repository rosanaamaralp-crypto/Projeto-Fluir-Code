import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { users } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

export interface UserRow {
  id: string;
  roleId: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Campos seguros: nunca inclui password_hash
const safeColumns = {
  id: users.id,
  roleId: users.roleId,
  name: users.name,
  email: users.email,
  phone: users.phone,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export const UsersRepository = {
  /** Busca usuário por email (case-insensitive) — inclui password_hash para verificação de login */
  async findByEmailForAuth(db: DB, email: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Busca usuário por ID — sem password_hash */
  async findById(db: DB, id: string): Promise<UserRow | null> {
    const rows = await db
      .select(safeColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Cria usuário — retorna sem password_hash */
  async create(
    db: DB,
    data: {
      roleId: number;
      name: string;
      email: string;
      passwordHash: string;
      phone?: string | null;
    },
  ): Promise<UserRow> {
    const rows = await db
      .insert(users)
      .values({
        roleId: data.roleId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
      })
      .returning(safeColumns);
    return rows[0]!;
  },

  /** Atualiza last_login_at */
  async updateLastLogin(db: DB, id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  },

  /** Atualiza campos do usuário — sem password_hash */
  async update(
    db: DB,
    id: string,
    data: Partial<{ name: string; phone: string | null; status: string }>,
  ): Promise<UserRow | null> {
    const rows = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning(safeColumns);
    return rows[0] ?? null;
  },
};
