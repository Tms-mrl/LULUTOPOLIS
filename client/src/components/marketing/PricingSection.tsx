import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Lock } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BillingPeriod = 'monthly' | 'semester' | 'annual';

interface Plan {
    id: string;
    name: string;
    description: string;
    prices: {
        monthly: string;
        semester: string;
        annual: string;
    };
    features: string[];
    cta: string;
    popular: boolean; // Usamos esto para determinar el estilo visual principal
    isUpcoming?: boolean;
    extraInfo?: string;
    colorTheme: 'emerald' | 'purple';
}

const PricingSection = () => {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

    const plans: Plan[] = [
        {
            id: "standard",
            name: "Estándar",
            description: "Para talleres que necesitan organización total.",
            prices: {
                monthly: "$30.000",
                semester: "$162.000",
                annual: "$288.000",
            },
            features: [
                "Órdenes ilimitadas",
                "Gestión de clientes",
                "Inventario y Stock",
                "Caja y Finanzas",
                "1 Usuario técnico",
                "Soporte"
            ],
            cta: "Comenzar Gratis",
            popular: true, // Este activa el botón verde brillante
            isUpcoming: false,
            colorTheme: 'emerald'
        },
        {
            id: "multisede",
            name: "Multisede",
            description: "La opción ideal para talleres con varias sucursales.",
            prices: {
                monthly: "$30.000",
                semester: "$162.000",
                annual: "$288.000",
            },
            extraInfo: "+ $10.000 por sucursal extra",
            features: [
                "Todo lo del plan Estándar",
                "Múltiples sucursales",
                "Stock independiente",
                "Reportes por sede",
                "Comparaciones entre sucursales",
                "Soporte prioritario"
            ],
            cta: "Próximamente",
            popular: false,
            isUpcoming: true,
            colorTheme: 'purple'
        },
        {
            id: "premium",
            name: "Premium AI",
            description: "Inteligencia Artificial aplicada a tu servicio técnico.",
            prices: {
                monthly: "Próximamente",
                semester: "Próximamente",
                annual: "Próximamente",
            },
            features: [
                "Todo lo del plan Multisede",
                "Chatbot de WhatsApp IA",
                "Respuestas 24/7",
                "Agendamiento automático",
                "Stock de proveedores",
                "Soporte 24/7"
            ],
            cta: "Lista de Espera",
            popular: false,
            isUpcoming: true,
            colorTheme: 'purple'
        }
    ];

    const getPeriodLabel = () => {
        switch (billingPeriod) {
            case 'monthly': return '/mes';
            case 'semester': return '/semestre';
            case 'annual': return '/año';
            default: return '';
        }
    };

    return (
        <section id="pricing" className="py-20 bg-card/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <Badge variant="secondary" className="mb-4 bg-secondary text-foreground border-border">
                        Precios Simples
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                        Elige el plan ideal para tu taller
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Sin costos ocultos. Prueba gratis por 7 días.
                    </p>

                    <div className="relative inline-flex group mt-4">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 via-blue-500/30 to-purple-600/30 rounded-xl blur opacity-20 transition duration-500"></div>
                        <Tabs defaultValue="monthly" className="relative w-full max-w-[500px] mx-auto" onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}>
                            <TabsList className="grid w-full grid-cols-3 bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-1.5 h-auto rounded-xl shadow-lg">
                                <TabsTrigger value="monthly" className="text-sm md:text-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3 hover:text-white transition-colors">Mensual</TabsTrigger>
                                <TabsTrigger value="semester" className="text-sm md:text-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3 hover:text-white transition-colors">Semestral</TabsTrigger>
                                <TabsTrigger value="annual" className="text-sm md:text-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3 hover:text-white transition-colors">Anual</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto items-stretch py-10">
                    {plans.map((plan) => {
                        // Estilos de la tarjeta (Tus luces + Estructura del amigo)
                        let cardStyles = "";
                        if (plan.colorTheme === 'emerald') {
                            cardStyles = "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-500/30 via-card/80 to-card border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20";
                        } else {
                            cardStyles = "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/15 via-card/90 to-card border border-purple-500/50 hover:shadow-purple-500/20";
                        }

                        return (
                            <Card
                                key={plan.id}
                                className={`w-full max-w-sm relative flex flex-col transition-all duration-300 ease-out rounded-xl hover:scale-105 hover:z-10 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] ${cardStyles}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0 text-black px-4 py-1 shadow-md shadow-emerald-500/20 font-bold">
                                            <Star className="w-3 h-3 mr-1 fill-black" />
                                            Más Popular
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader className="text-center pb-4 pt-8">
                                    <CardTitle className="text-2xl font-bold text-foreground">
                                        {plan.name}
                                    </CardTitle>
                                    <CardDescription className="mt-2 min-h-[40px]">
                                        {plan.description}
                                    </CardDescription>

                                    <div className="mt-6 flex flex-col items-center justify-center min-h-[80px]">
                                        <div>
                                            <span className={`text-4xl font-extrabold tracking-tight ${plan.isUpcoming ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {plan.prices[billingPeriod]}
                                            </span>
                                            {!plan.isUpcoming && (
                                                <span className="text-muted-foreground ml-1 font-medium">{getPeriodLabel()}</span>
                                            )}
                                        </div>
                                        {plan.extraInfo && (
                                            <span className="text-purple-400 text-xs font-bold mt-1 uppercase tracking-wider">
                                                {plan.extraInfo}
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col p-6">
                                    <div className="flex-1">
                                        <ul className="space-y-3 mb-8 mt-2">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        <Check className={`w-4 h-4 ${plan.colorTheme === 'emerald' ? 'text-emerald-500' : 'text-purple-500'}`} />
                                                    </div>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* BOTONES CON EL ESTILO DE TU AMIGO */}
                                    {plan.isUpcoming ? (
                                        <Button
                                            disabled
                                            className="w-full text-base py-6 font-bold bg-primary/5 border border-primary/20 text-muted-foreground cursor-not-allowed opacity-70"
                                        >
                                            <Lock className="w-4 h-4 mr-2" /> {plan.cta}
                                        </Button>
                                    ) : (
                                        /* Link de Wouter para la mochila 🎒 */
                                        <Link href={`/register?plan=${plan.id}&period=${billingPeriod}`} className="w-full">
                                            <Button
                                                className={`w-full text-base py-6 font-bold transition-all duration-300 ${plan.popular
                                                    ? 'bg-emerald-500 hover:bg-emerald-600 border-0 text-black shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                                                    : 'bg-primary/5 border border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/40'
                                                    }`}
                                            >
                                                {plan.cta}
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <p className="text-center text-sm text-muted-foreground mt-12 opacity-70">
                    Precios en pesos argentinos. Incluye IVA. Facturación electrónica disponible.
                </p>
            </div>
        </section>
    );
};

export default PricingSection;