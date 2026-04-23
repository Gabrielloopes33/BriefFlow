-- Migration: Analytics Cache (Sprint 6 - S6-01)
-- Tabela para cache de dados de performance do Meta API
-- Desacoplada dos agentes — os agentes leem apenas da cache

CREATE TABLE IF NOT EXISTS client_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'meta',
  period TEXT NOT NULL DEFAULT '30d',
  raw_data JSONB NOT NULL DEFAULT '{}',
  insights JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(client_id, platform, period)
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_client ON client_analytics_cache(client_id, platform, period);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON client_analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_tenant ON client_analytics_cache(tenant_id);

ALTER TABLE client_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_analytics_cache_select" ON client_analytics_cache FOR SELECT
  USING (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_analytics_cache_insert" ON client_analytics_cache FOR INSERT
  WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_analytics_cache_update" ON client_analytics_cache FOR UPDATE
  USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_analytics_cache_delete" ON client_analytics_cache FOR DELETE
  USING (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE client_analytics_cache IS 'Cache de analytics do Meta API para consumo dos agentes de IA';
