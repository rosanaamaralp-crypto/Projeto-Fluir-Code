/**
 * T-004 — Dashboard Administrativo
 *
 * Doc 15 §7: atendimentos hoje, próximos agendamentos, ocupação das macas,
 * cancelamentos, Home Care.
 * Doc 18 §30: tratar LOADING, EMPTY, ERROR.
 * Doc 18 §55: dados reais da API — zero mocks.
 *
 * Endpoint: GET /api/dashboard/admin (ADMIN only)
 * Resposta: { dashboard: AdminDashboard }
 */
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Home,
  BedDouble,
  Clock,
} from "lucide-react";

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch } = useGetAdminDashboard();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do dia — dados em tempo real
          </p>
        </div>

        {/* LOADING */}
        {isLoading && <DashboardSkeleton />}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar o dashboard."}
              </span>
              <button
                onClick={() => refetch()}
                className="ml-4 underline text-sm"
              >
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {data && (
          <>
            {/* Indicadores do dia */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Atendimentos hoje"
                value={data.dashboard.appointmentsToday}
                icon={<Calendar className="h-4 w-4" />}
              />
              <StatCard
                title="Confirmados futuros"
                value={data.dashboard.upcomingAppointments}
                icon={<Clock className="h-4 w-4" />}
                description="Aguardando atendimento"
              />
              <StatCard
                title="Concluídos hoje"
                value={data.dashboard.completedToday}
                icon={<CheckCircle className="h-4 w-4" />}
              />
              <StatCard
                title="Cancelados hoje"
                value={data.dashboard.cancelledToday}
                icon={<XCircle className="h-4 w-4" />}
              />
              <StatCard
                title="Home Care hoje"
                value={data.dashboard.homeCareToday}
                icon={<Home className="h-4 w-4" />}
                description="Atendimentos domiciliares"
              />
            </div>

            {/* Ocupação das macas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BedDouble className="h-4 w-4" />
                  Ocupação das Macas — Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.dashboard.resourceOccupancy.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma maca ativa encontrada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.dashboard.resourceOccupancy.map((r) => (
                      <div
                        key={r.resourceId}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                      >
                        <span className="text-sm font-medium">
                          {r.resourceName}
                        </span>
                        <Badge
                          variant={
                            r.appointmentsToday > 0 ? "default" : "secondary"
                          }
                        >
                          {r.appointmentsToday}{" "}
                          {r.appointmentsToday === 1
                            ? "atendimento"
                            : "atendimentos"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
