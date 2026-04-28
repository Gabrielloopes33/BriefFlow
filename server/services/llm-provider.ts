/**
 * LLM Provider Factory
 * Abstração sobre providers LLM com fallback automático
 * ADR-005: Moonshot como provider principal com fallback OpenAI
 */

import OpenAI from 'openai';

export type LLMProvider = 'moonshot' | 'openai' | 'groq';

export interface LLMClientConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export interface LLMCompletionOptions {
  model?: string;
  max_tokens?: number;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface LLMCompletionResult {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model: string;
  provider: LLMProvider;
}

export interface LLMClient {
  provider: LLMProvider;
  model: string;
  chatCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
}

// ─── Internals ───────────────────────────────────────────────

function createOpenAIClient(config: LLMClientConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeout ?? 60000,
  });
}

class OpenAICompatibleClient implements LLMClient {
  public provider: LLMProvider;
  public model: string;
  private client: OpenAI;

  constructor(provider: LLMProvider, model: string, clientConfig: LLMClientConfig) {
    this.provider = provider;
    this.model = model;
    this.client = createOpenAIClient(clientConfig);
  }

  async chatCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const completion = await this.client.chat.completions.create({
      model: options.model ?? this.model,
      max_tokens: options.max_tokens,
      messages: options.messages as any,
      temperature: options.temperature,
      response_format: options.response_format as any,
    });

    const message = completion.choices[0]?.message;
    const content = message?.content || '';

    return {
      content,
      usage: completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined,
      model: completion.model || options.model || this.model,
      provider: this.provider,
    };
  }
}

// ─── Factory ─────────────────────────────────────────────────

const DEFAULT_MOONSHOT_MODEL = 'moonshot-v1-8k';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Retorna o model padrão baseado no provider ativo
 * Lê env vars dinamicamente para permitir override
 */
export function getDefaultModel(provider?: LLMProvider): string {
  const p = provider || resolvePrimaryProvider();
  if (p === 'moonshot') {
    return process.env.MOONSHOT_MODEL || DEFAULT_MOONSHOT_MODEL;
  }
  if (p === 'groq') {
    return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  }
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

/**
 * Determina qual provider está disponível como primário
 */
export function resolvePrimaryProvider(): LLMProvider {
  if (process.env.MOONSHOT_API_KEY && process.env.MOONSHOT_API_KEY.length > 0) {
    return 'moonshot';
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0) {
    return 'groq';
  }
  return 'openai';
}

/**
 * Cria um cliente LLM com fallback automático.
 * Prioridade: Moonshot → OpenAI
 */
export function createLLMClient(preferred?: LLMProvider): LLMClient {
  const primary = preferred || resolvePrimaryProvider();

  // Tentar Moonshot
  if (primary === 'moonshot') {
    const apiKey = process.env.MOONSHOT_API_KEY;
    const baseURL = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
    const model = process.env.MOONSHOT_MODEL || DEFAULT_MOONSHOT_MODEL;

    if (apiKey) {
      return new OpenAICompatibleClient('moonshot', model, {
        apiKey,
        baseURL,
        timeout: 60000,
      });
    }

    console.warn('[llm-provider] MOONSHOT_API_KEY not set, falling back to Groq');
  }

  // Tentar Groq
  if (primary === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    const baseURL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

    if (apiKey) {
      return new OpenAICompatibleClient('groq', model, {
        apiKey,
        baseURL,
        timeout: 60000,
      });
    }

    console.warn('[llm-provider] GROQ_API_KEY not set, falling back to OpenAI');
  }

  // Fallback para OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    throw new Error(
      'No LLM provider configured. Set MOONSHOT_API_KEY, GROQ_API_KEY or OPENAI_API_KEY.'
    );
  }

  return new OpenAICompatibleClient('openai', model, {
    apiKey,
    baseURL,
    timeout: 60000,
  });
}

/**
 * Cria um cliente LangChain ChatOpenAI para o researcherNode
 * Retorna null se não houver provider configurado
 */
export function createLangChainClient(preferred?: LLMProvider): {
  modelName: string;
  temperature: number;
  openAIApiKey: string;
  configuration?: { baseURL: string };
} | null {
  const primary = preferred || resolvePrimaryProvider();

  if (primary === 'moonshot') {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (apiKey) {
      return {
        modelName: process.env.MOONSHOT_MODEL || DEFAULT_MOONSHOT_MODEL,
        temperature: 0.5,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
        },
      };
    }
    console.warn('[llm-provider] MOONSHOT_API_KEY not set, falling back to Groq for LangChain');
  }

  if (primary === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      return {
        modelName: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
        temperature: 0.5,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        },
      };
    }
    console.warn('[llm-provider] GROQ_API_KEY not set, falling back to OpenAI for LangChain');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return {
    modelName: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    temperature: 0.5,
    openAIApiKey: apiKey,
    configuration: process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.OPENAI_BASE_URL }
      : undefined,
  };
}

/**
 * Verifica se há algum provider LLM configurado
 */
export function isLLMConfigured(): boolean {
  return !!(
    process.env.MOONSHOT_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}
