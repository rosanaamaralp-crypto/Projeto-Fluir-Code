/**
 * NotificationService — geração de notificações internas.
 *
 * F8 — Doc 18 §38 / Doc 17 §43 / Doc 18 PROMPT 16
 *
 * Responsável por criar registros na tabela notifications.
 * Não gera audit log (notificações são side-effects de ações já auditadas).
 * Chamado pelos AppointmentsService de forma best-effort (try/catch isolado).
 *
 * Destinatários por evento (D1 — aprovado):
 *   create   → CLIENT: APPOINTMENT_CONFIRMED; PROFESSIONAL: NEW_APPOINTMENT_RECEIVED
 *   alter    → CLIENT: APPOINTMENT_ALTERED;   PROFESSIONAL: APPOINTMENT_ALTERED
 *   cancel   → CLIENT: APPOINTMENT_CANCELLED; PROFESSIONAL: APPOINTMENT_CANCELLED
 *   complete → CLIENT: APPOINTMENT_COMPLETED; PROFESSIONAL: nenhuma
 *
 * Lembretes NÃO implementados nesta fase (D6 — aprovado).
 * Integrações externas (e-mail, SMS, WhatsApp) NÃO implementadas (Doc 18 PROMPT 16).
 */

import type { DrizzleDB } from "../lib/db-types.js";
import { NotificationsRepository } from "../repositories/notifications.repository.js";

// ─── Tipos de notificação (D2 — aprovado) ────────────────────────────────

export const NOTIFICATION_TYPES = {
  APPOINTMENT_CONFIRMED: "APPOINTMENT_CONFIRMED",
  NEW_APPOINTMENT_RECEIVED: "NEW_APPOINTMENT_RECEIVED",
  APPOINTMENT_ALTERED: "APPOINTMENT_ALTERED",
  APPOINTMENT_CANCELLED: "APPOINTMENT_CANCELLED",
  APPOINTMENT_COMPLETED: "APPOINTMENT_COMPLETED",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ─── Formatação de data/hora (UTC) ────────────────────────────────────────

function formatDate(dt: Date): string {
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const year = dt.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(dt: Date): string {
  const h = String(dt.getUTCHours()).padStart(2, "0");
  const m = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Factories de título/mensagem (D7 — texto legível completo) ───────────

function msgConfirmed(start: Date) {
  return {
    title: "Agendamento confirmado",
    message: `Seu agendamento em ${formatDate(start)} às ${formatTime(start)} foi confirmado.`,
  };
}

function msgNewReceived(start: Date) {
  return {
    title: "Novo agendamento recebido",
    message: `Você tem um novo agendamento em ${formatDate(start)} às ${formatTime(start)}.`,
  };
}

function msgAlteredClient(start: Date) {
  return {
    title: "Agendamento alterado",
    message: `Seu agendamento foi alterado para ${formatDate(start)} às ${formatTime(start)}.`,
  };
}

function msgAlteredProfessional(start: Date) {
  return {
    title: "Agendamento do cliente alterado",
    message: `Um agendamento foi alterado para ${formatDate(start)} às ${formatTime(start)}.`,
  };
}

function msgCancelled(start: Date) {
  return {
    title: "Agendamento cancelado",
    message: `Seu agendamento em ${formatDate(start)} às ${formatTime(start)} foi cancelado.`,
  };
}

function msgCompleted(start: Date) {
  return {
    title: "Atendimento concluído",
    message: `Seu atendimento em ${formatDate(start)} às ${formatTime(start)} foi concluído. Obrigado!`,
  };
}

// ─── NotificationService ─────────────────────────────────────────────────

export const NotificationService = {
  /**
   * Notifica CLIENT (APPOINTMENT_CONFIRMED) e PROFESSIONAL (NEW_APPOINTMENT_RECEIVED)
   * quando um agendamento é criado.
   * Chamado após AppointmentsService.create() — best-effort.
   */
  async notifyAppointmentCreated(
    db: DrizzleDB,
    opts: {
      clientUserId: string;
      professionalUserId: string;
      appointmentId: string;
      startDatetime: Date;
    },
  ): Promise<void> {
    const { clientUserId, professionalUserId, appointmentId, startDatetime } = opts;
    await Promise.all([
      NotificationsRepository.create(db, {
        userId: clientUserId,
        type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
        ...msgConfirmed(startDatetime),
        appointmentId,
      }),
      NotificationsRepository.create(db, {
        userId: professionalUserId,
        type: NOTIFICATION_TYPES.NEW_APPOINTMENT_RECEIVED,
        ...msgNewReceived(startDatetime),
        appointmentId,
      }),
    ]);
  },

  /**
   * Notifica CLIENT e PROFESSIONAL quando um agendamento é alterado (ALTER, ADMIN only).
   * Chamado após AppointmentsService.update() — best-effort.
   */
  async notifyAppointmentAltered(
    db: DrizzleDB,
    opts: {
      clientUserId: string;
      professionalUserId: string;
      appointmentId: string;
      startDatetime: Date;
    },
  ): Promise<void> {
    const { clientUserId, professionalUserId, appointmentId, startDatetime } = opts;
    await Promise.all([
      NotificationsRepository.create(db, {
        userId: clientUserId,
        type: NOTIFICATION_TYPES.APPOINTMENT_ALTERED,
        ...msgAlteredClient(startDatetime),
        appointmentId,
      }),
      NotificationsRepository.create(db, {
        userId: professionalUserId,
        type: NOTIFICATION_TYPES.APPOINTMENT_ALTERED,
        ...msgAlteredProfessional(startDatetime),
        appointmentId,
      }),
    ]);
  },

  /**
   * Notifica CLIENT e PROFESSIONAL quando um agendamento é cancelado.
   * Chamado após AppointmentsService.updateStatus(CANCELLED) — best-effort.
   */
  async notifyAppointmentCancelled(
    db: DrizzleDB,
    opts: {
      clientUserId: string;
      professionalUserId: string;
      appointmentId: string;
      startDatetime: Date;
    },
  ): Promise<void> {
    const { clientUserId, professionalUserId, appointmentId, startDatetime } = opts;
    await Promise.all([
      NotificationsRepository.create(db, {
        userId: clientUserId,
        type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
        ...msgCancelled(startDatetime),
        appointmentId,
      }),
      NotificationsRepository.create(db, {
        userId: professionalUserId,
        type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
        ...msgCancelled(startDatetime),
        appointmentId,
      }),
    ]);
  },

  /**
   * Notifica CLIENT quando um agendamento é concluído.
   * PROFESSIONAL NÃO recebe notificação de conclusão (D1 — aprovado).
   * Chamado após AppointmentsService.updateStatus(COMPLETED) — best-effort.
   */
  async notifyAppointmentCompleted(
    db: DrizzleDB,
    opts: {
      clientUserId: string;
      appointmentId: string;
      startDatetime: Date;
    },
  ): Promise<void> {
    const { clientUserId, appointmentId, startDatetime } = opts;
    await NotificationsRepository.create(db, {
      userId: clientUserId,
      type: NOTIFICATION_TYPES.APPOINTMENT_COMPLETED,
      ...msgCompleted(startDatetime),
      appointmentId,
    });
  },
};
