/**
 * Agente Revisor — Node do fluxo LangGraph
 * Avalia a qualidade do post gerado e decide se aprova ou solicita revisão
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { buildClientContextBlock } from '../prompt-context';

interface ReviewerConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  minScore?: number;
}

export async function reviewerNode(
  state: AgentState,
  config: ReviewerConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const {
    model = getDefaultModel(),
    temperature = 0.3,
    maxTokens = 1024,
    minScore = 7,
  } = config;
  const clientContext = buildClientContextBlock(state);

  const systemPrompt = `Você é um editor de conteúdo sênior. Avalie o post segundo critérios objetivos.
Responda APENAS em formato JSON com esta estrutura:
{
  "score": number (0-10),
  "feedback": "string com pontos fortes e fracos",
  "approved": boolean,
  "suggestions": ["array de sugestões específicas de melhoria"]
}

Critérios de avaliação:
- Clareza e coesão (0-3)
- Relevância para o público-alvo (0-3)
- Originalidade e valor agregado (0-2)
- Adequação ao tom e objetivo (0-2)`;

  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Objetivo: ${state.goal}
Tom esperado: ${state.tone}
Idioma: ${state.language}
Canais: ${state.channels.join(', ')}

${clientContext}

TÍTULO DO POST:
${state.draft.title}

CONTEÚDO DO POST:
${state.draft.content}

Avalie o post acima.`;

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

    const score = Math.min(10, Math.max(0, Number(parsed.score) || 5));
    const approved = parsed.approved === true || score >= minScore;

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      review: {
        score,
        feedback: parsed.feedback || 'Sem feedback detalhado.',
        approved,
      },
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[reviewer] LLM error:', err.message);
    return {
      review: {
        score: 5,
        feedback: `Erro na revisão: ${err.message}. Post aprovado por fallback.`,
        approved: true,
      },
      errors: [
        ...state.errors,
        { node: 'reviewer', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
