/**
 * T-019 — Configurações (Placeholder)
 * DP-001: Tela placeholder — "Configurações disponíveis em breve".
 * NÃO criar endpoint. NÃO criar migration.
 */
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AdminSettings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento do sistema</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Settings className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-lg font-medium">Configurações disponíveis em breve</p>
              <p className="text-sm text-muted-foreground mt-1">
                Esta funcionalidade está em desenvolvimento e será disponibilizada em uma próxima versão.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
