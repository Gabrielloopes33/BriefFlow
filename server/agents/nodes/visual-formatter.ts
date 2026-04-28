/**
 * Nó Visual Formatter — Estrutura conteúdo em slides JSONB
 * Analisa o draft gerado pelo Writer e transforma em slides prontos para o editor Konva
 */

import { pool } from '../../pg-pool';
import { createLLMClient, getDefaultModel } from '../../services/llm-provider';
import type { AgentState } from '../state';

export interface SlideContent {
  slideIndex: number;
  type: 'cover' | 'content' | 'cta';
  headline: string;
  body: string;
}

/**
 * Sugere o template mais adequado baseado no conteúdo e objetivo
 */
export function suggestTemplate(content: string, goal: string): string {
  const lowerContent = (content || '').toLowerCase();
  const lowerGoal = (goal || '').toLowerCase();

  if (lowerContent.includes('dica') || lowerContent.includes('passo') || lowerContent.includes('lista')) {
    return 'carousel-lista';
  }
  if (lowerContent.includes('antes') && lowerContent.includes('depois')) {
    return 'antes-e-depois';
  }
  if (lowerContent.includes('resultado') || lowerContent.includes('case') || lowerContent.includes('cliente')) {
    return 'carousel-case';
  }
  if (lowerGoal.includes('citação') || lowerGoal.includes('quote') || lowerGoal.includes('frase')) {
    return 'quote';
  }
  if (lowerGoal.includes('único') || lowerGoal.includes('impacto') || lowerGoal.includes('single')) {
    return 'post-unico';
  }
  return 'carousel-educativo'; // default
}

/**
 * Busca o ID do template pelo nome/slug no banco
 */
async function findTemplateId(templateName: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM creative_templates
       WHERE is_global = true AND is_active = true
       AND (
         LOWER(name) LIKE $1 OR
         LOWER(name) LIKE $2 OR
         LOWER(name) LIKE $3
       )
       LIMIT 1`,
      [`%${templateName}%`, '%educativo%', '%impacto%']
    );
    return rows[0]?.id || null;
  } catch (error) {
    console.error('[visual-formatter] Error finding template:', error);
    return null;
  }
}

/**
 * Cria um registro em creatives com os slides preenchidos
 */
async function createCreative(
  state: AgentState,
  slides: SlideContent[],
  templateId: string | null
): Promise<string | null> {
  try {
    // Busca a estrutura do template para preencher as camadas
    let templateStructure: any = null;
    if (templateId) {
      const { rows } = await pool.query(
        `SELECT structure FROM creative_templates WHERE id = $1`,
        [templateId]
      );
      templateStructure = rows[0]?.structure;
    }

    // Se não tem template, cria slides simples
    const creativeSlides = templateStructure?.slides
      ? fillTemplateSlides(templateStructure.slides, slides)
      : createSimpleSlides(slides);

    const { rows } = await pool.query(
      `INSERT INTO creatives (tenant_id, client_id, type, platform, format, canvas_width, canvas_height, slides, status, template_id)
       VALUES ($1, $2, $3, $4, 'portrait', 1080, 1350, $5, 'draft', $6)
       RETURNING id`,
      [
        state.tenantId,
        state.clientId,
        slides.length > 1 ? 'carousel' : 'single',
        state.channels.includes('linkedin') ? 'linkedin' : 'instagram',
        JSON.stringify(creativeSlides),
        templateId,
      ]
    );

    return rows[0]?.id || null;
  } catch (error) {
    console.error('[visual-formatter] Error creating creative:', error);
    return null;
  }
}

/**
 * Preenche as camadas de um template com o conteúdo dos slides
 */
function fillTemplateSlides(templateSlides: any[], slideContents: SlideContent[]): any[] {
  return templateSlides.map((tplSlide: any, index: number) => {
    const content = slideContents[index];
    if (!content) return tplSlide;

    const filledLayers = tplSlide.layers.map((layer: any) => {
      if (layer.type !== 'text') return layer;

      // Substitui placeholders
      let text = layer.text || '';
      if (text.includes('{{headline}}')) {
        text = text.replace('{{headline}}', content.headline);
      }
      if (text.includes('{{body}}')) {
        text = text.replace('{{body}}', content.body);
      }
      if (text.includes('{{cta}}')) {
        text = text.replace('{{cta}}', content.body);
      }

      return { ...layer, text };
    });

    return { ...tplSlide, layers: filledLayers };
  });
}

/**
 * Cria slides simples sem template (fallback)
 */
function createSimpleSlides(slideContents: SlideContent[]): any[] {
  return slideContents.map((content, index) => ({
    id: `slide-${index + 1}`,
    index,
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    layers: [
      {
        id: `layer-headline-${index}`,
        type: 'text',
        x: 80,
        y: 200,
        width: 920,
        height: 150,
        text: content.headline,
        fontSize: 56,
        fontWeight: 'bold',
        color: '#ffffff',
        align: 'center',
        editable: true,
      },
      {
        id: `layer-body-${index}`,
        type: 'text',
        x: 100,
        y: 380,
        width: 880,
        height: 400,
        text: content.body,
        fontSize: 28,
        fontWeight: 'normal',
        color: '#e0e0e0',
        align: 'center',
        editable: true,
      },
    ],
  }));
}

/**
 * Chama LLM para estruturar o conteúdo em slides
 */
async function structureSlidesWithLLM(
  draft: AgentState['draft'],
  templateType: string
): Promise<SlideContent[]> {
  const llm = createLLMClient();
  const model = getDefaultModel();

  const prompt = `
Você recebeu um post para transformar em slides de carrossel para Instagram.

TÍTULO: ${draft.title}
CONTEÚDO: ${draft.content}

Tipo de carrossel identificado: ${templateType}

Divida este conteúdo em slides. Máximo 6 slides.
Cada slide deve ter:
- "headline": título curto (máx 10 palavras)
- "body": texto do slide (máx 50 palavras)
- "type": "cover" para o primeiro, "content" para os do meio, "cta" para o último

O último slide deve ser um CTA (call-to-action) convidando o leitor a seguir, salvar ou comentar.

Retorne APENAS um JSON array no formato:
[
  { "slideIndex": 1, "type": "cover", "headline": "...", "body": "..." },
  { "slideIndex": 2, "type": "content", "headline": "...", "body": "..." }
]
`;

  const response = await llm.chatCompletion({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1500,
  });

  const content = response.content;

  // Extrai JSON do markdown
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                    content.match(/```\s*([\s\S]*?)\s*```/) ||
                    content.match(/(\[[\s\S]*\])/);

  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  const slides = JSON.parse(jsonStr) as SlideContent[];

  // Validação básica
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('LLM returned invalid slide structure');
  }

  return slides.map((s, i) => ({
    slideIndex: s.slideIndex || i + 1,
    type: s.type || (i === 0 ? 'cover' : i === slides.length - 1 ? 'cta' : 'content'),
    headline: s.headline || '',
    body: s.body || '',
  }));
}

/**
 * Fallback: estrutura slides sem LLM (quando LLM falha)
 */
function structureSlidesFallback(draft: AgentState['draft']): SlideContent[] {
  const paragraphs = draft.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  const slides: SlideContent[] = [
    {
      slideIndex: 1,
      type: 'cover',
      headline: draft.title,
      body: paragraphs[0]?.slice(0, 150) || '',
    },
  ];

  for (let i = 1; i < Math.min(paragraphs.length, 5); i++) {
    const sentences = paragraphs[i].split(/[.!?]/).filter((s) => s.trim().length > 5);
    slides.push({
      slideIndex: i + 1,
      type: i === paragraphs.length - 1 ? 'cta' : 'content',
      headline: sentences[0]?.trim().slice(0, 60) || `Ponto ${i}`,
      body: paragraphs[i].slice(0, 200),
    });
  }

  // Garante CTA no final
  if (slides.length === 1 || slides[slides.length - 1].type !== 'cta') {
    slides.push({
      slideIndex: slides.length + 1,
      type: 'cta',
      headline: 'Gostou?',
      body: 'Salve este post para ler depois e siga para mais conteúdo! 💾',
    });
  }

  return slides.slice(0, 6);
}

/**
 * Nó visual-formatter principal
 * 
 * Modos:
 * - config.mode = 'database' (padrão): cria registro em creatives table
 * - config.mode = 'studio': retorna slides array no estado sem persistir
 */
export async function visualFormatterNode(
  state: AgentState,
  config?: Record<string, any>
): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  const mode = config?.mode || 'database';

  console.log(`[visual-formatter] Starting for job ${state.jobId}, mode=${mode}`);

  try {
    // Se já tem slides prontos (ex: do carousel-writer), usa diretamente
    if (state.slides && state.slides.length > 0 && mode === 'studio') {
      console.log(`[visual-formatter] Using pre-generated slides (${state.slides.length}) in studio mode`);
      const latency = Date.now() - startTime;
      return {
        slides: state.slides,
        metadata: {
          ...state.metadata,
          totalLatency: state.metadata.totalLatency + latency,
          models: [...state.metadata.models, 'visual-formatter'],
        },
      };
    }

    // Verifica se tem draft
    if (!state.draft?.title && !state.draft?.content) {
      console.log('[visual-formatter] No draft available, skipping');
      return mode === 'studio' ? { slides: [] } : { creativeId: undefined };
    }

    // 1. Sugere template
    const suggestedType = suggestTemplate(state.draft.content, state.goal);
    console.log(`[visual-formatter] Suggested template: ${suggestedType}`);

    // 2. Busca template no banco
    const templateId = await findTemplateId(suggestedType);
    console.log(`[visual-formatter] Template ID: ${templateId || 'none (fallback)'}`);

    // 3. Estrutura slides via LLM ou fallback
    let slideContents: SlideContent[];
    try {
      slideContents = await structureSlidesWithLLM(state.draft, suggestedType);
      console.log(`[visual-formatter] LLM structured ${slideContents.length} slides`);
    } catch (llmError) {
      console.warn('[visual-formatter] LLM failed, using fallback:', llmError);
      slideContents = structureSlidesFallback(state.draft);
    }

    // Modo studio: retorna slides diretamente sem persistir no banco
    if (mode === 'studio') {
      const studioSlides = slideContents.map((s) => ({
        title: s.headline,
        subtitle: s.body,
      }));
      const latency = Date.now() - startTime;
      return {
        slides: studioSlides,
        metadata: {
          ...state.metadata,
          totalLatency: state.metadata.totalLatency + latency,
          models: [...state.metadata.models, 'visual-formatter'],
        },
      };
    }

    // Modo database (padrão): cria registro em creatives
    const creativeId = await createCreative(state, slideContents, templateId);

    if (!creativeId) {
      console.warn('[visual-formatter] Failed to create creative, but job continues');
      return { creativeId: undefined };
    }

    const latency = Date.now() - startTime;
    console.log(`[visual-formatter] Created creative ${creativeId} in ${latency}ms`);

    return {
      creativeId,
      metadata: {
        ...state.metadata,
        totalLatency: state.metadata.totalLatency + latency,
        models: [...state.metadata.models, 'visual-formatter'],
      },
    };
  } catch (error: any) {
    console.error('[visual-formatter] Error:', error.message);
    // Não bloqueia o job
    return mode === 'studio'
      ? {
          slides: state.slides || [],
          errors: [
            ...state.errors,
            { node: 'visual-formatter', message: error.message, timestamp: new Date().toISOString() },
          ],
        }
      : {
          creativeId: undefined,
          errors: [
            ...state.errors,
            { node: 'visual-formatter', message: error.message, timestamp: new Date().toISOString() },
          ],
        };
  }
}
