import { eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { clients, users } from "@workspace/db";

export interface ClientRow {
  id: string;
  userId: string;
  birthDate: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Enriched client row — joins users table to include name, email, phone.
 *  name/email typed as string | null because Drizzle infers nullable for LEFT JOIN columns.
 *  In practice, every client row has a valid users FK, so these are always non-null.
 */
export interface ClientWithUser {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const withUserSelect = {
  id: clients.id,
  userId: clients.userId,
  name: users.name,
  email: users.email,
  phone: users.phone,
  birthDate: clients.birthDate,
  notes: clients.notes,
  status: clients.status,
  createdAt: clients.createdAt,
  updatedAt: clients.updatedAt,
} as const;

export const ClientsRepository = {
  async findById(db: DB, id: string): Promise<ClientRow | null> {
    const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByUserId(db: DB, userId: string): Promise<ClientRow | null> {
    const rows = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findAll(db: DB): Promise<ClientRow[]> {
    return db.select().from(clients);
  },

  /** Returns all clients joined with users (name, email, phone). ADMIN only. */
  async findAllWithUser(db: DB): Promise<ClientWithUser[]> {
    return db
      .select(withUserSelect)
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id));
  },

  /** Returns a single client joined with users. */
  async findByIdWithUser(db: DB, id: string): Promise<ClientWithUser | null> {
    const rows = await db
      .select(withUserSelect)
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(eq(clients.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Returns a client by userId joined with users (for CLIENT self-view). */
  async findByUserIdWithUser(db: DB, userId: string): Promise<ClientWithUser | null> {
    const rows = await db
      .select(withUserSelect)
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(eq(clients.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(
    db: DB,
    data: { userId: string; birthDate?: string | null; notes?: string | null },
  ): Promise<ClientRow> {
    const rows = await db
      .insert(clients)
      .values({
        userId: data.userId,
        birthDate: data.birthDate ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    return rows[0]!;
  },

  async update(
    db: DB,
    id: string,
    data: Partial<{ birthDate: string | null; notes: string | null; status: string }>,
  ): Promise<ClientRow | null> {
    const rows = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
