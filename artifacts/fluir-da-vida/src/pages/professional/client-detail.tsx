/**
 * T-025 — Detalhe do Cliente (Profissional)
 *
 * Doc 08 §23 (TELA 25): nome; data de nascimento; telefone; e-mail;
 * histórico de atendimentos; endereço quando necessário para Home Care.
 *
 * Endpoint: GET /api/me/professional/clients/:clientId
 * Hook: useGetMyProfessionalClient(clientId)
 * IDOR-safe: o backend retorna 404 se o cliente não tiver atendimentos com este profissional.
 */
import { useRoute } from "wouter";
import { Link } from "wouter";
import {
  useGetMyProfessionalClient,
  useListServices,
} from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, User } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em Atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Ausência",
  BLOCKED: "Bloqueado",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDatetime(dt: string): string {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modalityLabel(m: string): string {
  return m === "HOME_CARE" ? "Home Care" : "Presencial";
}

export default function ProfessionalClientDetail() {
  const [, params] = useRoute("/professional/clients/:clientId");
  const clientId = params?.clientId ?? "";

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useGetMyProfessionalClient(clientId, { query: { enabled: !!clientId } } as any);

  const { data: svcsData } = useListServices();
  const serviceMap: Record<string, string> = {};
  (svcsData?.services ?? []).forEach((s) => { serviceMap[s.id] = s.name; });

  const client = data?.client;
  const address = data?.address;
  const appointments = data?.appointments ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Voltar */}
        <div>
          <Link href="/professional/clients">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Meus Clientes
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6" />
            {isLoading ? "Carregando…" : (client?.name ?? "Detalhe do Cliente")}
          </h1>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* ERROR */}
        {isError && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar dados do cliente."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="sm:ml-4 self-start sm:self-auto">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && client && (
          <>
            {/* Dados do cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Informações</span>
                  <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
                    {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 text-sm">
                <div className="grid grid-cols-3 gap-y-1 sm:gap-y-3">
                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Nome</span>
                  <span className="col-span-3 sm:col-span-2 font-medium mb-2 sm:mb-0 break-words">{client.name ?? "—"}</span>

                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Telefone</span>
                  <span className="col-span-3 sm:col-span-2 mb-2 sm:mb-0 break-words">{client.phone ?? "—"}</span>

                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">E-mail</span>
                  <span className="col-span-3 sm:col-span-2 mb-2 sm:mb-0 break-words">{client.email ?? "—"}</span>

                  <span className="col-span-3 sm:col-span-1 text-muted-foreground">Nascimento</span>
                  <span className="col-span-3 sm:col-span-2 break-words">{formatDate(client.birthDate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Endereço — exibido apenas quando Home Care */}
            {address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço (Home Care)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ""}
                  </p>
                  <p>{address.neighborhood}, {address.city} — {address.state}</p>
                  <p>CEP: {address.postalCode}</p>
                  {address.reference && (
                    <p className="text-muted-foreground text-xs">Referência: {address.reference}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Histórico de atendimentos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico de Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {appointments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum atendimento registrado.
                  </p>
                ) : (
                  <div className="divide-y text-sm">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="px-5 py-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-medium">
                              {formatDatetime(appt.startDatetime as unknown as string)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {modalityLabel(appt.modality)}
                              {" · "}
                              {serviceMap[appt.serviceId] ?? "Serviço"}
                            </p>
                          </div>
                          <Badge
                            variant={
                              appt.status === "COMPLETED"
                                ? "default"
                                : appt.status === "CANCELLED" || appt.status === "NO_SHOW"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {STATUS_LABELS[appt.status] ?? appt.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* NOT FOUND */}
        {!isLoading && !isError && !client && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Cliente não encontrado.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
