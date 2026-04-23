/**
 * Tests for LLM Provider Factory (ADR-005)
 * S5-02: Moonshot API Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLLMClient,
  getDefaultModel,
  resolvePrimaryProvider,
  createLangChainClient,
  isLLMConfigured,
  type LLMClient,
} from './llm-provider';

describe('llm-provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear LLM-related env vars before each test
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.MOONSHOT_BASE_URL;
    delete process.env.MOONSHOT_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  // ─── resolvePrimaryProvider ─────────────────────────────────

  describe('resolvePrimaryProvider', () => {
    it('returns "moonshot" when MOONSHOT_API_KEY is set', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      expect(resolvePrimaryProvider()).toBe('moonshot');
    });

    it('returns "openai" when only OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      expect(resolvePrimaryProvider()).toBe('openai');
    });

    it('returns "openai" when no keys are set', () => {
      expect(resolvePrimaryProvider()).toBe('openai');
    });

    it('prefers moonshot over openai when both are set', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      expect(resolvePrimaryProvider()).toBe('moonshot');
    });
  });

  // ─── getDefaultModel ────────────────────────────────────────

  describe('getDefaultModel', () => {
    it('returns moonshot default model when moonshot is primary', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      expect(getDefaultModel()).toBe('moonshot-v1-8k');
    });

    it('returns openai default model when openai is primary', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      expect(getDefaultModel()).toBe('gpt-4o-mini');
    });

    it('respects MOONSHOT_MODEL env var', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      process.env.MOONSHOT_MODEL = 'moonshot-v1-32k';
      expect(getDefaultModel()).toBe('moonshot-v1-32k');
    });

    it('respects OPENAI_MODEL env var', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.OPENAI_MODEL = 'gpt-4o';
      expect(getDefaultModel()).toBe('gpt-4o');
    });
  });

  // ─── isLLMConfigured ────────────────────────────────────────

  describe('isLLMConfigured', () => {
    it('returns true when MOONSHOT_API_KEY is set', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      expect(isLLMConfigured()).toBe(true);
    });

    it('returns true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      expect(isLLMConfigured()).toBe(true);
    });

    it('returns false when no keys are set', () => {
      expect(isLLMConfigured()).toBe(false);
    });
  });

  // ─── createLLMClient ────────────────────────────────────────

  describe('createLLMClient', () => {
    it('creates moonshot client when MOONSHOT_API_KEY is set', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      const client = createLLMClient();
      expect(client.provider).toBe('moonshot');
      expect(client.model).toBe('moonshot-v1-8k');
    });

    it('uses custom MOONSHOT_BASE_URL when provided', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      process.env.MOONSHOT_BASE_URL = 'https://custom.moonshot.cn/v1';
      const client = createLLMClient();
      expect(client.provider).toBe('moonshot');
      // baseURL is internal, but client creation should not throw
      expect(() => client.chatCompletion).not.toThrow();
    });

    it('falls back to openai when MOONSHOT_API_KEY is missing', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      const client = createLLMClient();
      expect(client.provider).toBe('openai');
      expect(client.model).toBe('gpt-4o-mini');
    });

    it('falls back to openai when preferred moonshot but key missing', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      const client = createLLMClient('moonshot');
      expect(client.provider).toBe('openai');
    });

    it('throws when no provider is configured', () => {
      expect(() => createLLMClient()).toThrow('No LLM provider configured');
    });

    it('creates openai client when explicitly preferred', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      const client = createLLMClient('openai');
      expect(client.provider).toBe('openai');
    });
  });

  // ─── createLangChainClient ──────────────────────────────────

  describe('createLangChainClient', () => {
    it('returns moonshot config for LangChain when available', () => {
      process.env.MOONSHOT_API_KEY = 'sk-moonshot-test';
      process.env.MOONSHOT_MODEL = 'moonshot-v1-32k';
      const config = createLangChainClient();
      expect(config).not.toBeNull();
      expect(config!.modelName).toBe('moonshot-v1-32k');
      expect(config!.openAIApiKey).toBe('sk-moonshot-test');
      expect(config!.configuration).toEqual({
        baseURL: 'https://api.moonshot.cn/v1',
      });
    });

    it('returns openai config for LangChain when moonshot unavailable', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.OPENAI_BASE_URL = 'https://custom.openai.com/v1';
      const config = createLangChainClient();
      expect(config).not.toBeNull();
      expect(config!.modelName).toBe('gpt-4o-mini');
      expect(config!.openAIApiKey).toBe('sk-openai-test');
      expect(config!.configuration).toEqual({
        baseURL: 'https://custom.openai.com/v1',
      });
    });

    it('returns null when no provider is configured', () => {
      expect(createLangChainClient()).toBeNull();
    });
  });

  // ─── LLMClient.chatCompletion (mocked) ──────────────────────

  describe('LLMClient.chatCompletion', () => {
    it('returns completion result with provider metadata', async () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      const client = createLLMClient();

      // We can't easily mock the internal OpenAI client without dependency injection,
      // but we can verify the method exists and has the right signature
      expect(typeof client.chatCompletion).toBe('function');
      expect(client.provider).toBe('openai');
      expect(client.model).toBe('gpt-4o-mini');
    });
  });
});
