import { beforeEach, describe, expect, it, vi } from 'vitest';
import { htmlSlideGeneratorNode } from './html-slide-generator';
import type { AgentState } from '../state';

vi.mock('../../services/llm-provider', () => ({
  createLLMClient: vi.fn(() => ({
    chatCompletion: vi.fn(),
  })),
  getDefaultModel: vi.fn(() => 'moonshot-v1-8k'),
}));

import { createLLMClient } from '../../services/llm-provider';

function createBaseState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    jobId: 'job-1',
    tenantId: 'tenant-1',
    clientId: 'client-1',
    userId: 'user-1',
    channels: ['instagram'],
    goal: 'authority',
    language: 'pt-BR',
    tone: 'consultivo',
    titleHint: 'Teste',
    maxWords: 500,
    clientName: 'Cliente Teste',
    clientNiche: 'marketing',
    clientDescription: 'Descricao',
    sources: [],
    research: '',
    draft: { title: 'Titulo', content: 'Conteudo' },
    review: { score: 0, feedback: '', approved: false },
    metadata: { totalTokens: 0, totalLatency: 0, models: [] },
    retryCount: 0,
    errors: [],
    ...overrides,
  };
}

function makePlanResponse(total: number, ctaVisible = true) {
  return JSON.stringify(
    Array.from({ length: total }, (_, idx) => ({
      slideIndex: idx,
      theme: 'dark',
      templateVariant: 'spotlight',
      backgroundColor: '#111827',
      backgroundGradient: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      overlayColor: '#000000',
      overlayOpacity: 40,
      textPosition: 'mid-left',
      titleColor: '#ffffff',
      subtitleColor: '#e5e7eb',
      accentColor: '#f97316',
      ctaVisible,
      ctaText: 'Clique aqui',
      ctaBackgroundColor: '#f97316',
    }))
  );
}

describe('html-slide-generator node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forca cta invisivel e sanitiza texto em modo 1 slide', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: makePlanResponse(1, true),
        usage: { total_tokens: 120 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      slides: [
        {
          title: '#headline **forte** com muitas palavras para validar corte e limpeza no layout final gerado',
          subtitle: 'Subtitulo com #hash e **markdown** e texto muito grande para validar truncamento agressivo em uma unica peça visual sem poluicao',
        },
      ],
    });

    const result = await htmlSlideGeneratorNode(state);
    const config = result.htmlSlideConfigs?.[0];

    expect(config).toBeDefined();
    expect(config?.ctaButton.visible).toBe(false);
    expect(config?.ctaButton.text).toBe('');
    expect(config?.title.text.includes('#')).toBe(false);
    expect(config?.title.text.includes('*')).toBe(false);
    expect(config?.subtitle.text.includes('#')).toBe(false);
    expect(config?.subtitle.text.includes('*')).toBe(false);
    expect(config?.title.text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(16);
    expect(config?.subtitle.text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(18);
  });

  it('mantem cta configuravel em modo multi-slide', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: makePlanResponse(2, true),
        usage: { total_tokens: 200 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      payload: { templateStrategy: 'ai' },
      slides: [
        { title: 'Slide 1', subtitle: 'Texto 1' },
        { title: 'Slide 2', subtitle: 'Texto 2' },
      ],
    });

    const result = await htmlSlideGeneratorNode(state);

    expect(result.htmlSlideConfigs).toHaveLength(2);
    expect(result.htmlSlideConfigs?.[0]?.ctaButton.visible).toBe(true);
    expect(result.htmlSlideConfigs?.[0]?.ctaButton.text).toBe('Clique aqui');
  });

  it('usa templates predefinidos por padrao e ativa cta apenas no ultimo slide', async () => {
    const state = createBaseState({
      slides: [
        { title: 'Slide 1', subtitle: 'Texto 1' },
        { title: 'Slide 2', subtitle: 'Texto 2' },
        { title: 'Slide 3', subtitle: 'Texto 3' },
      ],
    });

    const result = await htmlSlideGeneratorNode(state);

    expect(result.htmlSlideConfigs).toHaveLength(3);
    expect(result.htmlSlideConfigs?.[0]?.ctaButton.visible).toBe(false);
    expect(result.htmlSlideConfigs?.[1]?.ctaButton.visible).toBe(false);
    expect(result.htmlSlideConfigs?.[2]?.ctaButton.visible).toBe(true);
  });

  it('retorna fallback quando llm falha sem quebrar geracao', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockRejectedValue(new Error('timeout')),
    } as any);

    const state = createBaseState({
      slides: [{ title: 'Titulo', subtitle: 'Subtitulo' }],
    });

    const result = await htmlSlideGeneratorNode(state);

    expect(result.htmlSlideConfigs).toHaveLength(1);
    expect(result.htmlSlides).toHaveLength(1);
    expect(result.htmlSlideConfigs?.[0]?.ctaButton.visible).toBe(false);
  });
});
