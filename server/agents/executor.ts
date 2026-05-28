/**
 * Executor de Fluxos de Agentes
 * Orquestra a execução, persiste progresso e emite eventos
 */

import { Pool } from 'pg';
import { buildGraph, AgentGraph, validateGraph, type AgentGraphDefinition, type NodeResult } from './graph-builder';
import { createInitialState, type AgentState } from './state';
import { validateGraphNodes, getRegisteredNodeTypes } from './node-registry';
import { createGraphTrace, createNodeSpan, finalizeNodeSpan, finalizeTrace, generateTraceId } from './langfuse-tracer';
import { getClientForUser } from '../pg-pool';
import { broadcastJobEvent } from '../websocket/job-broadcaster';

export interface ExecutionOptions {
  jobId: string;
  tenantId: string;
  clientId: string;
  userId: string;
  payload: any;
  graphId?: string;
  pool: Pool;
  signal?: AbortSignal;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: NodeResult) => void;
}

export interface ExecutionRecord {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'canceled';
  currentNodeId: string | null;
  nodeResults: Record<string, any>;
}

/**
 * Carrega a definição do fluxo do banco de dados
 */
export async function loadGraphDefinition(
  pool: Pool,
  graphId: string,
  tenantId: string
): Promise<AgentGraphDefinition | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, tenant_id, name, nodes, edges FROM agent_graphs WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [graphId, tenantId]
    );

    if (!rows[0]) return null;

    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      name: rows[0].name,
      nodes: (rows[0].nodes || []).map((n: any) => ({
        ...n,
        config: { ...n.config, agentId: n.agentId },
      })),
      edges: rows[0].edges || [],
    };
  } finally {
    client.release();
  }
}

/**
 * Carrega o fluxo padrão do tenant (is_default = true)
 */
export async function loadDefaultGraph(
  pool: Pool,
  tenantId: string
): Promise<AgentGraphDefinition | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, tenant_id, name, nodes, edges FROM agent_graphs WHERE tenant_id = $1 AND is_default = true AND is_active = true LIMIT 1`,
      [tenantId]
    );

    if (!rows[0]) return null;

    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      name: rows[0].name,
      nodes: (rows[0].nodes || []).map((n: any) => ({
        ...n,
        config: { ...n.config, agentId: n.agentId },
      })),
      edges: rows[0].edges || [],
    };
  } finally {
    client.release();
  }
}

async function loadClientContext(pool: Pool, tenantId: string, clientId: string): Promise<{
  clientKnowledgeContext: string;
  clientVisualContext: string;
}> {
  const db = await pool.connect();
  try {
    const documentsResult = await db.query(
      `SELECT file_name,
              file_type,
              COALESCE(label, file_name) AS label,
              extraction_status,
              LEFT(COALESCE(extracted_text, ''), 1200) AS excerpt,
              created_at
       FROM client_documents
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT 8`,
      [tenantId, clientId]
    );

    const visualsResult = await db.query(
      `SELECT file_name,
              COALESCE(label, file_name) AS label,
              public_url,
              created_at
       FROM client_moodboard_images
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY display_order ASC, created_at DESC
       LIMIT 12`,
      [tenantId, clientId]
    );

    const documentLines = documentsResult.rows.map((row: any, index: number) => {
      const excerpt = String(row.excerpt || '').trim();
      return `${index + 1}. ${row.label} (${row.file_name}, ${row.file_type}, ${row.extraction_status})${excerpt ? `\n  Trecho: ${excerpt}` : ''}`;
    });

    const visualLines = visualsResult.rows.map((row: any, index: number) => {
      return `${index + 1}. ${row.label} (${row.file_name})${row.public_url ? `\n  URL: ${row.public_url}` : ''}`;
    });

    return {
      clientKnowledgeContext: documentLines.length > 0
        ? `Use estes arquivos como referência obrigatória de marca, texto e conteúdo. Priorize brandbook, logo, criativos e tom visual acima de defaults genéricos.\n${documentLines.join('\n\n')}`
        : '',
      clientVisualContext: visualLines.length > 0
        ? `Use estas referências visuais como direção de estética, layout, composição e identidade.\n${visualLines.join('\n\n')}`
        : '',
    };
  } finally {
    db.release();
  }
}

/**
 * Cria um registro de execução no banco
 */
export async function createExecution(
  pool: Pool,
  params: {
    tenantId: string;
    graphId: string;
    jobId: string;
    traceId?: string;
  }
): Promise<string> {
  const { tenantId, graphId, jobId, traceId } = params;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO agent_executions (tenant_id, graph_id, job_id, trace_id, status, node_results)
       VALUES ($1, $2, $3, $4, 'running', '{}') RETURNING id`,
      [tenantId, graphId, jobId, traceId || null]
    );
    return rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Atualiza o progresso da execução
 */
export async function updateExecutionProgress(
  pool: Pool,
  executionId: string,
  updates: {
    status?: 'running' | 'completed' | 'failed' | 'canceled';
    currentNodeId?: string | null;
    nodeResults?: Record<string, any>;
    completedAt?: Date;
  }
): Promise<void> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.status !== undefined) {
      fields.push(`status=$${i++}`);
      values.push(updates.status);
    }
    if (updates.currentNodeId !== undefined) {
      fields.push(`current_node_id=$${i++}`);
      values.push(updates.currentNodeId);
    }
    if (updates.nodeResults !== undefined) {
      fields.push(`node_results=$${i++}`);
      values.push(JSON.stringify(updates.nodeResults));
    }
    if (updates.completedAt !== undefined) {
      fields.push(`completed_at=$${i++}`);
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;
    values.push(executionId);

    await client.query(
      `UPDATE agent_executions SET ${fields.join(', ')} WHERE id=$${i}`,
      values
    );
  } finally {
    client.release();
  }
}

/**
 * Executa o fluxo completo
 */
export async function executeGraph(options: ExecutionOptions): Promise<{
  success: boolean;
  state: AgentState;
  executionId: string;
  postId?: string;
}> {
  const { jobId, tenantId, clientId, userId, payload, graphId, pool, signal, onNodeStart, onNodeComplete } = options;

  // 1. Carrega informações do cliente
  const pgClient = await getClientForUser(userId);
  let clientInfo = { name: 'Cliente', niche: '', description: '' };
  try {
    const { rows } = await pgClient.query(
      `SELECT name, niche, description FROM clients WHERE id = $1 AND tenant_id = $2`,
      [clientId, tenantId]
    );
    if (rows[0]) {
      clientInfo = {
        name: rows[0].name,
        niche: rows[0].niche || '',
        description: rows[0].description || '',
      };
    }
  } finally {
    pgClient.release();
  }

  // 2. Carrega o fluxo
  let graphDef: AgentGraphDefinition | null = null;
  if (graphId) {
    graphDef = await loadGraphDefinition(pool, graphId, tenantId);
  }
  if (!graphDef) {
    graphDef = await loadDefaultGraph(pool, tenantId);
  }

  // Se não houver fluxo configurado, retorna erro
  if (!graphDef) {
    throw new Error('No agent graph configured for this tenant');
  }

  // 3. Cria estado inicial e registro de execução (ANTES da validação para ter executionId)
  const initialState = createInitialState({ jobId, tenantId, clientId, userId, payload, clientInfo });
  const clientContext = await loadClientContext(pool, tenantId, clientId);
  initialState.clientKnowledgeContext = clientContext.clientKnowledgeContext;
  initialState.clientVisualContext = clientContext.clientVisualContext;
  const executionId = await createExecution(pool, { tenantId, graphId: graphDef.id, jobId });

  // 2.5 Validação pré-execução: todos os nós têm handlers registrados?
  const nodeTypes = graphDef.nodes.map((n) => n.type);
  const validationErrors = validateGraphNodes(nodeTypes);
  if (validationErrors.length > 0) {
    const errorMessage = `Graph validation failed: ${validationErrors.join('; ')}`;
    console.error('[executor]', errorMessage);

    // Registra no Langfuse como trace falho
    try {
      const trace = createGraphTrace({
        tenantId,
        clientId,
        userId,
        jobId,
        graphId: graphDef.id,
        graphName: graphDef.name,
      });
      trace.update({
        metadata: { status: 'failed', error: errorMessage },
      });
    } catch (lfErr: any) {
      console.error('[executor] Langfuse trace error:', lfErr.message);
    }

    // Atualiza o job com o erro
    await updateExecutionProgress(pool, executionId, {
      status: 'failed',
      currentNodeId: null,
      nodeResults: { validationError: errorMessage },
      completedAt: new Date(),
    });

    throw new Error(errorMessage);
  }

  // 4. Cria trace no Langfuse para observabilidade
  let trace: any;
  let traceId: string | undefined;
  try {
    trace = createGraphTrace({
      tenantId,
      clientId,
      userId,
      jobId,
      graphId: graphDef.id,
      graphName: graphDef.name,
    });
    traceId = trace.id;
  } catch (lfErr: any) {
    console.error('[executor] Failed to create Langfuse trace:', lfErr.message);
  }

  // 5. Emite evento de início de job
  broadcastJobEvent(userId, {
    type: 'job:stage',
    jobId,
    stage: 'executing_graph',
    progress: 10,
    tenantId,
  });

  // 6. Executa o fluxo
  console.log(`[executor] Building graph with ${graphDef.nodes.length} nodes and ${graphDef.edges.length} edges`);
  console.log(`[executor] Nodes:`, graphDef.nodes.map(n => ({ id: n.id, type: n.type, agentId: n.agentId })));
  
  const graph = buildGraph(graphDef);
  const nodeResultsMap: Record<string, any> = {};

  const executionPromise = graph.execute(initialState, {
    onNodeStart: (nodeId) => {
      if (signal?.aborted) {
        throw new Error('Graph execution aborted');
      }
      const nodeDef = graphDef!.nodes.find((n) => n.id === nodeId);
      broadcastJobEvent(userId, {
        type: 'agent:start',
        jobId,
        nodeId,
        agentName: nodeDef?.type || nodeId,
        tenantId,
      });
      updateExecutionProgress(pool, executionId, { currentNodeId: nodeId }).catch(console.error);
      onNodeStart?.(nodeId);
    },
    onNodeComplete: (nodeId, nodeResult) => {
      const nodeDef = graphDef!.nodes.find((n) => n.id === nodeId);
      const summary = nodeResult.status === 'completed'
        ? `Completed in ${nodeResult.latency}ms`
        : `Failed: ${nodeResult.error || 'Unknown error'}`;

      broadcastJobEvent(userId, {
        type: nodeResult.status === 'completed' ? 'agent:complete' : 'agent:error',
        jobId,
        nodeId,
        summary: nodeResult.status === 'completed' ? summary : nodeResult.error || 'Error',
        error: nodeResult.error || '',
        tenantId,
      });

      nodeResultsMap[nodeId] = {
        status: nodeResult.status,
        latency: nodeResult.latency,
        timestamp: nodeResult.timestamp,
        error: nodeResult.error,
      };
      updateExecutionProgress(pool, executionId, {
        currentNodeId: null,
        nodeResults: nodeResultsMap,
      }).catch(console.error);
      onNodeComplete?.(nodeId, nodeResult);
    },
  });

  const result = signal
    ? await Promise.race([
        executionPromise,
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Graph execution aborted')), { once: true });
        }),
      ])
    : await executionPromise;

  // 7. Finaliza execução e emite evento final
  console.log(`[executor] Graph execution result: status=${result.status}, draft.title=${result.finalState.draft?.title}, draft.content length=${result.finalState.draft?.content?.length}`);
  console.log(`[executor] Errors:`, result.finalState.errors);
  
  const finalStatus = result.status === 'completed' ? 'completed' : 'failed';

  if (finalStatus === 'completed') {
    broadcastJobEvent(userId, {
      type: 'job:stage',
      jobId,
      stage: 'completed',
      progress: 100,
      tenantId,
    });
  } else {
    const lastError = result.finalState.errors[result.finalState.errors.length - 1];
    broadcastJobEvent(userId, {
      type: 'job:failed',
      jobId,
      error: lastError?.message || 'Graph execution failed',
      tenantId,
    });
  }

  await updateExecutionProgress(pool, executionId, {
    status: finalStatus,
    currentNodeId: null,
    nodeResults: nodeResultsMap,
    completedAt: new Date(),
  });

  // 8. Salva o post gerado
  let postId: string | undefined;
  if (result.finalState.draft.title && result.finalState.draft.content) {
    const saveClient = await getClientForUser(userId);
    try {
      const { rows } = await saveClient.query(
        `INSERT INTO posts (tenant_id, client_id, user_id, title, content, channels, status, generated_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7) RETURNING id`,
        [
          tenantId,
          clientId,
          userId,
          result.finalState.draft.title,
          result.finalState.draft.content,
          JSON.stringify(result.finalState.channels),
          `agent-graph:${graphDef.id}`,
        ]
      );
      postId = rows[0].id;
    } finally {
      saveClient.release();
    }
  }

  // 9. Emite job:complete com postId se houver
  if (postId) {
    broadcastJobEvent(userId, {
      type: 'job:complete',
      jobId,
      postId,
      tenantId,
    });
  }

  return {
    success: result.status === 'completed',
    state: result.finalState,
    executionId,
    postId,
  };
}

