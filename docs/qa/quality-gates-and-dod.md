# Quality Gates e Definition of Done - BriefFlow

Data: 2026-04-17
Owner: @qa
Status: Ativo

## Objetivo
Padronizar criterios de aprovacao de sprint e Definition of Done para backend, dados e devops.

## Decisao GO/CONCERNS/FAIL
- PASS/GO: todos os bloqueantes atendidos.
- CONCERNS: sem bloqueante, mas com risco medio documentado e plano de mitigacao.
- FAIL: qualquer bloqueante pendente.

## Bloqueantes globais
1. Vazamento entre tenants.
2. Falha de autenticacao/autorizacao em endpoint protegido.
3. Falta de evidencia minima de testes dos fluxos criticos.
4. Falta de observabilidade para diagnostico de erro em producao.

## Checklist por categoria
### Funcional
- Fluxos criticos da sprint funcionando fim a fim.
- Contratos de API atualizados.

### Seguranca
- Ownership por tenant validada em leitura/escrita.
- Segredos fora de codigo.

### Isolamento tenant
- Testes negativos cobrindo acesso indevido.
- Sem cross-tenant data leak.

### Carga e resiliencia
- Retry com backoff para falhas transientes.
- Timeouts definidos para dependencias externas.

### Observabilidade
- Logs estruturados com trace_id e tenant_id.
- Metrica de sucesso/erro por fluxo principal.

## Definition of Done (backend)
- Criterios de aceite da historia cumpridos.
- Testes unitarios/integracao do escopo passando.
- Sem erro bloqueante aberto.
- Evidencia registrada na historia.

## Definition of Done (dados)
- Migracao validada em staging.
- Plano de rollback documentado.
- Indices e constraints revisados para o caso de uso.

## Definition of Done (devops)
- Deploy em staging realizado.
- Rollback testado para o release.
- Alertas basicos do fluxo alterado ativos.

## Template de evidencia por historia
- Data:
- Owner:
- Link do artefato:
- Evidencia de teste:
- Decisao QA: PASS/CONCERNS/FAIL

## SLO inicial (baseline)
- Disponibilidade API: >= 99.5%
- p95 endpoint de criacao de job: <= 300ms
- Taxa de sucesso de jobs: >= 95%
- Tempo medio de conclusao de job: <= 120s
