/**
 * Estado compartilhado do fluxo LangGraph
 * Persiste entre nós e é rastreável via Langfuse
 */

export interface CrawledContent {
  url: string;
  title: string;
  content_text: string;
  source_type: string;
}

export interface AgentState {
  // Identificadores
  jobId: string;
  tenantId: string;
  clientId: string;
  userId: string;

  // Entrada do usuário
  channels: string[];
  goal: string;
  language: string;
  tone: string;
  titleHint: string;
  maxWords: number;

  // Contexto do cliente
  clientName: string;
  clientNiche: string;
  clientDescription: string;

  // Resultados dos nós
  sources: CrawledContent[];
  research: string;
  creativeId?: string;
  analyticsInsights?: {
    topFormats: string[];
    topTopics: string[];
    avgEngagementRate: number;
    bestPostingHours: string[];
    recentWins: Array<{ format: string; topic: string; engagementRate: number }>;
    insightSummary: string;
    dataSource: 'meta_cache' | 'empty';
    lastUpdated: string;
  };
  references?: Array<{
    title: string;
    url: string;
    summary: string;
    angle: string;
    relevanceScore: number;
  }>;
  draft: {
    title: string;
    content: string;
  };
  review: {
    score: number;
    feedback: string;
    approved: boolean;
  };

  // Metadados de execução
  metadata: {
    totalTokens: number;
    totalLatency: number;
    models: string[];
    traceId?: string;
  };

  // Controle de fluxo
  retryCount: number;
  errors: Array<{ node: string; message: string; timestamp: string }>;
}

export function createInitialState(params: {
  jobId: string;
  tenantId: string;
  clientId: string;
  userId: string;
  payload: any;
  clientInfo: { name: string; niche: string; description: string };
}): AgentState {
  const { jobId, tenantId, clientId, userId, payload, clientInfo } = params;
  const p = payload || {};

  return {
    jobId,
    tenantId,
    clientId,
    userId,
    channels: Array.isArray(p.channels) ? p.channels : ['blog'],
    goal: p.goal || 'authority',
    language: p.language || 'pt-BR',
    tone: p.tone || 'consultivo',
    titleHint: p.title_hint || 'Postagem gerada automaticamente',
    maxWords: p.generation?.max_words || 500,
    clientName: clientInfo.name,
    clientNiche: clientInfo.niche,
    clientDescription: clientInfo.description,
    sources: [],
    research: '',
    draft: { title: '', content: '' },
    review: { score: 0, feedback: '', approved: false },
    metadata: { totalTokens: 0, totalLatency: 0, models: [] },
    retryCount: 0,
    errors: [],
  };
}
