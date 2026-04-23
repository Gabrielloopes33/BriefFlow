/**
 * Painel lateral com thumbnails de todos os slides do carrossel
 * Permite navegação clicando em cada thumbnail
 */

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import type { Slide } from '@/lib/creative-editor-types';

interface SlideThumbnailPanelProps {
  slides: Slide[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  thumbnailSize?: number;
}

const THUMB_WIDTH = 120;
const THUMB_HEIGHT = 120;
const THUMB_SCALE = THUMB_WIDTH / 1080;

function MiniSlide({ slide, isActive }: { slide: Slide; isActive: boolean }) {
  const [bgColor, setBgColor] = useState('#667eea');

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

  // Conta elementos por tipo
  const textCount = slide.layers.filter((l) => l.type === 'text').length;
  const imageCount = slide.layers.filter((l) => l.type === 'image').length;

  return (
    <Stage width={THUMB_WIDTH} height={THUMB_HEIGHT} scaleX={THUMB_SCALE} scaleY={THUMB_SCALE}>
      <Layer>
        <Rect
          x={0}
          y={0}
          width={1080}
          height={1080}
          fill={bgColor}
          stroke={isActive ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={isActive ? 8 : 2}
        />
        {/* Indicador de slide number */}
        <Text
          x={20}
          y={20}
          text={`${slide.index + 1}`}
          fontSize={60}
          fill={isActive ? '#3b82f6' : '#ffffff'}
          fontStyle="bold"
        />
        {/* Mini indicadores de conteúdo */}
        {textCount > 0 && (
          <Rect x={80} y={940} width={200} height={40} fill="#ffffff" opacity={0.3} cornerRadius={4} />
        )}
        {imageCount > 0 && (
          <Rect x={300} y={940} width={200} height={40} fill="#fbbf24" opacity={0.3} cornerRadius={4} />
        )}
      </Layer>
    </Stage>
  );
}

export function SlideThumbnailPanel({
  slides,
  currentIndex,
  onSelectSlide,
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
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
            className={`w-full rounded-lg overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-blue-300 ${
              index === currentIndex ? 'ring-2 ring-blue-500 shadow-md' : 'opacity-70 hover:opacity-100'
            }`}
            title={`Slide ${index + 1}`}
          >
            <MiniSlide slide={slide} isActive={index === currentIndex} />
          </button>
        ))}
      </div>
    </div>
  );
}
