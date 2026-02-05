import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle, CheckCircle2, Calendar, User, Smartphone, AlertCircle } from "lucide-react";
import type { RepairOrderWithDetails } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge"; // <--- Importamos el componente unificado

interface OrderCardProps {
  order: RepairOrderWithDetails;
  paymentStatus?: "paid" | "partial" | "unpaid" | null;
  className?: string;
}

export function OrderCard({ order, paymentStatus, className }: OrderCardProps) {

  const openWhatsApp = (e: React.MouseEvent, phone: string | null | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <Link href={`/ordenes/${order.id}`}>
      <div className={`
        group relative overflow-hidden rounded-xl border border-border/50 
        bg-gradient-to-br from-card via-card/70 to-indigo-800/30
        hover:to-indigo-800/40 backdrop-blur-sm 
        hover:border-indigo-500/50 cursor-pointer 
        hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.25)] 
        transition-all duration-300
        flex flex-col
        ${className}
      `}>

        {/* Decoración lateral brillante al hover */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/0 via-indigo-500 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-4 space-y-3 relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Smartphone className="h-4 w-4 text-indigo-500/80 shrink-0" />
              <h3 className="font-bold text-sm tracking-tight truncate text-foreground group-hover:text-indigo-400 transition-colors capitalize">
                {order.device.brand} {order.device.model}
              </h3>
            </div>

            <div className="flex gap-1 shrink-0">
              {order.priority === "urgente" && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shadow-none">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  !
                </Badge>
              )}

              {/* --- USANDO EL COMPONENTE CON COLORES UNIFICADOS --- */}
              <StatusBadge
                status={order.status}
                showIcon={false}
                className="text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider shadow-none"
              />
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
                <User className="h-3.5 w-3.5 opacity-70" />
                <span>{order.client.name}</span>
              </div>

              {order.client.phone && (
                <div
                  role="button"
                  onClick={(e) => openWhatsApp(e, order.client.phone)}
                  className="
                    p-1.5 rounded-full 
                    bg-green-500/10 border border-green-500/20 text-green-500 
                    hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-400 
                    transition-all z-20 backdrop-blur-sm flex items-center justify-center 
                    shadow-[0_0_10px_-3px_rgba(34,197,94,0.1)]
                  "
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground/70 line-clamp-2 pl-2 border-l-2 border-indigo-500/30 italic">
              {order.problem}
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border/40 flex justify-between items-center text-xs mt-auto">
            <span className="text-muted-foreground/60 flex items-center gap-1 font-mono">
              <Calendar className="h-3 w-3" />
              {format(new Date(order.createdAt), "dd/MM", { locale: es })}
            </span>

            {paymentStatus === 'paid' && (
              <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                Pagado <CheckCircle2 className="w-3 h-3" />
              </span>
            )}
            {paymentStatus === 'partial' && (
              <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Parcial
              </span>
            )}
            {paymentStatus === 'unpaid' && (
              <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-full border border-zinc-500/20">
                Pendiente
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}