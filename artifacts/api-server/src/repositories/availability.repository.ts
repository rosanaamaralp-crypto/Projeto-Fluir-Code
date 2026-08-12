import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { availability } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

export interface AvailabilityRow {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AvailabilityRepository = {
  async findByProfessionalId(
    db: DB,
    professionalId: string,
    onlyActive = false,
  ): Promise<AvailabilityRow[]> {
    const condition = onlyActive
      ? and(
          eq(availability.professionalId, professionalId),
          eq(availability.active, true),
        )
      : eq(availability.professionalId, professionalId);
    return db.select().from(availability).where(condition);
  },

  async findByProfessionalAndWeekday(
    db: DB,
    professionalId: string,
    weekday: number,
  ): Promise<AvailabilityRow[]> {
    return db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.professionalId, professionalId),
          eq(availability.weekday, weekday),
          eq(availability.active, true),
        ),
      );
  },

  async findById(db: DB, id: string): Promise<AvailabilityRow | null> {
    const rows = await db
      .select()
      .from(availability)
      .where(eq(availability.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(
    db: DB,
    data: {
      professionalId: string;
      weekday: number;
      startTime: string;
      endTime: string;
      active?: boolean;
    },
  ): Promise<AvailabilityRow> {
    const rows = await db
      .insert(availability)
      .values({
        professionalId: data.professionalId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
        active: data.active ?? true,
      })
      .returning();
    return rows[0]!;
  },

  async update(
    db: DB,
    id: string,
    data: Partial<{
      weekday: number;
      startTime: string;
      endTime: string;
      active: boolean;
    }>,
  ): Promise<AvailabilityRow | null> {
    const rows = await db
      .update(availability)
      .set(data)
      .where(eq(availability.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
