import { useEffect, useMemo, useRef } from 'react';
import type { Slide, TextLayer } from '@/lib/creative-editor-types';

interface SlideThumbnailPanelProps {
  slides: Slide[];
  htmlSlides?: string[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const THUMB_MAX_WIDTH = 120;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function legacySlideToHtml(slide: Slide, canvasWidth: number, canvasHeight: number): string {
  const textLayers = slide.layers
    .filter((layer): layer is TextLayer => layer.type === 'text')
    .sort((a, b) => a.y - b.y);

  const title = escapeHtml(textLayers[0]?.text || `Slide ${slide.index + 1}`);
  const subtitle = escapeHtml(textLayers[1]?.text || '');

  const backgroundStyle =
    slide.background.type === 'image'
      ? `background-image:url('${slide.background.value}');background-size:cover;background-position:center;`
      : slide.background.type === 'gradient'
        ? `background:${slide.background.value};`
        : `background:${slide.background.value || '#111827'};`;

  const overlayOpacity = (slide.overlay?.opacity ?? 0) / 100;
  const overlayColor = slide.overlay?.color || '#000000';

  return `
<!doctype html>
<html>
  <body style="margin:0;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;position:relative;font-family:Inter,sans-serif;">
    <div style="position:absolute;inset:0;${backgroundStyle}"></div>
    <div style="position:absolute;inset:0;background:${overlayColor};opacity:${overlayOpacity};"></div>
    <div style="position:absolute;left:72px;right:72px;bottom:88px;color:#fff;z-index:2;">
      <h1 style="margin:0 0 12px 0;font-size:62px;line-height:1.05;font-family:'Space Grotesk',Inter,sans-serif;">${title}</h1>
      <p style="margin:0;font-size:30px;line-height:1.28;opacity:0.95;">${subtitle}</p>
    </div>
  </body>
</html>`;
}

function HtmlMiniSlide({ html, isActive, index }: { html: string; isActive: boolean; index: number }) {
  const scale = THUMB_MAX_WIDTH / 1080;
  const thumbHeight = THUMB_MAX_WIDTH;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: THUMB_MAX_WIDTH,
        height: thumbHeight,
        background: '#0a0a0a',
        borderRadius: 6,
        outline: isActive ? '2px solid #fa5d19' : '1px solid #374151',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 1080,
          height: 1080,
          pointerEvents: 'none',
        }}
      >
        <iframe
          srcDoc={html}
          sandbox=""
          style={{ width: 1080, height: 1080, border: 'none', display: 'block' }}
          scrolling="no"
          title={`Slide ${index + 1}`}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: isActive ? '#fa5d19' : 'rgba(0,0,0,0.65)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: 4,
          lineHeight: '16px',
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

export function SlideThumbnailPanel({
  slides,
  htmlSlides,
  currentIndex,
  onSelectSlide,
  canvasWidth = 1080,
  canvasHeight = 1080,
}: SlideThumbnailPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const renderedSlides = useMemo(() => {
    if (htmlSlides && htmlSlides.length > 0) {
      return htmlSlides;
    }

    return slides.map((slide) => legacySlideToHtml(slide, canvasWidth, canvasHeight));
  }, [htmlSlides, slides, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (scrollRef.current) {
      const activeThumb = scrollRef.current.children[currentIndex] as HTMLElement | undefined;
      activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Slides ({renderedSlides.length})
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 px-2 py-1"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {renderedSlides.map((html, index) => (
          <button
            key={index}
            onClick={() => onSelectSlide(index)}
            className="w-full rounded-lg overflow-hidden transition-all duration-150"
            title={`Slide ${index + 1}`}
          >
            <HtmlMiniSlide html={html} isActive={index === currentIndex} index={index} />
          </button>
        ))}
      </div>
    </div>
  );
}
