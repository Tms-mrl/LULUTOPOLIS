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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Smartphone,
    Mail,
    MapPin,
    Phone
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";

export default function SettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    const { data: settings, isLoading } = useQuery<Settings>({
        queryKey: ["/api/settings"],
    });

    const form = useForm<InsertSettings>({
        resolver: zodResolver(insertSettingsSchema),
        defaultValues: {
            shopName: "",
            address: "",
            phone: "",
            email: "",
            whatsapp: "",
            landline: "",
            logoUrl: "",
            cardSurcharge: 0,
            transferSurcharge: 0,
            receiptDisclaimer: "",
            ticketFooter: "",
            checklistOptions: [],
            printFormat: "a4",
            dayCutoffHour: 0,
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
    }, [settings, form]);

    const mutation = useMutation({
        mutationFn: async (data: InsertSettings) => {
            const finalData = { ...data, checklistOptions: checklistItems };
            const res = await apiRequest("POST", "/api/settings", finalData);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({
                title: "Éxito",
                description: "Configuración guardada correctamente.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración.",
                variant: "destructive",
            });
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
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast({ title: "Sesión cerrada correctamente" });
            setLocation("/auth");
        } catch (error: any) {
            toast({
                title: "Error al cerrar sesión",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Estilos base para los triggers de las pestañas
    const tabTriggerBase = "rounded-full px-6 py-2.5 transition-all flex gap-2 items-center border border-transparent data-[state=active]:shadow-sm data-[state=active]:font-medium";

    return (
        <div className="min-h-screen bg-background/50 pb-20">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* --- HEADER STICKY "GLASS" --- */}
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
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Salir
                                </Button>
                                {/* BOTÓN GUARDAR (Estilo Primary Glass) */}
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={mutation.isPending}
                                    className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 shadow-sm backdrop-blur-sm transition-all active:scale-95 flex-1 sm:flex-none"
                                >
                                    {mutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                        <Tabs defaultValue="general" className="w-full space-y-8">
                            
                            {/* --- LISTA DE PESTAÑAS FLOTANTES (CON COLORES ACTIVOS) --- */}
                            <div className="flex justify-center">
                                <TabsList className="h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-full inline-flex flex-wrap justify-center gap-1">
                                    
                                    <TabsTrigger 
                                        value="general" 
                                        className={`${tabTriggerBase} data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-500 data-[state=active]:border-violet-500/20`}
                                    >
                                        <Store className="h-4 w-4" /> General
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="operations" 
                                        className={`${tabTriggerBase} data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/20`}
                                    >
                                        <Wrench className="h-4 w-4" /> Operativo
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="checklist" 
                                        className={`${tabTriggerBase} data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/20`}
                                    >
                                        <ClipboardCheck className="h-4 w-4" /> Recepción
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="legal" 
                                        className={`${tabTriggerBase} data-[state=active]:bg-zinc-500/10 data-[state=active]:text-zinc-400 data-[state=active]:border-zinc-500/20`}
                                    >
                                        <Scale className="h-4 w-4" /> Legales
                                    </TabsTrigger>

                                </TabsList>
                            </div>

                            {/* --- TAB 1: GENERAL --- */}
                            <TabsContent value="general" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Identidad (Violeta Intenso) */}
                                    <Card className="lg:col-span-1 border-border/50 bg-gradient-to-br from-card via-card/90 to-violet-500/20 shadow-sm hover:border-violet-500/30 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <ImageIcon className="h-5 w-5 text-violet-500" /> Identidad Visual
                                            </CardTitle>
                                            <CardDescription>Logo y nombre que verán tus clientes.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <FormField
                                                control={form.control}
                                                name="shopName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nombre del Taller</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ej. GSM Reparaciones" {...field} value={field.value ?? ""} className="bg-background/50 focus:border-violet-500/50" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="logoUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Logo del Negocio</FormLabel>
                                                        <FormControl>
                                                            <LogoUpload value={field.value || ""} onChange={field.onChange} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Contacto (Azul Intenso) */}
                                    <Card className="lg:col-span-2 border-border/50 bg-gradient-to-br from-card via-card/90 to-blue-500/20 shadow-sm hover:border-blue-500/30 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Store className="h-5 w-5 text-blue-500" /> Información de Contacto
                                            </CardTitle>
                                            <CardDescription>Datos públicos que aparecerán en los comprobantes.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="address"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel>Dirección Física</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input placeholder="Av. Siempre Viva 123" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Email</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input placeholder="contacto@taller.com" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="phone"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Celular</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input placeholder="+54 9..." {...field} value={field.value ?? ""} className="pl-9 bg-background/50" />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="whatsapp"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>WhatsApp (Link)</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-green-600/70" />
                                                                    <Input placeholder="+54 9..." {...field} value={field.value ?? ""} className="pl-9 bg-background/50" />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="landline"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Tel. Fijo (Opcional)</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input placeholder="4444-5555" {...field} value={field.value ?? ""} className="pl-9 bg-background/50" />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* --- TAB 2: OPERATIVO --- */}
                            <TabsContent value="operations" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    
                                    {/* Impresión (Slate/Gris Azulado Intenso) */}
                                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-slate-500/20 shadow-sm hover:border-slate-500/30 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Printer className="h-5 w-5 text-slate-500" /> Formato de Impresión
                                            </CardTitle>
                                            <CardDescription>Elige cómo se generarán las órdenes.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <FormField
                                                control={form.control}
                                                name="printFormat"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormControl>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {/* Tarjeta Visual Opción A4 */}
                                                                <label 
                                                                    className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 hover:bg-muted/50 transition-all ${field.value === 'a4' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50'}`}
                                                                    onClick={() => field.onChange('a4')}
                                                                >
                                                                    <div className={`p-3 rounded-full ${field.value === 'a4' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                                        <FileText className="h-6 w-6" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="font-semibold block">Hoja A4</span>
                                                                        <span className="text-xs text-muted-foreground">Original y duplicado</span>
                                                                    </div>
                                                                </label>

                                                                {/* Tarjeta Visual Opción Ticket */}
                                                                <label 
                                                                    className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 hover:bg-muted/50 transition-all ${field.value === 'ticket' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50'}`}
                                                                    onClick={() => field.onChange('ticket')}
                                                                >
                                                                    <div className={`p-3 rounded-full ${field.value === 'ticket' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                                        <ScrollText className="h-6 w-6" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="font-semibold block">Ticket 80mm</span>
                                                                        <span className="text-xs text-muted-foreground">Formato térmico</span>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Finanzas (Esmeralda Intenso) */}
                                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-emerald-500/20 shadow-sm hover:border-emerald-500/30 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <CreditCard className="h-5 w-5 text-emerald-500" /> Finanzas y Jornada
                                            </CardTitle>
                                            <CardDescription>Configuración automática de recargos y cierres.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="cardSurcharge"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Recargo Tarjeta</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8 bg-background/50" />
                                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="transferSurcharge"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Recargo Transf.</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8 bg-background/50" />
                                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="dayCutoffHour"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cierre de Jornada (Hora de Corte)</FormLabel>
                                                        <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-background/50">
                                                                    <SelectValue placeholder="Selecciona hora" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="0">00:00 (Medianoche - Default)</SelectItem>
                                                                {[...Array(23)].map((_, i) => (
                                                                    <SelectItem key={i+1} value={(i+1).toString()}>{i+1 < 10 ? `0${i+1}:00` : `${i+1}:00`}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>Las estadísticas diarias se reiniciarán a esta hora.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* --- TAB 3: CHECKLIST (Naranja Intenso) --- */}
                            <TabsContent value="checklist" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-orange-500/20 shadow-sm hover:border-orange-500/30 transition-all">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <ClipboardCheck className="h-5 w-5 text-orange-500" /> Checklist de Ingreso
                                            </CardTitle>
                                            <CardDescription>Define qué revisar al recibir un equipo.</CardDescription>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} disabled={checklistItems.length >= 12}>
                                            <Plus className="h-4 w-4 mr-2" /> Agregar Item
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {checklistItems.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center group bg-background/40 p-1.5 rounded-lg border border-transparent hover:border-orange-500/20 transition-colors focus-within:border-orange-500/30">
                                                    <div className="h-8 w-8 flex items-center justify-center rounded bg-muted/50 text-xs font-mono text-muted-foreground shrink-0 group-focus-within:text-orange-500 group-focus-within:bg-orange-500/10 transition-colors">
                                                        {index + 1}
                                                    </div>
                                                    <Input
                                                        value={item}
                                                        onChange={(e) => updateChecklistItem(index, e.target.value)}
                                                        placeholder="Ej. ¿Enciende?"
                                                        className="border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:bg-background/80 h-9"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeChecklistItem(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {checklistItems.length === 0 && (
                                                <div className="col-span-full py-12 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20">
                                                    <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                                    <p className="text-muted-foreground">No hay items configurados.</p>
                                                    {/* CORRECCIÓN AQUI: Cambiamos variant="link" por "ghost" + estilos manuales */}
                                                    <Button variant="ghost" className="text-primary hover:text-primary/90 mt-2" onClick={addChecklistItem}>
                                                        Agregar el primero
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- TAB 4: LEGALES (Zinc Intenso) --- */}
                            <TabsContent value="legal" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-zinc-500/20 shadow-sm hover:border-zinc-500/30 transition-all">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Scale className="h-5 w-5 text-zinc-500" /> Legales y Pies de Página
                                        </CardTitle>
                                        <CardDescription>Personaliza los textos legales de tus comprobantes.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="receiptDisclaimer"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Términos (Orden de Reparación)</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Ej: El equipo se recibe en las condiciones descritas. Garantía de 30 días..."
                                                                className="min-h-[150px] font-mono text-sm bg-background/50 resize-y focus:border-zinc-500/30"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="ticketFooter"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Pie de Ticket (Ventas/Pagos)</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Ej: Gracias por su compra. Conserve este ticket para cambios..."
                                                                className="min-h-[150px] font-mono text-sm bg-background/50 resize-y focus:border-zinc-500/30"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </Tabs>
                    </div>
                </form>
            </Form>
        </div>
    );
}

// --- SUBCOMPONENTE DE LOGO MEJORADO ---
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
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

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
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative cursor-pointer overflow-hidden"
                    disabled={uploading}
                >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Subir Nueva Imagen
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </Button>
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                        onClick={() => onChange("")}
                    >
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