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
import nodemailer from "nodemailer";
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

      // Definir Precios y Plan
      const { planId } = req.body;
      let title = "Suscripción Mensual - GSM FIX";
      let price = 30000;

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

      console.log(`🚀 Creando pago MP | Plan: ${planId} | Precio: ${price} | User: ${user.email}`);

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
          metadata: {
            plan_id: planId
          },
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
    } catch (e: any) {
      console.error("❌ Error creando preferencia MP:", e);
      res.status(500).json({ error: "Error creando pago: " + (e.message || "Unknown error") });
    }
  });

  // =========================================================
  // 2. WEBHOOK REAL (Recibe el aviso y activa el plan)
  // =========================================================
  app.post("/api/webhooks/mercadopago", async (req, res) => {
    const { type, data } = req.body;
    const action = req.body.action;

    // Responder rápido a MP para que deje de enviar la notificación
    res.status(200).send("OK");

    if (type === "payment" || action === "payment.created") {
      try {
        const id = data?.id || req.body.data?.id;
        console.log("🔔 Webhook recibido! ID Pago:", id);

        const paymentClient = new Payment(mpClient);
        const payment = await paymentClient.get({ id: id });

        if (payment.status === 'approved') {
          console.log(`✅ Pago aprobado de: ${payment.payer?.email}`);

          const userId = payment.external_reference;

          // 👇 MAGIA: Leemos el plan directamente de la metadata
          // Si por alguna razón no viene, asumimos 'monthly'
          const planId = payment.metadata?.plan_id || 'monthly';

          console.log(`📦 Plan detectado por Metadata: ${planId}`);

          if (userId) {
            let monthsToAdd = 1;
            let billingInterval: 'monthly' | 'semi_annual' | 'annual' = 'monthly';

            // Lógica exacta basada en el ID, no en el precio
            if (planId === 'annual') {
              monthsToAdd = 12;
              billingInterval = 'annual';
            } else if (planId === 'semi_annual') {
              monthsToAdd = 6;
              billingInterval = 'semi_annual';
            }

            // Actualizar DB
            const user = await storage.getUser(userId);
            if (user) {
              // Calcular fecha de vencimiento
              const now = new Date();
              const currentExpiry = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : now;

              // Si la suscripción ya venció (fecha pasada), empezamos a contar desde HOY.
              // Si sigue vigente (fecha futura), sumamos a la fecha futura.
              const baseDate = currentExpiry > now ? currentExpiry : now;

              // Sumar los meses correspondientes
              baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

              await storage.updateUser(userId, {
                subscriptionStatus: "active",
                billingInterval: billingInterval,
                currentPeriodEnd: baseDate,
                isAutoRenew: true
              });
              console.log(`🎉 Usuario ${userId} renovado (${monthsToAdd} meses) hasta ${baseDate.toISOString()}`);
            }
          }
        }
      } catch (error) {
        console.error("Error procesando webhook:", error);
      }
    }
  });

  // =========================================================
  // 3. SIMULACIÓN (Para Localhost)
  // =========================================================
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
    } catch (e) {
      res.status(500).json({ error: "Simulation failed" });
    }
  });

  // --- RUTAS ESTÁNDAR (CLIENTES, ORDENES, ETC.) ---
  app.get("/api/clients", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getClients(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/clients/:id", async (req, res) => { const c = await storage.getClient(req.params.id); if (!c) return res.status(404).json({ error: "Not found" }); res.json(c); });
  app.post("/api/clients", async (req, res) => {
    try {
      const parseResult = insertClientSchema.safeParse(req.body);
      if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });
      const userId = await getUserId(req);
      const newClient = await storage.createClient({ ...parseResult.data, userId: userId, user_id: userId } as any);
      res.status(201).json(newClient);
    } catch (e) { res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.patch("/api/clients/:id", async (req, res) => { try { const u = await storage.updateClient(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const u = await getUserId(req);
      await storage.deleteClient(req.params.id, u);
      res.sendStatus(204);
    } catch (e) {
      console.error("Error deleting client:", e);
      res.status(500).json({ error: "Error deleting client" });
    }
  });

  // --- DEVICES ---
  app.get("/api/devices", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getDevices(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/devices/:clientId", async (req, res) => { try { res.json(await storage.getDevicesByClient(req.params.clientId)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/devices", async (req, res) => { try { const p = insertDeviceSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createDevice({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

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

  app.get("/api/orders", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getOrdersWithDetails(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/recent", async (req, res) => { try { const u = await getUserId(req); const o = await storage.getOrdersWithDetails(u); res.json(o.slice(0, 5)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/:id", async (req, res) => { try { const o = await storage.getOrderWithDetails(req.params.id); if (!o) return res.status(404).json({ error: "Not found" }); res.json(o); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/orders", async (req, res) => { try { const p = insertRepairOrderSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createOrder({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/orders/:id", async (req, res) => { try { const u = await storage.updateOrder(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const u = await getUserId(req);
      await storage.deleteOrder(req.params.id, u);
      res.sendStatus(204);
    } catch (e) {
      console.error("Error deleting order:", e);
      res.status(500).json({ error: "Error deleting order" });
    }
  });

  app.get("/api/payments", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getPaymentsWithOrders(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/payments", async (req, res) => {
    try {
      const p = insertPaymentSchema.safeParse(req.body);
      if (!p.success) return res.status(400).json({ error: p.error.errors });
      const u = await getUserId(req);
      const paymentData = { amount: p.data.amount, method: p.data.method, notes: p.data.notes, orderId: p.data.orderId || undefined, items: p.data.items || [], userId: u };
      const result = await storage.createPayment(paymentData as any);
      res.status(201).json(result);
    } catch (e) { res.status(500).json({ error: "Error interno" }); }
  });
  app.delete("/api/payments/:id", async (req, res) => {
    try {
      await storage.deletePayment(req.params.id);
      res.sendStatus(204);
    } catch (e) {
      res.status(500).json({ error: "Error deleting payment" });
    }
  });

  app.get("/api/expenses", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getExpenses(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/expenses", async (req, res) => { try { const p = insertExpenseSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createExpense({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.sendStatus(204);
    } catch (e) {
      res.status(500).json({ error: "Error deleting expense" });
    }
  });

  app.get("/api/cash/today", async (req, res) => {
    try {
      const u = await getUserId(req);
      const settings = await storage.getSettings(u);
      const dateStr = getShiftDate(settings);
      const result = await storage.getDailyCash(u, dateStr);
      res.json({ amount: result ? result.amount : null });
    } catch (e) {
      console.error("Error obteniendo caja:", e);
      res.status(500).json({ error: "Error obteniendo caja inicial" });
    }
  });

  app.post("/api/cash", async (req, res) => {
    try {
      const u = await getUserId(req);
      const parseResult = insertDailyCashSchema.pick({ amount: true }).safeParse(req.body);
      if (!parseResult.success) { return res.status(400).json({ error: parseResult.error.errors }); }
      const settings = await storage.getSettings(u);
      const dateStr = getShiftDate(settings);
      const result = await storage.upsertDailyCash(u, { date: dateStr, amount: parseResult.data.amount });
      res.json(result);
    } catch (e) {
      console.error("Error guardando caja:", e);
      res.status(500).json({ error: "Error guardando caja" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const userId = await getUserId(req);
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (e) {
      console.error("Error en stats:", e);
      res.status(500).json({ error: "Error calculando estadísticas" });
    }
  });

  app.get("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json((await storage.getSettings(u)) || {}); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/settings", async (req, res) => { try { const p = insertSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.json(await storage.updateSettings(u, p.data)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/products", async (req, res) => { try { const u = await getUserId(req); const products = await storage.getProducts(u); res.json(products); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/products", async (req, res) => { try { const p = insertProductSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createProduct({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/products/:id", async (req, res) => { try { const u = await storage.updateProduct(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/products/:id", async (req, res) => { try { const u = await getUserId(req); await storage.deleteProduct(req.params.id, u); res.sendStatus(204); } catch (e) { res.status(500).json({ error: "Error deleting product" }); } });

  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No se subió ningún archivo" });
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { data, error } = await supabase.storage.from('logos').upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) { console.error("Error de Supabase Storage:", error); throw new Error("No se pudo guardar en el storage: " + error.message); }
      const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      res.json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
      console.error("Error en upload:", error);
      res.status(500).json({ message: "Error al procesar la imagen: " + error.message });
    }
  });

  app.post("/api/support", async (req, res) => {
    try {
      const { message, imageUrls } = req.body;
      const u = await getUserId(req);

      let userInfo = "Usuario Invitado / No logueado";
      let userEmail = "No disponible";

      if (u !== "guest-user-no-access") {
        // 👇 MAGIA NUEVA: Buscamos los datos reales del usuario en la DB
        const userRecord = await storage.getUser(u);
        if (userRecord) {
          userInfo = `Usuario Registrado (ID: ${u})`;
          userEmail = userRecord.email || "No disponible";
        } else {
          userInfo = `Usuario ID: ${u} (No encontrado en DB)`;
        }
      }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        return res.status(500).json({ error: "Configuration Error: Missing Email Credentials" });
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        // 👇 AGREGAMOS EL EMAIL AL ASUNTO PARA QUE LO VEAS RÁPIDO
        subject: `Soporte: ${userEmail} - ${userInfo}`,
        // 👇 AGREGAMOS EL EMAIL AL CUERPO DEL CORREO Y UN LINK MAILTO
        html: `
          <h3>Nuevo Ticket de Soporte</h3>
          <p><strong>Usuario:</strong> ${userInfo}</p>
          <p><strong>Email de Contacto:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
          <hr/>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space: pre-wrap; background-color: #f4f4f4; padding: 10px; border-radius: 5px;">${message}</p>
          ${imageUrls && imageUrls.length > 0
            ? `<hr/><p><strong>Imágenes Adjuntas:</strong></p><ul>${imageUrls.map((url: string) => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
            : ''}
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });

    } catch (e: any) {
      console.error("Nodemailer error:", e);
      res.status(500).json({ error: "Error sending email: " + e.message });
    }
  });

  app.get("/api/reports/monthly-detail", async (req, res) => {
    try {
      const u = await getUserId(req);
      const { month, year } = req.query;
      if (!month || !year) { return res.status(400).json({ error: "Month and year are required" }); }
      const targetMonth = parseInt(month as string) - 1;
      const targetYear = parseInt(year as string);
      const allPayments = await storage.getPaymentsWithOrders(u);
      const monthlyPayments = allPayments.filter(p => { const d = new Date(p.date); return d.getMonth() === targetMonth && d.getFullYear() === targetYear; });
      const allExpenses = await storage.getExpenses(u);
      const monthlyExpenses = allExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === targetMonth && d.getFullYear() === targetYear; });
      const incomeByMethod: Record<string, number> = {};
      let totalIncome = 0;
      monthlyPayments.forEach(p => { const amount = Number(p.amount); const method = p.method || "Otros"; incomeByMethod[method] = (incomeByMethod[method] || 0) + amount; totalIncome += amount; });
      const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0);
      res.json({ period: { month: targetMonth + 1, year: targetYear, startDate: startDate.toISOString(), endDate: endDate.toISOString() }, incomeByMethod: Object.entries(incomeByMethod).map(([method, total]) => ({ method, total })), totals: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses } });
    } catch (e) { console.error("Error generando reporte mensual detallado:", e); res.status(500).json({ error: "Error interno al generar el reporte" }); }
  });

  return server;
}