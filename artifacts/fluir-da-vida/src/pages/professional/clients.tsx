/**
 * T-023 — Meus Clientes (Profissional)
 *
 * Doc 08 §22 (TELA 24): Lista de clientes relacionados aos atendimentos do profissional.
 * Busca por nome e telefone. Acesso ao detalhe do cliente.
 *
 * Endpoint: GET /api/me/professional/clients
 * Hook: useListMyProfessionalClients — professionalId derivado da sessão no backend.
 * Ownership: garantido no servidor; o profissional vê somente seus próprios clientes.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListMyProfessionalClients } from "@workspace/api-client-react";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ChevronRight, Search, Plus } from "lucide-react";

export default function ProfessionalClients() {
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const { data, isLoading, isError, error, refetch } = useListMyProfessionalClients();

  const clients = useMemo(() => {
    const all = data?.clients ?? [];
    return all.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const phone = (c.phone ?? "").replace(/\D/g, "");
      const queryName = searchName.trim().toLowerCase();
      const queryPhone = searchPhone.trim().replace(/\D/g, "");
      if (queryName && !name.includes(queryName)) return false;
      if (queryPhone && !phone.includes(queryPhone)) return false;
      return true;
    });
  }, [data, searchName, searchPhone]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6" />
              Meus Clientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Clientes relacionados aos seus atendimentos
            </p>
          </div>
          {/* F20: cadastro de cliente pelo profissional */}
          <Link href="/professional/clients/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </Link>
        </div>

        {/* Busca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome…"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por telefone…"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {/* ERROR */}
        {isError && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar clientes."}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="sm:ml-4 self-start sm:self-auto">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* EMPTY — sem clientes na conta */}
        {!isLoading && !isError && (data?.clients ?? []).length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado. Os clientes aparecerão aqui após agendamentos.
            </CardContent>
          </Card>
        )}

        {/* EMPTY — com clientes mas sem resultado de busca */}
        {!isLoading && !isError && (data?.clients ?? []).length > 0 && clients.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado com os filtros informados.
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {!isLoading && !isError && clients.length > 0 && (
          <div className="space-y-2">
            {clients.map((client) => (
              <Link key={client.id} href={`/professional/clients/${client.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">
                        {client.name ?? "Nome não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.phone ? client.phone : "Telefone não informado"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
