import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // <--- AGREGADO useQueryClient
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertProductSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient"; // <--- QUITAMOS queryClient de aquí
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

const formSchema = insertProductSchema;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // <--- OBTENEMOS LA INSTANCIA CORRECTA
  const [openCategory, setOpenCategory] = useState(false);

  // 1. OBTENER CATEGORÍAS EXISTENTES
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: open,
  });

  const existingCategories = Array.from(new Set(
    products.map(p => p.category).filter((c): c is string => !!c)
  )).sort();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      category: "",
      cost: 0,
      price: 0,
      quantity: 0,
      lowStockThreshold: 5,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        ...product,
        cost: Number(product.cost),
        price: Number(product.price),
        description: product.description || "",
        sku: product.sku || "",
        category: product.category || "",
        lowStockThreshold: product.lowStockThreshold || 5,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        sku: "",
        category: "",
        cost: 0,
        price: 0,
        quantity: 0,
        lowStockThreshold: 5,
      });
    }
  }, [product, form, open]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        ...values,
        cost: Number(values.cost),
        price: Number(values.price),
        quantity: Number(values.quantity),
        lowStockThreshold: Number(values.lowStockThreshold),
      };

      if (product) {
        await apiRequest("PATCH", `/api/products/${product.id}`, payload);
      } else {
        await apiRequest("POST", "/api/products", payload);
      }
    },
    onSuccess: () => {
      // ESTA LÍNEA AHORA FUNCIONARÁ PERFECTO:
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      toast({
        title: product ? "Producto actualizado" : "Producto creado",
        description: `El producto ha sido ${product ? "actualizado" : "creado"} exitosamente.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al guardar el producto.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

            {/* NOMBRE Y SKU */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Pantalla iPhone X" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código / SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: P-IPHX-001" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- CATEGORÍA (COMBOBOX CREATIVO) --- */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Categoría</FormLabel>
                  <Popover open={openCategory} onOpenChange={setOpenCategory}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategory}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? field.value
                            : "Seleccionar o escribir categoría..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar o crear nueva..."
                        />
                        <CommandList>
                          <CommandEmpty>
                            <p className="p-2 text-sm text-muted-foreground">
                              ¿No existe? Agrégala abajo:
                            </p>
                            <Button
                              variant="secondary"
                              className="w-full justify-start h-8 font-normal"
                              onClick={() => {
                                const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                                if (input?.value) {
                                  form.setValue("category", input.value);
                                  setOpenCategory(false);
                                }
                              }}
                            >
                              + Usar texto escrito
                            </Button>
                          </CommandEmpty>

                          <CommandGroup heading="Sugerencias">
                            {existingCategories.map((category) => (
                              <CommandItem
                                key={category}
                                value={category}
                                onSelect={(currentValue) => {
                                  form.setValue("category", currentValue === field.value ? "" : currentValue);
                                  setOpenCategory(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === category ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {category}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PRECIOS Y STOCK */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo (Compra)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio (Venta)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="font-bold text-emerald-600"
                        {...field}
                        value={field.value ?? 0}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Actual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alerta Stock Bajo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción / Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles adicionales..."
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : (product ? "Actualizar" : "Crear")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}