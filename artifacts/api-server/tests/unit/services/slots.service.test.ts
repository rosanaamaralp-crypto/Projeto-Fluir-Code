import { describe, it, expect } from "vitest";

/**
 * Testes unitários do algoritmo de slots.
 * Testamos a lógica de sobreposição e geração de slots isolada.
 */

/** Replica da função overlaps do slots.service */
function overlaps(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Gera slots a partir de uma janela de disponibilidade */
function generateSlots(
  dateUtc: Date,
  windowStartH: number, windowStartM: number,
  windowEndH: number, windowEndM: number,
  durationMinutes: number,
): Array<{ start: Date; end: Date }> {
  const windowStart = new Date(dateUtc);
  windowStart.setUTCHours(windowStartH, windowStartM, 0, 0);
  const windowEnd = new Date(dateUtc);
  windowEnd.setUTCHours(windowEndH, windowEndM, 0, 0);

  const durationMs = durationMinutes * 60 * 1000;
  const slots: Array<{ start: Date; end: Date }> = [];

  let slotStart = new Date(windowStart);
  while (slotStart.getTime() + durationMs <= windowEnd.getTime()) {
    const slotEnd = new Date(slotStart.getTime() + durationMs);
    slots.push({ start: new Date(slotStart), end: slotEnd });
    slotStart = slotEnd;
  }
  return slots;
}

describe("Algoritmo de sobreposição de slots", () => {
  it("detecta sobreposição parcial pelo início", () => {
    const aStart = new Date("2026-09-01T09:00:00Z");
    const aEnd   = new Date("2026-09-01T10:00:00Z");
    const bStart = new Date("2026-09-01T09:30:00Z");
    const bEnd   = new Date("2026-09-01T10:30:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("detecta sobreposição parcial pelo fim", () => {
    const aStart = new Date("2026-09-01T10:00:00Z");
    const aEnd   = new Date("2026-09-01T11:00:00Z");
    const bStart = new Date("2026-09-01T09:30:00Z");
    const bEnd   = new Date("2026-09-01T10:30:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("detecta sobreposição completa (b contém a)", () => {
    const aStart = new Date("2026-09-01T10:00:00Z");
    const aEnd   = new Date("2026-09-01T11:00:00Z");
    const bStart = new Date("2026-09-01T09:00:00Z");
    const bEnd   = new Date("2026-09-01T12:00:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("não detecta sobreposição quando b termina exatamente quando a começa", () => {
    const aStart = new Date("2026-09-01T10:00:00Z");
    const aEnd   = new Date("2026-09-01T11:00:00Z");
    const bStart = new Date("2026-09-01T09:00:00Z");
    const bEnd   = new Date("2026-09-01T10:00:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("não detecta sobreposição quando b começa depois do fim de a", () => {
    const aStart = new Date("2026-09-01T09:00:00Z");
    const aEnd   = new Date("2026-09-01T10:00:00Z");
    const bStart = new Date("2026-09-01T10:00:00Z");
    const bEnd   = new Date("2026-09-01T11:00:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("não detecta sobreposição entre intervalos completamente separados", () => {
    const aStart = new Date("2026-09-01T09:00:00Z");
    const aEnd   = new Date("2026-09-01T10:00:00Z");
    const bStart = new Date("2026-09-01T11:00:00Z");
    const bEnd   = new Date("2026-09-01T12:00:00Z");
    expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});

describe("Geração de slots dentro de janela de disponibilidade", () => {
  const date = new Date("2026-09-07T00:00:00Z"); // Um dia qualquer UTC

  it("gera 3 slots de 60min entre 09:00 e 12:00", () => {
    const slots = generateSlots(date, 9, 0, 12, 0, 60);
    expect(slots).toHaveLength(3);
    expect(slots[0]!.start.toISOString()).toBe("2026-09-07T09:00:00.000Z");
    expect(slots[0]!.end.toISOString()).toBe("2026-09-07T10:00:00.000Z");
    expect(slots[1]!.start.toISOString()).toBe("2026-09-07T10:00:00.000Z");
    expect(slots[2]!.start.toISOString()).toBe("2026-09-07T11:00:00.000Z");
  });

  it("gera 6 slots de 30min entre 09:00 e 12:00", () => {
    const slots = generateSlots(date, 9, 0, 12, 0, 30);
    expect(slots).toHaveLength(6);
  });

  it("não gera slot se a janela for menor que a duração", () => {
    const slots = generateSlots(date, 9, 0, 9, 30, 60);
    expect(slots).toHaveLength(0);
  });

  it("gera exatamente 1 slot quando janela == duração", () => {
    const slots = generateSlots(date, 9, 0, 10, 0, 60);
    expect(slots).toHaveLength(1);
  });

  it("slots são contíguos e sem sobreposição entre si", () => {
    const slots = generateSlots(date, 9, 0, 12, 0, 60);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.start.getTime()).toBe(slots[i - 1]!.end.getTime());
    }
  });
});

describe("weekday UTC", () => {
  it("calcula corretamente o weekday de uma data em UTC", () => {
    // 2026-09-07 é segunda-feira (weekday = 1 em UTC)
    const d = new Date("2026-09-07T00:00:00.000Z");
    expect(d.getUTCDay()).toBe(1);
  });

  it("2026-09-06 é domingo (weekday = 0)", () => {
    const d = new Date("2026-09-06T00:00:00.000Z");
    expect(d.getUTCDay()).toBe(0);
  });
});
