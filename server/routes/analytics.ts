/**
 * Analytics Routes — Endpoint para sincronização manual de analytics
 * POST /api/analytics/sync/:clientId
 */

import { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import { syncClientAnalytics, isThrottled, getCachedAnalytics } from '../services/meta-sync-worker';
import { getClientForUser } from '../pg-pool';

export function registerAnalyticsRoutes(app: Express, pool: Pool): void {
  app.post('/api/analytics/sync/:clientId', async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId as string;
      const userId = (req as any).user?.id;
      const tenantId = String(
        (req.headers['x-tenant-id'] as string) ||
        (Array.isArray(req.query.tenant_id) ? req.query.tenant_id[0] : req.query.tenant_id as string) ||
        req.body?.tenant_id ||
        ''
      );

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant_id' });
      }
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Busca nome do cliente para o stub
      const pgClient = await getClientForUser(userId);
      let clientName = 'Cliente';
      try {
        const { rows } = await pgClient.query(
          `SELECT name FROM clients WHERE id = $1 AND tenant_id = $2`,
          [clientId, tenantId]
        );
        if (rows[0]) clientName = rows[0].name;
      } finally {
        pgClient.release();
      }

      // Verifica cache válido primeiro (TTL de 24h)
      const cached = await getCachedAnalytics(pool, clientId);
      if (cached) {
        return res.status(200).json({
          success: true,
          cached: true,
          data: {
            clientId: cached.client_id,
            platform: cached.platform,
            period: cached.period,
            fetchedAt: cached.fetched_at,
            expiresAt: cached.expires_at,
            insights: cached.insights,
          },
        });
      }

      // Verifica throttle (1 hora entre syncs manuais)
      const throttled = await isThrottled(pool, clientId);
      if (throttled) {
        return res.status(429).json({
          error: 'Sync throttled. Please wait at least 1 hour between manual syncs.',
          cached: false,
        });
      }

      // Executa sync
      const result = await syncClientAnalytics(pool, clientId, tenantId as string, clientName);

      return res.status(200).json({
        success: true,
        cached: result.cached,
        data: {
          clientId: result.data.client_id,
          platform: result.data.platform,
          period: result.data.period,
          fetchedAt: result.data.fetched_at,
          expiresAt: result.data.expires_at,
          insights: result.data.insights,
        },
      });
    } catch (err: any) {
      console.error('[analytics] Sync error:', err.message);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });
}
