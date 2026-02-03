import { listClients } from "@/lib/gsmApi";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter"; // Agregamos useLocation
import { Plus, Search, Users } from "lucide-react"; // Quitamos iconos que ya están dentro de la Card
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
// Importamos tu nuevo componente (Asegúrate que la ruta coincida con donde creaste el archivo)
import { ClientCard } from "@/components/cards/client-card";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation(); // Hook para navegar sin usar <Link>

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => listClients(200),
  });

  const filteredClients = clients?.filter((client) => {
    return searchQuery === "" ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone ?? "").includes(searchQuery) ||
      (client.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  });

  // Manejador para ir al detalle del cliente
  const handleCardClick = (id: number) => {
    setLocation(`/clientes/${id}`);
  };

  // Manejador para el botón de editar (evita que se abra el detalle al clickear editar)
  const handleEditClick = (e: any, id: number) => {
    e.stopPropagation();
    setLocation(`/clientes/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu base de clientes</p>
        </div>
        <Button asChild data-testid="button-new-client">
          <Link href="/clientes/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-clients"
        />
      </div>

      {/* Manejo de Errores */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
          Error cargando clientes: {(error as any).message}
        </div>
      )}

      {/* Estados de Carga y Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients && filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client) => (
            // AQUÍ ESTÁ EL CAMBIO PRINCIPAL: Usamos ClientCard
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => handleCardClick(client.id)}
              onEdit={(e: any) => handleEditClick(e, client.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? "Sin resultados" : "No hay clientes"}
          description={
            searchQuery
              ? "No se encontraron clientes con la búsqueda realizada"
              : "Agrega tu primer cliente para comenzar"
          }
          actionLabel={!searchQuery ? "Nuevo Cliente" : undefined}
          actionHref={!searchQuery ? "/clientes/nuevo" : undefined}
        />
      )}
    </div>
  );
}