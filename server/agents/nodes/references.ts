/**
 * Agente Curador de Referências — Node do fluxo LangGraph
 * Busca fontes do cliente, crawla conteúdo e ranqueia via Moonshot
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import { selectProvider } from '../../services/crawler-provider';
import type { CrawlSource } from '../../services/crawler-provider';
import type { AgentState } from '../state';
import { getClientForUser } from '../../pg-pool';

interface ReferencesConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxReferences?: number;
}

export async function referencesNode(
  state: AgentState,
  config: ReferencesConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const {
    model = getDefaultModel(),
    temperature = 0.3,
    maxTokens = 2048,
    maxReferences = 5,
  } = config;

  // 1. Busca sources ativas do cliente no banco
  let sources: Array<{ url: string; source_type: string; title?: string }> = [];

  try {
    const pgClient = await getClientForUser(state.userId);
    try {
      const { rows } = await pgClient.query(
        `SELECT url, source_type, title FROM sources
         WHERE client_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [state.clientId]
      );
      sources = rows;
    } finally {
      pgClient.release();
    }
  } catch (err: any) {
    console.error('[references] Error fetching sources:', err.message);
  }

  // 2. Se não há fontes, retorna array vazio (graceful)
  if (sources.length === 0) {
    return {
      references: [],
    };
  }

  // 3. Crawla conteúdo das fontes
  let crawledContents: any[] = [];

  try {
    const sourcesByType = new Map<string, CrawlSource[]>();
    for (const s of sources) {
      const type = (s.source_type || 'blog').toLowerCase();
      const list = sourcesByType.get(type) || [];
      list.push({ url: s.url, source_type: type });
      sourcesByType.set(type, list);
    }

    for (const [type, typeSources] of Array.from(sourcesByType.entries())) {
      const provider = selectProvider(type);
      const result = await provider.crawlBatch({
        tenant_id: state.tenantId,
        client_id: state.clientId,
        sources: typeSources,
      });
      crawledContents.push(...(result.contents || []));
    }
  } catch (err: any) {
    console.error('[references] Crawling error:', err.message);
    return {
      references: [],
      errors: [
        ...state.errors,
        { node: 'references', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }

  // 4. Se não conseguiu crawlar nada, retorna vazio
  if (crawledContents.length === 0) {
    return {
      references: [],
    };
  }

  // 5. Ranqueia e resume com LLM
  const llm = createLLMClient();

  const contextBlocks = crawledContents.slice(0, 10).map((c) => ({
    title: c.title || 'Sem título',
    url: c.url,
    content: c.content_text ? c.content_text.slice(0, 800) : '',
    type: c.source_type || 'blog',
  }));

  const systemPrompt = `Você é um curador de conteúdo especializado. Analise as referências fornecidas e selecione as mais relevantes para o objetivo do post.

Retorne APENAS um JSON array com no máximo ${maxReferences} itens, ordenados por relevanceScore decrescente:
[
  {
    "title": "Título do conteúdo",
    "url": "https://...",
    "summary": "Resumo em 1 frase",
    "angle": "Ângulo específico para conteúdo original",
    "relevanceScore": 0.92
  }
]`;

  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Objetivo do post: ${state.goal}
Nicho: ${state.clientNiche || 'geral'}
Tema sugerido: ${state.titleHint}

Conteúdos das fontes do cliente:
${JSON.stringify(contextBlocks, null, 2)}

Selecione as ${maxReferences} referências mais relevantes e extraia ângulos de conteúdo.`;

  try {
    const result = await llm.chatCompletion({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });

    const raw = result.content || '[]';
    let parsed: any[];

    try {
      const jsonObj = JSON.parse(raw);
      // O LLM pode retornar {references: [...]} ou [...]
      parsed = Array.isArray(jsonObj) ? jsonObj : (jsonObj.references || []);
    } catch {
      parsed = [];
    }

    const references = parsed.slice(0, maxReferences).map((r: any) => ({
      title: r.title || 'Sem título',
      url: r.url || '',
      summary: r.summary || '',
      angle: r.angle || '',
      relevanceScore: Number(r.relevanceScore) || 0,
    }));

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      references,
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[references] LLM error:', err.message);
    return {
      references: [],
      errors: [
        ...state.errors,
        { node: 'references', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
