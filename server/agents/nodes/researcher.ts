/**
 * Agente Pesquisador — Node do fluxo LangGraph
 * Coleta e sintetiza conteúdo das fontes do cliente
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AgentState } from '../state';
import { selectProvider } from '../../services/crawler-provider';
import type { CrawlSource } from '../../services/crawler-provider';
import { createLangChainClient, getDefaultModel } from '../../services/llm-provider';

interface ResearcherConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxSources?: number;
  snippetLength?: number;
}

export async function researcherNode(
  state: AgentState,
  config: ResearcherConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const {
    model = getDefaultModel(),
    temperature = 0.5,
    maxTokens = 1024,
    maxSources = 5,
    snippetLength = 1200,
  } = config;

  // 1. Crawlar fontes do cliente
  const sources: CrawlSource[] = state.sources.map((s) => ({
    url: s.url,
    source_type: s.source_type || 'blog',
    source_id: (s as any).source_id || '',
  }));

  let crawledContents: any[] = [];

  if (sources.length > 0) {
    try {
      const sourcesByType = new Map<string, CrawlSource[]>();
      for (const s of sources) {
        const type = (s.source_type || 'blog').toLowerCase();
        const list = sourcesByType.get(type) || [];
        list.push(s);
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
      console.error('[researcher] Crawling error:', err.message);
    }
  }

  // 2. Compilar contexto
  const contextBlocks: string[] = [];
  for (const c of crawledContents.slice(0, maxSources)) {
    const snippet = c.content_text ? c.content_text.slice(0, snippetLength) : '';
    if (snippet) {
      contextBlocks.push(`Fonte: ${c.title} (${c.url})\n${snippet}`);
    }
  }

  const sourceContext = contextBlocks.length > 0
    ? `\n\nContexto das fontes do cliente:\n${contextBlocks.join('\n\n---\n\n')}`
    : '';

  // 3. Sintetizar com LLM
  const llmConfig = createLangChainClient();
  if (!llmConfig) {
    console.error('[researcher] No LLM provider configured');
    return {
      research: 'Erro: nenhum provider LLM configurado.',
      errors: [
        ...state.errors,
        { node: 'researcher', message: 'No LLM provider configured', timestamp: new Date().toISOString() },
      ],
    };
  }

  const llm = new ChatOpenAI({
    modelName: model,
    temperature,
    maxTokens,
    openAIApiKey: llmConfig.openAIApiKey,
    configuration: llmConfig.configuration,
  });

  const systemPrompt = `Você é um pesquisador especializado. Analise as fontes fornecidas e extraia:
1. Tendências e insights principais
2. Dados relevantes para o nicho do cliente
3. Ângulos de conteúdo que podem ser explorados
4. Lacunas de informação que o post pode preencher

Seja conciso e estruturado. Máximo 800 palavras.`;

  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Objetivo do post: ${state.goal}
Tema sugerido: ${state.titleHint}
Idioma: ${state.language}
${sourceContext}`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const research = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    const latency = Date.now() - startTime;
    const tokens = (response as any).usage?.total_tokens || 0;

    return {
      research,
      sources: crawledContents.map((c) => ({
        url: c.url,
        title: c.title,
        content_text: c.content_text?.slice(0, snippetLength) || '',
        source_type: c.source_type || 'blog',
      })),
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, model],
      },
    };
  } catch (err: any) {
    console.error('[researcher] LLM error:', err.message);
    return {
      research: `Erro na pesquisa: ${err.message}. Continuando com contexto limitado.`,
      errors: [
        ...state.errors,
        { node: 'researcher', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
