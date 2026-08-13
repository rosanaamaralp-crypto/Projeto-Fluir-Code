/**
 * T-020 — Notificações (Placeholder)
 * DP-003: Placeholder — funcionalidade completa na Fase 20.
 * NÃO implementar funcionalidade. NÃO criar endpoints.
 */
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function AdminNotifications() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">Central de notificações do sistema</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Bell className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-lg font-medium">Notificações disponíveis em breve</p>
              <p className="text-sm text-muted-foreground mt-1">
                O módulo completo de notificações será implementado na Fase 20.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
