import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

// 🔹 1. DEFINIR LA URL BASE
const BASE_URL = import.meta.env.VITE_API_URL || "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = await getAuthHeaders();

  // 🔹 2. USAR LA URL BASE AQUÍ
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // 🔹 3. USAR LA URL BASE AQUÍ TAMBIÉN
      const path = queryKey.join("/");
      const res = await fetch(`${BASE_URL}${path}`, {
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

// 🔹 CONFIGURACIÓN DE CACHÉ ACTUALIZADA
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),

      // 1. Stale Time (Frescura): 1 Hora
      // Si vuelves a una pantalla antes de 1 hora, NO carga del servidor (instantáneo).
      staleTime: 1000 * 60 * 60,

      // 2. GC Time (Memoria): 1 Hora
      // Mantiene los datos en RAM por 1 hora aunque cambies de pestaña.
      gcTime: 1000 * 60 * 60,

      // 3. Comportamiento
      refetchOnWindowFocus: true, // Verifica cambios al volver a la ventana (seguridad)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});