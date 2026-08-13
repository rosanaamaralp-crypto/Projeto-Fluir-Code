import { eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { professionals, users } from "@workspace/db";

export interface ProfessionalRow {
  id: string;
  userId: string;
  specialty: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Enriched professional row — joins users table to include name, email, phone.
 *  name/email typed as string | null because Drizzle infers nullable for LEFT JOIN columns.
 *  In practice, every professional row has a valid users FK, so these are always non-null.
 */
export interface ProfessionalWithUser {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const withUserSelect = {
  id: professionals.id,
  userId: professionals.userId,
  name: users.name,
  email: users.email,
  phone: users.phone,
  specialty: professionals.specialty,
  bio: professionals.bio,
  status: professionals.status,
  createdAt: professionals.createdAt,
  updatedAt: professionals.updatedAt,
} as const;

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

  /** Returns all professionals joined with users (name, email, phone). */
  async findAllWithUser(db: DB, onlyActive = false): Promise<ProfessionalWithUser[]> {
    const query = db
      .select(withUserSelect)
      .from(professionals)
      .leftJoin(users, eq(professionals.userId, users.id));
    if (onlyActive) {
      return query.where(eq(professionals.status, "ACTIVE"));
    }
    return query;
  },

  /** Returns a single professional joined with users. */
  async findByIdWithUser(db: DB, id: string): Promise<ProfessionalWithUser | null> {
    const rows = await db
      .select(withUserSelect)
      .from(professionals)
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(eq(professionals.id, id))
      .limit(1);
    return rows[0] ?? null;
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
