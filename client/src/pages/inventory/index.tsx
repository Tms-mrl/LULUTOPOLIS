import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Plus, 
    Search, 
    FileDown, 
    Pencil, 
    Trash2, 
    Package, 
    Boxes, 
    AlertTriangle, 
    DollarSign,
    Tag
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDialog } from "./product-dialog";
import { ImportDialog } from "./import-dialog";
import { QuickRestockPopover } from "./quick-restock-popover";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isProductOpen, setIsProductOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: products = [], isLoading } = useQuery<Product[]>({
        queryKey: ["/api/products"],
    });

    // --- CÁLCULOS KPI ---
    const totalUniqueProducts = products.length;
    const totalInventoryValue = products.reduce((acc, product) => acc + (Number(product.cost) * product.quantity), 0);
    const lowStockCount = products.filter(p => p.quantity <= (p.lowStockThreshold || 0)).length;

    const filteredProducts = products?.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.model || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setSelectedProduct(null);
        setIsProductOpen(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsProductOpen(true);
    };

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({
                title: "Producto eliminado",
                description: "El producto ha sido eliminado correctamente del inventario.",
            });
            setProductToDelete(null);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "No se pudo eliminar el producto. Inténtalo de nuevo.",
                variant: "destructive",
            });
        },
    });

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteProductMutation.mutate(productToDelete.id);
        }
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
                            <Package className="h-6 w-6 text-primary" />
                            Inventario
                        </h1>
                        <p className="text-sm text-muted-foreground hidden sm:block">
                            Gestión de stock, productos y precios.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* BOTÓN EXCEL (Estilo Esmeralda Glass) */}
                        <Button 
                            variant="outline" 
                            onClick={() => setIsImportOpen(true)}
                            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm backdrop-blur-sm transition-all"
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Importar Excel
                        </Button>

                        {/* BOTÓN NUEVO (Estilo Primary Glass) */}
                        <Button 
                            onClick={handleCreate}
                            variant="outline"
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 shadow-sm backdrop-blur-sm transition-all"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Producto
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">

                {/* --- KPI CARDS (RESUMEN) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Productos (Indigo) */}
                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-indigo-500/10 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-3 opacity-10">
                            <Boxes className="w-24 h-24 text-indigo-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Package className="h-4 w-4 text-indigo-500" /> Total Productos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                {totalUniqueProducts} <span className="text-sm font-normal text-muted-foreground">ítems</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Valor Inventario (Verde) */}
                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-emerald-500/10 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-3 opacity-10">
                            <DollarSign className="w-24 h-24 text-emerald-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-500" /> Valor Inventario (Costo)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(totalInventoryValue)}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stock Bajo (Naranja) */}
                    <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-orange-500/10 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-3 opacity-10">
                            <AlertTriangle className="w-24 h-24 text-orange-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Alerta Stock Bajo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                {lowStockCount} <span className="text-sm font-normal text-muted-foreground">productos</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- TABLA DE PRODUCTOS --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Listado de Productos</h2>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, SKU, marca..."
                                className="pl-8 bg-background/50 border-border/50 focus:bg-background transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="space-y-2 p-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : filteredProducts?.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
                                    <Package className="h-12 w-12 opacity-20" />
                                    <p>No se encontraron productos</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Marca / Modelo</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Calidad</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead className="text-right">Costo</TableHead>
                                                <TableHead className="text-right">Precio Venta</TableHead>
                                                <TableHead className="text-center w-[120px]">Stock</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProducts?.map((product) => {
                                                const isLowStock = product.quantity <= (product.lowStockThreshold || 0);
                                                
                                                return (
                                                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors group">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {product.sku || "-"}
                                                        </TableCell>
                                                        
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{product.brand || "-"}</span>
                                                                <span className="text-xs text-muted-foreground">{product.model}</span>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="font-medium">
                                                            <div className="text-foreground group-hover:text-primary transition-colors">{product.name}</div>
                                                            {(product.description || product.detail) && (
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                    {[product.detail, product.description].filter(Boolean).join(" • ")}
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        {/* CALIDAD (Zinc Glass) */}
                                                        <TableCell>
                                                            {product.quality ? (
                                                                <Badge variant="outline" className="font-normal text-[10px] bg-zinc-500/10 text-zinc-500 border-zinc-500/20 uppercase tracking-wide">
                                                                    {product.quality}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs opacity-50">-</span>
                                                            )}
                                                        </TableCell>

                                                        {/* CATEGORÍA (Indigo Glass) */}
                                                        <TableCell>
                                                            {product.category ? (
                                                                <Badge variant="outline" className="font-normal text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex w-fit items-center gap-1">
                                                                    <Tag className="h-3 w-3 opacity-70" />
                                                                    {product.category}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs opacity-50">-</span>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right text-muted-foreground font-mono text-xs">
                                                            {formatMoney(Number(product.cost))}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-sm">
                                                            {formatMoney(Number(product.price))}
                                                        </TableCell>
                                                        
                                                        {/* STOCK (Con alerta Glass) */}
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {isLowStock ? (
                                                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 h-6 px-2 gap-1.5">
                                                                        <span className="font-bold">{product.quantity}</span>
                                                                        <AlertTriangle className="h-3 w-3 animate-pulse" />
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="font-medium tabular-nums text-muted-foreground">
                                                                        {product.quantity}
                                                                    </span>
                                                                )}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <QuickRestockPopover product={product} />
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(product)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <ProductDialog
                        open={isProductOpen}
                        onOpenChange={setIsProductOpen}
                        product={selectedProduct}
                    />

                    <ImportDialog
                        open={isImportOpen}
                        onOpenChange={setIsImportOpen}
                    />

                    <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al producto
                                    <span className="font-semibold text-foreground"> {productToDelete?.name} </span>
                                    del inventario.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}