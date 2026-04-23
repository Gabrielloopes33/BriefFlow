# S2-01 - Modelagem Control Plane e Data Plane

Status: Done
Owner: @data-engineer
Sprint: 02
Prioridade: Alta

## Contexto
A Sprint 2 exige um modelo multi-tenant consistente para garantir isolamento entre clientes sem bloquear evolucao para tenancy dedicada no futuro.

## Escopo
Implementar a fundacao de tenancy no Postgres:
1. Tabelas de control plane (`tenants`, `tenant_members`).
2. Campo `tenant_id` obrigatorio nas tabelas core do data plane.
3. Backfill de dados historicos e constraints para integridade.
4. Base de RLS orientada por membership de tenant.

## Criterios de aceite
- [x] Tabelas de control plane criadas com PK/FK e indices
- [x] `tenant_id` adicionado nas entidades core com backfill e `NOT NULL`
- [x] FK para `tenants(id)` aplicada nas entidades core
- [x] Funcao de membership criada para suportar politicas de isolamento
- [x] Politicas principais de RLS migradas para escopo de tenant

## Tarefas
- [x] Criar migration de control plane
- [x] Adicionar `tenant_id` no data plane
- [x] Backfill e validar ausencia de `NULL`
- [x] Aplicar constraints e indices por tenant
- [x] Atualizar politicas de isolamento para membership por tenant

## Evidencias
- Migration: supabase/migrations/005_tenant_control_plane.sql

## Definition of Done
- [x] Criterios de aceite atendidos
- [x] Evidencias registradas
