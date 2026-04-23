# Sprint 05 — Foundation Layer

**Período:** Semanas 1-2  
**Objetivo:** Estabelecer a infraestrutura técnica que desbloqueia todas as sprints seguintes. Sem features visíveis ao usuário final — foco em correções críticas e substituição de provider LLM.  
**Status:** Pending

## Responsáveis

| Agente | Papel na Sprint |
|---|---|
| @dev | Implementação principal (todas as stories) |
| @architect | Revisão técnica das ADRs 005-008, review de PR |
| @data-engineer | Migração da tabela client_analytics_cache |
| @qa | QA Gate no final da sprint |
| @devops | Deploy em staging após QA Gate PASS |

## Backlog

| ID | Story | Owner | Prioridade | Pontos | Dependências |
|---|---|---|---|---|---|
| S5-01 | WebSocket real-time para progresso de jobs | @dev | Crítica | 5 | — |
| S5-02 | Moonshot API como provider LLM principal | @dev | Crítica | 3 | — |
| S5-03 | Correção de nós custom no FluxoBuilder | @dev | Crítica | 5 | — |
| S5-04 | Dashboard como Central de Comando | @dev | Alta | 3 | — |

**Total de pontos:** 16

## Critério GO/NO-GO da Sprint

- [ ] WebSocket emite eventos de progresso end-to-end (job → frontend)
- [ ] Moonshot API gerando conteúdo com fallback funcional para OpenAI
- [ ] Nós custom no board de Fluxo executam sem erro
- [ ] Dashboard exibe jobs recentes e quick actions por cliente
- [ ] Zero issues CRITICAL no QA Gate
- [ ] Langfuse registrando traces com modelo Moonshot

## Definition of Done da Sprint

- [ ] Todas as 4 stories com status Done
- [ ] QA Gate PASS (@qa)
- [ ] Deploy em staging sem rollback (@devops)
- [ ] Migração client_analytics_cache aplicada
- [ ] planejamento-execucao-briefflow.md atualizado

## Referências

- SDD v2: [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md)
- ADR-005 (Moonshot): a criar em docs/architecture/adrs/
- ADR-007 (WebSocket): a criar em docs/architecture/adrs/
