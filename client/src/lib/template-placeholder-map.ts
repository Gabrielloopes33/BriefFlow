/**
 * Mapeamento de placeholders para preenchimento automático de templates
 * Usado pelo visual-formatter e pelo editor para substituir placeholders
 * pelos dados reais do post/cliente
 */

import type { Creative } from './creative-editor-types';

export interface PostData {
  title: string;
  content: string;
}

export interface ClientData {
  name: string;
  handle?: string;
}

export interface SlideContent {
  title: string;
  body: string;
}

export type PlaceholderResolver = (
  post: PostData,
  client: ClientData,
  slides?: SlideContent[]
) => string;

export const PLACEHOLDER_MAP: Record<string, PlaceholderResolver> = {
  '{{headline}}': (post) => post.title || 'Título do Post',
  '{{body}}': (post) => {
    // Pega apenas o primeiro parágrafo ou primeiros 200 caracteres
    const text = post.content || '';
    const firstParagraph = text.split('\n')[0] || text;
    return firstParagraph.slice(0, 200) || 'Conteúdo do post';
  },
  '{{cta}}': () => 'Salve para ler depois 💾',
  '{{client_handle}}': (post, client) => {
    if (client.handle) return client.handle;
    const handle = client.name.toLowerCase().replace(/\s+/g, '');
    return `@${handle}`;
  },
  '{{client_name}}': (post, client) => client.name,
};

/**
 * Resolve placeholders dinâmicos de slide ({{slide_title_N}}, {{slide_body_N}})
 */
function resolveSlidePlaceholder(
  placeholder: string,
  slides: SlideContent[]
): string {
  const titleMatch = placeholder.match(/\{\{slide_title_(\d+)\}\}/);
  if (titleMatch) {
    const index = parseInt(titleMatch[1], 10) - 1;
    return slides[index]?.title || '';
  }

  const bodyMatch = placeholder.match(/\{\{slide_body_(\d+)\}\}/);
  if (bodyMatch) {
    const index = parseInt(bodyMatch[1], 10) - 1;
    return slides[index]?.body || '';
  }

  return placeholder;
}

/**
 * Substitui todos os placeholders em um texto pelos valores reais
 */
export function resolvePlaceholders(
  text: string,
  post: PostData,
  client: ClientData,
  slideContents?: SlideContent[]
): string {
  let result = text;

  // Resolve placeholders simples
  for (const [placeholder, resolver] of Object.entries(PLACEHOLDER_MAP)) {
    if (result.includes(placeholder)) {
      result = result.replaceAll(placeholder, resolver(post, client, slideContents));
    }
  }

  // Resolve placeholders de slide ({{slide_title_1}}, {{slide_body_2}}, etc.)
  if (slideContents) {
    const slidePlaceholders = result.match(/\{\{slide_(title|body)_\d+\}\}/g);
    if (slidePlaceholders) {
      for (const ph of slidePlaceholders) {
        result = result.replaceAll(ph, resolveSlidePlaceholder(ph, slideContents));
      }
    }
  }

  return result;
}

/**
 * Preenche as camadas de um slide com os dados reais do post
 */
export function fillSlideLayers(
  slide: { layers: Array<{ text?: string; placeholder?: string; type: string }> },
  post: PostData,
  client: ClientData,
  slideContents?: SlideContent[]
): void {
  for (const layer of slide.layers) {
    if (layer.type === 'text' && layer.placeholder) {
      layer.text = resolvePlaceholders(layer.placeholder, post, client, slideContents);
    }
  }
}

/**
 * Preenche todos os slides de um criativo com os dados do post
 */
export function fillCreativeSlides(
  creative: Creative,
  post: PostData,
  client: ClientData,
  slideContents?: SlideContent[]
): Creative {
  const filled = { ...creative };
  filled.slides = creative.slides.map((slide) => ({
    ...slide,
    layers: slide.layers.map((layer) => {
      if (layer.type === 'text' && layer.placeholder) {
        return {
          ...layer,
          text: resolvePlaceholders(layer.placeholder, post, client, slideContents),
        };
      }
      return layer;
    }),
  }));
  return filled;
}
