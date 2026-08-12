/**
 * NotificationsController — controller fino para o módulo de notificações.
 *
 * F8 — Doc 16 §46-47 / Doc 17 §43 / RN-087
 *
 * GET  /api/notifications       — lista notificações do usuário autenticado
 * POST /api/notifications/:id/read — marca notificação como lida (IDOR protegido)
 *
 * Sem audit log: GET é leitura; POST /read é ação de baixa criticidade sobre dado próprio.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { NotificationsRepository } from "../repositories/notifications.repository.js";
import { ForbiddenError, NotFoundError, mapDbError } from "../lib/errors.js";
import type { ListNotificationsQuery, NotificationParams } from "../validators/notifications.validator.js";

export const NotificationsController = {
  /**
   * GET /api/notifications
   *
   * Retorna notificações do usuário autenticado com paginação e filtro opcional por não lidas.
   * IDOR: userId é forçado a partir da sessão — nenhum role pode ver notificações de outro usuário.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListNotificationsQuery;
      const { page, limit, unread } = query;
      const sessionUserId = req.session!.user!.userId;

      const filters = {
        unread: unread === "true" ? true : undefined,
        page,
        limit,
      };

      const { data, total } = await NotificationsRepository.findManyByUserId(
        db,
        sessionUserId,
        filters,
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        data,
        pagination: { page, limit, total, totalPages },
      });
    } catch (err) {
      next(mapDbError(err));
    }
  },

  /**
   * POST /api/notifications/:id/read
   *
   * Marca a notificação como lida.
   * IDOR: verifica que a notificação pertence ao usuário autenticado → 403 se não pertencer.
   * Idempotente: se já lida, retorna 200 com o readAt existente.
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as NotificationParams;
      const sessionUserId = req.session!.user!.userId;

      // Buscar notificação — 404 se não existir
      const notification = await NotificationsRepository.findById(db, id);
      if (!notification) {
        throw new NotFoundError("Notificação não encontrada.");
      }

      // IDOR: verificar ownership (RN-087)
      if (notification.userId !== sessionUserId) {
        throw new ForbiddenError();
      }

      // Idempotente: já lida → retornar readAt existente
      if (notification.readAt !== null) {
        res.json({ notification: { id: notification.id, readAt: notification.readAt } });
        return;
      }

      // Marcar como lida
      const readAt = await NotificationsRepository.markAsRead(db, id);

      res.json({ notification: { id, readAt } });
    } catch (err) {
      next(mapDbError(err));
    }
  },
};
