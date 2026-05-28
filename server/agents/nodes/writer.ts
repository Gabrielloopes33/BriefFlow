/**
 * Agente Redator — Node do fluxo LangGraph
 * Gera o post com base na pesquisa e contexto do cliente
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { buildClientContextBlock } from '../prompt-context';

interface WriterConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function writerNode(
  state: AgentState,
  config: WriterConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const {
    model = getDefaultModel(),
    temperature = 0.7,
    maxTokens = 2048,
  } = config;

  const systemPrompt = `Você é um redator especialista em marketing de conteúdo.
Regras:
1. Escreva no idioma solicitado
2. Respeite o tom de voz do cliente
3. Use os insights da pesquisa para enriquecer o conteúdo
4. Inclua título e corpo do texto
5. Respeite o limite aproximado de palavras
6. Formato de saída:
   Título: [título do post]
   
   [corpo do texto]`;
  const clientContext = buildClientContextBlock(state);

  const userPrompt = `Cliente: ${state.clientName} (${state.clientNiche || 'negócio'})
Descrição: ${state.clientDescription || 'N/A'}
Objetivo: ${state.goal}
Tom: ${state.tone}
Idioma: ${state.language}
Canais: ${state.channels.join(', ')}
Tema sugerido: ${state.titleHint}
Máximo aproximado de palavras: ${state.maxWords}

${clientContext}${state.research ? `Insights da pesquisa:\n${state.research}\n\n` : ''}${state.analyticsInsights?.dataSource !== 'empty' ? `Insights de performance do cliente:\n${state.analyticsInsights!.insightSummary}\nFormatos que funcionam: ${state.analyticsInsights!.topFormats.join(', ')}\nMelhores horários: ${state.analyticsInsights!.bestPostingHours.join(', ')}\n\n` : ''}${state.references?.length ? `Referências relevantes:\n${state.references.map(r => `- ${r.title}: ${r.summary} (Ângulo: ${r.angle})`).join('\n')}\n\n` : ''}
Escreva o post completo.`;

  try {
    const result = await llm.chatCompletion({
      model,
      max_tokens: Math.min(4096, Math.max(512, Math.round(state.maxWords * 2))),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });

    const raw = result.content;
    const lines = raw.split('\n').filter((l) => l.trim());

    let generatedTitle = state.titleHint;
    let generatedContent = raw;

    if (lines[0]?.toLowerCase().startsWith('título:')) {
      generatedTitle = lines[0].replace(/^t[ií]tulo[:\s]*/i, '').trim();
      generatedContent = lines.slice(1).join('\n').trim();
    } else if (lines[0]?.startsWith('#')) {
      generatedTitle = lines[0].replace(/^#+\s*/, '').trim();
      generatedContent = lines.slice(1).join('\n').trim();
    }

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      draft: {
        title: generatedTitle,
        content: generatedContent,
      },
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[writer] LLM error:', err.message);
    return {
      draft: {
        title: state.titleHint,
        content: `Rascunho automático para ${state.clientName}.\n\nTema: ${state.titleHint}\nObjetivo: ${state.goal}\nCanais: ${state.channels.join(', ')}`,
      },
      errors: [
        ...state.errors,
        { node: 'writer', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
