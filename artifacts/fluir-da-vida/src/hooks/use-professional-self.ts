/**
 * useProfessionalSelf — retorna o registro do profissional autenticado.
 *
 * Necessário para rotas que usam :profId (availability, blocked-periods, etc.)
 * pois a sessão só armazena userId. Busca a lista de profissionais e filtra
 * pelo userId da sessão (dado real, sem invenção de relacionamento).
 *
 * F14 — T-024, T-025, T-026.
 */
import { useAuth } from "@/contexts/auth-context";
import { useListProfessionals } from "@workspace/api-client-react";

export function useProfessionalSelf() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useListProfessionals();

  const professional = data?.professionals.find(
    (p) => p.userId === user?.userId,
  );

  return { professional, isLoading, isError };
}
