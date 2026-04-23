# ADR-007 - WebSocket para Feedback em Tempo Real

Status: Proposed
Data: 2026-04-22
Owner: @architect

## Contexto

O sistema atual usa polling HTTP a cada 5s para atualizar o progresso de jobs no frontend. Isso gera carga desnecessária no servidor, consome bandwidth e proporciona uma experiência ruim ao usuário (atualizações lentas, sem granularidade de estágios de agentes). Com a introdução de múltiplos agentes paralelos (Sprint 6), a necessidade de feedback em tempo real torna-se crítica.

## Decisao

1. **Protocolo:** Implementar WebSocket server-side usando a biblioteca `ws` (já presente no `package.json`).
   - Upgrade do HTTP server existente (`server/index.ts`).
   - Mapa de conexões indexado por `userId` para broadcast direcionado.
2. **Eventos:** Emitir eventos tipados durante a execução de jobs:
   - `job:stage` — mudança de estágio do job
   - `agent:start` — início de execução de um nó do grafo
   - `agent:complete` — conclusão de um nó com resumo
   - `agent:error` — erro em um nó específico
   - `job:complete` — job finalizado com sucesso (inclui `postId`)
   - `job:failed` — job falhou (inclui mensagem de erro)
3. **Autenticação:** Handshake WebSocket valida token Supabase via query param `token=`.
   - Conexões não autenticadas são rejeitadas imediatamente.
4. **Fallback:** O frontend tenta WebSocket primeiro; em caso de falha, faz fallback para polling HTTP de 5s (comportamento atual).
   - Nenhuma feature é bloqueada se WebSocket não estiver disponível.
5. **Isolamento:** Eventos são broadcast apenas para o `userId` que iniciou o job.
   - O `tenantId` é validado no handshake para garantir isolamento.

## Justificativa

1. `ws` já está no `package.json` — zero custo de adição de dependência.
2. WebSocket é o padrão de facto para comunicação bidirecional em tempo real.
3. Reduz drasticamente a carga de polling em cenários com múltiplos usuários.
4. Permite granularidade de eventos por nó de agente, não apenas por job.

## Trade-offs

1. WebSocket adiciona estado no servidor (mapa de conexões) — requer gerenciamento de memória.
2. Reconexão automática não é nativa — precisa ser implementada no frontend.
3. Load balancers e proxies podem precisar de configuração especial para suportar WebSocket.

## Consequencias

1. Novo módulo: `server/websocket/ws-server.ts` — setup e gerenciamento de conexões.
2. Novo módulo: `server/websocket/job-broadcaster.ts` — funções de broadcast tipadas.
3. Novo hook frontend: `client/src/hooks/use-job-websocket.ts` — conexão, parse de eventos, fallback.
4. Integração em `server/services/post-worker.ts` — emitir eventos em cada estágio.
5. Integração em `server/agents/executor.ts` — emitir eventos em cada nó do grafo.
6. Langfuse traces devem incluir metadata indicando se o job foi acompanhado via WebSocket.

## Riscos e mitigacoes

1. **Risco:** Vazamento de informação entre tenants via broadcast.
   - **Mitigação:** Isolamento por `userId` + validação de `tenantId` no handshake.
2. **Risco:** Memory leak no mapa de conexões (usuários desconectados sem cleanup).
   - **Mitigação:** Evento `close` e `error` do WebSocket removem a conexão do mapa.
3. **Risco:** Falha de reconexão silenciosa — usuário não recebe updates.
   - **Mitigação:** Fallback automático para polling no frontend; indicador visual de conexão.
4. **Risco:** Múltiplas conexões do mesmo usuário (tabs diferentes).
   - **Mitigação:** Suportar múltiplas conexões por `userId` (array de sockets no mapa).

## Checklist de seguranca

- [ ] Token validado no handshake (não apenas parseado)
- [ ] Conexões não autenticadas rejeitadas com código 1008 (policy violation)
- [ ] Dados de job não expostos em broadcast para usuários diferentes
- [ ] Rate limiting de conexões por IP/userId
