/**
 * Langfuse Tracer — Observabilidade para execuções de agentes
 * Traces por execução, spans por nó, métricas de custo/latência
 */

import { Langfuse } from 'langfuse';
import { resolvePrimaryProvider, getDefaultModel } from '../services/llm-provider';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

/**
 * Retorna o provider e model ativos para tagging no Langfuse
 */
export function getActiveLLMInfo(): { provider: string; model: string } {
  return {
    provider: resolvePrimaryProvider(),
    model: getDefaultModel(),
  };
}

export interface TraceContext {
  tenantId: string;
  clientId: string;
  userId: string;
  jobId: string;
  graphId: string;
  graphName: string;
}

/**
 * Cria um trace para uma execução de fluxo
 */
export function createGraphTrace(context: TraceContext) {
  const trace = langfuse.trace({
    id: `graph-${context.jobId}`,
    name: `agent-graph:${context.graphName}`,
    userId: context.userId,
    metadata: {
      tenantId: context.tenantId,
      clientId: context.clientId,
      jobId: context.jobId,
      graphId: context.graphId,
    },
    tags: [context.tenantId, context.graphName],
  });

  return trace;
}

/**
 * Cria um span para um nó do fluxo
 */
export function createNodeSpan(
  trace: any,
  nodeId: string,
  nodeType: string,
  input: any
) {
  return trace.span({
    id: `node-${nodeId}`,
    name: `${nodeType}:${nodeId}`,
    input: typeof input === 'string' ? input : JSON.stringify(input),
    metadata: { nodeType },
  });
}

/**
 * Finaliza um span com o resultado
 */
export function finalizeNodeSpan(
  span: any,
  output: any,
  metadata: {
    latency: number;
    tokens: number;
    model: string;
  }
) {
  span.end({
    output: typeof output === 'string' ? output : JSON.stringify(output),
    metadata: {
      latencyMs: metadata.latency,
      tokens: metadata.tokens,
      model: metadata.model,
    },
  });
}

/**
 * Gera um trace ID para uso no banco
 */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Finaliza um trace
 */
export function finalizeTrace(
  trace: any,
  status: 'completed' | 'failed',
  output: any
) {
  trace.update({
    output: typeof output === 'string' ? output : JSON.stringify(output),
    metadata: { status },
  });
}
