import OpenAI from 'openai';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { createLLMClient, getDefaultModel, isLLMConfigured } from './llm-provider';
import { executeGraph, loadDefaultGraph } from '../agents/executor';
import type { AgentState } from '../agents/state';

interface GeneratedSlideCopy {
  title: string;
  subtitle: string;
}

interface SlideTextLayout {
  title: string;
  subtitle: string;
  position?: string;
  alignment?: 'left' | 'center' | 'right';
}

function extractJsonCandidate(raw: string): string {
  const jsonMatch =
    raw.match(/```json\s*([\s\S]*?)\s*```/) ||
    raw.match(/```\s*([\s\S]*?)\s*```/) ||
    raw.match(/(\[[\s\S]*\])/) ||
    raw.match(/(\{[\s\S]*\})/);

  return (jsonMatch?.[1] || raw).trim();
}

function parseSlides(raw: string): GeneratedSlideCopy[] {
  const parsed = JSON.parse(extractJsonCandidate(raw));
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid slide payload from LLM');
  }

  return parsed.map((item, index) => ({
    title: String(item?.title || item?.headline || `Slide ${index + 1}`).slice(0, 120),
    subtitle: String(item?.subtitle || item?.body || '').slice(0, 420),
  }));
}

async function generateImageWithFalFlux(prompt: string, styleHint?: string): Promise<string> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  const imagePrompt = `${prompt}${styleHint ? ` Estilo visual: ${styleHint}.` : ''} 1080x1080, no text overlay, no logo, no watermark.`;

  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: imagePrompt,
      image_size: { width: 1080, height: 1080 },
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

async function generateImageWithOpenAI(prompt: string, styleHint?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imagePrompt = `${prompt}${styleHint ? ` Estilo visual: ${styleHint}.` : ''} Proporcao quadrada para Instagram.`;
  const result = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt: imagePrompt,
    size: '1024x1024',
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
      title: index === 0 ? prompt.slice(0, 90) : `Ponto ${index + 1}`,
      subtitle: index === safeCount - 1 ? 'Salve este carrossel e compartilhe com seu time.' : `Resumo do tema: ${prompt.slice(0, 180)}`,
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

  const generated = parseSlides(response.content);
  return generated.slice(0, safeCount);
}

interface GenerateSlidesWithAgentsOptions {
  prompt: string;
  slidesCount: number;
  tenantId: string;
  clientId: string;
  userId: string;
  pool: Pool;
  tone?: string;
  goal?: string;
  imageStyleHint?: string;
  textDepth?: 'concise' | 'detailed';
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
  usedAgents: boolean;
}> {
  const {
    prompt,
    slidesCount,
    tenantId,
    clientId,
    userId,
    pool,
    tone = 'engajamento',
    goal = 'engagement',
    imageStyleHint,
    textDepth,
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
    const result = await executeGraph({
      jobId,
      tenantId,
      clientId,
      userId,
      pool,
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
          title: currentTitle.slice(0, 120),
          subtitle: currentBody.trim().slice(0, 420) || ' ',
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
      title: currentTitle.slice(0, 120),
      subtitle: currentBody.trim().slice(0, 420) || ' ',
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
        title: sentences[0]?.trim().slice(0, 120) || `Ponto ${i + 1}`,
        subtitle: paragraphs[i].slice(0, 420),
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

export async function generateSlideImage(prompt: string, styleHint?: string): Promise<string> {
  const seed = encodeURIComponent(`${prompt}-${styleHint || 'default'}`.slice(0, 64));

  try {
    if (process.env.FAL_API_KEY) {
      return await generateImageWithFalFlux(prompt, styleHint);
    }
  } catch (error) {
    console.warn('fal.ai image generation failed, trying fallback provider:', error);
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      return await generateImageWithOpenAI(prompt, styleHint);
    }
  } catch (error) {
    console.warn('OpenAI image generation failed, falling back to picsum:', error);
  }

  return `https://picsum.photos/seed/${seed}/1080/1080`;
}
