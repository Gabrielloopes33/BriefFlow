/**
 * Sistema de Templates de Slide para Carousel
 * 
 * Baseado em referências visuais de carrosséis virais.
 * Cada template define: posição do texto, estilo de overlay, tipografia,
 * e organização dos elementos visuais.
 */

import type {
  SlideBackground,
  SlideOverlay,
  SlideTextLayout,
  SlideTypography,
  SlideCtaButton,
  TextLayer,
  SlideImageGrid,
  SlideProfileBadge,
  FontFamily,
} from '../client/src/lib/creative-editor-types';

// Re-export types that exist in shared/schema
export type { SlideBackground, SlideOverlay, SlideTextLayout, SlideTypography };

export interface ImagePlacement {
  /** How the image is positioned within the slide */
  type: 'background' | 'inset-top' | 'inset-mid' | 'inset-bottom' | 'side-right' | 'side-left' | 'inset-small-mid';
  /** X position in pixels (ignored when type='background') */
  x: number;
  /** Y position in pixels (ignored when type='background') */
  y: number;
  /** Width in pixels (ignored when type='background') */
  width: number;
  /** Height in pixels (ignored when type='background') */
  height: number;
  /** Corner radius for the image container */
  borderRadius: number;
  /** How image fills its container: 'cover' = fill and crop, 'contain' = fit inside */
  objectFit: 'cover' | 'contain';
}

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;

  // Background
  backgroundType: 'image' | 'color' | 'gradient';
  getBackgroundValue: (params: { theme: 'dark' | 'light'; imageUrl?: string }) => string;

  // Overlay
  overlay: SlideOverlay;

  // Text layout
  textLayout: Omit<SlideTextLayout, 'title' | 'subtitle'>;

  // Typography overrides
  typographyOverrides?: Partial<SlideTypography>;

  // CTA
  ctaOverrides?: Partial<SlideCtaButton>;

  // Image placement — defines WHERE and HOW the image appears
  imagePlacement: ImagePlacement;

  // Layer positioning (returns title and subtitle layer configs)
  getTextLayers: (params: {
    slideId: string;
    title: string;
    subtitle: string;
    theme: 'dark' | 'light';
    accentColor: string;
    titleFont: FontFamily;
    bodyFont: FontFamily;
    layoutMode: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';
  }) => [TextLayer, TextLayer];
}

// ───────────────────────────────────────────────
// Helper: get text color based on theme
function textColor(theme: 'dark' | 'light', type: 'title' | 'subtitle' = 'title'): string {
  if (theme === 'light') {
    return type === 'title' ? '#111827' : '#1f2937';
  }
  return type === 'title' ? '#ffffff' : '#f3f4f6';
}

// ───────────────────────────────────────────────
// TEMPLATE 1: Classic Mid-Left (o padrão atual)
// Texto no meio-esquerda, overlay base-forte, imagem full
// ───────────────────────────────────────────────
const templateClassicMidLeft: SlideTemplate = {
  id: 'classic-mid-left',
  name: 'Clássico Meio-Esquerda',
  description: 'Texto alinhado à esquerda no centro vertical, overlay escuro',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'base-forte', opacity: 60, color: '#000000' },

  textLayout: { position: 'mid-left', alignment: 'left' },

  imagePlacement: {
    type: 'background',
    x: 0, y: 0, width: 1080, height: 1080,
    borderRadius: 0,
    objectFit: 'cover',
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const x = isProfile ? 360 : 80;
    const width = isProfile ? 660 : 760;
    const subtitleOffsetY = isProfile ? 160 : 180;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 280,
        width,
        height: 120,
        editable: true,
        text: title,
        fontSize: 56,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'left',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 280 + subtitleOffsetY,
        width,
        height: 200,
        editable: true,
        text: subtitle,
        fontSize: 28,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'left',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 2: Bottom-Left Bold
// Texto embaixo à esquerda, título grande, overlay base forte
// Estilo: "título impactante na parte inferior"
// ───────────────────────────────────────────────
const templateBottomLeftBold: SlideTemplate = {
  id: 'bottom-left-bold',
  name: 'Inferior Esquerda Impactante',
  description: 'Título grande na parte inferior esquerda, overlay escuro de baixo',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'base-forte', opacity: 70, color: '#000000' },

  textLayout: { position: 'bot-left', alignment: 'left' },

  imagePlacement: {
    type: 'background',
    x: 0, y: 0, width: 1080, height: 1080,
    borderRadius: 0,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 72,
    subtitleFontSize: 24,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const x = isProfile ? 360 : 80;
    const width = isProfile ? 660 : 760;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 560,
        width,
        height: 160,
        editable: true,
        text: title,
        fontSize: 72,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'left',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 740,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 24,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'left',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 3: Top-Center Statement
// Texto no topo centralizado, título grande tipo "headline"
// Estilo: "frase de impacto no topo"
// ───────────────────────────────────────────────
const templateTopCenterStatement: SlideTemplate = {
  id: 'top-center-statement',
  name: 'Topo Centralizado',
  description: 'Título grande centralizado no topo, subtítulo abaixo',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'topo-forte', opacity: 55, color: '#000000' },

  textLayout: { position: 'top-center', alignment: 'center' },

  imagePlacement: {
    type: 'inset-mid',
    x: 140, y: 420, width: 800, height: 520,
    borderRadius: 24,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 64,
    subtitleFontSize: 26,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const width = isProfile ? 660 : 920;
    const x = isProfile ? 360 : 80;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 120,
        width,
        height: 140,
        editable: true,
        text: title,
        fontSize: 64,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'center',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 280,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 26,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'center',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 4: Center Focus
// Texto bem no centro, título grande, mínimo de elementos
// Estilo: "foco total no texto central"
// ───────────────────────────────────────────────
const templateCenterFocus: SlideTemplate = {
  id: 'center-focus',
  name: 'Foco Central',
  description: 'Texto centralizado no meio do slide, overlay forte uniforme',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'base', opacity: 50, color: '#000000' },

  textLayout: { position: 'mid', alignment: 'center' },

  imagePlacement: {
    type: 'background',
    x: 0, y: 0, width: 1080, height: 1080,
    borderRadius: 0,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 68,
    subtitleFontSize: 28,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const width = isProfile ? 660 : 920;
    const x = isProfile ? 360 : 80;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 340,
        width,
        height: 140,
        editable: true,
        text: title,
        fontSize: 68,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'center',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 500,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 28,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'center',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 5: Diagonal Dynamic
// Texto no meio-direita, overlay diagonal
// Estilo: "dinâmico, texto à direita com diagonal"
// ───────────────────────────────────────────────
const templateDiagonalDynamic: SlideTemplate = {
  id: 'diagonal-dynamic',
  name: 'Diagonal Dinâmico',
  description: 'Texto à direita com overlay diagonal vindo da esquerda inferior',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'diag-inf-dir', opacity: 65, color: '#000000' },

  textLayout: { position: 'mid-right', alignment: 'right' },

  imagePlacement: {
    type: 'side-left',
    x: 60, y: 200, width: 420, height: 680,
    borderRadius: 28,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 60,
    subtitleFontSize: 26,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const width = isProfile ? 600 : 760;
    const x = isProfile ? 420 : 240;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 300,
        width,
        height: 130,
        editable: true,
        text: title,
        fontSize: 60,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'right',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 450,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 26,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'right',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 6: Bottom-Center CTA Heavy
// Texto embaixo centralizado, CTA destacado
// Estilo: "título embaixo com CTA bem visível"
// ───────────────────────────────────────────────
const templateBottomCenterCta: SlideTemplate = {
  id: 'bottom-center-cta',
  name: 'Inferior Central com CTA',
  description: 'Texto na parte inferior centralizado, CTA em destaque',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'base-forte', opacity: 55, color: '#000000' },

  textLayout: { position: 'bot-center', alignment: 'center' },

  imagePlacement: {
    type: 'inset-top',
    x: 120, y: 80, width: 840, height: 420,
    borderRadius: 24,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 52,
    subtitleFontSize: 24,
  },

  ctaOverrides: {
    style: 'filled',
    size: 18,
    borderRadius: 24,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const width = isProfile ? 660 : 920;
    const x = isProfile ? 360 : 80;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 520,
        width,
        height: 120,
        editable: true,
        text: title,
        fontSize: 52,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'center',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 660,
        width,
        height: 100,
        editable: true,
        text: subtitle,
        fontSize: 24,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'center',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 7: Gradient Solid (sem imagem)
// Background gradiente, texto no meio-esquerda
// Estilo: "gradiente colorido com texto clean"
// ───────────────────────────────────────────────
const templateGradientSolid: SlideTemplate = {
  id: 'gradient-solid',
  name: 'Gradiente Clean',
  description: 'Background gradiente sem imagem, texto clean no meio-esquerda',

  backgroundType: 'gradient',
  getBackgroundValue: ({ theme }) =>
    theme === 'dark'
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

  overlay: { style: 'none', opacity: 0, color: '#000000' },

  textLayout: { position: 'mid-left', alignment: 'left' },

  imagePlacement: {
    type: 'inset-small-mid',
    x: 580, y: 320, width: 420, height: 440,
    borderRadius: 20,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 64,
    subtitleFontSize: 28,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const x = isProfile ? 360 : 80;
    const width = isProfile ? 660 : 760;
    const subtitleOffsetY = isProfile ? 160 : 180;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 300,
        width,
        height: 140,
        editable: true,
        text: title,
        fontSize: 64,
        fontFamily: titleFont,
        color: '#ffffff',
        align: 'left',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 300 + subtitleOffsetY,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 28,
        fontFamily: bodyFont,
        color: 'rgba(255,255,255,0.85)',
        align: 'left',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// TEMPLATE 8: Top-Left Editorial
// Texto no topo-esquerda, estilo editorial/magazine
// Estilo: "título no topo como capa de revista"
// ───────────────────────────────────────────────
const templateTopLeftEditorial: SlideTemplate = {
  id: 'top-left-editorial',
  name: 'Editorial Topo-Esquerda',
  description: 'Título no topo esquerda estilo editorial, imagem visível embaixo',

  backgroundType: 'image',
  getBackgroundValue: ({ imageUrl, theme }) =>
    imageUrl || (theme === 'dark' ? '#111827' : '#F8FAFC'),

  overlay: { style: 'base', opacity: 40, color: '#000000' },

  textLayout: { position: 'top-left', alignment: 'left' },

  imagePlacement: {
    type: 'inset-bottom',
    x: 80, y: 440, width: 920, height: 560,
    borderRadius: 24,
    objectFit: 'cover',
  },

  typographyOverrides: {
    titleFontSize: 58,
    subtitleFontSize: 26,
  },

  getTextLayers: ({ slideId, title, subtitle, theme, titleFont, bodyFont, layoutMode }) => {
    const isProfile = layoutMode === 'profile';
    const x = isProfile ? 360 : 80;
    const width = isProfile ? 660 : 760;

    return [
      {
        id: `${slideId}-title`,
        type: 'text',
        x,
        y: 100,
        width,
        height: 140,
        editable: true,
        text: title,
        fontSize: 58,
        fontFamily: titleFont,
        color: textColor(theme, 'title'),
        align: 'left',
        fontWeight: 'bold',
      },
      {
        id: `${slideId}-subtitle`,
        type: 'text',
        x,
        y: 260,
        width,
        height: 120,
        editable: true,
        text: subtitle,
        fontSize: 26,
        fontFamily: bodyFont,
        color: textColor(theme, 'subtitle'),
        align: 'left',
        fontWeight: 'normal',
      },
    ];
  },
};

// ───────────────────────────────────────────────
// REGISTRY: All available templates
// ───────────────────────────────────────────────
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  templateClassicMidLeft,      // 0
  templateBottomLeftBold,      // 1
  templateTopCenterStatement,  // 2
  templateCenterFocus,         // 3
  templateDiagonalDynamic,     // 4
  templateBottomCenterCta,     // 5
  templateGradientSolid,       // 6
  templateTopLeftEditorial,    // 7
];

/**
 * Select a template for a given slide index.
 * Uses deterministic rotation based on index to ensure variety.
 * For profile mode, limits to templates that work well with left panel.
 */
export function selectTemplateForSlide(
  index: number,
  layoutMode: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter',
  seed = ''
): SlideTemplate {
  // For profile mode, prefer templates that don't conflict with left panel
  const profileSafeTemplates = [
    templateClassicMidLeft,
    templateBottomLeftBold,
    templateTopCenterStatement,
    templateCenterFocus,
    templateBottomCenterCta,
    templateGradientSolid,
    templateTopLeftEditorial,
  ];

  const pool = layoutMode === 'profile' ? profileSafeTemplates : SLIDE_TEMPLATES;
  const normalizedSeed = String(seed || 'default');
  const seedHash = normalizedSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offset = seedHash % pool.length;
  return pool[(index + offset) % pool.length];
}

/**
 * Build a complete slide using a template.
 */
const DEFAULT_CANVAS_HEIGHT = 1080;

export function buildSlideFromTemplate(params: {
  index: number;
  title: string;
  subtitle: string;
  accentColor: string;
  templateSeed?: string;
  layoutMode: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';
  imageMode: 'background' | 'grid' | 'both';
  imageUrl?: string;
  fontCombination?: { title: string; body: string };
  canvasHeight?: number;
}): {
  background: any;
  overlay: any;
  textLayout: any;
  typography: any;
  imageGrid: any;
  ctaButton: any;
  profileBadge: any;
  layers: any[];
} {
  const template = selectTemplateForSlide(params.index, params.layoutMode, params.templateSeed);
  const theme = params.index % 2 === 0 ? 'dark' : 'light';
  const isProfileMode = params.layoutMode === 'profile';
  const titleFont = (params.fontCombination?.title as FontFamily) || 'Space';
  const bodyFont = (params.fontCombination?.body as FontFamily) || 'Inter';
  const canvasHeight = params.canvasHeight || DEFAULT_CANVAS_HEIGHT;
  const scaleY = canvasHeight / DEFAULT_CANVAS_HEIGHT;

  // Determine background and image visibility based on imageMode and template
  const hasImageUrl = !!params.imageUrl;
  const templateIsBackground = template.imagePlacement.type === 'background';

  // When imageMode='both':
  // - Template with background placement: image goes to background, NO image grid
  // - Template with grid placement (inset/side): image goes to grid, background uses template default
  // When imageMode='background': image only in background (if template supports it)
  // When imageMode='grid': image only in grid, background uses template default
  const useImageInBackground =
    hasImageUrl &&
    templateIsBackground &&
    (params.imageMode === 'background' || params.imageMode === 'both');

  const showImageGrid =
    hasImageUrl &&
    !templateIsBackground &&
    (params.imageMode === 'grid' || params.imageMode === 'both');

  // If template wants image but we don't have one, fallback to color
  const backgroundType = useImageInBackground
    ? 'image'
    : template.backgroundType === 'image' && !hasImageUrl
      ? 'color'
      : template.backgroundType;

  const background = {
    type: backgroundType,
    value: useImageInBackground
      ? params.imageUrl
      : template.getBackgroundValue({ theme, imageUrl: params.imageUrl }),
    imagePositionX: 50,
    imagePositionY: 50,
    imageZoom: 100,
  };

  // Build text layers from template
  const [titleLayer, subtitleLayer] = template.getTextLayers({
    slideId: `slide-${params.index + 1}`,
    title: params.title,
    subtitle: params.subtitle,
    theme,
    accentColor: params.accentColor,
    titleFont,
    bodyFont,
    layoutMode: params.layoutMode,
  });

  // Scale Y coordinates to match canvas height
  function scaleLayerY(layer: any): any {
    if (!layer || typeof layer.y !== 'number') return layer;
    return { ...layer, y: Math.round(layer.y * scaleY) };
  }
  const scaledTitleLayer = scaleLayerY(titleLayer);
  const scaledSubtitleLayer = scaleLayerY(subtitleLayer);

  // Build typography with optional overrides
  const typography = {
    globalScale: 100,
    titleFontSize: 56,
    titleFontFamily: titleFont,
    subtitleFontSize: 28,
    accentColor: params.accentColor,
    accentWords: [],
    ...template.typographyOverrides,
  };

  // Build CTA
  const ctaButton = {
    visible: params.index > 0,
    text: params.index === 0 ? 'Comece agora' : 'Salve este post',
    style: 'filled' as const,
    size: 16,
    borderRadius: 18,
    backgroundColor: params.accentColor,
    textColor: '#FFFFFF',
    ...template.ctaOverrides,
  };

  // Image grid with placement from template
  const imageGrid = {
    visible: showImageGrid,
    imageUrl: showImageGrid ? params.imageUrl : undefined,
    borderRadius: template.imagePlacement.borderRadius,
    placement: template.imagePlacement,
  };

  // Profile badge
  const profileBadge = isProfileMode
    ? {
        visible: true,
        name: 'Seu Perfil',
        handle: '@perfil',
        style: 'minimal' as const,
        size: 64,
        position: 'top-left' as const,
      }
    : undefined;

  return {
    background,
    overlay: template.overlay,
    textLayout: {
      ...template.textLayout,
      title: params.title,
      subtitle: params.subtitle,
    },
    typography,
    imageGrid,
    ctaButton,
    profileBadge,
    layers: [scaledTitleLayer, scaledSubtitleLayer],
  };
}
