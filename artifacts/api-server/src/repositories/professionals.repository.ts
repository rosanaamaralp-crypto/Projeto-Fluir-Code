import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { professionals } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

export interface ProfessionalRow {
  id: string;
  userId: string;
  specialty: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ProfessionalsRepository = {
  async findById(db: DB, id: string): Promise<ProfessionalRow | null> {
    const rows = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findByUserId(db: DB, userId: string): Promise<ProfessionalRow | null> {
    const rows = await db
      .select()
      .from(professionals)
      .where(eq(professionals.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findAll(db: DB, onlyActive = false): Promise<ProfessionalRow[]> {
    if (onlyActive) {
      return db
        .select()
        .from(professionals)
        .where(eq(professionals.status, "ACTIVE"));
    }
    return db.select().from(professionals);
  },

  async create(
    db: DB,
    data: { userId: string; specialty?: string | null; bio?: string | null },
  ): Promise<ProfessionalRow> {
    const rows = await db
      .insert(professionals)
      .values({
        userId: data.userId,
        specialty: data.specialty ?? null,
        bio: data.bio ?? null,
      })
      .returning();
    return rows[0]!;
  },

  async update(
    db: DB,
    id: string,
    data: Partial<{ specialty: string | null; bio: string | null; status: string }>,
  ): Promise<ProfessionalRow | null> {
    const rows = await db
      .update(professionals)
      .set(data)
      .where(eq(professionals.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
