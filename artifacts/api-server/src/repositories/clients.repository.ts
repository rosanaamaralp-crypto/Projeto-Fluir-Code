import { eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { clients } from "@workspace/db";

export interface ClientRow {
  id: string;
  userId: string;
  birthDate: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

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
