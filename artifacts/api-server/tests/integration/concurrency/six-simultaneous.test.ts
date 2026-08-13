/**
 * F16 — TESTE LITERAL DO DOC 17 §46
 *
 * 6 solicitações simultâneas de agendamento IN_PERSON para o mesmo horário,
 * com exatamente 5 macas (resources ACTIVE) disponíveis:
 * → 5 devem obter sucesso (201), cada uma ocupando uma maca distinta;
 * → 1 deve receber conflito HTTP 409 (nenhuma maca livre).
 *
 * Aditivo — não altera código de produção nem fixtures existentes.
 * Fixtures: 6 pares client×professional distintos (2 já existentes + 4 novos
 * via seedSixConcurrencyExtras) e 5 macas (1 existente + 4 novas).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../../helpers/app.js";
import {
  seedTestData,
  seedAppointmentExtras,
  seedConcurrencyExtras,
  seedSixConcurrencyExtras,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
  type AppointmentTestExtras,
  type ConcurrencyExtras,
  type SixConcurrencyExtras,
} from "../../helpers/seed.js";
import { getDatabaseClient } from "@workspace/db";
import { appointments } from "@workspace/db";
import { and, inArray, notInArray } from "drizzle-orm";

const { db } = getDatabaseClient();

const NON_BLOCKING = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

let ids: TestUsers;
let extras: AppointmentTestExtras;
let extras2: ConcurrencyExtras;
let six: SixConcurrencyExtras;
let cookies: string[]; // 6 cookies de clientes distintos
let profIds: string[]; // 6 profissionais distintos

/**
 * Slot fixo d+20 14:00 UTC — não usado por nenhum outro teste de concorrência.
 * Calculado UMA vez no load do módulo e reutilizado nas duas verificações,
 * evitando divergência caso a meia-noite UTC ocorra entre os testes.
 */
const SLOT_SIX: string = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 20);
  d.setUTCHours(14, 0, 0, 0);
  return d.toISOString();
})();

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids); // maca 1 + availability prof1
  extras2 = await seedConcurrencyExtras(ids); // prof2 + client2
  six = await seedSixConcurrencyExtras(ids); // profs 3–6, clients 3–6, macas 2–5

  const [c1, c2, ...rest] = await Promise.all([
    loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client),
    loginAs("client2-appt@fluir.test", TEST_PASSWORDS.client2),
    ...six.extraClientEmails.map((email) => loginAs(email, TEST_PASSWORDS.client)),
  ]);
  cookies = [c1, c2, ...rest];
  profIds = [ids.professionalId, extras2.prof2Id, ...six.extraProfIds];
  void extras;
}, 60000);

afterAll(async () => {
  await cleanTestData();
});

describe("Doc 17 §46 — 6 solicitações simultâneas, 5 macas", () => {
  it(
    "exatamente 5×201 + 1×409",
    async () => {
      const startDatetime = SLOT_SIX;

      // 5 macas: extras.resourceId (maca 1) + six.extraResourceIds (macas 2–5).
      // 6 requisições simultâneas disputam explicitamente as 5 macas:
      // requisições 0–4 pedem macas distintas; a 6ª disputa a mesma maca da 1ª.
      // Exatamente 1 das 6 perde a disputa → 409 (excl_resource_no_overlap).
      const macas = [extras.resourceId, ...six.extraResourceIds];

      const responses = await Promise.all(
        cookies.map((cookie, i) =>
          request.post("/api/appointments").set("Cookie", cookie).send({
            professionalId: profIds[i],
            serviceId: ids.serviceId,
            startDatetime,
            modality: "IN_PERSON",
            resourceId: macas[i % 5],
          }),
        ),
      );

      const statuses = responses.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 201, 201, 201, 409]);
    },
    60000,
  );

  it("banco confirma: 5 appointments ativos no slot, cada um em maca distinta", async () => {
    const slotStart = new Date(SLOT_SIX);

    const active = await db
      .select({
        id: appointments.id,
        resourceId: appointments.resourceId,
        startDatetime: appointments.startDatetime,
      })
      .from(appointments)
      .where(
        and(
          inArray(appointments.professionalId, profIds),
          notInArray(appointments.status, [...NON_BLOCKING]),
        ),
      );

    const atSlot = active.filter(
      (a) => a.startDatetime.getTime() === slotStart.getTime(),
    );

    expect(atSlot.length).toBe(5);

    // Todas IN_PERSON → resource não nulo, e sem repetição de maca
    const resourceIds = atSlot.map((a) => a.resourceId);
    expect(resourceIds.every((r) => r !== null)).toBe(true);
    expect(new Set(resourceIds).size).toBe(5);
  });
});
