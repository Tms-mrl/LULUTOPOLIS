import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  DollarSign,
  Calendar,
  BarChart3,
  Smartphone,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay, isSameMonth, subMonths, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment, Expense, RepairOrderWithDetails, Settings } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  date: Date; // Fecha real
  logicalDate: Date; // Fecha contable (ajustada por corte)
  type: "income" | "expense";
  category: string;
  description: string;
  method: string;
  amount: number;
};

type MonthlySummary = {
  id: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  ordersCount: number;
};

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "month" | "today">("today");

  // --- QUERIES ---
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // --- HELPER: CALCULAR FECHA LÓGICA ---
  const getLogicalDate = (date: Date, cutoffHour: number = 0): Date => {
    const d = new Date(date);
    if (d.getHours() < cutoffHour) {
      return subDays(d, 1);
    }
    return d;
  };

  const cutoffHour = settings?.dayCutoffHour || 0;

  // --- DATOS TRANSACCIONALES ---
  const transactions: Transaction[] = useMemo(() => {
    const income: Transaction[] = payments.map(p => {
      const date = new Date(p.date);
      return {
        id: p.id,
        date: date,
        logicalDate: getLogicalDate(date, cutoffHour),
        type: "income",
        category: p.orderId ? "Reparación" : "Venta",
        description: p.notes || (p.orderId ? `Cobro Orden #${p.orderId.slice(0, 4)}` : "Venta General"),
        method: p.method,
        amount: Number(p.amount)
      };
    });

    const outflow: Transaction[] = expenses.map(e => {
      const date = new Date(e.date);
      return {
        id: e.id,
        date: date,
        logicalDate: getLogicalDate(date, cutoffHour),
        type: "expense",
        category: e.category,
        description: e.description,
        method: "Efectivo",
        amount: Number(e.amount)
      };
    });

    return [...income, ...outflow].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, expenses, cutoffHour]);

  // --- FILTRADO PARA TABLA ---
  const filteredData = useMemo(() => {
    const nowReal = new Date();
    const nowLogical = getLogicalDate(nowReal, cutoffHour);

    if (filterPeriod === "all") return transactions;

    return transactions.filter(t => {
      if (filterPeriod === "today") return isSameDay(t.logicalDate, nowLogical);
      if (filterPeriod === "month") return isSameMonth(t.logicalDate, nowLogical);
      return true;
    });
  }, [transactions, filterPeriod, cutoffHour]);

  // --- DATOS PARA GRÁFICOS ---
  const chartsData = useMemo(() => {
    const data: MonthlySummary[] = [];
    const nowReal = new Date();
    const nowLogical = getLogicalDate(nowReal, cutoffHour);

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(nowLogical, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM", { locale: es }).toUpperCase();

      const monthTransactions = transactions.filter(t => format(t.logicalDate, "yyyy-MM") === monthKey);

      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);

      const monthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        const ld = getLogicalDate(d, cutoffHour);
        return format(ld, "yyyy-MM") === monthKey;
      }).length;

      data.push({
        id: monthKey,
        label: monthLabel,
        income,
        expense,
        balance: income - expense,
        ordersCount: monthOrders
      });
    }
    return data;
  }, [transactions, orders, cutoffHour]);

  // --- DATOS MENSUALES TABLA ---
  const monthlyTableData = useMemo(() => {
    if (filterPeriod !== "all") return [];
    const groups: Record<string, MonthlySummary> = {};

    transactions.forEach(t => {
      const key = format(t.logicalDate, "yyyy-MM");

      if (!groups[key]) {
        groups[key] = {
          id: key,
          label: format(t.logicalDate, "MMMM yyyy", { locale: es }),
          income: 0,
          expense: 0,
          balance: 0,
          ordersCount: 0
        };
      }
      if (t.type === "income") groups[key].income += t.amount;
      else groups[key].expense += t.amount;
      groups[key].balance = groups[key].income - groups[key].expense;
    });

    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [transactions, filterPeriod]);


  // --- TOTALES (Cards) ---
  const totalIncome = filteredData.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredData.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCSV = () => {
    const headers = ["Fecha Real", "Fecha Contable", "Tipo", "Categoría", "Descripción", "Método", "Monto"];
    const rows = filteredData.map(t => [
      format(t.date, "dd/MM/yyyy HH:mm"),
      format(t.logicalDate, "dd/MM/yyyy"),
      t.type === "income" ? "Ingreso" : "Gasto",
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.method,
      t.type === "income" ? t.amount : -t.amount
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingPayments || loadingExpenses || loadingOrders;

  // Estilos base para los triggers de las pestañas
  const tabTriggerBase = "rounded-full px-6 py-2.5 transition-all flex gap-2 items-center border border-transparent data-[state=active]:shadow-sm data-[state=active]:font-medium";

  return (
    <div className="min-h-screen bg-background/50 pb-20 space-y-8">
      
      {/* --- HEADER STICKY "GLASS" --- */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Reportes
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Análisis financiero y métricas de rendimiento.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
              <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-border/50">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy (Jornada)</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="all">Todo el Historial</SelectItem>
              </SelectContent>
            </Select>

            {/* BOTÓN CSV (Estilo Esmeralda Glass) */}
            <Button 
                variant="outline" 
                onClick={handleExportCSV} 
                disabled={transactions.length === 0}
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm backdrop-blur-sm transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">
        
        {/* TABS PRINCIPALES */}
        <Tabs defaultValue="financial" className="w-full space-y-8">
          
          {/* --- LISTA DE PESTAÑAS FLOTANTES --- */}
          <div className="flex justify-center">
            <TabsList className="h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-full inline-flex flex-wrap justify-center gap-1">
              <TabsTrigger 
                value="financial" 
                className={`${tabTriggerBase} data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20`}
              >
                <FileText className="h-4 w-4" /> Resumen Financiero
              </TabsTrigger>
              <TabsTrigger 
                value="metrics" 
                className={`${tabTriggerBase} data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/20`}
              >
                <PieChart className="h-4 w-4" /> Métricas y Gráficos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* --- PESTAÑA 1: FINANCIERO (KPIs + TABLA) --- */}
          <TabsContent value="financial" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            
            {/* KPI CARDS (RESUMEN) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
              ) : (
                <>
                  {/* Ingresos (Verde) */}
                  <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-emerald-500/10 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                      <TrendingUp className="w-24 h-24 text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Total Ingresos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(totalIncome)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gastos (Rojo) */}
                  <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-red-500/10 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                      <TrendingDown className="w-24 h-24 text-red-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" /> Total Gastos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {formatMoney(totalExpenses)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Balance (Azul) */}
                  <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-blue-500/10 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                      <DollarSign className="w-24 h-24 text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" /> Balance Neto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("text-3xl font-bold", netBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500")}>
                        {formatMoney(netBalance)}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* TABLA DE MOVIMIENTOS */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  {filterPeriod === "all" ? "Historial Mensual" : "Detalle de Movimientos"}
                </CardTitle>
                <CardDescription>
                    {filterPeriod === "all" ? "Resumen consolidado mes a mes." : "Listado detallado de ingresos y egresos del periodo seleccionado."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {filterPeriod === "all" ? (
                          <>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-right text-emerald-600">Ingresos</TableHead>
                            <TableHead className="text-right text-red-600">Egresos</TableHead>
                            <TableHead className="text-right font-bold">Balance</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="w-[180px]">Fecha</TableHead>
                            <TableHead className="w-[120px]">Tipo</TableHead>
                            <TableHead className="w-[150px]">Categoría</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right w-[150px]">Monto</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell></TableRow>
                      ) : (
                        <>
                          {filterPeriod === "all" ? (
                            monthlyTableData.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Sin datos históricos.</TableCell></TableRow>
                            ) : (
                              monthlyTableData.map((month) => (
                                <TableRow key={month.id} className="hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-bold capitalize">{month.label}</TableCell>
                                  <TableCell className="text-right text-emerald-600 font-medium tabular-nums">+ {formatMoney(month.income)}</TableCell>
                                  <TableCell className="text-right text-red-600 font-medium tabular-nums">- {formatMoney(month.expense)}</TableCell>
                                  <TableCell className={`text-right font-bold tabular-nums ${month.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600"}`}>
                                    {formatMoney(month.balance)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )
                          ) : (
                            filteredData.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Sin movimientos en este periodo.</TableCell></TableRow>
                            ) : (
                              filteredData.map((t) => (
                                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-mono text-xs text-muted-foreground">
                                    {format(t.date, "dd/MM/yyyy HH:mm")}
                                    {/* Indicador visual si la fecha lógica es diferente */}
                                    {t.date.getDate() !== t.logicalDate.getDate() && (
                                      <span className="block text-[10px] opacity-70">
                                        (Contable: {format(t.logicalDate, "dd/MM")})
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={t.type === "income" ? "outline" : "outline"} 
                                        className={cn("text-[10px] h-5 px-1.5", 
                                            t.type === "income" 
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" 
                                            : "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800"
                                        )}>
                                      {t.type === "income" ? "Ingreso" : "Gasto"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="font-normal text-xs bg-muted/50">
                                        {t.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[300px] truncate text-sm" title={t.description}>{t.description}</TableCell>
                                  <TableCell className="capitalize text-sm text-muted-foreground">{t.method}</TableCell>
                                  <TableCell className={`text-right font-bold tabular-nums ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {t.type === "income" ? "+" : "-"} {formatMoney(t.amount)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- PESTAÑA 2: MÉTRICAS Y GRÁFICOS --- */}
          <TabsContent value="metrics" className="space-y-6 mt-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* GRÁFICO 1: EVOLUCIÓN FINANCIERA */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    Evolución Financiera (6 Meses)
                  </CardTitle>
                  <CardDescription>Comparativa de Ingresos vs Gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartsData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                        <Tooltip
                          cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                          formatter={(value: number) => formatMoney(value)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* GRÁFICO 2: EQUIPOS INGRESADOS */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    Equipos Ingresados
                  </CardTitle>
                  <CardDescription>Volumen de trabajo mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartsData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend iconType="circle" />
                        <Line type="monotone" dataKey="ordersCount" name="Equipos Recibidos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}