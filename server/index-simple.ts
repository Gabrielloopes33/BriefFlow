#!/usr/bin/env node

import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return (originalResJson as any).apply(res, [bodyJson, ...args]);
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
  // Register routes without auth for now
  try {
    await registerRoutes(httpServer, app);
  } catch (error: any) {
    console.log("Auth setup skipped (development):", error.message);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // ALWAYS serve app on port specified in environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both API and client.
  // It is only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = process.platform === "win32"
    ? { port, host: "0.0.0.0" }
    : { port, host: "0.0.0.0", reusePort: true };

  httpServer.listen(
    listenOptions,
    () => {
      log(`serving on port ${port}`);
      console.log(`\n🚀 Content-Generator está rodando!`);
      console.log(`📱 Frontend: http://localhost:${port}`);
      console.log(`🔌 API: http://localhost:${port}/api`);
      console.log(`📊 Dashboard: http://localhost:${port}`);
    },
  );
})();