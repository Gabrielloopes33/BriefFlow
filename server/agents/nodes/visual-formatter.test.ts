import { describe, it, expect, vi, beforeEach } from 'vitest';
import { visualFormatterNode, suggestTemplate } from './visual-formatter';
import type { AgentState } from '../state';

// Mock do pg-pool e llm-provider
vi.mock('../../pg-pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../../services/llm-provider', () => ({
  createLLMClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
  getDefaultModel: vi.fn(() => 'moonshot-v1-8k'),
}));

import { pool } from '../../pg-pool';
import { createLLMClient } from '../../services/llm-provider';

describe('visual-formatter node', () => {
  const mockState: AgentState = {
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
      content: 'Dica 1: Poste consistentemente.\n\nDica 2: Use hashtags relevantes.\n\nDica 3: Engaje com sua audiência.\n\nDica 4: Analise seus dados.\n\nDica 5: Seja autêntico.',
    },
    review: { score: 0, feedback: '', approved: false },
    metadata: { totalTokens: 0, totalLatency: 0, models: [] },
    retryCount: 0,
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('suggestTemplate', () => {
    it('suggests carousel-lista for list content', () => {
      expect(suggestTemplate('5 dicas para...', 'authority')).toBe('carousel-lista');
      expect(suggestTemplate('Passo a passo...', 'authority')).toBe('carousel-lista');
    });

    it('suggests antes-e-depois for before/after content', () => {
      expect(suggestTemplate('Antes e depois da transformação', 'authority')).toBe('antes-e-depois');
    });

    it('suggests carousel-case for case studies', () => {
      expect(suggestTemplate('Resultado do case do cliente', 'authority')).toBe('carousel-case');
    });

    it('suggests quote for quote goal', () => {
      expect(suggestTemplate('Inspiração diária', 'citação')).toBe('quote');
    });

    it('suggests post-unico for single impact goal', () => {
      expect(suggestTemplate('Frase de impacto', 'único')).toBe('post-unico');
    });

    it('defaults to carousel-educativo', () => {
      expect(suggestTemplate('Conteúdo genérico', 'authority')).toBe('carousel-educativo');
    });
  });

  describe('visualFormatterNode', () => {
    it('returns creativeId when LLM and DB succeed', async () => {
      const mockLLM = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify([
                    { slideIndex: 1, type: 'cover', headline: 'Capa', body: 'Intro' },
                    { slideIndex: 2, type: 'content', headline: 'Dica 1', body: 'Conteúdo' },
                    { slideIndex: 3, type: 'cta', headline: 'CTA', body: 'Siga!' },
                  ]),
                },
              }],
            },
          },
        },
      };
      vi.mocked(createLLMClient).mockReturnValue(mockLLM as any);

      // Mock template query
      vi.mocked(pool.query).mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('creative_templates')) {
          return { rows: [{ id: 'template-1', structure: { slides: [] } }] } as any;
        }
        if (sql.includes('INSERT INTO creatives')) {
          return { rows: [{ id: 'creative-123' }] } as any;
        }
        return { rows: [] } as any;
      });

      const result = await visualFormatterNode(mockState);

      expect(result.creativeId).toBe('creative-123');
      expect(result.errors).toBeUndefined();
    });

    it('returns undefined creativeId when no draft available', async () => {
      const stateNoDraft = { ...mockState, draft: { title: '', content: '' } };
      const result = await visualFormatterNode(stateNoDraft);
      expect(result.creativeId).toBeUndefined();
    });

    it('handles LLM error gracefully with fallback', async () => {
      const mockLLM = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('LLM timeout')),
          },
        },
      };
      vi.mocked(createLLMClient).mockReturnValue(mockLLM as any);

      vi.mocked(pool.query).mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO creatives')) {
          return { rows: [{ id: 'creative-fallback' }] } as any;
        }
        return { rows: [] } as any;
      });

      const result = await visualFormatterNode(mockState);

      // Fallback deve criar slides e um creative
      expect(result.creativeId).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('handles database error gracefully', async () => {
      const mockLLM = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify([
                    { slideIndex: 1, type: 'cover', headline: 'Capa', body: 'Intro' },
                  ]),
                },
              }],
            }),
          },
        },
      };
      vi.mocked(createLLMClient).mockReturnValue(mockLLM as any);

      vi.mocked(pool.query).mockRejectedValue(new Error('DB connection failed'));

      const result = await visualFormatterNode(mockState);

      expect(result.creativeId).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.node === 'visual-formatter')).toBe(true);
    });

    it('updates metadata with latency and models', async () => {
      const mockLLM = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify([
                    { slideIndex: 1, type: 'cover', headline: 'Capa', body: 'Intro' },
                  ]),
                },
              }],
            }),
          },
        },
      };
      vi.mocked(createLLMClient).mockReturnValue(mockLLM as any);

      vi.mocked(pool.query).mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO creatives')) {
          return { rows: [{ id: 'creative-1' }] } as any;
        }
        return { rows: [] } as any;
      });

      const result = await visualFormatterNode(mockState);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.totalLatency).toBeGreaterThan(0);
      expect(result.metadata?.models).toContain('visual-formatter');
    });
  });
});
