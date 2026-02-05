import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  PackageCheck,
  FileText, // Icono para Presupuesto
  Inbox
} from "lucide-react";
import type { OrderStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {

  // ESTILOS DE COLOR (Recibido y Entregado invertidos)
  const styles: Record<string, string> = {
    // PRESUPUESTO (Rosa/Pink)
    presupuesto: "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20",

    // RECIBIDO (Azul/Blue - Antes era Gris)
    recibido: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",

    // EN CURSO (Ámbar/Amber)
    en_curso: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",

    // LISTO (Verde/Green)
    listo: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20",

    // ENTREGADO (Gris/Zinc - Antes era Azul)
    entregado: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20",
  };

  const labels: Record<string, string> = {
    presupuesto: "Presupuesto",
    recibido: "Recibido",
    en_curso: "En Curso",
    listo: "Listo",
    entregado: "Entregado",
  };

  const icons: Record<string, any> = {
    presupuesto: FileText,
    recibido: Inbox,
    en_curso: Loader2,
    listo: CheckCircle2,
    entregado: PackageCheck,
  };

  const currentStatus = status as OrderStatus;
  const Icon = icons[currentStatus] || ClipboardList;

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize font-bold tracking-wide border transition-colors flex items-center gap-1.5 w-fit px-2.5 py-0.5 text-[10px] shadow-none",
        styles[status] || styles.recibido,
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3.5 w-3.5", status === 'en_curso' && "animate-spin")} />}
      {labels[status] || status}
    </Badge>
  );
}