import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { RepairOrderWithDetails, OrderStatus, Payment } from "@shared/schema";
import { OrderCard } from "@/components/cards/order-card";

const statusFilters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "presupuesto", label: "Presupuestos" }, // <--- NUEVA OPCIÓN
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

  // --- HELPER PARA ESTILOS DE TABS ---
  const getTabStyles = (value: string) => {
    const base = "rounded-full px-4 py-2 transition-all border border-transparent data-[state=active]:shadow-sm data-[state=active]:font-medium";

    switch (value) {
      case 'all':
        return `${base} data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20`;

      // NUEVO ESTILO PARA PRESUPUESTO (Rosa/Pink)
      case 'presupuesto':
        return `${base} data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-500 data-[state=active]:border-pink-500/20`;

      case 'recibido':
        return `${base} data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/20`;
      case 'en_curso':
        return `${base} data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-500 data-[state=active]:border-amber-500/20`;
      case 'listo':
        return `${base} data-[state=active]:bg-green-500/10 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-500 data-[state=active]:border-green-500/20`;
      case 'entregado':
        return `${base} data-[state=active]:bg-zinc-500/10 data-[state=active]:text-zinc-600 dark:data-[state=active]:text-zinc-400 data-[state=active]:border-zinc-500/20`;
      default:
        return base;
    }
  };

  return (
    <div className="min-h-screen bg-background/50 pb-20 space-y-8">

      {/* HEADER FLOTANTE */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Órdenes de Reparación
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Gestiona y actualiza el estado de los equipos.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              asChild
              variant="outline"
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 shadow-sm backdrop-blur-sm transition-all active:scale-95 flex-1 sm:flex-none"
              data-testid="button-new-order"
            >
              <Link href="/ordenes/nueva">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-6">

        {/* BUSCADOR Y FILTROS */}
        <div className="flex flex-col space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, IMEI, marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
              data-testid="input-search-orders"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
            <TabsList className="h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-full inline-flex flex-wrap gap-1">
              {statusFilters.map((filter) => (
                <TabsTrigger
                  key={filter.value}
                  value={filter.value}
                  className={getTabStyles(filter.value)}
                  data-testid={`tab-filter-${filter.value}`}
                >
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* LISTADO DE ORDENES */}
        {isLoadingOrders ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-border/50 bg-card/50">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                paymentStatus={getPaymentStatus(order)}
              />
            ))}
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
    </div>
  );
}