import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Save, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  sku: z.string().optional(),
  category: z.string().optional(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const CATEGORIES = ["Repuestos", "Accesorios", "Herramientas", "Servicios", "Otros"];

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const { toast } = useToast();
  const isEditing = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "Repuestos",
      cost: 0,
      price: 0,
      quantity: 0,
      lowStockThreshold: 5,
      description: "",
    },
  });

  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        category: product.category || "Repuestos",
        cost: Number(product.cost),
        price: Number(product.price),
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold || 5,
        description: product.description || "",
      });
    } else if (!product && open) {
      form.reset({
        name: "",
        sku: "",
        category: "Repuestos",
        cost: 0,
        price: 0,
        quantity: 0,
        lowStockThreshold: 5,
        description: "",
      });
    }
  }, [product, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (isEditing && product) {
        await apiRequest("PATCH", `/api/products/${product.id}`, values);
      } else {
        await apiRequest("POST", "/api/products", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: isEditing ? "Producto actualizado" : "Producto creado", 
        description: "El inventario se ha actualizado correctamente." 
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar el producto.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-md border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-full">
              <Package className="h-5 w-5 text-primary" />
            </div>
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-5 py-2">
            
            {/* Nombre y Categoría */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Pantalla iPhone X" className="bg-muted/50 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border/50">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SKU y Alerta */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Código</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="OPCIONAL" className="font-mono bg-muted/50 border-border/50" />
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
                    <FormLabel>Alerta de Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" className="bg-muted/50 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Precios y Cantidad */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" className="bg-muted/50 border-border/50" />
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
                    <FormLabel>Venta ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" className="bg-muted/50 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" className="bg-muted/50 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Detalles / Notas */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles / Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Calidad, proveedor, ubicación..." 
                      className="bg-muted/50 border-border/50 min-h-[80px]" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20">
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Guardando..." : "Guardar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}