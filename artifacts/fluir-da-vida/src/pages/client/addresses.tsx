/**
 * T-038 — Meus Endereços (Cliente)
 *
 * Doc 15 §46 / Doc 08 TELA 12 / AuthDoc D1.
 * Endereço único por cliente no MVP.
 * Operações: visualizar, criar, editar (upsert) e remover.
 */
import { useState, useEffect } from "react";
import {
  useListClients,
  useGetClientAddress,
  useUpsertClientAddress,
  getGetClientAddressQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AddressRow } from "@workspace/api-client-react";

interface AddressFormData {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
}

const EMPTY_FORM: AddressFormData = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  reference: "",
};

function addressToForm(a: AddressRow): AddressFormData {
  return {
    street: a.street,
    number: a.number,
    complement: a.complement ?? "",
    neighborhood: a.neighborhood,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    reference: a.reference ?? "",
  };
}

export default function ClientAddresses() {
  const { data: clientsData, isLoading: clientsLoading } = useListClients();
  const clientId = clientsData?.clients?.[0]?.id ?? "";

  const {
    data: addrData,
    isLoading: addrLoading,
    isError,
    error,
    refetch,
  } = useGetClientAddress(clientId, {
    query: { enabled: !!clientId },
  } as any);

  const upsert = useUpsertClientAddress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);

  const address = addrData?.address ?? null;
  const isLoading = clientsLoading || addrLoading;

  // Quando a edição abre, popula o form com dados atuais
  function startEdit() {
    setForm(address ? addressToForm(address) : EMPTY_FORM);
    setEditing(true);
  }

  function handleChange(field: keyof AddressFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;

    upsert.mutate(
      {
        clientId,
        data: {
          street: form.street.trim(),
          number: form.number.trim(),
          complement: form.complement.trim() || undefined,
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          reference: form.reference.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Endereço salvo com sucesso." });
          queryClient.invalidateQueries({
            queryKey: getGetClientAddressQueryKey(clientId),
          });
          setEditing(false);
        },
        onError: (err) => {
          toast({
            title: "Erro ao salvar endereço",
            description: err instanceof Error ? err.message : "Tente novamente.",
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meus Endereços</h1>
          <p className="text-sm text-muted-foreground">
            Endereço utilizado em atendimentos Home Care
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <Card>
            <CardContent className="py-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error instanceof Error ? error.message : "Erro ao carregar endereço."}
              </span>
              <button onClick={() => refetch()} className="ml-4 underline text-sm">
                Tentar novamente
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Endereço cadastrado — modo visualização */}
        {!isLoading && !isError && !editing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                {address ? "Endereço cadastrado" : "Nenhum endereço cadastrado"}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={startEdit}>
                {address ? (
                  <>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {address ? (
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {address.neighborhood} · {address.city}/{address.state}
                  </p>
                  <p className="text-muted-foreground">CEP: {address.postalCode}</p>
                  {address.reference && (
                    <p className="text-muted-foreground">
                      Referência: {address.reference}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Adicione um endereço para agendar atendimentos Home Care.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulário de edição */}
        {editing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                {address ? "Editar endereço" : "Novo endereço"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="street">Rua / Avenida</Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => handleChange("street", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={form.number}
                      onChange={(e) => handleChange("number", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="complement">Complemento (opcional)</Label>
                  <Input
                    id="complement"
                    value={form.complement}
                    onChange={(e) => handleChange("complement", e.target.value)}
                    placeholder="Apto, bloco, casa..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={(e) => handleChange("neighborhood", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">Estado (UF)</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) =>
                        handleChange("state", e.target.value.toUpperCase())
                      }
                      maxLength={2}
                      placeholder="SP"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">CEP</Label>
                  <Input
                    id="postalCode"
                    value={form.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    placeholder="00000-000"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reference">Ponto de referência (opcional)</Label>
                  <Input
                    id="reference"
                    value={form.reference}
                    onChange={(e) => handleChange("reference", e.target.value)}
                    placeholder="Próximo ao..."
                  />
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={upsert.isPending}
                    className="flex-1"
                  >
                    {upsert.isPending ? "Salvando..." : "Salvar endereço"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
