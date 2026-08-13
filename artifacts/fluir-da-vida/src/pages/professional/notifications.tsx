/**
 * Notificações do Profissional
 *
 * Doc 15 §48 (T-040): lista confirmações, alterações, cancelamentos, avisos.
 * Doc 16 §46-47: GET /notifications + POST /notifications/:id/read.
 * RN-087: notificações associadas ao usuário correto (IDOR protegido no backend).
 *
 * Estados: LOADING / EMPTY / ERROR / SUCCESS.
 * Marca como lida ao clicar. Badge de não-lida visível.
 */
import { useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ProfessionalNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useListNotifications({ limit: 50 });

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["listNotifications"] });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Não foi possível marcar como lida.",
        });
      },
    },
  });

  function handleMarkRead(id: string) {
    markReadMutation.mutate({ id });
  }

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações
          </h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} não lida(s)</Badge>
          )}
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar notificações."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {!isLoading && !isError && notifications.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação disponível.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              return (
                <Card
                  key={n.id}
                  className={isUnread ? "border-primary/40 bg-primary/5" : ""}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm">{n.title}</span>
                          <Badge variant="outline" className="text-xs">{n.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDatetime(n.createdAt)}
                        </p>
                      </div>
                      {isUnread && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkRead(n.id)}
                          disabled={markReadMutation.isPending}
                          className="flex-shrink-0"
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
