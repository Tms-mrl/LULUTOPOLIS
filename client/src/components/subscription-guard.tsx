import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ExpiredOverlay } from "@/components/subscription/expired-overlay";
import { supabase } from "@/lib/supabaseClient";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const [checking, setChecking] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsAllowed(true); // Dejar pasar al login
            setChecking(false);
            return;
        }

        // Consultamos tu endpoint LAZY INIT
        const checkSub = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                const res = await fetch("/api/user/subscription", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Lógica de validación
                    if (data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing') {
                        // Verificar fechas si es necesario, pero status suele mandar
                        setIsAllowed(true);
                    } else {
                        // Está expirado
                        setIsAllowed(false);
                    }
                } else {
                    // Si falla el endpoint, por seguridad bloqueamos o dejamos pasar según prefieras.
                    // Asumamos bloqueado para forzar revisión.
                    setIsAllowed(false);
                }
            } catch (e) {
                console.error(e);
                setIsAllowed(false);
            } finally {
                setChecking(false);
            }
        };

        checkSub();
    }, [user, authLoading]);

    if (authLoading || checking) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!isAllowed) {
        return <ExpiredOverlay />;
    }

    return <>{children}</>;
}