/**
 * Agente Analista de Métricas — Node do fluxo LangGraph
 * Lê dados de client_analytics_cache e gera insights estruturados via Moonshot
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { getClientForUser } from '../../pg-pool';

interface MetricsAnalystConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function metricsAnalystNode(
  state: AgentState,
  config: MetricsAnalystConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const {
    model = getDefaultModel(),
    temperature = 0.3,
    maxTokens = 1024,
  } = config;

  // 1. Busca cache de analytics do cliente
  let rawData: Record<string, any> | null = null;
  let cacheSource: 'meta_cache' | 'empty' = 'empty';

  try {
    const pgClient = await getClientForUser(state.userId);
    try {
      const { rows } = await pgClient.query(
        `SELECT raw_data, insights, fetched_at
         FROM client_analytics_cache
         WHERE client_id = $1 AND platform = 'meta' AND period = '30d'
           AND expires_at > NOW()
         ORDER BY fetched_at DESC
         LIMIT 1`,
        [state.clientId]
      );
      if (rows[0]) {
        rawData = rows[0].raw_data || {};
        cacheSource = 'meta_cache';
      }
    } finally {
      pgClient.release();
    }
  } catch (err: any) {
    console.error('[metrics-analyst] Error reading cache:', err.message);
  }

  // 2. Se não há cache, retorna insights vazios (graceful)
  if (!rawData) {
    return {
      analyticsInsights: {
        topFormats: [],
        topTopics: [],
        avgEngagementRate: 0,
        bestPostingHours: [],
        recentWins: [],
        insightSummary: 'Sem dados de analytics disponíveis. Gerando conteúdo com base no perfil do cliente.',
        dataSource: 'empty',
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // 3. Sintetiza insights com LLM
  const llm = createLLMClient();

  const systemPrompt = `Você é um analista de redes sociais sênior. Analise os dados de performance e extraia insights acionáveis para criação de conteúdo.

Retorne APENAS um JSON com esta estrutura exata:
{
  "topFormats": ["formato1", "formato2", "formato3"],
  "topTopics": ["tópico1", "tópico2", "tópico3"],
  "avgEngagementRate": 0.045,
  "bestPostingHours": ["09:00", "18:00", "20:00"],
  "recentWins": [
    { "format": "carrossel", "topic": "produtividade", "engagementRate": 0.08 }
  ],
  "insightSummary": "Resumo em 2-3 frases do que funciona para este cliente"
}`;

  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Objetivo do post: ${state.goal}

Dados de performance (últimos 30 dias):
${JSON.stringify(rawData, null, 2)}

Analise os dados e extraia insights acionáveis.`;

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

    const raw = result.content || '{}';
    const parsed = JSON.parse(raw);

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      analyticsInsights: {
        topFormats: Array.isArray(parsed.topFormats) ? parsed.topFormats : [],
        topTopics: Array.isArray(parsed.topTopics) ? parsed.topTopics : [],
        avgEngagementRate: Number(parsed.avgEngagementRate) || 0,
        bestPostingHours: Array.isArray(parsed.bestPostingHours) ? parsed.bestPostingHours : [],
        recentWins: Array.isArray(parsed.recentWins) ? parsed.recentWins : [],
        insightSummary: parsed.insightSummary || 'Sem insights detalhados.',
        dataSource: cacheSource,
        lastUpdated: new Date().toISOString(),
      },
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[metrics-analyst] LLM error:', err.message);
    return {
      analyticsInsights: {
        topFormats: [],
        topTopics: [],
        avgEngagementRate: 0,
        bestPostingHours: [],
        recentWins: [],
        insightSummary: `Erro na análise: ${err.message}. Continuando sem insights de performance.`,
        dataSource: 'empty',
        lastUpdated: new Date().toISOString(),
      },
      errors: [
        ...state.errors,
        { node: 'metrics-analyst', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
