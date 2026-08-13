/**
 * StatusBadge — identificação visual do status de agendamentos.
 * Fase 13 — componente compartilhado admin.
 */
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  CONFIRMED:   { label: "Confirmado",   variant: "default" },
  IN_PROGRESS: { label: "Em andamento", variant: "secondary" },
  COMPLETED:   { label: "Concluído",    variant: "outline" },
  CANCELLED:   { label: "Cancelado",    variant: "destructive" },
  NO_SHOW:     { label: "Não compareceu", variant: "destructive" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
