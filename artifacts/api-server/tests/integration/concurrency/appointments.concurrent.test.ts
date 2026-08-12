/**
 * TESTE CRÍTICO DE CONCORRÊNCIA — appointments
 *
 * Verifica que, quando duas requisições simultâneas tentam criar exatamente
 * o mesmo agendamento (mesmo client, mesmo professional, mesmo horário),
 * EXATAMENTE UMA é aceita (201) e a outra é rejeitada (409).
 *
 * A proteção definitiva é a EXCLUDE constraint do banco:
 *   excl_client_no_overlap / excl_professional_no_overlap / excl_resource_no_overlap
 *
 * Nunca aceita: 2x 201 nem 0x 201.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../../helpers/app.js";
import {
  seedTestData,
  seedAppointmentExtras,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
} from "../../helpers/seed.js";
import { getDatabaseClient } from "@workspace/db";
import { appointments } from "@workspace/db";
import { and, eq, notInArray } from "drizzle-orm";

const { db } = getDatabaseClient();

let ids: TestUsers;
let clientCookie: string;

/**
 * Slot determinístico dentro da janela de disponibilidade:
 * 10 dias no futuro, 14:00 UTC — garantido dentro de 08:00-20:00 UTC.
 */
function concurrentSlot(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 10);
  d.setUTCHours(14, 0, 0, 0);
  return d.toISOString();
}

beforeAll(async () => {
  ids = await seedTestData();
  await seedAppointmentExtras(ids);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);
});

afterAll(async () => {
  await cleanTestData();
});

describe("Concorrência — EXCLUDE constraint garante single booking", () => {
  it(
    "exatamente 1 de 2 requisições simultâneas é aceita (201) e 1 é rejeitada (409)",
    async () => {
      const startDatetime = concurrentSlot();

      const payload = {
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime,
        modality: "IN_PERSON",
      };

      // Enviar EXATAMENTE 2 requests simultâneos com o mesmo payload
      const [r1, r2] = await Promise.all([
        request
          .post("/api/appointments")
          .set("Cookie", clientCookie)
          .send(payload),
        request
          .post("/api/appointments")
          .set("Cookie", clientCookie)
          .send(payload),
      ]);

      const statuses = [r1.status, r2.status].sort();

      // Exatamente 1 deve ser 201 e 1 deve ser 409
      expect(statuses).toEqual([201, 409]);

      // Verificar no banco que existe APENAS 1 appointment ativo no horário
      const NON_BLOCKING = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;
      const activeAppointments = await db
        .select({ id: appointments.id, status: appointments.status })
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, ids.clientId),
            eq(appointments.professionalId, ids.professionalId),
            notInArray(appointments.status, [...NON_BLOCKING]),
          ),
        );

      // Deve existir exatamente 1 appointment ativo para este par client/professional
      // (no horário concorrente — pode haver 0 de outros horários em outros testes)
      expect(activeAppointments.length).toBe(1);
      expect(activeAppointments[0]?.status).toBe("CONFIRMED");
    },
    30000,
  );

  it("banco não contém double-booking: apenas 1 appointment no horário disputado", async () => {
    // Sanity check: o estado do banco confirma ausência de double-booking
    const NON_BLOCKING = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

    const allActive = await db
      .select({ id: appointments.id, status: appointments.status })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, ids.clientId),
          notInArray(appointments.status, [...NON_BLOCKING]),
        ),
      );

    // Para cada appointment ativo, o status deve ser válido
    for (const a of allActive) {
      expect(["CONFIRMED", "IN_PROGRESS"].includes(a.status)).toBe(true);
    }

    // Apenas 1 appointment CONFIRMED para este client (criado no teste anterior)
    const confirmed = allActive.filter((a) => a.status === "CONFIRMED");
    expect(confirmed.length).toBe(1);
  });
});
