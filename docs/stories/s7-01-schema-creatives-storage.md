# S7-01 — Schema creative_templates + creatives + Storage Bucket

Status: Ready  
Owner: @data-engineer + @devops  
Sprint: 07  
Prioridade: Crítica  
Pontos: 5  
Depende de: Sprint 6 DONE

## Contexto

O módulo de criação visual precisa de duas novas tabelas (templates e criativos gerados) e um bucket no Supabase Storage para armazenar os PNGs exportados. Esta story estabelece toda a infraestrutura de dados para as stories S7-02 a S7-05.

## Escopo

**IN:**
- Migration SQL para `creative_templates` e `creatives`
- Supabase Storage bucket `creatives` com políticas de acesso por tenant
- RLS nas novas tabelas
- Seed de dados: 1 template global de exemplo para validar o schema

**OUT:**
- População completa de templates (S7-03)
- Upload de arquivos (S7-05)
- API endpoints de CRUD (S7-02 cria os endpoints necessários)

## Critérios de Aceite

- [ ] Migration `009_creatives.sql` aplicada sem erro
- [ ] Tabela `creative_templates` com RLS: templates globais (`tenant_id IS NULL`) visíveis para todos; templates de tenant visíveis apenas para o tenant
- [ ] Tabela `creatives` com RLS: isolamento por `tenant_id`
- [ ] Bucket `creatives` criado no Supabase Storage com política de upload autenticado
- [ ] Política de leitura pública de arquivos gerados (para preview de carrossel sem auth)
- [ ] Seed: 1 template global (`is_global = true`) com estrutura válida para 1 slide

## Tarefas

- [ ] Criar `supabase/migrations/009_creatives.sql` — tabelas + RLS + índices
- [ ] Criar `supabase/migrations/009b_storage_bucket.sql` (ou via CLI) — bucket + policies
- [ ] Criar `supabase/seed/creative_templates_seed.sql` — 1 template global de exemplo
- [ ] Documentar estrutura do `structure` JSONB em comentário na migration
- [ ] Verificar que `expires_at` padrão está correto em `creatives` (sem expiração — null)

## Schema (referência completa)

```sql
-- supabase/migrations/009_creatives.sql

-- Templates de carrossel e criativos
CREATE TABLE creative_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
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

CREATE INDEX idx_templates_tenant ON creative_templates(tenant_id);
CREATE INDEX idx_templates_global ON creative_templates(is_global) WHERE is_global = true;

-- RLS: globais visíveis para todos autenticados; privados apenas para o tenant
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read" ON creative_templates FOR SELECT
  USING (is_global = true OR tenant_id = (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1
  ));
CREATE POLICY "templates_write" ON creative_templates FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1
  ));

-- Criativos gerados por cliente
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  template_id UUID REFERENCES creative_templates(id),
  type TEXT NOT NULL CHECK (type IN ('carousel', 'single', 'story', 'ad')),
  platform TEXT NOT NULL DEFAULT 'instagram',
  slides JSONB NOT NULL DEFAULT '[]',
  export_urls JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creatives_client ON creatives(client_id);
CREATE INDEX idx_creatives_post ON creatives(post_id);
CREATE INDEX idx_creatives_tenant ON creatives(tenant_id);

ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creatives_isolation" ON creatives FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1
  ));
```

## Arquivos a Criar/Modificar

- CRIAR: `supabase/migrations/009_creatives.sql`
- CRIAR: `supabase/seed/creative_templates_seed.sql`

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Migration aplicada em staging sem rollback
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Evidências: seed de template consultável via Supabase dashboard
