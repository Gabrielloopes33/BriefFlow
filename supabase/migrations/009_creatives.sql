-- Migration: Creatives + Creative Templates (Sprint 7 - S7-01)
-- Tabelas para editor visual Konva: templates e criativos gerados
-- Depende de: tenants, clients, posts (migrações anteriores)

-- ============================================================
-- TABELA: creative_templates
-- Templates de carrossel e criativos (globais e por tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS creative_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = template global visível para todos
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'single', 'story', 'ad')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'universal')),
  slides_count INTEGER NOT NULL DEFAULT 1,
  structure JSONB NOT NULL DEFAULT '{"width":1080,"height":1080,"slides":[]}',
  thumbnail_url TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON creative_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_global ON creative_templates(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_templates_active ON creative_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_type_platform ON creative_templates(type, platform);

-- RLS: globais visíveis para todos autenticados; privados apenas para o tenant
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read" ON creative_templates FOR SELECT
  USING (is_global = true OR current_user_is_tenant_member(tenant_id));

CREATE POLICY "templates_write" ON creative_templates FOR ALL
  USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE creative_templates IS 'Templates de carrossel/criativos para o editor Konva. is_global=true visível para todos os tenants.';
COMMENT ON COLUMN creative_templates.structure IS 'Estrutura JSON do template: {width, height, slides: [{id, index, background, layers: [{id, type, x, y, width, height, ...}]}]}';

-- ============================================================
-- TABELA: creatives
-- Criativos gerados por cliente (vinculados a post e template)
-- ============================================================
CREATE TABLE IF NOT EXISTS creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES creative_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'single', 'story', 'ad')),
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'universal')),
  slides JSONB NOT NULL DEFAULT '[]',
  export_urls JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_creatives_client ON creatives(client_id);
CREATE INDEX IF NOT EXISTS idx_creatives_post ON creatives(post_id);
CREATE INDEX IF NOT EXISTS idx_creatives_tenant ON creatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creatives_template ON creatives(template_id);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);

-- RLS: isolamento por tenant
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creatives_isolation" ON creatives FOR ALL
  USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE creatives IS 'Criativos gerados pelo visual-formatter e editados no editor Konva.';
COMMENT ON COLUMN creatives.slides IS 'Array de slides no formato do editor Konva: [{id, index, background, layers: [...]}]';
COMMENT ON COLUMN creatives.export_urls IS 'URLs públicas dos PNGs exportados para o Supabase Storage';
