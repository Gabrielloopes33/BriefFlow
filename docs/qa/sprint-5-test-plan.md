# Plano de Testes — Sprint 5: Foundation Layer

**Projeto:** BriefFlow v2  
**Sprint:** 05 — Foundation Layer  
**Owner QA:** @qa (Quinn)  
**Data:** 2026-04-22  
**Status:** Rascunho → Pronto para execução  

---

## 1. Resumo Executivo

Esta sprint estabelece a fundação técnica para as sprints subsequentes (Agentes Especializados, Editor Visual Konva, Studio). As 4 stories cobrem: comunicação real-time (WebSocket), troca de provider LLM (Moonshot), correção de arquitetura de nós (registry pattern) e redesign do Dashboard.

**Observação crítica sobre maturidade de testes:** O projeto não possui framework de testes configurado (sem Jest, Vitest, Playwright ou Cypress no package.json). Os scripts de teste no package.json são inexistentes. Isso representa um risco de qualidade **ALTO** que deve ser mitigado nesta sprint.

---

## 2. Estrutura de Testes do Projeto (Baseline)

| Aspecto | Estado Atual | Impacto |
|---|---|---|
| Framework unitário | ❌ Nenhum | Necessário instalar/configurar |
| Framework E2E | ❌ Nenhum | Testes manuais ou instalar Playwright |
| Scripts de teste no package.json | ❌ Ausentes | Adicionar `test`, `test:unit`, `test:e2e` |
| Cobertura atual | 0% | Baseline a estabelecer |
| Testes existentes | ❌ Nenhum no escopo da aplicação | Criar do zero para S5 |

**Recomendação QA:** Adicionar `vitest` (compatível com Vite já usado no projeto) para testes unitários/integração no backend e frontend. Playwright para E2E opcional nesta sprint dado o prazo de 2 semanas.

---

## 3. Test Design Document — S5-01: WebSocket Real-Time

### 3.1 Escopo de Teste

| Camada | Componentes |
|---|---|
| Backend | `ws-server.ts`, `job-broadcaster.ts`, integração em `post-worker.ts` e `executor.ts` |
| Frontend | `useJobWebSocket.ts`, componente de progresso |
| Integração | Handshake auth, fallback polling, múltiplos tenants |

### 3.2 Cenários de Teste (Given-When-Then)

#### CT-S5-01-001: Conexão WebSocket autenticada com token válido
- **Given:** Um usuário autenticado com token Supabase válido
- **When:** O frontend inicia conexão WebSocket passando `?token=<jwt>`
- **Then:** O servidor aceita a conexão e associa ao `userId` + `tenantId`
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-01-002: Rejeição de conexão sem token
- **Given:** Uma requisição WebSocket sem query param `token`
- **When:** O servidor recebe o handshake
- **Then:** A conexão é fechada com código 1008 (policy violation)
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-01-003: Emissão de eventos durante execução de job
- **Given:** Um job em execução com WebSocket conectado
- **When:** O job avança de estágio (ex: `validating_input` → `fetching_sources`)
- **Then:** O cliente recebe evento `job:stage` com `jobId`, `stage` e `progress`
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-01-004: Eventos de agente (start/complete/error)
- **Given:** Um grafo de agentes em execução via executor
- **When:** Cada nó inicia, completa ou falha
- **Then:** Eventos `agent:start`, `agent:complete`, `agent:error` são emitidos com `nodeId` e `agentName`
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-01-005: Fallback para polling quando WebSocket falha
- **Given:** Um cliente com WebSocket desconectado (server indisponível)
- **When:** O hook detecta desconexão
- **Then:** O frontend inicia polling HTTP a cada 5s automaticamente sem recarregar a página
- **Tipo:** E2E
- **Prioridade:** Alta

#### CT-S5-01-006: Isolamento por tenant com múltiplos clientes
- **Given:** Dois usuários de tenants diferentes conectados via WebSocket
- **When:** Um job do tenant A emite evento
- **Then:** Apenas o usuário do tenant A recebe o evento; tenant B não recebe
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-01-007: Job completo emite evento final
- **Given:** Um job próximo à conclusão
- **When:** O job finaliza com sucesso
- **Then:** Evento `job:complete` com `postId` é emitido; Langfuse trace contém metadata `websocket: true`
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-01-008: Job falho emite evento de erro
- **Given:** Um job que vai falhar (ex: grafo inválido)
- **When:** O job falha
- **Then:** Evento `job:failed` com `error` é emitido; cliente mostra estado de erro
- **Tipo:** Integration
- **Prioridade:** Alta

### 3.3 Estratégia de Teste

| Tipo | Ferramenta | Escopo |
|---|---|---|
| Unit | vitest | `job-broadcaster.ts` (funções puras de broadcast), parser de eventos |
| Integration | vitest + `ws` mock | `ws-server.ts` com autenticação, múltiplas conexões |
| E2E | Manual / Playwright (opcional) | Fluxo completo: criar job → acompanhar progresso → ver post gerado |

### 3.4 Dados de Teste

```typescript
// Mock de job para testes
const mockJob = {
  id: 'job-test-001',
  tenant_id: 'tenant-a',
  client_id: 'client-1',
  user_id: 'user-1',
  status: 'processing',
  stage: 'drafting_post',
  progress: 60,
  payload: { goal: 'authority', channels: ['blog'] }
};

// Token JWT mock (para teste de auth)
const mockValidToken = 'eyJhbGciOiJIUzI1NiIs...'; // gerar com mesmo secret do Supabase
const mockInvalidToken = 'invalid-token';
```

### 3.5 Riscos de Qualidade

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Memory leak no mapa de conexões (ws-server) | Média | Alto | Teste de carga: 100 conexões simultâneas, verificar memória antes/depois |
| Race condition entre broadcast e atualização DB | Média | Médio | Teste de integração com job rápido (< 1s) |
| Fallback polling quebra após reconexão WS | Baixa | Alto | Teste de reconexão: desconectar WS, verificar polling, reconectar WS, verificar se polling para |

---

## 4. Test Design Document — S5-02: Moonshot API como Provider LLM Principal

### 4.1 Escopo de Teste

| Camada | Componentes |
|---|---|
| Backend | `server/services/llm-provider.ts`, `researcher.ts`, `writer.ts`, `reviewer.ts`, `langfuse-tracer.ts` |
| Config | `.env`, `.env.example` |
| Integração | Chamadas reais à Moonshot API, fallback para OpenAI |

### 4.2 Cenários de Teste (Given-When-Then)

#### CT-S5-02-001: Factory retorna cliente Moonshot quando MOONSHOT_API_KEY definida
- **Given:** `MOONSHOT_API_KEY=sk-test` e `MOONSHOT_BASE_URL=https://api.moonshot.cn/v1`
- **When:** `createLLMClient()` é chamado
- **Then:** Retorna instância OpenAI com `baseURL` apontando para Moonshot
- **Tipo:** Unit
- **Prioridade:** Crítica

#### CT-S5-02-002: Factory retorna cliente OpenAI quando MOONSHOT_API_KEY ausente
- **Given:** Apenas `OPENAI_API_KEY=sk-test` definida
- **When:** `createLLMClient()` é chamado
- **Then:** Retorna instância OpenAI com endpoint padrão da OpenAI
- **Tipo:** Unit
- **Prioridade:** Crítica

#### CT-S5-02-003: Zero breaking change — sistema funciona sem Moonshot
- **Given:** Ambiente com apenas `OPENAI_API_KEY` (como em produção hoje)
- **When:** Um job é executado via fluxo de agentes
- **Then:** O job completa com sucesso usando OpenAI; nenhum erro de configuração
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-02-004: Researcher usa provider abstraction
- **Given:** `MOONSHOT_API_KEY` definida
- **When:** O nó researcher executa
- **Then:** A chamada LLM vai para Moonshot; modelo usado é `moonshot-v1-8k` (default)
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-02-005: Writer usa provider abstraction
- **Given:** `MOONSHOT_API_KEY` definida
- **When:** O nó writer executa
- **Then:** A chamada LLM vai para Moonshot; conteúdo gerado é válido em português
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-02-006: Reviewer usa provider abstraction
- **Given:** `MOONSHOT_API_KEY` definida
- **When:** O nó reviewer executa
- **Then:** A chamada LLM vai para Moonshot; retorna JSON válido com score/feedback/approved
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-02-007: Langfuse registra modelo real usado
- **Given:** Uma execução de grafo com Moonshot
- **When:** O trace é finalizado
- **Then:** Cada span contém metadata `model: 'moonshot-v1-8k'`
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-02-008: Geração completa com Moonshot retorna conteúdo válido
- **Given:** Um cliente configurado com sources ativas
- **When:** Job executa researcher → writer → reviewer com Moonshot
- **Then:** Post gerado tem título, conteúdo não vazio, review com score > 0
- **Tipo:** E2E / Manual
- **Prioridade:** Alta

### 4.3 Estratégia de Teste

| Tipo | Ferramenta | Escopo |
|---|---|---|
| Unit | vitest | `llm-provider.ts` (factory, getDefaultModel), mock de env |
| Integration | vitest + mock de OpenAI SDK | Nós researcher/writer/reviewer com cliente mockado |
| E2E | Manual | Job completo com Moonshot API real (custo ~$0.01 por teste) |

### 4.4 Dados de Teste

```typescript
// Variáveis de ambiente para testes
const moonshotEnv = {
  MOONSHOT_API_KEY: 'sk-test-moonshot',
  MOONSHOT_BASE_URL: 'https://api.moonshot.cn/v1',
  MOONSHOT_MODEL: 'moonshot-v1-8k',
};

const openaiOnlyEnv = {
  OPENAI_API_KEY: 'sk-test-openai',
  OPENAI_MODEL: 'gpt-4o-mini',
  // MOONSHOT_API_KEY ausente
};

// Mock de resposta OpenAI-compatible
const mockCompletion = {
  choices: [{ message: { content: 'Título: Teste\n\nConteúdo gerado.' } }],
  usage: { total_tokens: 150 },
};
```

### 4.5 Riscos de Qualidade

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Moonshot API indisponível durante testes | Média | Alto | Mockar SDK para testes unitários/integração; teste real manual apenas 1x |
| Diferença de comportamento entre Moonshot e OpenAI (ex: JSON mode) | Média | Alto | Teste específico do reviewer (que usa `response_format: { type: 'json_object' }`) com ambos providers |
| Variáveis de ambiente não documentadas | Baixa | Médio | Validar `.env.example` atualizado |

---

## 5. Test Design Document — S5-03: Correção de Nós Custom no FluxoBuilder

### 5.1 Escopo de Teste

| Camada | Componentes |
|---|---|
| Backend | `node-registry.ts`, `graph-builder.ts`, `executor.ts`, `nodes/index.ts` |
| Integração | Registro na inicialização (`server/index.ts`) |

### 5.2 Cenários de Teste (Given-When-Then)

#### CT-S5-03-001: Registry permite registrar novo tipo de nó
- **Given:** Um registry vazio
- **When:** `registerNode('custom_analyzer', handler)` é chamado
- **Then:** `getNodeHandler('custom_analyzer')` retorna o handler registrado
- **Tipo:** Unit
- **Prioridade:** Crítica

#### CT-S5-03-002: Nó desconhecido lança erro descritivo
- **Given:** Um grafo com nó de tipo `unknown_type`
- **When:** O executor tenta executar o grafo
- **Then:** Lança erro: `"Node type 'unknown_type' is not registered. Available types: researcher, writer, reviewer"`
- **Tipo:** Unit
- **Prioridade:** Crítica

#### CT-S5-03-003: Nós existentes continuam funcionando via registry
- **Given:** Um grafo researcher → writer → reviewer registrado no registry
- **When:** O grafo é executado
- **Then:** Todos os nós executam com sucesso; estado é mergeado corretamente
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-03-004: Executor valida nós antes de iniciar
- **Given:** Um grafo com nó de tipo não registrado
- **When:** `executeGraph()` é chamado
- **Then:** A validação falha antes de qualquer nó executar; job.status = 'failed'
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-03-005: Erro de nó desconhecido é registrado no Langfuse
- **Given:** Um grafo com nó desconhecido que falha na validação
- **When:** A execução falha
- **Then:** O trace no Langfuse contém o erro; `job.error` contém mensagem descritiva
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-03-006: Custom node com handler registrado executa corretamente
- **Given:** Um nó custom registrado com handler que retorna `{ customField: 'value' }`
- **When:** O grafo executa incluindo esse nó
- **Then:** O estado final contém `customField: 'value'`
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-03-007: Barrel file registra todos os nós na inicialização
- **Given:** O servidor iniciando
- **When:** `server/agents/nodes/index.ts` é importado
- **Then:** Os tipos `researcher`, `writer`, `reviewer` estão no registry
- **Tipo:** Integration
- **Prioridade:** Alta

### 5.3 Estratégia de Teste

| Tipo | Ferramenta | Escopo |
|---|---|---|
| Unit | vitest | `node-registry.ts` (registro, lookup, erro) |
| Integration | vitest | `graph-builder.ts` com registry, `executor.ts` com validação |
| E2E | Manual | Criar grafo com nó custom no board → executar → verificar resultado |

### 5.4 Dados de Teste

```typescript
// Grafo de teste com nó custom
const graphWithCustomNode = {
  id: 'graph-test-001',
  tenantId: 'tenant-a',
  name: 'Test Graph',
  nodes: [
    { id: 'node-1', agentId: 'researcher', type: 'researcher' },
    { id: 'node-2', agentId: 'custom-1', type: 'custom_analyzer' },
    { id: 'node-3', agentId: 'writer', type: 'writer' },
  ],
  edges: [
    { id: 'e1', from: 'node-1', to: 'node-2' },
    { id: 'e2', from: 'node-2', to: 'node-3' },
  ],
};

// Handler mock para custom node
const mockCustomHandler = async (state: AgentState) => ({
  customField: 'value',
});

// Grafo com nó desconhecido (deve falhar)
const graphWithUnknownNode = {
  ...graphWithCustomNode,
  nodes: [
    ...graphWithCustomNode.nodes,
    { id: 'node-bad', agentId: 'bad', type: 'unknown_type' },
  ],
};
```

### 5.5 Riscos de Qualidade

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Refatoração do graph-builder quebra execução sequencial existente | Média | Alto | Teste de regressão: executar grafo padrão researcher→writer→reviewer antes e depois |
| Registry global causa problema em testes paralelos | Média | Médio | Resetar registry entre testes; usar `beforeEach` |
| Executor não valida antes de iniciar (regressão) | Baixa | Alto | Teste unitário específico para validação pré-execução |

---

## 6. Test Design Document — S5-04: Dashboard como Central de Comando

### 6.1 Escopo de Teste

| Camada | Componentes |
|---|---|
| Backend | `server/routes/dashboard.ts` — endpoint `/api/dashboard/summary` |
| Frontend | `Dashboard.tsx`, `ClientQuickCard.tsx`, `RecentJobsList.tsx`, `MetricsBadges.tsx`, `use-dashboard.ts` |
| Integração | WebSocket S5-01 atualizando jobs em tempo real |

### 6.2 Cenários de Teste (Given-When-Then)

#### CT-S5-04-001: Endpoint retorna resumo correto
- **Given:** Um tenant com 2 clientes, 3 posts no mês, 1 job em progresso
- **When:** `GET /api/dashboard/summary` é chamado com `x-tenant-id` válido
- **Then:** Retorna: clientes com `last_post_at`, 10 jobs recentes, contadores corretos
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-04-002: Isolamento de tenant no endpoint
- **Given:** Dois tenants com dados diferentes
- **When:** Cada tenant chama `/api/dashboard/summary`
- **Then:** Cada um recebe apenas seus próprios clientes, jobs e posts
- **Tipo:** Integration
- **Prioridade:** Crítica

#### CT-S5-04-003: Cliente sem conteúdo mostra "sem conteúdo ainda"
- **Given:** Um cliente criado há 7 dias sem posts
- **When:** O dashboard carrega
- **Then:** O card do cliente exibe "sem conteúdo ainda" e botão "Gerar conteúdo"
- **Tipo:** E2E
- **Prioridade:** Alta

#### CT-S5-04-004: Job em progresso mostra indicador animado
- **Given:** Um job com status `processing`
- **When:** O dashboard carrega
- **Then:** A lista de atividade recente mostra spinner/animação no item do job
- **Tipo:** E2E
- **Prioridade:** Alta

#### CT-S5-04-005: Botão "Gerar conteúdo" navega para Studio com cliente pré-selecionado
- **Given:** Dashboard com cards de clientes
- **When:** Usuário clica em "Gerar conteúdo" no card do Cliente A
- **Then:** Navega para `/studio?client=cliente-a-id` (ou rota equivalente)
- **Tipo:** E2E
- **Prioridade:** Alta

#### CT-S5-04-006: Página carrega em menos de 2 segundos
- **Given:** Dashboard com 20 clientes e 50 jobs
- **When:** A página é carregada
- **Then:** Time to Interactive <= 2s; TanStack Query cache ativo
- **Tipo:** Performance
- **Prioridade:** Alta

#### CT-S5-04-007: Atualização automática via WebSocket
- **Given:** Dashboard aberto com job em progresso
- **When:** O job completa (evento WebSocket `job:complete`)
- **Then:** A lista de jobs recentes atualiza automaticamente; status muda para completed
- **Tipo:** Integration
- **Prioridade:** Alta

#### CT-S5-04-008: Responsividade mobile
- **Given:** Viewport de 375px de largura
- **When:** O dashboard é carregado
- **Then:** Layout adapta para coluna única; cards empilham; botões acessíveis
- **Tipo:** E2E
- **Prioridade:** Média

#### CT-S5-04-009: Hook use-dashboard faz refetch a cada 30s
- **Given:** Dashboard aberto
- **When:** 30 segundos se passam
- **Then:** Uma nova requisição para `/api/dashboard/summary` é feita em background
- **Tipo:** Unit (frontend)
- **Prioridade:** Média

### 6.3 Estratégia de Teste

| Tipo | Ferramenta | Escopo |
|---|---|---|
| Unit | vitest | `use-dashboard.ts` (query, refetch, cache), componentes puros |
| Integration | vitest + supertest | Endpoint `/api/dashboard/summary` com dados mockados |
| E2E | Manual / Playwright | Fluxo completo: login → dashboard → gerar conteúdo → ver job |
| Performance | Lighthouse / Manual | Time to Interactive, LCP |

### 6.4 Dados de Teste

```sql
-- Setup de dados para teste de dashboard
-- Tenant A
INSERT INTO clients (id, tenant_id, name, niche) VALUES
  ('client-1', 'tenant-a', 'Cliente A', 'Tecnologia'),
  ('client-2', 'tenant-a', 'Cliente B', 'Saúde');

-- Posts do mês atual
INSERT INTO posts (id, tenant_id, client_id, title, content, status, created_at)
SELECT 
  gen_random_uuid(), 'tenant-a', 'client-1', 
  'Post ' || i, 'Conteúdo', 'draft', NOW() - (i || ' days')::interval
FROM generate_series(1, 12) AS i;

-- Jobs recentes
INSERT INTO jobs (id, tenant_id, client_id, user_id, status, stage, progress, created_at)
VALUES
  ('job-1', 'tenant-a', 'client-1', 'user-1', 'processing', 'drafting_post', 60, NOW() - '1 hour'::interval),
  ('job-2', 'tenant-a', 'client-2', 'user-1', 'completed', 'finalizing', 100, NOW() - '2 hours'::interval),
  ('job-3', 'tenant-a', 'client-1', 'user-1', 'failed', 'drafting_post', 40, NOW() - '1 day'::interval);
```

### 6.5 Riscos de Qualidade

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Query do endpoint lenta com muitos dados | Média | Alto | Teste de performance com 100+ clientes; verificar índices em `posts(client_id, created_at)` |
| Vazamento de dados entre tenants no JOIN | Baixa | Crítico | Teste negativo: tenant B requisitando summary deve ver apenas seus dados |
| WebSocket S5-01 atrasado causa UI inconsistente | Média | Médio | Teste de integração: job completa antes do dashboard carregar |

---

## 7. QA Gate Checklist — Sprint 5

### 7.1 Critérios de Decisão

| Decisão | Condição |
|---|---|
| **PASS** | Todos os bloqueantes atendidos; zero regressões críticas; evidências documentadas |
| **CONCERNS** | Sem bloqueantes; 1-2 riscos médios com plano de mitigação; débito técnico aceitável documentado |
| **FAIL** | Qualquer bloqueante pendente; regressão crítica não resolvida; vazamento de tenant |

### 7.2 Bloqueantes Globais (de `docs/qa/quality-gates-and-dod.md`)

| # | Critério | S5 Aplicável | Verificação |
|---|---|---|---|
| B1 | Vazamento entre tenants | ✅ S5-01, S5-04 | Testes negativos de isolamento |
| B2 | Falha de auth/authz em endpoint protegido | ✅ S5-01 (WS auth), S5-04 (dashboard) | Token inválido rejeitado; sem token = 401/403 |
| B3 | Falta de evidência mínima de testes dos fluxos críticos | ✅ Todas | Pelo menos 1 teste por story no escopo crítico |
| B4 | Falta de observabilidade para diagnóstico em produção | ✅ S5-01, S5-02 | Langfuse traces; logs estruturados |

### 7.3 Checklist por Story

#### S5-01 — WebSocket Real-Time

| # | Validação | Tipo | Status |
|---|---|---|---|
| S5-01-01 | Conexão WS autenticada com token válido | Integration | ⬜ |
| S5-01-02 | Conexão WS rejeitada sem token | Integration | ⬜ |
| S5-01-03 | Eventos `job:stage` emitidos durante execução | Integration | ⬜ |
| S5-01-04 | Eventos `agent:start/complete/error` emitidos | Integration | ⬜ |
| S5-01-05 | Fallback para polling quando WS indisponível | E2E | ⬜ |
| S5-01-06 | Isolamento por tenant (múltiplos clientes) | Integration | ⬜ |
| S5-01-07 | Evento `job:complete` com postId | Integration | ⬜ |
| S5-01-08 | Evento `job:failed` com erro | Integration | ⬜ |
| S5-01-09 | Langfuse metadata `websocket: true` | Observability | ⬜ |
| S5-01-10 | Sem regressão no polling existente | Regression | ⬜ |

#### S5-02 — Moonshot API

| # | Validação | Tipo | Status |
|---|---|---|---|
| S5-02-01 | Factory retorna Moonshot quando env configurado | Unit | ⬜ |
| S5-02-02 | Factory retorna OpenAI quando Moonshot ausente | Unit | ⬜ |
| S5-02-03 | Zero breaking change (apenas OPENAI_API_KEY) | Integration | ⬜ |
| S5-02-04 | Researcher usa provider (não OpenAI direto) | Integration | ⬜ |
| S5-02-05 | Writer usa provider | Integration | ⬜ |
| S5-02-06 | Reviewer usa provider + JSON mode funciona | Integration | ⬜ |
| S5-02-07 | Langfuse span contém `model_name` real | Integration | ⬜ |
| S5-02-08 | Geração completa com Moonshot retorna conteúdo válido | E2E/Manual | ⬜ |
| S5-02-09 | `.env.example` atualizado com variáveis documentadas | Documentação | ⬜ |
| S5-02-10 | Remoção do import Anthropic SDK não utilizado | Code Review | ⬜ |

#### S5-03 — Correção de Nós Custom

| # | Validação | Tipo | Status |
|---|---|---|---|
| S5-03-01 | Registry permite registrar novo tipo | Unit | ⬜ |
| S5-03-02 | Nó desconhecido lança erro descritivo | Unit | ⬜ |
| S5-03-03 | Nós existentes funcionam via registry | Integration | ⬜ |
| S5-03-04 | Executor valida nós antes de iniciar | Integration | ⬜ |
| S5-03-05 | Erro registrado no Langfuse e job.error | Integration | ⬜ |
| S5-03-06 | Custom node registrado executa e mergeia estado | Integration | ⬜ |
| S5-03-07 | Barrel file registra nós na inicialização | Integration | ⬜ |
| S5-03-08 | Grafo padrão (researcher→writer→reviewer) sem regressão | Regression | ⬜ |

#### S5-04 — Dashboard como Central de Comando

| # | Validação | Tipo | Status |
|---|---|---|---|
| S5-04-01 | Endpoint `/api/dashboard/summary` retorna dados corretos | Integration | ✅ |
| S5-04-02 | Isolamento de tenant no endpoint | Integration | ✅ |
| S5-04-03 | Cliente sem conteúdo mostra estado vazio | E2E | ✅ |
| S5-04-04 | Job em progresso mostra indicador animado | E2E | ✅ |
| S5-04-05 | Botão "Gerar conteúdo" navega para Studio | E2E | ✅ |
| S5-04-06 | Página carrega em < 2s | Performance | ✅ |
| S5-04-07 | Atualização automática via WebSocket | Integration | ✅ |
| S5-04-08 | Layout responsivo (mobile + desktop) | E2E | ✅ |
| S5-04-09 | Hook refetch a cada 30s | Unit | ✅ |
| S5-04-10 | Contadores (posts do mês + clientes ativos) corretos | Integration | ✅ |

### 7.4 Métricas de Qualidade Esperadas

| Métrica | Target | Como Medir |
|---|---|---|
| Cobertura de testes (novo código) | >= 60% | Vitest coverage report |
| Testes unitários passando | 100% | `npm run test:unit` |
| Testes de integração passando | 100% | `npm run test:integration` |
| Regressões críticas | 0 | Testes de regressão manuais |
| Issues CRITICAL CodeRabbit | 0 | Review automático |
| Tempo de carga Dashboard (p95) | <= 2s | Lighthouse / DevTools |
| Taxa de sucesso de jobs | >= 95% | Métrica do worker + Langfuse |
| Isolamento tenant | 100% | Testes negativos passando |

### 7.5 Evidências a Coletar

Por story, registrar:

```markdown
### Evidência: S5-XX — <Nome da Story>
- **Data:** YYYY-MM-DD
- **Owner QA:** @qa
- **Decisão:** PASS / CONCERNS / FAIL
- **Artefatos:**
  - Link do PR/MR:
  - Screenshot/vídeo:
  - Trace Langfuse:
  - Log de testes:
- **Notas:**
```

---

## 8. Recomendações de Infraestrutura de Testes

Dado o estado atual (zero testes automatizados), recomendo a seguinte configuração mínima para a Sprint 5:

### 8.1 Instalação de Dependências

```bash
# Framework de testes (vitest — já compatível com ESM e Vite)
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest

# Mock de WebSocket para testes
npm install -D mock-socket

# Testes de frontend (React Testing Library)
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 8.2 Scripts no package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
}
```

### 8.3 Estrutura de Diretórios de Teste

```
├── server/
│   ├── __tests__/
│   │   ├── integration/
│   │   │   ├── websocket.test.ts
│   │   │   ├── llm-provider.test.ts
│   │   │   ├── node-registry.test.ts
│   │   │   └── dashboard.test.ts
│   │   └── unit/
│   │       ├── llm-provider.test.ts
│   │       ├── node-registry.test.ts
│   │       └── graph-builder.test.ts
│   └── ...
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── __tests__/
│   │   │       └── use-dashboard.test.ts
│   │   └── components/
│   │       └── dashboard/
│   │           └── __tests__/
│   │               └── ClientQuickCard.test.tsx
│   └── ...
└── vitest.config.ts
```

---

## 9. Riscos Transversais da Sprint

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **S5-01 + S5-04:** WebSocket não entrega eventos para dashboard em tempo real | Média | Alto | Teste de integração conjunta entre as duas stories |
| **S5-02 + S5-03:** Moonshot com nó custom que usa JSON mode pode falhar | Média | Alto | Teste do reviewer com Moonshot antes de merge |
| **S5-03 + S5-04:** Registry quebra grafo padrão usado pelo worker | Média | Crítico | Teste de regressão: job completo com grafo padrão |
| **Dependência entre stories:** S5-04 depende de S5-01 para atualização real-time | Alta | Médio | Priorizar S5-01 no início da sprint; S5-04 pode usar polling como fallback temporário |
| **Ausência de framework de testes** | Confirmado | Alto | Instalar Vitest no primeiro dia da sprint; dedicar 0.5 dia para setup |

---

## 10. Calendário Sugerido de QA

| Dia | Atividade |
|---|---|
| **Dia 1** | Setup Vitest; criar configuração; primeiro teste unitário (llm-provider factory) |
| **Dia 2-3** | QA paralelo ao dev de S5-02 (Moonshot) e S5-03 (Registry) — testes unitários |
| **Dia 4-5** | QA de S5-01 (WebSocket) — testes de integração; mock de WS |
| **Dia 6-7** | QA de S5-04 (Dashboard) — testes de integração do endpoint + frontend |
| **Dia 8** | Testes de regressão: fluxo completo de geração de post |
| **Dia 9** | Testes de carga/isolamento; revisão de CodeRabbit |
| **Dia 10** | Finalização de evidências; decisão QA Gate PASS/CONCERNS/FAIL |

---

*Documento produzido por @qa (Quinn) — Test Architect*  
*Revisão: após execução da sprint*  
*Próximo passo: Instalar Vitest e criar primeiro teste unitário*
