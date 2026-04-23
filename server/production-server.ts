#!/usr/bin/env node

import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// === IN-MEMORY STORAGE ===
const clients: any[] = [
  {
    id: "1",
    name: "Cliente Exemplo",
    description: "Um cliente de exemplo",
    niche: "Marketing Digital",
    targetAudience: "Empresas B2B",
    createdAt: new Date().toISOString()
  }
];

const sources: any[] = [];
const briefs: any[] = [];
const contents: any[] = [];

// Schemas
const insertClientSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  niche: z.string().optional(),
  targetAudience: z.string().optional(),
});

const insertSourceSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.string().default('blog'),
  isActive: z.boolean().default(true),
});

const insertBriefSchema = z.object({
  clientId: z.string(),
  title: z.string(),
  angle: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  contentType: z.string().optional(),
  suggestedCopy: z.string().optional(),
  status: z.string().default('draft'),
  contentIds: z.array(z.string()).optional(),
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Serve static files from dist/public
const distPath = path.resolve(__dirname, "..", "dist", "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  log(`Serving static files from ${distPath}`);
} else {
  log(`Warning: Build directory not found at ${distPath}`);
}

// Simple health check
app.get("/", (req, res) => {
  // Try to serve index.html first, fallback to API response
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: "Content-Generator API is running!",
      status: "healthy",
      timestamp: new Date().toISOString(),
      note: "Frontend not built - run 'npm run build' first"
    });
  }
});

// API status
app.get("/api/health", (req, res) => {
  res.json({
    service: "Content-Generator API",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Simple mock data
app.get("/api/clients", (req, res) => {
  res.json(clients);
});

// Create client
app.post("/api/clients", (req, res) => {
  try {
    const input = insertClientSchema.parse(req.body);
    const newClient = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString()
    };
    clients.push(newClient);
    res.status(201).json(newClient);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Failed to create client" });
  }
});

// Get client by ID
app.get("/api/clients/:id", (req, res) => {
  const client = clients.find(c => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ message: "Client not found" });
  }
  res.json(client);
});

// Update client
app.put("/api/clients/:id", (req, res) => {
  try {
    const index = clients.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Client not found" });
    }
    const input = insertClientSchema.partial().parse(req.body);
    clients[index] = { ...clients[index], ...input };
    res.json(clients[index]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Failed to update client" });
  }
});

// Delete client
app.delete("/api/clients/:id", (req, res) => {
  const index = clients.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Client not found" });
  }
  clients.splice(index, 1);
  res.status(204).send();
});

// Mock sources endpoint
app.get("/api/clients/:id/sources", (req, res) => {
  const clientSources = sources.filter(s => s.clientId === req.params.id);
  res.json(clientSources);
});

// Create source
app.post("/api/clients/:clientId/sources", (req, res) => {
  try {
    const input = insertSourceSchema.parse({ ...req.body, clientId: req.params.clientId });
    const newSource = {
      id: crypto.randomUUID(),
      ...input,
      lastScrapedAt: null,
      createdAt: new Date().toISOString()
    };
    sources.push(newSource);
    res.status(201).json(newSource);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Failed to create source" });
  }
});

// Delete source
app.delete("/api/sources/:id", (req, res) => {
  const index = sources.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Source not found" });
  }
  sources.splice(index, 1);
  res.status(204).send();
});

// Mock contents endpoint
app.get("/api/clients/:id/contents", (req, res) => {
  const clientContents = contents.filter(c => c.clientId === req.params.id);
  res.json(clientContents);
});

// Mock briefs endpoint
app.get("/api/clients/:id/briefs", (req, res) => {
  const clientBriefs = briefs.filter(b => b.clientId === req.params.id);
  res.json(clientBriefs);
});

// Get brief by ID
app.get("/api/briefs/:id", (req, res) => {
  const brief = briefs.find(b => b.id === req.params.id);
  if (!brief) {
    return res.status(404).json({ message: "Brief not found" });
  }
  res.json(brief);
});

// Create brief
app.post("/api/clients/:clientId/briefs", (req, res) => {
  try {
    const input = insertBriefSchema.parse({ ...req.body, clientId: req.params.clientId });
    const newBrief = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      generatedBy: 'openai'
    };
    briefs.push(newBrief);
    res.status(201).json(newBrief);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Failed to create brief" });
  }
});

// Update brief
app.put("/api/briefs/:id", (req, res) => {
  try {
    const index = briefs.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Brief not found" });
    }
    const input = insertBriefSchema.partial().parse(req.body);
    briefs[index] = { ...briefs[index], ...input };
    res.json(briefs[index]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Failed to update brief" });
  }
});

// Generate brief (AI endpoint)
app.post("/api/clients/:clientId/briefs/generate", (req, res) => {
  try {
    const { topic } = req.body;
    const newBrief = {
      id: crypto.randomUUID(),
      clientId: req.params.clientId,
      title: `Generated Brief: ${topic || "Topic"}`,
      angle: "Comprehensive Guide",
      keyPoints: ["Point 1", "Point 2", "Point 3"],
      suggestedCopy: "Here is a draft copy...",
      status: "draft",
      generatedBy: "openai",
      createdAt: new Date().toISOString()
    };
    briefs.push(newBrief);
    res.status(201).json(newBrief);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate brief" });
  }
});

// Mock auth endpoints
app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/logout", (req, res) => {
  // Clear session cookie
  res.clearCookie("auth");
  res.redirect("/");
});

app.get("/api/login", (req, res) => {
  // Simulate login by setting a simple session cookie
  res.cookie("auth", "demo-session", { 
    httpOnly: true, 
    secure: false, // set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  // Redirect to frontend
  res.redirect("/?login=success");
});

app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/auth/user", (req, res) => {
  // Check for session cookie (try both cookie-parser and headers)
  const hasSession = req.cookies?.auth || req.headers.cookie?.includes('auth=demo-session');
  
  if (!hasSession) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  res.json({
    id: "1",
    firstName: "Demo",
    lastName: "User",
    email: "demo@example.com"
  });
});

app.get("/api/user", (req, res) => {
  res.json({
    id: "1",
    firstName: "Demo",
    lastName: "User",
    email: "demo@example.com"
  });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Internal Server Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({ message });
});

// Start server
const port = parseInt(process.env.PORT || "5004", 10);

httpServer.listen(port, () => {
  log(`Server running on port ${port}`);
  console.log(`\n🚀 Content-Generator está rodando!`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔌 API: http://localhost:${port}/api`);
  console.log(`🏠 Health: http://localhost:${port}/api/health`);
  console.log(`\n✨ Frontend servido do build em production mode!`);
  console.log(`🚀 Perfeito para deploy em VPS!`);
  console.log(`\n📝 Para desenvolvimento com hot-reload:`);
  console.log(`   set NODE_ENV=development && npx tsx server/index.ts`);
});