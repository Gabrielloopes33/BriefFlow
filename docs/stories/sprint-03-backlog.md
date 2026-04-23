# Sprint 03 Backlog - Rota de Criacao de Posts (Assincrona)

Status: In Progress
Periodo sugerido: 2026-05-15 a 2026-05-28

## Objetivo da Sprint
Entregar funcao de criar posts com fila e status de job, garantindo idempotencia, retry e rastreabilidade.

## Historias da Sprint
- [x] S3-01 - Migration posts e jobs
  - Owner: @data-engineer
  - Prioridade: Alta
  - Dependencias: S2-01, S2-02, S2-03
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/006_posts_and_jobs.sql
- [x] S3-02 - Rota POST /api/clients/:clientId/posts
  - Owner: @dev
  - Prioridade: Alta
  - Dependencias: S3-01
  - Data: 2026-04-17
  - Evidencia: server/routes.ts (endpoint aceita payload, valida idempotencia, retorna 202)
- [x] S3-03 - Rota GET /api/jobs/:jobId
  - Owner: @dev
  - Prioridade: Alta
  - Dependencias: S3-01
  - Data: 2026-04-17
  - Evidencia: server/routes.ts
- [x] S3-04 - Worker de geracao com retry e idempotencia
  - Owner: @dev
  - Prioridade: Alta
  - Dependencias: S3-02
  - Data: 2026-04-17
  - Evidencia: server/services/post-worker.ts (6 stages, retry, fallback OpenAI)
- [x] S3-05 - Persistir posts gerados com status
  - Owner: @data-engineer
  - Prioridade: Alta
  - Dependencias: S3-04
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/006_posts_and_jobs.sql (status enum: draft, ready_review, approved, rejected, published)
- [x] S3-06 - Testes de fluxo fim a fim da criacao de post (SQL)
  - Owner: @qa
  - Prioridade: Alta
  - Dependencias: S3-04, S3-05
  - Data: 2026-04-17
  - Evidencia: script/s3-06-post-flow-test.sql (5 checks: job creation, idempotency, post link, tenant isolation, RLS)

## Gate de saida da Sprint 3
- [ ] GO funcional de criacao assincrona
- [ ] p95 da rota de entrada dentro de meta (< 500ms)
- [ ] Sem duplicacao de jobs (idempotencia validada)

## Evidencias esperadas
- DDL e migracoes versionadas
- Rotas implementadas e documentadas no OpenAPI
- Worker processando jobs com logs
- Relatorio de testes fim a fim
