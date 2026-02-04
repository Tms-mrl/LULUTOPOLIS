import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ClipboardList,
  CheckCircle2,
  DollarSign,
  Plus,
  TrendingDown,
  Wallet,
  TrendingUp,
  Inbox,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairOrderWithDetails, Payment } from "@shared/schema";
import { OrderCard } from "@/components/cards/order-card";
import { cn } from "@/lib/utils";

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

  // Lógica de Actividad Reciente
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

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background/50 pb-20 space-y-8">
      
      {/* --- HEADER STICKY "GLASS" --- */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              Panel de Control
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Resumen financiero y operativo en tiempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* BOTÓN NUEVA ORDEN (Estilo Primary Glass) */}
            <Button 
                asChild 
                variant="outline"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 shadow-sm backdrop-blur-sm transition-all active:scale-95 flex-1 sm:flex-none"
            >
              <Link href="/ordenes/nueva">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">

        {/* --- SECCIÓN FINANCIERA (KPIs) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {/* Caja (Azul) */}
              <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-blue-500/10 shadow-sm relative overflow-hidden group hover:border-blue-500/20 transition-all">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet className="w-24 h-24 text-blue-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" /> Caja Actual (Efectivo)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatMoney(stats?.cashInBox ?? 0)}
                  </div>
                </CardContent>
              </Card>

              {/* Ingresos (Verde) */}
              <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-emerald-500/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-24 h-24 text-emerald-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Ingresos (Hoy)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(stats?.dailyIncome ?? 0)}
                  </div>
                </CardContent>
              </Card>

              {/* Gastos (Rojo) */}
              <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-red-500/10 shadow-sm relative overflow-hidden group hover:border-red-500/20 transition-all">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingDown className="w-24 h-24 text-red-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" /> Gastos (Hoy)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatMoney(stats?.dailyExpenses ?? 0)}
                  </div>
                </CardContent>
              </Card>

              {/* Balance (Indigo/Violeta) */}
              <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-indigo-500/10 shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign className="w-24 h-24 text-indigo-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-indigo-500" /> Balance Neto (Hoy)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-3xl font-bold", (stats?.netBalance ?? 0) >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500")}>
                    {formatMoney(stats?.netBalance ?? 0)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* --- ACTIVIDAD RECIENTE --- */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Últimas Órdenes Activas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentActivity.map((order) => (
              <OrderCard 
                  key={order.id} 
                  order={order} 
                  paymentStatus={getPaymentStatus(order)} 
              />
            ))}
            {recentActivity.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/20 flex flex-col items-center gap-3">
                <Inbox className="h-10 w-10 opacity-20" />
                <p>No hay órdenes activas recientes.</p>
                <Button variant="link" asChild className="text-primary">
                  <Link href="/ordenes/nueva">Crear la primera</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* --- ESTADO OPERATIVO --- */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            Estado Operativo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:bg-card/80 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 dark:text-blue-400">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Órdenes Activas</p>
                      <h3 className="text-2xl font-bold">{stats?.activeOrders ?? 0}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:bg-card/80 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-zinc-500/10 rounded-full text-zinc-600 dark:text-zinc-400">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Recibidos (Pend.)</p>
                      <h3 className="text-2xl font-bold">{stats?.pendingDiagnosis ?? 0}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:bg-card/80 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-full text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-6 w-6" />
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
      </div>
    </div>
  );
}