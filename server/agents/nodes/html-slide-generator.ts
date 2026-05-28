/**
 * Nó html-slide-generator — gera HtmlSlideConfig + HTML determinístico por slide.
 * O LLM define somente decisões visuais (plano de design).
 */

import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import { configToHtml } from '../../utils/html-slide-renderer';
import type { AgentState } from '../state';
import type { HtmlSlideConfig, HtmlSlideDesignPlan, HtmlTextPosition, HtmlFontFamily } from '@shared/types/html-slide-config';
import { buildClientContextBlock } from '../prompt-context';

interface HtmlSlideGeneratorConfig {
  model?: string;
  temperature?: number;
}

type TemplateStrategy = 'predefined' | 'ai';

const BRAND_TEMPLATE_LIBRARY: Array<Omit<HtmlSlideDesignPlan, 'slideIndex'>> = [
  {
    theme: 'dark',
    templateVariant: 'spotlight',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'radial-gradient(ellipse at 60% 30%, #1F1F1F 0%, #0A0A0A 70%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 45,
    textPosition: 'bot-left',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'editorial-band',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'linear-gradient(180deg, #0A0A0A 0%, #1F1F1F 100%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 50,
    textPosition: 'mid-left',
    titleColor: '#F7F7F5',
    subtitleColor: '#F7F7F5',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'glass-card',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 48,
    textPosition: 'mid-left',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'light',
    templateVariant: 'minimal',
    backgroundColor: '#F7F7F5',
    backgroundGradient: undefined,
    overlayColor: '#F7F7F5',
    overlayOpacity: 20,
    textPosition: 'mid-left',
    titleColor: '#0A0A0A',
    subtitleColor: '#1F1F1F',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'light',
    templateVariant: 'editorial-band',
    backgroundColor: '#F7F7F5',
    backgroundGradient: undefined,
    overlayColor: '#F7F7F5',
    overlayOpacity: 15,
    textPosition: 'bot-left',
    titleColor: '#0A0A0A',
    subtitleColor: '#1F1F1F',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'spotlight',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'radial-gradient(ellipse at 50% 80%, #1F1F1F 0%, #0A0A0A 65%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 55,
    textPosition: 'mid',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'glass-card',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'linear-gradient(160deg, #0A0A0A 0%, #1F1F1F 100%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 40,
    textPosition: 'top-left',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'editorial-band',
    backgroundColor: '#1F1F1F',
    backgroundGradient: 'linear-gradient(180deg, #0A0A0A 0%, #1F1F1F 100%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 35,
    textPosition: 'top-left',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'light',
    templateVariant: 'minimal',
    backgroundColor: '#F7F7F5',
    backgroundGradient: undefined,
    overlayColor: '#F7F7F5',
    overlayOpacity: 15,
    textPosition: 'top-left',
    titleColor: '#0A0A0A',
    subtitleColor: '#1F1F1F',
    accentColor: '#C8A96E',
    ctaVisible: false,
    ctaText: '',
    ctaBackgroundColor: '#C8A96E',
  },
  {
    theme: 'dark',
    templateVariant: 'spotlight',
    backgroundColor: '#0A0A0A',
    backgroundGradient: 'radial-gradient(ellipse at 50% 50%, #1F1F1F 0%, #0A0A0A 70%)',
    overlayColor: '#0A0A0A',
    overlayOpacity: 55,
    textPosition: 'mid',
    titleColor: '#F7F7F5',
    subtitleColor: '#C8A96E',
    accentColor: '#C8A96E',
    ctaVisible: true,
    ctaText: 'Comenta CLAUDE aqui embaixo',
    ctaBackgroundColor: '#C8A96E',
  },
];

const SYSTEM_PROMPT = `Você é um diretor de arte para carrosseis Instagram.
Sua tarefa e retornar APENAS um JSON array com HtmlSlideDesignPlan para cada slide.

REGRAS OBRIGATÓRIAS:
- Nao retornar HTML.
- Campos obrigatorios por item:
  slideIndex, theme, templateVariant, backgroundColor, backgroundGradient, overlayColor, overlayOpacity,
  textPosition, titleColor, subtitleColor, accentColor, ctaVisible, ctaText, ctaBackgroundColor
- templateVariant permitido: spotlight, glass-card, editorial-band, minimal
- textPosition permitido: top-left, top-center, top-right, mid-left, mid, mid-right, bot-left, bot-center, bot-right
- overlayOpacity entre 15 e 75
- Garantir legibilidade de titleColor/subtitleColor sobre overlay.
- Retorne APENAS JSON valido, sem markdown.`;

const VALID_POSITIONS: HtmlTextPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'mid-left',
  'mid',
  'mid-right',
  'bot-left',
  'bot-center',
  'bot-right',
];

function extractJsonCandidate(raw: string): string {
  const jsonMatch =
    raw.match(/```json\s*([\s\S]*?)\s*```/) ||
    raw.match(/```\s*([\s\S]*?)\s*```/) ||
    raw.match(/(\[[\s\S]*\])/);

  return (jsonMatch?.[1] || raw).trim();
}

function sanitizePosition(value: string | undefined): HtmlTextPosition {
  if (!value) return 'mid-left';
  return (VALID_POSITIONS.includes(value as HtmlTextPosition) ? value : 'mid-left') as HtmlTextPosition;
}

function stripVisualNoise(text: string): string {
  return String(text || '')
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

function normalizeHtmlFont(font: unknown, role: 'title' | 'body'): HtmlFontFamily {
  const value = String(font || '').toLowerCase().trim();

  if (value === 'outfit') return 'Outfit';
  if (value === 'inter') return 'Inter';
  if (value === 'merriweather' || value === 'playfair') return 'Merriweather';
  if (value === 'space' || value === 'space grotesk') return 'Space Grotesk';

  return role === 'title' ? 'Space Grotesk' : 'Inter';
}

function buildFallbackPlan(index: number): HtmlSlideDesignPlan {
  const variants: Array<'spotlight' | 'glass-card' | 'editorial-band' | 'minimal'> = [
    'spotlight',
    'glass-card',
    'editorial-band',
    'minimal',
  ];

  return {
    slideIndex: index,
    theme: index % 2 === 0 ? 'dark' : 'light',
    templateVariant: variants[index % variants.length],
    backgroundColor: index % 2 === 0 ? '#111827' : '#f8fafc',
    backgroundGradient: index % 2 === 0 ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(145deg, #dbeafe 0%, #ffffff 100%)',
    overlayColor: '#000000',
    overlayOpacity: index % 2 === 0 ? 45 : 20,
    textPosition: index === 0 ? 'mid-left' : index % 3 === 0 ? 'top-left' : 'bot-left',
    titleColor: index % 2 === 0 ? '#ffffff' : '#0f172a',
    subtitleColor: index % 2 === 0 ? '#e5e7eb' : '#1f2937',
    accentColor: '#f97316',
    ctaVisible: index >= 2,
    ctaText: index >= 2 ? 'Quero aplicar isso' : 'Saiba mais',
    ctaBackgroundColor: '#f97316',
  };
}

function buildPredefinedPlan(index: number, total: number): HtmlSlideDesignPlan {
  const oneSlideMode = total <= 1;
  const isLast = index === total - 1;

  let selected: Omit<HtmlSlideDesignPlan, 'slideIndex'>;

  if (oneSlideMode) {
    selected = BRAND_TEMPLATE_LIBRARY[0];
  } else if (index === 0) {
    selected = BRAND_TEMPLATE_LIBRARY[index % 2 === 0 ? 0 : 1];
  } else if (isLast) {
    selected = BRAND_TEMPLATE_LIBRARY[9];
  } else {
    const middlePool = [2, 3, 4, 5, 6, 7, 8];
    const pick = middlePool[(index - 1) % middlePool.length];
    selected = BRAND_TEMPLATE_LIBRARY[pick];
  }

  return {
    ...selected,
    slideIndex: index,
    ctaVisible: oneSlideMode ? false : isLast ? true : false,
    ctaText: oneSlideMode || !isLast ? '' : selected.ctaText,
  };
}

function parseDesignPlans(raw: string, total: number): HtmlSlideDesignPlan[] {
  const parsed = JSON.parse(extractJsonCandidate(raw));
  if (!Array.isArray(parsed)) {
    throw new Error('LLM returned non-array for HtmlSlideDesignPlan');
  }

  const plans = parsed.map((item: any, idx: number): HtmlSlideDesignPlan => ({
    slideIndex: typeof item?.slideIndex === 'number' ? item.slideIndex : idx,
    theme: item?.theme === 'light' ? 'light' : 'dark',
    templateVariant: ['spotlight', 'glass-card', 'editorial-band', 'minimal'].includes(item?.templateVariant)
      ? item.templateVariant
      : undefined,
    backgroundColor: String(item?.backgroundColor || '#111827'),
    backgroundGradient: typeof item?.backgroundGradient === 'string' ? item.backgroundGradient : undefined,
    overlayColor: String(item?.overlayColor || '#000000'),
    overlayOpacity: Math.max(0, Math.min(100, Number(item?.overlayOpacity ?? 35))),
    textPosition: sanitizePosition(item?.textPosition),
    titleColor: String(item?.titleColor || '#ffffff'),
    subtitleColor: String(item?.subtitleColor || '#e5e7eb'),
    accentColor: String(item?.accentColor || '#f97316'),
    ctaVisible: Boolean(item?.ctaVisible),
    ctaText: String(item?.ctaText || 'Saiba mais'),
    ctaBackgroundColor: String(item?.ctaBackgroundColor || '#f97316'),
  }));

  while (plans.length < total) {
    plans.push(buildFallbackPlan(plans.length));
  }

  return plans.slice(0, total);
}

function buildConfigFromPlan(
  index: number,
  slide: { title: string; subtitle: string },
  plan: HtmlSlideDesignPlan,
  canvasWidth: number,
  canvasHeight: number,
  titleFontFamily: HtmlFontFamily,
  bodyFontFamily: HtmlFontFamily,
  imagePrompt?: string,
  imageUrl?: string,
  totalSlides = 1
): HtmlSlideConfig {
  const oneSlideMode = totalSlides <= 1;
  const titleText = clampWords(slide.title, oneSlideMode ? 16 : 12);
  const subtitleText = clampWords(slide.subtitle, oneSlideMode ? 18 : 45);

  return {
    id: `slide-${index + 1}`,
    index,
    canvasWidth,
    canvasHeight,
    theme: plan.theme,
    templateVariant: plan.templateVariant || 'spotlight',
    backgroundImageUrl: imageUrl,
    backgroundColor: plan.backgroundColor,
    backgroundGradient: plan.backgroundGradient,
    backgroundZoom: 100,
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    overlayColor: plan.overlayColor,
    overlayOpacity: plan.overlayOpacity,
    textPosition: plan.textPosition,
    title: {
      text: titleText,
      color: plan.titleColor,
      fontSize: 68,
      fontFamily: titleFontFamily,
      fontWeight: 'bold',
      align: plan.textPosition.includes('center') ? 'center' : plan.textPosition.includes('right') ? 'right' : 'left',
    },
    subtitle: {
      text: subtitleText,
      color: plan.subtitleColor,
      fontSize: 30,
      fontFamily: bodyFontFamily,
      fontWeight: 'normal',
      align: plan.textPosition.includes('center') ? 'center' : plan.textPosition.includes('right') ? 'right' : 'left',
    },
    ctaButton: {
      visible: oneSlideMode ? false : plan.ctaVisible,
      text: oneSlideMode ? '' : plan.ctaText,
      backgroundColor: plan.ctaBackgroundColor,
      textColor: '#ffffff',
      borderRadius: 18,
    },
    accentColor: plan.accentColor,
    imagePrompt,
  };
}

export async function htmlSlideGeneratorNode(
  state: AgentState,
  config: HtmlSlideGeneratorConfig = {}
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const {
    model = getDefaultModel(),
    temperature = 0.7,
  } = config;

  const slides = state.slides || [];
  if (slides.length === 0) {
    return {
      errors: [
        ...state.errors,
        {
          node: 'html-slide-generator',
          message: 'Nenhum slide no AgentState — execute carousel-writer antes',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  const accentColor = state.payload?.accentColor || '#6366f1';
  const layoutMode = state.payload?.layoutMode || 'minimalist';
  const canvasWidth = Number(state.payload?.canvasWidth || 1080);
  const canvasHeight = Number(state.payload?.canvasHeight || 1080);
  const titleFontFamily = normalizeHtmlFont(state.payload?.titleFontFamily, 'title');
  const bodyFontFamily = normalizeHtmlFont(state.payload?.bodyFontFamily, 'body');
  const total = slides.length;
  const templateStrategy: TemplateStrategy = state.payload?.templateStrategy === 'ai' ? 'ai' : 'predefined';
  const clientContext = buildClientContextBlock(state);
  const htmlSlideConfigs: HtmlSlideConfig[] = [];
  const htmlSlides: string[] = [];
  let totalTokens = 0;
  let totalLatency = 0;
  const models: string[] = [];

  const userPrompt = `Gere um HtmlSlideDesignPlan para cada slide abaixo.
Retorne somente JSON array.

Accent color base: ${accentColor}
Layout mode: ${layoutMode}
Canvas: ${canvasWidth}x${canvasHeight}
Total slides: ${total}

${clientContext}

Slides:
${slides.map((slide, index) => `${index}: ${slide.title} | ${slide.subtitle}`).join('\n')}`;

  let plans: HtmlSlideDesignPlan[] = [];

  if (templateStrategy === 'predefined') {
    plans = Array.from({ length: total }, (_, index) => buildPredefinedPlan(index, total));
  } else {
    try {
      const result = await llm.chatCompletion({
        model,
        max_tokens: 2400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      });

      plans = parseDesignPlans(result.content, total);
      totalTokens += result.usage?.total_tokens || 0;
      if (result.model && !models.includes(result.model)) models.push(result.model);
    } catch (err: any) {
      console.error('[html-slide-generator] Erro no design plan:', err.message);
      plans = Array.from({ length: total }, (_, index) => buildFallbackPlan(index));
    }
  }

  for (let index = 0; index < total; index++) {
    const slideStart = Date.now();
    const slide = slides[index];
    const plan = plans[index] || buildFallbackPlan(index);
    const imagePrompt = state.imagePrompts?.[index];
    const imageUrl = state.imageUrls?.[index];

    const config = buildConfigFromPlan(index, slide, plan, canvasWidth, canvasHeight, titleFontFamily, bodyFontFamily, imagePrompt, imageUrl, total);
    htmlSlideConfigs.push(config);
    try {
      const html = configToHtml(config);
      htmlSlides.push(html);
      totalLatency += Date.now() - slideStart;
    } catch (err: any) {
      console.error(`[html-slide-generator] Erro no slide ${index + 1}:`, err.message);
      const fallbackHtml = configToHtml(buildConfigFromPlan(index, slide, buildFallbackPlan(index), canvasWidth, canvasHeight, titleFontFamily, bodyFontFamily, imagePrompt, imageUrl, total));
      htmlSlides.push(fallbackHtml);
    }
  }

  const latency = Date.now() - startTime;

  return {
    htmlSlideConfigs,
    htmlSlides,
    metadata: {
      ...state.metadata,
      totalTokens: state.metadata.totalTokens + totalTokens,
      totalLatency: state.metadata.totalLatency + latency,
      models: [...state.metadata.models, ...models],
    },
  };
}
