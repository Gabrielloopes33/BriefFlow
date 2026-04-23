/**
 * Tests for Analytics Routes (S6-01)
 * Meta Sync Worker endpoint tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { registerAnalyticsRoutes } from "./analytics";

// Mock meta-sync-worker — factory sem variáveis externas (hoisted)
const mockSyncClientAnalytics = vi.fn();
const mockIsThrottled = vi.fn();
const mockGetCachedAnalytics = vi.fn();

vi.mock("../services/meta-sync-worker", () => ({
  syncClientAnalytics: (...args: any[]) => mockSyncClientAnalytics(...args),
  isThrottled: (...args: any[]) => mockIsThrottled(...args),
  getCachedAnalytics: (...args: any[]) => mockGetCachedAnalytics(...args),
}));

// Mock pg-pool
vi.mock("../pg-pool", () => ({
  getClientForUser: vi.fn(async () => ({
    query: vi.fn().mockResolvedValue({ rows: [{ name: "Acme Corp" }] }),
    release: vi.fn(),
  })),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "user-1" };
    req.userId = "user-1";
    next();
  });
  registerAnalyticsRoutes(app, {} as any);
  return app;
}

describe("POST /api/analytics/sync/:clientId", () => {
  beforeEach(() => {
    mockSyncClientAnalytics.mockReset();
    mockIsThrottled.mockReset();
    mockGetCachedAnalytics.mockReset();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-001: Sync retorna dados estruturados
  // ─────────────────────────────────────────────
  it("syncs analytics and returns structured data", async () => {
    const app = createApp();

    mockGetCachedAnalytics.mockResolvedValue(null);
    mockIsThrottled.mockResolvedValue(false);
    mockSyncClientAnalytics.mockResolvedValue({
      cached: false,
      data: {
        client_id: "client-1",
        platform: "meta",
        period: "30d",
        fetched_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
        insights: { topFormats: ["carrossel", "reels"], avgEngagementRate: 0.045 },
      },
    });

    const res = await request(app)
      .post("/api/analytics/sync/client-1")
      .set("x-tenant-id", "tenant-1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clientId).toBe("client-1");
    expect(res.body.data.insights.topFormats).toContain("carrossel");
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-002: Retorna 400 sem tenant_id
  // ─────────────────────────────────────────────
  it("returns 400 without tenant_id", async () => {
    const app = createApp();
    const res = await request(app).post("/api/analytics/sync/client-1");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("tenant_id");
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-003: Retorna cache quando TTL válido
  // ─────────────────────────────────────────────
  it("returns cached data when TTL is valid", async () => {
    const app = createApp();

    mockGetCachedAnalytics.mockResolvedValue({
      id: "cache-1",
      client_id: "client-1",
      platform: "meta",
      period: "30d",
      fetched_at: new Date(),
      expires_at: new Date(Date.now() + 86400000),
      insights: { topFormats: ["reels"], avgEngagementRate: 0.08 },
    });

    const res = await request(app)
      .post("/api/analytics/sync/client-1")
      .set("x-tenant-id", "tenant-1");

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.data.insights.topFormats).toContain("reels");
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-004: Throttle retorna 429
  // ─────────────────────────────────────────────
  it("returns 429 when throttled", async () => {
    const app = createApp();

    mockGetCachedAnalytics.mockResolvedValue(null);
    mockIsThrottled.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/analytics/sync/client-1")
      .set("x-tenant-id", "tenant-1");

    expect(res.status).toBe(429);
    expect(res.body.error).toContain("throttled");
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-005: Stub data quando Meta não configurado
  // ─────────────────────────────────────────────
  it("uses stub data when Meta API is not configured", async () => {
    const app = createApp();

    mockGetCachedAnalytics.mockResolvedValue(null);
    mockIsThrottled.mockResolvedValue(false);
    mockSyncClientAnalytics.mockResolvedValue({
      cached: false,
      data: {
        client_id: "client-1",
        platform: "meta",
        period: "30d",
        fetched_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
        insights: { topFormats: ["carrossel"], dataSource: "stub" },
      },
    });

    const res = await request(app)
      .post("/api/analytics/sync/client-1")
      .set("x-tenant-id", "tenant-1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.insights).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // CT-S6-01-006: Erro do servidor retorna 500
  // ─────────────────────────────────────────────
  it("returns 500 on sync error", async () => {
    const app = createApp();

    mockGetCachedAnalytics.mockRejectedValue(new Error("Database connection failed"));

    const res = await request(app)
      .post("/api/analytics/sync/client-1")
      .set("x-tenant-id", "tenant-1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
