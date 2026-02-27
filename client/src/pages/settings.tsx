import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings, type Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

import {
    Loader2,
    Save,
    Upload,
    Image as ImageIcon,
    LogOut,
    Plus,
    X,
    Printer,
    FileText,
    ScrollText,
    Store,
    Settings2,
    ClipboardCheck,
    Scale,
    CreditCard,
    Wrench,
    Mail,
    MapPin,
    Phone,
    Zap,
    ShieldCheck,
    Check,
    Lock,
    Home,
    Smartphone,
    Timer
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";

type BillingPeriod = 'monthly' | 'semester' | 'annual';

export default function SettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    const searchParams = new URLSearchParams(window.location.search);
    const initialTab = searchParams.get("tab") || "general";

    let urlPeriod = searchParams.get("period");
    if (urlPeriod === 'semi_annual') urlPeriod = 'semester';

    const initialPeriod = (urlPeriod as BillingPeriod) || "monthly";

    const { session, signOut } = useAuth();

    const [subData, setSubData] = useState<any>(null);
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialPeriod);

    // 👇 LÓGICA DE PROMOCIÓN (Igual que en Landing y Backend)
    const now = new Date();
    const promoDeadline = new Date("2026-03-18T23:59:59");
    const isPromoActive = now <= promoDeadline;

    const { data: settings, isLoading } = useQuery<Settings>({
        queryKey: ["/api/settings"],
    });

    const form = useForm<InsertSettings>({
        resolver: zodResolver(insertSettingsSchema),
        defaultValues: {
            shopName: "", address: "", phone: "", email: "", whatsapp: "", landline: "",
            logoUrl: "", cardSurcharge: 0, transferSurcharge: 0,
            receiptDisclaimer: "", ticketFooter: "", checklistOptions: [],
            printFormat: "a4", dayCutoffHour: 0,
        },
    });

    const [checklistItems, setChecklistItems] = useState<string[]>([]);

    useEffect(() => {
        if (settings) {
            form.reset({
                shopName: settings.shopName || "",
                address: settings.address || "",
                phone: settings.phone || "",
                email: settings.email || "",
                whatsapp: settings.whatsapp || "",
                landline: settings.landline || "",
                logoUrl: settings.logoUrl || "",
                cardSurcharge: Number(settings.cardSurcharge) || 0,
                transferSurcharge: Number(settings.transferSurcharge) || 0,
                receiptDisclaimer: settings.receiptDisclaimer || "",
                ticketFooter: settings.ticketFooter || "",
                checklistOptions: settings.checklistOptions || [],
                printFormat: settings.printFormat || "a4",
                dayCutoffHour: settings.dayCutoffHour || 0,
            });
            setChecklistItems(settings.checklistOptions || []);
        }

        const fetchSub = async () => {
            try {
                const token = session?.access_token;
                if (!token) return;

                const res = await fetch("/api/user/subscription", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) setSubData(await res.json());
            } catch (e) { console.error("Error fetching sub:", e); }
        };
        fetchSub();

    }, [settings, form, session]);

    const mutation = useMutation({
        mutationFn: async (data: InsertSettings) => {
            const finalData = { ...data, checklistOptions: checklistItems };
            const res = await apiRequest("POST", "/api/settings", finalData);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({ title: "Éxito", description: "Configuración guardada correctamente." });
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
        },
    });

    const onSubmit = (data: InsertSettings) => {
        mutation.mutate(data);
    };

    const addChecklistItem = () => {
        if (checklistItems.length >= 12) {
            toast({ title: "Máximo 12 ítems permitidos", variant: "destructive" });
            return;
        }
        setChecklistItems([...checklistItems, ""]);
    };

    const updateChecklistItem = (index: number, value: string) => {
        const newItems = [...checklistItems];
        newItems[index] = value;
        setChecklistItems(newItems);
        form.setValue("checklistOptions", newItems);
    };

    const removeChecklistItem = (index: number) => {
        const newItems = checklistItems.filter((_, i) => i !== index);
        setChecklistItems(newItems);
        form.setValue("checklistOptions", newItems);
    };

    const handleLogout = async () => {
        try {
            await signOut();
            toast({ title: "Sesión cerrada correctamente" });
        } catch (error: any) {
            toast({ title: "Error al cerrar sesión", description: error.message, variant: "destructive" });
        }
    };

    const handleCheckout = async (planType: string) => {
        let backendPlanId = "";

        if (planType === "standard") {
            if (billingPeriod === "monthly") backendPlanId = "monthly";
            if (billingPeriod === "semester") backendPlanId = "semi_annual";
            if (billingPeriod === "annual") backendPlanId = "annual";
        } else {
            return;
        }

        try {
            setLoadingCheckout(true);
            const token = session?.access_token;

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ planId: backendPlanId })
            });

            const data = await res.json();

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                toast({ title: "Error", description: "No se pudo generar el pago.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Problema de conexión.", variant: "destructive" });
        } finally {
            setLoadingCheckout(false);
        }
    };

    const isTrialing = subData?.subscriptionStatus === 'trialing';
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // --- HELPER PARA PRECIOS Y AHORROS CON PROMOCIÓN ---
    const getPricingDisplay = (type: 'standard' | 'multi' | 'ai') => {
        if (type === 'standard') {
            if (billingPeriod === 'monthly') {
                // Si la promo está activa, devolvemos el precio con descuento y el original tachado
                return isPromoActive 
                    ? { price: "$25.000", original: "$30.000" } 
                    : { price: "$30.000", original: null };
            }
            if (billingPeriod === 'semester') return { price: "$30", original: "$180.000" };
            if (billingPeriod === 'annual') return { price: "$50", original: "$360.000" };
        }
        return { price: "Consultar", original: null };
    };

    const getIntervalLabel = () => {
        if (billingPeriod === 'monthly') return "/mes";
        if (billingPeriod === 'semester') return "/semestre";
        if (billingPeriod === 'annual') return "/año";
        return "";
    };

    const standardPricing = getPricingDisplay('standard');

    const plans = [
        {
            id: "standard",
            name: "Estándar",
            price: standardPricing.price,
            originalPrice: standardPricing.original,
            interval: getIntervalLabel(),
            desc: "Gestión completa para un taller.",
            features: ["Órdenes ilimitadas",
                "Gestión de clientes",
                "Inventario y Stock",
                "Caja y Finanzas",
                "Soporte",
                "1 Sede"],
            color: "emerald",
            comingSoon: false
        },
        {
            id: "multisede_locked",
            name: "Multisede",
            price: "Próximamente",
            interval: "",
            desc: "Cadenas y múltiples sucursales.",
            features: ["Todo lo del plan Estándar",
                "Múltiples sucursales",
                "Stock independiente",
                "Reportes por sede",
                "Comparaciones entre sucursales",
                "Soporte prioritario"],
            color: "violet",
            comingSoon: true
        },
        {
            id: "ai_locked",
            name: "Premium AI",
            price: "Próximamente",
            interval: "",
            desc: "Potencia tu negocio con inteligencia artificial.",
            features: ["Todo lo del plan Multisede",
                "Chatbot de WhatsApp IA",
                "Respuestas 24/7",
                "Agendamiento automático",
                "Stock de proveedores",
                "Soporte 24/7"],
            color: "indigo",
            comingSoon: true
        }
    ];

    const tabTriggerBase = "rounded-full px-6 py-2.5 transition-all flex gap-2 items-center border border-transparent data-[state=active]:shadow-sm data-[state=active]:font-medium";

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background/50 pb-20">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* --- HEADER --- */}
                    <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4 transition-all">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Settings2 className="h-6 w-6 text-primary" />
                                    Configuración
                                </h1>
                                <p className="text-sm text-muted-foreground hidden sm:block">
                                    Administra la identidad, operaciones y reglas del sistema.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setLocation("/")}
                                    className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/50 transition-all shadow-sm"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Ver Landing
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/10 transition-all"
                                >
                                    <LogOut className="mr-2 h-4 w-4" /> Salir
                                </Button>

                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={mutation.isPending}
                                    className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 shadow-sm backdrop-blur-sm transition-all active:scale-95 flex-1 sm:flex-none"
                                >
                                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                        <Tabs defaultValue={initialTab} className="w-full space-y-8">

                            <div className="flex justify-center">
                                <TabsList className="h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-full inline-flex flex-wrap justify-center gap-1">
                                    <TabsTrigger value="general" className={`${tabTriggerBase} data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-500 data-[state=active]:border-violet-500/20`}>
                                        <Store className="h-4 w-4" /> General
                                    </TabsTrigger>
                                    <TabsTrigger value="operations" className={`${tabTriggerBase} data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/20`}>
                                        <Wrench className="h-4 w-4" /> Operativo
                                    </TabsTrigger>
                                    <TabsTrigger value="checklist" className={`${tabTriggerBase} data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/20`}>
                                        <ClipboardCheck className="h-4 w-4" /> Recepción
                                    </TabsTrigger>
                                    <TabsTrigger value="legal" className={`${tabTriggerBase} data-[state=active]:bg-zinc-500/10 data-[state=active]:text-zinc-400 data-[state=active]:border-zinc-500/20`}>
                                        <Scale className="h-4 w-4" /> Legales
                                    </TabsTrigger>
                                    <TabsTrigger value="subscription" className={`rounded-full px-6 py-2.5 transition-all flex gap-2 items-center border border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-700 hover:bg-emerald-500/10 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md`}>
                                        <Zap className="h-4 w-4 fill-current animate-pulse" />
                                        <span className="font-semibold">Mi Plan</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* --- TABS: GENERAL --- */}
                            <TabsContent value="general" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-1 border-border/50 bg-gradient-to-br from-card via-card/90 to-violet-500/20 shadow-sm hover:border-violet-500/30 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-violet-500" /> Identidad Visual</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <FormField control={form.control} name="shopName" render={({ field }) => (<FormItem><FormLabel>Nombre del Taller</FormLabel><FormControl><Input placeholder="Ej. GSM Reparaciones" {...field} value={field.value ?? ""} className="bg-background/50 focus:border-violet-500/50" /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="logoUrl" render={({ field }) => (<FormItem><FormLabel>Logo del Negocio</FormLabel><FormControl><LogoUpload value={field.value || ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        </CardContent>
                                    </Card>
                                    <Card className="lg:col-span-2 border-border/50 bg-gradient-to-br from-card via-card/90 to-blue-500/20 shadow-sm hover:border-blue-500/30 transition-all">
                                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Store className="h-5 w-5 text-blue-500" /> Información de Contacto</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Dirección Física</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Av. Siempre Viva 123" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" /></div></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="contacto@taller.com" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" /></div></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><div className="relative"><Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="+54 9..." {...field} value={field.value ?? ""} className="pl-9 bg-background/50" /></div></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="whatsapp" render={({ field }) => (<FormItem><FormLabel>WhatsApp</FormLabel><FormControl><div className="relative"><Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-green-600/70" /><Input placeholder="+54 9..." {...field} value={field.value ?? ""} className="pl-9 bg-background/50" /></div></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="landline" render={({ field }) => (<FormItem><FormLabel>Tel. Fijo</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="4444-5555" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" /></div></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* --- TABS: OPERATIVO --- */}
                            <TabsContent value="operations" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-slate-500/20 shadow-sm hover:border-slate-500/30 transition-all">
                                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Printer className="h-5 w-5 text-slate-500" /> Formato de Impresión</CardTitle></CardHeader>
                                        <CardContent>
                                            <FormField control={form.control} name="printFormat" render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormControl>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <label className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 hover:bg-muted/50 transition-all ${field.value === 'a4' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50'}`} onClick={() => field.onChange('a4')}>
                                                                <div className={`p-3 rounded-full ${field.value === 'a4' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><FileText className="h-6 w-6" /></div>
                                                                <div className="text-center"><span className="font-semibold block">Hoja A4</span><span className="text-xs text-muted-foreground">Original y duplicado</span></div>
                                                            </label>
                                                            <label className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 hover:bg-muted/50 transition-all ${field.value === 'ticket' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50'}`} onClick={() => field.onChange('ticket')}>
                                                                <div className={`p-3 rounded-full ${field.value === 'ticket' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><ScrollText className="h-6 w-6" /></div>
                                                                <div className="text-center"><span className="font-semibold block">Ticket 80mm</span><span className="text-xs text-muted-foreground">Formato térmico</span></div>
                                                            </label>
                                                        </div>
                                                    </FormControl><FormMessage />
                                                </FormItem>
                                            )} />
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-emerald-500/20 shadow-sm hover:border-emerald-500/30 transition-all">
                                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-500" /> Finanzas y Jornada</CardTitle></CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="cardSurcharge" render={({ field }) => (<FormItem><FormLabel>Recargo Tarjeta</FormLabel><FormControl><div className="relative"><Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8 bg-background/50" /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="transferSurcharge" render={({ field }) => (<FormItem><FormLabel>Recargo Transf.</FormLabel><FormControl><div className="relative"><Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8 bg-background/50" /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <FormField control={form.control} name="dayCutoffHour" render={({ field }) => (<FormItem><FormLabel>Cierre de Jornada</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}><FormControl><SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecciona hora" /></SelectTrigger></FormControl><SelectContent><SelectItem value="0">00:00 (Default)</SelectItem>{[...Array(23)].map((_, i) => (<SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1 < 10 ? `0${i + 1}:00` : `${i + 1}:00`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* --- TABS: CHECKLIST --- */}
                            <TabsContent value="checklist" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-orange-500/20 shadow-sm hover:border-orange-500/30 transition-all">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div><CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-orange-500" /> Checklist de Ingreso</CardTitle><CardDescription>Define qué revisar al recibir un equipo.</CardDescription></div>
                                        <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} disabled={checklistItems.length >= 12}><Plus className="h-4 w-4 mr-2" /> Agregar</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {checklistItems.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center group bg-background/40 p-1.5 rounded-lg border border-transparent hover:border-orange-500/20 transition-colors focus-within:border-orange-500/30">
                                                    <div className="h-8 w-8 flex items-center justify-center rounded bg-muted/50 text-xs font-mono text-muted-foreground shrink-0">{index + 1}</div>
                                                    <Input value={item} onChange={(e) => updateChecklistItem(index, e.target.value)} placeholder="Ej. ¿Enciende?" className="border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:bg-background/80 h-9" />
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeChecklistItem(index)}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                            {checklistItems.length === 0 && (<div className="col-span-full py-12 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20"><ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No hay items configurados.</p><Button variant="ghost" className="text-primary mt-2" onClick={addChecklistItem}>Agregar el primero</Button></div>)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- TABS: LEGALES --- */}
                            <TabsContent value="legal" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-zinc-500/20 shadow-sm hover:border-zinc-500/30 transition-all">
                                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Scale className="h-5 w-5 text-zinc-500" /> Legales</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="receiptDisclaimer" render={({ field }) => (<FormItem><FormLabel>Términos</FormLabel><FormControl><Textarea placeholder="Términos..." className="min-h-[150px] bg-background/50" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="ticketFooter" render={({ field }) => (<FormItem><FormLabel>Pie de Ticket</FormLabel><FormControl><Textarea placeholder="Gracias..." className="min-h-[150px] bg-background/50" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- TAB 5: SUSCRIPCIÓN (DISEÑO PREMIUM ACTUALIZADO) --- */}
                            <TabsContent value="subscription" className="space-y-10 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">

                                {/* 1. Banner de Estado */}
                                <div className="relative group max-w-4xl mx-auto">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <div className="absolute -inset-1 bg-emerald-500 rounded-full blur opacity-40 animate-pulse"></div>
                                                <div className="relative h-14 w-14 rounded-full bg-neutral-950 flex items-center justify-center border border-emerald-500/50">
                                                    <Zap className="h-7 w-7 text-emerald-500 fill-emerald-500/20" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white tracking-tight">
                                                    {isTrialing ? "Periodo de Prueba Activo" : "Suscripción Profesional"}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                                    <p className="text-sm text-emerald-500/80 font-medium">Sistema funcionando al 100%</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 px-6 py-3 bg-neutral-950/50 rounded-xl border border-white/5">
                                            <div className="text-center md:text-left">
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Vencimiento</p>
                                                <p className="text-lg font-mono text-zinc-200">
                                                    {formatDate(isTrialing ? subData?.trialEndsAt : subData?.currentPeriodEnd)}
                                                </p>
                                            </div>
                                            <div className="h-10 w-[1px] bg-white/10"></div>
                                            <Badge className="bg-emerald-500 text-neutral-950 font-bold border-0">
                                                {subData?.subscriptionStatus === 'active' ? 'ACTIVO' : 'FREE'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. SELECTOR DE PERIODO */}
                                <div className="flex flex-col items-center gap-4">
                                    {/* AVISO DE OFERTA */}
                                    {isPromoActive && (
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold animate-pulse">
                                            <Timer className="w-5 h-5" />
                                            <span>¡Oferta lanzamiento hasta el 18 de Marzo!</span>
                                        </div>
                                    )}

                                    <div className="relative inline-flex group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 via-blue-500/30 to-purple-600/30 rounded-xl blur opacity-20 transition duration-500"></div>
                                        <Tabs defaultValue={billingPeriod} className="relative w-full max-w-[500px] mx-auto" onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}>
                                            <TabsList className="grid w-full grid-cols-3 bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-1.5 h-auto rounded-xl shadow-lg">
                                                <TabsTrigger value="monthly" className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-2 hover:text-white transition-colors">Mensual</TabsTrigger>
                                                <TabsTrigger value="semester" className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-2 hover:text-white transition-colors">Semestral</TabsTrigger>
                                                <TabsTrigger value="annual" className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-2 hover:text-white transition-colors">Anual</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                </div>

                                {/* 3. GRID DE PLANES CON GLOW Y COLOR */}
                                <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
                                    {plans.map((plan) => {
                                        const isCurrentPlan = !isTrialing && plan.id === 'standard';

                                        // Definición dinámica de estilos visuales
                                        const styles = {
                                            emerald: {
                                                borderStrong: "border-emerald-500", // Borde solido del color
                                                glow: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]", // Glow verde
                                                gradient: "from-emerald-500/20",
                                                textPrice: "text-emerald-400", // Precio verde
                                                bgIcon: "bg-emerald-500/10",
                                                checkColor: "text-emerald-500"
                                            },
                                            violet: {
                                                borderStrong: "border-violet-500/50",
                                                glow: "shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)]", // Glow violeta
                                                gradient: "from-violet-600/10",
                                                textPrice: "text-violet-400", // Precio violeta
                                                bgIcon: "bg-violet-500/10",
                                                checkColor: "text-violet-400"
                                            },
                                            indigo: {
                                                borderStrong: "border-indigo-500/50",
                                                glow: "shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]", // Glow indigo
                                                gradient: "from-indigo-600/10",
                                                textPrice: "text-indigo-400", // Precio indigo
                                                bgIcon: "bg-indigo-500/10",
                                                checkColor: "text-indigo-400"
                                            }
                                        }[plan.color as 'emerald' | 'violet' | 'indigo'];

                                        return (
                                            <div
                                                key={plan.id}
                                                className={`relative group flex flex-col rounded-2xl transition-all duration-500 hover:scale-[1.02] border-2 ${isCurrentPlan
                                                    ? `${styles.borderStrong} bg-neutral-900 ${styles.glow} z-10`
                                                    : `${plan.comingSoon ? 'border-white/5 opacity-80' : 'border-white/10 hover:border-white/20'} bg-neutral-900/40`
                                                    }`}
                                            >
                                                {/* Efecto de Glow Trasero (Aura) */}
                                                <div className={`absolute -inset-px bg-gradient-to-b ${styles.gradient} to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 pointer-events-none`} />

                                                {/* Fondo degradado superior interno */}
                                                <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${styles.gradient} to-transparent rounded-t-2xl pointer-events-none`} />

                                                <div className="relative p-6 space-y-6 flex-1 flex flex-col">
                                                    <div className="space-y-2">
                                                        {isCurrentPlan && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold px-2 py-0.5 mb-2">
                                                                Plan Actual
                                                            </Badge>
                                                        )}
                                                        {plan.comingSoon && (
                                                            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] uppercase font-bold px-2 py-0.5 mb-2">
                                                                Próximamente
                                                            </Badge>
                                                        )}
                                                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                                            {plan.name}
                                                            {plan.comingSoon && <Lock className="h-4 w-4 text-zinc-600" />}
                                                        </h4>
                                                        <p className="text-sm text-zinc-500">{plan.desc}</p>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        {/* PRECIO ORIGINAL TACHADO (AHORRO) */}
                                                        {plan.originalPrice && !plan.comingSoon && (
                                                            <span className="text-xs text-muted-foreground line-through font-medium ml-1 text-red-400">
                                                                {plan.originalPrice}
                                                            </span>
                                                        )}

                                                        <div className="flex items-baseline gap-1">
                                                            {/* PRECIO CON COLOR */}
                                                            <span className={`text-3xl font-black ${plan.comingSoon ? 'text-zinc-600' : styles.textPrice}`}>
                                                                {plan.price}
                                                            </span>
                                                            <span className="text-zinc-500 text-xs font-medium">{plan.interval}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2 flex-1">
                                                        {plan.features.map((feature, i) => (
                                                            <div key={i} className="flex items-start gap-3 text-[13px] text-zinc-400">
                                                                <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${styles.bgIcon}`}>
                                                                    <Check className={`h-2.5 w-2.5 ${styles.checkColor}`} />
                                                                </div>
                                                                {feature}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="pt-6">
                                                        <Button
                                                            className={`relative w-full h-11 font-bold transition-all duration-300 ${plan.comingSoon
                                                                ? "bg-neutral-800 text-zinc-500 border border-white/5 cursor-not-allowed"
                                                                : isCurrentPlan
                                                                    ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0 active:scale-95"
                                                                    : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] border-0 active:scale-95"
                                                            }`}
                                                            disabled={plan.comingSoon || loadingCheckout}
                                                            onClick={() => !plan.comingSoon && handleCheckout(plan.id)}
                                                        >
                                                            {loadingCheckout && !plan.comingSoon ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
                                                                </div>
                                                            ) : isCurrentPlan ? (
                                                                "Extender Suscripción"
                                                            ) : plan.comingSoon ? (
                                                                "Próximamente"
                                                            ) : (
                                                                "Elegir Plan"
                                                            )}
                                                        </Button>
                                                        {isCurrentPlan && (
                                                            <p className="text-[10px] text-emerald-500/70 text-center mt-2 font-medium">
                                                                Paga ahora y suma tiempo a tu vencimiento actual.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col items-center gap-4 py-6 border-t border-white/5">
                                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500 opacity-60 flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3" /> Secure Checkout Mercado Pago
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </form>
            </Form>
        </div>
    );
}

function LogoUpload({ value, onChange }: { value: string, onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Solo se permiten imágenes", variant: "destructive" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "La imagen no puede superar los 5MB", variant: "destructive" });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                headers: headers
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Error al subir imagen");
            }

            const data = await res.json();
            onChange(data.url);
            toast({ title: "Logo cargado correctamente" });

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`h-24 w-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden relative group transition-colors hover:border-violet-500/50 hover:bg-muted/50`}>
                {value ? (
                    <img src={value} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-[1px]">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" className="relative cursor-pointer overflow-hidden" disabled={uploading}>
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Subir Nueva Imagen
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={uploading} />
                </Button>
                {value && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start" onClick={() => onChange("")}>
                        <X className="h-3.5 w-3.5 mr-2" />
                        Eliminar Logo
                    </Button>
                )}
                <p className="text-[10px] text-muted-foreground max-w-[200px]">
                    Recomendado: PNG transparente, máx 5MB.
                </p>
            </div>
        </div>
    )
}