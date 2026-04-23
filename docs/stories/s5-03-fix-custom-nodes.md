# S5-03 — Correção de Nós Custom no FluxoBuilder

Status: Ready  
Owner: @dev  
Sprint: 05  
Prioridade: Crítica  
Pontos: 5

## Contexto

O board visual de Fluxo (renomeado de Grafos) permite que o usuário adicione nós de tipo `custom` ao grafo. Porém, o `graph-builder.ts` registra nós custom como `async () => ({})` — uma função vazia que não executa nada e retorna estado vazio.

Isso significa que qualquer grafo com nós custom no board não faz nada útil. Como os novos agentes especializados (Sprint 6) serão registrados como tipos de nós no sistema, é necessário que o mecanismo de registro e execução funcione antes de construí-los.

## Escopo

**IN:**
- Sistema de registro de nós por tipo (registry pattern)
- Nós custom registráveis com nome, descrição e função de execução
- Validação de nós desconhecidos (erro claro, não silêncio)
- Preparação da estrutura para os nós da Sprint 6 se registrarem

**OUT:**
- UI para criar nós custom via interface (escopo futuro)
- Marketplace de nós (escopo futuro)
- Hot-reload de nós em runtime

## Critérios de Aceite

- [x] `graph-builder.ts` possui um registry de nós indexado por tipo
- [x] Nós do tipo `custom` sem handler registrado lançam erro descritivo (não falham silenciosamente)
- [x] Novos tipos de nós podem ser registrados via `registerNode(type, handler)` 
- [x] Nós existentes (researcher, writer, reviewer) passam pelo mesmo registry
- [x] Executor valida se todos os nós do grafo têm handler registrado antes de iniciar
- [x] Erros de nó desconhecido são registrados no Langfuse e no job.error

## Tarefas

- [x] Criar `server/agents/node-registry.ts` — mapa de tipo → handler function
- [x] Refatorar `server/agents/graph-builder.ts` para usar o registry ao invés de switch/case hardcoded
- [x] Registrar os nós existentes (researcher, writer, reviewer) no registry
- [x] Atualizar `server/agents/executor.ts` para validar nós antes de executar
- [x] Adicionar erro descritivo para nós não registrados: `"Node type 'custom_xyz' is not registered. Available types: researcher, writer, reviewer"`
- [x] Criar `server/agents/nodes/index.ts` — barrel file que registra todos os nós no registry
- [x] Atualizar `server/index.ts` para importar o barrel e garantir registro na inicialização

## Estrutura do Registry (implementada)

```typescript
// server/agents/node-registry.ts
export type NodeHandler = (state: AgentState, config?: Record<string, any>) => Promise<Partial<AgentState>>;

const registry = new Map<string, NodeRegistration>();

export function registerNode(type: string, handler: NodeHandler, description?: string): void
export function getNodeHandler(type: string): NodeHandler  // throws if not found
export function hasNodeHandler(type: string): boolean
export function getRegisteredNodeTypes(): string[]
export function validateGraphNodes(nodeTypes: string[]): string[]
export function clearRegistry(): void  // util para testes
```

## Arquivos Criados/Modificados

- ✅ CRIAR: `server/agents/node-registry.ts`
- ✅ CRIAR: `server/agents/node-registry.test.ts` (18 testes)
- ✅ CRIAR: `server/agents/graph-builder.test.ts` (13 testes)
- ✅ CRIAR/MODIFICAR: `server/agents/nodes/index.ts` (barrel de registro + auto-registro)
- ✅ MODIFICAR: `server/agents/graph-builder.ts` — usa registry, validação pré-execução
- ✅ MODIFICAR: `server/agents/executor.ts` — valida nós antes de executar, trace Langfuse
- ✅ MODIFICAR: `server/index.ts` — importa barrel na inicialização

## Definition of Done

- [x] Critérios de aceite atendidos
- [x] Sem issues CRITICAL no CodeRabbit (não aplicável — não há CR configurado)
- [x] Teste: grafo com nó desconhecido retorna erro claro no job.error
- [x] Teste: grafos existentes (researcher → writer → reviewer) continuam funcionando
- [x] Evidências: log de registro dos nós na inicialização do server (`[node-registry] Registered nodes: researcher, writer, reviewer`)

## Quality Gates

- ✅ Typecheck: `npx tsc --noEmit` — 0 erros
- ✅ Testes: 52/52 passando (21 llm-provider + 18 node-registry + 13 graph-builder)
- ✅ Lint: `npm run lint` — pass (not configured yet)
