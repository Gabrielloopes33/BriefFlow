import { Pool } from 'pg';
import { getClientForUser } from '../pg-pool';
import { selectProvider } from './crawler-provider';
import type { CrawlSource } from './crawler-provider';
import { executeGraph, loadDefaultGraph } from '../agents/executor';
import { createGraphTrace, generateTraceId, finalizeTrace } from '../agents/langfuse-tracer';
import { createLLMClient, getDefaultModel } from './llm-provider';
import { broadcastJobEvent } from '../websocket/job-broadcaster';

export interface JobRow {
  id: string;
  tenant_id: string;
  client_id: string;
  user_id: string;
  status: string;
  stage: string;
  progress: number;
  attempt: number;
  max_attempts: number;
  payload: any;
}

const STAGES = [
  'validating_input',
  'fetching_sources',
  'crawling_content',
  'extracting_insights',
  'drafting_post',
  'finalizing',
] as const;

function nextStage(current: string): string {
  const idx = STAGES.indexOf(current as any);
  return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : STAGES[STAGES.length - 1];
}

function stageProgress(stage: string): number {
  const idx = STAGES.indexOf(stage as any);
  return Math.min(100, Math.round(((idx + 1) / STAGES.length) * 100));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function updateJob(
  client: any,
  jobId: string,
  updates: Partial<JobRow> & { error?: any; result_post_id?: string | null }
) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (updates.status !== undefined) { fields.push(`status=$${i++}`); values.push(updates.status); }
  if (updates.stage !== undefined) { fields.push(`stage=$${i++}`); values.push(updates.stage); }
  if (updates.progress !== undefined) { fields.push(`progress=$${i++}`); values.push(updates.progress); }
  if (updates.attempt !== undefined) { fields.push(`attempt=$${i++}`); values.push(updates.attempt); }
  if (updates.error !== undefined) { fields.push(`error=$${i++}`); values.push(JSON.stringify(updates.error)); }
  if (updates.result_post_id !== undefined) { fields.push(`result_post_id=$${i++}`); values.push(updates.result_post_id); }

  if (fields.length === 0) return;
  values.push(jobId);
  await client.query(
    `UPDATE jobs SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${i}`,
    values
  );
}

async function processJob(job: JobRow, pool: Pool) {
  const pgClient = await getClientForUser(job.user_id);
  try {
    await pgClient.query('BEGIN');

    // Lock job row
    const { rows: locked } = await pgClient.query(
      `SELECT status FROM jobs WHERE id=$1 FOR UPDATE`,
      [job.id]
    );
    if (!locked[0] || (locked[0].status !== 'queued' && locked[0].status !== 'retrying')) {
      await pgClient.query('ROLLBACK');
      return;
    }

    await updateJob(pgClient, job.id, { status: 'processing', attempt: job.attempt + 1 });
    await pgClient.query('COMMIT');

    // Notifica início do job via WebSocket
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'processing',
      progress: 5,
      tenantId: job.tenant_id,
    });

    const payload = job.payload || {};
    const channels = Array.isArray(payload.channels) ? payload.channels : ['blog'];
    const goal = payload.goal || 'authority';
    const language = payload.language || 'pt-BR';
    const tone = payload.tone || 'consultivo';
    const titleHint = payload.title_hint || 'Postagem gerada automaticamente';
    const maxWords = payload.generation?.max_words || 500;

    // Stage: validating_input
    await pgClient.query(`UPDATE jobs SET stage='validating_input', progress=${stageProgress('validating_input')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'validating_input',
      progress: stageProgress('validating_input'),
      tenantId: job.tenant_id,
    });
    await sleep(200);

    // Stage: fetching_sources (fetch client name + sources for context)
    await pgClient.query(`UPDATE jobs SET stage='fetching_sources', progress=${stageProgress('fetching_sources')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'fetching_sources',
      progress: stageProgress('fetching_sources'),
      tenantId: job.tenant_id,
    });
    const { rows: clientRows } = await pgClient.query(`SELECT name, description, niche FROM clients WHERE id=$1 AND tenant_id=$2`, [job.client_id, job.tenant_id]);
    const clientName = clientRows[0]?.name || 'Cliente';
    const clientNiche = clientRows[0]?.niche || '';

    // Buscar sources do cliente no PostgreSQL
    const { rows: sourceRows } = await pgClient.query(
      `SELECT id, url, type FROM sources WHERE client_id=$1 AND tenant_id=$2 AND is_active=true`,
      [job.client_id, job.tenant_id]
    );
    const sources = sourceRows.map((r: any) => ({ url: r.url, source_type: r.type, source_id: r.id }));
    await sleep(200);

    // Stage: crawling_content — chamar provider apropriado por tipo de fonte
    await pgClient.query(`UPDATE jobs SET stage='crawling_content', progress=${stageProgress('crawling_content')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'crawling_content',
      progress: stageProgress('crawling_content'),
      tenantId: job.tenant_id,
    });
    let crawledContents: any[] = [];
    try {
      if (sources.length > 0) {
        // Agrupar sources por tipo para usar o provider correto
        const sourcesByType = new Map<string, CrawlSource[]>();
        for (const s of sources) {
          const type = (s.source_type || 'blog').toLowerCase();
          const list = sourcesByType.get(type) || [];
          list.push(s);
          sourcesByType.set(type, list);
        }

        for (const [type, typeSources] of Array.from(sourcesByType.entries())) {
          const provider = selectProvider(type);
          console.log(`[post-worker] Using provider '${provider.name}' for ${typeSources.length} ${type} source(s)`);

          const result = await provider.crawlBatch({
            tenant_id: job.tenant_id,
            client_id: job.client_id,
            sources: typeSources,
          });
          crawledContents.push(...(result.contents || []));
          console.log(`[post-worker] Provider '${provider.name}': ${result.successful}/${result.total_urls} OK`);
        }
      } else {
        console.log(`[post-worker] No sources found for client ${job.client_id}`);
      }

      // Busca opcional de trends via Apify (quando solicitado no payload)
      const trendSearch = payload.trend_search as { platform?: string; hashtag?: string; maxResults?: number } | undefined;
      if (trendSearch && process.env.APIFY_API_TOKEN) {
        try {
          const { ApifySocialProvider } = await import('./apify-social-provider');
          const apify = new ApifySocialProvider();
          const platform = (trendSearch.platform || 'tiktok').toLowerCase();
          const hashtag = trendSearch.hashtag || clientNiche || 'marketing';
          const maxResults = trendSearch.maxResults || 20;

          console.log(`[post-worker] Buscando trends: ${platform} #${hashtag}`);

          let trends: any[] = [];
          if (platform === 'tiktok') {
            trends = await apify.fetchTikTokHashtag({ hashtag, maxResults });
          } else if (platform === 'instagram') {
            trends = await apify.fetchInstagramHashtag({ hashtag, maxResults });
          }

          crawledContents.push(...trends);
          console.log(`[post-worker] Trends encontrados: ${trends.length}`);
        } catch (trendErr: any) {
          console.error('[post-worker] Erro ao buscar trends:', trendErr.message);
        }
      }
    } catch (crawlErr: any) {
      console.error('[post-worker] Crawling error:', crawlErr.message);
      // Não falha o job — continua sem conteúdo crawleado
    }

    // Stage: extracting_insights — compilar contexto das fontes
    await pgClient.query(`UPDATE jobs SET stage='extracting_insights', progress=${stageProgress('extracting_insights')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'extracting_insights',
      progress: stageProgress('extracting_insights'),
      tenantId: job.tenant_id,
    });
    const contextBlocks: string[] = [];
    for (const c of crawledContents.slice(0, 5)) {
      const snippet = c.content_text ? c.content_text.slice(0, 1200) : '';
      if (snippet) {
        contextBlocks.push(`Fonte: ${c.title} (${c.url})\n${snippet}`);
      }
    }
    const sourceContext = contextBlocks.length > 0
      ? `\n\nContexto das fontes do cliente:\n${contextBlocks.join('\n\n---\n\n')}`
      : '';
    await sleep(200);

    // Stage: drafting_post — tenta usar fluxo de agentes, fallback para pipeline linear
    await pgClient.query(`UPDATE jobs SET stage='drafting_post', progress=${stageProgress('drafting_post')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'drafting_post',
      progress: stageProgress('drafting_post'),
      tenantId: job.tenant_id,
    });

    let generatedTitle = titleHint;
    let generatedContent = '';
    let postId: string | null = null;
    let usedGraph = false;

    // Tenta executar via fluxo de agentes
    try {
      const graphDef = await loadDefaultGraph(pool, job.tenant_id);
      if (graphDef) {
        console.log(`[post-worker] Using agent graph: ${graphDef.name} for job ${job.id}`);
        usedGraph = true;

        const traceId = generateTraceId();
        const trace = createGraphTrace({
          tenantId: job.tenant_id,
          clientId: job.client_id,
          userId: job.user_id,
          jobId: job.id,
          graphId: graphDef.id,
          graphName: graphDef.name,
        });

        const result = await executeGraph({
          jobId: job.id,
          tenantId: job.tenant_id,
          clientId: job.client_id,
          userId: job.user_id,
          payload: job.payload,
          pool,
          onNodeStart: (nodeId) => {
            console.log(`[post-worker] Graph node started: ${nodeId}`);
          },
          onNodeComplete: (nodeId, nodeResult) => {
            console.log(`[post-worker] Graph node completed: ${nodeId} (${nodeResult.status}, ${nodeResult.latency}ms)`);
          },
        });

        finalizeTrace(trace, result.success ? 'completed' : 'failed', {
          postId: result.postId,
          executionId: result.executionId,
        });

        if (result.success && result.state.draft.title) {
          generatedTitle = result.state.draft.title;
          generatedContent = result.state.draft.content;
          postId = result.postId || null;
        } else {
          throw new Error('Graph execution failed or returned empty draft');
        }
      }
    } catch (graphErr: any) {
      console.error('[post-worker] Graph execution failed, falling back to linear pipeline:', graphErr.message);
      usedGraph = false;
    }

    // Fallback: pipeline linear com LLM via factory
    if (!usedGraph) {
      const prompt = `Você é um redator especialista. Escreva um post para ${clientName} (${clientNiche || 'negócio'}).
Objetivo: ${goal}
Tom: ${tone}
Idioma: ${language}
Canais: ${channels.join(', ')}
Tema sugerido: ${titleHint}
Máximo aproximado de palavras: ${maxWords}
Inclua título e corpo do texto.${sourceContext}`;

      try {
        const llm = createLLMClient();
        const result = await llm.chatCompletion({
          model: getDefaultModel(),
          max_tokens: Math.min(2048, Math.max(512, Math.round(maxWords * 1.5))),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });
        const raw = result.content;
        const lines = raw.split('\n').filter((l) => l.trim());
        if (lines[0]?.toLowerCase().startsWith('título:')) {
          generatedTitle = lines[0].replace(/^t[ií]tulo[:\s]*/i, '').trim();
          generatedContent = lines.slice(1).join('\n').trim();
        } else if (lines[0]?.startsWith('#')) {
          generatedTitle = lines[0].replace(/^#+\s*/, '').trim();
          generatedContent = lines.slice(1).join('\n').trim();
        } else {
          generatedTitle = titleHint;
          generatedContent = raw;
        }
      } catch (aiErr: any) {
        generatedContent = `Rascunho automático para ${clientName}.\n\nTema: ${titleHint}\nObjetivo: ${goal}\nCanais: ${channels.join(', ')}`;
        console.error('[post-worker] LLM error, falling back to draft:', aiErr.message);
      }
    }

    await sleep(200);

    // Stage: finalizing (save post)
    await pgClient.query(`UPDATE jobs SET stage='finalizing', progress=${stageProgress('finalizing')}, updated_at=NOW() WHERE id=$1`, [job.id]);
    broadcastJobEvent(job.user_id, {
      type: 'job:stage',
      jobId: job.id,
      stage: 'finalizing',
      progress: stageProgress('finalizing'),
      tenantId: job.tenant_id,
    });

    if (!postId) {
      const { rows: postRows } = await pgClient.query(
        `INSERT INTO posts (tenant_id, client_id, user_id, title, content, channels, status, generated_by)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7) RETURNING id`,
        [job.tenant_id, job.client_id, job.user_id, generatedTitle, generatedContent, JSON.stringify(channels), usedGraph ? 'agent-graph' : getDefaultModel()]
      );
      postId = postRows[0].id;
    }

    await pgClient.query(`UPDATE jobs SET status='completed', progress=100, result_post_id=$1, updated_at=NOW() WHERE id=$2`, [postId, job.id]);

    broadcastJobEvent(job.user_id, {
      type: 'job:complete',
      jobId: job.id,
      postId: postId!,
      tenantId: job.tenant_id,
    });

    console.log(`[post-worker] Job ${job.id} completed → post ${postId} (graph=${usedGraph})`);
  } catch (err: any) {
    console.error(`[post-worker] Job ${job.id} failed:`, err.message);
    const nextAttempt = (job.attempt || 0) + 1;
    const isRetryable = nextAttempt < (job.max_attempts || 3);
    const newStatus = isRetryable ? 'retrying' : 'failed';
    await pgClient.query(
      `UPDATE jobs SET status=$1, attempt=$2, error=$3, updated_at=NOW() WHERE id=$4`,
      [newStatus, nextAttempt, JSON.stringify({ code: 'BF_PROVIDER_UNAVAILABLE', message: err.message, retryable: isRetryable }), job.id]
    );

    broadcastJobEvent(job.user_id, {
      type: 'job:failed',
      jobId: job.id,
      error: err.message,
      tenantId: job.tenant_id,
    });
  } finally {
    pgClient.release();
  }
}

export function startPostWorker(pool: Pool, intervalMs = 5000) {
  console.log(`[post-worker] Starting worker (interval=${intervalMs}ms)`);

  const tick = async () => {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query<JobRow>(
          `SELECT id, tenant_id, client_id, user_id, status, stage, progress, attempt, max_attempts, payload
           FROM jobs
           WHERE status IN ('queued', 'retrying')
             AND attempt < max_attempts
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED`
        );

        if (rows[0]) {
          await processJob(rows[0], pool);
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('[post-worker] Tick error:', err.message);
    }
  };

  const timer = setInterval(tick, intervalMs);

  // Graceful shutdown helper
  return {
    stop: () => clearInterval(timer),
    tick,
  };
}
