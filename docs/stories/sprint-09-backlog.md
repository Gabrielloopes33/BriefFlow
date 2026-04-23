# Sprint 09 — Analytics + Meta API

**Período:** Semanas 10-12  
**Objetivo:** Conectar dados reais do Meta API ao pipeline de agentes, fechar o loop de performance → conteúdo → performance. Dashboard de analytics passa a exibir dados reais.  
**Status:** Pending

## Responsáveis

| Agente | Papel na Sprint |
|---|---|
| @dev | OAuth completo, sync worker, dashboard |
| @data-engineer | Schema + migrações de analytics |
| @architect | Review da integração Meta API e estratégia de rate limit |
| @qa | QA Gate + testes com contas sandbox do Meta |
| @devops | Configuração de webhooks Meta + variáveis de ambiente |

## Dependência

> **Requer Sprint 6 DONE** — metrics-analyst node (S6-02) já implementado e aguardando dados reais da cache

## Backlog

| ID | Story | Owner | Prioridade | Pontos | Dependências |
|---|---|---|---|---|---|
| S9-01 | Meta OAuth completo + refresh automático de token | @dev | Crítica | 8 | Sprint 6 |
| S9-02 | Meta Sync Worker — insights orgânicos + cache 24h | @dev + @data-engineer | Crítica | 13 | S9-01 |
| S9-03 | Dashboard de Analytics com dados reais | @dev | Alta | 8 | S9-02 |

**Total de pontos:** 29

## Escopo do Meta API nesta Sprint (Mínimo Viável)

**IN (escopo desta sprint):**
- Page Insights: alcance, impressões, engajamento por post
- Top posts por tipo (reel, carrossel, foto) nos últimos 30 dias
- Refresh automático de token (token de longa duração: 60 dias)

**OUT (sprints futuras):**
- Meta Ads Manager (outra categoria de permissão, mais complexo)
- Instagram Stories Analytics
- Webhook de tempo real do Meta

## Estratégia de Rate Limit

- Meta Graph API: 200 chamadas/hora por token de usuário
- Implementar exponential backoff no sync worker
- Sync executado máximo 1x por cliente por dia (TTL 24h)
- Sync manual acionável pelo usuário (throttled: máx 1x por hora por cliente)

## Critério GO/NO-GO da Sprint

- [ ] OAuth Meta completo: connect → callback → token salvo → refresh automático funcional
- [ ] meta-sync-worker popula client_analytics_cache com dados reais de ao menos 1 página Meta
- [ ] metrics-analyst node retorna insights baseados em dados reais (não mock)
- [ ] Dashboard de Analytics exibe: alcance, engajamento, top 3 posts por tipo
- [ ] Refresh manual de dados funciona com throttle correto
- [ ] Zero issues CRITICAL no QA Gate

## Definition of Done da Sprint

- [ ] Todas as 3 stories com status Done
- [ ] QA Gate PASS com conta sandbox Meta
- [ ] Deploy em staging com variáveis Meta configuradas
- [ ] Documentação de setup da integração Meta (para devops + novos devs)
- [ ] planejamento-execucao-briefflow.md atualizado com Sprint 9 Done

## Referências

- SDD v2: [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md)
- ADR-008 (Cache analytics): [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md#adr-008-cache-de-analytics-desacoplado-dos-agentes)
- Analytics routes existentes: server/routes.ts (GET /api/analytics/*)
- Analytics tokens: tabela analytics_tokens (migration 006)
