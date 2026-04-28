/**
 * CreativeEditor — Container principal do editor visual Konva
 * Composição: SlideCanvas + SlideThumbnailPanel + SlideControls + TextEditPanel
 */

import { useState, useCallback, useRef } from 'react';
import type { Slide, Creative, TextLayer, Layer } from '@/lib/creative-editor-types';
import { useGenerateSlideImage, useRefineSlide, useRegenerateSlideContent } from '@/hooks/use-creatives';
import { SlideCanvas } from './SlideCanvas';
import { SlideThumbnailPanel } from './SlideThumbnailPanel';
import { SlideNavigationBar } from './SlideNavigationBar';
import { DownloadBar } from './DownloadBar';
import { TextEditPanel } from './TextEditPanel';
import { FontLoader } from './FontLoader';

function getPrimaryTextLayerIndexes(slide: Slide): { titleIndex: number; subtitleIndex: number } {
  const textIndexes = slide.layers
    .map((layer, index) => ({ layer, index }))
    .filter((item): item is { layer: TextLayer; index: number } => item.layer.type === 'text')
    .sort((a, b) => a.layer.y - b.layer.y)
    .map((item) => item.index);

  return {
    titleIndex: textIndexes[0] ?? -1,
    subtitleIndex: textIndexes[1] ?? -1,
  };
}

export type CanvasFormat = 'square' | 'portrait' | 'story';

export function getCanvasDimensions(format: CanvasFormat) {
  switch (format) {
    case 'portrait':
      return { width: 1080, height: 1350 };
    case 'story':
      return { width: 1080, height: 1920 };
    case 'square':
    default:
      return { width: 1080, height: 1080 };
  }
}

function getPositionPlacement(
  position: NonNullable<Slide['textLayout']>['position'],
  canvasHeight: number
) {
  // Coordenadas Y relativas ao canvasHeight (baseadas em 1080px)
  const relativeYMap: Record<string, number> = {
    'top': 0.111,   // 120 / 1080
    'mid': 0.278,   // 300 / 1080
    'bot': 0.481,   // 520 / 1080
  };

  const getY = (baseY: number) => Math.round((baseY / 1080) * canvasHeight);

  const map = {
    'top-left': { x: 80, y: getY(120), align: 'left' as const },
    'top-center': { x: 160, y: getY(120), align: 'center' as const },
    'top-right': { x: 240, y: getY(120), align: 'right' as const },
    'mid-left': { x: 80, y: getY(280), align: 'left' as const },
    mid: { x: 160, y: getY(300), align: 'center' as const },
    'mid-right': { x: 240, y: getY(280), align: 'right' as const },
    'bot-left': { x: 80, y: getY(520), align: 'left' as const },
    'bot-center': { x: 160, y: getY(560), align: 'center' as const },
    'bot-right': { x: 240, y: getY(520), align: 'right' as const },
  };
  return map[position];
}

function createTextLayersFromLayout(
  slide: Slide,
  layoutMode: NonNullable<Creative['layoutMode']>,
  textLayout: NonNullable<Slide['textLayout']>,
  typography: NonNullable<Slide['typography']>,
  theme: NonNullable<Slide['theme']>,
  canvasHeight: number
): Layer[] {
  const placement = getPositionPlacement(textLayout.position, canvasHeight);
  const scaleFactor = typography.globalScale / 100;
  const isProfileMode = layoutMode === 'profile';
  const titleX = isProfileMode ? 360 : placement.x;
  const textWidth = isProfileMode ? 660 : 760;
  const subtitleOffsetY = isProfileMode ? 160 : 180;

  return [
    {
      id: `${slide.id}-title`,
      type: 'text',
      x: titleX,
      y: placement.y,
      width: textWidth,
      height: 120,
      text: textLayout.title,
      fontSize: Math.max(12, Math.round(typography.titleFontSize * scaleFactor)),
      fontFamily: typography.titleFontFamily,
      color: theme === 'light' ? '#111827' : '#ffffff',
      align: textLayout.alignment,
      fontWeight: 'bold' as const,
      editable: true,
    },
    {
      id: `${slide.id}-subtitle`,
      type: 'text',
      x: titleX,
      y: placement.y + subtitleOffsetY,
      width: textWidth,
      height: 200,
      text: textLayout.subtitle,
      fontSize: Math.max(12, Math.round(typography.subtitleFontSize * scaleFactor)),
      fontFamily: 'Inter',
      color: theme === 'light' ? '#1f2937' : '#f3f4f6',
      align: textLayout.alignment,
      fontWeight: 'normal' as const,
      editable: true,
    },
  ];
}

function applySlideSettingsToSlide(
  slide: Slide,
  layoutMode: NonNullable<Creative['layoutMode']>,
  changes: {
    theme?: NonNullable<Slide['theme']>;
    textLayout?: Partial<NonNullable<Slide['textLayout']>>;
    typography?: Partial<NonNullable<Slide['typography']>>;
    overlay?: Partial<NonNullable<Slide['overlay']>>;
    imageGrid?: Partial<NonNullable<Slide['imageGrid']>>;
    profileBadge?: Partial<NonNullable<Slide['profileBadge']>>;
    ctaButton?: Partial<NonNullable<Slide['ctaButton']>>;
  },
  canvasHeight: number = 1080
): Slide {
  const { titleIndex, subtitleIndex } = getPrimaryTextLayerIndexes(slide);
  const hasPrimaryTextLayers = titleIndex >= 0 && subtitleIndex >= 0;

  const currentTextLayout = slide.textLayout ?? {
    position: 'mid-left' as const,
    alignment: 'left' as const,
    title: hasPrimaryTextLayers && slide.layers[titleIndex]?.type === 'text'
      ? slide.layers[titleIndex].text
      : '',
    subtitle: hasPrimaryTextLayers && slide.layers[subtitleIndex]?.type === 'text'
      ? slide.layers[subtitleIndex].text
      : '',
  };

  const currentTypography = slide.typography ?? {
    globalScale: 100,
    titleFontSize: 56,
    titleFontFamily: 'Space' as const,
    subtitleFontSize: 28,
    accentColor: '#3B82F6',
    accentWords: [],
  };

  const nextTextLayout = changes.textLayout
    ? { ...currentTextLayout, ...changes.textLayout }
    : currentTextLayout;
  const nextTypography = changes.typography
    ? { ...currentTypography, ...changes.typography }
    : currentTypography;
  const nextOverlay = changes.overlay
    ? {
        ...(slide.overlay ?? { style: 'base' as const, opacity: 35, color: '#000000' }),
        ...changes.overlay,
      }
    : slide.overlay;
  const nextImageGrid = changes.imageGrid
    ? {
        ...(slide.imageGrid ?? { visible: false, imageUrl: undefined, borderRadius: 16 }),
        ...changes.imageGrid,
      }
    : slide.imageGrid;
  const nextProfileBadge = changes.profileBadge
    ? {
        ...(slide.profileBadge ?? {
          visible: false,
          imageUrl: undefined,
          name: '',
          handle: '',
          style: 'solid' as const,
          size: 64,
          position: 'top-left' as const,
        }),
        ...changes.profileBadge,
      }
    : slide.profileBadge;
  const nextCtaButton = changes.ctaButton
    ? {
        ...(slide.ctaButton ?? {
          visible: false,
          text: 'Saiba mais',
          style: 'filled' as const,
          size: 18,
          borderRadius: 18,
          backgroundColor: '#111827',
          textColor: '#ffffff',
        }),
        ...changes.ctaButton,
      }
    : slide.ctaButton;
  const nextTheme = changes.theme ?? slide.theme ?? 'dark';

  const positionChanged = changes.textLayout?.position !== undefined
    && changes.textLayout.position !== (slide.textLayout?.position ?? 'mid');

  let updatedLayers = slide.layers;
  if (hasPrimaryTextLayers) {
    updatedLayers = [...slide.layers];
    const placement = getPositionPlacement(nextTextLayout.position, canvasHeight);
    const scaleFactor = nextTypography.globalScale / 100;
    const isProfileMode = layoutMode === 'profile';
    const titleX = isProfileMode ? 360 : placement.x;
    const textWidth = isProfileMode ? 660 : 760;
    const subtitleOffsetY = isProfileMode ? 160 : 180;

    const titleLayer = updatedLayers[titleIndex];
    if (titleLayer?.type === 'text') {
      updatedLayers[titleIndex] = {
        ...titleLayer,
        ...(positionChanged ? { x: titleX, y: placement.y } : {}),
        width: textWidth,
        align: nextTextLayout.alignment,
        text: nextTextLayout.title,
        fontSize: Math.max(12, Math.round(nextTypography.titleFontSize * scaleFactor)),
        fontFamily: nextTypography.titleFontFamily,
        color: nextTheme === 'light' ? '#111827' : '#ffffff',
      };
    }

    const subtitleLayer = updatedLayers[subtitleIndex];
    if (subtitleLayer?.type === 'text') {
      updatedLayers[subtitleIndex] = {
        ...subtitleLayer,
        ...(positionChanged ? { x: titleX, y: placement.y + subtitleOffsetY } : {}),
        width: textWidth,
        align: nextTextLayout.alignment,
        text: nextTextLayout.subtitle,
        fontSize: Math.max(12, Math.round(nextTypography.subtitleFontSize * scaleFactor)),
        color: nextTheme === 'light' ? '#1f2937' : '#f3f4f6',
      };
    }
  } else if (slide.textLayout || changes.textLayout) {
    // Criar layers de texto se não existirem mas houver textLayout
    const nonTextLayers = slide.layers.filter((l) => l.type !== 'text');
    const newTextLayers = createTextLayersFromLayout(
      slide,
      layoutMode,
      nextTextLayout,
      nextTypography,
      nextTheme,
      canvasHeight
    );
    updatedLayers = [...nonTextLayers, ...newTextLayers];
  }

  return {
    ...slide,
    theme: nextTheme,
    textLayout: nextTextLayout,
    typography: nextTypography,
    overlay: nextOverlay,
    imageGrid: nextImageGrid,
    profileBadge: nextProfileBadge,
    ctaButton: nextCtaButton,
    layers: updatedLayers,
  };
}

/**
 * Normaliza as coordenadas Y dos slides quando o formato muda.
 * Converte coordenadas absolutas de um canvas de origem para o canvas atual.
 */
function normalizeSlideCoordinates(slide: Slide, sourceHeight: number, targetHeight: number): Slide {
  if (sourceHeight === targetHeight) return slide;

  const ratio = targetHeight / sourceHeight;

  const normalizedLayers = slide.layers.map((layer) => {
    if (layer.type !== 'text') return layer;
    return {
      ...layer,
      y: Math.round(layer.y * ratio),
    };
  });

  return {
    ...slide,
    layers: normalizedLayers,
  };
}

interface CreativeEditorProps {
  creative: Creative;
  onSave?: (creative: Creative) => void;
  onExport?: (creative: Creative) => Promise<string[]>;
  readOnly?: boolean;
}

const DEFAULT_PROFILE_CONFIG: NonNullable<Creative['profileConfig']> = {
  photoUrl: '',
  name: '',
  handle: '',
  badgeStyle: 'solid',
  thumbnailCount: 1,
  borderRadius: 18,
};

const DISPLAY_SCALE = 0.55; // Escala para caber na tela

export function CreativeEditor({ creative, onSave, onExport, readOnly = false }: CreativeEditorProps) {
  const generateSlideImageMutation = useGenerateSlideImage();
  const refineSlideMutation = useRefineSlide();
  const regenerateSlideMutation = useRegenerateSlideContent();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [profileConfig, setProfileConfig] = useState<NonNullable<Creative['profileConfig']>>({
    ...DEFAULT_PROFILE_CONFIG,
    ...(creative.profileConfig ?? {}),
    handle: creative.profileConfig?.handle || creative.instagramHandle || '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const exportCurrentSlideRef = useRef<(() => string | null) | null>(null);

  // Dimensões do canvas baseadas no formato do creative
  const canvasFormat = (creative as any).format || 'square';
  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasFormat as CanvasFormat);

  // Normalizar coordenadas dos slides se o creative foi criado com altura diferente
  const sourceHeight = (creative as any).canvasHeight || 1080;
  const [slides, setSlides] = useState<Slide[]>(() =>
    creative.slides.map((slide) => normalizeSlideCoordinates(slide, sourceHeight, canvasHeight))
  );

  const currentSlide = slides[currentIndex];

  const selectedLayer = selectedLayerId
    ? (currentSlide?.layers.find((l) => l.id === selectedLayerId) as TextLayer | undefined)
    : null;

  const handleSlideChange = useCallback(
    (updatedSlide: Slide) => {
      setSlides((prev) =>
        prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
      );
    },
    []
  );

  const persistSlides = useCallback(
    async (nextSlides: Slide[]) => {
      if (!onSave) return;
      setIsSaving(true);
      try {
        await onSave({ ...creative, slides: nextSlides, profileConfig });
      } finally {
        setIsSaving(false);
      }
    },
    [creative, onSave, profileConfig]
  );

  const handleProfileConfigChange = useCallback((changes: Partial<NonNullable<Creative['profileConfig']>>) => {
    setProfileConfig((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleLayerUpdate = useCallback(
    (updates: Partial<TextLayer>) => {
      if (!selectedLayerId || !currentSlide) return;
      const updatedLayers = currentSlide.layers.map((l) =>
        l.id === selectedLayerId ? { ...l, ...updates } as Layer : l
      );
      handleSlideChange({ ...currentSlide, layers: updatedLayers });
    },
    [selectedLayerId, currentSlide, handleSlideChange]
  );

  const handleSlideSettingsChange = useCallback(
    (changes: {
      theme?: NonNullable<Slide['theme']>;
      textLayout?: Partial<NonNullable<Slide['textLayout']>>;
      typography?: Partial<NonNullable<Slide['typography']>>;
      overlay?: Partial<NonNullable<Slide['overlay']>>;
      imageGrid?: Partial<NonNullable<Slide['imageGrid']>>;
      profileBadge?: Partial<NonNullable<Slide['profileBadge']>>;
      ctaButton?: Partial<NonNullable<Slide['ctaButton']>>;
    }) => {
      if (!currentSlide) return;

      handleSlideChange(applySlideSettingsToSlide(currentSlide, creative.layoutMode ?? 'minimalist', changes, canvasHeight));
    },
    [creative.layoutMode, currentSlide, handleSlideChange, canvasHeight]
  );

  const handleApplyToNextSlide = useCallback(() => {
    if (!currentSlide || currentIndex >= slides.length - 1) return;

    const nextSlide = slides[currentIndex + 1];
    const updatedNextSlide = applySlideSettingsToSlide(nextSlide, creative.layoutMode ?? 'minimalist', {
      theme: currentSlide.theme,
      textLayout: currentSlide.textLayout,
      typography: currentSlide.typography,
      overlay: currentSlide.overlay,
      imageGrid: currentSlide.imageGrid,
      profileBadge: currentSlide.profileBadge,
      ctaButton: currentSlide.ctaButton,
    }, canvasHeight);

    setSlides((prev) =>
      prev.map((slide, index) => (index === currentIndex + 1 ? updatedNextSlide : slide))
    );
  }, [creative.layoutMode, currentSlide, currentIndex, slides]);

  const handleGenerateCurrentSlideContent = useCallback(async (): Promise<void> => {
    const slideId = currentSlide?.id;
    if (!slideId) return;

    const result = await regenerateSlideMutation.mutateAsync({
      id: creative.id,
      idx: currentIndex,
      instruction: 'Regere o conteudo deste slide com mais clareza e impacto.',
    });

    if (!currentSlide) return;

    const updatedCurrentSlide = applySlideSettingsToSlide(currentSlide, creative.layoutMode ?? 'minimalist', {
      textLayout: result.textLayout,
    }, canvasHeight);

    const nextSlides = slides.map((slide) =>
      slide.id === updatedCurrentSlide.id ? updatedCurrentSlide : slide
    );
    setSlides(nextSlides);
    await persistSlides(nextSlides);
  }, [creative.id, currentIndex, currentSlide, persistSlides, regenerateSlideMutation, slides, canvasHeight]);

  const handleRefineCurrentSlide = useCallback(async (instruction: string): Promise<void> => {
    if (!instruction.trim() || !currentSlide) return;

    const result = await refineSlideMutation.mutateAsync({
      id: creative.id,
      idx: currentIndex,
      instruction,
    });

    const updatedCurrentSlide = applySlideSettingsToSlide(currentSlide, creative.layoutMode ?? 'minimalist', {
      textLayout: result.textLayout,
    }, canvasHeight);

    const nextSlides = slides.map((slide) =>
      slide.id === updatedCurrentSlide.id ? updatedCurrentSlide : slide
    );
    setSlides(nextSlides);
    await persistSlides(nextSlides);
  }, [creative.id, currentIndex, currentSlide, persistSlides, refineSlideMutation, slides, canvasHeight]);

  const handleGenerateCurrentSlideImage = useCallback(async (styleHint: string): Promise<void> => {
    if (!currentSlide) return;

    const result = await generateSlideImageMutation.mutateAsync({
      id: creative.id,
      idx: currentIndex,
      styleHint: styleHint.trim() || undefined,
    });

    const updatedCurrentSlide = applySlideSettingsToSlide(currentSlide, creative.layoutMode ?? 'minimalist', {
      imageGrid: {
        visible: true,
        imageUrl: result.imageUrl,
      },
    }, canvasHeight);

    const nextSlides = slides.map((slide) =>
      slide.id === updatedCurrentSlide.id ? updatedCurrentSlide : slide
    );
    setSlides(nextSlides);
    await persistSlides(nextSlides);
  }, [creative.id, currentIndex, currentSlide, generateSlideImageMutation, persistSlides, slides, canvasHeight]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setSelectedLayerId(null);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1));
    setSelectedLayerId(null);
  }, [slides.length]);

  const handleSave = useCallback(async () => {
    await persistSlides(slides);
  }, [persistSlides, slides]);

  const handleExport = useCallback(async () => {
    if (!onExport) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: slides.length });
    try {
      await onExport({ ...creative, slides, profileConfig });
      setExportProgress({ current: slides.length, total: slides.length });
      // Pequeno delay para mostrar conclusão
      setTimeout(() => setIsExporting(false), 800);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  }, [creative, slides, profileConfig, onExport]);

  const handleDownloadCurrentSlide = useCallback(() => {
    const exportFn = exportCurrentSlideRef.current;
    if (!exportFn) return;

    const dataUrl = exportFn();
    if (!dataUrl) return;

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `creative-${creative.id}-slide-${currentIndex + 1}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [creative.id, currentIndex]);

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Nenhum slide para exibir
      </div>
    );
  }

  return (
    <FontLoader>
    <div className="flex h-screen bg-background text-foreground">
      {/* Painel lateral de thumbnails */}
      <div className="w-36 bg-card/70 border-r border-border/60 flex-shrink-0">
        <SlideThumbnailPanel
          slides={slides}
          currentIndex={currentIndex}
          onSelectSlide={(index) => {
            setCurrentIndex(index);
            setSelectedLayerId(null);
          }}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      </div>

      {/* Área principal do canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <SlideNavigationBar
          creativeId={creative.id}
          status={creative.status}
          currentIndex={currentIndex}
          totalSlides={slides.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <div className="bg-card/70 rounded-xl shadow-lg p-2 border border-border/60">
            <SlideCanvas
              slide={currentSlide}
              layoutMode={creative.layoutMode ?? 'minimalist'}
              profileConfig={profileConfig}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              scale={DISPLAY_SCALE}
              onSlideChange={handleSlideChange}
              onLayerSelect={setSelectedLayerId}
              onExportReady={(exportFn) => {
                exportCurrentSlideRef.current = exportFn;
              }}
              readOnly={readOnly}
            />
          </div>
        </div>

        <DownloadBar
          readOnly={readOnly}
          isSaving={isSaving}
          isExporting={isExporting}
          exportProgress={exportProgress}
          currentSlideNumber={currentIndex + 1}
          onSave={handleSave}
          onDownloadCurrentSlide={handleDownloadCurrentSlide}
          onExport={handleExport}
        />
      </div>

      {/* Painel lateral de propriedades */}
      {!readOnly && (
        <div className="w-64 bg-card/70 border-l border-border/60 flex-shrink-0 overflow-y-auto">
          <TextEditPanel
            slide={currentSlide}
            layer={selectedLayer || null}
            onChange={handleLayerUpdate}
            onSlideSettingsChange={handleSlideSettingsChange}
            onApplyToNextSlide={handleApplyToNextSlide}
            onGenerateCurrentSlideContent={handleGenerateCurrentSlideContent}
            onRefineCurrentSlide={handleRefineCurrentSlide}
            onGenerateCurrentSlideImage={handleGenerateCurrentSlideImage}
            layoutMode={creative.layoutMode ?? 'minimalist'}
            profileConfig={profileConfig}
            onProfileConfigChange={handleProfileConfigChange}
            isGeneratingContent={regenerateSlideMutation.isPending}
            isRefiningContent={refineSlideMutation.isPending}
            isGeneratingImage={generateSlideImageMutation.isPending}
          />
        </div>
      )}
    </div>
    </FontLoader>
  );
}
