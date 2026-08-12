import { and, eq, lte, gte } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { blockedPeriods } from "@workspace/db";

export interface BlockedPeriodRow {
  id: string;
  professionalId: string;
  startDatetime: Date;
  endDatetime: Date;
  reason: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const BlockedPeriodsRepository = {
  async findByProfessionalId(
    db: DB,
    professionalId: string,
    onlyActive = false,
  ): Promise<BlockedPeriodRow[]> {
    const condition = onlyActive
      ? and(
          eq(blockedPeriods.professionalId, professionalId),
          eq(blockedPeriods.status, "ACTIVE"),
        )
      : eq(blockedPeriods.professionalId, professionalId);
    return db.select().from(blockedPeriods).where(condition);
  },

  async findById(db: DB, id: string): Promise<BlockedPeriodRow | null> {
    const rows = await db
      .select()
      .from(blockedPeriods)
      .where(eq(blockedPeriods.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Busca bloqueios ATIVOS de um profissional que se sobrepõem ao intervalo [rangeStart, rangeEnd).
   * Sobreposição: block.start < rangeEnd AND block.end > rangeStart
   */
  async findActiveOverlapping(
    db: DB,
    professionalId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<BlockedPeriodRow[]> {
    return db
      .select()
      .from(blockedPeriods)
      .where(
        and(
          eq(blockedPeriods.professionalId, professionalId),
          eq(blockedPeriods.status, "ACTIVE"),
          lte(blockedPeriods.startDatetime, rangeEnd),
          gte(blockedPeriods.endDatetime, rangeStart),
        ),
      );
  },

  async create(
    db: DB,
    data: {
      professionalId: string;
      startDatetime: Date;
      endDatetime: Date;
      reason?: string | null;
      createdBy: string;
    },
  ): Promise<BlockedPeriodRow> {
    const rows = await db
      .insert(blockedPeriods)
      .values({
        professionalId: data.professionalId,
        startDatetime: data.startDatetime,
        endDatetime: data.endDatetime,
        reason: data.reason ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    return rows[0]!;
  },

  async updateStatus(
    db: DB,
    id: string,
    status: string,
    reason?: string | null,
  ): Promise<BlockedPeriodRow | null> {
    const updateData: Record<string, unknown> = { status };
    if (reason !== undefined) updateData["reason"] = reason;

    const rows = await db
      .update(blockedPeriods)
      .set(updateData)
      .where(eq(blockedPeriods.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
