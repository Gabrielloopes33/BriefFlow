/**
 * Graph Builder — Monta e executa o fluxo de agentes
 * Implementação manual de orquestração com controle de estado
 * (Alternativa ao LangGraph SDK quando há problemas de compatibilidade)
 */

import type { AgentState } from './state';
import { getNodeHandler, validateGraphNodes } from './node-registry';
import { mergeState } from './state-merger';

export type NodeType = string; // Agora é genérico — qualquer tipo registrado no registry

export interface GraphNode {
  id: string;
  agentId: string;
  type: NodeType;
  position?: { x: number; y: number };
  config?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  condition?: string; // ex: "review.approved === true"
}

export interface AgentGraphDefinition {
  id: string;
  tenantId: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NodeResult {
  nodeId: string;
  status: 'running' | 'completed' | 'failed';
  output?: Partial<AgentState>;
  error?: string;
  latency: number;
  timestamp: string;
}

export interface ExecutionResult {
  status: 'completed' | 'failed';
  finalState: AgentState;
  nodeResults: NodeResult[];
  traceId?: string;
}

/**
 * Valida se todos os nós do grafo têm handlers registrados
 * Lança erro agregado se houver nós desconhecidos
 */
export function validateGraph(definition: AgentGraphDefinition): void {
  const nodeTypes = definition.nodes.map((n) => n.type);
  const errors = validateGraphNodes(nodeTypes);

  if (errors.length > 0) {
    throw new Error(
      `Graph validation failed for '${definition.name}':\n` +
      errors.map((e) => `  - ${e}`).join('\n')
    );
  }
}

/**
 * Constrói o fluxo a partir da definição do banco
 */
export function buildGraph(definition: AgentGraphDefinition): AgentGraph {
  return new AgentGraph(definition);
}

export class AgentGraph {
  private definition: AgentGraphDefinition;
  private adjacencyList: Map<string, string[]>;

  constructor(definition: AgentGraphDefinition) {
    this.definition = definition;
    this.adjacencyList = this.buildAdjacencyList();
  }

  private buildAdjacencyList(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const node of this.definition.nodes) {
      map.set(node.id, []);
    }
    for (const edge of this.definition.edges) {
      const list = map.get(edge.from) || [];
      list.push(edge.to);
      map.set(edge.from, list);
    }
    return map;
  }

  /**
   * Valida se todos os nós do grafo têm handlers registrados
   */
  validate(): void {
    validateGraph(this.definition);
  }

  /**
   * Executa o fluxo a partir do estado inicial
   * Suporta execução paralela de nós independentes via topological sort
   * Retorna o estado final e resultados de cada nó
   */
  async execute(
    initialState: AgentState,
    options: {
      onNodeStart?: (nodeId: string) => void;
      onNodeComplete?: (nodeId: string, result: NodeResult) => void;
      maxRetries?: number;
    } = {}
  ): Promise<ExecutionResult> {
    const { onNodeStart, onNodeComplete, maxRetries = 1 } = options;
    let state = { ...initialState };
    const nodeResults: NodeResult[] = [];

    // Validação pré-execução: garante que todos os nós têm handlers
    try {
      this.validate();
    } catch (err: any) {
      state.errors.push({
        node: 'graph-validation',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'failed',
        finalState: state,
        nodeResults: [
          {
            nodeId: 'graph-validation',
            status: 'failed',
            error: err.message,
            latency: 0,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // Constrói mapa de predecessores e in-degree
    const inDegree = new Map<string, number>();
    const predecessors = new Map<string, string[]>();

    for (const node of this.definition.nodes) {
      inDegree.set(node.id, 0);
      predecessors.set(node.id, []);
    }

    for (const edge of this.definition.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      const preds = predecessors.get(edge.to) || [];
      preds.push(edge.from);
      predecessors.set(edge.to, preds);
    }

    const completed = new Set<string>();
    // __start__ é um nó virtual do ReactFlow — considera sempre completado
    completed.add('__start__');

    // Executa nós em níveis (paralelos quando possível)
    console.log(`[graph-builder] Starting execution. Nodes: ${this.definition.nodes.map(n => n.id).join(', ')}, Edges: ${this.definition.edges.map(e => `${e.from}->${e.to}`).join(', ')}`);
    console.log(`[graph-builder] Predecessors:`, Object.fromEntries(predecessors));
    
    while (completed.size < this.definition.nodes.length) {
      // Encontra nós prontos: todos os predecessores completados
      const ready = this.definition.nodes.filter((node) => {
        if (completed.has(node.id)) return false;
        const preds = predecessors.get(node.id) || [];
        return preds.every((pred) => completed.has(pred));
      });
      
      console.log(`[graph-builder] Iteration: completed=${Array.from(completed).join(', ')}, ready=${ready.map(n => n.id).join(', ')}`);

      if (ready.length === 0) {
        console.warn(`[graph-builder] No ready nodes but ${this.definition.nodes.length - completed.size} nodes remaining. Deadlock detected?`);
        // Evita loop infinito em grafos cíclicos
        break;
      }

      // Executa nós prontos em paralelo
      console.log(`[graph-builder] Executing nodes: ${ready.map(n => `${n.id}(${n.type})`).join(', ')}`);
      const results = await Promise.allSettled(
        ready.map(async (nodeDef) => {
          onNodeStart?.(nodeDef.id);
          const nodeStartTime = Date.now();

          try {
            const executor = getNodeHandler(nodeDef.type);
            console.log(`[graph-builder] Calling handler for ${nodeDef.id} with config:`, nodeDef.config);
            const output = await executor(state, nodeDef.config);

            return {
              nodeId: nodeDef.id,
              status: 'completed' as const,
              output,
              latency: Date.now() - nodeStartTime,
              timestamp: new Date().toISOString(),
            };
          } catch (err: any) {
            return {
              nodeId: nodeDef.id,
              status: 'failed' as const,
              error: err.message,
              latency: Date.now() - nodeStartTime,
              timestamp: new Date().toISOString(),
            };
          }
        })
      );

      // Processa resultados e merge do estado
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const nodeDef = ready[i];

        if (result.status === 'fulfilled') {
          const nodeResult = result.value;

          if (nodeResult.status === 'completed' && nodeResult.output) {
            // Merge do output no estado
            state = mergeState(state, nodeResult.output);
          } else if (nodeResult.status === 'failed') {
            state.errors.push({
              node: nodeResult.nodeId,
              message: nodeResult.error || 'Unknown error',
              timestamp: new Date().toISOString(),
            });
          }

          nodeResults.push(nodeResult);
          onNodeComplete?.(nodeResult.nodeId, nodeResult);
        } else {
          // Rejected (erro inesperado na execução)
          const errorNodeResult: NodeResult = {
            nodeId: nodeDef.id,
            status: 'failed',
            error: result.reason?.message || 'Execution rejected',
            latency: 0,
            timestamp: new Date().toISOString(),
          };
          state.errors.push({
            node: nodeDef.id,
            message: errorNodeResult.error!,
            timestamp: new Date().toISOString(),
          });
          nodeResults.push(errorNodeResult);
          onNodeComplete?.(nodeDef.id, errorNodeResult);
        }

        completed.add(nodeDef.id);
      }

      // Avalia conditional edges após cada nível
      for (const nodeDef of ready) {
        const nextNodes = this.adjacencyList.get(nodeDef.id) || [];
        for (const nextId of nextNodes) {
          const edge = this.definition.edges.find(
            (e) => e.from === nodeDef.id && e.to === nextId
          );
          if (edge?.condition) {
            const shouldProceed = this.evaluateCondition(edge.condition, state);
            if (!shouldProceed) {
              // Se a condição falha, decrementa o in-degree do destino
              // para que ele não espere por este nó
              inDegree.set(nextId, (inDegree.get(nextId) || 1) - 1);
            }
          }
        }
      }
    }

    const hasErrors = nodeResults.some((r) => r.status === 'failed');
    return {
      status: hasErrors ? 'failed' : 'completed',
      finalState: state,
      nodeResults,
    };
  }

  /**
   * Avalia condições simples de edges
   * Suporta: "review.approved === true", "review.score >= 7"
   */
  private evaluateCondition(condition: string, state: AgentState): boolean {
    try {
      // Substitui variáveis do estado
      const context = {
        review: state.review,
        retryCount: state.retryCount,
      };

      // Cria função segura para avaliar a condição
      const fn = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(fn(context));
    } catch {
      return true; // fallback: permite passar
    }
  }

  getDefinition(): AgentGraphDefinition {
    return this.definition;
  }

  getNodes(): GraphNode[] {
    return this.definition.nodes;
  }

  getEdges(): GraphEdge[] {
    return this.definition.edges;
  }
}
