-- Migration: tenant control plane + tenant_id mandatory in core data plane tables
-- Sprint 2 kickoff (S2-01 + base for S2-02/S2-03)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CONTROL PLANE
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  isolation_mode TEXT NOT NULL DEFAULT 'shared' CHECK (isolation_mode IN ('shared', 'dedicated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);

-- Seed one shared tenant per existing user (based on historical client ownership).
INSERT INTO tenants (owner_user_id, name, slug, isolation_mode)
SELECT DISTINCT
  c.user_id,
  'Tenant ' || SUBSTRING(c.user_id::text, 1, 8),
  'tenant-' || SUBSTRING(c.user_id::text, 1, 8),
  'shared'
FROM clients c
WHERE c.user_id IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT t.id, t.owner_user_id, 'owner'
FROM tenants t
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- DATA PLANE
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE analysis_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE analytics_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from ownership/client lineage.
UPDATE clients c
SET tenant_id = t.id
FROM tenants t
WHERE c.tenant_id IS NULL
  AND c.user_id = t.owner_user_id;

UPDATE sources s
SET tenant_id = c.tenant_id
FROM clients c
WHERE s.tenant_id IS NULL
  AND s.client_id = c.id;

UPDATE contents ct
SET tenant_id = c.tenant_id
FROM clients c
WHERE ct.tenant_id IS NULL
  AND ct.client_id = c.id;

UPDATE briefs b
SET tenant_id = c.tenant_id
FROM clients c
WHERE b.tenant_id IS NULL
  AND b.client_id = c.id;

UPDATE analysis_configs ac
SET tenant_id = c.tenant_id
FROM clients c
WHERE ac.tenant_id IS NULL
  AND ac.client_id = c.id;

UPDATE knowledge_items ki
SET tenant_id = c.tenant_id
FROM clients c
WHERE ki.tenant_id IS NULL
  AND ki.client_id = c.id;

UPDATE analytics_tokens at
SET tenant_id = t.id
FROM tenants t
WHERE at.tenant_id IS NULL
  AND at.user_id = t.owner_user_id;

-- Enforce mandatory tenant_id after backfill.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM clients WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: clients still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM sources WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: sources still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM contents WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: contents still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM briefs WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: briefs still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM analysis_configs WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: analysis_configs still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM knowledge_items WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: knowledge_items still have NULL tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM analytics_tokens WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: analytics_tokens still have NULL tenant_id';
  END IF;
END $$;

ALTER TABLE clients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sources ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE briefs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE analysis_configs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE knowledge_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE analytics_tokens ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_tenant_id_fkey') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sources_tenant_id_fkey') THEN
    ALTER TABLE sources ADD CONSTRAINT sources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contents_tenant_id_fkey') THEN
    ALTER TABLE contents ADD CONSTRAINT contents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'briefs_tenant_id_fkey') THEN
    ALTER TABLE briefs ADD CONSTRAINT briefs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_configs_tenant_id_fkey') THEN
    ALTER TABLE analysis_configs ADD CONSTRAINT analysis_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_items_tenant_id_fkey') THEN
    ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_tokens_tenant_id_fkey') THEN
    ALTER TABLE analytics_tokens ADD CONSTRAINT analytics_tokens_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sources_tenant_id ON sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contents_tenant_id ON contents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefs_tenant_id ON briefs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_configs_tenant_id ON analysis_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_tenant_id ON knowledge_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_tokens_tenant_id ON analytics_tokens(tenant_id);

-- ISOLATION HELPERS + RLS
CREATE OR REPLACE FUNCTION current_user_is_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  );
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can select own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

DROP POLICY IF EXISTS "Users can insert own sources" ON sources;
DROP POLICY IF EXISTS "Users can select own sources" ON sources;
DROP POLICY IF EXISTS "Users can update own sources" ON sources;
DROP POLICY IF EXISTS "Users can delete own sources" ON sources;

DROP POLICY IF EXISTS "Users can insert own contents" ON contents;
DROP POLICY IF EXISTS "Users can select own contents" ON contents;
DROP POLICY IF EXISTS "Users can update own contents" ON contents;
DROP POLICY IF EXISTS "Users can delete own contents" ON contents;

DROP POLICY IF EXISTS "Users can insert own briefs" ON briefs;
DROP POLICY IF EXISTS "Users can select own briefs" ON briefs;
DROP POLICY IF EXISTS "Users can update own briefs" ON briefs;
DROP POLICY IF EXISTS "Users can delete own briefs" ON briefs;

DROP POLICY IF EXISTS "Users can insert own configs" ON analysis_configs;
DROP POLICY IF EXISTS "Users can select own configs" ON analysis_configs;
DROP POLICY IF EXISTS "Users can update own configs" ON analysis_configs;
DROP POLICY IF EXISTS "Users can delete own configs" ON analysis_configs;

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id AND current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own clients" ON clients
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can insert own sources" ON sources
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own sources" ON sources
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own sources" ON sources
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own sources" ON sources
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can insert own contents" ON contents
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own contents" ON contents
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own contents" ON contents
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own contents" ON contents
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can insert own briefs" ON briefs
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own briefs" ON briefs
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own briefs" ON briefs
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own briefs" ON briefs
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can insert own configs" ON analysis_configs
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own configs" ON analysis_configs
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own configs" ON analysis_configs
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own configs" ON analysis_configs
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can manage own knowledge_items" ON knowledge_items
  FOR ALL USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can manage own analytics_tokens" ON analytics_tokens
  FOR ALL USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can read own tenants" ON tenants
  FOR SELECT USING (current_user_is_tenant_member(id));

CREATE POLICY "Users can manage own tenant membership" ON tenant_members
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE tenants IS 'Control plane de tenancy: cadastro e modo de isolamento do tenant';
COMMENT ON TABLE tenant_members IS 'Mapa de membership e role de usuarios por tenant';
