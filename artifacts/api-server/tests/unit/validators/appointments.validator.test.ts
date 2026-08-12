/**
 * Testes unitários do AlterAppointmentSchema (F5.4).
 *
 * Cobre os 10 itens obrigatórios:
 *   1.  professionalId UUID válido é aceito
 *   2.  professionalId inválido é rejeitado
 *   3.  modality válida é aceita
 *   4.  modality inválida é rejeitada
 *   5.  addressId UUID válido é aceito
 *   6.  addressId inválido é rejeitado
 *   7.  payload de alteração válido é aceito
 *   8.  campos desconhecidos seguem o comportamento atual do projeto (strip)
 *   9.  schemas existentes do PATCH continuam aceitando seus payloads válidos
 *   10. payload inválido não é confundido com os schemas existentes
 */
import { describe, it, expect } from "vitest";
import {
  AlterAppointmentSchema,
  PatchAppointmentSchema,
} from "../../../src/validators/appointments.validator.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_UUID   = "123e4567-e89b-12d3-a456-426614174000";
const INVALID_UUID = "nao-e-um-uuid";
const VALID_DT     = "2027-06-15T10:00:00Z";

// ─── AlterAppointmentSchema ───────────────────────────────────────────────────

describe("AlterAppointmentSchema — F5.4", () => {

  // 1. professionalId UUID válido
  it("1. professionalId UUID válido é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ professionalId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  // 2. professionalId inválido
  it("2. professionalId UUID inválido é rejeitado", () => {
    const r = AlterAppointmentSchema.safeParse({ professionalId: INVALID_UUID });
    expect(r.success).toBe(false);
    if (!r.success) {
      const field = r.error.issues.find((i) => i.path.includes("professionalId"));
      expect(field).toBeDefined();
    }
  });

  // 3. modality válida
  it("3a. modality 'IN_PERSON' é aceita", () => {
    const r = AlterAppointmentSchema.safeParse({ modality: "IN_PERSON" });
    expect(r.success).toBe(true);
  });

  it("3b. modality 'HOME_CARE' é aceita", () => {
    const r = AlterAppointmentSchema.safeParse({ modality: "HOME_CARE" });
    expect(r.success).toBe(true);
  });

  // 4. modality inválida
  it("4. modality inválida ('REMOTE') é rejeitada", () => {
    const r = AlterAppointmentSchema.safeParse({ modality: "REMOTE" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const field = r.error.issues.find((i) => i.path.includes("modality"));
      expect(field).toBeDefined();
    }
  });

  // 5. addressId UUID válido
  it("5. addressId UUID válido é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ addressId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  // 6. addressId inválido
  it("6. addressId UUID inválido é rejeitado", () => {
    const r = AlterAppointmentSchema.safeParse({ addressId: INVALID_UUID });
    expect(r.success).toBe(false);
    if (!r.success) {
      const field = r.error.issues.find((i) => i.path.includes("addressId"));
      expect(field).toBeDefined();
    }
  });

  // 7. payload de alteração válido
  it("7a. payload completo (todos os campos) é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({
      professionalId: VALID_UUID,
      modality: "IN_PERSON",
      addressId: VALID_UUID,
      startDatetime: VALID_DT,
    });
    expect(r.success).toBe(true);
  });

  it("7b. payload mínimo (apenas professionalId) é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ professionalId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  it("7c. payload mínimo (apenas modality) é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ modality: "HOME_CARE" });
    expect(r.success).toBe(true);
  });

  it("7d. payload mínimo (apenas addressId) é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ addressId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  it("7e. payload mínimo (apenas startDatetime) é aceito", () => {
    const r = AlterAppointmentSchema.safeParse({ startDatetime: VALID_DT });
    expect(r.success).toBe(true);
  });

  it("7f. startDatetime inválido (não ISO-8601) é rejeitado", () => {
    const r = AlterAppointmentSchema.safeParse({ startDatetime: "15/06/2027 10:00" });
    expect(r.success).toBe(false);
  });

  it("7g. payload vazio {} é rejeitado — pelo menos 1 campo obrigatório", () => {
    const r = AlterAppointmentSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.code === "custom")).toBe(true);
    }
  });

  // 8. campos desconhecidos — padrão strip do projeto
  it("8a. campos desconhecidos são removidos silenciosamente (strip)", () => {
    const r = AlterAppointmentSchema.safeParse({
      professionalId: VALID_UUID,
      campoInexistente: "valor",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>).campoInexistente).toBeUndefined();
    }
  });

  it("8b. status não é campo do schema — é removido (strip)", () => {
    const r = AlterAppointmentSchema.safeParse({
      professionalId: VALID_UUID,
      status: "CANCELLED",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>).status).toBeUndefined();
    }
  });

  it("8c. reschedule não é campo do schema — é removido (strip)", () => {
    const r = AlterAppointmentSchema.safeParse({
      professionalId: VALID_UUID,
      reschedule: { startDatetime: VALID_DT },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>).reschedule).toBeUndefined();
    }
  });
});

// ─── PatchAppointmentSchema — regressão (item 9 e 10) ────────────────────────

describe("PatchAppointmentSchema — regressão F5.4 (schemas existentes preservados)", () => {

  // 9. schemas existentes continuam funcionando
  it("9a. CancelSchema: { status: 'CANCELLED' } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ status: "CANCELLED" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ status: "CANCELLED" });
  });

  it("9b. CancelSchema: { status: 'CANCELLED', reason: '...' } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ status: "CANCELLED", reason: "Motivo válido" });
    expect(r.success).toBe(true);
  });

  it("9c. UpdateStatusSchema: { status: 'IN_PROGRESS' } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ status: "IN_PROGRESS" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ status: "IN_PROGRESS" });
  });

  it("9d. UpdateStatusSchema: { status: 'COMPLETED' } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ status: "COMPLETED" });
    expect(r.success).toBe(true);
  });

  it("9e. UpdateStatusSchema: { status: 'NO_SHOW' } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ status: "NO_SHOW" });
    expect(r.success).toBe(true);
  });

  it("9f. RescheduleSchema: { reschedule: { startDatetime } } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({
      reschedule: { startDatetime: VALID_DT },
    });
    expect(r.success).toBe(true);
    if (r.success) expect("reschedule" in r.data).toBe(true);
  });

  it("9g. RescheduleSchema: { reschedule: { startDatetime, addressId } } é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({
      reschedule: { startDatetime: VALID_DT, addressId: VALID_UUID },
    });
    expect(r.success).toBe(true);
  });

  // 10. payloads de alteração in-place integrados ao union em F5.6
  it("10a. { professionalId: uuid } é aceito pelo PatchAppointmentSchema (F5.6 — AlterAppointmentSchema integrado)", () => {
    // Em F5.4 este payload era rejeitado; em F5.6 AlterAppointmentSchema foi adicionado ao union.
    const r = PatchAppointmentSchema.safeParse({ professionalId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  it("10b. { modality: 'IN_PERSON' } é aceito pelo PatchAppointmentSchema (F5.6 — AlterAppointmentSchema integrado)", () => {
    const r = PatchAppointmentSchema.safeParse({ modality: "IN_PERSON" });
    expect(r.success).toBe(true);
  });

  it("10c. payload totalmente vazio {} não é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("10d. payload aleatório { foo: 'bar' } não é aceito", () => {
    const r = PatchAppointmentSchema.safeParse({ foo: "bar" });
    expect(r.success).toBe(false);
  });
});
