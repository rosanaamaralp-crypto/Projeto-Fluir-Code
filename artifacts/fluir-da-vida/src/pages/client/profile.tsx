/**
 * T-039 — Meu Perfil (Cliente)
 *
 * Doc 15 §47 / Doc 08 TELA 18 / AuthDoc D5.
 * CLIENT pode editar: nome, telefone, data de nascimento.
 * E-mail é somente leitura.
 */
import { useState, useEffect } from "react";
import {
  useListClients,
  useUpdateClient,
  getListClientsQueryKey,
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
import { User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientProfile() {
  const { data, isLoading, isError, error } = useListClients();
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const client = data?.clients?.[0] ?? null;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [dirty, setDirty] = useState(false);

  // Sincroniza form quando os dados chegam
  useEffect(() => {
    if (client) {
      setName(client.name ?? "");
      setPhone(client.phone ?? "");
      setBirthDate(client.birthDate ?? "");
      setDirty(false);
    }
  }, [client?.id]);

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setDirty(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;

    const payload: Record<string, string | undefined> = {};
    if (name !== (client.name ?? "")) payload.name = name.trim() || undefined;
    if (phone !== (client.phone ?? "")) payload.phone = phone.trim() || undefined;
    if (birthDate !== (client.birthDate ?? "")) payload.birthDate = birthDate || undefined;

    if (Object.keys(payload).length === 0) {
      toast({ title: "Nenhuma alteração detectada." });
      return;
    }

    updateClient.mutate(
      { id: client.id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Perfil atualizado com sucesso." });
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setDirty(false);
        },
        onError: (err) => {
          toast({
            title: "Erro ao salvar",
            description:
              err instanceof Error ? err.message : "Tente novamente.",
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
          <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus dados pessoais
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <Card>
            <CardContent className="py-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {/* ERROR */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar perfil."}
            </AlertDescription>
          </Alert>
        )}

        {/* SUCCESS */}
        {client && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleChange(setName, e.target.value)}
                    placeholder="Seu nome"
                    minLength={2}
                    maxLength={255}
                    required
                  />
                </div>

                {/* E-mail — somente leitura (D5) */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    E-mail
                    <span className="text-xs text-muted-foreground font-normal">
                      (somente leitura)
                    </span>
                  </Label>
                  <Input
                    id="email"
                    value={client.email}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => handleChange(setPhone, e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                  />
                </div>

                {/* Data de nascimento */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthDate">Data de nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => handleChange(setBirthDate, e.target.value)}
                  />
                </div>

                <Separator />

                <Button
                  type="submit"
                  disabled={!dirty || updateClient.isPending}
                  className="w-full"
                >
                  {updateClient.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
