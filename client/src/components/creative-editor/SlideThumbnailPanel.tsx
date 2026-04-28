/**
 * Painel lateral com thumbnails de todos os slides do carrossel
 * Permite navegação clicando em cada thumbnail
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { Slide, TextLayer } from '@/lib/creative-editor-types';

interface SlideThumbnailPanelProps {
  slides: Slide[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  thumbnailSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

const DEFAULT_CANVAS_WIDTH = 1080;
const DEFAULT_CANVAS_HEIGHT = 1080;
const THUMB_MAX_WIDTH = 120;
const THUMB_MAX_HEIGHT = 160; // Aumentado para acomodar portrait

function useImage(url: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
  }, [url]);
  return image;
}

function MiniSlide({
  slide,
  isActive,
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
}: {
  slide: Slide;
  isActive: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const [bgColor, setBgColor] = useState('#1a1a2e');
  const bgImage = useImage(
    slide.background.type === 'image' ? slide.background.value : undefined
  );

  // Calcular dimensões do thumbnail mantendo aspect ratio
  const aspectRatio = canvasWidth / canvasHeight;
  let thumbWidth = THUMB_MAX_WIDTH;
  let thumbHeight = THUMB_MAX_WIDTH / aspectRatio;
  if (thumbHeight > THUMB_MAX_HEIGHT) {
    thumbHeight = THUMB_MAX_HEIGHT;
    thumbWidth = THUMB_MAX_HEIGHT * aspectRatio;
  }
  const thumbScaleX = thumbWidth / canvasWidth;
  const thumbScaleY = thumbHeight / canvasHeight;

  useEffect(() => {
    if (slide.background.type === 'color') {
      setBgColor(slide.background.value);
    } else if (slide.background.type === 'gradient') {
      const match = slide.background.value.match(/#[0-9a-fA-F]{3,8}/);
      setBgColor(match?.[0] || '#667eea');
    } else {
      setBgColor('#1a1a2e');
    }
  }, [slide.background]);

  // Extract text layers
  const textLayers = useMemo(
    () => slide.layers.filter((l) => l.type === 'text') as TextLayer[],
    [slide.layers]
  );

  const titleLayer = textLayers.find((l) =>
    l.id.includes('title')
  );
  const subtitleLayer = textLayers.find((l) =>
    l.id.includes('subtitle')
  );

  // Scale font sizes for thumbnail
  const scaleFont = (size: number) => Math.max(14, size * thumbScaleX * 2.5);

  return (
    <Stage width={thumbWidth} height={thumbHeight} scaleX={thumbScaleX} scaleY={thumbScaleY}>
      <Layer>
        {/* Background */}
        {bgImage ? (
          <KonvaImage
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            image={bgImage}
          />
        ) : (
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={bgColor}
          />
        )}

        {/* Overlay */}
        {slide.overlay && (
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={slide.overlay.color || '#000000'}
            opacity={(slide.overlay.opacity || 0) / 100}
          />
        )}

        {/* Title */}
        {titleLayer && (
          <Text
            x={titleLayer.x}
            y={titleLayer.y}
            width={titleLayer.width}
            text={titleLayer.text}
            fontSize={scaleFont(titleLayer.fontSize || 56)}
            fontFamily={titleLayer.fontFamily || 'Space'}
            fill={titleLayer.color || '#ffffff'}
            align={(titleLayer.align as any) || 'left'}
            fontStyle={titleLayer.fontWeight === 'bold' ? 'bold' : 'normal'}
            wrap="word"
            ellipsis
          />
        )}

        {/* Subtitle */}
        {subtitleLayer && (
          <Text
            x={subtitleLayer.x}
            y={subtitleLayer.y}
            width={subtitleLayer.width}
            text={subtitleLayer.text}
            fontSize={scaleFont(subtitleLayer.fontSize || 28)}
            fontFamily={subtitleLayer.fontFamily || 'Inter'}
            fill={subtitleLayer.color || '#f3f4f6'}
            align={(subtitleLayer.align as any) || 'left'}
            fontStyle={subtitleLayer.fontWeight === 'bold' ? 'bold' : 'normal'}
            wrap="word"
            ellipsis
          />
        )}

        {/* Image grid preview */}
        {slide.imageGrid?.visible && slide.imageGrid.imageUrl && (
          <Rect
            x={slide.imageGrid.placement?.x ?? 700}
            y={slide.imageGrid.placement?.y ?? 600}
            width={slide.imageGrid.placement?.width ?? 300}
            height={slide.imageGrid.placement?.height ?? 300}
            fill="#ffffff"
            opacity={0.2}
            cornerRadius={slide.imageGrid.placement?.borderRadius ?? (slide.imageGrid.borderRadius || 16)}
          />
        )}

        {/* CTA Button preview */}
        {slide.ctaButton?.visible && (
          <Rect
            x={80}
            y={canvasHeight - 180}
            width={300}
            height={60}
            fill={slide.ctaButton.backgroundColor || '#3B82F6'}
            cornerRadius={slide.ctaButton.borderRadius || 18}
            opacity={0.8}
          />
        )}

        {/* Border / selection indicator */}
        <Rect
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          stroke={isActive ? '#fa5d19' : '#374151'}
          strokeWidth={isActive ? 8 : 2}
          listening={false}
        />

        {/* Slide number badge */}
        <Rect
          x={20}
          y={20}
          width={70}
          height={50}
          fill={isActive ? '#fa5d19' : 'rgba(0,0,0,0.5)'}
          cornerRadius={8}
          listening={false}
        />
        <Text
          x={20}
          y={28}
          width={70}
          text={`${slide.index + 1}`}
          fontSize={40}
          fill="#ffffff"
          fontStyle="bold"
          align="center"
          listening={false}
        />
      </Layer>
    </Stage>
  );
}

export function SlideThumbnailPanel({
  slides,
  currentIndex,
  onSelectSlide,
  canvasWidth,
  canvasHeight,
}: SlideThumbnailPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o slide atual
  useEffect(() => {
    if (scrollRef.current) {
      const activeThumb = scrollRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Slides ({slides.length})
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 px-2 py-1"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => onSelectSlide(index)}
            className={`w-full rounded-lg overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-primary/40 ${
              index === currentIndex ? 'ring-2 ring-primary shadow-md' : 'opacity-70 hover:opacity-100'
            }`}
            title={`Slide ${index + 1}`}
          >
            <MiniSlide
              slide={slide}
              isActive={index === currentIndex}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
