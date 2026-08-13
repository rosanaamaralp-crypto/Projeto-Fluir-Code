/**
 * T-017 — Relatórios
 *
 * Relatório de agendamentos (com paginação) e relatório de ocupação de recursos.
 * Filtros server-side: período, profissional, serviço, modalidade, status.
 */
import { useState } from "react";
import {
  useGetReportAppointments,
  useGetReportResources,
  useListProfessionals,
  useListServices,
} from "@workspace/api-client-react";
import type {
  GetReportAppointmentsParams,
  AppointmentReportRow,
  ResourceReportRow,
} from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { ModalityBadge } from "@/components/admin/modality-badge";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import { RefreshCw } from "lucide-react";

const LIMIT = 20;

export default function AdminReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [modality, setModality] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [appliedParams, setAppliedParams] = useState<GetReportAppointmentsParams>({
    page: 1,
    limit: LIMIT,
  });
  const [appliedPeriod, setAppliedPeriod] = useState<{ startDate?: string; endDate?: string }>({});

  const { data: profsData } = useListProfessionals();
  const { data: svcsData } = useListServices();

  const apptReport = useGetReportAppointments(appliedParams);
  const resReport = useGetReportResources(appliedPeriod);

  function handleFilter() {
    const params: GetReportAppointmentsParams = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      professionalId: professionalId || undefined,
      serviceId: serviceId || undefined,
      modality: modality || undefined,
      status: status || undefined,
      page: 1,
      limit: LIMIT,
    };
    setPage(1);
    setAppliedParams(params);
    setAppliedPeriod({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  function handleClear() {
    setStartDate("");
    setEndDate("");
    setProfessionalId("");
    setServiceId("");
    setModality("");
    setStatus("");
    setPage(1);
    setAppliedParams({ page: 1, limit: LIMIT });
    setAppliedPeriod({});
  }

  const apptColumns: Column<AppointmentReportRow>[] = [
    {
      key: "datetime",
      header: "Horário",
      cell: (row) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(row.startDatetime).toLocaleDateString("pt-BR")}
          {" "}
          {new Date(row.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "client",
      header: "Cliente",
      cell: (row) => <span className="text-sm">{row.clientName ?? "—"}</span>,
    },
    {
      key: "professional",
      header: "Profissional",
      cell: (row) => <span className="text-sm">{row.professionalName ?? "—"}</span>,
    },
    {
      key: "service",
      header: "Serviço",
      cell: (row) => <span className="text-sm">{row.serviceName ?? "—"}</span>,
    },
    {
      key: "modality",
      header: "Modalidade",
      cell: (row) => <ModalityBadge modality={row.modality} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "price",
      header: "Valor",
      cell: (row) => (
        <span className="text-sm font-medium">
          {Number(row.priceAtBooking).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
  ];

  const resColumns: Column<ResourceReportRow>[] = [
    {
      key: "name",
      header: "Recurso",
      cell: (row) => <span className="font-medium">{row.resourceName}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.resourceStatus === "ACTIVE" ? "default" : "secondary"}>
          {row.resourceStatus === "ACTIVE" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => <span className="font-bold">{row.totalAppointments}</span>,
    },
    {
      key: "confirmed",
      header: "Confirmados",
      cell: (row) => <span>{row.byStatus.CONFIRMED}</span>,
    },
    {
      key: "completed",
      header: "Concluídos",
      cell: (row) => <span>{row.byStatus.COMPLETED}</span>,
    },
    {
      key: "cancelled",
      header: "Cancelados",
      cell: (row) => <span>{row.byStatus.CANCELLED}</span>,
    },
    {
      key: "noshow",
      header: "Não compareceu",
      cell: (row) => <span>{row.byStatus.NO_SHOW}</span>,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Análise de agendamentos e ocupação de recursos
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data início</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data fim</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Profissional</label>
                <Select value={professionalId} onValueChange={setProfessionalId}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {profsData?.professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.specialty || p.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Serviço</label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {svcsData?.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Modalidade</label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="IN_PERSON">Presencial</SelectItem>
                    <SelectItem value="HOME_CARE">Home Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    <SelectItem value="NO_SHOW">Não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleFilter}>Aplicar filtros</Button>
              <Button size="sm" variant="outline" onClick={handleClear}>Limpar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {apptReport.data && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{apptReport.data.summary.total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Concluídos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{apptReport.data.summary.byStatus.COMPLETED}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Cancelados</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-500">{apptReport.data.summary.byStatus.CANCELLED}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Presencial</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{apptReport.data.summary.byModality.IN_PERSON}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Home Care</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-blue-600">{apptReport.data.summary.byModality.HOME_CARE}</p></CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4 pt-4">
            {apptReport.isError && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <span>{apptReport.error instanceof Error ? apptReport.error.message : "Erro ao carregar relatório."}</span>
                  <button onClick={() => apptReport.refetch()} className="ml-4 underline text-sm">Tentar novamente</button>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => apptReport.refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" />Atualizar
              </Button>
            </div>
            <DataTable
              columns={apptColumns}
              data={apptReport.data?.data ?? []}
              isLoading={apptReport.isLoading}
              pagination={apptReport.data?.pagination}
              onPageChange={(p) => {
                setPage(p);
                setAppliedParams((prev) => ({ ...prev, page: p }));
              }}
              emptyTitle="Nenhum agendamento encontrado"
              emptyDescription="Ajuste os filtros para ver resultados."
            />
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 pt-4">
            {resReport.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resReport.error instanceof Error ? resReport.error.message : "Erro ao carregar relatório de recursos."}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => resReport.refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" />Atualizar
              </Button>
            </div>
            <DataTable
              columns={resColumns}
              data={resReport.data?.data ?? []}
              isLoading={resReport.isLoading}
              emptyTitle="Nenhum recurso encontrado"
              emptyDescription="Nenhum dado de ocupação disponível."
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
