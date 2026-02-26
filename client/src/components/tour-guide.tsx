import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation } from 'wouter';

export function TourGuide() {
  const [location] = useLocation();

  useEffect(() => {
    if (location !== "/dashboard") return;

    const hasSeenTour = localStorage.getItem('gsm_tour_completed');

    if (!hasSeenTour) {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: '¡Crear Orden! 🛠️', // <-- CAMBIA ESTO
        nextBtnText: 'Siguiente ➔',    // <-- CAMBIA ESTO
        prevBtnText: '⬅',              // <-- CAMBIA ESTO
        popoverClass: 'driverjs-theme', // 👈 ESTO APLICA EL DISEÑO OSCURO QUE PEGAMOS EN EL CSS
        onDestroyed: () => {
          localStorage.setItem('gsm_tour_completed', 'true');
        },
        steps: [
          {
            popover: {
              title: '¡Bienvenido a tu Nuevo Taller! 🚀', // <-- TÍTULO
              description: 'Aquí puedes poner tu propio mensaje de bienvenida para explicarle al usuario de qué trata esto.', // <-- DESCRIPCIÓN
              side: "over",
              align: 'center'
            }
          },
          {
            element: 'a[href="/dashboard"]',
            popover: {
              title: '📊 Panel de Control',
              description: 'Explica aquí para qué sirve el Dashboard a tu manera.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'a[href="/ordenes"]',
            popover: {
              title: '📱 Órdenes',
              description: 'Explica aquí cómo usar las órdenes de reparación.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'a[href="/clientes"]',
            popover: {
              title: '👥 Clientes',
              description: 'Escribe aquí tu explicación sobre la libreta de clientes.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'a[href="/cobros"]',
            popover: {
              title: '💰 Cobros y Caja',
              description: 'Explica aquí cómo funciona el registro de pagos.',
              side: "right",
              align: 'start'
            }
          },

          {
            element: 'a[href="/reportes"]',
            popover: {
              title: '📈 Reportes',
              description: 'Analiza el rendimiento de tu negocio, ingresos, gastos y métricas clave a fin de mes.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'a[href="/inventory"]',
            popover: {
              title: '📦 Stock',
              description: 'Explica cómo llevar el control del inventario de repuestos.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'a[href="/configuracion"]',
            popover: {
              title: '⚙️ Configuración',
              description: 'Explica que aquí pueden ajustar su logo, legalidades y suscripción.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: '#tour-new-order',
            popover: {
              title: '¡Manos a la obra! 🎉',
              description: 'Pídele al usuario que presione este botón para probar crear su primera orden.',
              side: "bottom",
              align: 'end'
            }
          }
        ]
      });

      setTimeout(() => {
        driverObj.drive();
      }, 800);
    }
  }, [location]);

  return null;
}