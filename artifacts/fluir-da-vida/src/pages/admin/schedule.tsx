/**
 * T-005 — Agenda Administrativa
 *
 * Lista filtrada de agendamentos com dados enriquecidos (nomes via reports endpoint).
 * Filtros server-side: data, profissional, cliente, serviço, modalidade, status, recurso.
 * DP-002: NÃO usa react-big-calendar. Lista filtrada por data.
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  useGetReportAppointments,
  useListProfessionals,
  useListServices,
  useListClients,
  useListResources,
} from "@workspace/api-client-react";
import type { GetReportAppointmentsParams } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { ModalityBadge } from "@/components/admin/modality-badge";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/data-table";
import type { AppointmentReportRow } from "@workspace/api-client-react";
import { Plus, RefreshCw } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const LIMIT = 20;

export default function AdminSchedule() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [professionalId, setProfessionalId] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [modality, setModality] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params: GetReportAppointmentsParams = {
    startDate: date || undefined,
    endDate: date || undefined,
    professionalId: professionalId || undefined,
    clientId: clientId || undefined,
    serviceId: serviceId || undefined,
    resourceId: resourceId || undefined,
    modality: modality || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, error, refetch } = useGetReportAppointments(params);
  const { data: profsData } = useListProfessionals();
  const { data: svcsData } = useListServices();
  const { data: clientsData } = useListClients();
  const { data: resourcesData } = useListResources();

  function handleFilter() {
    setPage(1);
  }

  function handleClear() {
    setDate(today);
    setProfessionalId("");
    setClientId("");
    setServiceId("");
    setResourceId("");
    setModality("");
    setStatus("");
    setPage(1);
  }

  const columns: Column<AppointmentReportRow>[] = [
    {
      key: "datetime",
      header: "Horário",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap">
          {new Date(row.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {new Date(row.endDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "client",
      header: "Cliente",
      cell: (row) => (
        <span className="text-sm">{row.clientName ?? <span className="text-muted-foreground italic">—</span>}</span>
      ),
    },
    {
      key: "professional",
      header: "Profissional",
      cell: (row) => (
        <span className="text-sm">{row.professionalName ?? <span className="text-muted-foreground italic">—</span>}</span>
      ),
    },
    {
      key: "service",
      header: "Serviço",
      cell: (row) => (
        <span className="text-sm">{row.serviceName ?? <span className="text-muted-foreground italic">—</span>}</span>
      ),
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
        <span className="text-sm">
          {Number(row.priceAtBooking).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Link href={`/admin/appointments/${row.id}`}>
          <Button variant="ghost" size="sm">Ver</Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Lista de agendamentos com filtros server-side
            </p>
          </div>
          <Link href="/admin/appointments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Profissional</label>
                <Select value={professionalId} onValueChange={setProfessionalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {profsData?.professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {clientsData?.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Serviço</label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {svcsData?.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Recurso</label>
                <Select value={resourceId} onValueChange={setResourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {resourcesData?.resources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Modalidade</label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
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
              <Button size="sm" onClick={handleFilter}>
                Filtrar
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear}>
                Limpar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-1 ml-auto">
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error instanceof Error ? error.message : "Erro ao carregar agenda."}</span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          emptyTitle="Nenhum agendamento"
          emptyDescription="Nenhum agendamento encontrado para os filtros selecionados."
        />

        {/* Summary */}
        {data && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total: {data.summary.total}</span>
            <span>Confirmados: {data.summary.byStatus.CONFIRMED}</span>
            <span>Em andamento: {data.summary.byStatus.IN_PROGRESS}</span>
            <span>Concluídos: {data.summary.byStatus.COMPLETED}</span>
            <span>Cancelados: {data.summary.byStatus.CANCELLED}</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
