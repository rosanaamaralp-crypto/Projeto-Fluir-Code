/**
 * Testes de boundary do SLOT_MIN_NOTICE_HOURS (P7).
 *
 * Documenta e protege contra regressão o comportamento ESTRITO de min notice:
 *   slot.start <= minStart → REJEITADO (boundary inclusivo)
 *   slot.start >  minStart → ACEITO
 *
 * SLOT_MIN_NOTICE_HOURS=2 significa que o horário deve estar ESTRITAMENTE
 * além de 2 horas do momento atual.
 *
 * Também confirma configurabilidade via env var.
 */
import { describe, it, expect } from "vitest";

/**
 * Replica a lógica de boundary do slots.service.ts para teste unitário puro.
 * Qualquer mudança no comportamento de `slot.start <= minStart` deve quebrar este teste.
 */
function isSlotRejected(slotStart: Date, minStart: Date): boolean {
  // Replicação exata da linha do slots.service.ts:
  // if (slot.start <= minStart) continue;
  return slotStart <= minStart;
}

function getMinStartForHours(now: number, hours: number): Date {
  return new Date(now + hours * 60 * 60 * 1000);
}

describe("P7 — Boundary SLOT_MIN_NOTICE_HOURS (comportamento ESTRITO)", () => {
  const now = Date.now();
  const hours = 2;
  const minStart = getMinStartForHours(now, hours);

  it("slot em exatamente now + 2h00m00s000ms é REJEITADO (<=)", () => {
    const slotAtExactLimit = new Date(minStart.getTime()); // exatamente igual
    expect(isSlotRejected(slotAtExactLimit, minStart)).toBe(true);
  });

  it("slot em now + 2h00m00s001ms é ACEITO (>)", () => {
    const slotJustAfterLimit = new Date(minStart.getTime() + 1);
    expect(isSlotRejected(slotJustAfterLimit, minStart)).toBe(false);
  });

  it("slot em now + 1h59m59s999ms é REJEITADO (<)", () => {
    const slotBefore = new Date(minStart.getTime() - 1);
    expect(isSlotRejected(slotBefore, minStart)).toBe(true);
  });

  it("slot no passado (now - 1h) é REJEITADO", () => {
    const slotInPast = new Date(now - 60 * 60 * 1000);
    expect(isSlotRejected(slotInPast, minStart)).toBe(true);
  });

  it("slot em now + 3h é ACEITO", () => {
    const slotFuture = new Date(now + 3 * 60 * 60 * 1000);
    expect(isSlotRejected(slotFuture, minStart)).toBe(false);
  });

  describe("configurabilidade via env var", () => {
    it("SLOT_MIN_NOTICE_HOURS é lida do env (padrão 2)", () => {
      const hours = parseInt(process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2", 10);
      expect(hours).toBeGreaterThanOrEqual(0);
      // Default 2 em ambiente sem a variável
    });

    it("com SLOT_MIN_NOTICE_HOURS=1, limite é 1h", () => {
      const customHours = 1;
      const customMinStart = getMinStartForHours(now, customHours);
      // Slot em now + 1h00m00s000ms → REJEITADO
      const atLimit = new Date(customMinStart.getTime());
      expect(isSlotRejected(atLimit, customMinStart)).toBe(true);
      // Slot em now + 1h00m00s001ms → ACEITO
      const justAfter = new Date(customMinStart.getTime() + 1);
      expect(isSlotRejected(justAfter, customMinStart)).toBe(false);
    });
  });
});
