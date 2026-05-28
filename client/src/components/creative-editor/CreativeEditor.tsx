import { useMemo } from 'react';
import type { Creative, Slide, TextLayer } from '@/lib/creative-editor-types';
import type { HtmlSlideConfig } from '@shared/types/html-slide-config';
import { HtmlSlideEditor } from './HtmlSlideEditor';

interface CreativeEditorProps {
  creative: Creative;
  onSave?: (creative: Creative) => void | Promise<void>;
  onExport?: (creative: Creative) => Promise<string[]>;
  readOnly?: boolean;
  onBackToApp?: () => void;
}

function extractPrimaryText(slide: Slide): { title: string; subtitle: string } {
  if (slide.textLayout) {
    return {
      title: slide.textLayout.title || '',
      subtitle: slide.textLayout.subtitle || '',
    };
  }

  const textLayers = slide.layers
    .filter((layer): layer is TextLayer => layer.type === 'text')
    .sort((a, b) => a.y - b.y);

  return {
    title: textLayers[0]?.text || `Slide ${slide.index + 1}`,
    subtitle: textLayers[1]?.text || '',
  };
}

function mapLegacySlidesToConfigs(creative: Creative): HtmlSlideConfig[] {
  const slides = creative.slides || [];
  const canvasWidth = creative.canvasWidth || 1080;
  const canvasHeight = creative.canvasHeight || 1080;

  return slides.map((slide, index) => {
    const text = extractPrimaryText(slide);
    const isImageBackground = slide.background.type === 'image';

    return {
      id: slide.id || `slide-${index + 1}`,
      index,
      canvasWidth,
      canvasHeight,
      theme: slide.theme || 'dark',
      templateVariant: index % 4 === 0 ? 'spotlight' : index % 4 === 1 ? 'glass-card' : index % 4 === 2 ? 'editorial-band' : 'minimal',
      backgroundImageUrl: isImageBackground ? slide.background.value : slide.imageGrid?.imageUrl,
      backgroundColor: slide.background.type === 'color' ? slide.background.value : '#111827',
      backgroundGradient: slide.background.type === 'gradient' ? slide.background.value : undefined,
      backgroundZoom: slide.background.imageZoom || 100,
      backgroundPositionX: slide.background.imagePositionX || 50,
      backgroundPositionY: slide.background.imagePositionY || 50,
      overlayColor: slide.overlay?.color || '#000000',
      overlayOpacity: slide.overlay?.opacity ?? 45,
      textPosition: slide.textLayout?.position || 'mid-left',
      title: {
        text: text.title,
        color: slide.theme === 'light' ? '#111827' : '#ffffff',
        fontSize: slide.typography?.titleFontSize || 64,
        fontFamily: 'Space Grotesk',
        fontWeight: 'bold',
        align: slide.textLayout?.alignment || 'left',
      },
      subtitle: {
        text: text.subtitle,
        color: slide.theme === 'light' ? '#1f2937' : '#f3f4f6',
        fontSize: slide.typography?.subtitleFontSize || 30,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        align: slide.textLayout?.alignment || 'left',
      },
      ctaButton: {
        visible: slide.ctaButton?.visible || false,
        text: slide.ctaButton?.text || 'Saiba mais',
        backgroundColor: slide.ctaButton?.backgroundColor || slide.typography?.accentColor || '#3b82f6',
        textColor: slide.ctaButton?.textColor || '#ffffff',
        borderRadius: slide.ctaButton?.borderRadius || 18,
      },
      accentColor: slide.typography?.accentColor || '#3b82f6',
      imagePrompt: undefined,
    };
  });
}

export function CreativeEditor({ creative, onSave, onExport, readOnly = false, onBackToApp }: CreativeEditorProps) {
  const normalizedCreative = useMemo<Creative>(() => {
    if (creative.htmlSlideConfigs && creative.htmlSlideConfigs.length > 0) {
      return creative;
    }

    return {
      ...creative,
      htmlSlideConfigs: mapLegacySlidesToConfigs(creative),
    };
  }, [creative]);

  return (
    <HtmlSlideEditor
      creative={normalizedCreative}
      onSave={onSave}
      onExport={onExport}
      readOnly={readOnly}
      onBackToApp={onBackToApp}
    />
  );
}
