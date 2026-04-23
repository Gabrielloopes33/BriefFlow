/**
 * Tests for Dashboard Summary Endpoint
 * Sprint 5 — Story S5-04: Dashboard como Central de Comando
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { registerDashboardRoutes } from "./dashboard";

// Mock pg-pool
const mockQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock("../pg-pool", () => ({
  getClientForUser: vi.fn(async () => ({
    query: mockQuery,
    release: mockRelease,
  })),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  // Mock auth middleware
  app.use((req: any, _res, next) => {
    req.userId = "user-1";
    next();
  });
  registerDashboardRoutes(app);
  return app;
}

describe("dashboard summary endpoint", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CT-S5-04-001: Endpoint retorna resumo correto
  // ─────────────────────────────────────────────
  it("returns dashboard summary with clients, jobs and metrics", async () => {
    const app = createApp();

    // Mock clients query
    mockQuery.mockImplementationOnce(async () => ({
      rows: [
        { id: "client-1", name: "Cliente A", niche: "Tecnologia", last_post_at: "2026-04-20T10:00:00Z", post_count: "5" },
        { id: "client-2", name: "Cliente B", niche: "Saúde", last_post_at: null, post_count: "0" },
      ],
    }));

    // Mock jobs query
    mockQuery.mockImplementationOnce(async () => ({
      rows: [
        { id: "job-1", client_id: "client-1", client_name: "Cliente A", status: "completed", stage: "finalizing", progress: 100, result_post_id: "post-1", created_at: "2026-04-20T10:00:00Z", updated_at: "2026-04-20T10:05:00Z", error: null },
        { id: "job-2", client_id: "client-2", client_name: "Cliente B", status: "processing", stage: "drafting_post", progress: 60, result_post_id: null, created_at: "2026-04-20T09:00:00Z", updated_at: "2026-04-20T09:30:00Z", error: null },
      ],
    }));

    // Mock metrics queries
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "12" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "2" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "1" }] }));

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("x-tenant-id", "tenant-a");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clients: expect.arrayContaining([
        expect.objectContaining({ id: "client-1", name: "Cliente A", post_count: 5 }),
        expect.objectContaining({ id: "client-2", name: "Cliente B", post_count: 0 }),
      ]),
      recent_jobs: expect.arrayContaining([
        expect.objectContaining({ id: "job-1", status: "completed", client_name: "Cliente A" }),
        expect.objectContaining({ id: "job-2", status: "processing", client_name: "Cliente B" }),
      ]),
      metrics: {
        posts_this_month: 12,
        active_clients: 2,
        jobs_in_progress: 1,
      },
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  // ─────────────────────────────────────────────
  // CT-S5-04-002: Isolamento de tenant
  // ─────────────────────────────────────────────
  it("filters data by tenant_id", async () => {
    const app = createApp();

    // 1. clients query
    mockQuery.mockImplementationOnce(async (_sql: string, params: any[]) => {
      expect(params).toContain("tenant-b");
      return { rows: [] };
    });
    // 2. jobs query
    mockQuery.mockImplementationOnce(async (_sql: string, params: any[]) => {
      expect(params).toContain("tenant-b");
      return { rows: [] };
    });
    // 3. posts month count
    mockQuery.mockImplementationOnce(async (_sql: string, params: any[]) => {
      expect(params).toContain("tenant-b");
      return { rows: [{ count: "0" }] };
    });
    // 4. active clients count
    mockQuery.mockImplementationOnce(async (_sql: string, params: any[]) => {
      expect(params).toContain("tenant-b");
      return { rows: [{ count: "0" }] };
    });
    // 5. jobs in progress count
    mockQuery.mockImplementationOnce(async (_sql: string, params: any[]) => {
      expect(params).toContain("tenant-b");
      return { rows: [{ count: "0" }] };
    });

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("x-tenant-id", "tenant-b");

    expect(res.status).toBe(200);
    expect(res.body.clients).toEqual([]);
    expect(res.body.recent_jobs).toEqual([]);
    expect(res.body.metrics).toMatchObject({
      posts_this_month: 0,
      active_clients: 0,
      jobs_in_progress: 0,
    });
  });

  // ─────────────────────────────────────────────
  // CT-S5-04-010: Contadores corretos
  // ─────────────────────────────────────────────
  it("calculates metrics correctly for empty tenant", async () => {
    const app = createApp();

    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("x-tenant-id", "tenant-empty");

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      posts_this_month: 0,
      active_clients: 0,
      jobs_in_progress: 0,
    });
  });

  // ─────────────────────────────────────────────
  // Error handling
  // ─────────────────────────────────────────────
  it("returns 400 when tenant_id is missing", async () => {
    const app = createApp();

    const res = await request(app).get("/api/dashboard/summary");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Missing tenant_id");
  });

  it("returns 500 on database error", async () => {
    const app = createApp();

    mockQuery.mockRejectedValueOnce(new Error("Connection failed"));

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("x-tenant-id", "tenant-a");

    expect(res.status).toBe(500);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  // ─────────────────────────────────────────────
  // Tenant resolution
  // ─────────────────────────────────────────────
  it("accepts tenant_id via query param", async () => {
    const app = createApp();

    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));
    mockQuery.mockImplementationOnce(async () => ({ rows: [{ count: "0" }] }));

    const res = await request(app)
      .get("/api/dashboard/summary?tenant_id=tenant-query");

    expect(res.status).toBe(200);
  });
});
