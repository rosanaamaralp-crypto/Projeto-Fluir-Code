/**
 * ModalityBadge — identificação visual da modalidade de atendimento.
 * Home Care possui identificação visual diferenciada (F13 — RN).
 */
import { Badge } from "@/components/ui/badge";
import { Home, Building2 } from "lucide-react";

interface ModalityBadgeProps {
  modality: string;
  className?: string;
}

export function ModalityBadge({ modality, className }: ModalityBadgeProps) {
  if (modality === "HOME_CARE") {
    return (
      <Badge
        variant="secondary"
        className={`gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100 ${className ?? ""}`}
      >
        <Home className="h-3 w-3" />
        Home Care
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`gap-1 ${className ?? ""}`}>
      <Building2 className="h-3 w-3" />
      Presencial
    </Badge>
  );
}
