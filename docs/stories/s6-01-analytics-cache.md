# S6-01 — Schema Analytics Cache + Meta Sync Worker

Status: Ready  
Owner: @data-engineer + @dev  
Sprint: 06  
Prioridade: Crítica  
Pontos: 5  
Depende de: Sprint 5 DONE

## Contexto

O agente de métricas (S6-02) precisa de dados de performance do cliente para gerar insights relevantes. Porém, chamar o Meta API diretamente durante a execução de um job é arriscado (rate limits, latência, tokens expirados).

A solução é um worker assíncrono (`meta-sync-worker.ts`) que sincroniza dados do Meta API em background e os armazena na tabela `client_analytics_cache`. Os agentes leem apenas da cache — nunca do Meta API diretamente.

## Escopo

**IN:**
- Migration SQL para tabela `client_analytics_cache`
- `server/services/meta-sync-worker.ts` — busca insights básicos do Meta e salva na cache
- Endpoint `POST /api/analytics/sync/:clientId` — aciona sync manual com throttle
- Lógica de TTL: dados com menos de 24h não são re-buscados automaticamente
- Suporte a dados mockados/stub para ambiente de desenvolvimento (sem Meta API key)

**OUT:**
- Sync automático via cron (será adicionado quando DevOps configurar scheduler)
- Meta Ads Manager (Sprint 9)
- Outros providers além de Meta

## Critérios de Aceite

- [ ] Migration `008_analytics_cache.sql` aplicada sem erro
- [ ] `meta-sync-worker.ts` busca dados do Meta API e salva em `client_analytics_cache`
- [ ] Se `META_APP_ID` não configurado, worker usa dados stub (evita falha em dev)
- [ ] Endpoint `POST /api/analytics/sync/:clientId` aciona sync e retorna job de sync
- [ ] Throttle: mesmo cliente não pode ser sincronizado mais de 1x por hora via API
- [ ] TTL de 24h: se dados existem e não expiraram, sync retorna cache existente sem chamar Meta
- [ ] `client_analytics_cache` tem índice em `(client_id, platform, period)` para leitura rápida

## Tarefas

- [ ] Criar migration `supabase/migrations/008_analytics_cache.sql`
- [ ] Criar `server/services/meta-sync-worker.ts`
  - [ ] Função `syncClientAnalytics(clientId, tenantId, platform, period)`
  - [ ] Busca token válido de `analytics_tokens`
  - [ ] Chama Meta Graph API: `/{page-id}/insights` (alcance, engajamento, posts)
  - [ ] Processa e salva em `client_analytics_cache`
  - [ ] Gera `insights` JSONB via LLM (síntese em linguagem natural para o agente)
- [ ] Criar endpoint `POST /api/analytics/sync/:clientId` em `server/routes.ts`
- [ ] Criar dados stub para desenvolvimento em `server/services/meta-stub-data.ts`
- [ ] Adicionar índices na migration para queries do agente

## Schema da Migration (referência)

```sql
-- supabase/migrations/008_analytics_cache.sql
CREATE TABLE client_analytics_cache (
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

CREATE INDEX idx_analytics_cache_client ON client_analytics_cache(client_id, platform, period);
CREATE INDEX idx_analytics_cache_expires ON client_analytics_cache(expires_at);

ALTER TABLE client_analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON client_analytics_cache
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));
```

## Arquivos a Criar/Modificar

- CRIAR: `supabase/migrations/008_analytics_cache.sql`
- CRIAR: `server/services/meta-sync-worker.ts`
- CRIAR: `server/services/meta-stub-data.ts`
- MODIFICAR: `server/routes.ts` — endpoint de sync manual

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Migration aplicada em staging sem rollback
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: sync com stub retorna dados estruturados corretamente
- [ ] Evidências: registro em `client_analytics_cache` após sync manual
