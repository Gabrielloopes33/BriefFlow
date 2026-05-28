import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSlideImage } from './creative-ai';

const originalEnv = { ...process.env };

describe('generateSlideImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, FAL_API_KEY: 'test-fal-key', OPENAI_API_KEY: '' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('retries with stronger text safety when prompt contains text-bearing concepts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [{ url: 'https://img.example.com/first.jpg' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [{ url: 'https://img.example.com/retry.jpg' }] }),
      });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await generateSlideImage(
      'Success story panels with quotes, testimonials and screens in the background',
      'editorial',
      1080,
      1350
    );

    expect(result).toBe('https://img.example.com/retry.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));

    expect(firstBody.prompt).toContain('quotes');
    expect(secondBody.prompt).toContain('blank surfaces');
    expect(secondBody.prompt).toContain('no visible writing');
    expect(secondBody.prompt).toContain('no screens');
  });

  it('keeps a single attempt for safe prompts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [{ url: 'https://img.example.com/safe.jpg' }] }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await generateSlideImage(
      'Modern office with a robotic arm and dramatic side light',
      'editorial',
      1080,
      1350
    );

    expect(result).toBe('https://img.example.com/safe.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses fal dev model endpoint when explicitly requested', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [{ url: 'https://img.example.com/dev.jpg' }] }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await generateSlideImage(
      'Modern office with human collaboration scene',
      'editorial',
      1080,
      1350,
      'dev'
    );

    expect(result).toBe('https://img.example.com/dev.jpg');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/fal-ai/flux/dev');
  });
});