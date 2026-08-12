import { eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { resources } from "@workspace/db";

export interface ResourceRow {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ResourcesRepository = {
  async findById(db: DB, id: string): Promise<ResourceRow | null> {
    const rows = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findAll(db: DB, onlyActive = false): Promise<ResourceRow[]> {
    if (onlyActive) {
      return db.select().from(resources).where(eq(resources.status, "ACTIVE"));
    }
    return db.select().from(resources);
  },

  async create(
    db: DB,
    data: { name: string; type: string },
  ): Promise<ResourceRow> {
    const rows = await db
      .insert(resources)
      .values({ name: data.name, type: data.type })
      .returning();
    return rows[0]!;
  },

  async update(
    db: DB,
    id: string,
    data: Partial<{ name: string; type: string; status: string }>,
  ): Promise<ResourceRow | null> {
    const rows = await db
      .update(resources)
      .set(data)
      .where(eq(resources.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
