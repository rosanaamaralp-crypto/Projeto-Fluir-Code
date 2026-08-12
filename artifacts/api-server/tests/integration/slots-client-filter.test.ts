/**
 * OBS-D — Testes do filtro de client em GET /api/slots
 *
 * Verifica que quando role é CLIENT:
 * 1. O clientId é derivado exclusivamente da sessão (nunca do parâmetro de query).
 * 2. Slots já ocupados pelo próprio cliente não aparecem como disponíveis.
 * 3. Enviar ?clientId de outro cliente não muda o comportamento (parâmetro ignorado).
 * 4. ADMIN mantém comportamento atual (não filtra por cliente).
 *
 * O SlotsController já implementa isso:
 *   - Para role CLIENT: sempre deriva clientId de session, nunca de req.query
 *   - O SlotsQuerySchema não inclui clientId como parâmetro válido (stripped pelo middleware)
 *
 * Este arquivo prova que a implementação funciona corretamente end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../helpers/app.js";
import {
  seedTestData,
  seedAppointmentExtras,
  seedConcurrencyExtras,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
  type AppointmentTestExtras,
  type ConcurrencyExtras,
} from "../helpers/seed.js";

let ids: TestUsers;
let extras: AppointmentTestExtras;
let extras2: ConcurrencyExtras;
let clientCookie: string;
let adminCookie: string;

/**
 * Data 5 dias no futuro (dentro da disponibilidade do profissional),
 * no formato YYYY-MM-DD UTC.
 */
function futureDate(daysFromNow = 5): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

/**
 * Slot exato às 10:00 UTC, N dias no futuro (dentro da janela 08:00-20:00).
 */
function slotAt(daysFromNow: number, hourUtc = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids);
  extras2 = await seedConcurrencyExtras(ids);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
});

afterAll(async () => {
  await cleanTestData();
});

describe("OBS-D — GET /api/slots filtra conflitos do próprio CLIENT por sessão", () => {
  /**
   * Helper: busca slots para o profissional/serviço de teste em uma data futura.
   */
  function querySlots(cookie: string, daysFromNow: number, extraQuery = "") {
    const date = futureDate(daysFromNow);
    return request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}${extraQuery}`,
      )
      .set("Cookie", cookie);
  }

  it("1. CLIENT sem clientId no query → usa clientId da sessão (slots normais visíveis)", async () => {
    // Sem appointment criado, CLIENT vê slots disponíveis
    const res = await querySlots(clientCookie, 7);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
  });

  it("2. CLIENT com appointment no horário → slot não aparece como disponível", async () => {
    const targetDays = 8; // d+8
    const targetHour = 10; // 10:00 UTC — dentro da janela 08:00-20:00

    // Criar appointment para o client às 10:00 UTC do d+8
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: slotAt(targetDays, targetHour),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const occupiedStart = apptRes.body.appointment.startDatetime;

    // Consultar slots para o mesmo dia
    const date = futureDate(targetDays);
    const slotsRes = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`,
      )
      .set("Cookie", clientCookie);

    expect(slotsRes.status).toBe(200);

    // O slot das 10:00 não deve aparecer (CLIENT tem appointment nele)
    const occupiedSlot = slotsRes.body.slots.find(
      (s: { startDatetime: string }) => s.startDatetime === occupiedStart,
    );
    expect(occupiedSlot).toBeUndefined();

    // Outros slots ainda devem aparecer (o profissional ainda tem outros horários)
    expect(slotsRes.body.slots.length).toBeGreaterThan(0);
  });

  it("3. CLIENT envia clientId de outro client → parâmetro ignorado, usa sessão", async () => {
    // Um UUID de client fictício que NÃO é o client autenticado
    const otherClientId = "00000000-0000-0000-0000-000000000001";

    // O SlotsQuerySchema não aceita clientId → stripped pelo validateQuery
    // O controller SEMPRE deriva clientId da session para role CLIENT
    const date = futureDate(9);
    const res = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}&clientId=${otherClientId}`,
      )
      .set("Cookie", clientCookie);

    // Deve funcionar normalmente (clientId de query ignorado)
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);

    // O comportamento deve ser idêntico ao de uma query sem clientId
    const resWithout = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`,
      )
      .set("Cookie", clientCookie);

    expect(resWithout.status).toBe(200);
    // Mesmos slots (clientId de outro client não afeta o resultado)
    expect(res.body.slots).toEqual(resWithout.body.slots);
  });

  it("4. ADMIN consulta slots sem clientId → comportamento inalterado (não filtra por cliente)", async () => {
    // ADMIN não tem derivação automática de clientId — vê disponibilidade bruta
    const date = futureDate(10);
    const adminRes = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`,
      )
      .set("Cookie", adminCookie);

    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body.slots)).toBe(true);
    // ADMIN deve ver todos os slots disponíveis (sem filtragem por cliente)
    expect(adminRes.body.slots.length).toBeGreaterThan(0);
  });

  it("4b. ADMIN vê slot que CLIENT não vê — CLIENT filtrado por conflito do próprio appointment com prof2", async () => {
    /**
     * Cenário controlado:
     * - CLIENT cria appointment com prof2 às 11:00 UTC do d+30
     * - prof1 está livre nesse horário (sem appointment)
     * - ADMIN consulta slots de prof1 em d+30 → vê o slot das 11:00 (sem filtro de cliente)
     * - CLIENT consulta slots de prof1 em d+30 → NÃO vê o slot das 11:00
     *   porque o SlotsService detecta conflito de cliente (appointment com prof2 no mesmo horário)
     *
     * Isso prova que a derivação de clientId por sessão filtra corretamente conflitos do cliente
     * independentemente do profissional — e que ADMIN não é afetado por esse filtro.
     */
    const targetDays = 30;
    const targetHour = 11; // 11:00 UTC — dentro da janela 08:00-20:00
    const conflictSlot = slotAt(targetDays, targetHour);
    const date = futureDate(targetDays);

    // CLIENT cria appointment com prof2 às 11:00 UTC do d+30 (não bloqueia prof1)
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: extras2.prof2Id,
        serviceId: ids.serviceId,
        startDatetime: conflictSlot,
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);

    // ADMIN consulta slots de prof1 em d+30 — prof1 livre, sem filtro de cliente
    const adminRes = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`,
      )
      .set("Cookie", adminCookie);

    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body.slots)).toBe(true);

    // ADMIN vê o slot das 11:00 de prof1 (prof1 está livre, ADMIN não filtra por cliente)
    const adminSeesSlot = adminRes.body.slots.some(
      (s: { startDatetime: string }) => s.startDatetime === conflictSlot,
    );
    expect(adminSeesSlot).toBe(true);

    // CLIENT consulta slots de prof1 em d+30 — prof1 livre, mas CLIENT tem conflito com prof2
    const clientRes = await request
      .get(
        `/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`,
      )
      .set("Cookie", clientCookie);

    expect(clientRes.status).toBe(200);
    expect(Array.isArray(clientRes.body.slots)).toBe(true);

    // CLIENT NÃO vê o slot das 11:00 de prof1 (conflito detectado via clientId da sessão)
    const clientSeesSlot = clientRes.body.slots.some(
      (s: { startDatetime: string }) => s.startDatetime === conflictSlot,
    );
    expect(clientSeesSlot).toBe(false);
  });
});
