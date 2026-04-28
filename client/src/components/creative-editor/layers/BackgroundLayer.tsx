/**
 * Camada de fundo do slide
 * Suporta cor sólida, gradiente CSS (renderizado como retângulo), ou imagem
 */

import { Rect } from 'react-konva';
import { Image } from 'react-konva';
import { useEffect, useMemo, useState } from 'react';
import type { SlideBackground } from '@/lib/creative-editor-types';

interface BackgroundLayerProps {
  background: SlideBackground;
  width: number;
  height: number;
}

/**
 * Converte um gradiente CSS linear para cores e stops do Konva
 * Suporta formato: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
 */
function parseGradient(value: string): { colors: string[]; stops: number[] } | null {
  const match = value.match(/linear-gradient\([^,]+,\s*(.+)\)/i);
  if (!match) return null;

  const parts = match[1].split(',').map((p) => p.trim());
  const colors: string[] = [];
  const stops: number[] = [];

  for (const part of parts) {
    const colorMatch = part.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*(\d+%)?/);
    if (colorMatch) {
      colors.push(colorMatch[1]);
      const stopStr = colorMatch[2];
      stops.push(stopStr ? parseInt(stopStr, 10) / 100 : colors.length === 1 ? 0 : 1);
    }
  }

  if (colors.length < 2) return null;
  return { colors, stops };
}

export function BackgroundLayer({ background, width, height }: BackgroundLayerProps) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (background.type !== 'image' || !background.value) {
      setImageObj(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = background.value;
    img.onload = () => setImageObj(img);
    img.onerror = () => setImageObj(null);
  }, [background.type, background.value]);

  const imageTransform = useMemo(() => {
    const zoom = Math.max(100, background.imageZoom ?? 100) / 100;
    const drawWidth = width * zoom;
    const drawHeight = height * zoom;
    const xPct = Math.max(0, Math.min(100, background.imagePositionX ?? 50)) / 100;
    const yPct = Math.max(0, Math.min(100, background.imagePositionY ?? 50)) / 100;

    return {
      x: (width - drawWidth) * xPct,
      y: (height - drawHeight) * yPct,
      width: drawWidth,
      height: drawHeight,
    };
  }, [background.imagePositionX, background.imagePositionY, background.imageZoom, width, height]);

  if (background.type === 'color') {
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={background.value}
        listening={false}
      />
    );
  }

  if (background.type === 'gradient') {
    const parsed = parseGradient(background.value);
    if (parsed) {
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: width, y: height }}
          fillLinearGradientColorStops={parsed.colors.flatMap((c, i) => [parsed.stops[i], c])}
          listening={false}
        />
      );
    }
    // Fallback: renderiza como cor sólida (primeira cor do gradiente)
    const fallbackColor = background.value.match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#667eea';
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={fallbackColor}
        listening={false}
      />
    );
  }

  if (background.type === 'image') {
    if (imageObj) {
      return (
        <Image
          x={imageTransform.x}
          y={imageTransform.y}
          width={imageTransform.width}
          height={imageTransform.height}
          image={imageObj}
          listening={false}
        />
      );
    }

    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#1a1a2e"
        listening={false}
      />
    );
  }

  return null;
}
