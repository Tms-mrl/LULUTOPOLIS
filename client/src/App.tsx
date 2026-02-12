import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

// TUS PÁGINAS (App)
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import NewOrder from "@/pages/new-order";
import OrderDetail from "@/pages/order-detail";
import Clients from "@/pages/clients";
import NewClient from "@/pages/new-client";
import ClientDetail from "@/pages/client-detail";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import PrintOrder from "@/pages/print-order";
import InventoryPage from "@/pages/inventory";
import SettingsPage from "@/pages/settings";

// PÁGINAS PÚBLICAS (Nombres de archivos reales en tu carpeta)
import LandingPage from "@/pages/landing/home";
import Login from "@/pages/auth-login";
import Register from "@/pages/auth-register";

function App() {
  const [location] = useLocation();

  // Definimos qué URLs son públicas para que no intente ponerles el Sidebar
  const isPublicRoute =
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location.startsWith("/auth");

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {isPublicRoute ? (
          <Switch>
            <Route path="/" component={LandingPage} />
            {/* AQUÍ CONFIGURAMOS LAS RUTAS QUE TIRABAN 404 */}
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />

            {/* Si alguien va a /auth, lo mandamos al login nuevo */}
            <Route path="/auth" component={Login} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/register" component={Register} />

            <Route component={NotFound} />
          </Switch>
        ) : (
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex min-h-screen w-full bg-sidebar-background/5">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out">
                <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur">
                  <SidebarTrigger />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
                    <ProtectedRoute
                      component={() => (
                        <Switch>
                          <Route path="/dashboard" component={Dashboard} />
                          <Route path="/ordenes" component={Orders} />
                          <Route path="/ordenes/nueva" component={NewOrder} />
                          <Route path="/ordenes/:id/print" component={PrintOrder} />
                          <Route path="/ordenes/:id" component={OrderDetail} />
                          <Route path="/clientes" component={Clients} />
                          <Route path="/clientes/nuevo" component={NewClient} />
                          <Route path="/clientes/:id" component={ClientDetail} />
                          <Route path="/cobros" component={Payments} />
                          <Route path="/reportes" component={Reports} />
                          <Route path="/inventory" component={InventoryPage} />
                          <Route path="/configuracion" component={SettingsPage} />
                          <Route component={NotFound} />
                        </Switch>
                      )}
                    />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
        )}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;