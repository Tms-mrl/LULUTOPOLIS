import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Usamos el componente Button de la UI
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrderFormValues } from "./schemas";

interface OrderDetailsProps {
    form: UseFormReturn<OrderFormValues>;
}

export function OrderDetails({ form }: OrderDetailsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Detalles de la Reparación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="problem"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Problema Reportado *</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="Describe el problema que reporta el cliente..."
                                    className="min-h-24 resize-none"
                                    data-testid="input-problem"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {/* 1. COSTO ESTIMADO */}
                    <FormField
                        control={form.control}
                        name="estimatedCost"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Costo Estimado</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        data-testid="input-estimated-cost"
                                        className="h-10" // Altura estándar
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 2. FECHA ESTIMADA */}
                    <FormField
                        control={form.control}
                        name="estimatedDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha Estimada</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    // Clases base para igualar exactamente al Input
                                                    "h-10 w-full px-3 text-left font-normal",
                                                    "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                                                    "flex items-center justify-between", // Alineación flex
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(new Date(field.value + "T00:00:00"), "dd/MM/yy")
                                                ) : (
                                                    <span>dd/mm/aa</span>
                                                )}
                                                <CalendarIcon className="h-4 w-4 opacity-50 text-primary" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                                            onSelect={(date) => {
                                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                            }}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 3. PRIORIDAD */}
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Prioridad</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger
                                            data-testid="select-priority"
                                            className="h-10 bg-background w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="urgente">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="technicianName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Técnico Asignado</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Nombre del técnico"
                                    data-testid="input-technician"
                                    className="h-10"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas Adicionales</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="Cualquier información adicional..."
                                    data-testid="input-notes"
                                    className="min-h-[80px]"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}