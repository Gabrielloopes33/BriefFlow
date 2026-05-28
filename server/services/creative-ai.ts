import OpenAI from 'openai';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { createLLMClient, getDefaultModel, isLLMConfigured } from './llm-provider';
import { executeGraph, loadDefaultGraph } from '../agents/executor';
import type { AgentState } from '../agents/state';
import { registerJobAbortController, removeJobAbortController } from './job-abort-registry';

interface GeneratedSlideCopy {
  title: string;
  subtitle: string;
}

const ANTI_TEXT_NEGATIVE_PROMPT =
  'text, letters, words, typography, subtitles, captions, watermark, logo, signature, signage, ui text, readable characters, poster, billboard';

export type ImageModelPreference = 'schnell' | 'dev';

const TEXT_RISK_PATTERN = /\b(quote|quotes|testimonial|testimonials|screen|screens|monitor|monitors|dashboard|dashboards|ui|interface|interfaces|data visualization|data visualizations|graph|graphs|chart|charts|whiteboard|whiteboards|note|notes|document|documents|paperwork|poster|posters|billboard|billboards|signage|caption|captions|subtitle|subtitles|logo|logos|watermark|watermarks)\b/i;

interface SlideTextLayout {
  title: string;
  subtitle: string;
  position?: string;
  alignment?: 'left' | 'center' | 'right';
}

function resolveImageDimensions(canvasWidth = 1080, canvasHeight = 1080): {
  width: number;
  height: number;
  openAiSize: '1024x1024' | '1024x1536' | '1536x1024';
} {
  const width = Math.max(512, Math.min(2048, Math.round(canvasWidth)));
  const height = Math.max(512, Math.min(2048, Math.round(canvasHeight)));

  if (height > width) {
    return { width, height, openAiSize: '1024x1536' };
  }
  if (width > height) {
    return { width, height, openAiSize: '1536x1024' };
  }
  return { width, height, openAiSize: '1024x1024' };
}

function extractJsonCandidate(raw: string): string {
  const jsonMatch =
    raw.match(/```json\s*([\s\S]*?)\s*```/) ||
    raw.match(/```\s*([\s\S]*?)\s*```/) ||
    raw.match(/(\[[\s\S]*\])/) ||
    raw.match(/(\{[\s\S]*\})/);

  return (jsonMatch?.[1] || raw).trim();
}

function enforceNoTextImagePrompt(prompt: string, width: number, height: number): string {
  const cleaned = String(prompt || '').replace(/\s+/g, ' ').trim();
  const base = cleaned || 'Professional Instagram visual scene';
  return `${base} ${width}x${height}, photorealistic, full-bleed background, subject occupies most of frame, no text, no letters, no words, no typography, no logo, no watermark, no signage, exclude readable characters.`;
}

function shouldRetryForTextSafety(prompt: string): boolean {
  return TEXT_RISK_PATTERN.test(String(prompt || ''));
}

function buildTextSafeRetryPrompt(prompt: string): string {
  const cleaned = String(prompt || '')
    .replace(TEXT_RISK_PATTERN, 'abstract human-focused scene')
    .replace(/\s+/g, ' ')
    .trim();

  return `${cleaned || 'Professional Instagram visual scene'}, clean commercial photography, abstract geometric accents, blank surfaces, brandless objects, unlabeled environments, no screens, no dashboards, no documents, no posters, no signage, no quotes, no testimonials, no visible writing`;
}

function resolveFalModelPath(imageModel?: ImageModelPreference): string {
  const requested = String(imageModel || process.env.FAL_IMAGE_MODEL || '').toLowerCase().trim();
  if (requested === 'dev' || requested === 'fal-ai/flux/dev') return 'fal-ai/flux/dev';
  return 'fal-ai/flux/schnell';
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

function parseSlides(raw: string, targetCount = 5): GeneratedSlideCopy[] {
  const oneSlideMode = targetCount <= 1;
  const parsed = JSON.parse(extractJsonCandidate(raw));
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid slide payload from LLM');
  }

  return parsed.map((item, index) => ({
    title: clampWords(String(item?.title || item?.headline || `Slide ${index + 1}`), oneSlideMode ? 16 : 12).slice(0, 120),
    subtitle: clampWords(String(item?.subtitle || item?.body || ''), oneSlideMode ? 18 : 45).slice(0, 420),
  }));
}

async function generateImageWithFalFlux(
  prompt: string,
  styleHint?: string,
  canvasWidth = 1080,
  canvasHeight = 1080,
  imageModel?: ImageModelPreference
): Promise<string> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  const imageSpec = resolveImageDimensions(canvasWidth, canvasHeight);
  const imagePrompt = `${enforceNoTextImagePrompt(prompt, imageSpec.width, imageSpec.height)}${styleHint ? ` Estilo visual: ${styleHint}.` : ''}`;

  const modelPath = resolveFalModelPath(imageModel);
  const response = await fetch(`https://fal.run/${modelPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: imagePrompt,
      negative_prompt: ANTI_TEXT_NEGATIVE_PROMPT,
      image_size: { width: imageSpec.width, height: imageSpec.height },
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai error (${response.status}): ${errorText.slice(0, 220)}`);
  }

  const payload = await response.json();
  const imageUrl = payload?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('fal.ai returned empty image payload');
  }

  return imageUrl;
}

async function generateImageWithOpenAI(
  prompt: string,
  styleHint?: string,
  canvasWidth = 1080,
  canvasHeight = 1080
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const imageSpec = resolveImageDimensions(canvasWidth, canvasHeight);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imagePrompt = `${enforceNoTextImagePrompt(prompt, imageSpec.width, imageSpec.height)}${styleHint ? ` Estilo visual: ${styleHint}.` : ''}`;
  const result = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt: imagePrompt,
    size: imageSpec.openAiSize,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  const imageUrl = result.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('OpenAI image provider returned empty payload');
  }

  return imageUrl;
}

export async function generateSlidesCopy(prompt: string, slidesCount: number): Promise<GeneratedSlideCopy[]> {
  const safeCount = Math.min(10, Math.max(1, slidesCount));

  if (!isLLMConfigured()) {
    return Array.from({ length: safeCount }, (_, index) => ({
      title: index === 0 ? clampWords(prompt.slice(0, 90), safeCount === 1 ? 16 : 12) : `Ponto ${index + 1}`,
      subtitle: safeCount === 1
        ? ''
        : (index === safeCount - 1 ? 'Salve este carrossel e compartilhe com seu time.' : clampWords(`Resumo do tema: ${prompt.slice(0, 180)}`, 45)),
    }));
  }

  const llm = createLLMClient();
  const model = getDefaultModel();
  const response = await llm.chatCompletion({
    model,
    temperature: 0.5,
    max_tokens: 1600,
    messages: [
      {
        role: 'user',
        content: `Crie ${safeCount} slides para Instagram sobre: "${prompt}".\n\nRetorne APENAS JSON array com objetos: [{"title":"...","subtitle":"..."}]\nRegras:\n- title com no maximo 12 palavras\n- subtitle com no maximo 45 palavras\n- ultimo slide deve ter CTA`,
      },
    ],
  });

  const generated = parseSlides(response.content, safeCount);
  return generated.slice(0, safeCount);
}

interface GenerateSlidesWithAgentsOptions {
  prompt: string;
  slidesCount: number;
  tenantId: string;
  clientId: string;
  userId: string;
  pool: Pool;
  canvasWidth?: number;
  canvasHeight?: number;
  tone?: string;
  goal?: string;
  imageStyleHint?: string;
  textDepth?: 'concise' | 'detailed';
  signal?: AbortSignal;
  onProgress?: (stage: string, progress: number) => void;
}

/**
 * Gera slides de carrossel usando o fluxo multi-agente.
 * Fallback para generateSlidesCopy se não houver grafo configurado.
 */
export async function generateSlidesWithAgents(
  options: GenerateSlidesWithAgentsOptions
): Promise<{
  slides: GeneratedSlideCopy[];
  imagePrompts?: string[];
  imageUrls?: string[];
  htmlSlideConfigs?: import('@shared/types/html-slide-config').HtmlSlideConfig[];
  htmlSlides?: string[];
  usedAgents: boolean;
}> {
  const {
    prompt,
    slidesCount,
    tenantId,
    clientId,
    userId,
    pool,
    canvasWidth = 1080,
    canvasHeight = 1080,
    tone = 'engajamento',
    goal = 'engagement',
    imageStyleHint,
    textDepth,
    signal,
    onProgress,
  } = options;

  const safeCount = Math.min(10, Math.max(1, slidesCount));
  // Gera um UUID v4 válido para o jobId (o banco exige formato UUID)
  const jobId = randomUUID();

  onProgress?.('Carregando fluxo de agentes', 5);

  // Verifica se existe grafo configurado
  const graphDef = await loadDefaultGraph(pool, tenantId);

  if (!graphDef) {
    console.log('[creative-ai] No agent graph configured, falling back to simple LLM');
    const slides = await generateSlidesCopy(prompt, safeCount);
    return { slides, usedAgents: false };
  }

  console.log(`[creative-ai] Using agent graph: ${graphDef.name} (${graphDef.nodes.length} nodes)`);
  onProgress?.('Executando fluxo de agentes', 10);

  // Cria um job temporário no banco (requerido pela FK de agent_executions)
  try {
    const pgClient = await pool.connect();
    try {
      await pgClient.query(
        `INSERT INTO jobs (id, tenant_id, client_id, user_id, status, payload, stage, progress, idempotency_key, attempt, max_attempts)
         VALUES ($1, $2, $3, $4, 'processing', $5, 'drafting_post', 10, $6, 1, 1)
         ON CONFLICT (id) DO NOTHING`,
        [jobId, tenantId, clientId, userId, JSON.stringify({ prompt, slide_count: safeCount, tone, goal }), `creative-${jobId}`]
      );
    } finally {
      pgClient.release();
    }
  } catch (jobErr: any) {
    console.warn('[creative-ai] Failed to create temp job:', jobErr.message);
  }

  try {
    const localAbortController = signal ? null : new AbortController();
    const executionSignal = signal || localAbortController?.signal;
    if (localAbortController) {
      registerJobAbortController(jobId, localAbortController);
    }

    let result;
    try {
      result = await executeGraph({
        jobId,
        tenantId,
        clientId,
        userId,
        pool,
        signal: executionSignal,
        payload: {
          title_hint: prompt,
          goal,
          tone,
          channels: ['instagram'],
          language: 'pt-BR',
          slide_count: safeCount,
          slidesCount: safeCount,
          image_style_hint: imageStyleHint,
          imageStyleHint,
          canvasWidth,
          canvasHeight,
          textDepth,
          generation: { max_words: 500 },
        },
        onNodeStart: (nodeId) => {
          console.log(`[creative-ai] Agent node started: ${nodeId}`);
          onProgress?.(`Agente ativo: ${nodeId}`, 15);
        },
        onNodeComplete: (nodeId, nodeResult) => {
          console.log(`[creative-ai] Agent node completed: ${nodeId} (${nodeResult.status})`);
          onProgress?.(`Agente concluído: ${nodeId}`, 20);
        },
      });
    } finally {
      removeJobAbortController(jobId);
    }

    onProgress?.('Processando resultado dos agentes', 70);

    const state = result.state;

    // Extrai slides do resultado
    let slides: GeneratedSlideCopy[] = [];

    if (state.slides && state.slides.length > 0) {
      // carousel-writer ou visual-formatter em modo studio retornou slides
      slides = state.slides.map((s) => ({
        title: s.title.slice(0, 120),
        subtitle: s.subtitle.slice(0, 420),
      }));
    } else if (state.draft?.content) {
      // writer normal retornou content — parse para slides
      slides = parseDraftContentToSlides(state.draft.content, safeCount);
    }

    // Garante que temos o número correto de slides
    if (slides.length === 0) {
      console.warn('[creative-ai] No slides from agents, falling back to simple LLM');
      slides = await generateSlidesCopy(prompt, safeCount);
      return { slides, usedAgents: false };
    }

    // Completa ou trunca para o número correto
    while (slides.length < safeCount) {
      slides.push({
        title: `Ponto ${slides.length + 1}`,
        subtitle: `Mais sobre: ${prompt.slice(0, 180)}`,
      });
    }
    slides = slides.slice(0, safeCount);

    onProgress?.('Slides gerados pelos agentes', 80);

    return {
      slides,
      imagePrompts: state.imagePrompts,
      imageUrls: state.imageUrls,
      htmlSlideConfigs: state.htmlSlideConfigs,
      htmlSlides: state.htmlSlides,
      usedAgents: true,
    };
  } catch (error: any) {
    console.error('[creative-ai] Agent graph execution failed:', error.message);
    // Fallback para LLM simples
    const slides = await generateSlidesCopy(prompt, safeCount);
    return { slides, usedAgents: false };
  }
}

/**
 * Converte conteúdo de draft (string) em array de slides.
 * Usado quando o grafo usa writer normal em vez de carousel-writer.
 */
function parseDraftContentToSlides(content: string, targetCount: number): GeneratedSlideCopy[] {
  const oneSlideMode = targetCount <= 1;
  const lines = content.split('\n').filter((l) => l.trim());
  const slides: GeneratedSlideCopy[] = [];

  // Tenta encontrar padrão "Slide N:" ou "# Título"
  const slideRegex = /^(?:Slide\s*\d+[:\.]?\s*|#+\s*|\d+[:\.]\s*)(.+)$/i;
  let currentTitle = '';
  let currentBody = '';

  for (const line of lines) {
    const match = line.match(slideRegex);
    if (match) {
      if (currentTitle) {
        slides.push({
          title: clampWords(currentTitle, oneSlideMode ? 16 : 12).slice(0, 120),
          subtitle: clampWords(currentBody.trim(), oneSlideMode ? 18 : 45).slice(0, 420) || ' ',
        });
      }
      currentTitle = match[1].trim();
      currentBody = '';
    } else if (currentTitle) {
      currentBody += ' ' + line.trim();
    }
  }

  // Adiciona o último
  if (currentTitle) {
    slides.push({
      title: clampWords(currentTitle, oneSlideMode ? 16 : 12).slice(0, 120),
      subtitle: clampWords(currentBody.trim(), oneSlideMode ? 18 : 45).slice(0, 420) || ' ',
    });
  }

  // Se não conseguiu extrair com regex, divide por parágrafos
  if (slides.length === 0) {
    const paragraphs = content
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 5);

    for (let i = 0; i < Math.min(paragraphs.length, targetCount); i++) {
      const sentences = paragraphs[i].split(/[.!?]/).filter((s) => s.trim().length > 5);
      slides.push({
        title: clampWords(sentences[0]?.trim() || `Ponto ${i + 1}`, oneSlideMode ? 16 : 12).slice(0, 120),
        subtitle: clampWords(paragraphs[i], oneSlideMode ? 18 : 45).slice(0, 420),
      });
    }
  }

  return slides;
}

export async function refineSlideCopy(current: SlideTextLayout, instruction: string): Promise<SlideTextLayout> {
  if (!instruction?.trim()) {
    return current;
  }

  if (!isLLMConfigured()) {
    return {
      ...current,
      title: current.title,
      subtitle: `${current.subtitle} ${instruction}`.trim().slice(0, 420),
    };
  }

  const llm = createLLMClient();
  const model = getDefaultModel();
  const response = await llm.chatCompletion({
    model,
    temperature: 0.5,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: `Refine o texto do slide com base na instrucao.\n\nSlide atual:\n${JSON.stringify(current)}\n\nInstrucao:\n${instruction}\n\nRetorne APENAS JSON com {"title":"...","subtitle":"..."}`,
      },
    ],
  });

  const parsed = JSON.parse(extractJsonCandidate(response.content));
  return {
    ...current,
    title: String(parsed?.title || current.title).slice(0, 120),
    subtitle: String(parsed?.subtitle || current.subtitle).slice(0, 420),
  };
}

export async function generateCaptionFromSlides(
  slides: Array<{ textLayout?: { title?: string; subtitle?: string } }>,
  tone = 'engajamento'
): Promise<{ caption: string; hashtags: string[] }> {
  const serializedSlides = slides
    .map((slide, index) => {
      const title = slide.textLayout?.title || '';
      const subtitle = slide.textLayout?.subtitle || '';
      return `Slide ${index + 1}: ${title} ${subtitle}`.trim();
    })
    .filter(Boolean)
    .join('\n');

  if (!isLLMConfigured()) {
    return {
      caption: `${serializedSlides}\n\nSalve este conteudo e envie para quem precisa ver isso hoje.`,
      hashtags: ['#marketingdigital', '#criativos', '#instagram', '#conteudo'],
    };
  }

  const llm = createLLMClient();
  const model = getDefaultModel();
  const response = await llm.chatCompletion({
    model,
    temperature: 0.6,
    max_tokens: 900,
    messages: [
      {
        role: 'user',
        content: `Com base nos slides abaixo, gere legenda para Instagram em tom ${tone}.\n\n${serializedSlides}\n\nRetorne APENAS JSON com {"caption":"...","hashtags":["#tag1","#tag2"]}`,
      },
    ],
  });

  const parsed = JSON.parse(extractJsonCandidate(response.content));
  const hashtags = Array.isArray(parsed?.hashtags)
    ? parsed.hashtags.map((value: unknown) => String(value)).filter(Boolean)
    : [];

  return {
    caption: String(parsed?.caption || '').trim(),
    hashtags: hashtags.slice(0, 10),
  };
}

export async function generateSlideImage(
  prompt: string,
  styleHint?: string,
  canvasWidth = 1080,
  canvasHeight = 1080,
  imageModel?: ImageModelPreference
): Promise<string> {
  const seed = encodeURIComponent(`${prompt}-${styleHint || 'default'}`.slice(0, 64));
  const imageSpec = resolveImageDimensions(canvasWidth, canvasHeight);
  const retryForTextSafety = shouldRetryForTextSafety(prompt);

  try {
    if (process.env.FAL_API_KEY) {
      const firstImage = await generateImageWithFalFlux(prompt, styleHint, canvasWidth, canvasHeight, imageModel);

      if (!retryForTextSafety) {
        return firstImage;
      }

      try {
        console.log('[creative-ai] Retrying image with stronger text-safety constraints');
        return await generateImageWithFalFlux(buildTextSafeRetryPrompt(prompt), styleHint, canvasWidth, canvasHeight, imageModel);
      } catch (retryError) {
        console.warn('fal.ai text-safety retry failed, using first image:', retryError);
        return firstImage;
      }
    }
  } catch (error) {
    console.warn('fal.ai image generation failed, trying fallback provider:', error);
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      const firstImage = await generateImageWithOpenAI(prompt, styleHint, canvasWidth, canvasHeight);

      if (!retryForTextSafety) {
        return firstImage;
      }

      try {
        console.log('[creative-ai] Retrying OpenAI image with stronger text-safety constraints');
        return await generateImageWithOpenAI(buildTextSafeRetryPrompt(prompt), styleHint, canvasWidth, canvasHeight);
      } catch (retryError) {
        console.warn('OpenAI text-safety retry failed, using first image:', retryError);
        return firstImage;
      }
    }
  } catch (error) {
    console.warn('OpenAI image generation failed, falling back to picsum:', error);
  }

  return `https://picsum.photos/seed/${seed}/${imageSpec.width}/${imageSpec.height}`;
}
