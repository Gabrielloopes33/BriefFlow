# ADR-008 - Cache de Analytics Desacoplado dos Agentes

Status: Proposed
Data: 2026-04-22
Owner: @architect

## Contexto

Os agentes de geração de conteúdo precisam de dados de performance do cliente (Meta Insights) para produzir conteúdo contextualizado e otimizado. Chamar a Meta API diretamente durante a execução de um job introduz riscos: rate limits da Meta, tokens OAuth expirados, latência variável da API externa. A execução de um job não pode falhar por indisponibilidade de API de terceiro.

## Decisao

1. **Worker Separado:** Criar `meta-sync-worker.ts` que sincroniza dados do Meta API em background.
   - Executa em intervalo configurável (ex: a cada 24h).
   - Pode ser acionado manualmente ou automaticamente se cache estiver expirada.
2. **Tabela de Cache:** `client_analytics_cache` armazena os dados sincronizados.
   - Schema: `tenant_id`, `client_id`, `platform`, `period`, `raw_data` (JSONB), `insights` (JSONB), `fetched_at`, `expires_at`.
   - Índice composto em `(client_id, platform, period)` para leitura rápida.
   - TTL padrão: 24h.
3. **Leitura dos Agentes:** Os agentes (especialmente `metrics-analyst` node) leem **apenas** da cache.
   - Nunca chamam o Meta API diretamente.
   - Se cache vazia ou expirada, retornam `dataSource: 'empty'` e continuam sem bloquear.
4. **Síntese de Insights:** O `meta-sync-worker` usa Moonshot para gerar `insights` em linguagem natural a partir dos `raw_data`.
   - Ex: "Posts em formato carrossel têm 40% mais engajamento; melhor horário: 19h-21h".

## Justificativa

1. Protege o pipeline de geração de falhas externas (rate limits, tokens expirados, latência).
2. A execução de um job é determinística — não depende de disponibilidade de API de terceiro.
3. Permite pré-processamento e síntese inteligente dos dados brutos (via LLM) antes do consumo pelos agentes.
4. Facilita testes e desenvolvimento local (cache pode ser populada com dados mockados).

## Trade-offs

1. Dados podem estar desatualizados em até 24h (mitigado por refresh manual).
2. Complexidade operacional adicional: mais um worker para monitorar.
3. Armazenamento adicional no PostgreSQL (JSONB pode crescer).

## Consequencias

1. Nova migration SQL: `supabase/migrations/008_analytics_cache.sql`.
2. Novo worker: `server/services/meta-sync-worker.ts`.
3. Extensão do `AgentState` em `server/agents/state.ts` com campo `analyticsInsights`.
4. Novo nó de agente na Sprint 6: `metrics-analyst.ts` — lê e sintetiza dados da cache.
5. RLS policies necessárias para `client_analytics_cache` (tenant isolation).

## Riscos e mitigacoes

1. **Risco:** Meta API: permissões por tipo de conta variam.
   - **Mitigação:** Começar apenas com Page Insights (escopo mínimo); Ads Manager em sprint posterior.
2. **Risco:** Cache expirada e job iniciando — delay no primeiro job do dia.
   - **Mitigação:** Trigger de refresh automático se cache expirada; job continua com `dataSource: 'empty'`.
3. **Risco:** Crescimento descontrolado da tabela de cache.
   - **Mitigação:** Política de retenção (ex: manter apenas últimos 3 períodos por cliente); cleanup periódico.
4. **Risco:** Síntese LLM dos insights gera informação incorreta.
   - **Mitigação:** Prompt estruturado com exemplos; validação de schema no output; fallback para dados brutos.

## Checklist de seguranca

- [ ] Tokens OAuth nunca armazenados em cache (apenas em `analytics_tokens`)
- [ ] RLS policy `tenant_isolation` em `client_analytics_cache`
- [ ] Dados de analytics não expostos em logs de worker
- [ ] Cache invalidada automaticamente em caso de revogação de token
