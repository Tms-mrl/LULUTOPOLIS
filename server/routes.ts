import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertRepairOrderSchema,
  insertClientSchema,
  insertDeviceSchema,
  insertPaymentSchema,
  insertSettingsSchema,
  insertProductSchema,
  insertExpenseSchema,
  insertDailyCashSchema
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { Resend } from 'resend';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER: CALCULAR FECHA DE CAJA (ARGENTINA + CUTOFF) ---
const getShiftDate = (settings: any): string => {
  const cutoffHour = Number(settings?.dayCutoffHour ?? 0);
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 3); // UTC-3 Argentina
  const currentHourArg = now.getUTCHours();

  if (currentHourArg < cutoffHour) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split("T")[0];
};

export async function registerRoutes(server: Server, app: Express) {
  
  // Inicializamos Resend aquí para evitar errores de inicio
  const resend = new Resend(process.env.RESEND_API_KEY);

  const getUserId = async (req: Request): Promise<string> => {
    const GUEST_ID = "guest-user-no-access";
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return GUEST_ID;

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) return GUEST_ID;
      return user.id;
    } catch (e) {
      console.error("Error crítico validando usuario:", e);
      return GUEST_ID;
    }
  };

  // --- CONFIGURACIÓN MERCADO PAGO ---
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

  // --- SUBSCRIPCIÓN & USUARIO ---
  app.get("/api/user/subscription", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token provided" });
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) return res.status(401).json({ error: "Invalid token" });

      let dbUser = await storage.getUser(user.id);

      if (!dbUser) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        try {
          dbUser = await storage.createUser({
            id: user.id,
            email: user.email,
            trialEndsAt: trialEndsAt,
            subscriptionStatus: "trialing",
            isAutoRenew: true,
            billingInterval: null,
            currentPeriodEnd: null
          });
        } catch (createError) {
          console.error("Error creating user subscription record:", createError);
          dbUser = await storage.getUser(user.id);
          if (!dbUser) {
            return res.status(500).json({ error: "Failed to initialize subscription" });
          }
        }
      }

      res.json({
        subscriptionStatus: dbUser?.subscriptionStatus,
        trialEndsAt: dbUser?.trialEndsAt,
        currentPeriodEnd: dbUser?.currentPeriodEnd,
        billingInterval: dbUser?.billingInterval,
        isAutoRenew: dbUser?.isAutoRenew
      });
    } catch (e) {
      console.error("Subscription check error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // =========================================================
  // 1. CHECKOUT (Genera el Link de Pago)
  // =========================================================
  app.post("/api/checkout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token provided" });

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      const { planId } = req.body;
      let title = "Suscripción Mensual - GSM FIX";
      
      const now = new Date();
      const promoDeadline = new Date("2026-03-18T23:59:59");
      const isPromoActive = now <= promoDeadline;

      let price = isPromoActive ? 25000 : 30000;

      if (planId === 'semi_annual') {
        title = "Suscripción Semestral - GSM FIX";
        price = 160000;
      } else if (planId === 'annual') {
        title = "Suscripción Anual - GSM FIX";
        price = 300000;
      }

      let baseUrl = process.env.CLIENT_URL || process.env.BASE_URL;
      if (!baseUrl) baseUrl = "http://localhost:5173";
      baseUrl = baseUrl.replace(/\/$/, "");

      const webhookUrl = process.env.WEBHOOK_URL;

      const preference = new Preference(mpClient);
      const result = await preference.create({
        body: {
          items: [
            {
              id: planId,
              title: title,
              quantity: 1,
              unit_price: price,
              currency_id: 'ARS',
            },
          ],
          external_reference: user.id,
          metadata: { plan_id: planId },
          back_urls: {
            success: `${baseUrl}/payment-success?planId=${planId}`,
            failure: `${baseUrl}/plan-expired`,
            pending: `${baseUrl}/plan-expired`
          },
          notification_url: webhookUrl ? `${webhookUrl}/api/webhooks/mercadopago` : undefined,
          auto_return: 'approved',
        }
      });

      res.json({ init_point: result.init_point });
    } catch (e: any) { res.status(500).json({ error: "Error creando pago" }); }
  });

  // =========================================================
  // 2. WEBHOOK REAL MERCADO PAGO
  // =========================================================
  app.post("/api/webhooks/mercadopago", async (req, res) => {
    const { type, data, action } = req.body;
    res.status(200).send("OK");

    if (type === "payment" || action === "payment.created") {
      try {
        const id = data?.id || req.body.data?.id;
        const paymentClient = new Payment(mpClient);
        const payment = await paymentClient.get({ id: id });

        if (payment.status === 'approved') {
          const userId = payment.external_reference;
          const planId = payment.metadata?.plan_id || 'monthly';

          if (userId) {
            let monthsToAdd = 1;
            let billingInterval: 'monthly' | 'semi_annual' | 'annual' = 'monthly';

            if (planId === 'annual') { monthsToAdd = 12; billingInterval = 'annual'; }
            else if (planId === 'semi_annual') { monthsToAdd = 6; billingInterval = 'semi_annual'; }

            const user = await storage.getUser(userId);
            if (user) {
              const now = new Date();
              const currentExpiry = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : now;
              const baseDate = currentExpiry > now ? currentExpiry : now;
              baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

              await storage.updateUser(userId, {
                subscriptionStatus: "active",
                billingInterval: billingInterval,
                currentPeriodEnd: baseDate,
                isAutoRenew: true
              });
            }
          }
        }
      } catch (error) { console.error("Error webhook:", error); }
    }
  });

  // SIMULACIÓN (Local)
  app.get("/api/test/simulate-payment/:userId/:planId", async (req, res) => {
    try {
      const { userId, planId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      let months = 1;
      if (planId === "semi_annual") months = 6;
      else if (planId === "annual") months = 12;

      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);

      await storage.updateUser(userId, {
        subscriptionStatus: "active",
        billingInterval: planId as any,
        currentPeriodEnd: newExpiry,
        isAutoRenew: true
      });
      res.json({ success: true, new_expiry: newExpiry });
    } catch (e) { res.status(500).json({ error: "Simulation failed" }); }
  });

  // --- RUTAS DE CLIENTES ---
  app.get("/api/clients", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getClients(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  
  // 👇 AQUÍ ESTÁ LA RUTA REVIVIDA PARA VER UN CLIENTE ESPECÍFICO 👇
  app.get("/api/clients/:id", async (req, res) => { try { const c = await storage.getClient(req.params.id); if (!c) return res.status(404).json({ error: "Not found" }); res.json(c); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // ✅ Restauramos la validación (safeParse) que funcionaba
  app.post("/api/clients", async (req, res) => {
    try {
      const parseResult = insertClientSchema.safeParse(req.body);
      if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });
      const userId = await getUserId(req);
      const newClient = await storage.createClient({ ...parseResult.data, userId: userId, user_id: userId } as any);
      res.status(201).json(newClient);
    } catch (e) { res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.patch("/api/clients/:id", async (req, res) => { try { const u = await storage.updateClient(req.params.id, req.body); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/clients/:id", async (req, res) => { try { const u = await getUserId(req); await storage.deleteClient(req.params.id, u); res.sendStatus(204); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // --- RUTAS DE DISPOSITIVOS ---
  app.get("/api/devices", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getDevices(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  
  // ✅ Mantenemos la ruta QUE ARREGLA LA VISTA en el casillero
  app.get("/api/devices/:clientId", async (req, res) => { 
    try { res.json(await storage.getDevicesByClient(req.params.clientId)); } 
    catch (e) { res.status(500).json({ error: "Error" }); } 
  });
  
  // ✅ Restauramos la validación que guarda perfecto en DB
  app.post("/api/devices", async (req, res) => { 
    try { 
      const p = insertDeviceSchema.safeParse(req.body); 
      if (!p.success) return res.status(400).json({ error: p.error.errors }); 
      const u = await getUserId(req); 
      res.status(201).json(await storage.createDevice({ ...p.data, userId: u, user_id: u } as any)); 
    } catch (e) { res.status(500).json({ error: "Error" }); } 
  });

  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const u = await getUserId(req);
      const updated = await storage.updateDevice(req.params.id, req.body, u);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (e) {
      console.error("Route error updating device:", e);
      res.status(500).json({ error: "Error updating device" });
    }
  });
  
  // --- RUTAS DE ÓRDENES ---
  app.get("/api/orders", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getOrdersWithDetails(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const u = await getUserId(req);
      const { id } = req.params; 
      const order = await storage.getOrderWithDetails(id);
      if (!order || (order.userId !== u && u !== "guest-user-no-access")) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      res.json(order);
    } catch (e) { res.status(500).json({ error: "Error" }); }
  });

  // ✅ Restauramos la validación que guarda perfecto
  app.post("/api/orders", async (req, res) => { 
    try { 
      const p = insertRepairOrderSchema.safeParse(req.body); 
      if (!p.success) return res.status(400).json({ error: p.error.errors }); 
      const u = await getUserId(req); 
      res.status(201).json(await storage.createOrder({ ...p.data, userId: u, user_id: u } as any)); 
    } catch (e) { res.status(500).json({ error: "Error" }); } 
  });
  app.patch("/api/orders/:id", async (req, res) => { try { res.json(await storage.updateOrder(req.params.id, req.body)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // --- RUTAS DE PAGOS ---
  app.get("/api/payments", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getPaymentsWithOrders(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  
  // ✅ Restauramos la validación original de pagos
  app.post("/api/payments", async (req, res) => {
    try {
      const p = insertPaymentSchema.safeParse(req.body);
      if (!p.success) return res.status(400).json({ error: p.error.errors });
      const u = await getUserId(req);
      const paymentData = { amount: p.data.amount, method: p.data.method, notes: p.data.notes, orderId: p.data.orderId || undefined, items: p.data.items || [], userId: u };
      res.status(201).json(await storage.createPayment(paymentData as any));
    } catch (e) { res.status(500).json({ error: "Error interno" }); }
  });

  // --- RUTAS DE GASTOS ---
  app.get("/api/expenses", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getExpenses(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  
  app.post("/api/expenses", async (req, res) => { 
    try { 
      const p = insertExpenseSchema.safeParse(req.body); 
      if (!p.success) return res.status(400).json({ error: p.error.errors }); 
      const u = await getUserId(req); 
      res.status(201).json(await storage.createExpense({ ...p.data, userId: u, user_id: u } as any)); 
    } catch (e) { res.status(500).json({ error: "Error" }); } 
  });

  // --- RUTAS DE CAJA ---
  app.get("/api/cash/today", async (req, res) => {
    try {
      const u = await getUserId(req);
      const settings = await storage.getSettings(u);
      const dateStr = getShiftDate(settings);
      const result = await storage.getDailyCash(u, dateStr);
      res.json({ amount: result ? result.amount : null });
    } catch (e) { res.status(500).json({ error: "Error" }); }
  });

  app.post("/api/cash", async (req, res) => {
    try {
      const u = await getUserId(req);
      const parseResult = insertDailyCashSchema.pick({ amount: true }).safeParse(req.body);
      if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });
      const settings = await storage.getSettings(u);
      const dateStr = getShiftDate(settings);
      res.json(await storage.upsertDailyCash(u, { date: dateStr, amount: parseResult.data.amount }));
    } catch (e) { res.status(500).json({ error: "Error guardando caja" }); }
  });

  // --- OTRAS RUTAS ---
  app.get("/api/stats", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getStats(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json((await storage.getSettings(u)) || {}); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.updateSettings(u, req.body)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/products", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getProducts(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/products", async (req, res) => { try { const u = await getUserId(req); res.status(201).json(await storage.createProduct({ ...req.body, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });
      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const { data, error } = await supabase.storage.from('logos').upload(fileName, file.buffer, { contentType: file.mimetype });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      res.json({ url: publicUrlData.publicUrl });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // =========================================================
  // 📧 RUTA DE SOPORTE (MEJORADA CON RESEND)
  // =========================================================
  app.post("/api/support", async (req, res) => {
    try {
      const { message, imageUrls } = req.body;
      const u = await getUserId(req);

      let userInfo = "Usuario Invitado";
      let userEmail = "No disponible";

      if (u !== "guest-user-no-access") {
        const userRecord = await storage.getUser(u);
        if (userRecord) { userInfo = `Usuario ID: ${u}`; userEmail = userRecord.email || "No disponible"; }
      }

      if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Falta RESEND_API_KEY en el servidor" });

      const { data, error } = await resend.emails.send({
        from: 'Soporte GSM FIX <onboarding@resend.dev>',
        to: process.env.GMAIL_USER || 'gsmfix.ar@gmail.com',
        subject: `Ticket Soporte: ${userEmail}`,
        html: `<h3>Nuevo Ticket</h3><p><strong>Usuario:</strong> ${userInfo}</p><p>${message}</p>`
      });

      if (error) return res.status(400).json({ error });
      res.json({ success: true, data });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/reports/monthly-detail", async (req, res) => {
    try {
      const u = await getUserId(req);
      const { month, year } = req.query;
      const targetMonth = parseInt(month as string) - 1;
      const targetYear = parseInt(year as string);
      const allPayments = await storage.getPaymentsWithOrders(u);
      const monthlyPayments = allPayments.filter(p => { const d = new Date(p.date); return d.getMonth() === targetMonth && d.getFullYear() === targetYear; });
      const allExpenses = await storage.getExpenses(u);
      const monthlyExpenses = allExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === targetMonth && d.getFullYear() === targetYear; });
      const incomeByMethod: Record<string, number> = {};
      let totalIncome = 0;
      monthlyPayments.forEach(p => { const amount = Number(p.amount); incomeByMethod[p.method || "Otros"] = (incomeByMethod[p.method || "Otros"] || 0) + amount; totalIncome += amount; });
      const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      res.json({ totals: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses }, incomeByMethod: Object.entries(incomeByMethod).map(([method, total]) => ({ method, total })) });
    } catch (e) { res.status(500).json({ error: "Error" }); }
  });

  return server;
}