import { beforeEach, describe, expect, it, vi } from 'vitest';
import { visualFormatterNode } from './visual-formatter';
import type { AgentState } from '../state';

vi.mock('../../pg-pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../../services/llm-provider', () => ({
  createLLMClient: vi.fn(() => ({
    chatCompletion: vi.fn(),
  })),
  getDefaultModel: vi.fn(() => 'moonshot-v1-8k'),
}));

import { pool } from '../../pg-pool';
import { createLLMClient } from '../../services/llm-provider';

const baseState: AgentState = {
  jobId: 'job-1',
  tenantId: 'tenant-1',
  clientId: 'client-1',
  userId: 'user-1',
  channels: ['instagram'],
  goal: 'authority',
  language: 'pt-BR',
  tone: 'consultivo',
  titleHint: 'Test',
  maxWords: 500,
  clientName: 'Test Client',
  clientNiche: 'tech',
  clientDescription: 'A tech company',
  sources: [],
  research: '',
  draft: {
    title: '5 Dicas para Crescer no Instagram',
    content: 'Dica 1: Poste consistentemente.\n\nDica 2: Use hashtags relevantes.',
  },
  review: { score: 0, feedback: '', approved: false },
  metadata: { totalTokens: 0, totalLatency: 0, models: [] },
  retryCount: 0,
  errors: [],
};

describe('visual-formatter node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns creativeId when llm and db succeed', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockResolvedValue({
        content: JSON.stringify([
          { slideIndex: 1, type: 'cover', headline: 'Capa', body: 'Intro' },
          { slideIndex: 2, type: 'cta', headline: 'CTA', body: 'Siga!' },
        ]),
      }),
    } as any);

    vi.mocked(pool.query).mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO creatives')) {
        return { rows: [{ id: 'creative-123' }] } as any;
      }
      return { rows: [] } as any;
    });

    const result = await visualFormatterNode(baseState);

    expect(result.creativeId).toBe('creative-123');
    expect(result.errors).toBeUndefined();
  });

  it('returns undefined creativeId when no draft exists', async () => {
    const result = await visualFormatterNode({
      ...baseState,
      draft: { title: '', content: '' },
    });

    expect(result.creativeId).toBeUndefined();
  });

  it('uses fallback when llm fails', async () => {
    vi.mocked(createLLMClient).mockReturnValue({
      chatCompletion: vi.fn().mockRejectedValue(new Error('LLM timeout')),
    } as any);

    vi.mocked(pool.query).mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO creatives')) {
        return { rows: [{ id: 'creative-fallback' }] } as any;
      }
      return { rows: [] } as any;
    });

    const result = await visualFormatterNode(baseState);

    expect(result.creativeId).toBe('creative-fallback');
    expect(result.errors).toBeUndefined();
  });

  it('generates html slide configs from pre-generated slides', async () => {
    const result = await visualFormatterNode(
      {
        ...baseState,
        slides: [
          { title: 'Hook forte', subtitle: 'Subtitulo objetivo' },
          { title: 'CTA final', subtitle: 'Chamada curta' },
        ],
      },
      { mode: 'studio' }
    );

    expect(result.slides).toHaveLength(2);
    expect(result.htmlSlideConfigs).toHaveLength(2);
    expect(result.htmlSlides).toHaveLength(2);
    expect(result.htmlSlideConfigs?.[0]?.accentColor).toBe('#C8A96E');
    expect(result.htmlSlideConfigs?.[1]?.ctaButton.visible).toBe(true);
  });
});
