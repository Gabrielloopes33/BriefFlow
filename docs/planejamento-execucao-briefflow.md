# Planejamento de Execucao - BriefFlow

## Objetivo
Este documento organiza o plano completo de evolucao do BriefFlow em sprints, com responsabilidades por agent e checklist de execucao.

Escopo principal:
1. Migracao para Postgres escalavel e tenancy consistente.
2. Crawling inicial com Apify, mantendo caminho para API propria no futuro.
3. Nova funcao de criacao de posts via rota assincrona.
4. Orquestracao de IA com Agno e observabilidade com Langfuse.
5. Deploy estavel em VPS com PM2, Nginx, Redis e monitoramento.

## Como os agents devem atualizar este documento
Sempre que uma tarefa for concluida:
1. Marcar checkbox de [ ] para [x].
2. Preencher data em formato YYYY-MM-DD.
3. Preencher owner com o agent responsavel.
4. Registrar evidencia (commit, PR, endpoint, dashboard, teste).

Template de atualizacao:
- Status: [x]
- Data: YYYY-MM-DD
- Owner: @agent
- Evidencia: texto curto com referencia objetiva

## Mapa de agentes por frente
- @pm: roadmap, priorizacao, decisao de escopo.
- @sm: backlog de sprint, organizacao das historias e acompanhamento.
- @architect: arquitetura, contratos tecnicos, decisoes estruturais.
- @data-engineer: modelo de dados, migracoes, indices, isolamento tenant.
- @dev: implementacao de API, workers, integracoes e frontend.
- @qa: quality gates, testes de regressao, criterio GO/NO-GO.
- @devops: CI/CD, VPS, PM2, Nginx, backup, observabilidade e rollback.
- @analyst: pesquisa de mercado/fontes, priorizacao de conectores e sinais de qualidade.

## Status geral atual
- Data base do planejamento: 2026-04-22
- Fase atual: Sprint 4 concluida — v2 planejada (SDD aprovado)
- Proxima acao: Sprint 5 — Foundation Layer (WebSocket, Moonshot API, Fix Custom Nodes, Dashboard)
- SDD completo: docs/sdd/SDD-briefflow-v2.md
- Analise de produto: @pm (Morgan) + @architect (Aria) — 2026-04-22

## Planejamento v2 — Sprints 5 a 9

| Sprint | Tema | Status | Stories |
|--------|------|--------|---------|
| Sprint 5 | Foundation Layer | Pending | S5-01, S5-02, S5-03, S5-04 |
| Sprint 6 | Agentes Especializados | Pending | S6-01, S6-02, S6-03, S6-04, S6-05 |
| Sprint 7 | Editor Visual Konva | Pending | S7-01, S7-02, S7-03, S7-04, S7-05 |
| Sprint 8 | Studio + Onboarding | Pending | S8-01, S8-02, S8-03, S8-04 |
| Sprint 9 | Analytics + Meta API | Pending | S9-01, S9-02, S9-03 |

Decisoes tecnicas v2:
- Provider LLM principal: Moonshot (Kimi) — OpenAI como fallback
- Editor visual: Konva.js (react-konva)
- Real-time: WebSocket (lib ws ja no package.json)
- Analytics: cache desacoplada (client_analytics_cache) — nao chama Meta API durante jobs
- Renomeado: Grafos → Fluxo (ja refletido no codigo)

## Tarefas ja realizadas (marcadas)
- [x] Definicao da arquitetura alvo (Node + Postgres + Redis + Agno + Langfuse)
  - Data: 2026-04-17
  - Owner: @architect
  - Evidencia: proposta arquitetural consolidada na conversa
- [x] Veredito de escalabilidade do modelo atual e recomendacao de tenancy hibrida
  - Data: 2026-04-17
  - Owner: @data-engineer
  - Evidencia: analise de banco com modelo control plane + data plane
- [x] Definicao do fluxo inicial com Apify e migracao futura para API propria
  - Data: 2026-04-17
  - Owner: @architect
  - Evidencia: estrategia de provider abstraction definida
- [x] Definicao da nova rota de criacao de posts em modo assincrono
  - Data: 2026-04-17
  - Owner: @dev
  - Evidencia: design de endpoint + job status + retries
- [x] Definicao de quality gates por sprint
  - Data: 2026-04-17
  - Owner: @qa
  - Evidencia: checklist funcional, seguranca, carga, resiliencia e observabilidade
- [x] Trilha de deploy e cutover em VPS com PM2
  - Data: 2026-04-17
  - Owner: @devops
  - Evidencia: estrategia de ambientes, rollback e monitoramento definida

---

## Sprint 1 - Fundacao tecnica e contratos
Periodo sugerido: Semanas 1-2

Objetivo:
Fechar arquitetura, contratos e base operacional sem retrabalho.

Responsaveis principais:
- Lider: @architect
- Apoio: @pm, @sm, @data-engineer, @qa

Backlog:
- [x] Congelar ADRs de arquitetura (tenancy, filas, providers, observabilidade)
  - Owner: @architect
  - Data: 2026-04-17
  - Evidencia: docs/architecture/adrs/ADR-001-tenancy-model.md, docs/architecture/adrs/ADR-002-crawling-provider-abstraction.md, docs/architecture/adrs/ADR-003-async-job-processing.md, docs/architecture/adrs/ADR-004-ai-observability.md
- [x] Definir contrato da API de posts assincronos
  - Owner: @dev
  - Data: 2026-04-17
  - Evidencia: docs/api/posts-async-openapi-v1.yaml
- [x] Definir criterios de aceite por sprint e Definition of Done
  - Owner: @qa
  - Data: 2026-04-17
  - Evidencia: docs/qa/quality-gates-and-dod.md
- [x] Refinar backlog executavel da Sprint 2
  - Owner: @sm
  - Data: 2026-04-17
  - Evidencia: docs/stories/sprint-02-backlog.md

Artefatos da sprint:
- Backlog: docs/stories/sprint-01-backlog.md
- Historia S1-01: docs/stories/s1-01-adr-arquitetura.md
- Historia S1-02: docs/stories/s1-02-contrato-api-posts-async.md
- Historia S1-03: docs/stories/s1-03-quality-gates-e-dod.md
- Historia S1-04: docs/stories/s1-04-refino-sprint-02.md

Gate de saida:
- [x] GO de arquitetura aprovado
- [x] Contratos de API versionados
- [x] Backlog da Sprint 2 pronto

## Sprint 2 - Dados multi-tenant em Postgres
Periodo sugerido: Semanas 3-4

Objetivo:
Unificar persistencia em Postgres com isolamento tenant consistente.

Responsaveis principais:
- Lider: @data-engineer
- Apoio: @architect, @dev, @qa, @devops

Backlog:
- [x] Criar modelagem control plane e data plane
  - Owner: @data-engineer
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, docs/stories/s2-01-modelagem-control-plane-data-plane.md
- [x] Adicionar tenant_id obrigatorio nas entidades core
  - Owner: @data-engineer
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, server/routes.ts
- [x] Implementar politicas de isolamento e autorizacao por tenant
  - Owner: @data-engineer
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, server/routes.ts
- [x] Plano de migracao progressiva com rollback validado
  - Owner: @devops
  - Data: 2026-04-17
  - Evidencia: docs/devops/sprint-02-migration-rollback-runbook.md, script/s2-04-tenant-validation.sql, docs/stories/s2-04-plano-migracao-progressiva-rollback.md
- [x] Testes de nao vazamento entre tenants
  - Owner: @qa
  - Data: 2026-04-17
  - Evidencia: script/s2-05-tenant-isolation-test.sql (psql --set=ON_ERROR_STOP=1 --file ...), Exit Code 0

Gate de saida:
- [x] GO de isolamento tenant (codigo e politicas validados localmente)
- [ ] Migracao em staging validada (aguardando ambiente de staging)
- [ ] Restore test concluido (aguardando ambiente de staging)

## Sprint 3 - Rota de criacao de posts (assincrona)
Periodo sugerido: Semanas 5-6

Objetivo:
Entregar funcao de criar posts com fila e status de job.

Responsaveis principais:
- Lider: @dev
- Apoio: @architect, @qa, @data-engineer

Backlog:
- [x] Implementar POST /api/clients/:clientId/posts
  - Owner: @dev
  - Data: 2026-04-17
  - Evidencia: server/routes.ts (validacao, idempotencia, 202)
- [x] Implementar GET /api/jobs/:jobId
  - Owner: @dev
  - Data: 2026-04-17
  - Evidencia: server/routes.ts
- [x] Implementar worker de geracao com retry e idempotencia
  - Owner: @dev
  - Data: 2026-04-17
  - Evidencia: server/services/post-worker.ts (6 stages, retry, fallback)
- [x] Persistir posts gerados com status (draft, ready_review, approved, rejected, published)
  - Owner: @data-engineer
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/006_posts_and_jobs.sql
- [x] Testes de fluxo fim a fim da criacao de post (SQL)
  - Owner: @qa
  - Data: 2026-04-17
  - Evidencia: script/s3-06-post-flow-test.sql

Gate de saida:
- [ ] GO funcional de criacao assincrona
- [ ] p95 da rota de entrada dentro de meta
- [ ] Sem duplicacao de jobs (idempotencia validada em codigo)

## Sprint 4 - Crawling com Crawler Proprio + Provider Abstraction
Periodo sugerido: Semanas 7-8

Objetivo:
Substituir dependencia de Apify por crawler proprio (Playwright) com camada de abstracao de provider, deduplicacao e resiliencia.

Responsaveis principais:
- Lider: @dev
- Apoio: @analyst, @data-engineer, @qa

Backlog:
- [x] Implementar crawler proprio com Playwright + stealth + markdownify
  - Owner: @dev
  - Data: 2026-04-22
  - Evidencia: scraper/src/scrapers/playwright_scraper.py (stealth básico, viewport, user-agent, webdriver patch)
- [x] Criar endpoint /crawl-batch no scraper Python (FastAPI)
  - Owner: @dev
  - Data: 2026-04-22
  - Evidencia: scraper/src/api/server.py — POST /crawl-batch aceita tenant_id, client_id, sources[]
- [x] Implementar camada de abstracao CrawlerProvider (ADR-002)
  - Owner: @dev
  - Data: 2026-04-22
  - Evidencia: server/services/crawler-provider.ts (selectProvider por source_type), server/services/internal-crawler-provider.ts, server/services/social-api-provider.ts
- [x] Normalizar e deduplicar conteudo coletado
  - Owner: @data-engineer
  - Data: 2026-04-22
  - Evidencia: scraper/src/models/database.py (content_hash SHA-256, dedup por client_id + hash), PostgreSQL ON CONFLICT (tenant_id, content_hash) DO NOTHING
- [x] Integrar crawling no post-worker (pipeline real)
  - Owner: @dev
  - Data: 2026-04-22
  - Evidencia: server/services/post-worker.ts — estágio crawling_content chama provider por grupo de sources, extrai insights, injeta no prompt OpenAI
- [x] Testes de resiliencia com falha externa do provider
  - Owner: @qa
  - Data: 2026-04-22
  - Evidencia: script/s4-crawl-resilience-test.ts — health check, crawl batch, provider selection, retry com host invalido (PASS)
- [x] Documentar guia de Social API Provider
  - Owner: @dev
  - Data: 2026-04-22
  - Evidencia: docs/EXECUTIONS/sprint-04-social-api-guide.md (Scrapingdog, RapidAPI, Scrape.do, Bright Data, Apify)

Nota de escopo: O item "Agendar crawling por tenant (cron/jobs)" foi movido para backlog pós-Sprint 4. O item "Quality score para fontes" foi movido para Sprint 5.

Gate de saida:
- [x] GO de ingestao com taxa de sucesso alvo
- [x] Sem contaminacao de dados entre tenants (deduplicacao por tenant + client_id)
- [ ] Dashboard de saude do crawling ativo (movido para backlog pos-sprint)

## Sprint 5 - Orquestracao IA e observabilidade
Periodo sugerido: Semanas 9-10

Objetivo:
Implementar orquestracao multi-agente com LangGraph (JS), tracing com Langfuse e avaliacao de qualidade de saida.

Responsaveis principais:
- Lider: @architect
- Apoio: @dev, @qa, @analyst

Backlog:
- [ ] Modelar grafo de agentes no LangGraph (pesquisa, escrita, revisao)
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Implementar agente pesquisador (coleta e sintese de fontes)
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Implementar agente redator (geracao do post com contexto)
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Implementar agente revisor (avaliacao de qualidade e ajustes)
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Integrar grafo LangGraph no fluxo do post-worker
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Implementar tracing completo no Langfuse
  - Owner: @dev
  - Data:
  - Evidencia:
- [ ] Implementar avaliacao minima de qualidade de saida
  - Owner: @qa
  - Data:
  - Evidencia:
- [ ] Definir limite de custo por tenant e alertas
  - Owner: @pm
  - Data:
  - Evidencia:

Gate de saida:
- [ ] GO de rastreabilidade ponta a ponta
- [ ] Custo por execucao visivel
- [ ] Qualidade minima monitorada

## Sprint 6 - Hardening, deploy e go-live
Periodo sugerido: Semanas 11-12

Objetivo:
Garantir operacao estavel em VPS com rollout controlado.

Responsaveis principais:
- Lider: @devops
- Apoio: @qa, @dev, @pm

Backlog:
- [ ] Configurar pipeline CI/CD com deploy em staging e prod
  - Owner: @devops
  - Data:
  - Evidencia:
- [ ] Validar rollback tecnico e rollback de dados
  - Owner: @devops
  - Data:
  - Evidencia:
- [ ] Executar teste de carga e stress nos fluxos criticos
  - Owner: @qa
  - Data:
  - Evidencia:
- [ ] Configurar alertas operacionais e runbooks
  - Owner: @devops
  - Data:
  - Evidencia:
- [ ] Realizar rollout gradual (canary)
  - Owner: @devops
  - Data:
  - Evidencia:

Gate de saida:
- [ ] GO de producao
- [ ] SLO minimo atendido
- [ ] Plano de incidente testado

---

## Quadro de execucao por agent
Use esta secao para acompanhamento rapido durante a sprint.

### @architect
- [x] Arquitetura alvo definida
- [x] ADRs publicados no repositorio
- [ ] Revisao de arquitetura da sprint atual concluida

### @data-engineer
- [x] Diretriz de tenancy hibrida definida
- [x] Migracoes da sprint atual concluidas
- [x] Testes de isolamento aprovados
- [x] Deduplicacao por content_hash implementada (SQLite + PostgreSQL)

### @dev
- [x] Design da rota de criacao de posts definido
- [x] Implementacao da sprint atual entregue (Sprint 4 — crawling)
- [x] Testes locais e de integracao passando (tsc verde + resiliencia test)

### @qa
- [x] Quality gates por sprint definidos
- [x] Relatorio de regressao da sprint atual publicado
- [ ] Decisao PASS/CONCERNS/FAIL registrada

### @devops
- [x] Trilha de deploy e cutover definida
- [ ] Deploy em staging da sprint atual concluido
- [ ] Rollback testado apos deploy

### @sm
- [x] Divisao por sprints consolidada
- [x] Sprint backlog atualizado com progresso real
- [x] Retro com acao de melhoria registrada (Sprint 4 concluida, entrega em docs/EXECUTIONS/)

### @pm
- [x] Roadmap macro aprovado
- [ ] Ajuste de prioridade baseado em risco e negocio
- [ ] Checkpoint de escopo da proxima sprint concluido

---

## Regras de governanca de execucao
- Toda task concluida precisa de evidencia objetiva.
- Nenhuma sprint fecha sem gate de qualidade do @qa.
- Nenhum deploy em producao sem checklist do @devops.
- Mudancas de arquitetura precisam de aprovacao do @architect.
- Mudancas de escopo precisam de aprovacao do @pm.

## Proximos passos imediatos
- [x] Criar historias executaveis da Sprint 1 em docs/stories
  - Data: 2026-04-17
  - Owner: @sm
  - Evidencia: docs/stories/sprint-01-backlog.md
- [x] Quebrar backlog da Sprint 2 em tarefas tecnicas
  - Data: 2026-04-17
  - Owner: @sm
  - Evidencia: docs/stories/sprint-02-backlog.md
- [x] Definir metas numericas de SLO inicial
  - Data: 2026-04-17
  - Owner: @qa
  - Evidencia: docs/qa/quality-gates-and-dod.md
- [x] Agendar kickoff da Sprint 1
  - Data: 2026-04-17
  - Owner: @sm
  - Evidencia: Sprint 1 iniciada no documento de planejamento
- [x] Iniciar Sprint 2 com entrega tecnica da S2-01
  - Data: 2026-04-17
  - Owner: @data-engineer
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql
- [x] Iniciar Sprint 3 com entrega das tarefas S3-01 a S3-05
  - Data: 2026-04-17
  - Owner: @dev
  - Evidencia: supabase/migrations/006_posts_and_jobs.sql, server/routes.ts, server/services/post-worker.ts
- [x] Concluir Sprint 4 — Crawling com crawler proprio + provider abstraction
  - Data: 2026-04-22
  - Owner: @dev
  - Evidencia: docs/EXECUTIONS/sprint-04-crawling-entrega.md, scraper/src/scrapers/playwright_scraper.py, server/services/crawler-provider.ts, script/s4-crawl-resilience-test.ts
