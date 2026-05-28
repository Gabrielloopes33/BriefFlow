/**
 * Agente Engenheiro de Prompts de Imagem — Node do fluxo LangGraph
 * Gera prompts otimizados para geração de imagem por slide
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';
import { buildClientContextBlock } from '../prompt-context';

interface ImagePromptEngineerConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const ANTI_TEXT_NEGATIVE_PROMPT =
  'text, letters, words, typography, subtitles, captions, watermark, logo, signature, signage, ui text, readable characters, poster, billboard';

const REQUIRED_PROMPT_CUES = [
  'full-bleed background',
  'subject occupies most of frame',
  'no text',
  'no letters',
  'no words',
  'no typography',
  'no captions',
  'no signage',
  'no watermark',
  'no logo',
] as const;

const VIRAL_ATTENTION_CUES = [
  'pattern interrupt composition, bold focal subject, high contrast, emotional tension',
  'dynamic angle, motion energy, curiosity gap, cinematic lighting',
  'surprising real-life moment, expressive human emotion, scroll-stopping framing',
] as const;

const TOPIC_STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem',
  'um', 'uma', 'uns', 'umas', 'the', 'and', 'for', 'with', 'from', 'that', 'this', 'como', 'mais', 'menos',
  'sobre', 'entre', 'sua', 'seu', 'suas', 'seus', 'your', 'you', 'into', 'through', 'already', 'ate', 'até',
]);

const TEXT_BEARING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bquotes?\b/gi, 'human reactions'],
  [/\btestimonials?\b/gi, 'authentic people'],
  [/\bscreens?\b/gi, 'soft ambient glow'],
  [/\bmonitors?\b/gi, 'soft ambient glow'],
  [/\bdashboards?\b/gi, 'abstract light patterns'],
  [/\bui\b/gi, 'abstract interface glow'],
  [/\binterfaces?\b/gi, 'abstract interface glow'],
  [/\bdata visuali[sz]ations?\b/gi, 'abstract geometric light patterns'],
  [/\bgraphs?\b/gi, 'abstract geometric shapes'],
  [/\bcharts?\b/gi, 'abstract geometric shapes'],
  [/\bwhiteboards?\b/gi, 'studio wall'],
  [/\bhandwritten notes?\b/gi, 'paper textures'],
  [/\bnotes?\b/gi, 'paper textures'],
  [/\bdocuments?\b/gi, 'paper textures'],
  [/\bpaperwork\b/gi, 'desk objects'],
  [/\bposters?\b/gi, 'wall texture'],
  [/\bbillboards?\b/gi, 'architectural backdrop'],
  [/\bsignage\b/gi, 'architectural backdrop'],
  [/\blogos?\b/gi, 'brandless surfaces'],
  [/\bwatermarks?\b/gi, 'clean surfaces'],
  [/\btext overlays?\b/gi, 'clean composition'],
  [/\bcaptions?\b/gi, 'clean composition'],
  [/\bsubtitles?\b/gi, 'clean composition'],
  [/\bsplit-screen\b/gi, 'contrasting two-part composition'],
  [/\bpanels?\b/gi, 'layered vignettes'],
];

function extractJsonCandidate(raw: string): string {
  const match =
    raw.match(/```json\s*([\s\S]*?)\s*```/i) ||
    raw.match(/```\s*([\s\S]*?)\s*```/) ||
    raw.match(/(\[[\s\S]*\])/);

  return (match?.[1] || raw).trim();
}

function parsePromptPayload(raw: string): any[] {
  const candidate = extractJsonCandidate(raw);

  const attempts = [
    candidate,
    candidate.replace(/,\s*\]/g, ']'),
    candidate.replace(/[\u0000-\u0019]/g, ''),
  ];

  for (const value of attempts) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Continue attempting more resilient parses.
    }
  }

  throw new Error('LLM returned invalid JSON for image prompts');
}

function normalizePromptQuality(prompt: string, canvasWidth: number, canvasHeight: number): string {
  let normalized = String(prompt || '')
    .replace(/\b(with text|text overlay|add text|caption on image|quote on image)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of TEXT_BEARING_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/semantic anchor:\s*[^,]+/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    normalized = `Professional scene for Instagram ${canvasWidth}x${canvasHeight}, photorealistic`;
  }

  if (!normalized.includes(`${canvasWidth}x${canvasHeight}`)) {
    normalized += `, ${canvasWidth}x${canvasHeight}`;
  }

  for (const cue of REQUIRED_PROMPT_CUES) {
    if (!normalized.toLowerCase().includes(cue.toLowerCase())) {
      normalized += `, ${cue}`;
    }
  }

  if (!normalized.toLowerCase().includes('exclude:')) {
    normalized += ', exclude: readable characters, typography, subtitles, posters, billboards, ui text';
  }

  if (!normalized.toLowerCase().includes('blank surfaces')) {
    normalized += ', blank surfaces, brandless objects, unlabeled environments';
  }

  return normalized.slice(0, 700);
}

function sanitizeSlideText(text: string): string {
  return String(text || '')
    .replace(/\B#[\wÀ-ÿ-]+/g, ' ')
    .replace(/[\*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSemanticAnchor(title: string, subtitle: string): string {
  const combined = `${sanitizeSlideText(title)} ${sanitizeSlideText(subtitle)}`.trim();
  const words = combined
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter((word) => word && word.length > 2 && !TOPIC_STOPWORDS.has(word))
    .slice(0, 8);
  return words.join(', ') || 'professional business context';
}

function buildViralCue(index: number, totalSlides: number): string {
  if (index === 0) {
    return `${VIRAL_ATTENTION_CUES[0]}, thumb-stopping hero shot`;
  }
  if (index === totalSlides - 1) {
    return `${VIRAL_ATTENTION_CUES[2]}, uplifting forward momentum`;
  }
  return VIRAL_ATTENTION_CUES[1];
}

async function generateImageUrl(
  prompt: string,
  styleHint?: string,
  canvasWidth = 1080,
  canvasHeight = 1080
): Promise<string | undefined> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return undefined;

  const imagePrompt = `${prompt}${styleHint ? ` Estilo visual: ${styleHint}.` : ''} ${canvasWidth}x${canvasHeight}, no text overlay, no letters, no words, no typography, no logo, no watermark.`;
  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: imagePrompt,
      negative_prompt: ANTI_TEXT_NEGATIVE_PROMPT,
      image_size: { width: canvasWidth, height: canvasHeight },
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) return undefined;
  const payload = await response.json();
  return payload?.images?.[0]?.url;
}

export async function imagePromptEngineerNode(
  state: AgentState,
  config: ImagePromptEngineerConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const {
    model = getDefaultModel(),
    temperature = 0.5,
    maxTokens = 1500,
  } = config;

  const slides = state.slides || [];
  const styleHint = state.payload?.image_style_hint || state.payload?.imageStyleHint || '';
  const canvasWidth = Number(state.payload?.canvasWidth || 1080);
  const canvasHeight = Number(state.payload?.canvasHeight || 1080);
  const clientContext = buildClientContextBlock(state);

  if (slides.length === 0) {
    console.log('[image-prompt-engineer] No slides available, skipping');
    return { imagePrompts: [] };
  }

  const systemPrompt = `You are an expert at writing image generation prompts for Instagram carousel slides. Your goal is to produce one detailed, visually coherent image prompt per slide, optimized for FAL Flux (schnell) or DALL-E at ${canvasWidth}x${canvasHeight}.

## How to Build Each Prompt

Each prompt must cover five components in a single descriptive paragraph:

**1. Scene** — Describe the main subject connected to the slide concept. Translate the idea into a visual scene. Never illustrate text literally.

**2. Mood & Lighting** — Match the slide's position:
- Cover (index 0): bold, striking, high contrast — grabs attention
- Middle slides: clear, calm, instructional
- Last slide (CTA): warm, inspiring, forward-looking

Lighting options: golden hour, studio softbox, dramatic side light, overcast diffused, neon accent.

**3. Visual Style**
- Minimalist: clean negative space, geometric composition, muted palette with one accent. Keywords: minimalist, clean composition, negative space, muted tones
- Editorial/Profile: human presence, lifestyle-driven, warm editorial feel. Keywords: editorial photography, lifestyle, candid, authentic

**4. Technical Specs** — Always include: ${canvasWidth}x${canvasHeight} format, photorealistic, sharp focus, high detail, no text, no letters, no words, no watermark, no logo.

**5. Coherence** — All prompts must feel like a visual series. Same color temperature, consistent style, consistent photography feel. Vary scene and angle, not aesthetic.

## Viral Retention Rules

- Every slide prompt must include a clear visual hook that interrupts scrolling in under 1 second.
- Build curiosity through contrast, emotion, unusual angle, or unexpected framing.
- Keep the visual hook aligned with the specific slide idea (title + subtitle), never generic stock scenes.
- Do not request text gimmicks. Attention must come from composition, mood, and subject.
- Never render words from title/subtitle as text on the image. Convert meaning into pure visual metaphor.

## Composition Safety Rules

- Always request a full-bleed background image that fills the whole frame.
- Main subject must occupy roughly 60-85% of the frame, never tiny or distant.
- Avoid screenshots, UI mockups, laptop screens, dashboards, device closeups as primary subject.
- Keep negative space only where text will be placed, but preserve visual richness.

## Niche Visual References

| Niche | Scene ideas | Style cues |
|---|---|---|
| Fitness/Health | gym equipment, outdoor workout, healthy meal prep | energetic, high contrast, natural light |
| Food/Gastronomy | close-up textures, steam, plating details | warm tones, macro lens, rich colors |
| Finance/Business | minimal desk, graphs on screen, city skyline | cool tones, geometric, premium |
| Beauty/Fashion | product flat lay, editorial closeup, textures | soft light, pastel or bold accent |
| Tech/SaaS | screen glow, clean workspace, data visualization | cool blue, dark mode, geometric |
| Education | open books, whiteboard detail, handwritten notes | warm, approachable, soft shadows |
| Wellness | nature, meditation, soft textures | soft and airy, low contrast, pastel |

## Output Format

Return ONLY a JSON array, no markdown:
[{"slideIndex":0,"prompt":"...","negativePrompt":"text, letters, words, watermark, logo, signature, UI elements, blurry, low quality"},...]`;

  const visualStyle = state.payload?.visual_style || state.payload?.visualStyle || 'minimalista';
  const accentColor = state.payload?.accent_color || state.payload?.accentColor || '';

  const userPrompt = `Client: ${state.clientName}
Niche: ${state.clientNiche || 'general'}
Description: ${state.clientDescription || 'N/A'}
Visual style: ${visualStyle}${accentColor ? `\nAccent color: ${accentColor}` : ''}${styleHint ? `\nAdditional style hint: ${styleHint}` : ''}

${clientContext}

Carousel slides:
${slides.map((s, i) => `Slide ${i} (index ${i}): "${s.title}" — ${s.subtitle}`).join('\n')}

Generate one image prompt per slide. All prompts must feel like a cohesive visual series. Return ONLY the JSON array, no other text.`;

  try {
    const result = await llm.chatCompletion({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });

    const parsed = parsePromptPayload(result.content);

    // Suporta tanto array de strings (formato antigo) quanto array de objetos (novo formato)
    const imagePrompts = parsed.map((p: any, idx: number) => {
      const anchor = buildSemanticAnchor(slides[idx]?.title || '', slides[idx]?.subtitle || '');
      const viralCue = buildViralCue(idx, slides.length);

      if (typeof p === 'string') {
        return normalizePromptQuality(`${p}, concept keywords: ${anchor}, ${viralCue}`, canvasWidth, canvasHeight);
      }
      if (typeof p === 'object' && p.prompt) {
        return normalizePromptQuality(`${String(p.prompt)}, concept keywords: ${anchor}, ${viralCue}`, canvasWidth, canvasHeight);
      }
      return normalizePromptQuality(
        `${slides[idx]?.title || 'Slide'}, ${state.clientNiche} visual content for Instagram, ${canvasWidth}x${canvasHeight}, photorealistic, concept keywords: ${anchor}, ${viralCue}`,
        canvasWidth,
        canvasHeight
      );
    });

    while (imagePrompts.length < slides.length) {
      const idx = imagePrompts.length;
      const slide = slides[idx];
      const anchor = buildSemanticAnchor(slide?.title || '', slide?.subtitle || '');
      const viralCue = buildViralCue(idx, slides.length);
      imagePrompts.push(
        normalizePromptQuality(
          `${slide?.title || 'Professional'} scene for ${state.clientNiche || 'business'}, ${visualStyle} style, Instagram ${canvasWidth}x${canvasHeight}, photorealistic, sharp focus, clean commercial photography, concept keywords: ${anchor}, ${viralCue}`,
          canvasWidth,
          canvasHeight
        )
      );
    }

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    const finalPrompts = imagePrompts.slice(0, slides.length);
    const shouldGenerateImagesInGraph = Boolean(
      state.payload?.generate_images_in_graph || state.payload?.generateImagesInGraph
    );

    const imageUrls = shouldGenerateImagesInGraph
      ? await Promise.all(finalPrompts.map((prompt) => generateImageUrl(prompt, styleHint, canvasWidth, canvasHeight)))
      : [];

    return {
      imagePrompts: finalPrompts,
      imageUrls: imageUrls.filter((url): url is string => Boolean(url)),
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[image-prompt-engineer] LLM error:', err.message);

    const fallbackPrompts = slides.map((slide, index) =>
      normalizePromptQuality(
        `${slide.title}, ${state.clientNiche || 'professional'} visual content for Instagram, ${visualStyle} style, ${canvasWidth}x${canvasHeight}, photorealistic, clean commercial photography, concept keywords: ${buildSemanticAnchor(slide.title, slide.subtitle)}, ${buildViralCue(index, slides.length)}`,
        canvasWidth,
        canvasHeight
      )
    );

    return {
      imagePrompts: fallbackPrompts,
      imageUrls: [],
      errors: [
        ...state.errors,
        { node: 'image-prompt-engineer', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
