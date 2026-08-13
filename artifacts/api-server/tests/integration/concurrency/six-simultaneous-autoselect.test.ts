/**
 * F17.4 — AUTO-SELEÇÃO CONCORRENTE DE MACA
 *
 * 6 solicitações simultâneas de agendamento IN_PERSON para o mesmo horário,
 * SEM resourceId (auto-seleção), com exatamente 5 macas ACTIVE disponíveis:
 * → 5 devem obter sucesso (201), cada uma em uma maca distinta;
 * → 1 deve receber conflito HTTP 409;
 * → nenhum double-booking (EXCLUDE constraint como última proteção).
 *
 * Antes da F17.4, a auto-seleção escolhia a mesma maca por leitura prévia e
 * apenas 1–2 requisições venciam. Com o advisory lock transacional + retry
 * controlado, o resultado é determinístico: 5×201 + 1×409.
 *
 * O banco de dev/testes possui outras macas ACTIVE (seed Maca 01–05); este
 * teste as INATIVA temporariamente no beforeAll e RESTAURA no afterAll para
 * garantir exatamente 5 macas ativas durante a disputa.
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
import { appointments, resources } from "@workspace/db";
import { and, eq, inArray, notInArray } from "drizzle-orm";

const { db } = getDatabaseClient();

const NON_BLOCKING = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

let ids: TestUsers;
let extras: AppointmentTestExtras;
let extras2: ConcurrencyExtras;
let six: SixConcurrencyExtras;
let cookies: string[]; // 6 cookies de clientes distintos
let profIds: string[]; // 6 profissionais distintos
let ourMacas: string[]; // as 5 macas que permanecem ACTIVE
let deactivatedIds: string[] = []; // macas de seed inativadas temporariamente

/**
 * Slot fixo d+22 15:00 UTC — não usado por nenhum outro teste de concorrência.
 * Calculado UMA vez no load do módulo (evita divergência na virada de
 * meia-noite UTC entre os testes).
 */
const SLOT_AUTO: string = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 22);
  d.setUTCHours(15, 0, 0, 0);
  return d.toISOString();
})();

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids); // maca 1 + availability prof1
  extras2 = await seedConcurrencyExtras(ids); // prof2 + client2
  six = await seedSixConcurrencyExtras(ids); // profs 3–6, clients 3–6, macas 2–5

  ourMacas = [extras.resourceId, ...six.extraResourceIds];

  // Garantir exatamente 5 macas ACTIVE: inativar temporariamente as demais.
  const otherActive = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.status, "ACTIVE"), notInArray(resources.id, ourMacas)));
  deactivatedIds = otherActive.map((r) => r.id);
  if (deactivatedIds.length > 0) {
    await db
      .update(resources)
      .set({ status: "INACTIVE" })
      .where(inArray(resources.id, deactivatedIds));
  }

  const [c1, c2, ...rest] = await Promise.all([
    loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client),
    loginAs("client2-appt@fluir.test", TEST_PASSWORDS.client2),
    ...six.extraClientEmails.map((email) => loginAs(email, TEST_PASSWORDS.client)),
  ]);
  cookies = [c1, c2, ...rest];
  profIds = [ids.professionalId, extras2.prof2Id, ...six.extraProfIds];
}, 60000);

afterAll(async () => {
  // Restaurar as macas inativadas temporariamente ANTES do cleanup geral.
  if (deactivatedIds.length > 0) {
    await db
      .update(resources)
      .set({ status: "ACTIVE" })
      .where(inArray(resources.id, deactivatedIds));
  }
  await cleanTestData();
});

describe("F17.4 — 6 solicitações simultâneas com auto-seleção, 5 macas", () => {
  it(
    "exatamente 5×201 + 1×409 sem resourceId",
    async () => {
      const startDatetime = SLOT_AUTO;

      const responses = await Promise.all(
        cookies.map((cookie, i) =>
          request.post("/api/appointments").set("Cookie", cookie).send({
            professionalId: profIds[i],
            serviceId: ids.serviceId,
            startDatetime,
            modality: "IN_PERSON",
            // SEM resourceId — auto-seleção concorrente
          }),
        ),
      );

      const statuses = responses.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 201, 201, 201, 409]);
    },
    60000,
  );

  it("banco confirma: 5 appointments ativos no slot, 5 macas distintas, sem double-booking", async () => {
    const slotStart = new Date(SLOT_AUTO);

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

    // Todas IN_PERSON → resource não nulo, sem repetição de maca (sem double-booking)
    const resourceIds = atSlot.map((a) => a.resourceId);
    expect(resourceIds.every((r) => r !== null)).toBe(true);
    expect(new Set(resourceIds).size).toBe(5);
    // Todas as macas usadas pertencem ao conjunto das 5 ativas
    expect(resourceIds.every((r) => ourMacas.includes(r as string))).toBe(true);
  });
});
