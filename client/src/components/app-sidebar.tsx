import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  BarChart3,
  HelpCircle,
  Package,
  Settings as SettingsIcon,
  // Importamos los íconos para el nuevo logo
  Smartphone,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SupportDialog } from "@/components/support-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { type Settings } from "@shared/schema";
import { cn } from "@/lib/utils";

// Definimos los items con la paleta de colores
const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    color: "text-pink-500",
    activeBg: "bg-pink-500/10",
    activeText: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20"
  },
  {
    title: "Órdenes",
    url: "/ordenes",
    icon: ClipboardList,
    color: "text-indigo-500",
    activeBg: "bg-indigo-500/10",
    activeText: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20"
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    color: "text-violet-500",
    activeBg: "bg-violet-500/10",
    activeText: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20"
  },
  {
    title: "Cobros",
    url: "/cobros",
    icon: CreditCard,
    color: "text-emerald-500",
    activeBg: "bg-emerald-500/10",
    activeText: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20"
  },
  {
    title: "Stock",
    url: "/inventory",
    icon: Package,
    color: "text-orange-500",
    activeBg: "bg-orange-500/10",
    activeText: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20"
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
    color: "text-cyan-500",
    activeBg: "bg-cyan-500/10",
    activeText: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20"
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: SettingsIcon,
    color: "text-zinc-500",
    activeBg: "bg-zinc-500/10",
    activeText: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-500/20"
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Animación suave para el texto
  const smoothHideText = "ml-3 transition-all duration-300 ease-in-out overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:ml-0";

  return (
    <>
      <Sidebar 
        collapsible="icon" 
        className="border-r border-border/50 bg-background/95 backdrop-blur-sm z-50"
        style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}
      >
        
        {/* --- HEADER --- */}
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-muted/50 transition-all group overflow-hidden group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0"
              >
                {/* NUEVO LOGO BASADO EN REFERENCIA: SMARTPHONE + WRENCH */}
                <div className="relative flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 shadow-sm shadow-primary/20 transition-all duration-300 overflow-hidden">
                  {/* Smartphone de fondo, más sutil */}
                  <Smartphone className="absolute size-5 text-primary/50" strokeWidth={1.5} />
                  {/* Llave inglesa en primer plano, rotada y más gruesa */}
                  <Wrench className="absolute size-5 text-primary rotate-[-30deg] translate-x-0.5" strokeWidth={2} />
                </div>
                
                {/* Texto Header */}
                <div className={`grid flex-1 text-left text-sm leading-tight ${smoothHideText}`}>
                  <span className="truncate font-bold text-base tracking-tight text-primary">GSM FIX</span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">Sistema de Gestión</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* --- CONTENT --- */}
        <SidebarContent className="px-2 mt-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {menuItems.map((item) => {
                  const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "h-12 transition-all duration-200 group relative overflow-hidden rounded-xl",
                          isActive 
                            ? `${item.activeBg} ${item.activeText} font-medium border ${item.border} shadow-sm` 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          "group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0"
                        )}
                        data-testid={`link-nav-${item.title.toLowerCase()}`}
                      >
                        <Link href={item.url} className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
                          <item.icon 
                            className={cn(
                              "size-7 shrink-0 transition-colors duration-200", 
                              isActive ? item.activeText : item.color,
                              !isActive && "opacity-70 group-hover:opacity-100"
                            )} 
                          />
                          
                          <span className={`text-sm font-medium truncate ${smoothHideText}`}>
                            {item.title}
                          </span>

                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-current opacity-60 group-data-[collapsible=icon]:hidden" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* --- FOOTER --- */}
        <SidebarFooter className="border-t border-border/40 mt-auto p-2">
          <SidebarMenu>
            {/* Soporte */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setSupportDialogOpen(true)}
                tooltip="Contactar Soporte"
                className="h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-xl group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0"
              >
                <HelpCircle className="size-7 shrink-0" />
                <span className={`truncate ${smoothHideText}`}>Ayuda y Soporte</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Perfil */}
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-muted/30 transition-colors cursor-default mt-2 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0"
              >
                <Avatar className="h-9 w-9 rounded-lg border border-border/50 bg-background shadow-sm shrink-0">
                  <AvatarImage src={settings?.logoUrl || ""} alt={settings?.shopName} className="object-contain p-1" />
                  <AvatarFallback className="rounded-lg bg-primary/5 text-primary font-bold text-xs">
                    {settings?.shopName?.substring(0, 2).toUpperCase() || "TL"}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`grid flex-1 text-left text-sm leading-tight ${smoothHideText}`}>
                  <span className="truncate font-semibold">{settings?.shopName || "Mi Taller"}</span>
                  <span className="truncate text-xs text-muted-foreground">Técnico Admin</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
      />
    </>
  );
}