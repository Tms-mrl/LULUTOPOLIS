import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();

// --- CONFIGURACIÓN DE CORS FINAL Y CORREGIDA ---
app.use(cors({
  origin: (origin, callback) => {
    // 1. Permitir peticiones sin origen (como Postman o Server-to-Server)
    if (!origin) return callback(null, true);

    // 2. Permitir Localhost (tu PC en desarrollo)
    if (origin.startsWith("http://localhost")) {
      return callback(null, true);
    }

    // 3. Permitir CUALQUIER dominio de Vercel (para pruebas y previews)
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // 4. 👇 NUEVO: Permitir TU dominio oficial (Producción)
    const allowedDomains = [
      'https://gsm-proyect.com',
      'https://www.gsm-proyect.com'
    ];

    if (allowedDomains.includes(origin)) {
      return callback(null, true);
    }

    // Si no cumple nada de lo anterior, bloqueamos
    console.log(`🚫 Bloqueado por CORS: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// ------------------------------------

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// -----------------------------------------------------------------------
// 🔴 MODIFICACIÓN: AUMENTO DE LÍMITE A 50MB
// -----------------------------------------------------------------------
app.use(
  express.json({
    limit: '50mb', // <--- ESTO PERMITE LOGOS PESADOS EN BASE64
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' })); // <--- TAMBIÉN AQUÍ

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5001", 10);
  const isWindows = process.platform === "win32";

  httpServer.listen(
    isWindows
      ? port
      : {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();