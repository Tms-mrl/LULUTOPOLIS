import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --------------------------------------------------------------------------
// 1. CONSTANTES & ENUMS
// --------------------------------------------------------------------------
export const orderStatuses = ["presupuesto", "recibido", "en_curso", "listo", "entregado"] as const;
export type OrderStatus = typeof orderStatuses[number];

export const paymentMethods = ["efectivo", "tarjeta", "transferencia"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// Nuevos Enums para Suscripción
export const subscriptionStatuses = ['trialing', 'active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

export const billingIntervals = ['monthly', 'semi_annual', 'annual'] as const;
export type BillingInterval = typeof billingIntervals[number];

export const intakeChecklistSchema = z.record(
  z.string(),
  z.enum(["yes", "no"]).nullable().optional()
);

// --------------------------------------------------------------------------
// 2. DEFINICIÓN DE TABLAS (Drizzle)
// --------------------------------------------------------------------------

// CORREGIDO: Ajustado para coincidir con la tabla public.users de Supabase
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Se vincula con auth.users
  email: text("email"),        // Agregamos email
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status").default("trialing"),
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval"),
  isAutoRenew: boolean("is_auto_renew").default(true),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  dni: text("dni").default(""),
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  whoPicksUp: text("who_picks_up").default(""),
  notes: text("notes").default(""),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  clientId: text("client_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  imei: text("imei").default(""),
  serialNumber: text("serial_number").default(""),
  color: text("color").default(""),
  condition: text("condition").default(""),
  lockType: text("lock_type").default(""),
  lockValue: text("lock_value").default(""),
});

export const repairOrders = pgTable("repair_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  clientId: text("client_id").notNull(),
  deviceId: text("device_id").notNull(),
  status: text("status").notNull().default("recibido"),
  problem: text("problem").notNull(),
  diagnosis: text("diagnosis").default(""),
  solution: text("solution").default(""),
  technicianName: text("technician_name").default(""),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }).default("0"),
  finalCost: decimal("final_cost", { precision: 10, scale: 2 }).default("0"),
  estimatedDate: timestamp("estimated_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"),
  priority: text("priority").default("normal"),
  notes: text("notes").default(""),
  intakeChecklist: jsonb("intake_checklist").default({}),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku").default(""),
  category: text("category").default("General"),
  description: text("description").default(""),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
});

export interface PaymentItem {
  type: "product" | "repair" | "other";
  id?: string;
  name: string;
  quantity: number;
  price: number;
}

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  orderId: text("order_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes").default(""),
  items: jsonb("cart_items").$type<PaymentItem[]>(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const dailyCash = pgTable("daily_cash", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  shopName: text("shop_name").notNull().default("Mi Taller"),
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  whatsapp: text("whatsapp").default(""),
  landline: text("landline").default(""),
  logoUrl: text("logo_url").default(""),
  cardSurcharge: decimal("card_surcharge", { precision: 10, scale: 2 }).default("0"),
  transferSurcharge: decimal("transfer_surcharge", { precision: 10, scale: 2 }).default("0"),
  receiptDisclaimer: text("receipt_disclaimer").default("Garantía de 30 días."),
  ticketFooter: text("ticket_footer").default("Gracias por su compra.\nConserve este ticket para garantía."),
  checklistOptions: text("checklist_options").array().default(["¿Carga?", "¿Enciende?", "¿Golpeado?", "¿Mojado?", "¿Abierto previamente?", "¿En garantía?", "¿Micro SD?", "¿Porta SIM?", "¿Tarjeta SIM?"]),
  printFormat: text("print_format").default("a4"),
  dayCutoffHour: integer("day_cutoff_hour").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --------------------------------------------------------------------------
// 3. SCHEMAS & TYPES (ZOD + TS)
// --------------------------------------------------------------------------

// Schema específico para validar datos de suscripción (Útil para API)
export const subscriptionSchema = z.object({
  trialEndsAt: z.string().nullable().optional(),
  subscriptionStatus: z.enum(subscriptionStatuses).default('trialing'),
  currentPeriodEnd: z.string().nullable().optional(),
  billingInterval: z.enum(billingIntervals).nullable().optional(),
  isAutoRenew: z.boolean().default(true),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertClientSchema = createInsertSchema(clients).omit({ userId: true, id: true });
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export const insertDeviceSchema = createInsertSchema(devices).omit({ userId: true, id: true });
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export const insertRepairOrderSchema = createInsertSchema(repairOrders, {
  estimatedCost: z.coerce.number(),
  finalCost: z.coerce.number(),
  estimatedDate: z.coerce.date()
}).omit({ userId: true, id: true });

export type RepairOrder = Omit<typeof repairOrders.$inferSelect, "estimatedCost" | "finalCost"> & {
  estimatedCost: number;
  finalCost: number;
};
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

export const insertProductSchema = createInsertSchema(products, {
  price: z.coerce.number(),
  cost: z.coerce.number(),
  quantity: z.coerce.number(),
}).omit({ userId: true, id: true });

export type Product = Omit<typeof products.$inferSelect, "price" | "cost"> & {
  price: number;
  cost: number;
};
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.coerce.number(),
}).pick({
  orderId: true,
  amount: true,
  method: true,
  notes: true,
  items: true
});
export type Payment = Omit<typeof payments.$inferSelect, "amount"> & {
  amount: number;
};
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),
  amount: z.coerce.number()
}).pick({
  category: true,
  description: true,
  amount: true,
  date: true,
});
export type Expense = Omit<typeof expenses.$inferSelect, "amount"> & {
  amount: number;
};
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export const insertDailyCashSchema = createInsertSchema(dailyCash, {
  amount: z.coerce.number(),
}).pick({
  date: true,
  amount: true,
});
export type DailyCash = Omit<typeof dailyCash.$inferSelect, "amount"> & {
  amount: number;
};
export type InsertDailyCash = z.infer<typeof insertDailyCashSchema>;

export const insertSettingsSchema = createInsertSchema(settings, {
  cardSurcharge: z.coerce.number(),
  transferSurcharge: z.coerce.number(),
  dayCutoffHour: z.coerce.number().min(0).max(23),
}).pick({
  shopName: true,
  address: true,
  phone: true,
  email: true,
  whatsapp: true,
  landline: true,
  logoUrl: true,
  cardSurcharge: true,
  transferSurcharge: true,
  receiptDisclaimer: true,
  ticketFooter: true,
  checklistOptions: true,
  printFormat: true,
  dayCutoffHour: true,
});
export type Settings = Omit<typeof settings.$inferSelect, "cardSurcharge" | "transferSurcharge"> & {
  cardSurcharge: number;
  transferSurcharge: number;
};
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export interface RepairOrderWithDetails extends RepairOrder {
  client: Client;
  device: Device;
  payments?: Payment[];
}