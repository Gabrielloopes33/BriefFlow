# Sprint 06 — Agentes Especializados

**Período:** Semanas 3-4  
**Objetivo:** Construir os 3 agentes especializados (métricas, referências, conteúdo) e habilitar execução paralela no executor. Resultado: o board de Fluxo passa a ser um time real, não placeholders.  
**Status:** Pending

## Responsáveis

| Agente | Papel na Sprint |
|---|---|
| @dev | Implementação dos nós, execução paralela, UX do board |
| @data-engineer | Schema + migração meta-sync-worker |
| @architect | Review da arquitetura de nós e merge do AgentState |
| @ux-design-expert | Design do board com linguagem humana |
| @qa | QA Gate + testes de integração do pipeline paralelo |
| @devops | Deploy em staging + monitoramento Langfuse |

## Dependência

> **Requer Sprint 5 DONE** — especialmente S5-02 (Moonshot) e S5-03 (nós custom funcionando)

## Backlog

| ID | Story | Owner | Prioridade | Pontos | Dependências |
|---|---|---|---|---|---|
| S6-01 | Schema analytics_cache + meta-sync-worker | @data-engineer + @dev | Crítica | 5 | Sprint 5 |
| S6-02 | Nó metrics-analyst | @dev | Crítica | 5 | S6-01 |
| S6-03 | Nó references | @dev | Crítica | 5 | Sprint 5 |
| S6-04 | Execução paralela no executor | @dev | Crítica | 8 | S6-02, S6-03 |
| S6-05 | UX do board de Fluxo em linguagem humana | @dev + @ux | Alta | 3 | S6-04 |

**Total de pontos:** 26

## Critério GO/NO-GO da Sprint

- [ ] Pipeline completo: metrics-analyst + references em paralelo → writer → reviewer → post
- [ ] Langfuse mostrando 5 spans por execução (2 paralelos + writer + reviewer + job)
- [ ] client_analytics_cache populada via meta-sync-worker (mesmo que dados mockados para staging)
- [ ] Board de Fluxo mostrando nome amigável de cada agente + status em tempo real
- [ ] Tempo de execução paralela < tempo de execução sequencial (métricas no Langfuse)
- [ ] Zero issues CRITICAL no QA Gate

## Definition of Done da Sprint

- [ ] Todas as 5 stories com status Done
- [ ] QA Gate PASS com testes de integração do pipeline paralelo
- [ ] Deploy em staging com trace completo no Langfuse
- [ ] planejamento-execucao-briefflow.md atualizado

## Referências

- SDD v2: [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md)
- Nós existentes: server/agents/nodes/
- Executor: server/agents/executor.ts
- AgentState: server/agents/state.ts
