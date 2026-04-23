# Runbook S2-04 - Migracao Progressiva e Rollback (Tenant)

Status: Ready for Staging
Sprint: 02
Owner: @devops
Data base: 2026-04-17

## Objetivo
Executar a migracao de tenancy da Sprint 2 em ambiente de staging com estrategia segura de rollback e criterios claros de validacao.

## Escopo da mudanca
1. Aplicacao da migration `supabase/migrations/005_tenant_control_plane.sql`.
2. Validacao de integridade de dados e isolamento por `tenant_id`.
3. Teste de restore a partir de backup antes do GO em producao.

## Pre-requisitos
1. Acesso ao banco staging com permissao de DDL.
2. Variavel `DATABASE_URL` configurada para staging.
3. Janela de manutencao aprovada para aplicacao da migration.
4. Snapshot/backup full do banco realizado e testado.

## Fase 0 - Backup e baseline
### 0.1 Backup full (obrigatorio)
```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file=backup_pre_s2_04.dump
```

### 0.2 Baseline de contagem (auditoria)
```bash
psql "$DATABASE_URL" -c "SELECT 'clients' table_name, COUNT(*) FROM clients
UNION ALL SELECT 'sources', COUNT(*) FROM sources
UNION ALL SELECT 'contents', COUNT(*) FROM contents
UNION ALL SELECT 'briefs', COUNT(*) FROM briefs
UNION ALL SELECT 'analysis_configs', COUNT(*) FROM analysis_configs
UNION ALL SELECT 'knowledge_items', COUNT(*) FROM knowledge_items
UNION ALL SELECT 'analytics_tokens', COUNT(*) FROM analytics_tokens;"
```

## Fase 1 - Aplicacao progressiva
### 1.1 Dry-run sintatico (opcional, recomendado)
Executar em clone/restore local de staging antes da base principal.

### 1.2 Aplicar migration de tenancy
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_tenant_control_plane.sql
```

### 1.3 Validar pos-migracao
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f script/s2-04-tenant-validation.sql
```

## Fase 2 - Smoke test funcional
1. Chamar endpoints core com `x-tenant-id` valido e garantir retorno 2xx.
2. Repetir chamadas sem `x-tenant-id` e garantir retorno 400 (fail-safe).
3. Validar analytics por tenant com contas selecionadas em tenants diferentes.

## Fase 3 - Restore test (rollback drill)
### 3.1 Criar banco de restore temporario
```bash
createdb briefflow_restore_test
```

### 3.2 Restaurar backup
```bash
pg_restore --dbname=postgresql://postgres:postgres@localhost:5432/briefflow_restore_test --clean --if-exists backup_pre_s2_04.dump
```

### 3.3 Validar restore
1. Conferir conectividade.
2. Conferir baseline de contagem das tabelas core.
3. Registrar tempo de restore em minutos.

## Plano de rollback (producao)
### Trigger de rollback
1. Erro bloqueante de migracao.
2. Degradacao severa de API apos deploy.
3. Suspeita de vazamento cross-tenant.

### Passos de rollback
1. Congelar escrita da aplicacao (maintenance mode ou scale down de workers de escrita).
2. Reverter aplicacao para build anterior.
3. Restaurar backup `backup_pre_s2_04.dump` no banco alvo.
4. Executar smoke tests criticos e validar baseline.
5. Reabrir escrita e monitorar por 30 min.

## Criterios de GO staging
1. Migration aplicada sem erro.
2. Checklist SQL de validacao 100% ok.
3. Smoke funcional aprovado.
4. Restore test concluido com evidencias.

## Evidencias obrigatorias
1. Arquivo do backup e checksum.
2. Log da aplicacao da migration.
3. Output da validacao SQL.
4. Log do restore test e tempo total.
5. Decisao final: PASS/CONCERNS/FAIL.
