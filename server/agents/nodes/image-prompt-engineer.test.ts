import { beforeEach, describe, expect, it, vi } from 'vitest';
import { imagePromptEngineerNode } from './image-prompt-engineer';
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

describe('image-prompt-engineer node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parseia json em bloco markdown com virgula final', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content:
          '```json\n[\n  {"slideIndex":0,"prompt":"Prompt A"},\n  {"slideIndex":1,"prompt":"Prompt B"},\n]\n```',
        usage: { total_tokens: 80 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      slides: [
        { title: 'Slide 1', subtitle: 'Texto 1' },
        { title: 'Slide 2', subtitle: 'Texto 2' },
      ],
    });

    const result = await imagePromptEngineerNode(state);

    expect(result.imagePrompts?.[0]).toContain('Prompt A');
    expect(result.imagePrompts?.[1]).toContain('Prompt B');
    expect(result.imagePrompts?.[0]).toContain('full-bleed background');
    expect(result.imagePrompts?.[1]).toContain('full-bleed background');
    expect(result.errors).toBeUndefined();
  });

  it('usa fallback quando resposta do llm e invalida', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: 'nao e json',
        usage: { total_tokens: 10 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      slides: [{ title: 'Titulo com foco', subtitle: 'Subtitulo explicativo' }],
      payload: { visual_style: 'editorial' },
    });

    const result = await imagePromptEngineerNode(state);

    expect(result.imagePrompts).toHaveLength(1);
    expect(result.imagePrompts?.[0]).toContain('full-bleed background');
    expect(result.imagePrompts?.[0]).toContain('subject occupies most of frame');
    expect(result.imagePrompts?.[0]).toContain('concept keywords:');
    expect(result.imagePrompts?.[0]).toContain('thumb-stopping hero shot');
    expect(result.errors?.[0]?.node).toBe('image-prompt-engineer');
  });

  it('normaliza prompt curto adicionando requisitos minimos de composicao', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: JSON.stringify([{ slideIndex: 0, prompt: 'Profissional em escritorio moderno' }]),
        usage: { total_tokens: 35 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      slides: [{ title: 'Titulo', subtitle: 'Subtitulo' }],
      payload: { canvasWidth: 1080, canvasHeight: 1350 },
    });

    const result = await imagePromptEngineerNode(state);
    const prompt = result.imagePrompts?.[0] || '';

    expect(prompt).toContain('1080x1350');
    expect(prompt).toContain('full-bleed background');
    expect(prompt).toContain('subject occupies most of frame');
    expect(prompt).toContain('no text');
    expect(prompt).toContain('no typography');
    expect(prompt).toContain('no watermark');
    expect(prompt).toContain('exclude: readable characters');
  });

  it('remove conceitos que induzem texto na imagem', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            slideIndex: 0,
            prompt: 'Success story panels with quotes, testimonials, screens and data visualizations in the background',
          },
        ]),
        usage: { total_tokens: 45 },
        model: 'moonshot-v1-8k',
      }),
    } as any);

    const state = createBaseState({
      slides: [{ title: 'Casos de sucesso', subtitle: 'Resultados reais com IA' }],
      payload: { canvasWidth: 1080, canvasHeight: 1350 },
    });

    const result = await imagePromptEngineerNode(state);
    const prompt = result.imagePrompts?.[0] || '';

    expect(prompt.toLowerCase()).not.toContain('quotes');
    expect(prompt.toLowerCase()).not.toContain('testimonials');
    expect(prompt.toLowerCase()).not.toContain('screens');
    expect(prompt.toLowerCase()).not.toContain('data visualizations');
    expect(prompt).toContain('blank surfaces');
  });
});
