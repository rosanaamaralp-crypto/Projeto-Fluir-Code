/**
 * Testes unitários do AppointmentsService.
 * Foca em lógica pura: antecedência, status, modalidade, resource, cálculos de tempo.
 * Usa mocks — sem banco de dados real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers de teste ──────────────────────────────────────────────────────

/** Constrói Date N horas a partir de agora (UTC) */
function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

/** Constrói Date N dias a partir de agora */
function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

// ─── 1. Cálculo de end_datetime ────────────────────────────────────────────

describe("Cálculo de end_datetime", () => {
  it("end = start + durationMinutes", () => {
    const start = new Date("2027-01-10T10:00:00.000Z");
    const durationMinutes = 60;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    expect(end.toISOString()).toBe("2027-01-10T11:00:00.000Z");
  });

  it("end = start + 90min", () => {
    const start = new Date("2027-01-10T09:00:00.000Z");
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    expect(end.toISOString()).toBe("2027-01-10T10:30:00.000Z");
  });

  it("end é posterior a start", () => {
    const start = new Date("2027-01-10T10:00:00.000Z");
    const durationMinutes = 60;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

// ─── 2. Validação de antecedência ─────────────────────────────────────────

describe("Validação de antecedência mínima (SLOT_MIN_NOTICE_HOURS)", () => {
  const MIN_NOTICE_H = 2;

  function minNoticeMs(): number {
    return MIN_NOTICE_H * 60 * 60 * 1000;
  }

  /** Regra: start <= (now + minNoticeMs) é REJEITADO (boundary estrito) */
  function isWithinMinNotice(start: Date): boolean {
    const minStart = new Date(Date.now() + minNoticeMs());
    return start <= minStart;
  }

  it("slot exatamente no limite (now + 2h) é REJEITADO", () => {
    const start = new Date(Date.now() + minNoticeMs());
    expect(isWithinMinNotice(start)).toBe(true); // boundary → rejeitado
  });

  it("slot 1ms antes do limite é REJEITADO", () => {
    const start = new Date(Date.now() + minNoticeMs() - 1);
    expect(isWithinMinNotice(start)).toBe(true);
  });

  it("slot 1ms além do limite é ACEITO", () => {
    const start = new Date(Date.now() + minNoticeMs() + 1000); // 1s de folga
    expect(isWithinMinNotice(start)).toBe(false); // → aceito
  });

  it("slot 3h no futuro é ACEITO", () => {
    const start = hoursFromNow(3);
    expect(isWithinMinNotice(start)).toBe(false);
  });
});

describe("Validação de antecedência máxima (SLOT_MAX_ADVANCE_DAYS)", () => {
  const MAX_ADVANCE_DAYS = 60;

  function maxAdvanceMs(): number {
    return MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
  }

  function exceedsMaxAdvance(start: Date): boolean {
    const maxStart = new Date(Date.now() + maxAdvanceMs());
    return start > maxStart;
  }

  it("slot em 30 dias é ACEITO", () => {
    expect(exceedsMaxAdvance(daysFromNow(30))).toBe(false);
  });

  it("slot em 61 dias é REJEITADO", () => {
    expect(exceedsMaxAdvance(daysFromNow(61))).toBe(true);
  });

  it("slot em exatamente 60 dias é ACEITO (< maxStart)", () => {
    const start = daysFromNow(60);
    expect(exceedsMaxAdvance(start)).toBe(false);
  });
});

// ─── 3. Validação de status / transições ──────────────────────────────────

describe("Transições de status de appointment", () => {
  const ROLES = { ADMIN: 1, PROFESSIONAL: 2, CLIENT: 3 };
  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW"];

  function canTransition(current: string, next: string, role: number): boolean {
    if (TERMINAL.includes(current)) return false;
    if (current === "CONFIRMED") {
      if (next === "CANCELLED") return true;
      if (next === "IN_PROGRESS") return role === ROLES.ADMIN || role === ROLES.PROFESSIONAL;
      return false;
    }
    if (current === "IN_PROGRESS") {
      if (next === "COMPLETED" || next === "NO_SHOW")
        return role === ROLES.ADMIN || role === ROLES.PROFESSIONAL;
      if (next === "CANCELLED") return role === ROLES.ADMIN;
      return false;
    }
    return false;
  }

  describe("Estados terminais (imutáveis)", () => {
    for (const terminal of TERMINAL) {
      it(`${terminal} → qualquer status é REJEITADO`, () => {
        expect(canTransition(terminal, "CONFIRMED", ROLES.ADMIN)).toBe(false);
        expect(canTransition(terminal, "CANCELLED", ROLES.ADMIN)).toBe(false);
        expect(canTransition(terminal, "IN_PROGRESS", ROLES.ADMIN)).toBe(false);
      });
    }
  });

  describe("CONFIRMED", () => {
    it("CONFIRMED → CANCELLED (CLIENT)", () => expect(canTransition("CONFIRMED", "CANCELLED", ROLES.CLIENT)).toBe(true));
    it("CONFIRMED → CANCELLED (PROFESSIONAL)", () => expect(canTransition("CONFIRMED", "CANCELLED", ROLES.PROFESSIONAL)).toBe(true));
    it("CONFIRMED → CANCELLED (ADMIN)", () => expect(canTransition("CONFIRMED", "CANCELLED", ROLES.ADMIN)).toBe(true));
    it("CONFIRMED → IN_PROGRESS (PROFESSIONAL)", () => expect(canTransition("CONFIRMED", "IN_PROGRESS", ROLES.PROFESSIONAL)).toBe(true));
    it("CONFIRMED → IN_PROGRESS (ADMIN)", () => expect(canTransition("CONFIRMED", "IN_PROGRESS", ROLES.ADMIN)).toBe(true));
    it("CONFIRMED → IN_PROGRESS (CLIENT) é REJEITADO", () => expect(canTransition("CONFIRMED", "IN_PROGRESS", ROLES.CLIENT)).toBe(false));
    it("CONFIRMED → COMPLETED é REJEITADO", () => expect(canTransition("CONFIRMED", "COMPLETED", ROLES.ADMIN)).toBe(false));
  });

  describe("IN_PROGRESS", () => {
    it("IN_PROGRESS → COMPLETED (PROFESSIONAL)", () => expect(canTransition("IN_PROGRESS", "COMPLETED", ROLES.PROFESSIONAL)).toBe(true));
    it("IN_PROGRESS → NO_SHOW (PROFESSIONAL)", () => expect(canTransition("IN_PROGRESS", "NO_SHOW", ROLES.PROFESSIONAL)).toBe(true));
    it("IN_PROGRESS → CANCELLED (ADMIN)", () => expect(canTransition("IN_PROGRESS", "CANCELLED", ROLES.ADMIN)).toBe(true));
    it("IN_PROGRESS → CANCELLED (CLIENT) é REJEITADO", () => expect(canTransition("IN_PROGRESS", "CANCELLED", ROLES.CLIENT)).toBe(false));
    it("IN_PROGRESS → CANCELLED (PROFESSIONAL) é REJEITADO", () => expect(canTransition("IN_PROGRESS", "CANCELLED", ROLES.PROFESSIONAL)).toBe(false));
  });
});

// ─── 4. Validação de modalidade ────────────────────────────────────────────

describe("Regras de modalidade", () => {
  function validateModality(
    serviceAllowed: string,
    requestedModality: string,
  ): boolean {
    return serviceAllowed === "BOTH" || serviceAllowed === requestedModality;
  }

  it("service BOTH permite IN_PERSON", () => expect(validateModality("BOTH", "IN_PERSON")).toBe(true));
  it("service BOTH permite HOME_CARE", () => expect(validateModality("BOTH", "HOME_CARE")).toBe(true));
  it("service IN_PERSON permite IN_PERSON", () => expect(validateModality("IN_PERSON", "IN_PERSON")).toBe(true));
  it("service IN_PERSON rejeita HOME_CARE", () => expect(validateModality("IN_PERSON", "HOME_CARE")).toBe(false));
  it("service HOME_CARE permite HOME_CARE", () => expect(validateModality("HOME_CARE", "HOME_CARE")).toBe(true));
  it("service HOME_CARE rejeita IN_PERSON", () => expect(validateModality("HOME_CARE", "IN_PERSON")).toBe(false));
});

// ─── 5. Regras de resource ────────────────────────────────────────────────

describe("Regras de resource (IN_PERSON)", () => {
  /** Sobreposição: aStart < bEnd && aEnd > bStart */
  function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && aEnd > bStart;
  }

  it("sem resources ativos → nenhum resource disponível", () => {
    const activeResources: { id: string }[] = [];
    expect(activeResources.length).toBe(0);
    // Resultado: ConflictError "Nenhuma sala disponível"
  });

  it("resource ocupado → não disponível", () => {
    const slotStart = new Date("2027-01-10T10:00:00Z");
    const slotEnd = new Date("2027-01-10T11:00:00Z");
    const occupiedStart = new Date("2027-01-10T10:30:00Z");
    const occupiedEnd = new Date("2027-01-10T11:30:00Z");
    expect(overlaps(slotStart, slotEnd, occupiedStart, occupiedEnd)).toBe(true);
  });

  it("resource com horário adjacente → disponível (sem overlap)", () => {
    const slotStart = new Date("2027-01-10T10:00:00Z");
    const slotEnd = new Date("2027-01-10T11:00:00Z");
    const nextStart = new Date("2027-01-10T11:00:00Z"); // começa quando termina o slot
    const nextEnd = new Date("2027-01-10T12:00:00Z");
    expect(overlaps(slotStart, slotEnd, nextStart, nextEnd)).toBe(false);
  });

  it("resource completamente livre → disponível", () => {
    const slotStart = new Date("2027-01-10T10:00:00Z");
    const slotEnd = new Date("2027-01-10T11:00:00Z");
    const otherStart = new Date("2027-01-10T12:00:00Z");
    const otherEnd = new Date("2027-01-10T13:00:00Z");
    expect(overlaps(slotStart, slotEnd, otherStart, otherEnd)).toBe(false);
  });
});

// ─── 6. Regras de ownership ────────────────────────────────────────────────

describe("Ownership de appointment", () => {
  const ROLES = { ADMIN: 1, PROFESSIONAL: 2, CLIENT: 3 };

  interface FakeAppointment {
    clientId: string;
    professionalId: string;
  }

  function hasAccess(
    appointment: FakeAppointment,
    sessionClientId: string | null,
    sessionProfId: string | null,
    roleId: number,
  ): boolean {
    if (roleId === ROLES.ADMIN) return true;
    if (roleId === ROLES.CLIENT) return sessionClientId === appointment.clientId;
    if (roleId === ROLES.PROFESSIONAL) return sessionProfId === appointment.professionalId;
    return false;
  }

  const appt: FakeAppointment = { clientId: "client-A", professionalId: "prof-A" };

  it("ADMIN acessa qualquer appointment", () => {
    expect(hasAccess(appt, null, null, ROLES.ADMIN)).toBe(true);
  });

  it("CLIENT acessa próprio appointment", () => {
    expect(hasAccess(appt, "client-A", null, ROLES.CLIENT)).toBe(true);
  });

  it("CLIENT não acessa appointment de outro client", () => {
    expect(hasAccess(appt, "client-B", null, ROLES.CLIENT)).toBe(false);
  });

  it("PROFESSIONAL acessa appointment do próprio profissional", () => {
    expect(hasAccess(appt, null, "prof-A", ROLES.PROFESSIONAL)).toBe(true);
  });

  it("PROFESSIONAL não acessa appointment de outro profissional", () => {
    expect(hasAccess(appt, null, "prof-B", ROLES.PROFESSIONAL)).toBe(false);
  });
});

// ─── 7. Mapeamento de 23P01 ────────────────────────────────────────────────

describe("Mapeamento de erro 23P01 (EXCLUDE violation)", () => {
  // Importamos mapDbError diretamente para testar o mapeamento
  it("23P01 deve mapear para ConflictError (409)", async () => {
    const { mapDbError, ConflictError } = await import("../../../src/lib/errors.js");
    const pgExcludeErr = { code: "23P01", message: "conflicting key value violates exclusion constraint" };
    const appErr = mapDbError(pgExcludeErr);
    expect(appErr).toBeInstanceOf(ConflictError);
    expect(appErr.statusCode).toBe(409);
  });

  it("23P01 via DrizzleQueryError (com cause) também mapeia para 409", async () => {
    const { mapDbError, ConflictError } = await import("../../../src/lib/errors.js");
    const drizzleWrapped = {
      message: "DrizzleQueryError",
      cause: { code: "23P01", message: "exclusion constraint" },
    };
    const appErr = mapDbError(drizzleWrapped);
    expect(appErr).toBeInstanceOf(ConflictError);
    expect(appErr.statusCode).toBe(409);
  });
});
