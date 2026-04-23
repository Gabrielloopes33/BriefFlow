# S2-04 - Plano de Migracao Progressiva com Rollback Validado

Status: InProgress
Owner: @devops
Sprint: 02
Prioridade: Alta

## Contexto
Com a modelagem tenant aplicada, a Sprint 2 precisa fechar com uma estrategia operacional segura de migracao em staging e rollback validado para reduzir risco de producao.

## Escopo
1. Definir e versionar runbook de migracao e rollback.
2. Definir checklist SQL executavel de validacao pos-migracao.
3. Registrar evidencias de backup, aplicacao e restore test.

## Criterios de aceite
- [x] Runbook de migracao/rollback criado
- [x] Checklist SQL de validacao criado
- [ ] Migration executada em staging com sucesso
- [ ] Restore test concluido e registrado
- [ ] Decisao QA registrada (PASS/CONCERNS/FAIL)

## Tarefas
- [x] Criar runbook S2-04
- [x] Criar script SQL de validacao
- [ ] Executar migration em staging
- [ ] Executar restore test
- [ ] Publicar evidencias e decisao final

## Evidencias
- docs/devops/sprint-02-migration-rollback-runbook.md
- script/s2-04-tenant-validation.sql

## Definition of Done
- [ ] Todos os criterios de aceite atendidos
- [ ] Evidencias operacionais anexadas
