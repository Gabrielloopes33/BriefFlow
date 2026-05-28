/**
 * Agente Redator de Carrossel — Node do fluxo LangGraph
 * Gera copy otimizada para carrossel Instagram com base na pesquisa e contexto
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { buildClientContextBlock } from '../prompt-context';

interface CarouselWriterConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

function stripVisualNoise(text: string): string {
  return text
    .replace(/\B#[\wÀ-ÿ-]+/g, ' ')
    .replace(/[\*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampWords(text: string, maxWords: number): string {
  const words = stripVisualNoise(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

export async function carouselWriterNode(
  state: AgentState,
  config: CarouselWriterConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const {
    model = getDefaultModel(),
    temperature = 0.7,
    maxTokens = 2048,
  } = config;

  const slideCount = (state.payload?.slide_count || state.payload?.slidesCount || 5);
  const safeCount = Math.min(10, Math.max(1, slideCount));
  const clientContext = buildClientContextBlock(state);

  const systemPrompt = `You are an expert social media strategist specialized in Instagram carousels that drive saves, shares, and engagement. Your goal is to create carousel copy that builds audience, drives engagement, and supports business goals.

## Hook Formulas — The First Slide Determines Everything

Choose one hook type based on the content brief:

**Curiosity**: "I was wrong about [common belief]." / "The real reason [outcome] happens isn't what you think." / "[Result] — and it only took [short time]."
**Value**: "How to [outcome] without [pain]:" / "[N] [things] that [result]:" / "Stop [mistake]. Do this instead:"
**Story**: "Last week, [unexpected thing] happened." / "I almost [big mistake]." / "[N] years ago I [past]. Today, [present]."
**Contrarian**: "Unpopular opinion: [bold statement]" / "[Common advice] is wrong. Here's why:"

## Slide Architecture

- **Slide 1 (Cover)**: Bold hook that triggers curiosity or promises clear value. Subtitle sets up the promise.
- **Slides 2–N-1 (Middle)**: Each slide delivers one idea. Use specificity over vagueness. Numbered points, short sentences, white space in mind.
- **Last Slide (CTA)**: Invite to save, share, comment, or follow. Make it feel natural, not forced.

## Psychology Triggers to Apply

Weave these throughout — don't force all of them:
- **Social proof**: "Thousands of people..." / "Studies show..." / "Top performers..."
- **Loss aversion**: Frame around what they'll miss or lose, not just what they gain
- **Specificity**: "Cut reporting from 4 hours to 15 minutes" beats "save time"
- **Reciprocity**: Give a genuinely useful insight before asking for anything
- **Authority**: Reference data, experience, or results to earn trust

## Writing Rules

- Simple over complex: "use" not "utilize", "help" not "facilitate"
- Specific over vague: avoid "streamline", "optimize", "innovative"
- Active voice: "We generate reports" not "Reports are generated"
- No exclamation points in titles — let the idea carry the energy
- Each slide must work as a standalone thought
- Never use hashtags in slide text
- Never use markdown markers like #, **, *, _, or backticks in title/subtitle

## Output Format

Return ONLY a JSON array. No markdown wrapper, no explanation:
[{"title":"...","subtitle":"..."},...]

- title: max 12 words, hook or clear value statement
- subtitle: max ${state.payload?.textDepth === 'detailed' ? 80 : 45} words, delivers one idea, creates connection`;

  const userPrompt = `Client: ${state.clientName} (${state.clientNiche || 'business'})
Description: ${state.clientDescription || 'N/A'}
Goal: ${state.goal}
Tone: ${state.tone}
Language: ${state.language}
Channels: ${state.channels.join(', ')}
Number of slides: ${safeCount}

${state.contentBrief ? `## Content Strategy Brief\n${state.contentBrief}\n\n` : `Topic: ${state.titleHint}\n\n`}${clientContext}${state.research ? `## Research Insights\n${state.research}\n\n` : ''}${state.analyticsInsights?.dataSource !== 'empty' ? `## Client Performance Insights\n${state.analyticsInsights!.insightSummary}\nTop formats: ${state.analyticsInsights!.topFormats.join(', ')}\nBest posting times: ${state.analyticsInsights!.bestPostingHours.join(', ')}\n\n` : ''}${state.references?.length ? `## Relevant References\n${state.references.map(r => `- ${r.title}: ${r.summary} (Angle: ${r.angle})`).join('\n')}\n\n` : ''}
Create ${safeCount} slides for an Instagram carousel. Return ONLY the JSON array, no other text.`;

  try {
    const result = await llm.chatCompletion({
      model,
      max_tokens: Math.min(4096, Math.max(1024, safeCount * 300)),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });

    const raw = result.content;

    // Extrai JSON do markdown
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ||
                      raw.match(/```\s*([\s\S]*?)\s*```/) ||
                      raw.match(/(\[[\s\S]*\])/);

    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error('LLM returned non-array for slides');
    }

    const oneSlideMode = safeCount === 1;
    const slides = parsed.map((item: any, index: number) => ({
      title: clampWords(String(item?.title || item?.headline || `Slide ${index + 1}`), oneSlideMode ? 16 : 12).slice(0, 120),
      subtitle: clampWords(String(item?.subtitle || item?.body || ''), oneSlideMode ? 18 : 45).slice(0, 420),
    })).slice(0, safeCount);

    // Garante CTA no último slide
    if (slides.length > 0 && !oneSlideMode) {
      const last = slides[slides.length - 1];
      const hasCTA = /salve|compartilhe|siga|comente|curta|link|bio|clique/i.test(last.subtitle);
      if (!hasCTA) {
        last.subtitle = `${last.subtitle} Salve este carrossel e compartilhe com quem precisa ver! 💾`;
      }
    }

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      slides,
      draft: {
        title: state.titleHint,
        content: slides.map((s: any, i: number) => `Slide ${i + 1}: ${s.title}\n${s.subtitle}`).join('\n\n'),
      },
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[carousel-writer] LLM error:', err.message);
    return {
      slides: Array.from({ length: safeCount }, (_, index) => ({
        title: index === 0 ? state.titleHint.slice(0, 90) : `Ponto ${index + 1}`,
        subtitle: index === safeCount - 1
          ? 'Salve este carrossel e compartilhe com seu time.'
          : `Resumo do tema: ${state.titleHint.slice(0, 180)}`,
      })),
      draft: {
        title: state.titleHint,
        content: `Rascunho automático para ${state.clientName}.\n\nTema: ${state.titleHint}`,
      },
      errors: [
        ...state.errors,
        { node: 'carousel-writer', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
