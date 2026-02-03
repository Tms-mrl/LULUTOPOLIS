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
    CreditCard
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
        setChecklistItems([...checklistItems, "Nuevo ítem"]);
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
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* --- HEADER SUPERIOR (TÍTULO Y BOTONES GLOBALES) --- */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-4 border-b">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                            <p className="text-muted-foreground">Administra los datos y preferencias del sistema.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleLogout}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Salir
                            </Button>
                            <Button type="submit" disabled={mutation.isPending} className="flex-1 sm:flex-none">
                                {mutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Guardar Todo
                            </Button>
                        </div>
                    </div>

                    {/* --- SISTEMA DE PESTAÑAS --- */}
                    <Tabs defaultValue="general" className="w-full max-w-6xl mx-auto">
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                            <TabsTrigger value="general" className="flex gap-2">
                                <Store className="h-4 w-4" /> General
                            </TabsTrigger>
                            <TabsTrigger value="operations" className="flex gap-2">
                                <Settings2 className="h-4 w-4" /> Operativo
                            </TabsTrigger>
                            <TabsTrigger value="checklist" className="flex gap-2">
                                <ClipboardCheck className="h-4 w-4" /> Recepción
                            </TabsTrigger>
                            <TabsTrigger value="legal" className="flex gap-2">
                                <Scale className="h-4 w-4" /> Legales
                            </TabsTrigger>
                        </TabsList>

                        {/* --- TAB 1: GENERAL (DATOS Y CONTACTO) --- */}
                        <TabsContent value="general" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Columna Izquierda: Identidad */}
                                <Card className="lg:col-span-1">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Identidad</CardTitle>
                                        <CardDescription>Logo y nombre visible.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="shopName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombre del Taller</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. GSM Reparaciones" {...field} value={field.value ?? ""} />
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
                                                    <FormLabel>Logo</FormLabel>
                                                    <FormControl>
                                                        <LogoUpload value={field.value || ""} onChange={field.onChange} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Columna Derecha: Contacto */}
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Información de Contacto</CardTitle>
                                        <CardDescription>Estos datos aparecerán en los tickets e informes.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Dirección</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ej. Av. Siempre Viva 123" {...field} value={field.value ?? ""} />
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
                                                        <FormLabel>Email Público</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="contacto@mitaller.com" {...field} value={field.value ?? ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Celular</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+54 9..." {...field} value={field.value ?? ""} />
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
                                                        <FormLabel>WhatsApp</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+54 9..." {...field} value={field.value ?? ""} />
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
                                                        <FormLabel>Tel. Fijo</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="4444-5555" {...field} value={field.value ?? ""} />
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

                        {/* --- TAB 2: OPERATIVO (IMPRESIÓN Y FINANZAS) --- */}
                        <TabsContent value="operations" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Impresión */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Printer className="h-5 w-5" /> Impresión
                                        </CardTitle>
                                        <CardDescription>Formato de las órdenes de reparación.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="printFormat"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormControl>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <label className={`relative flex cursor-pointer flex-col rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${field.value === 'a4' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                                                <input type="radio" className="sr-only" checked={field.value === 'a4'} onChange={() => field.onChange('a4')} />
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                                        <FileText className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="font-semibold">Hoja A4</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">Original y duplicado en una hoja.</p>
                                                            </label>

                                                            <label className={`relative flex cursor-pointer flex-col rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${field.value === 'ticket' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                                                <input type="radio" className="sr-only" checked={field.value === 'ticket'} onChange={() => field.onChange('ticket')} />
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                                        <ScrollText className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="font-semibold">Ticket</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">Formato térmico continuo (80mm).</p>
                                                            </label>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Finanzas y Horarios */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" /> Finanzas y Jornada
                                        </CardTitle>
                                        <CardDescription>Recargos automáticos y horario de cierre.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="cardSurcharge"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Recargo Tarjeta</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8" />
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
                                                                <Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="pr-8" />
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
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona hora" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="0">00:00 (Medianoche - Default)</SelectItem>
                                                            <SelectItem value="1">01:00 AM</SelectItem>
                                                            <SelectItem value="2">02:00 AM</SelectItem>
                                                            <SelectItem value="3">03:00 AM</SelectItem>
                                                            <SelectItem value="4">04:00 AM</SelectItem>
                                                            <SelectItem value="5">05:00 AM</SelectItem>
                                                            <SelectItem value="6">06:00 AM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* --- TAB 3: CHECKLIST --- */}
                        <TabsContent value="checklist">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">Checklist de Ingreso</CardTitle>
                                        <CardDescription>Preguntas rápidas al recibir un equipo.</CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} disabled={checklistItems.length >= 12}>
                                        <Plus className="h-4 w-4 mr-2" /> Agregar
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {checklistItems.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-center group">
                                                <Input
                                                    value={item}
                                                    onChange={(e) => updateChecklistItem(index, e.target.value)}
                                                    placeholder="Ej. ¿Enciende?"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeChecklistItem(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    {checklistItems.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8 italic">No hay items configurados.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- TAB 4: LEGALES --- */}
                        <TabsContent value="legal" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Textos Legales y Pies de Página</CardTitle>
                                    <CardDescription>Personaliza la letra chica de tus comprobantes.</CardDescription>
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
                                                            placeholder="El equipo se recibe en las condiciones..."
                                                            className="min-h-[200px] font-mono text-sm"
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
                                                            placeholder="Gracias por su compra..."
                                                            className="min-h-[200px] font-mono text-sm"
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
                </form>
            </Form>
        </div>
    );
}

// --- SUBCOMPONENTE DE LOGO ---
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
        <div className="flex items-center gap-4">
            <div className={`h-24 w-24 rounded-lg border flex items-center justify-center bg-muted/50 overflow-hidden relative group transition-colors hover:border-primary/50`}>
                {value ? (
                    <img src={value} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative cursor-pointer"
                    disabled={uploading}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Imagen
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
                        className="text-destructive hover:text-destructive h-auto p-0 justify-start"
                        onClick={() => onChange("")}
                    >
                        Eliminar Logo
                    </Button>
                )}
            </div>
        </div>
    )
}