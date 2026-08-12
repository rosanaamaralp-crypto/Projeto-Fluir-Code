import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { services } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string; // numeric do Drizzle retorna string
  allowedModalities: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ServicesRepository = {
  async findById(db: DB, id: string): Promise<ServiceRow | null> {
    const rows = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findAll(db: DB, onlyActive = false): Promise<ServiceRow[]> {
    if (onlyActive) {
      return db.select().from(services).where(eq(services.status, "ACTIVE"));
    }
    return db.select().from(services);
  },

  async create(
    db: DB,
    data: {
      name: string;
      description?: string | null;
      durationMinutes: number;
      price: number;
      allowedModalities: string;
    },
  ): Promise<ServiceRow> {
    const rows = await db
      .insert(services)
      .values({
        name: data.name,
        description: data.description ?? null,
        durationMinutes: data.durationMinutes,
        price: String(data.price),
        allowedModalities: data.allowedModalities,
      })
      .returning();
    return rows[0]!;
  },

  async update(
    db: DB,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      durationMinutes: number;
      price: string;
      allowedModalities: string;
      status: string;
    }>,
  ): Promise<ServiceRow | null> {
    const rows = await db
      .update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
