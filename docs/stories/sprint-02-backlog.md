# Sprint 02 Backlog - Dados Multi-tenant em Postgres

Status: Ready
Periodo sugerido: 2026-05-01 a 2026-05-14

## Objetivo da Sprint
Unificar persistencia em Postgres com isolamento tenant consistente e migracao segura.

## Historias da Sprint
- [x] S2-01 - Modelagem control plane e data plane
  - Owner: @data-engineer
  - Prioridade: Alta
  - Dependencias: ADR-001
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, docs/stories/s2-01-modelagem-control-plane-data-plane.md
- [x] S2-02 - Tenant_id obrigatorio nas entidades core
  - Owner: @data-engineer
  - Prioridade: Alta
  - Dependencias: S2-01
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, server/routes.ts
- [x] S2-03 - Politicas de isolamento e ownership por tenant
  - Owner: @data-engineer
  - Prioridade: Alta
  - Dependencias: S2-01, S2-02
  - Data: 2026-04-17
  - Evidencia: supabase/migrations/005_tenant_control_plane.sql, server/routes.ts
- [x] S2-04 - Plano de migracao progressiva e rollback
  - Owner: @devops
  - Prioridade: Alta
  - Dependencias: S2-01
  - Data: 2026-04-17
  - Evidencia: docs/devops/sprint-02-migration-rollback-runbook.md, script/s2-04-tenant-validation.sql, docs/stories/s2-04-plano-migracao-progressiva-rollback.md
- [x] S2-05 - Testes de nao vazamento entre tenants
  - Owner: @qa
  - Prioridade: Alta
  - Dependencias: S2-03, S2-04
  - Data: 2026-04-17
  - Evidencia: script/s2-05-tenant-isolation-test.sql (4 checks: explicit filter, cross-tenant ID lookup, membership validation, RLS function)

## Sequencia de execucao
1. S2-01
2. S2-02
3. S2-03
4. S2-04
5. S2-05

## Gate de saida da Sprint 2
- [ ] GO de isolamento tenant
- [ ] Migracao em staging validada
- [ ] Restore test concluido

## Evidencias esperadas
- DDL e migracoes versionadas
- Relatorio de testes de isolamento
- Runbook de migracao/rollback
