import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  DollarSign,
  Plus,
  TrendingDown,
  Wallet,
  TrendingUp,
  MessageCircle,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairOrderWithDetails, Payment } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    cashInBox: number;
    dailyIncome: number;
    dailyExpenses: number;
    netBalance: number;
  }>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const { data: orders = [] } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    refetchInterval: 5000,
  });

  // Latest Activity Logic
  const recentActivity = orders
    .filter(o => o.status !== "entregado")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const getPaymentStatus = (order: RepairOrderWithDetails) => {
    const orderPayments = payments.filter(p => p.orderId === order.id);
    const totalPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const cost = order.finalCost > 0 ? order.finalCost : order.estimatedCost;

    if (cost === 0) return null;
    if (totalPaid >= cost) return "paid";
    if (totalPaid > 0) return "partial";
    return "unpaid";
  };

  const openWhatsApp = (e: React.MouseEvent, phone: string | null | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // --- HELPERS DE ESTILO ---
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
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">Resumen financiero y operativo</p>
        </div>
        <div className="flex gap-3">
          {/* --- BOTÓN ESTILO PREMIUM --- */}
          <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border border-blue-500/50 transition-all hover:scale-[1.02] active:scale-95">
            <Link href="/ordenes/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Link>
          </Button>
        </div>
      </div>

      {/* TOP SECTION: FINANCIALS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Caja Actual (Efectivo)</p>
                  <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatMoney(stats?.cashInBox ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Ingresos (Hoy)</p>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatMoney(stats?.dailyIncome ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950 dark:to-background border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Gastos (Hoy)</p>
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {formatMoney(stats?.dailyExpenses ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-zinc-800 dark:to-black border-gray-200 dark:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Neto (Hoy)</p>
                  <DollarSign className="h-4 w-4 text-gray-500 dark:text-white" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(stats?.netBalance ?? 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* RECENT ACTIVITY SECTION */}
      <div>
        <h2 className="text-lg font-semibold mt-8 mb-4">Últimas Órdenes Activas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentActivity.map((order) => {
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
          {recentActivity.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground border rounded-lg border-dashed">
              No hay órdenes activas recientes.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: OPERATIONS */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Estado Operativo</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="h-24">
              <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Órdenes Activas</p>
                  <h3 className="text-2xl font-bold">{stats?.activeOrders ?? 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  <Inbox className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Recibidos (Pend.)</p>
                  <h3 className="text-2xl font-bold">{stats?.pendingDiagnosis ?? 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Para Entregar</p>
                  <h3 className="text-2xl font-bold">{stats?.readyForPickup ?? 0}</h3>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}