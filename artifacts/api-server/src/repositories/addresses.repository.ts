import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { addresses } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

export interface AddressRow {
  id: string;
  clientId: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string | null;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AddressesRepository = {
  async findByClientId(db: DB, clientId: string): Promise<AddressRow | null> {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.clientId, clientId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findById(db: DB, id: string): Promise<AddressRow | null> {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsert(
    db: DB,
    clientId: string,
    data: {
      street: string;
      number: string;
      complement?: string | null;
      neighborhood: string;
      city: string;
      state: string;
      postalCode: string;
      reference?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      isDefault?: boolean;
    },
  ): Promise<AddressRow> {
    const existing = await AddressesRepository.findByClientId(db, clientId);

    if (existing) {
      const rows = await db
        .update(addresses)
        .set({
          street: data.street,
          number: data.number,
          complement: data.complement ?? null,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          reference: data.reference ?? null,
          latitude: data.latitude != null ? String(data.latitude) : null,
          longitude: data.longitude != null ? String(data.longitude) : null,
          isDefault: data.isDefault ?? true,
        })
        .where(eq(addresses.id, existing.id))
        .returning();
      return rows[0]!;
    }

    const rows = await db
      .insert(addresses)
      .values({
        clientId,
        street: data.street,
        number: data.number,
        complement: data.complement ?? null,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        reference: data.reference ?? null,
        latitude: data.latitude != null ? String(data.latitude) : null,
        longitude: data.longitude != null ? String(data.longitude) : null,
        isDefault: data.isDefault ?? true,
      })
      .returning();
    return rows[0]!;
  },

  async delete(db: DB, clientId: string): Promise<boolean> {
    const result = await db
      .delete(addresses)
      .where(eq(addresses.clientId, clientId))
      .returning({ id: addresses.id });
    return result.length > 0;
  },
};
