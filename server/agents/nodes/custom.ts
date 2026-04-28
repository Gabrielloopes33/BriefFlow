/**
 * Agente Customizado — Node do fluxo LangGraph
 * Executa um agente customizado configurado no banco
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import { getClientForUser } from '../../pg-pool';
import type { AgentState } from '../state';

function resolveCompatibleModel(provider: string, configuredModel?: string | null): string {
  const trimmed = configuredModel?.trim();
  if (!trimmed) return getDefaultModel(provider as any);

  const lower = trimmed.toLowerCase();
  if (provider === 'groq' && (lower.startsWith('gpt-') || lower.includes('openai'))) {
    return getDefaultModel('groq');
  }
  if (provider === 'moonshot' && lower.startsWith('gpt-')) {
    return getDefaultModel('moonshot');
  }

  return trimmed;
}

export async function customNode(
  state: AgentState,
  config?: Record<string, any>
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const agentId = config?.agentId;

  console.log(`[customNode] Executing with agentId: ${agentId}`);

  if (!agentId) {
    throw new Error('customNode requires config.agentId');
  }

  // Busca o agente do banco (usando getClientForUser para respeitar RLS)
  const pgClient = await getClientForUser(state.userId);
  let agent;
  try {
    const { rows } = await pgClient.query(
      'SELECT name, system_prompt, model, temperature, max_tokens FROM agents WHERE id = $1',
      [agentId]
    );
    agent = rows[0];
  } finally {
    pgClient.release();
  }

  console.log(`[customNode] Found agent: ${agent?.name || 'NOT FOUND'}`);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const llm = createLLMClient();
  const selectedModel = resolveCompatibleModel(llm.provider, agent.model);
  console.log(`[customNode] Using model: ${selectedModel} (provider=${llm.provider})`);

  const systemPrompt = agent.system_prompt || 'Você é um assistente útil.';
  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Objetivo: ${state.goal}
Tom: ${state.tone}
Idioma: ${state.language}
Canais: ${state.channels.join(', ')}
Tema sugerido: ${state.titleHint}
Máximo aproximado de palavras: ${state.maxWords}

${state.research ? `Insights da pesquisa:\n${state.research}\n\n` : ''}
${state.draft?.content ? `Rascunho atual:\n${state.draft.content}\n\n` : ''}
Execute sua tarefa como ${agent.name}.`;

  const result = await llm.chatCompletion({
    model: selectedModel,
    max_tokens: agent.max_tokens || 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: Number(agent.temperature) || 0.7,
  });

  console.log(`[customNode] LLM result: content length=${result.content?.length}, model=${result.model}`);

  const latency = Date.now() - startTime;
  const tokens = result.usage?.total_tokens || 0;

  return {
    draft: {
      title: state.titleHint,
      content: result.content,
    },
    metadata: {
      ...state.metadata,
      totalTokens: state.metadata.totalTokens + tokens,
      totalLatency: state.metadata.totalLatency + latency,
      models: [...state.metadata.models, result.model],
    },
  };
}
