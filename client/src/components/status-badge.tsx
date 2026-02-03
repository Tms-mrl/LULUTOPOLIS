import { Badge } from "@/components/ui/badge";
import { 
  Inbox, 
  Wrench, 
  CheckCircle2, 
  PackageCheck 
} from "lucide-react";
import type { OrderStatus } from "@shared/schema";

const statusConfig: Record<OrderStatus, { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof Inbox;
  className: string;
}> = {
  recibido: {
    label: "Recibido",
    variant: "outline",
    icon: Inbox,
    // Gris/Zinc
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:bg-zinc-500/20 dark:text-zinc-300 dark:border-zinc-500/50",
  },
  en_curso: {
    label: "En Curso",
    variant: "outline",
    icon: Wrench,
    // Ámbar/Naranja
    className: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50",
  },
  listo: {
    label: "Listo",
    variant: "outline",
    icon: CheckCircle2,
    // Verde
    className: "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/50",
  },
  entregado: {
    label: "Entregado",
    variant: "outline",
    icon: PackageCheck,
    // Azul
    className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/50",
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  // Fallback seguro por si llega un estado antiguo
  const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig["recibido"];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} border gap-1.5 font-medium`}
      data-testid={`badge-status-${status}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}