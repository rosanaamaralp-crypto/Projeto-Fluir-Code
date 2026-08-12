import { and, eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { professionalServices } from "@workspace/db";

export interface ProfessionalServiceRow {
  id: string;
  professionalId: string;
  serviceId: string;
  active: boolean;
  createdAt: Date;
}

export const ProfessionalServicesRepository = {
  async findByProfessionalId(
    db: DB,
    professionalId: string,
  ): Promise<ProfessionalServiceRow[]> {
    return db
      .select()
      .from(professionalServices)
      .where(eq(professionalServices.professionalId, professionalId));
  },

  async findOne(
    db: DB,
    professionalId: string,
    serviceId: string,
  ): Promise<ProfessionalServiceRow | null> {
    const rows = await db
      .select()
      .from(professionalServices)
      .where(
        and(
          eq(professionalServices.professionalId, professionalId),
          eq(professionalServices.serviceId, serviceId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  /** Adiciona ou reativa (se já existia inativo) */
  async upsert(
    db: DB,
    data: { professionalId: string; serviceId: string },
  ): Promise<ProfessionalServiceRow> {
    const existing = await ProfessionalServicesRepository.findOne(
      db,
      data.professionalId,
      data.serviceId,
    );

    if (existing) {
      // Reativa se estava inativo
      if (!existing.active) {
        const rows = await db
          .update(professionalServices)
          .set({ active: true })
          .where(eq(professionalServices.id, existing.id))
          .returning();
        return rows[0]!;
      }
      return existing;
    }

    const rows = await db
      .insert(professionalServices)
      .values({ professionalId: data.professionalId, serviceId: data.serviceId })
      .returning();
    return rows[0]!;
  },

  /** Soft delete: active = false */
  async deactivate(
    db: DB,
    professionalId: string,
    serviceId: string,
  ): Promise<ProfessionalServiceRow | null> {
    const existing = await ProfessionalServicesRepository.findOne(
      db,
      professionalId,
      serviceId,
    );
    if (!existing) return null;

    const rows = await db
      .update(professionalServices)
      .set({ active: false })
      .where(eq(professionalServices.id, existing.id))
      .returning();
    return rows[0] ?? null;
  },
};
