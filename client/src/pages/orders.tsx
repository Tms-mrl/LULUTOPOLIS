import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MessageCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { RepairOrderWithDetails, OrderStatus, Payment } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusFilters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "recibido", label: "Recibidas" },
  { value: "en_curso", label: "En Curso" },
  { value: "listo", label: "Listas" },
  { value: "entregado", label: "Entregadas" },
];

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders, isLoading: isLoadingOrders } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    refetchInterval: 5000,
  });

  const openWhatsApp = (e: React.MouseEvent, phone: string | null | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const getPaymentStatus = (order: RepairOrderWithDetails) => {
    const orderPayments = payments.filter(p => p.orderId === order.id);
    const totalPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const cost = order.finalCost > 0 ? order.finalCost : order.estimatedCost;

    if (cost === 0) return null;
    if (totalPaid >= cost) return "paid";
    if (totalPaid > 0) return "partial";
    return "unpaid";
  };

  const filteredOrders = orders?.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = searchQuery === "" ||
      order.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.device.imei?.includes(searchQuery) ||
      order.device.serialNumber?.includes(searchQuery) ||
      order.device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.device.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // --- HELPER PARA COLORES DE ESTADO (BADGES) ---
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'recibido':
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/50';
      case 'en_curso':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'listo':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'entregado':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'recibido': return 'Recibido';
      case 'en_curso': return 'En Curso';
      case 'listo': return 'Listo';
      case 'entregado': return 'Entregado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de Reparación</h1>
          <p className="text-muted-foreground">Gestiona todas las órdenes del taller</p>
        </div>
        {/* --- BOTÓN ESTILO PREMIUM --- */}
        <Button asChild data-testid="button-new-order" className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border border-blue-500/50 transition-all hover:scale-[1.02] active:scale-95">
          <Link href="/ordenes/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, IMEI, marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-orders"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          {statusFilters.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid={`tab-filter-${filter.value}`}
            >
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoadingOrders ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const payStatus = getPaymentStatus(order);

            return (
              <Link key={order.id} href={`/ordenes/${order.id}`}>
                <div className="cursor-pointer group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-100 dark:from-zinc-800 dark:to-black shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="p-4 space-y-3 relative z-10">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm tracking-tight truncate pr-2 text-foreground">
                        {order.device.brand} {order.device.model}
                      </h3>
                      <div className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border shadow-sm
                        ${getStatusBadgeStyles(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium truncate flex items-center gap-1">
                          {order.client.name}
                        </p>
                        {order.client.phone && (
                          <div
                            role="button"
                            onClick={(e) => openWhatsApp(e, order.client.phone)}
                            className="p-2 rounded-full bg-black/40 border border-green-600/40 text-green-600 hover:bg-green-900/30 hover:border-green-500/60 hover:text-green-400 transition-all z-20 backdrop-blur-sm flex items-center justify-center shadow-sm hover:shadow-green-900/20"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/80 truncate pl-0.5 border-l-2 border-primary/20">
                        &nbsp;{order.problem}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">
                        {format(new Date(order.createdAt), "dd/MM", { locale: es })}
                      </span>
                      {payStatus === 'paid' && (
                        <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1 bg-green-100 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                          Pagado <CheckCircle2 className="w-3 h-3" />
                        </span>
                      )}
                      {payStatus === 'partial' && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          Parcial
                        </span>
                      )}
                      {payStatus === 'unpaid' && (
                        <span className="text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Filter}
          title={searchQuery || statusFilter !== "all" ? "Sin resultados" : "No hay órdenes"}
          description={
            searchQuery || statusFilter !== "all"
              ? "No se encontraron órdenes con los filtros aplicados"
              : "Crea tu primera orden de reparación para comenzar"
          }
          actionLabel={!searchQuery && statusFilter === "all" ? "Nueva Orden" : undefined}
          actionHref={!searchQuery && statusFilter === "all" ? "/ordenes/nueva" : undefined}
        />
      )}
    </div>
  );
}