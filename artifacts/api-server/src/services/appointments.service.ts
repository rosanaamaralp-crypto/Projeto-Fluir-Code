/**
 * AppointmentsService — regras de negócio do módulo de agendamentos.
 *
 * DECISÕES DE DESIGN (OBS-2 documentado aqui):
 * - Todo audit de appointment está DENTRO da transaction — nunca fire-and-forget.
 *   Se o audit falhar, a operação faz rollback. Contraste com login/logout (fire-and-forget),
 *   que foi aceito como comportamento legado e não é replicado aqui.
 *
 * CONCORRÊNCIA:
 * - As verificações de disponibilidade (SELECTs) são otimistas: dão boas mensagens de erro.
 * - A proteção definitiva contra double-booking são as EXCLUDE constraints do banco:
 *     excl_client_no_overlap, excl_professional_no_overlap, excl_resource_no_overlap
 * - Em conflito concorrente, o banco levanta 23P01 → mapDbError → ConflictError (409).
 * - Não se confia somente em SELECT ... FOR UPDATE pois não impede dois INSERTs simultâneos.
 *
 * MODALIDADES (valores exatos do banco):
 * - "IN_PERSON": resource_id NOT NULL, address_id NULL (chk_appt_modality_refs)
 * - "HOME_CARE":  resource_id NULL, address_id NOT NULL
 */

import { sql } from "drizzle-orm";
import type { DrizzleDB } from "../lib/db-types.js";
import { AppointmentsRepository, type AppointmentRow } from "../repositories/appointments.repository.js";
import { AppointmentStatusHistoryRepository } from "../repositories/appointment-status-history.repository.js";
import { ClientsRepository } from "../repositories/clients.repository.js";
import { ProfessionalsRepository } from "../repositories/professionals.repository.js";
import { ServicesRepository } from "../repositories/services.repository.js";
import { ProfessionalServicesRepository } from "../repositories/professional-services.repository.js";
import { AvailabilityRepository } from "../repositories/availability.repository.js";
import { BlockedPeriodsRepository } from "../repositories/blocked-periods.repository.js";
import { ResourcesRepository } from "../repositories/resources.repository.js";
import { AddressesRepository } from "../repositories/addresses.repository.js";
import { AuditLogsRepository } from "../repositories/audit-logs.repository.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../lib/errors.js";
import { ROLES } from "../middlewares/require-role.js";
import type { CreateAppointmentInput, RescheduleInput, ListAppointmentsQuery, AlterAppointmentInput } from "../validators/appointments.validator.js";
import type { UpdateAppointmentFieldsData } from "../repositories/appointments.repository.js";
import { NotificationService } from "./notifications.service.js";

// ─── Configuração (mesma dos slots, sem duplicar) ─────────────────────────

function getMinNoticeMs(): number {
  const hours = parseInt(process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2", 10);
  return hours * 60 * 60 * 1000;
}

function getMaxAdvanceMs(): number {
  const days = parseInt(process.env["SLOT_MAX_ADVANCE_DAYS"] ?? "60", 10);
  return days * 24 * 60 * 60 * 1000;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Sobreposição de intervalos: [aStart, aEnd) e [bStart, bEnd) */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Valida transição de status conforme role.
 *
 * Matriz de transições permitidas:
 *   CONFIRMED  → CANCELLED     : CLIENT (próprio), PROFESSIONAL (próprio), ADMIN
 *   CONFIRMED  → IN_PROGRESS   : PROFESSIONAL (próprio), ADMIN
 *   CONFIRMED  → NO_SHOW       : PROFESSIONAL (próprio), ADMIN          [F5.2 — RN-054]
 *   IN_PROGRESS → COMPLETED    : PROFESSIONAL (próprio), ADMIN
 *   IN_PROGRESS → NO_SHOW      : PROFESSIONAL (próprio), ADMIN
 *   IN_PROGRESS → CANCELLED    : ADMIN apenas
 *   COMPLETED / CANCELLED / NO_SHOW → imutável (estados terminais)
 */
function validateTransition(
  currentStatus: string,
  newStatus: string,
  roleId: number,
): void {
  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW"];
  if (TERMINAL.includes(currentStatus)) {
    throw new ValidationError(
      `Agendamento com status '${currentStatus}' não pode ter status alterado.`,
    );
  }

  if (currentStatus === "CONFIRMED") {
    if (newStatus === "CANCELLED") return; // Todos os roles
    if (newStatus === "IN_PROGRESS" && (roleId === ROLES.PROFESSIONAL || roleId === ROLES.ADMIN)) return;
    if (newStatus === "NO_SHOW" && (roleId === ROLES.PROFESSIONAL || roleId === ROLES.ADMIN)) return; // RN-054
    throw new ValidationError(
      `Transição '${currentStatus}' → '${newStatus}' não permitida para este perfil.`,
    );
  }

  if (currentStatus === "IN_PROGRESS") {
    if ((newStatus === "COMPLETED" || newStatus === "NO_SHOW") &&
        (roleId === ROLES.PROFESSIONAL || roleId === ROLES.ADMIN)) return;
    if (newStatus === "CANCELLED" && roleId === ROLES.ADMIN) return;
    throw new ValidationError(
      `Transição '${currentStatus}' → '${newStatus}' não permitida para este perfil.`,
    );
  }

  throw new ValidationError(
    `Transição de status '${currentStatus}' → '${newStatus}' não é válida.`,
  );
}

/**
 * Verifica ownership de um appointment conforme o role:
 * - CLIENT: appointment.clientId deve corresponder ao clientId próprio
 * - PROFESSIONAL: appointment.professionalId deve corresponder ao próprio
 * - ADMIN: acesso irrestrito
 */
async function assertAppointmentOwnership(
  db: DrizzleDB,
  appointment: AppointmentRow,
  sessionUserId: string,
  sessionRoleId: number,
): Promise<void> {
  if (sessionRoleId === ROLES.ADMIN) return;

  if (sessionRoleId === ROLES.CLIENT) {
    const client = await ClientsRepository.findByUserId(db, sessionUserId);
    if (!client || client.id !== appointment.clientId) {
      throw new ForbiddenError();
    }
    return;
  }

  if (sessionRoleId === ROLES.PROFESSIONAL) {
    const prof = await ProfessionalsRepository.findByUserId(db, sessionUserId);
    if (!prof || prof.id !== appointment.professionalId) {
      throw new ForbiddenError();
    }
    return;
  }

  throw new ForbiddenError();
}

/**
 * Verifica se o horário solicitado está dentro de pelo menos uma janela
 * de disponibilidade ativa do profissional para o weekday em UTC.
 */
async function validateInAvailabilityWindow(
  db: DrizzleDB,
  professionalId: string,
  start: Date,
  end: Date,
): Promise<void> {
  const weekday = start.getUTCDay(); // 0=domingo … 6=sábado
  const windows = await AvailabilityRepository.findByProfessionalAndWeekday(db, professionalId, weekday);

  const fitsInWindow = windows.some((w) => {
    const [sh, sm] = w.startTime.split(":").map(Number);
    const [eh, em] = w.endTime.split(":").map(Number);
    const wStart = new Date(start);
    wStart.setUTCHours(sh!, sm!, 0, 0);
    const wEnd = new Date(start);
    wEnd.setUTCHours(eh!, em!, 0, 0);
    return start >= wStart && end <= wEnd;
  });

  if (!fitsInWindow) {
    throw new ConflictError("Horário fora da disponibilidade do profissional.");
  }
}

/**
 * Resolve o resourceId para agendamentos IN_PERSON dentro de uma transaction:
 * - Se resourceId fornecido: valida que é ACTIVE e está livre.
 * - Se não fornecido: seleciona automaticamente o primeiro resource ACTIVE disponível.
 * - Se nenhum disponível: ConflictError 409.
 *
 * @param excludeAppointmentId — ID do appointment sendo alterado in-place.
 *   Quando fornecido, esse appointment é excluído da checagem de conflito para
 *   evitar self-conflict na operação alter (RN-055/RN-056).
 */
async function resolveResource(
  db: DrizzleDB,
  resourceId: string | undefined,
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
): Promise<string> {
  const allActive = await ResourcesRepository.findAll(db, true);
  if (allActive.length === 0) {
    throw new ConflictError("Nenhuma sala disponível para atendimento presencial.");
  }

  if (resourceId) {
    const resource = allActive.find((r) => r.id === resourceId);
    if (!resource) {
      throw new NotFoundError("Sala não encontrada ou inativa.");
    }
    const occupied = await AppointmentsRepository.findActiveByResourceInRange(db, resourceId, start, end);
    const busy = occupied.some(
      (a) =>
        (excludeAppointmentId === undefined || a.id !== excludeAppointmentId) &&
        overlaps(start, end, a.startDatetime, a.endDatetime),
    );
    if (busy) {
      throw new ConflictError("Sala já ocupada neste horário.");
    }
    return resourceId;
  }

  // F17.4 — Serializar a auto-seleção concorrente com advisory lock transacional
  // (liberado automaticamente no COMMIT/ROLLBACK). Sem isso, N transações
  // simultâneas leem o mesmo estado e escolhem a mesma maca — apenas 1 vence.
  // Afeta somente o caminho de auto-seleção; resourceId explícito não passa aqui.
  // A EXCLUDE constraint permanece como proteção definitiva.
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('appointments_resource_auto_select'))`);

  // Auto-selecionar primeiro resource livre
  for (const r of allActive) {
    const occupied = await AppointmentsRepository.findActiveByResourceInRange(db, r.id, start, end);
    const busy = occupied.some(
      (a) =>
        (excludeAppointmentId === undefined || a.id !== excludeAppointmentId) &&
        overlaps(start, end, a.startDatetime, a.endDatetime),
    );
    if (!busy) {
      return r.id;
    }
  }

  throw new ConflictError("Nenhuma sala disponível neste horário.");
}

/**
 * F17.4 — Detecta violação da EXCLUDE constraint de resource (23P01 em
 * excl_resource_no_overlap). Usado exclusivamente para o retry da
 * auto-seleção de maca: quando duas transações concorrentes auto-selecionam
 * a mesma maca por leitura prévia, a perdedora pode reconsultar e tentar
 * outra maca livre. Conflitos de cliente/profissional NÃO são retryados
 * (retentar produziria o mesmo resultado).
 */
function isResourceExclusionConflict(err: unknown): boolean {
  const candidate =
    typeof err === "object" && err !== null && "cause" in err
      ? ((err as { cause?: unknown }).cause ?? err)
      : err;
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as { code?: string }).code === "23P01" &&
    (candidate as { constraint?: string }).constraint === "excl_resource_no_overlap"
  );
}

// ─── Service ──────────────────────────────────────────────────────────────

export const AppointmentsService = {
  /**
   * Cria um novo agendamento.
   *
   * Fluxo (tudo dentro de db.transaction):
   *  1. Resolver client (session para CLIENT, payload.clientId para ADMIN)
   *  2. Validar client ACTIVE
   *  3. Validar professional ACTIVE
   *  4. Validar service ACTIVE
   *  5. Validar professional_services.active = true
   *  6. Validar modality vs allowedModalities do service
   *  7. Calcular endDatetime = startDatetime + durationMinutes
   *  8. Validar antecedência mínima (SLOT_MIN_NOTICE_HOURS, boundary estrito)
   *  9. Validar antecedência máxima (SLOT_MAX_ADVANCE_DAYS)
   * 10. Validar janela de disponibilidade do profissional
   * 11. Validar blocked_periods
   * 12. Validar conflito do cliente
   * 13. Validar conflito do profissional
   * 14. Resolver resource (IN_PERSON) ou address (HOME_CARE)
   * 15. Capturar price_at_booking = service.price (congelado)
   * 16. INSERT appointments (status = CONFIRMED)
   * 17. INSERT appointment_status_history
   * 18. INSERT audit_log (dentro da tx — não fire-and-forget)
   * 19. COMMIT
   *
   * Em conflito concorrente: banco levanta 23P01 → ConflictError (409).
   */
  async create(
    db: DrizzleDB,
    params: {
      input: CreateAppointmentInput;
      sessionUserId: string;
      sessionRoleId: number;
      ipAddress: string | null;
    },
  ): Promise<AppointmentRow> {
    const { input } = params;

    // F17.4 — Retry controlado da auto-seleção de maca:
    // somente IN_PERSON sem resourceId explícito; máx. 3 tentativas.
    // A EXCLUDE constraint permanece como proteção definitiva; o retry apenas
    // reconsulta as macas livres após perder a disputa (rollback da tx).
    const isAutoSelect = input.modality === "IN_PERSON" && !input.resourceId;
    const maxAttempts = isAutoSelect ? 3 : 1;

    let created: AppointmentRow | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        created = await AppointmentsService.createAttempt(db, params);
        break;
      } catch (err) {
        if (attempt < maxAttempts && isResourceExclusionConflict(err)) {
          continue;
        }
        throw err;
      }
    }
    if (!created) {
      // Inalcançável (o loop retorna ou lança), mas satisfaz o narrowing do TS
      throw new ConflictError("Conflito de horário: já existe um agendamento neste intervalo.");
    }

    // F8 — Notificações (best-effort: falha não reverte o agendamento)
    try {
      const [clientRec, professionalRec] = await Promise.all([
        ClientsRepository.findById(db, created.clientId),
        ProfessionalsRepository.findById(db, created.professionalId),
      ]);
      if (clientRec?.userId && professionalRec?.userId) {
        await NotificationService.notifyAppointmentCreated(db, {
          clientUserId: clientRec.userId,
          professionalUserId: professionalRec.userId,
          appointmentId: created.id,
          startDatetime: created.startDatetime,
        });
      }
    } catch {
      // best-effort: falha na notificação não reverte o agendamento
    }

    return created;
  },

  /**
   * F17.4 — Uma tentativa de criação (validações + insert) dentro de uma
   * transaction. Extraído de create() para permitir o retry controlado da
   * auto-seleção de maca sem duplicar a lógica. Comportamento inalterado.
   */
  async createAttempt(
    db: DrizzleDB,
    params: {
      input: CreateAppointmentInput;
      sessionUserId: string;
      sessionRoleId: number;
      ipAddress: string | null;
    },
  ): Promise<AppointmentRow> {
    const { input, sessionUserId, sessionRoleId, ipAddress } = params;
    return await db.transaction(async (tx) => {
      // 1. Resolver client
      let clientId: string;
      if (sessionRoleId === ROLES.CLIENT) {
        const client = await ClientsRepository.findByUserId(tx, sessionUserId);
        if (!client) {
          throw new ValidationError("Usuário não possui perfil de cliente.");
        }
        if (client.status !== "ACTIVE") {
          throw new ValidationError("Cliente inativo. Não é possível criar agendamentos.");
        }
        clientId = client.id;
      } else {
        // ADMIN
        if (!input.clientId) {
          throw new ValidationError("clientId é obrigatório quando o solicitante é ADMIN.");
        }
        const client = await ClientsRepository.findById(tx, input.clientId);
        if (!client) throw new NotFoundError("Cliente não encontrado.");
        if (client.status !== "ACTIVE") {
          throw new ValidationError("Cliente inativo. Não é possível criar agendamentos.");
        }
        clientId = client.id;
      }

      // 2. Professional
      const professional = await ProfessionalsRepository.findById(tx, input.professionalId);
      if (!professional) throw new NotFoundError("Profissional não encontrado.");
      if (professional.status !== "ACTIVE") {
        throw new ValidationError("Profissional inativo.");
      }

      // 3. Service
      const service = await ServicesRepository.findById(tx, input.serviceId);
      if (!service) throw new NotFoundError("Serviço não encontrado.");
      if (service.status !== "ACTIVE") {
        throw new ValidationError("Serviço inativo.");
      }

      // 4. Professional-service link
      const ps = await ProfessionalServicesRepository.findOne(tx, input.professionalId, input.serviceId);
      if (!ps || !ps.active) {
        throw new ValidationError("Este profissional não oferece este serviço.");
      }

      // 5. Modality vs service
      const allowed = service.allowedModalities; // "IN_PERSON" | "HOME_CARE" | "BOTH"
      if (allowed !== "BOTH" && allowed !== input.modality) {
        throw new ValidationError(
          `Este serviço não permite a modalidade '${input.modality}'.`,
        );
      }

      // 5.5. Validação antecipada de campos obrigatórios por modalidade
      // (antes das queries de disponibilidade — erro de validação, não de conflito)
      if (input.modality === "HOME_CARE" && !input.addressId) {
        throw new ValidationError("addressId é obrigatório para modalidade HOME_CARE.");
      }

      // 6. Calcular datas
      const start = new Date(input.startDatetime);
      const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

      // 7. Antecedência mínima (boundary estrito: start <= minStart é REJEITADO)
      const now = Date.now();
      const minNoticeMs = getMinNoticeMs();
      const minStart = new Date(now + minNoticeMs);
      if (start <= minStart) {
        throw new ValidationError(
          `O agendamento deve ser feito com antecedência mínima de ${process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2"}h.`,
        );
      }

      // 8. Antecedência máxima
      const maxAdvanceMs = getMaxAdvanceMs();
      const maxStart = new Date(now + maxAdvanceMs);
      if (start > maxStart) {
        throw new ValidationError(
          `O agendamento não pode ser feito com mais de ${process.env["SLOT_MAX_ADVANCE_DAYS"] ?? "60"} dias de antecedência.`,
        );
      }

      // 9. Disponibilidade do profissional
      await validateInAvailabilityWindow(tx, input.professionalId, start, end);

      // 10. Blocked periods
      const blocked = await BlockedPeriodsRepository.findActiveOverlapping(
        tx, input.professionalId, start, end,
      );
      if (blocked.length > 0) {
        throw new ConflictError("Profissional bloqueado neste horário.");
      }

      // 11. Conflito do cliente
      const clientConflicts = await AppointmentsRepository.findActiveByClientInRange(
        tx, clientId, start, end,
      );
      if (clientConflicts.some((a) => overlaps(start, end, a.startDatetime, a.endDatetime))) {
        throw new ConflictError("Cliente já possui agendamento neste horário.");
      }

      // 12. Conflito do profissional
      const profConflicts = await AppointmentsRepository.findActiveByProfessionalInRange(
        tx, input.professionalId, start, end,
      );
      if (profConflicts.some((a) => overlaps(start, end, a.startDatetime, a.endDatetime))) {
        throw new ConflictError("Profissional já possui agendamento neste horário.");
      }

      // 13. Resource / Address conforme modalidade
      let resolvedResourceId: string | null = null;
      let resolvedAddressId: string | null = null;

      if (input.modality === "IN_PERSON") {
        resolvedResourceId = await resolveResource(tx, input.resourceId, start, end);
      } else {
        // HOME_CARE: addressId obrigatório e deve pertencer ao cliente
        if (!input.addressId) {
          throw new ValidationError("addressId é obrigatório para modalidade HOME_CARE.");
        }
        const address = await AddressesRepository.findById(tx, input.addressId);
        if (!address) {
          throw new NotFoundError("Endereço não encontrado.");
        }
        if (address.clientId !== clientId) {
          throw new ForbiddenError("Endereço não pertence ao cliente autenticado.");
        }
        resolvedAddressId = input.addressId;
      }

      // 14. Congelar preço (trigger prevent_price_at_booking_change garante imutabilidade)
      const priceAtBooking = service.price;

      // 15. Inserir appointment
      const appointment = await AppointmentsRepository.create(tx, {
        clientId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        modality: input.modality,
        resourceId: resolvedResourceId,
        addressId: resolvedAddressId,
        startDatetime: start,
        endDatetime: end,
        status: "CONFIRMED",
        priceAtBooking,
        notes: input.notes ?? null,
        createdBy: sessionUserId,
      });

      // 16. Histórico de status (old_status = null → CONFIRMED)
      await AppointmentStatusHistoryRepository.create(tx, {
        appointmentId: appointment.id,
        oldStatus: null,
        newStatus: "CONFIRMED",
        changedBy: sessionUserId,
      });

      // 17. Audit log (dentro da tx — se falhar, faz rollback)
      await AuditLogsRepository.create(tx, {
        userId: sessionUserId,
        action: "APPOINTMENT_CREATED",
        entityType: "appointments",
        entityId: appointment.id,
        newData: {
          appointmentId: appointment.id,
          clientId,
          professionalId: input.professionalId,
          serviceId: input.serviceId,
          modality: input.modality,
          startDatetime: start.toISOString(),
          endDatetime: end.toISOString(),
          status: "CONFIRMED",
          priceAtBooking,
        },
        ipAddress,
      });

      return appointment;
    });
  },

  /**
   * Lista appointments com filtros, respeitando ownership por role:
   * - CLIENT: vê apenas os próprios appointments (clientId forçado)
   * - PROFESSIONAL: vê apenas os do seu profissional (professionalId forçado)
   * - ADMIN: aplica todos os filtros fornecidos
   *
   * Um CLIENT não pode escapar do ownership passando ?clientId=OUTRO_UUID.
   */
  async list(
    db: DrizzleDB,
    params: {
      query: ListAppointmentsQuery;
      sessionUserId: string;
      sessionRoleId: number;
    },
  ): Promise<AppointmentRow[]> {
    const { query, sessionUserId, sessionRoleId } = params;

    const filter = { ...query };

    if (sessionRoleId === ROLES.CLIENT) {
      const client = await ClientsRepository.findByUserId(db, sessionUserId);
      if (!client) return [];
      // Ignora filtro clientId fornecido — força o próprio
      filter.clientId = client.id;
      delete filter.professionalId;
    } else if (sessionRoleId === ROLES.PROFESSIONAL) {
      const prof = await ProfessionalsRepository.findByUserId(db, sessionUserId);
      if (!prof) return [];
      // Ignora filtro professionalId fornecido — força o próprio
      filter.professionalId = prof.id;
      delete filter.clientId;
    }
    // ADMIN: usa filtros como fornecidos

    return AppointmentsRepository.findByFilter(db, filter);
  },

  /**
   * Retorna um appointment por ID, verificando ownership.
   */
  async getById(
    db: DrizzleDB,
    params: {
      appointmentId: string;
      sessionUserId: string;
      sessionRoleId: number;
    },
  ): Promise<AppointmentRow> {
    const { appointmentId, sessionUserId, sessionRoleId } = params;

    const appointment = await AppointmentsRepository.findById(db, appointmentId);
    if (!appointment) throw new NotFoundError("Agendamento não encontrado.");

    await assertAppointmentOwnership(db, appointment, sessionUserId, sessionRoleId);

    return appointment;
  },

  /**
   * Atualiza o status de um appointment (cancelamento ou mudança de status).
   * Fluxo dentro de transaction:
   *  1. Buscar appointment
   *  2. Verificar ownership
   *  3. Validar transição de status
   *  4. Atualizar status
   *  5. INSERT status_history
   *  6. INSERT audit_log (dentro da tx)
   */
  async updateStatus(
    db: DrizzleDB,
    params: {
      appointmentId: string;
      newStatus: string;
      reason?: string;
      sessionUserId: string;
      sessionRoleId: number;
      ipAddress: string | null;
    },
  ): Promise<AppointmentRow> {
    const { appointmentId, newStatus, reason, sessionUserId, sessionRoleId, ipAddress } = params;

    const statusResult = await db.transaction(async (tx) => {
      const appointment = await AppointmentsRepository.findById(tx, appointmentId);
      if (!appointment) throw new NotFoundError("Agendamento não encontrado.");

      await assertAppointmentOwnership(tx, appointment, sessionUserId, sessionRoleId);

      validateTransition(appointment.status, newStatus, sessionRoleId);

      const oldStatus = appointment.status;

      const updated = await AppointmentsRepository.updateStatus(tx, appointmentId, newStatus);
      if (!updated) throw new NotFoundError("Agendamento não encontrado.");

      await AppointmentStatusHistoryRepository.create(tx, {
        appointmentId,
        oldStatus,
        newStatus,
        changedBy: sessionUserId,
        reason: reason ?? null,
      });

      const action = newStatus === "CANCELLED"
        ? "APPOINTMENT_CANCELLED"
        : "APPOINTMENT_STATUS_CHANGED";

      await AuditLogsRepository.create(tx, {
        userId: sessionUserId,
        action,
        entityType: "appointments",
        entityId: appointmentId,
        oldData: { status: oldStatus },
        newData: { status: newStatus, reason: reason ?? null },
        ipAddress,
      });

      return updated;
    });

    // F8 — Notificações (best-effort: falha não reverte o agendamento)
    try {
      const [clientRec, professionalRec] = await Promise.all([
        ClientsRepository.findById(db, statusResult.clientId),
        ProfessionalsRepository.findById(db, statusResult.professionalId),
      ]);
      if (newStatus === "CANCELLED" && clientRec?.userId && professionalRec?.userId) {
        await NotificationService.notifyAppointmentCancelled(db, {
          clientUserId: clientRec.userId,
          professionalUserId: professionalRec.userId,
          appointmentId: statusResult.id,
          startDatetime: statusResult.startDatetime,
        });
      } else if (newStatus === "COMPLETED" && clientRec?.userId) {
        await NotificationService.notifyAppointmentCompleted(db, {
          clientUserId: clientRec.userId,
          appointmentId: statusResult.id,
          startDatetime: statusResult.startDatetime,
        });
      }
    } catch {
      // best-effort: falha na notificação não reverte o agendamento
    }

    return statusResult;
  },

  /**
   * Remarca um agendamento: cancela o original e cria um novo, atomicamente.
   *
   * Restrições:
   * - Apenas agendamentos CONFIRMED podem ser remarcados
   * - Apenas CLIENT (próprio) ou ADMIN
   * - O novo horário passa por TODAS as validações de disponibilidade
   *
   * Fluxo (dentro de uma única transaction):
   *  1. Buscar e validar appointment original (CONFIRMED)
   *  2. Verificar ownership
   *  3. Validar novo horário (todas as regras de criação)
   *  4. Cancelar appointment original (status → CANCELLED)
   *  5. INSERT status_history do cancelamento (campos de remarcação preenchidos)
   *  6. INSERT novo appointment (CONFIRMED)
   *  7. INSERT status_history do novo (old_status = null)
   *  8. INSERT audit_log (APPOINTMENT_RESCHEDULED)
   *  9. COMMIT
   *
   * Em qualquer falha: ROLLBACK completo.
   */
  async reschedule(
    db: DrizzleDB,
    params: {
      appointmentId: string;
      rescheduleInput: RescheduleInput;
      sessionUserId: string;
      sessionRoleId: number;
      ipAddress: string | null;
    },
  ): Promise<{ old: AppointmentRow; new: AppointmentRow }> {
    const { appointmentId, rescheduleInput, sessionUserId, sessionRoleId, ipAddress } = params;

    return db.transaction(async (tx) => {
      // 1. Buscar e validar appointment original
      const original = await AppointmentsRepository.findById(tx, appointmentId);
      if (!original) throw new NotFoundError("Agendamento não encontrado.");

      if (original.status !== "CONFIRMED") {
        throw new ValidationError(
          `Apenas agendamentos CONFIRMED podem ser remarcados. Status atual: '${original.status}'.`,
        );
      }

      // 2. Verificar role e ownership
      // PROFESSIONAL é bloqueado imediatamente — sem query desnecessária ao banco.
      if (sessionRoleId === ROLES.PROFESSIONAL) {
        throw new ForbiddenError("Profissionais não podem remarcar agendamentos.");
      }
      await assertAppointmentOwnership(tx, original, sessionUserId, sessionRoleId);

      // 3. Validar novo horário
      const service = await ServicesRepository.findById(tx, original.serviceId);
      if (!service || service.status !== "ACTIVE") {
        throw new ValidationError("Serviço inativo. Remarcação não permitida.");
      }

      const newStart = new Date(rescheduleInput.startDatetime);
      const newEnd = new Date(newStart.getTime() + service.durationMinutes * 60 * 1000);

      const now = Date.now();
      const minNoticeMs = getMinNoticeMs();
      if (newStart <= new Date(now + minNoticeMs)) {
        throw new ValidationError(
          `Novo horário deve respeitar a antecedência mínima de ${process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2"}h.`,
        );
      }
      if (newStart > new Date(now + getMaxAdvanceMs())) {
        throw new ValidationError("Novo horário excede a antecedência máxima permitida.");
      }

      await validateInAvailabilityWindow(tx, original.professionalId, newStart, newEnd);

      const blocked = await BlockedPeriodsRepository.findActiveOverlapping(
        tx, original.professionalId, newStart, newEnd,
      );
      if (blocked.length > 0) {
        throw new ConflictError("Profissional bloqueado no novo horário.");
      }

      // Conflitos — excluindo o próprio appointment original (que será cancelado)
      const clientConflicts = await AppointmentsRepository.findActiveByClientInRange(
        tx, original.clientId, newStart, newEnd,
      );
      if (clientConflicts.some((a) => a.id !== original.id && overlaps(newStart, newEnd, a.startDatetime, a.endDatetime))) {
        throw new ConflictError("Cliente já possui agendamento no novo horário.");
      }

      const profConflicts = await AppointmentsRepository.findActiveByProfessionalInRange(
        tx, original.professionalId, newStart, newEnd,
      );
      if (profConflicts.some((a) => a.id !== original.id && overlaps(newStart, newEnd, a.startDatetime, a.endDatetime))) {
        throw new ConflictError("Profissional já possui agendamento no novo horário.");
      }

      // Resource / Address conforme modalidade original
      let newResourceId: string | null = null;
      let newAddressId: string | null = null;

      if (original.modality === "IN_PERSON") {
        // Se resourceId fornecido usa esse, senão auto-seleciona
        newResourceId = await resolveResource(tx, rescheduleInput.resourceId, newStart, newEnd);
      } else {
        // HOME_CARE
        if (rescheduleInput.addressId) {
          const address = await AddressesRepository.findById(tx, rescheduleInput.addressId);
          if (!address || address.clientId !== original.clientId) {
            throw new ForbiddenError("Endereço não pertence ao cliente.");
          }
          newAddressId = rescheduleInput.addressId;
        } else {
          newAddressId = original.addressId;
        }
      }

      // 4. Cancelar appointment original
      const cancelled = await AppointmentsRepository.updateStatus(tx, appointmentId, "CANCELLED");
      if (!cancelled) throw new NotFoundError("Agendamento não encontrado.");

      // 5. Status history do cancelamento (com campos de remarcação)
      await AppointmentStatusHistoryRepository.create(tx, {
        appointmentId,
        oldStatus: "CONFIRMED",
        newStatus: "CANCELLED",
        changedBy: sessionUserId,
        reason: "Remarcação solicitada pelo cliente/admin.",
        oldStartDatetime: original.startDatetime,
        oldEndDatetime: original.endDatetime,
        newStartDatetime: newStart,
        newEndDatetime: newEnd,
        oldResourceId: original.resourceId,
        newResourceId,
        oldAddressId: original.addressId,
        newAddressId,
      });

      // 5b. Audit log APPOINTMENT_CANCELLED para o appointment ORIGINAL (OBS-A)
      // Garante rastreabilidade completa: queryar audit_logs pelo ID do original
      // retorna o evento de cancelamento, mesmo quando a causa foi um reagendamento.
      await AuditLogsRepository.create(tx, {
        userId: sessionUserId,
        action: "APPOINTMENT_CANCELLED",
        entityType: "appointments",
        entityId: appointmentId,
        oldData: { status: "CONFIRMED" },
        newData: { status: "CANCELLED", reason: "Remarcação solicitada pelo cliente/admin." },
        ipAddress,
      });

      // 6. Criar novo appointment
      const newAppointment = await AppointmentsRepository.create(tx, {
        clientId: original.clientId,
        professionalId: original.professionalId,
        serviceId: original.serviceId,
        modality: original.modality,
        resourceId: newResourceId,
        addressId: newAddressId,
        startDatetime: newStart,
        endDatetime: newEnd,
        status: "CONFIRMED",
        priceAtBooking: original.priceAtBooking,
        notes: original.notes,
        createdBy: sessionUserId,
      });

      // 7. Status history do novo appointment
      await AppointmentStatusHistoryRepository.create(tx, {
        appointmentId: newAppointment.id,
        oldStatus: null,
        newStatus: "CONFIRMED",
        changedBy: sessionUserId,
        reason: `Remarcação do agendamento ${appointmentId}.`,
        oldStartDatetime: original.startDatetime,
        oldEndDatetime: original.endDatetime,
        newStartDatetime: newStart,
        newEndDatetime: newEnd,
        oldResourceId: original.resourceId,
        newResourceId,
        oldAddressId: original.addressId,
        newAddressId,
      });

      // 8. Audit log único para a remarcação
      await AuditLogsRepository.create(tx, {
        userId: sessionUserId,
        action: "APPOINTMENT_RESCHEDULED",
        entityType: "appointments",
        entityId: newAppointment.id,
        oldData: {
          originalId: appointmentId,
          startDatetime: original.startDatetime.toISOString(),
          endDatetime: original.endDatetime.toISOString(),
          status: "CONFIRMED",
        },
        newData: {
          newId: newAppointment.id,
          startDatetime: newStart.toISOString(),
          endDatetime: newEnd.toISOString(),
          status: "CONFIRMED",
        },
        ipAddress,
      });

      return { old: cancelled, new: newAppointment };
    });
  },

  /**
   * Altera campos de um agendamento in-place — operação ALTER (F5.6 / RN-055 / RN-056).
   *
   * Restrições:
   *   - Apenas ADMIN pode executar (W1).
   *   - Somente agendamentos CONFIRMED podem ser alterados (W2).
   *   - serviceId e clientId são imutáveis.
   *   - endDatetime é recalculado pelo backend a partir de durationMinutes.
   *
   * Pipeline (tudo dentro de db.transaction):
   *  1.  findById → NotFoundError se ausente
   *  2.  status !== CONFIRMED → ValidationError
   *  3.  RBAC: não ADMIN → ForbiddenError
   *  4.  ServicesRepository.findById → capturar durationMinutes / allowedModalities
   *  5.  Se professionalId muda: validar ACTIVE + ProfessionalServicesRepository.findOne
   *  6.  Validar modality vs service.allowedModalities
   *  7.  Calcular horários efetivos (merge input com estado atual)
   *  8.  Validar antecedência mínima/máxima somente se startDatetime muda
   *  9.  validateInAvailabilityWindow (profissional efetivo)
   * 10.  BlockedPeriodsRepository.findActiveOverlapping
   * 11.  Conflito profissional (excluindo self)
   * 12.  Conflito cliente (excluindo self)
   * 13.  Resolver resource/address conforme modalidade efetiva
   * 14.  Construir setValues e verificar idempotência
   * 15.  AppointmentsRepository.updateFields
   * 16.  AppointmentStatusHistoryRepository.create (oldStatus = newStatus)
   * 17.  AuditLogsRepository.create (action: APPOINTMENT_ALTERED)
   * 18.  return updated; COMMIT
   */
  async update(
    db: DrizzleDB,
    params: {
      appointmentId: string;
      input: AlterAppointmentInput;
      sessionUserId: string;
      sessionRoleId: number;
      ipAddress: string | null;
    },
  ): Promise<AppointmentRow> {
    const { appointmentId, input, sessionUserId, sessionRoleId, ipAddress } = params;

    const altered = await db.transaction(async (tx) => {
      // 1. Buscar appointment
      const appointment = await AppointmentsRepository.findById(tx, appointmentId);
      if (!appointment) throw new NotFoundError("Agendamento não encontrado.");

      // 2. Somente CONFIRMED pode ser alterado (W2)
      if (appointment.status !== "CONFIRMED") {
        throw new ValidationError(
          `Agendamento com status '${appointment.status}' não pode ser alterado.`,
        );
      }

      // 3. RBAC — apenas ADMIN pode alterar (W1)
      if (sessionRoleId !== ROLES.ADMIN) {
        throw new ForbiddenError();
      }

      // 4. Carregar service (durationMinutes + allowedModalities)
      const service = await ServicesRepository.findById(tx, appointment.serviceId);
      if (!service || service.status !== "ACTIVE") {
        throw new ValidationError("Serviço inativo. Alteração não permitida.");
      }

      // 5. Validar novo profissional (somente se professionalId mudar)
      const effectiveProfessionalId = input.professionalId ?? appointment.professionalId;
      if (input.professionalId !== undefined && input.professionalId !== appointment.professionalId) {
        const newProf = await ProfessionalsRepository.findById(tx, input.professionalId);
        if (!newProf) throw new NotFoundError("Profissional não encontrado.");
        if (newProf.status !== "ACTIVE") {
          throw new ValidationError("Profissional inativo. Alteração não permitida.");
        }
        const ps = await ProfessionalServicesRepository.findOne(tx, input.professionalId, appointment.serviceId);
        if (!ps || !ps.active) {
          throw new ValidationError("Este profissional não oferece este serviço.");
        }
      }

      // 6. Validar modality vs service.allowedModalities
      const effectiveModality = input.modality ?? appointment.modality;
      const allowed = service.allowedModalities;
      if (allowed !== "BOTH" && allowed !== effectiveModality) {
        throw new ValidationError(`Este serviço não permite a modalidade '${effectiveModality}'.`);
      }

      // 7. Calcular horários efetivos
      const effectiveStart = input.startDatetime
        ? new Date(input.startDatetime)
        : appointment.startDatetime;
      const effectiveEnd = input.startDatetime
        ? new Date(effectiveStart.getTime() + service.durationMinutes * 60 * 1000)
        : appointment.endDatetime;

      // 8. Validar antecedência somente se startDatetime muda
      if (input.startDatetime) {
        const now = Date.now();
        if (effectiveStart <= new Date(now + getMinNoticeMs())) {
          throw new ValidationError(
            `O agendamento deve ser feito com antecedência mínima de ${process.env["SLOT_MIN_NOTICE_HOURS"] ?? "2"}h.`,
          );
        }
        if (effectiveStart > new Date(now + getMaxAdvanceMs())) {
          throw new ValidationError(
            `O agendamento não pode ser feito com mais de ${process.env["SLOT_MAX_ADVANCE_DAYS"] ?? "60"} dias de antecedência.`,
          );
        }
      }

      // 9. Validar janela de disponibilidade do profissional efetivo
      await validateInAvailabilityWindow(tx, effectiveProfessionalId, effectiveStart, effectiveEnd);

      // 10. Blocked periods
      const blocked = await BlockedPeriodsRepository.findActiveOverlapping(
        tx,
        effectiveProfessionalId,
        effectiveStart,
        effectiveEnd,
      );
      if (blocked.length > 0) {
        throw new ConflictError("Profissional bloqueado neste horário.");
      }

      // 11. Conflito do profissional (excluindo o próprio appointment)
      const profConflicts = await AppointmentsRepository.findActiveByProfessionalInRange(
        tx,
        effectiveProfessionalId,
        effectiveStart,
        effectiveEnd,
      );
      if (
        profConflicts.some(
          (a) => a.id !== appointmentId && overlaps(effectiveStart, effectiveEnd, a.startDatetime, a.endDatetime),
        )
      ) {
        throw new ConflictError("Profissional já possui agendamento neste horário.");
      }

      // 12. Conflito do cliente (excluindo o próprio appointment)
      const clientConflicts = await AppointmentsRepository.findActiveByClientInRange(
        tx,
        appointment.clientId,
        effectiveStart,
        effectiveEnd,
      );
      if (
        clientConflicts.some(
          (a) => a.id !== appointmentId && overlaps(effectiveStart, effectiveEnd, a.startDatetime, a.endDatetime),
        )
      ) {
        throw new ConflictError("Cliente já possui agendamento neste horário.");
      }

      // 13. Resolver resource/address conforme modalidade efetiva
      const modalityChanged = effectiveModality !== appointment.modality;
      const timeChanged = input.startDatetime !== undefined;

      let resolvedResourceId: string | null = appointment.resourceId;
      let resolvedAddressId: string | null = appointment.addressId;

      if (effectiveModality === "IN_PERSON") {
        resolvedAddressId = null;
        if (modalityChanged || timeChanged) {
          // Re-selecionar resource (horário ou modalidade mudou)
          // excludeAppointmentId evita self-conflict na checagem
          resolvedResourceId = await resolveResource(tx, undefined, effectiveStart, effectiveEnd, appointmentId);
        }
        // Se nem modalidade nem horário mudaram, manter resource atual
      } else {
        // HOME_CARE
        resolvedResourceId = null;
        const effectiveAddressId = input.addressId ?? appointment.addressId;
        if (!effectiveAddressId) {
          throw new ValidationError("addressId é obrigatório para modalidade HOME_CARE.");
        }
        if (modalityChanged || input.addressId !== undefined) {
          // Revalidar endereço quando modalidade ou addressId mudar
          const address = await AddressesRepository.findById(tx, effectiveAddressId);
          if (!address) throw new NotFoundError("Endereço não encontrado.");
          if (address.clientId !== appointment.clientId) {
            throw new ForbiddenError("Endereço não pertence ao cliente do agendamento.");
          }
        }
        resolvedAddressId = effectiveAddressId;
      }

      // 14. Construir setValues com campos que realmente mudam
      const setValues: UpdateAppointmentFieldsData = {};
      if (effectiveProfessionalId !== appointment.professionalId)
        setValues.professionalId = effectiveProfessionalId;
      if (effectiveModality !== appointment.modality)
        setValues.modality = effectiveModality;
      if (resolvedResourceId !== appointment.resourceId)
        setValues.resourceId = resolvedResourceId;
      if (resolvedAddressId !== appointment.addressId)
        setValues.addressId = resolvedAddressId;
      if (timeChanged) {
        setValues.startDatetime = effectiveStart;
        setValues.endDatetime = effectiveEnd;
      }

      // Idempotência: nenhum campo mudou → retornar appointment atual sem audit
      if (Object.keys(setValues).length === 0) {
        return appointment;
      }

      // 15. Persistir alteração
      const updated = await AppointmentsRepository.updateFields(tx, appointmentId, setValues);
      if (!updated) throw new NotFoundError("Agendamento não encontrado após atualização.");

      // 16. Registrar histórico (status não muda — old e new são iguais)
      await AppointmentStatusHistoryRepository.create(tx, {
        appointmentId,
        oldStatus: appointment.status,
        newStatus: appointment.status,
        changedBy: sessionUserId,
        reason: null,
        oldStartDatetime: appointment.startDatetime,
        newStartDatetime: effectiveStart,
        oldEndDatetime: appointment.endDatetime,
        newEndDatetime: effectiveEnd,
        oldResourceId: appointment.resourceId,
        newResourceId: resolvedResourceId,
        oldAddressId: appointment.addressId,
        newAddressId: resolvedAddressId,
      });

      // 17. Audit log
      await AuditLogsRepository.create(tx, {
        userId: sessionUserId,
        action: "APPOINTMENT_ALTERED",
        entityType: "appointments",
        entityId: appointmentId,
        oldData: {
          professionalId: appointment.professionalId,
          modality: appointment.modality,
          resourceId: appointment.resourceId,
          addressId: appointment.addressId,
          startDatetime: appointment.startDatetime.toISOString(),
          endDatetime: appointment.endDatetime.toISOString(),
        },
        newData: {
          professionalId: effectiveProfessionalId,
          modality: effectiveModality,
          resourceId: resolvedResourceId,
          addressId: resolvedAddressId,
          startDatetime: effectiveStart.toISOString(),
          endDatetime: effectiveEnd.toISOString(),
        },
        ipAddress,
      });

      return updated;
    });

    // F8 — Notificações (best-effort: falha não reverte o agendamento)
    try {
      const [clientRec, professionalRec] = await Promise.all([
        ClientsRepository.findById(db, altered.clientId),
        ProfessionalsRepository.findById(db, altered.professionalId),
      ]);
      if (clientRec?.userId && professionalRec?.userId) {
        await NotificationService.notifyAppointmentAltered(db, {
          clientUserId: clientRec.userId,
          professionalUserId: professionalRec.userId,
          appointmentId: altered.id,
          startDatetime: altered.startDatetime,
        });
      }
    } catch {
      // best-effort: falha na notificação não reverte o agendamento
    }

    return altered;
  },
};
