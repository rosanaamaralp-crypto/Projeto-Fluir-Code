import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { ServicesRepository } from "../repositories/services.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { ProfessionalServicesRepository } from "../repositories/professional-services.repository.js";
import { AvailabilityRepository } from "../repositories/availability.repository.js";
import { AppointmentsRepository } from "../repositories/appointments.repository.js";
import { BlockedPeriodsRepository } from "../repositories/blocked-periods.repository.js";
import { ResourcesRepository } from "../repositories/resources.repository.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";

type DB = NodePgDatabase<typeof schema>;

// Configuração via env vars (com defaults aprovados)
function getMinNoticeMs(): number {
  const hours = parseInt(process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2", 10);
  return hours * 60 * 60 * 1000;
}

function getMaxAdvanceMs(): number {
  const days = parseInt(process.env["SLOT_MAX_ADVANCE_DAYS"] ?? "60", 10);
  return days * 24 * 60 * 60 * 1000;
}

export interface AvailableSlot {
  startDatetime: string; // ISO 8601 UTC
  endDatetime: string;   // ISO 8601 UTC
}

/** Verifica sobreposição de intervalos: [aStart, aEnd) e [bStart, bEnd) */
function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Calcula todos os slots disponíveis para um profissional/serviço em um dia.
 *
 * Regras (todas em UTC):
 * 1. service ACTIVE
 * 2. professional ACTIVE
 * 3. professional oferece o service (professional_services.active = true)
 * 4. availability ativa para o weekday do date em UTC
 * 5. Gera slots de durationMinutes dentro das janelas de disponibilidade
 * 6. Respeita SLOT_MIN_NOTICE_HOURS
 * 7. Respeita SLOT_MAX_ADVANCE_DAYS
 * 8. Exclui slots que conflitem com appointments ativos do profissional
 * 9. Exclui slots que conflitem com blocked_periods ativos do profissional
 * 10. Se modality = IN_PERSON, verifica se existe pelo menos 1 resource ACTIVE disponível
 * 11. (clientId opcional) Exclui slots que conflitem com appointments ativos do cliente
 */
export const SlotsService = {
  async getAvailableSlots(
    db: DB,
    params: {
      professionalId: string;
      serviceId: string;
      date: string; // YYYY-MM-DD (interpretado em UTC)
      modality?: "IN_PERSON" | "HOME_CARE";
      clientId?: string; // para checar conflitos do próprio cliente
    },
  ): Promise<AvailableSlot[]> {
    const { professionalId, serviceId, date, modality, clientId } = params;

    // 1. Buscar e validar service
    const service = await ServicesRepository.findById(db, serviceId);
    if (!service) throw new NotFoundError("Serviço não encontrado.");
    if (service.status !== "ACTIVE") throw new ValidationError("Serviço inativo.");

    // Validar modality vs allowed_modalities do service
    if (modality) {
      const allowed = service.allowedModalities;
      if (allowed !== "BOTH" && allowed !== modality) {
        throw new ValidationError(
          `Este serviço não permite a modalidade ${modality}.`,
        );
      }
    }

    // 2. Buscar e validar professional
    const professional = await ProfessionalsRepository.findById(db, professionalId);
    if (!professional) throw new NotFoundError("Profissional não encontrado.");
    if (professional.status !== "ACTIVE") throw new ValidationError("Profissional inativo.");

    // 3. Verificar que o profissional oferece o serviço
    const ps = await ProfessionalServicesRepository.findOne(db, professionalId, serviceId);
    if (!ps || !ps.active) {
      throw new ValidationError("Este profissional não oferece este serviço.");
    }

    // 4. Calcular weekday do date em UTC (0=domingo ... 6=sábado)
    const dateUtc = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(dateUtc.getTime())) {
      throw new ValidationError("Data inválida.");
    }
    const weekday = dateUtc.getUTCDay();

    // 5. Buscar janelas de disponibilidade ativas para o weekday
    const windows = await AvailabilityRepository.findByProfessionalAndWeekday(
      db,
      professionalId,
      weekday,
    );
    if (windows.length === 0) return [];

    const durationMs = service.durationMinutes * 60 * 1000;
    const now = Date.now();
    const minNoticeMs = getMinNoticeMs();
    const maxAdvanceMs = getMaxAdvanceMs();

    // Limites de antecedência
    const minStart = new Date(now + minNoticeMs);
    const maxStart = new Date(now + maxAdvanceMs);

    // 6. Gerar todos os slots candidatos dentro das janelas de disponibilidade
    const candidateSlots: Array<{ start: Date; end: Date }> = [];

    for (const window of windows) {
      const [sh, sm] = window.startTime.split(":").map(Number);
      const [eh, em] = window.endTime.split(":").map(Number);

      const windowStart = new Date(dateUtc);
      windowStart.setUTCHours(sh!, sm!, 0, 0);

      const windowEnd = new Date(dateUtc);
      windowEnd.setUTCHours(eh!, em!, 0, 0);

      let slotStart = new Date(windowStart);
      while (slotStart.getTime() + durationMs <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        candidateSlots.push({ start: new Date(slotStart), end: slotEnd });
        slotStart = slotEnd;
      }
    }

    if (candidateSlots.length === 0) return [];

    // Determinar o range completo do dia para queries eficientes
    const dayStart = new Date(dateUtc);
    const dayEnd = new Date(dateUtc);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // 7 & 8. Buscar appointments e blocked_periods que conflitem com o dia
    const [activeAppointments, blockedPeriods] = await Promise.all([
      AppointmentsRepository.findActiveByProfessionalInRange(
        db, professionalId, dayStart, dayEnd,
      ),
      BlockedPeriodsRepository.findActiveOverlapping(
        db, professionalId, dayStart, dayEnd,
      ),
    ]);

    // Buscar appointments do cliente se clientId fornecido
    const clientAppointments = clientId
      ? await AppointmentsRepository.findActiveByClientInRange(
          db, clientId, dayStart, dayEnd,
        )
      : [];

    // Recursos ACTIVE para checagem IN_PERSON
    const allResources = modality === "IN_PERSON"
      ? await ResourcesRepository.findAll(db, true)
      : [];

    // 9-11. Filtrar slots
    const availableSlots: AvailableSlot[] = [];

    for (const slot of candidateSlots) {
      // 6b. Respeitar antecedência mínima e máxima
      if (slot.start <= minStart) continue;
      if (slot.start > maxStart) continue;

      // 8. Conflito com appointments do profissional
      const profConflict = activeAppointments.some((a) =>
        overlaps(slot.start, slot.end, a.startDatetime, a.endDatetime),
      );
      if (profConflict) continue;

      // 9. Conflito com blocked_periods
      const blockConflict = blockedPeriods.some((b) =>
        overlaps(slot.start, slot.end, b.startDatetime, b.endDatetime),
      );
      if (blockConflict) continue;

      // 10. Conflito com appointments do cliente
      if (clientId) {
        const clientConflict = clientAppointments.some((a) =>
          overlaps(slot.start, slot.end, a.startDatetime, a.endDatetime),
        );
        if (clientConflict) continue;
      }

      // 11. Se IN_PERSON, verificar se há ao menos 1 resource disponível
      if (modality === "IN_PERSON" && allResources.length > 0) {
        // Para cada resource ACTIVE, verificar se está livre no slot
        let hasAvailableResource = false;
        for (const resource of allResources) {
          const occupied = await AppointmentsRepository.findActiveByResourceInRange(
            db, resource.id, slot.start, slot.end,
          );
          if (occupied.length === 0) {
            hasAvailableResource = true;
            break;
          }
        }
        if (!hasAvailableResource) continue;
      }

      availableSlots.push({
        startDatetime: slot.start.toISOString(),
        endDatetime: slot.end.toISOString(),
      });
    }

    return availableSlots;
  },
};
