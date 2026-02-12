import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter"; // CAMBIO: wouter
import { Smartphone, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; // Para detectar si está logueado

const Header = () => {
    const { user } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);

    // Efecto para oscurecer el header al bajar
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled
                    ? "bg-background/80 backdrop-blur-md border-border/50 py-2 shadow-sm"
                    : "bg-transparent border-transparent py-4"
                }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">

                {/* --- LOGO --- */}
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        {/* Glow sutil */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-full blur opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>

                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-background flex items-center justify-center border border-white/10">

                            <img
                                src="/logo.png"
                                alt="GSM FIX"
                                className="relative z-10 w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                    // Si falla la imagen, la ocultamos para que se vea el icono de fondo
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <span className="text-lg font-bold text-foreground leading-tight block">GSM FIX</span>
                        <span className="hidden sm:block text-[10px] text-muted-foreground tracking-wider uppercase">Sistema de Gestión</span>
                    </div>
                </div>

                {/* --- NAV (Desktop) --- */}
                <nav className="hidden md:flex items-center gap-8">
                    <a
                        href="#features"
                        onClick={(e) => scrollToSection(e, 'features')}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        Funciones
                    </a>
                    {/* El link al Dashboard en el menú solo se muestra si NO estás logueado para mostrar la demo */}
                    {!user && (
                        <a
                            href="#dashboard" // Apunta a la sección de demo interactiva
                            onClick={(e) => scrollToSection(e, 'dashboard')}
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            Demo
                        </a>
                    )}
                    <a
                        href="#pricing"
                        onClick={(e) => scrollToSection(e, 'pricing')}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        Precios
                    </a>
                    <a
                        href="#faq"
                        onClick={(e) => scrollToSection(e, 'faq')}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        FAQ
                    </a>
                </nav>

                {/* --- AUTH BUTTONS (Dinámicos) --- */}
                <div className="flex items-center gap-3">
                    {user ? (
                        // ESTADO: LOGUEADO -> Botón al Dashboard
                        <Link href="/dashboard">
                            <Button className="font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Ir al Dashboard
                            </Button>
                        </Link>
                    ) : (
                        // ESTADO: VISITANTE -> Login / Registro
                        <>
                            <Link href="/login">
                                <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                                    Iniciar Sesión
                                </Button>
                            </Link>
                            <Button className="px-6" asChild>
                                <Link href="/register">
                                    Prueba Gratis
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;