import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createServer } from 'http';

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockGetClientForUser = vi.fn(async () => ({
  query: mockQuery,
  release: mockRelease,
}));

vi.mock('../pg-pool', () => ({
  pool: {
    query: vi.fn(),
  },
  getClientForUser: (...args: any[]) => mockGetClientForUser(...args),
}));

vi.mock('../services/post-worker', () => ({
  startPostWorker: vi.fn(),
}));

vi.mock('./dashboard', () => ({
  registerDashboardRoutes: vi.fn(),
}));

vi.mock('./analytics', () => ({
  registerAnalyticsRoutes: vi.fn(),
}));

vi.mock('./auth', () => ({
  registerAuthRoutes: vi.fn(),
}));

vi.mock('./client-documents', () => ({
  default: express.Router(),
}));

vi.mock('./client-moodboard', () => ({
  default: express.Router(),
}));

import { registerRoutes } from '../routes';

async function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = 'user-1';
    next();
  });

  const server = createServer(app);
  await registerRoutes(server, app);
  return app;
}

describe('POST /api/posts/:postId/creative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  it('retorna creative existente sem reinserir', async () => {
    const app = await createApp();

    mockQuery.mockImplementationOnce(async () => ({
      rows: [{ id: 'creative-existing' }],
    }));

    const res = await request(app)
      .post('/api/posts/post-1/creative')
      .set('x-tenant-id', 'tenant-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ creativeId: 'creative-existing', created: false });
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('sanitiza e limita texto ao criar creative de 1 slide', async () => {
    const app = await createApp();

    let insertedSlides: any[] = [];

    mockQuery.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM creatives') && sql.includes('post_id')) {
        return { rows: [] };
      }

      if (sql.includes('FROM posts')) {
        return {
          rows: [
            {
              id: 'post-1',
              client_id: 'client-1',
              title: 'Titulo #principal **forte**',
              content:
                'Slide 1: #Headline **markdown** com texto muito longo para validar corte do titulo no fluxo de ensure creative e limpar poluicao visual\nSubtitulo com #hashtag e muito texto para tambem validar truncamento no modo de um slide sem CTA',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO creatives')) {
        insertedSlides = JSON.parse(params[6]);
        return { rows: [{ id: 'creative-new' }] };
      }

      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/posts/post-1/creative')
      .set('x-tenant-id', 'tenant-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ creativeId: 'creative-new', created: true });
    expect(insertedSlides).toHaveLength(1);

    const firstSlide = insertedSlides[0];
    expect(firstSlide.title.text.includes('#')).toBe(false);
    expect(firstSlide.title.text.includes('*')).toBe(false);
    expect(firstSlide.subtitle.text.includes('#')).toBe(false);
    expect(firstSlide.subtitle.text.includes('*')).toBe(false);

    const titleWords = String(firstSlide.title.text).split(/\s+/).filter(Boolean);
    const subtitleWords = String(firstSlide.subtitle.text).split(/\s+/).filter(Boolean);

    expect(titleWords.length).toBeLessThanOrEqual(16);
    expect(subtitleWords.length).toBeLessThanOrEqual(18);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
