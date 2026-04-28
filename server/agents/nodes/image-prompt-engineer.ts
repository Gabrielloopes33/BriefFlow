/**
 * Agente Engenheiro de Prompts de Imagem — Node do fluxo LangGraph
 * Gera prompts otimizados para geração de imagem por slide
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';

interface ImagePromptEngineerConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
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

  if (slides.length === 0) {
    console.log('[image-prompt-engineer] No slides available, skipping');
    return { imagePrompts: [] };
  }

  const systemPrompt = `You are an expert at writing image generation prompts for Instagram carousel slides. Your goal is to produce one detailed, visually coherent image prompt per slide, optimized for FAL Flux (schnell) or DALL-E at 1080x1080.

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

**4. Technical Specs** — Always include: 1080x1080 square format, photorealistic, sharp focus, high detail, no text, no letters, no words, no watermark, no logo.

**5. Coherence** — All prompts must feel like a visual series. Same color temperature, consistent style, consistent photography feel. Vary scene and angle, not aesthetic.

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

    const raw = result.content;
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ||
                      raw.match(/```\s*([\s\S]*?)\s*```/) ||
                      raw.match(/(\[[\s\S]*\])/);

    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error('LLM returned non-array for image prompts');
    }

    // Suporta tanto array de strings (formato antigo) quanto array de objetos (novo formato)
    const imagePrompts = parsed.map((p: any, idx: number) => {
      if (typeof p === 'string') return p.slice(0, 600);
      if (typeof p === 'object' && p.prompt) return String(p.prompt).slice(0, 600);
      return `${slides[idx]?.title || 'Slide'}, ${state.clientNiche} visual content for Instagram, 1080x1080, photorealistic, no text`;
    });

    while (imagePrompts.length < slides.length) {
      const idx = imagePrompts.length;
      const slide = slides[idx];
      imagePrompts.push(
        `${slide?.title || 'Professional'} scene for ${state.clientNiche || 'business'}, ${visualStyle} style, Instagram 1080x1080, photorealistic, sharp focus, no text no watermark`
      );
    }

    const latency = Date.now() - startTime;
    const tokens = result.usage?.total_tokens || 0;

    return {
      imagePrompts: imagePrompts.slice(0, slides.length),
      metadata: {
        ...state.metadata,
        totalTokens: state.metadata.totalTokens + tokens,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, result.model],
      },
    };
  } catch (err: any) {
    console.error('[image-prompt-engineer] LLM error:', err.message);

    const fallbackPrompts = slides.map((slide) =>
      `${slide.title}, ${state.clientNiche || 'professional'} visual content for Instagram, ${visualStyle} style, 1080x1080, photorealistic, no text no watermark`
    );

    return {
      imagePrompts: fallbackPrompts,
      errors: [
        ...state.errors,
        { node: 'image-prompt-engineer', message: err.message, timestamp: new Date().toISOString() },
      ],
    };
  }
}
