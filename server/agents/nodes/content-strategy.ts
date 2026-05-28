/**
 * Agente Estrategista de Conteúdo — Node do fluxo LangGraph
 * Define o ângulo, pilar e abordagem do conteúdo antes da pesquisa
 * Baseado no skill content-strategy do marketingskills
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { buildClientContextBlock } from '../prompt-context';

interface ContentStrategyConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are a content strategist specialized in social media and Instagram carousels. Your goal is to define the best content angle, pillar, and approach before any writing happens.

## Your Job in This Pipeline

You receive context about the client (niche, goal, analytics) and produce a structured content brief that guides the researcher and carousel writer nodes downstream.

## Framework: Searchable vs Shareable

Every carousel must be one or both:
- **Shareable**: Novel insight, counterintuitive take, original angle, emotional story, data-driven surprise. People share to look smart or help others.
- **Searchable**: Answers a specific question your audience is actively asking.

For Instagram carousels, prioritize Shareable — carousels live and die by saves and shares.

## Content Pillar Categories

Map the request to one of these pillars:
1. **Educational** — How-tos, frameworks, step-by-step guides, demystifying concepts
2. **Insight** — Data, trends, counterintuitive takes, industry observations
3. **Story** — Behind-the-scenes, journey, failure/lesson, transformation
4. **Authority** — Case studies, results, social proof, expert perspective
5. **Engagement** — Questions, polls, hot takes, contrarian opinions

## Hook Angle Selection

Based on the goal and niche, choose the hook angle:
- **Curiosity**: "I was wrong about [belief]." / "The real reason X happens..."
- **Value**: "How to [outcome] without [pain]:" / "[N] things that [result]:"
- **Story**: "Last week, [unexpected event]." / "I almost [big mistake]."
- **Contrarian**: "Unpopular opinion: [bold statement]" / "[Common advice] is wrong."

## Output Format

Return a JSON object with this structure:
{
  "pillar": "Educational | Insight | Story | Authority | Engagement",
  "shareabilityType": "shareable | searchable | both",
  "hookAngle": "curiosity | value | story | contrarian",
  "refinedTopic": "The specific, focused angle for this carousel (1 sentence)",
  "whyItWillWork": "Why this angle resonates with the audience (1-2 sentences)",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "avoidAngle": "What NOT to do — the generic/obvious version to avoid (1 sentence)",
  "suggestedHook": "First line of the cover slide (grabby, tested formula)"
}`;

export async function contentStrategyNode(
  state: AgentState,
  config: ContentStrategyConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const { model = getDefaultModel(), temperature = 0.6, maxTokens = 1024 } = config;

  const analyticsContext = state.analyticsInsights?.dataSource !== 'empty'
    ? `Analytics do cliente:
- Formatos que mais performam: ${state.analyticsInsights!.topFormats.join(', ')}
- Tópicos com mais engajamento: ${state.analyticsInsights!.topTopics.join(', ')}
- Taxa média de engajamento: ${state.analyticsInsights!.avgEngagementRate}%
- Resumo: ${state.analyticsInsights!.insightSummary}`
    : 'Sem dados de analytics disponíveis.';
  const clientContext = buildClientContextBlock(state);

  const userPrompt = `Cliente: ${state.clientName}
Nicho: ${state.clientNiche || 'não especificado'}
Descrição: ${state.clientDescription || 'N/A'}
Objetivo do conteúdo: ${state.goal}
Tema sugerido: ${state.titleHint}
Tom de voz: ${state.tone}
Idioma: ${state.language}
Canais: ${state.channels.join(', ')}

${analyticsContext}

${clientContext}

Com base nesse contexto, defina a melhor estratégia para o carrossel. Retorne APENAS o JSON, sem markdown.`;

  try {
    const result = await llm.chatCompletion({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });

    const raw = result.content;
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ||
                      raw.match(/```\s*([\s\S]*?)\s*```/) ||
                      raw.match(/(\{[\s\S]*\})/);

    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr);

    const brief = [
      `## Estratégia de Conteúdo`,
      `**Pilar**: ${parsed.pillar}`,
      `**Tipo**: ${parsed.shareabilityType}`,
      `**Ângulo de Hook**: ${parsed.hookAngle}`,
      `**Tópico Refinado**: ${parsed.refinedTopic}`,
      `**Por que vai funcionar**: ${parsed.whyItWillWork}`,
      `**Pontos-chave a cobrir**: ${(parsed.keyPoints || []).map((p: string) => `- ${p}`).join('\n')}`,
      `**Evitar**: ${parsed.avoidAngle}`,
      `**Hook sugerido para a capa**: "${parsed.suggestedHook}"`,
    ].join('\n');

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      contentBrief: brief,
      titleHint: parsed.suggestedHook || state.titleHint,
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[content-strategy] error:', err.message);
    return {
      contentBrief: `Tema: ${state.titleHint}\nNicho: ${state.clientNiche}\nObjetivo: ${state.goal}`,
      errors: [
        ...state.errors,
        { node: 'content-strategy', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
