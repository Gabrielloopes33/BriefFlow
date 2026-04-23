# S6-04 — Execução Paralela no Executor

Status: Ready  
Owner: @dev  
Sprint: 06  
Prioridade: Crítica  
Pontos: 8  
Depende de: S6-02, S6-03, S5-03 (node registry)

## Contexto

O executor atual (`server/agents/executor.ts`) processa nós sequencialmente seguindo as edges do grafo. Com os novos agentes de métricas e referências, queremos que ambos rodem em paralelo (não têm dependência entre si) e o Writer receba o estado mergeado dos dois.

Isso reduz a latência total do pipeline: ao invés de metrics (10s) + references (15s) + writer (10s) = 35s, passa a ser max(metrics, references) + writer = ~25s.

## Escopo

**IN:**
- Detecção de nós sem predecessores no grafo (podem rodar em paralelo)
- Execução de nós independentes via `Promise.all`
- Merge determinístico do `AgentState` após execução paralela
- Suporte a grafos mistos (alguns nós paralelos, outros sequenciais)
- Eventos WebSocket corretos para nós paralelos (agent:start emitido para cada nó)

**OUT:**
- Paralelismo dinâmico em runtime (número de workers configurável)
- Cancelamento de nós individuais em paralelo
- Prioridade entre nós paralelos

## Critérios de Aceite

- [ ] Nós sem predecessores (ou com predecessores já completos e sem dependências entre si) rodam em paralelo
- [ ] `Promise.all` usado para aguardar nós paralelos
- [ ] Merge do `AgentState` após paralelo: campos do metrics-analyst e references são mergeados sem sobrescrever campos do outro
- [ ] Se um nó paralelo falha, o outro continua e o estado é mergeado com o que completou
- [ ] Eventos WebSocket: `agent:start` emitido para cada nó no momento que inicia (não todos juntos)
- [ ] Trace no Langfuse mostra spans paralelos com timestamps sobrepostos (evidência visual do paralelismo)
- [ ] Grafo atual (researcher → writer → reviewer) continua funcionando (sequencial, sem regressão)

## Algoritmo de Topological Sort Paralelo (referência)

```typescript
async function executeGraph(state: AgentState, graph: AgentGraph): Promise<AgentState> {
  const { nodes, edges } = graph;
  const completed = new Set<string>();
  let currentState = { ...state };

  while (completed.size < nodes.length) {
    // Encontrar nós prontos: todos os predecessores completados
    const ready = nodes.filter(node =>
      !completed.has(node.id) &&
      getPredecessors(node.id, edges).every(pred => completed.has(pred))
    );

    if (ready.length === 0) break; // Evitar loop infinito em grafos cíclicos

    // Executar nós prontos em paralelo
    const results = await Promise.allSettled(
      ready.map(node => executeNode(node, currentState))
    );

    // Merge dos resultados no estado
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        currentState = mergeState(currentState, result.value);
      } else {
        // Log erro mas continua com outros nós
        broadcastEvent({ type: 'agent:error', nodeId: ready[index].id, error: result.reason.message });
      }
      completed.add(ready[index].id);
    }
  }

  return currentState;
}
```

## Estratégia de Merge do AgentState

O merge após nós paralelos deve ser explícito e não-destrutivo:

```typescript
function mergeState(base: AgentState, partial: Partial<AgentState>): AgentState {
  return {
    ...base,
    ...partial,
    // Arrays: concatenar, não substituir
    sources: [...(base.sources ?? []), ...(partial.sources ?? [])],
    references: [...(base.references ?? []), ...(partial.references ?? [])],
    // Objetos: merge profundo
    analyticsInsights: partial.analyticsInsights ?? base.analyticsInsights,
    metadata: {
      ...base.metadata,
      ...partial.metadata,
      totalTokens: (base.metadata?.totalTokens ?? 0) + (partial.metadata?.totalTokens ?? 0),
    },
  };
}
```

## Arquivos a Criar/Modificar

- MODIFICAR: `server/agents/executor.ts` — implementar topological sort paralelo
- CRIAR: `server/agents/state-merger.ts` — função `mergeState` com testes
- MODIFICAR: `server/agents/executor.ts` — integrar broadcaster WebSocket por nó

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste de integração: grafo com metrics-analyst + references em paralelo → writer → reviewer completa com sucesso
- [ ] Teste de regressão: grafo legado (researcher → writer → reviewer) funciona sem alteração
- [ ] Evidências: trace Langfuse com spans sobrepostos para nós paralelos
- [ ] Evidências: tempo de execução paralela < soma dos tempos sequenciais (log de latência)
