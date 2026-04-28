import type { Express } from "express";
import type { Server } from "http";
import { pool, getClientForUser } from "./pg-pool";
import { startPostWorker } from "./services/post-worker";
import { CrawlerClient } from "./services/crawler-client";
import { createLLMClient, getDefaultModel } from "./services/llm-provider";
import {
  generateCaptionFromSlides,
  generateSlideImage,
  generateSlidesCopy,
  generateSlidesWithAgents,
  refineSlideCopy,
} from "./services/creative-ai";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { broadcastJobEvent } from "./websocket/job-broadcaster";
import { buildSlideFromTemplate } from "./slide-templates";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const STATUS_TRANSITIONS: Record<string, string[]> = {
    draft: ["ready_review"],
    ready_review: ["approved", "draft"],
    approved: ["published", "ready_review"],
    rejected: ["draft"],
    published: [],
  };

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

  // Clients - Protected Routes
  app.get("/api/clients", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM clients WHERE tenant_id = $1 ORDER BY created_at DESC`,
          [tenantId]
        );
        res.json(rows);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM clients WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
        res.json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching client:', error);
      res.status(500).json({ message: 'Failed to fetch client' });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, niche, target_audience } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `INSERT INTO clients (tenant_id, user_id, name, description, niche, target_audience)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tenantId, req.userId, name, description, niche, target_audience]
        );
        res.status(201).json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error creating client:', error);
      res.status(500).json({ message: error.message || 'Failed to create client' });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, niche, target_audience, tone_of_voice, content_pillars, forbidden_words, website, preferred_format, example_posts } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        // Build dynamic UPDATE clause
        const setClauses: string[] = [];
        const params: any[] = [];

        if (name !== undefined) {
          params.push(name);
          setClauses.push(`name=$${params.length}`);
        }
        if (description !== undefined) {
          params.push(description);
          setClauses.push(`description=$${params.length}`);
        }
        if (niche !== undefined) {
          params.push(niche);
          setClauses.push(`niche=$${params.length}`);
        }
        if (target_audience !== undefined) {
          params.push(target_audience);
          setClauses.push(`target_audience=$${params.length}`);
        }
        if (tone_of_voice !== undefined) {
          params.push(tone_of_voice ?? null);
          setClauses.push(`tone_of_voice=$${params.length}`);
        }
        if (content_pillars !== undefined) {
          params.push(content_pillars ?? []);
          setClauses.push(`content_pillars=$${params.length}`);
        }
        if (forbidden_words !== undefined) {
          params.push(forbidden_words ?? []);
          setClauses.push(`forbidden_words=$${params.length}`);
        }
        if (website !== undefined) {
          params.push(website ?? null);
          setClauses.push(`website=$${params.length}`);
        }
        if (preferred_format !== undefined) {
          params.push(preferred_format ?? null);
          setClauses.push(`preferred_format=$${params.length}`);
        }
        if (example_posts !== undefined) {
          params.push(example_posts ? JSON.stringify(example_posts) : '[]');
          setClauses.push(`example_posts=$${params.length}`);
        }

        setClauses.push('updated_at=now()');

        if (setClauses.length === 1 && Object.keys(req.body).length === 0) {
          // Empty body, just return the current client
          const { rows } = await client.query(
            `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2`,
            [req.params.id, tenantId]
          );
          if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
          return res.json(rows[0]);
        }

        // Add WHERE parameters
        params.push(req.params.id);
        params.push(tenantId);

        const { rows } = await client.query(
          `UPDATE clients SET ${setClauses.join(', ')}
           WHERE id=$${params.length - 1} AND tenant_id=$${params.length} RETURNING *`,
          params
        );
        if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
        res.json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error updating client:', error);
      res.status(500).json({ message: error.message || 'Failed to update client' });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const client = await getClientForUser(req.userId);
      try {
        await client.query(
          `DELETE FROM clients WHERE id=$1 AND tenant_id=$2`,
          [req.params.id, tenantId]
        );
        res.status(204).send();
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: error.message || 'Failed to delete client' });
    }
  });

  // Sources
  app.get("/api/clients/:clientId/sources", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM sources WHERE client_id=$1 AND tenant_id=$2 ORDER BY created_at DESC`,
          [req.params.clientId, tenantId]
        );
        res.json(rows);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching sources:', error);
      res.status(500).json({ message: 'Failed to fetch sources' });
    }
  });

  app.post("/api/clients/:clientId/sources", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, url, type } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `INSERT INTO sources (tenant_id, user_id, client_id, name, url, type, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
          [tenantId, req.userId, req.params.clientId, name, url, type || 'blog']
        );
        res.status(201).json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error creating source:', error);
      res.status(500).json({ message: error.message || 'Failed to create source' });
    }
  });

  app.delete("/api/sources/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const client = await getClientForUser(req.userId);
      try {
        await client.query(
          `DELETE FROM sources WHERE id=$1 AND tenant_id=$2`,
          [req.params.id, tenantId]
        );
        res.status(204).send();
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error deleting source:', error);
      res.status(500).json({ message: error.message || 'Failed to delete source' });
    }
  });

  // Contents
  app.get("/api/clients/:id/contents", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM contents WHERE client_id=$1 AND tenant_id=$2 ORDER BY scraped_at DESC`,
          [req.params.id, tenantId]
        );
        res.json(rows);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching contents:', error);
      res.status(500).json({ message: 'Failed to fetch contents' });
    }
  });

  // Briefs
  app.get("/api/clients/:id/briefs", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM briefs WHERE client_id=$1 AND tenant_id=$2 ORDER BY created_at DESC`,
          [req.params.id, tenantId]
        );
        res.json(rows);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching briefs:', error);
      res.status(500).json({ message: 'Failed to fetch briefs' });
    }
  });

  app.get("/api/briefs/:id", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM briefs WHERE id=$1 AND tenant_id=$2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Brief not found' });
        res.json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching brief:', error);
      res.status(500).json({ message: 'Failed to fetch brief' });
    }
  });

  app.post("/api/clients/:clientId/briefs", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { title, angle, key_points, content_type, suggested_copy, status } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `INSERT INTO briefs (tenant_id, user_id, client_id, title, angle, key_points, content_type, suggested_copy, status, generated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual') RETURNING *`,
          [tenantId, req.userId, req.params.clientId, title, angle, key_points, content_type, suggested_copy, status || 'draft']
        );
        res.status(201).json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error creating brief:', error);
      res.status(500).json({ message: error.message || 'Failed to create brief' });
    }
  });

  app.put("/api/briefs/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { title, angle, key_points, content_type, suggested_copy, status } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `UPDATE briefs SET title=$1, angle=$2, key_points=$3, content_type=$4,
           suggested_copy=$5, status=$6, updated_at=now()
           WHERE id=$7 AND tenant_id=$8 RETURNING *`,
          [title, angle, key_points, content_type, suggested_copy, status, req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Brief not found' });
        res.json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error updating brief:', error);
      res.status(500).json({ message: error.message || 'Failed to update brief' });
    }
  });

  // AI Generation
  app.post("/api/clients/:clientId/briefs/generate", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { clientId } = req.params;
    const { topic } = req.body;

    try {
      const llm = createLLMClient();
      const result = await llm.chatCompletion({
        model: getDefaultModel(),
        max_tokens: 1024,
        messages: [{ role: "user", content: `Generate a content brief for a marketing article about ${topic || "industry trends"}. Return JSON with fields: title, angle, keyPoints (array of strings), suggestedCopy.` }],
      });

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `INSERT INTO briefs (tenant_id, user_id, client_id, title, angle, key_points, content_type, suggested_copy, status, generated_by)
           VALUES ($1,$2,$3,$4,$5,$6,'article',$7,'draft',$8) RETURNING *`,
          [tenantId, req.userId, clientId, `Generated Brief: ${topic || "Topic"}`, "Comprehensive Guide", JSON.stringify(["Point 1", "Point 2", "Point 3"]), result.content, result.provider]
        );
        res.status(201).json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("AI Gen Error:", error);
      res.status(500).json({ message: error.message || "Failed to generate brief" });
    }
  });

  // Knowledge Items
  app.get("/api/clients/:clientId/knowledge", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    try {
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `SELECT * FROM knowledge_items WHERE client_id=$1 AND tenant_id=$2 ORDER BY created_at DESC`,
          [req.params.clientId, tenantId]
        );
        res.json(rows);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error fetching knowledge items:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge items' });
    }
  });

  app.post("/api/clients/:clientId/knowledge", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { title, content, type, source_url } = req.body;
      const client = await getClientForUser(req.userId);
      try {
        const { rows } = await client.query(
          `INSERT INTO knowledge_items (tenant_id, user_id, client_id, title, content, type, source_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [tenantId, req.userId, req.params.clientId, title, content, type, source_url]
        );
        res.status(201).json(rows[0]);
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error creating knowledge item:', error);
      res.status(500).json({ message: error.message || 'Failed to create knowledge item' });
    }
  });

  app.delete("/api/knowledge/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const client = await getClientForUser(req.userId);
      try {
        await client.query(
          `DELETE FROM knowledge_items WHERE id=$1 AND tenant_id=$2`,
          [req.params.id, tenantId]
        );
        res.status(204).send();
      } finally { client.release(); }
    } catch (error: any) {
      console.error('Error deleting knowledge item:', error);
      res.status(500).json({ message: error.message || 'Failed to delete knowledge item' });
    }
  });

  // ===== ANALYTICS - MULTI-ACCOUNT OAUTH SYSTEM =====

  async function refreshMetaToken(refreshToken: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const res = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`);
    return await res.json();
  }

  async function refreshGoogleToken(refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });
    return await res.json();
  }

  async function getValidToken(userId: string, tenantId: string, platform: string, accountId: string): Promise<string> {
    const pgClient = await getClientForUser(userId);
    try {
      const { rows } = await pgClient.query(
        `SELECT * FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform=$3 AND account_id=$4 AND is_active=true LIMIT 1`,
        [userId, tenantId, platform, accountId]
      );
      const tokenData = rows[0];
      if (!tokenData) throw new Error('Token not found');

      const expiresAt = new Date(tokenData.expires_at);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt <= fiveMinutesFromNow && tokenData.refresh_token) {
        const refreshResult = platform === 'meta'
          ? await refreshMetaToken(tokenData.refresh_token)
          : await refreshGoogleToken(tokenData.refresh_token);

        if (refreshResult.error) throw new Error(refreshResult.error.message || 'Token refresh failed');

        const newExpiresAt = refreshResult.expires_in
          ? new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString();

        await pgClient.query(
          `UPDATE analytics_tokens SET access_token=$1, expires_at=$2, updated_at=now() WHERE id=$3`,
          [refreshResult.access_token, newExpiresAt, tokenData.id]
        );
        return refreshResult.access_token;
      }
      return tokenData.access_token;
    } finally {
      pgClient.release();
    }
  }

  // Meta OAuth - Redirect to Facebook OAuth dialog
  app.get("/api/auth/meta", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const appId = process.env.META_APP_ID;
    const redirectUri = `${process.env.APP_URL}/api/auth/meta/callback`;
    const scope = 'pages_read_engagement,pages_read_user_content,ads_read,read_insights';

    if (!appId) return res.status(500).json({ message: 'META_APP_ID not configured' });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(`${req.userId}|${tenantId}`)}`;
    res.redirect(authUrl);
  });

  // Meta OAuth Callback - Multi-Account Support
  app.get("/api/auth/meta/callback", async (req, res) => {
    const { code, state } = req.query;
    const [userId, tenantId] = String(state || "").split("|");
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.APP_URL}/api/auth/meta/callback`;

    if (!code || !userId || !tenantId) {
      return res.status(400).json({ message: 'Missing code, user or tenant' });
    }

    try {
      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error.message);

      const longLivedRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`);
      const longLivedData = await longLivedRes.json();
      const accessToken = longLivedData.access_token || tokenData.access_token;
      const expiresIn = longLivedData.expires_in || tokenData.expires_in;

      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token`);
      const pagesData = await pagesRes.json();

      const adAccountsRes = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name`);
      const adAccountsData = await adAccountsRes.json();

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

      const pgClient = await getClientForUser(userId);
      try {
        const upsertToken = async (row: Record<string, any>) => {
          await pgClient.query(
            `INSERT INTO analytics_tokens (tenant_id, user_id, platform, account_id, account_name, account_type, access_token, refresh_token, expires_at, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
             ON CONFLICT (user_id, platform, account_id) DO UPDATE SET
               access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
               expires_at=EXCLUDED.expires_at, is_active=true, updated_at=now()`,
            [row.tenant_id, row.user_id, row.platform, row.account_id, row.account_name, row.account_type, row.access_token, row.refresh_token, row.expires_at]
          );
        };

        if (pagesData.data?.length > 0) {
          for (const page of pagesData.data) {
            await upsertToken({ tenant_id: tenantId, user_id: userId, platform: 'meta', account_id: page.id, account_name: page.name, account_type: 'page', access_token: page.access_token, refresh_token: accessToken, expires_at: expiresAt });
          }
        }
        if (adAccountsData.data?.length > 0) {
          for (const account of adAccountsData.data) {
            await upsertToken({ tenant_id: tenantId, user_id: userId, platform: 'meta', account_id: account.id, account_name: account.name || 'Ad Account', account_type: 'ad_account', access_token: accessToken, refresh_token: accessToken, expires_at: expiresAt });
          }
        }

        const { rows: selected } = await pgClient.query(
          `SELECT id FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform='meta' AND is_selected=true LIMIT 1`,
          [userId, tenantId]
        );
        if (!selected[0] && pagesData.data?.length > 0) {
          await pgClient.query(
            `UPDATE analytics_tokens SET is_selected=true WHERE user_id=$1 AND tenant_id=$2 AND platform='meta' AND account_id=$3`,
            [userId, tenantId, pagesData.data[0].id]
          );
        }
      } finally { pgClient.release(); }

      res.redirect('/analytics?meta=connected&accounts=' + ((pagesData.data?.length || 0) + (adAccountsData.data?.length || 0)));
    } catch (error: any) {
      console.error('Meta OAuth error:', error);
      res.redirect('/analytics?meta=error&message=' + encodeURIComponent(error.message));
    }
  });

  // Google OAuth - Redirect to Google OAuth dialog
  app.get("/api/auth/google", async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/adwords';

    if (!clientId) return res.status(500).json({ message: 'GOOGLE_CLIENT_ID not configured' });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent&state=${encodeURIComponent(`${req.userId}|${tenantId}`)}`;
    res.redirect(authUrl);
  });

  // Google OAuth Callback - Multi-Account Support
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const [userId, tenantId] = String(state || "").split("|");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;

    if (!code || !userId || !tenantId) {
      return res.status(400).json({ message: 'Missing code, user or tenant' });
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description);

      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString();

      const pgClient = await getClientForUser(userId);
      try {
        await pgClient.query(
          `INSERT INTO analytics_tokens (tenant_id, user_id, platform, account_id, account_name, account_type, access_token, refresh_token, expires_at, is_active, is_selected)
           VALUES ($1,$2,'google','default','Google Ads Account','mcc',$3,$4,$5,true,true)
           ON CONFLICT (user_id, platform, account_id) DO UPDATE SET
             access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
             expires_at=EXCLUDED.expires_at, is_active=true, updated_at=now()`,
          [tenantId, userId, tokenData.access_token, tokenData.refresh_token, expiresAt]
        );
      } finally { pgClient.release(); }

      res.redirect('/analytics?google=connected');
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      res.redirect('/analytics?google=error&message=' + encodeURIComponent(error.message));
    }
  });

  // Get Connected Accounts
  app.get("/api/analytics/accounts", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, platform, account_id, account_name, account_type, is_active, is_selected, created_at
           FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND is_active=true ORDER BY created_at DESC`,
          [req.userId, tenantId]
        );
        res.json({
          meta: rows.filter((a: any) => a.platform === 'meta'),
          google: rows.filter((a: any) => a.platform === 'google'),
        });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Select Account (switch which account to view)
  app.post("/api/analytics/select-account", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { platform, accountId } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        await pgClient.query(
          `UPDATE analytics_tokens SET is_selected=false WHERE user_id=$1 AND tenant_id=$2 AND platform=$3`,
          [req.userId, tenantId, platform]
        );
        await pgClient.query(
          `UPDATE analytics_tokens SET is_selected=true WHERE user_id=$1 AND tenant_id=$2 AND platform=$3 AND account_id=$4`,
          [req.userId, tenantId, platform, accountId]
        );
        res.json({ success: true });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error('Error selecting account:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Hide Account (soft delete)
  app.post("/api/analytics/hide-account", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { id } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        await pgClient.query(
          `UPDATE analytics_tokens SET is_active=false, is_selected=false WHERE id=$1 AND user_id=$2 AND tenant_id=$3`,
          [id, req.userId, tenantId]
        );
        res.json({ success: true });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error('Error hiding account:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Selected Account
  app.get("/api/analytics/selected-account/:platform", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform=$3 AND is_selected=true AND is_active=true LIMIT 1`,
          [req.userId, tenantId, req.params.platform]
        );
        if (!rows[0]) return res.status(404).json({ message: 'No account selected' });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error('Error fetching selected account:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Meta Organic Metrics
  app.get("/api/analytics/meta/organic", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      let accountData: any;
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform='meta' AND is_selected=true AND is_active=true LIMIT 1`,
          [req.userId, tenantId]
        );
        accountData = rows[0];
      } finally { pgClient.release(); }

      if (!accountData) return res.status(404).json({ message: 'No Meta account selected' });

      const token = await getValidToken(req.userId!, tenantId, 'meta', accountData.account_id);
      const insightsRes = await fetch(`https://graph.facebook.com/v18.0/${accountData.account_id}/insights?metric=page_impressions,page_impressions_unique,page_engaged_users,page_fans,page_post_engagements,page_video_views&period=days_28&access_token=${token}`);
      const insightsData = await insightsRes.json();
      if (insightsData.error) throw new Error(insightsData.error.message);

      res.json({ account: { id: accountData.account_id, name: accountData.account_name }, metrics: insightsData.data || [] });
    } catch (error: any) {
      console.error('Error fetching Meta organic metrics:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Meta Ads Metrics
  app.get("/api/analytics/meta/ads", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      let accountData: any;
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform='meta' AND is_selected=true AND is_active=true LIMIT 1`,
          [req.userId, tenantId]
        );
        accountData = rows[0];
      } finally { pgClient.release(); }

      if (!accountData) return res.status(404).json({ message: 'No Meta account selected' });

      const token = await getValidToken(req.userId!, tenantId, 'meta', accountData.account_id);
      const campaignsRes = await fetch(`https://graph.facebook.com/v18.0/${accountData.account_id}/campaigns?fields=id,name,status,insights{spend,impressions,clicks,ctr,cpc,conversions,purchase_roas}&access_token=${token}`);
      const campaignsData = await campaignsRes.json();
      if (campaignsData.error) throw new Error(campaignsData.error.message);

      res.json({ account: { id: accountData.account_id, name: accountData.account_name }, campaigns: campaignsData.data || [] });
    } catch (error: any) {
      console.error('Error fetching Meta ads metrics:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Google Ads Metrics
  app.get("/api/analytics/google/ads", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      let accountData: any;
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM analytics_tokens WHERE user_id=$1 AND tenant_id=$2 AND platform='google' AND is_selected=true AND is_active=true LIMIT 1`,
          [req.userId, tenantId]
        );
        accountData = rows[0];
      } finally { pgClient.release(); }

      if (!accountData) return res.status(404).json({ message: 'No Google account selected' });

      await getValidToken(req.userId!, tenantId, 'google', accountData.account_id);

      res.json({
        account: { id: accountData.account_id, name: accountData.account_name },
        message: 'Google Ads API integration requires customer ID configuration',
        connected: true,
        campaigns: [],
      });
    } catch (error: any) {
      console.error('Error fetching Google Ads metrics:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Scraper Proxy
  const scraperApiUrl = (process.env.SCRAPER_API_URL || process.env.SCRAPER_URL || "http://localhost:8000").replace(/\/$/, "");

  async function proxyScraperPost(path: string, payload: any) {
    const response = await fetch(`${scraperApiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });

    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return { ok: response.ok, status: response.status, data };
  }

  app.post("/api/scraper/scrape", async (req, res) => {
    try {
      const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
      const formats = Array.isArray(req.body?.formats) ? req.body.formats : ["markdown"];

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const response = await fetch(`${scraperApiUrl}/scrape-url?url=${encodeURIComponent(url)}`, {
        method: "POST",
      });

      const text = await response.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          return res.json({
            url,
            markdown: "Nao foi possivel extrair conteudo desta URL com o scraper atual. Isso pode acontecer em paginas com bloqueio anti-bot, autenticacao obrigatoria ou conteudo carregado dinamicamente.",
            links: formats.includes("links") ? [url] : undefined,
            html: formats.includes("html") ? "" : undefined,
          });
        }

        return res.status(response.status).json(data || { message: "Scraper request failed" });
      }

      const normalized: any = { url };
      if (formats.includes("markdown") || formats.length === 0) {
        normalized.markdown = data.content_text || data.summary || "";
      }
      if (formats.includes("html")) {
        normalized.html = data.content_text ? `<div>${String(data.content_text).replace(/\n/g, "<br>")}</div>` : "";
      }
      if (formats.includes("links")) {
        normalized.links = [url];
      }

      res.json(normalized);
    } catch (error: any) {
      console.error("Error proxying scraper /scrape:", error);
      res.status(502).json({ message: error.message || "Failed to reach scraper service" });
    }
  });

  app.post("/api/scraper/search", async (req, res) => {
    try {
      const result = await proxyScraperPost("/search", req.body);
      if (!result.ok) {
        return res.status(result.status).json(result.data || { message: "Scraper request failed" });
      }
      res.json(result.data);
    } catch (error: any) {
      console.error("Error proxying scraper /search:", error);
      res.status(502).json({ message: error.message || "Failed to reach scraper service" });
    }
  });

  app.post("/api/scraper/agent", async (req, res) => {
    try {
      const result = await proxyScraperPost("/agent", req.body);
      if (!result.ok) {
        return res.status(result.status).json(result.data || { message: "Scraper request failed" });
      }
      res.json(result.data);
    } catch (error: any) {
      console.error("Error proxying scraper /agent:", error);
      res.status(502).json({ message: error.message || "Failed to reach scraper service" });
    }
  });

  app.post("/api/scraper/map", async (req, res) => {
    try {
      const result = await proxyScraperPost("/map", req.body);
      if (!result.ok) {
        return res.status(result.status).json(result.data || { message: "Scraper request failed" });
      }
      res.json(result.data);
    } catch (error: any) {
      console.error("Error proxying scraper /map:", error);
      res.status(502).json({ message: error.message || "Failed to reach scraper service" });
    }
  });

  app.post("/api/scraper/crawl", async (req, res) => {
    try {
      const result = await proxyScraperPost("/crawl", req.body);
      if (!result.ok) {
        return res.status(result.status).json(result.data || { message: "Scraper request failed" });
      }
      res.json(result.data);
    } catch (error: any) {
      console.error("Error proxying scraper /crawl:", error);
      res.status(502).json({ message: error.message || "Failed to reach scraper service" });
    }
  });

  // ===== POSTS ASYNC (Sprint 3) =====

  // Create async post job
  app.post("/api/clients/:clientId/posts", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { clientId } = req.params;
      const { goal, language, channels, idempotency_key, title_hint, tone, sources, generation } = req.body;

      if (!goal || !language || !Array.isArray(channels) || channels.length === 0 || !idempotency_key) {
        return res.status(400).json({
          message: "Invalid payload. Required: goal, language, channels, idempotency_key",
          code: "BF_VALIDATION_ERROR"
        });
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        // Verify client ownership within tenant
        const { rows: clientRows } = await pgClient.query(
          `SELECT id FROM clients WHERE id=$1 AND tenant_id=$2`,
          [clientId, tenantId]
        );
        if (!clientRows[0]) {
          return res.status(403).json({ message: "Client not found or not owned by tenant", code: "BF_FORBIDDEN_TENANT" });
        }

        // Idempotency check
        const { rows: dupRows } = await pgClient.query(
          `SELECT id, status FROM jobs WHERE tenant_id=$1 AND client_id=$2 AND idempotency_key=$3`,
          [tenantId, clientId, idempotency_key]
        );
        if (dupRows[0]) {
          return res.status(409).json({ message: "Duplicate request for this idempotency key", code: "BF_DUPLICATE_REQUEST", job_id: dupRows[0].id });
        }

        const payload = {
          title_hint: title_hint || "",
          goal,
          language,
          tone: tone || "consultivo",
          channels,
          sources: sources || { mode: "client_sources" },
          generation: generation || {},
        };

        const { rows: jobRows } = await pgClient.query(
          `INSERT INTO jobs (tenant_id, client_id, user_id, status, stage, progress, attempt, max_attempts, idempotency_key, payload)
           VALUES ($1,$2,$3,'queued','validating_input',0,1,3,$4,$5) RETURNING id, status, created_at`,
          [tenantId, clientId, req.userId, idempotency_key, JSON.stringify(payload)]
        );

        const job = jobRows[0];
        res.status(202).json({
          job_id: job.id,
          status: job.status,
          estimated_seconds: 45,
          provider: getDefaultModel(),
        });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error creating post job:", error);
      res.status(500).json({ message: error.message || "Failed to create post job", code: "BF_PROVIDER_UNAVAILABLE" });
    }
  });

  // Get job status
  app.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, client_id, status, stage, progress, attempt, max_attempts, error, result_post_id, created_at, updated_at
           FROM jobs WHERE id=$1 AND tenant_id=$2`,
          [req.params.jobId, tenantId]
        );
        if (!rows[0]) {
          return res.status(404).json({ message: "Job not found", code: "BF_JOB_NOT_FOUND" });
        }
        const j = rows[0];
        res.json({
          job_id: j.id,
          client_id: j.client_id,
          status: j.status,
          stage: j.stage,
          progress: j.progress,
          attempt: j.attempt,
          max_attempts: j.max_attempts,
          error: j.error,
          result: j.result_post_id ? { post_id: j.result_post_id } : null,
          created_at: j.created_at,
          updated_at: j.updated_at,
        });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: error.message || "Failed to fetch job" });
    }
  });

  // Cancel a running job
  app.post("/api/jobs/:jobId/cancel", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        // First verify the job belongs to this tenant
        const { rows: existing } = await pgClient.query(
          `SELECT id, status FROM jobs WHERE id=$1 AND tenant_id=$2`,
          [req.params.jobId, tenantId]
        );
        if (!existing[0]) {
          console.warn(`[cancel-job] job ${req.params.jobId} not found for tenant ${tenantId}`);
          return res.status(404).json({ message: "Job not found" });
        }
        const currentStatus = existing[0].status;
        console.log(`[cancel-job] canceling job ${req.params.jobId} (current status: ${currentStatus})`);
        if (currentStatus === 'completed' || currentStatus === 'failed') {
          return res.status(409).json({ message: "Job already finished", status: currentStatus });
        }
        await pgClient.query(
          `UPDATE jobs SET status='failed', updated_at=NOW() WHERE id=$1`,
          [req.params.jobId]
        );
        res.json({ ok: true });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error canceling job:", error);
      res.status(500).json({ message: error.message || "Failed to cancel job" });
    }
  });

  // List posts by client
  app.get("/api/clients/:clientId/posts/list", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, client_id, title, content, channels, status, generated_by, created_at, updated_at
           FROM posts WHERE client_id=$1 AND tenant_id=$2 ORDER BY created_at DESC`,
          [req.params.clientId, tenantId]
        );
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: error.message || "Failed to fetch posts" });
    }
  });

  // Library: list posts with filters + pagination
  app.get("/api/posts", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const period = typeof req.query.period === "string" ? req.query.period : "all";
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
      const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "25"), 10) || 25));
      const offset = (page - 1) * limit;

      const where: string[] = ["p.tenant_id = $1"];
      const params: any[] = [tenantId];

      if (clientId && clientId !== "all") {
        params.push(clientId);
        where.push(`p.client_id = $${params.length}`);
      }

      if (status && status !== "all") {
        params.push(status);
        where.push(`p.status = $${params.length}`);
      }

      if (period !== "all") {
        if (period === "today") {
          where.push("p.created_at >= date_trunc('day', now())");
        } else if (period === "week") {
          where.push("p.created_at >= date_trunc('week', now())");
        } else if (period === "month") {
          where.push("p.created_at >= date_trunc('month', now())");
        }
      }

      if (search.length > 0) {
        params.push(`%${search}%`);
        const idx = params.length;
        where.push(`(COALESCE(p.title, '') ILIKE $${idx} OR COALESCE(p.content, '') ILIKE $${idx})`);
      }

      const whereClause = where.join(" AND ");

      const pgClient = await getClientForUser(req.userId);
      try {
        const countResult = await pgClient.query(
          `SELECT COUNT(*)::int AS total FROM posts p WHERE ${whereClause}`,
          params
        );
        const total = countResult.rows[0]?.total ?? 0;

        const listParams = [...params, limit, offset];
        const limitParam = listParams.length - 1;
        const offsetParam = listParams.length;

        const { rows } = await pgClient.query(
          `SELECT
            p.id,
            p.client_id,
            p.title,
            p.content,
            p.status,
            p.generated_by,
            p.created_at,
            p.updated_at,
            p.status_updated_at,
            p.status_updated_by,
            c.name AS client_name,
            cr.id AS creative_id
          FROM posts p
          JOIN clients c ON c.id = p.client_id AND c.tenant_id = p.tenant_id
          LEFT JOIN creatives cr ON cr.post_id = p.id AND cr.tenant_id = p.tenant_id
          WHERE ${whereClause}
          ORDER BY p.created_at DESC
          LIMIT $${limitParam} OFFSET $${offsetParam}`,
          listParams
        );

        res.json({
          items: rows,
          page,
          limit,
          total,
          has_more: offset + rows.length < total,
        });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error("Error fetching posts library:", error);
      res.status(500).json({ message: error.message || "Failed to fetch posts library" });
    }
  });

  // Get post detail
  app.get("/api/posts/:postId", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, client_id, title, content, channels, status, generated_by,
                  created_at, updated_at, status_updated_at, status_updated_by
           FROM posts WHERE id=$1 AND tenant_id=$2`,
          [req.params.postId, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Post not found" });

        const historyResult = await pgClient.query(
          `SELECT id, post_id, from_status, to_status, changed_by, changed_at
           FROM post_status_history
           WHERE post_id = $1 AND tenant_id = $2
           ORDER BY changed_at DESC`,
          [req.params.postId, tenantId]
        );

        res.json({
          ...rows[0],
          history: historyResult.rows,
        });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: error.message || "Failed to fetch post" });
    }
  });

  // Ensure a visual creative exists for a post and return its id (without re-running AI generation)
  app.post('/api/posts/:postId/creative', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const postId = req.params.postId;
      const pgClient = await getClientForUser(req.userId);
      try {
        const existingCreative = await pgClient.query(
          `SELECT id
           FROM creatives
           WHERE tenant_id = $1 AND post_id = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [tenantId, postId]
        );

        if (existingCreative.rows[0]?.id) {
          return res.json({ creativeId: existingCreative.rows[0].id, created: false });
        }

        const postResult = await pgClient.query(
          `SELECT id, client_id, title, content
           FROM posts
           WHERE id = $1 AND tenant_id = $2`,
          [postId, tenantId]
        );

        const post = postResult.rows[0];
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        const contentText = String(post.content || '').trim();
        const normalized = contentText.replace(/\r/g, '');
        const matches = [...normalized.matchAll(/(?:^|\n)Slide\s*(\d+)\s*:\s*([^\n]+)\n?([^\n]*)/gim)];

        const parsedSlides = matches
          .map((m) => ({
            title: String(m[2] || '').trim(),
            subtitle: String(m[3] || '').trim(),
          }))
          .filter((s) => s.title.length > 0);

        const baseTitle = String(post.title || 'Novo conteúdo').trim() || 'Novo conteúdo';
        const fallbackSubtitle = contentText
          ? contentText.slice(0, 220)
          : 'Conteúdo importado da biblioteca';

        const slideCopy = (parsedSlides.length > 0 ? parsedSlides : [{ title: baseTitle, subtitle: fallbackSubtitle }]).slice(0, 10);

        const slides = slideCopy.map((copy, index) =>
          buildCreativeSlide({
            index,
            title: copy.title,
            subtitle: copy.subtitle,
            accentColor: '#3B82F6',
            layoutMode: 'minimalist',
            imageMode: 'both',
            imageUrl: undefined,
            fontCombination: DEFAULT_FONT_COMBINATION,
          })
        );

        const insertResult = await pgClient.query(
          `INSERT INTO creatives (
             tenant_id, client_id, post_id, type, platform, format, canvas_width, canvas_height,
             layout_mode, font_combination, accent_color, instagram_handle, slides, status
           )
           VALUES ($1, $2, $3, 'carousel', 'instagram', 'portrait', 1080, 1350, 'minimalist', $4, $5, $6, $7, 'draft')
           RETURNING id`,
          [
            tenantId,
            post.client_id,
            post.id,
            JSON.stringify(DEFAULT_FONT_COMBINATION),
            '#3B82F6',
            '',
            JSON.stringify(slides),
          ]
        );

        return res.json({ creativeId: insertResult.rows[0].id, created: true });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error('Error ensuring post creative:', error);
      return res.status(500).json({ message: error.message || 'Failed to create creative from post' });
    }
  });

  // Update post
  app.put("/api/posts/:postId", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { title, content, status } = req.body;
      if (status !== undefined) {
        return res.status(400).json({
          message: "Use PUT /api/posts/:postId/status para alterar status com validação de fluxo.",
        });
      }
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `UPDATE posts SET title=COALESCE($1,title), content=COALESCE($2,content), updated_at=NOW()
           WHERE id=$3 AND tenant_id=$4 RETURNING *`,
          [title, content, req.params.postId, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Post not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: error.message || "Failed to update post" });
    }
  });

  // Update post status with transition validation
  app.put("/api/posts/:postId/status", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { status: nextStatus } = req.body || {};
      if (typeof nextStatus !== "string") {
        return res.status(400).json({ message: "Field 'status' is required." });
      }

      if (!Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, nextStatus)) {
        return res.status(400).json({ message: `Invalid status '${nextStatus}'.` });
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        await pgClient.query("BEGIN");

        const currentPostResult = await pgClient.query(
          `SELECT id, client_id, title, content, channels, status, generated_by,
                  created_at, updated_at, status_updated_at, status_updated_by
           FROM posts WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
          [req.params.postId, tenantId]
        );

        const currentPost = currentPostResult.rows[0];
        if (!currentPost) {
          await pgClient.query("ROLLBACK");
          return res.status(404).json({ message: "Post not found" });
        }

        const currentStatus = String(currentPost.status);
        const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

        if (!allowedTransitions.includes(nextStatus)) {
          await pgClient.query("ROLLBACK");
          return res.status(400).json({
            message: `Invalid transition: ${currentStatus} -> ${nextStatus}. Allowed: ${allowedTransitions.join(", ") || "none"}.`,
          });
        }

        const updateResult = await pgClient.query(
          `UPDATE posts
           SET status = $1,
               status_updated_at = NOW(),
               status_updated_by = $2,
               updated_at = NOW()
           WHERE id = $3 AND tenant_id = $4
           RETURNING id, client_id, title, content, channels, status, generated_by,
                     created_at, updated_at, status_updated_at, status_updated_by`,
          [nextStatus, req.userId, req.params.postId, tenantId]
        );

        await pgClient.query(
          `INSERT INTO post_status_history (tenant_id, post_id, from_status, to_status, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, req.params.postId, currentStatus, nextStatus, req.userId]
        );

        const historyResult = await pgClient.query(
          `SELECT id, post_id, from_status, to_status, changed_by, changed_at
           FROM post_status_history
           WHERE post_id = $1 AND tenant_id = $2
           ORDER BY changed_at DESC`,
          [req.params.postId, tenantId]
        );

        await pgClient.query("COMMIT");

        return res.json({
          ...updateResult.rows[0],
          history: historyResult.rows,
        });
      } catch (error) {
        await pgClient.query("ROLLBACK");
        throw error;
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error("Error updating post status:", error);
      res.status(500).json({ message: error.message || "Failed to update post status" });
    }
  });

  // ==================== CRAWLING ENDPOINTS (Sprint 4) ====================

  // Health check do scraper
  app.get("/api/crawl/health", async (_req, res) => {
    try {
      const crawler = new CrawlerClient();
      const healthy = await crawler.healthCheck();
      res.json({ status: healthy ? "healthy" : "unavailable", scraper_url: process.env.SCRAPER_API_URL || "http://localhost:8000" });
    } catch (error: any) {
      res.status(503).json({ status: "unavailable", error: error.message });
    }
  });

  // Testar crawling de uma URL específica
  app.post("/api/crawl/test", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "URL is required" });

      const crawler = new CrawlerClient();
      const content = await crawler.scrapeUrl(url);
      if (!content) return res.status(404).json({ message: "Could not extract content" });

      res.json(content);
    } catch (error: any) {
      console.error("Crawl test error:", error);
      res.status(500).json({ message: error.message || "Crawl failed" });
    }
  });

  // Listar conteúdos crawleados de um cliente (placeholder — busca do PG)
  app.get("/api/clients/:clientId/contents", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, source_id, title, url, content_text, summary, author, published_at, scraped_at
           FROM contents WHERE client_id=$1 AND tenant_id=$2 ORDER BY scraped_at DESC LIMIT 100`,
          [req.params.clientId, tenantId]
        );
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching contents:", error);
      res.status(500).json({ message: error.message || "Failed to fetch contents" });
    }
  });

  // Disparar crawling manual para um cliente
  app.post("/api/clients/:clientId/crawl", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      let sources: any[] = [];
      try {
        const { rows } = await pgClient.query(
          `SELECT id, url, type FROM sources WHERE client_id=$1 AND tenant_id=$2 AND is_active=true`,
          [req.params.clientId, tenantId]
        );
        sources = rows;
      } finally { pgClient.release(); }

      if (sources.length === 0) {
        return res.status(404).json({ message: "No active sources found for client" });
      }

      const crawler = new CrawlerClient();
      const result = await crawler.crawlBatch({
        tenant_id: tenantId,
        client_id: req.params.clientId,
        sources: sources.map((s: any) => ({ url: s.url, source_type: s.type, source_id: s.id })),
      });

      res.json({
        message: "Crawl completed",
        client_id: req.params.clientId,
        sources_processed: result.total_urls,
        contents_collected: result.successful,
        contents: result.contents.map((c: any) => ({
          title: c.title,
          url: c.url,
          word_count: c.word_count,
        })),
      });
    } catch (error: any) {
      console.error("Manual crawl error:", error);
      res.status(500).json({ message: error.message || "Crawl failed" });
    }
  });

  // ============================================================
  // AGENTS CRUD
  // ============================================================

  // Listar agentes do tenant
  app.get("/api/agents", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, name, description, role, model, temperature, max_tokens, is_active, created_at
           FROM agents WHERE tenant_id = $1 ORDER BY created_at DESC`,
          [tenantId]
        );
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: error.message || "Failed to fetch agents" });
    }
  });

  // Criar agente
  app.post("/api/agents", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, role, system_prompt, model, temperature, max_tokens, tools, config } = req.body;
      if (!name || !role || !system_prompt) {
        return res.status(400).json({ message: "name, role and system_prompt are required" });
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `INSERT INTO agents (tenant_id, name, description, role, system_prompt, model, temperature, max_tokens, tools, config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [tenantId, name, description || '', role, system_prompt, model || getDefaultModel(), temperature ?? 0.7, max_tokens || 2048, JSON.stringify(tools || []), JSON.stringify(config || {})]
        );
        res.status(201).json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error creating agent:", error);
      res.status(500).json({ message: error.message || "Failed to create agent" });
    }
  });

  // Detalhes do agente
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM agents WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Agent not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: error.message || "Failed to fetch agent" });
    }
  });

  // Atualizar agente
  app.put("/api/agents/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, role, system_prompt, model, temperature, max_tokens, tools, config, is_active } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `UPDATE agents SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            role = COALESCE($3, role),
            system_prompt = COALESCE($4, system_prompt),
            model = COALESCE($5, model),
            temperature = COALESCE($6, temperature),
            max_tokens = COALESCE($7, max_tokens),
            tools = COALESCE($8, tools),
            config = COALESCE($9, config),
            is_active = COALESCE($10, is_active),
            updated_at = NOW()
           WHERE id = $11 AND tenant_id = $12 RETURNING *`,
          [name, description, role, system_prompt, model, temperature, max_tokens,
           tools ? JSON.stringify(tools) : null, config ? JSON.stringify(config) : null,
           is_active, req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Agent not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: error.message || "Failed to update agent" });
    }
  });

  // Deletar agente
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rowCount } = await pgClient.query(
          `DELETE FROM agents WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (rowCount === 0) return res.status(404).json({ message: "Agent not found" });
        res.json({ message: "Agent deleted" });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: error.message || "Failed to delete agent" });
    }
  });

  // ============================================================
  // AGENT GRAPHS CRUD
  // ============================================================

  // Listar fluxos
  app.get("/api/agent-graphs", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, name, description, is_active, is_default, created_at,
           (SELECT COUNT(*) FROM agent_executions WHERE graph_id = agent_graphs.id) as execution_count
           FROM agent_graphs WHERE tenant_id = $1 ORDER BY created_at DESC`,
          [tenantId]
        );
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching graphs:", error);
      res.status(500).json({ message: error.message || "Failed to fetch graphs" });
    }
  });

  // Criar fluxo
  app.post("/api/agent-graphs", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, nodes, edges, is_default } = req.body;
      if (!name || !nodes || !edges) {
        return res.status(400).json({ message: "name, nodes and edges are required" });
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        await pgClient.query('BEGIN');

        // Se for default, desmarca outros
        if (is_default) {
          await pgClient.query(
            `UPDATE agent_graphs SET is_default = false WHERE tenant_id = $1`,
            [tenantId]
          );
        }

        const { rows } = await pgClient.query(
          `INSERT INTO agent_graphs (tenant_id, name, description, nodes, edges, is_default)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tenantId, name, description || '', JSON.stringify(nodes), JSON.stringify(edges), is_default || false]
        );

        await pgClient.query('COMMIT');
        res.status(201).json(rows[0]);
      } catch (err) {
        await pgClient.query('ROLLBACK');
        throw err;
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error creating graph:", error);
      res.status(500).json({ message: error.message || "Failed to create graph" });
    }
  });

  // Detalhes do fluxo
  app.get("/api/agent-graphs/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT * FROM agent_graphs WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Graph not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching graph:", error);
      res.status(500).json({ message: error.message || "Failed to fetch graph" });
    }
  });

  // Atualizar fluxo
  app.put("/api/agent-graphs/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { name, description, nodes, edges, is_active, is_default } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        await pgClient.query('BEGIN');

        if (is_default) {
          await pgClient.query(
            `UPDATE agent_graphs SET is_default = false WHERE tenant_id = $1`,
            [tenantId]
          );
        }

        const { rows } = await pgClient.query(
          `UPDATE agent_graphs SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            nodes = COALESCE($3, nodes),
            edges = COALESCE($4, edges),
            is_active = COALESCE($5, is_active),
            is_default = COALESCE($6, is_default),
            updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8 RETURNING *`,
          [name, description, nodes ? JSON.stringify(nodes) : null, edges ? JSON.stringify(edges) : null,
           is_active, is_default, req.params.id, tenantId]
        );

        await pgClient.query('COMMIT');
        if (!rows[0]) return res.status(404).json({ message: "Graph not found" });
        res.json(rows[0]);
      } catch (err) {
        await pgClient.query('ROLLBACK');
        throw err;
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error updating graph:", error);
      res.status(500).json({ message: error.message || "Failed to update graph" });
    }
  });

  // Deletar fluxo
  app.delete("/api/agent-graphs/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rowCount } = await pgClient.query(
          `DELETE FROM agent_graphs WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (rowCount === 0) return res.status(404).json({ message: "Graph not found" });
        res.json({ message: "Graph deleted" });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error deleting graph:", error);
      res.status(500).json({ message: error.message || "Failed to delete graph" });
    }
  });

  // ============================================================
  // AGENT EXECUTIONS
  // ============================================================

  // Listar execuções
  app.get("/api/agent-executions", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT e.id, e.status, e.current_node_id, e.started_at, e.completed_at,
           g.name as graph_name, j.id as job_id
           FROM agent_executions e
           JOIN agent_graphs g ON e.graph_id = g.id
           LEFT JOIN jobs j ON e.job_id = j.id
           WHERE e.tenant_id = $1
           ORDER BY e.started_at DESC LIMIT 100`,
          [tenantId]
        );
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching executions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch executions" });
    }
  });

  // Detalhes da execução
  app.get("/api/agent-executions/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT e.*, g.name as graph_name, g.nodes, g.edges
           FROM agent_executions e
           JOIN agent_graphs g ON e.graph_id = g.id
           WHERE e.id = $1 AND e.tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Execution not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching execution:", error);
      res.status(500).json({ message: error.message || "Failed to fetch execution" });
    }
  });

  // Cancelar execução
  app.post("/api/agent-executions/:id/cancel", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `UPDATE agent_executions SET status = 'canceled', completed_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'running' RETURNING *`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Execution not found or already completed" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error canceling execution:", error);
      res.status(500).json({ message: error.message || "Failed to cancel execution" });
    }
  });

  // ============================================================
  // CREATIVE TEMPLATES
  // ============================================================

  app.get("/api/creative-templates", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const selectSql = `SELECT id, tenant_id as "tenantId", name, type, platform,
           slides_count as "slidesCount", structure, thumbnail_url as "thumbnailUrl",
           format, canvas_width as "canvasWidth", canvas_height as "canvasHeight",
           is_global as "isGlobal", is_active as "isActive", created_at as "createdAt"
           FROM creative_templates
           WHERE (is_global = true OR tenant_id = $1)
           AND is_active = true
           ORDER BY is_global DESC, name ASC`;

        let { rows } = await pgClient.query(selectSql, [tenantId]);

        if (rows.length === 0) {
          const defaultStructure = {
            width: 1080,
            height: 1080,
            slides: [
              {
                id: 'slide-1',
                index: 0,
                background: {
                  type: 'gradient',
                  value: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
                },
                layers: [
                  {
                    id: 'layer-headline',
                    type: 'text',
                    x: 80,
                    y: 240,
                    width: 920,
                    height: 220,
                    text: '{{headline}}',
                    fontSize: 62,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    align: 'center',
                    editable: true,
                  },
                  {
                    id: 'layer-body',
                    type: 'text',
                    x: 120,
                    y: 500,
                    width: 840,
                    height: 180,
                    text: '{{body}}',
                    fontSize: 28,
                    fontWeight: 'normal',
                    color: '#dbeafe',
                    align: 'center',
                    editable: true,
                  },
                  {
                    id: 'layer-handle',
                    type: 'text',
                    x: 80,
                    y: 920,
                    width: 920,
                    height: 50,
                    text: '{{client_handle}}',
                    fontSize: 20,
                    fontWeight: 'normal',
                    color: '#bfdbfe',
                    align: 'center',
                    editable: false,
                  },
                ],
              },
            ],
          };

          await pgClient.query(
            `INSERT INTO creative_templates (
               tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active
             )
             SELECT NULL, 'Post Unico de Impacto', 'single', 'universal', 1, $1::jsonb, NULL, true, true
             WHERE NOT EXISTS (
               SELECT 1 FROM creative_templates WHERE is_global = true AND is_active = true
             )`,
            [JSON.stringify(defaultStructure)]
          );

          const refreshed = await pgClient.query(selectSql, [tenantId]);
          rows = refreshed.rows;
        }

        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch templates" });
    }
  });

  // ============================================================
  // CREATIVES
  // ============================================================

  const DEFAULT_FONT_COMBINATION = { title: 'Space', body: 'Inter' };

  function clampSlideCount(input: unknown): number {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return 6;
    return Math.max(1, Math.min(10, Math.floor(parsed)));
  }

  function buildCreativeSlide(params: {
    index: number;
    title: string;
    subtitle: string;
    accentColor: string;
    layoutMode: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';
    imageMode: 'background' | 'grid' | 'both';
    imageUrl?: string;
    imagePrompt?: string;
    fontCombination?: { title: string; body: string };
    canvasHeight?: number;
  }) {
    const theme = params.index % 2 === 0 ? 'dark' : 'light';
    const templateResult = buildSlideFromTemplate({
      index: params.index,
      title: params.title,
      subtitle: params.subtitle,
      accentColor: params.accentColor,
      layoutMode: params.layoutMode,
      imageMode: params.imageMode,
      imageUrl: params.imageUrl,
      fontCombination: params.fontCombination || DEFAULT_FONT_COMBINATION,
      canvasHeight: params.canvasHeight,
    });

    return {
      id: `slide-${params.index + 1}`,
      index: params.index,
      theme,
      background: templateResult.background,
      overlay: templateResult.overlay,
      imageGrid: templateResult.imageGrid,
      textLayout: templateResult.textLayout,
      typography: templateResult.typography,
      profileBadge: templateResult.profileBadge,
      ctaButton: templateResult.ctaButton,
      layers: templateResult.layers,
      imagePrompt: params.imagePrompt,
    };
  }

  type CreativeGenerationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

  interface CreativeGenerationJob {
    jobId: string;
    tenantId: string;
    userId: string;
    status: CreativeGenerationJobStatus;
    stage: string;
    progress: number;
    creativeId?: string;
    error?: string;
    createdAt: number;
    updatedAt: number;
  }

  const creativeGenerationJobs = new Map<string, CreativeGenerationJob>();

  function updateCreativeGenerationJob(
    jobId: string,
    updates: Partial<Pick<CreativeGenerationJob, 'status' | 'stage' | 'progress' | 'creativeId' | 'error'>>
  ) {
    const current = creativeGenerationJobs.get(jobId);
    if (!current) return;

    const next: CreativeGenerationJob = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    creativeGenerationJobs.set(jobId, next);

    if (next.status === 'processing') {
      broadcastJobEvent(next.userId, {
        type: 'job:stage',
        jobId,
        stage: next.stage,
        progress: next.progress,
        tenantId: next.tenantId,
      });
    }

    if (next.status === 'completed' && next.creativeId) {
      broadcastJobEvent(next.userId, {
        type: 'job:complete',
        jobId,
        postId: next.creativeId,
        tenantId: next.tenantId,
      });
    }

    if (next.status === 'failed' && next.error) {
      broadcastJobEvent(next.userId, {
        type: 'job:failed',
        jobId,
        error: next.error,
        tenantId: next.tenantId,
      });
    }
  }

  app.get("/api/creatives", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const clientId = req.query.client_id as string;
      const pgClient = await getClientForUser(req.userId);
      try {
        let query = `SELECT id, tenant_id as "tenantId", client_id as "clientId", post_id as "postId",
          template_id as "templateId", type, platform,
          format, canvas_width as "canvasWidth", canvas_height as "canvasHeight",
          layout_mode as "layoutMode", font_combination as "fontCombination",
          accent_color as "accentColor", instagram_handle as "instagramHandle",
          profile_config as "profileConfig", slides, export_urls as "exportUrls",
          status, created_at as "createdAt", updated_at as "updatedAt"
          FROM creatives WHERE tenant_id = $1`;
        const params: string[] = [tenantId];

        if (clientId) {
          query += ` AND client_id = $2`;
          params.push(clientId);
        }
        query += ` ORDER BY created_at DESC`;

        const { rows } = await pgClient.query(query, params);
        res.json(rows);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching creatives:", error);
      res.status(500).json({ message: error.message || "Failed to fetch creatives" });
    }
  });

  app.get("/api/creatives/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `SELECT id, tenant_id as "tenantId", client_id as "clientId", post_id as "postId",
           template_id as "templateId", type, platform,
           format, canvas_width as "canvasWidth", canvas_height as "canvasHeight",
           layout_mode as "layoutMode", font_combination as "fontCombination",
           accent_color as "accentColor", instagram_handle as "instagramHandle",
           profile_config as "profileConfig", slides, export_urls as "exportUrls",
           status, created_at as "createdAt", updated_at as "updatedAt"
           FROM creatives WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Creative not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error fetching creative:", error);
      res.status(500).json({ message: error.message || "Failed to fetch creative" });
    }
  });

  app.post("/api/creatives", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const {
        client_id,
        post_id,
        template_id,
        type,
        platform,
        format,
        slides_count,
        slides,
        layoutMode,
        fontCombination,
        accentColor,
        instagramHandle,
        profileConfig,
      } = req.body;

      // Determinar dimensões do canvas baseado no formato
      let canvasWidth = 1080;
      let canvasHeight = 1080;
      const safeFormat = format || 'square';
      if (safeFormat === 'portrait') {
        canvasHeight = 1350;
      } else if (safeFormat === 'story') {
        canvasHeight = 1920;
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `INSERT INTO creatives (
             tenant_id, client_id, post_id, template_id, type, platform,
             format, canvas_width, canvas_height,
             layout_mode, font_combination, accent_color, instagram_handle, profile_config,
             slides, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
           RETURNING id, tenant_id as "tenantId", client_id as "clientId", post_id as "postId",
           template_id as "templateId", type, platform,
           format, canvas_width as "canvasWidth", canvas_height as "canvasHeight",
           layout_mode as "layoutMode", font_combination as "fontCombination",
           accent_color as "accentColor", instagram_handle as "instagramHandle",
           profile_config as "profileConfig", slides, export_urls as "exportUrls",
           status, created_at as "createdAt", updated_at as "updatedAt"`,
          [
            tenantId,
            client_id,
            post_id,
            template_id,
            type || 'carousel',
            platform || 'instagram',
            safeFormat,
            canvasWidth,
            canvasHeight,
            layoutMode || 'minimalist',
            JSON.stringify(fontCombination || DEFAULT_FONT_COMBINATION),
            accentColor || '#3B82F6',
            instagramHandle || '',
            profileConfig ? JSON.stringify(profileConfig) : null,
            JSON.stringify(slides || []),
          ]
        );
        res.status(201).json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error creating creative:", error);
      res.status(500).json({ message: error.message || "Failed to create creative" });
    }
  });

  app.post('/api/creatives/generate', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const {
        clientId,
        prompt,
        slidesCount,
        imageMode = 'both',
        imageStyleHint,
        layoutMode = 'minimalist',
        format = 'portrait',
        instagramHandle = '',
        fontCombination = DEFAULT_FONT_COMBINATION,
        accentColor = '#3B82F6',
        generateImages = true,
        textDepth,
      } = req.body || {};

      if (!clientId || !prompt) {
        return res.status(400).json({ message: 'clientId e prompt sao obrigatorios' });
      }

      const safeSlideCount = clampSlideCount(slidesCount);
      const safeImageMode = ['background', 'grid', 'both'].includes(imageMode) ? imageMode : 'both';
      const safeLayoutMode = (['minimalist', 'profile', 'editorial', 'bold', 'split', 'cinematic', 'twitter'] as const).includes(layoutMode) ? layoutMode : 'minimalist';
      const safeFormat = ['square', 'portrait', 'story'].includes(format) ? format : 'portrait';
      const canvasDims = safeFormat === 'square' ? { w: 1080, h: 1080 } : safeFormat === 'story' ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };
      const jobId = `creative-job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const userId = String(req.userId || '');

      creativeGenerationJobs.set(jobId, {
        jobId,
        tenantId,
        userId,
        status: 'queued',
        stage: 'Fila',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      queueMicrotask(async () => {
        try {
          updateCreativeGenerationJob(jobId, {
            status: 'processing',
            stage: 'Iniciando fluxo de agentes',
            progress: 5,
          });

          // Usa o fluxo multi-agente para gerar slides
          const agentResult = await generateSlidesWithAgents({
            prompt,
            slidesCount: safeSlideCount,
            tenantId,
            clientId,
            userId,
            pool,
            tone: req.body?.tone || 'engajamento',
            goal: req.body?.goal || 'engagement',
            imageStyleHint,
            textDepth,
            onProgress: (stage, progress) => {
              updateCreativeGenerationJob(jobId, {
                status: 'processing',
                stage,
                progress,
              });
            },
          });

          const generatedCopy = agentResult.slides;
          const imagePrompts = agentResult.imagePrompts;

          updateCreativeGenerationJob(jobId, {
            status: 'processing',
            stage: agentResult.usedAgents
              ? 'Slides gerados pelos agentes — gerando imagens'
              : 'Gerando imagens dos slides',
            progress: 60,
          });

          const slides = [];

          for (let index = 0; index < generatedCopy.length; index++) {
            const copy = generatedCopy[index];

            updateCreativeGenerationJob(jobId, {
              status: 'processing',
              stage: `Processando slide ${index + 1}/${generatedCopy.length}`,
              progress: 65 + Math.round((index / Math.max(1, generatedCopy.length)) * 25),
            });

            // Usa prompt do image-prompt-engine se disponível, senão gera um simples
            const imagePrompt = imagePrompts?.[index]
              ? imagePrompts[index]
              : `${prompt}. Slide ${index + 1}: ${copy.title}`;

            const imageUrl = generateImages
              ? await generateSlideImage(imagePrompt, imageStyleHint)
              : undefined;

            slides.push(
              buildCreativeSlide({
                index,
                title: copy.title,
                subtitle: copy.subtitle,
                accentColor,
                layoutMode: safeLayoutMode,
                imageMode: safeImageMode,
                imageUrl,
                imagePrompt,
                fontCombination,
                canvasHeight: canvasDims.h,
              })
            );
          }

          updateCreativeGenerationJob(jobId, {
            status: 'processing',
            stage: 'Salvando creative',
            progress: 92,
          });

          const pgClient = await getClientForUser(userId);
          try {
            const { rows } = await pgClient.query(
              `INSERT INTO creatives (
                 tenant_id, client_id, type, platform, format, canvas_width, canvas_height,
                 layout_mode, font_combination, accent_color, instagram_handle, slides, status
               )
               VALUES ($1, $2, 'carousel', 'instagram', $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
               RETURNING id`,
              [
                tenantId,
                clientId,
                safeFormat,
                canvasDims.w,
                canvasDims.h,
                safeLayoutMode,
                JSON.stringify(fontCombination || DEFAULT_FONT_COMBINATION),
                accentColor,
                instagramHandle,
                JSON.stringify(slides),
              ]
            );

            updateCreativeGenerationJob(jobId, {
              status: 'completed',
              stage: 'Concluido',
              progress: 100,
              creativeId: rows[0]?.id,
            });
          } finally {
            pgClient.release();
          }
        } catch (error: any) {
          console.error('Error generating creative job:', error);
          updateCreativeGenerationJob(jobId, {
            status: 'failed',
            stage: 'Falha na geracao',
            progress: 100,
            error: error.message || 'Failed to generate creative',
          });
        }
      });

      return res.status(202).json({
        job_id: jobId,
        message: 'Geracao enfileirada',
      });
    } catch (error: any) {
      console.error('Error queuing creative generation:', error);
      return res.status(500).json({ message: error.message || 'Failed to queue creative generation' });
    }
  });

  app.get('/api/creatives/jobs/:jobId', async (req, res) => {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const job = creativeGenerationJobs.get(req.params.jobId);
    if (!job || job.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      creativeId: job.creativeId,
      error: job.error,
    });
  });

  app.post('/api/creatives/:id/slides/:idx/generate-content', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const slideIndex = Number.parseInt(req.params.idx, 10);
      if (!Number.isInteger(slideIndex) || slideIndex < 0) {
        return res.status(400).json({ message: 'idx invalido' });
      }

      const { instruction } = req.body || {};
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          'SELECT slides FROM creatives WHERE id = $1 AND tenant_id = $2',
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Creative not found' });

        const slides = Array.isArray(rows[0].slides) ? rows[0].slides : [];
        if (!slides[slideIndex]) return res.status(404).json({ message: 'Slide not found' });

        const current = slides[slideIndex]?.textLayout || { title: '', subtitle: '' };
        const updatedText = await refineSlideCopy(
          current,
          instruction || 'Reescreva com mais clareza e objetividade'
        );

        slides[slideIndex] = {
          ...slides[slideIndex],
          textLayout: {
            ...current,
            ...updatedText,
          },
        };

        await pgClient.query(
          'UPDATE creatives SET slides = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [JSON.stringify(slides), req.params.id, tenantId]
        );

        return res.json({
          index: slideIndex,
          textLayout: slides[slideIndex].textLayout,
        });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error('Error generating slide content:', error);
      return res.status(500).json({ message: error.message || 'Failed to generate slide content' });
    }
  });

  app.post('/api/creatives/:id/slides/:idx/refine', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const slideIndex = Number.parseInt(req.params.idx, 10);
      if (!Number.isInteger(slideIndex) || slideIndex < 0) {
        return res.status(400).json({ message: 'idx invalido' });
      }

      const { instruction } = req.body || {};
      if (!instruction || typeof instruction !== 'string') {
        return res.status(400).json({ message: 'instruction e obrigatoria' });
      }

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          'SELECT slides FROM creatives WHERE id = $1 AND tenant_id = $2',
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Creative not found' });

        const slides = Array.isArray(rows[0].slides) ? rows[0].slides : [];
        if (!slides[slideIndex]) return res.status(404).json({ message: 'Slide not found' });

        const current = slides[slideIndex]?.textLayout || { title: '', subtitle: '' };
        const refined = await refineSlideCopy(current, instruction);
        slides[slideIndex] = {
          ...slides[slideIndex],
          textLayout: {
            ...current,
            ...refined,
          },
        };

        await pgClient.query(
          'UPDATE creatives SET slides = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [JSON.stringify(slides), req.params.id, tenantId]
        );

        return res.json({
          index: slideIndex,
          textLayout: slides[slideIndex].textLayout,
        });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error('Error refining slide:', error);
      return res.status(500).json({ message: error.message || 'Failed to refine slide' });
    }
  });

  app.post('/api/creatives/:id/slides/:idx/generate-image', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const slideIndex = Number.parseInt(req.params.idx, 10);
      if (!Number.isInteger(slideIndex) || slideIndex < 0) {
        return res.status(400).json({ message: 'idx invalido' });
      }

      const { styleHint } = req.body || {};
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          'SELECT slides FROM creatives WHERE id = $1 AND tenant_id = $2',
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Creative not found' });

        const slides = Array.isArray(rows[0].slides) ? rows[0].slides : [];
        if (!slides[slideIndex]) return res.status(404).json({ message: 'Slide not found' });

        const title = slides[slideIndex]?.textLayout?.title || `Slide ${slideIndex + 1}`;
        const subtitle = slides[slideIndex]?.textLayout?.subtitle || '';
        // Usa o prompt gerado pelo image-prompt-engineer se disponível, senão usa title+subtitle
        const storedPrompt = slides[slideIndex]?.imagePrompt;
        const imagePrompt = storedPrompt || `${title}. ${subtitle}`;
        const imageUrl = await generateSlideImage(imagePrompt, styleHint);

        slides[slideIndex] = {
          ...slides[slideIndex],
          background: {
            ...(slides[slideIndex]?.background || { type: 'image', value: imageUrl }),
            type: 'image',
            value: imageUrl,
          },
          imageGrid: {
            ...(slides[slideIndex]?.imageGrid || {}),
            imageUrl,
          },
        };

        await pgClient.query(
          'UPDATE creatives SET slides = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [JSON.stringify(slides), req.params.id, tenantId]
        );

        return res.json({ imageUrl });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error('Error generating slide image:', error);
      return res.status(500).json({ message: error.message || 'Failed to generate slide image' });
    }
  });

  app.post('/api/creatives/:id/caption', async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { tone } = req.body || {};
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          'SELECT slides FROM creatives WHERE id = $1 AND tenant_id = $2',
          [req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: 'Creative not found' });

        const slides = Array.isArray(rows[0].slides) ? rows[0].slides : [];
        const result = await generateCaptionFromSlides(slides, tone || 'engajamento');
        return res.json(result);
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error('Error generating caption:', error);
      return res.status(500).json({ message: error.message || 'Failed to generate caption' });
    }
  });

  app.put("/api/creatives/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const {
        slides,
        status,
        platform,
        layoutMode,
        fontCombination,
        accentColor,
        instagramHandle,
        profileConfig,
      } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `UPDATE creatives SET
            slides = COALESCE($1, slides),
            status = COALESCE($2, status),
            platform = COALESCE($3, platform),
            layout_mode = COALESCE($4, layout_mode),
            font_combination = COALESCE($5, font_combination),
            accent_color = COALESCE($6, accent_color),
            instagram_handle = COALESCE($7, instagram_handle),
            profile_config = COALESCE($8, profile_config),
            updated_at = NOW()
           WHERE id = $9 AND tenant_id = $10
           RETURNING id, tenant_id as "tenantId", client_id as "clientId", post_id as "postId",
           template_id as "templateId", type, platform,
           layout_mode as "layoutMode", font_combination as "fontCombination",
           accent_color as "accentColor", instagram_handle as "instagramHandle",
           profile_config as "profileConfig", slides, export_urls as "exportUrls",
           status, created_at as "createdAt", updated_at as "updatedAt"`,
          [
            slides ? JSON.stringify(slides) : null,
            status,
            platform,
            layoutMode,
            fontCombination ? JSON.stringify(fontCombination) : null,
            accentColor,
            instagramHandle,
            profileConfig ? JSON.stringify(profileConfig) : null,
            req.params.id,
            tenantId,
          ]
        );
        if (!rows[0]) return res.status(404).json({ message: "Creative not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error updating creative:", error);
      res.status(500).json({ message: error.message || "Failed to update creative" });
    }
  });

  app.put("/api/creatives/:id/export-urls", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const { exportUrls } = req.body;
      const pgClient = await getClientForUser(req.userId);
      try {
        const { rows } = await pgClient.query(
          `UPDATE creatives SET
            export_urls = $1,
            status = 'ready',
            updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3
           RETURNING id, tenant_id as "tenantId", client_id as "clientId", post_id as "postId",
           template_id as "templateId", type, platform,
           layout_mode as "layoutMode", font_combination as "fontCombination",
           accent_color as "accentColor", instagram_handle as "instagramHandle",
           profile_config as "profileConfig", slides, export_urls as "exportUrls",
           status, created_at as "createdAt", updated_at as "updatedAt"`,
          [JSON.stringify(exportUrls || []), req.params.id, tenantId]
        );
        if (!rows[0]) return res.status(404).json({ message: "Creative not found" });
        res.json(rows[0]);
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error updating export URLs:", error);
      res.status(500).json({ message: error.message || "Failed to update export URLs" });
    }
  });

  app.delete("/api/creatives/:id", async (req, res) => {
    try {
      const tenantId = requireTenantId(req, res);
      if (!tenantId) return;

      const pgClient = await getClientForUser(req.userId);
      try {
        const { rowCount } = await pgClient.query(
          `DELETE FROM creatives WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, tenantId]
        );
        if (rowCount === 0) return res.status(404).json({ message: "Creative not found" });
        res.json({ message: "Creative deleted" });
      } finally { pgClient.release(); }
    } catch (error: any) {
      console.error("Error deleting creative:", error);
      res.status(500).json({ message: error.message || "Failed to delete creative" });
    }
  });

  // ==================== TRENDS ROUTES (Apify) ====================
  const { ApifySocialProvider } = await import("./services/apify-social-provider");
  const apifyProvider = new ApifySocialProvider();

  // POST /api/trends/tiktok — busca trends do TikTok Creative Center
  app.post("/api/trends/tiktok", async (req, res) => {
    try {
      const { trendType = "hashtag", countryCode = "BR", period = 7, maxResults = 50 } = req.body;
      const trends = await apifyProvider.fetchTikTokTrends({ trendType, countryCode, period, maxResults });
      res.json({ success: true, count: trends.length, trends });
    } catch (err: any) {
      console.error("[trends/tiktok] Erro:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/trends/instagram — busca posts de uma hashtag no Instagram
  app.post("/api/trends/instagram", async (req, res) => {
    try {
      const { hashtag, maxResults = 30 } = req.body;
      if (!hashtag || typeof hashtag !== "string") {
        return res.status(400).json({ success: false, error: "hashtag é obrigatório" });
      }
      const posts = await apifyProvider.fetchInstagramHashtag({ hashtag, maxResults });
      res.json({ success: true, count: posts.length, posts });
    } catch (err: any) {
      console.error("[trends/instagram] Erro:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/trends/tiktok-hashtag — busca vídeos de uma hashtag no TikTok
  app.post("/api/trends/tiktok-hashtag", async (req, res) => {
    try {
      const { hashtag, maxResults = 30 } = req.body;
      if (!hashtag || typeof hashtag !== "string") {
        return res.status(400).json({ success: false, error: "hashtag é obrigatório" });
      }
      const videos = await apifyProvider.fetchTikTokHashtag({ hashtag, maxResults });
      res.json({ success: true, count: videos.length, videos });
    } catch (err: any) {
      console.error("[trends/tiktok-hashtag] Erro:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dashboard routes
  registerDashboardRoutes(app);

  // Analytics routes
  registerAnalyticsRoutes(app, pool);

  // Start background worker for async post generation
  startPostWorker(pool);

  return httpServer;
}
  