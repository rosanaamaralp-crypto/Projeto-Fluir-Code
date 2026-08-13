/**
 * T-040 — Notificações do Cliente
 *
 * Doc 15 §48 / Doc 16 §46-47.
 * Reutiliza o mesmo padrão do módulo profissional.
 */
import {
  useListNotifications,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientNotifications() {
  const { data, isLoading, isError, error, refetch } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleMarkRead(id: string) {
    markRead.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListNotificationsQueryKey(),
          });
        },
        onError: () => {
          toast({
            title: "Erro",
            description: "Não foi possível marcar a notificação como lida.",
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Suas notificações recentes
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar notificações."}
              </span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY */}
        {data && data.data.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm">Você não tem notificações.</p>
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {data && data.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {data.data.map((n) => (
                <div
                  key={n.id}
                  className={[
                    "flex items-start justify-between gap-4 px-4 py-3",
                    !n.readAt ? "bg-muted/40" : "",
                  ].join(" ")}
                >
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.readAt && (
                        <Badge variant="default" className="text-xs px-1.5 py-0">
                          Nova
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!n.readAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markRead.isPending}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Marcar como lida
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
