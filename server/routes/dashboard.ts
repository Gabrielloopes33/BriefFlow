import type { Express } from "express";
import { getClientForUser } from "../pg-pool";

export interface DashboardClient {
  id: string;
  name: string;
  niche: string | null;
  last_post_at: string | null;
  post_count: number;
}

export interface DashboardJob {
  id: string;
  client_id: string;
  client_name: string;
  status: string;
  stage: string;
  progress: number;
  result_post_id: string | null;
  created_at: string;
  updated_at: string;
  error: string | null;
}

export interface DashboardSummary {
  clients: DashboardClient[];
  recent_jobs: DashboardJob[];
  metrics: {
    posts_this_month: number;
    active_clients: number;
    jobs_in_progress: number;
  };
}

export function registerDashboardRoutes(app: Express): void {
  function resolveTenantId(req: any): string | null {
    const headerTenant = req.headers?.["x-tenant-id"];
    const queryTenant = req.query?.tenant_id;
    const bodyTenant = req.body?.tenant_id;
    const tenantId = headerTenant || queryTenant || bodyTenant;
    return typeof tenantId === "string" && tenantId.trim().length > 0 ? tenantId : null;
  }

  function requireTenantId(req: any, res: any): string | null {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ message: "Missing tenant_id. Send x-tenant-id header or tenant_id param." });
      return null;
    }
    return tenantId;
  }

  app.get("/api/dashboard/summary", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const pgClient = await getClientForUser(req.userId);
    try {
      // Month boundaries for counters
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartIso = monthStart.toISOString();

      // 1. Clients with last_post_at and post_count
      const { rows: clientRows } = await pgClient.query(
        `SELECT 
          c.id,
          c.name,
          c.niche,
          MAX(p.created_at) as last_post_at,
          COUNT(p.id) as post_count
        FROM clients c
        LEFT JOIN posts p ON p.client_id = c.id AND p.tenant_id = c.tenant_id
        WHERE c.tenant_id = $1
        GROUP BY c.id, c.name, c.niche
        ORDER BY last_post_at DESC NULLS LAST, c.created_at DESC`,
        [tenantId]
      );

      const clients: DashboardClient[] = clientRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        niche: r.niche,
        last_post_at: r.last_post_at,
        post_count: parseInt(r.post_count, 10),
      }));

      // 2. Recent jobs (last 10) with client name
      const { rows: jobRows } = await pgClient.query(
        `SELECT 
          j.id,
          j.client_id,
          c.name as client_name,
          j.status,
          j.stage,
          j.progress,
          j.result_post_id,
          j.created_at,
          j.updated_at,
          j.error
        FROM jobs j
        JOIN clients c ON c.id = j.client_id AND c.tenant_id = j.tenant_id
        WHERE j.tenant_id = $1
        ORDER BY j.created_at DESC
        LIMIT 10`,
        [tenantId]
      );

      const recentJobs: DashboardJob[] = jobRows.map((r: any) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.client_name,
        status: r.status,
        stage: r.stage,
        progress: r.progress,
        result_post_id: r.result_post_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        error: r.error,
      }));

      // 3. Metrics counters
      const { rows: postsMonthRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM posts WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, monthStartIso]
      );

      const { rows: activeClientsRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1`,
        [tenantId]
      );

      const { rows: jobsInProgressRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM jobs WHERE tenant_id = $1 AND status = 'processing'`,
        [tenantId]
      );

      const summary: DashboardSummary = {
        clients,
        recent_jobs: recentJobs,
        metrics: {
          posts_this_month: parseInt(postsMonthRows[0].count, 10),
          active_clients: parseInt(activeClientsRows[0].count, 10),
          jobs_in_progress: parseInt(jobsInProgressRows[0].count, 10),
        },
      };

      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: error.message || "Failed to fetch dashboard summary" });
    } finally {
      pgClient.release();
    }
  });
}
