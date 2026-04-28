/**
 * Canvas de um slide individual no Konva
 * Renderiza background + layers (texto, imagem) com seleção e transformação
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Image, Text } from 'react-konva';
import type Konva from 'konva';
import type { Creative, Slide, Layer as LayerType, TextLayer as TextLayerType } from '@/lib/creative-editor-types';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { TextLayer } from './layers/TextLayer';
import { ImageLayer } from './layers/ImageLayer';
import { FONT_NAME_MAP } from './FontLoader';

interface SlideCanvasProps {
  slide: Slide;
  layoutMode?: NonNullable<Creative['layoutMode']>;
  profileConfig?: Creative['profileConfig'] | null;
  canvasWidth: number;
  canvasHeight: number;
  scale?: number;
  onSlideChange?: (updatedSlide: Slide) => void;
  onLayerSelect?: (layerId: string | null) => void;
  onExportReady?: (exportFn: (() => string | null) | null) => void;
  readOnly?: boolean;
}

interface InlineEditState {
  layer: TextLayerType;
  textNode: Konva.Text;
  textarea: HTMLTextAreaElement | null;
}

function getPrimaryTitleLayer(slide: Slide): TextLayerType | null {
  const textLayers = slide.layers
    .filter((layer): layer is TextLayerType => layer.type === 'text')
    .sort((a, b) => a.y - b.y);
  return textLayers[0] ?? null;
}

export function SlideCanvas({
  slide,
  layoutMode = 'minimalist',
  profileConfig,
  canvasWidth,
  canvasHeight,
  scale = 1,
  onSlideChange,
  onLayerSelect,
  onExportReady,
  readOnly = false,
}: SlideCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [gridImage, setGridImage] = useState<HTMLImageElement | null>(null);
  const [profilePhotoImage, setProfilePhotoImage] = useState<HTMLImageElement | null>(null);
  const [badgePhotoImage, setBadgePhotoImage] = useState<HTMLImageElement | null>(null);

  const overlay = slide.overlay;
  const overlayOpacity = Math.max(0, Math.min(100, overlay?.opacity ?? 0)) / 100;
  const slideTheme = slide.theme ?? 'dark';
  const themeTintColor = slideTheme === 'light' ? '#ffffff' : '#000000';
  const themeTintOpacity = slideTheme === 'light' ? 0.06 : 0.14;

  const badge = slide.profileBadge;
  const badgeStyle = badge?.style ?? 'solid';
  const badgeBgColor = badgeStyle === 'glass' ? 'rgba(17,24,39,0.45)' : badgeStyle === 'minimal' ? 'rgba(255,255,255,0.9)' : '#111827';
  const badgeTextColor = badgeStyle === 'minimal' ? '#111827' : '#ffffff';

  const cta = slide.ctaButton;
  const ctaStyle = cta?.style ?? 'filled';
  const ctaBgColor = ctaStyle === 'outline' ? 'transparent' : ctaStyle === 'glass' ? 'rgba(17,24,39,0.4)' : (cta?.backgroundColor ?? '#111827');
  const ctaStrokeColor = ctaStyle === 'outline' ? (cta?.backgroundColor ?? '#111827') : 'transparent';
  const ctaTextColor = ctaStyle === 'outline' ? (cta?.backgroundColor ?? '#111827') : (cta?.textColor ?? '#ffffff');

  const gridImageUrl = slide.imageGrid?.imageUrl || slide.background.value;
  const gridCornerRadius = Math.max(0, Math.min(40, slide.imageGrid?.borderRadius ?? 16));
  const titleLayer = getPrimaryTitleLayer(slide);
  const accentWordsSet = new Set(
    (slide.typography?.accentWords ?? [])
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean)
  );
  const accentColor = slide.typography?.accentColor ?? '#3B82F6';
  const isProfileMode = layoutMode === 'profile';
  const thumbnailCount = profileConfig?.thumbnailCount === 'alternating'
    ? (slide.index % 2 === 0 ? 1 : 2)
    : (profileConfig?.thumbnailCount ?? 1);
  const profileName = profileConfig?.name || slide.profileBadge?.name || 'Seu Nome';
  const profileHandle = profileConfig?.handle || slide.profileBadge?.handle || '@seuhandle';
  const profileStyle = profileConfig?.badgeStyle ?? 'solid';
  const profilePanelBg = profileStyle === 'glass'
    ? (slideTheme === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(17,24,39,0.35)')
    : profileStyle === 'minimal'
      ? 'rgba(255,255,255,0.82)'
      : (slideTheme === 'light' ? 'rgba(243,244,246,0.95)' : 'rgba(17,24,39,0.56)');
  const ctaX = isProfileMode ? 380 : canvasWidth / 2 - 180;
  const ctaY = isProfileMode ? canvasHeight - 118 : canvasHeight - 140;
  const ctaWidth = isProfileMode ? 580 : 360;
  const ctaTextX = isProfileMode ? 400 : canvasWidth / 2 - 160;
  const ctaTextWidth = isProfileMode ? 540 : 320;

  useEffect(() => {
    const isImageUrl =
      typeof gridImageUrl === 'string' &&
      (gridImageUrl.startsWith('http') || gridImageUrl.startsWith('data:image'));

    if ((!slide.imageGrid?.visible && !isProfileMode) || !isImageUrl) {
      setGridImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = gridImageUrl;
    img.onload = () => setGridImage(img);
    img.onerror = () => setGridImage(null);
  }, [slide.imageGrid?.visible, gridImageUrl, isProfileMode]);

  useEffect(() => {
    const photoUrl = profileConfig?.photoUrl;
    const isImageUrl =
      typeof photoUrl === 'string' &&
      photoUrl.length > 0 &&
      (photoUrl.startsWith('http') || photoUrl.startsWith('data:image'));

    if (!isProfileMode || !isImageUrl) {
      setProfilePhotoImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = photoUrl;
    img.onload = () => setProfilePhotoImage(img);
    img.onerror = () => setProfilePhotoImage(null);
  }, [isProfileMode, profileConfig?.photoUrl]);

  useEffect(() => {
    const photoUrl = badge?.imageUrl;
    const isImageUrl =
      typeof photoUrl === 'string' &&
      photoUrl.length > 0 &&
      (photoUrl.startsWith('http') || photoUrl.startsWith('data:image'));

    if (!badge?.visible || isProfileMode || !isImageUrl) {
      setBadgePhotoImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = photoUrl;
    img.onload = () => setBadgePhotoImage(img);
    img.onerror = () => setBadgePhotoImage(null);
  }, [badge?.visible, badge?.imageUrl, isProfileMode]);

  const handleSelectLayer = useCallback((layerId: string) => {
    if (readOnly) return;
    setSelectedLayerId((prev) => {
      const next = prev === layerId ? null : layerId;
      onLayerSelect?.(next);
      return next;
    });
  }, [readOnly, onLayerSelect]);

  const handleLayerChange = useCallback(
    (layerId: string, updates: Partial<LayerType>) => {
      if (!onSlideChange) return;
      const updatedLayers = slide.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } as LayerType : l
      );
      onSlideChange({ ...slide, layers: updatedLayers });
    },
    [slide, onSlideChange]
  );

  const handleEditStart = useCallback((layer: TextLayerType, textNode: Konva.Text) => {
    if (readOnly) return;

    // Remove edição anterior
    if (inlineEdit?.textarea) {
      document.body.removeChild(inlineEdit.textarea);
    }

    const stage = textNode.getStage();
    if (!stage) return;

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const areaPosition = {
      x: stageBox.left + textPosition.x * scale,
      y: stageBox.top + textPosition.y * scale,
    };

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = layer.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${layer.width * scale}px`;
    textarea.style.height = `${layer.height * scale}px`;
    textarea.style.fontSize = `${layer.fontSize * scale}px`;
    textarea.style.fontFamily = FONT_NAME_MAP[layer.fontFamily ?? ''] || layer.fontFamily || 'Inter, sans-serif';
    textarea.style.fontWeight = layer.fontWeight;
    textarea.style.color = layer.color;
    textarea.style.background = 'transparent';
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.textAlign = layer.align;
    textarea.style.lineHeight = String(layer.lineHeight || 1.2);
    textarea.style.padding = '0';
    textarea.style.margin = '0';
    textarea.style.zIndex = '9999';

    textarea.focus();

    const handleBlur = () => {
      handleLayerChange(layer.id, { text: textarea.value });
      document.body.removeChild(textarea);
      setInlineEdit(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
      if (e.key === 'Escape') {
        textarea.value = layer.text;
        textarea.blur();
      }
    };

    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('keydown', handleKeyDown);

    setInlineEdit({ layer, textNode, textarea });
  }, [readOnly, scale, handleLayerChange, inlineEdit]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<Event>) => {
    // Clica no stage vazio = desseleciona
    if (e.target === e.target.getStage()) {
      if (inlineEdit?.textarea) {
        inlineEdit.textarea.blur();
      }
      setSelectedLayerId(null);
      onLayerSelect?.(null);
    }
  }, [inlineEdit, onLayerSelect]);

  useEffect(() => {
    if (!onExportReady) return;

    onExportReady(() => {
      const stage = stageRef.current;
      if (!stage) return null;
      const safeScale = scale > 0 ? scale : 1;
      return stage.toDataURL({ pixelRatio: 1 / safeScale });
    });

    return () => onExportReady(null);
  }, [onExportReady, scale, slide.id]);

  const renderAccentWordOverlay = () => {
    if (!titleLayer || accentWordsSet.size === 0) return null;

    const measureContext = document.createElement('canvas').getContext('2d');
    if (!measureContext) return null;

    const fontFamily = FONT_NAME_MAP[titleLayer.fontFamily ?? ''] || titleLayer.fontFamily || 'Inter';
    const fontWeight = titleLayer.fontWeight === 'bold' ? '700' : '400';
    measureContext.font = `${fontWeight} ${titleLayer.fontSize}px ${fontFamily}`;

    const lines: Array<Array<{ text: string; width: number; accent: boolean }>> = [];
    const maxWidth = Math.max(40, titleLayer.width);
    const sourceLines = (titleLayer.text || '').split('\n');

    sourceLines.forEach((rawLine) => {
      if (rawLine.length === 0) {
        lines.push([]);
        return;
      }

      const parts = rawLine.split(/(\s+)/).filter((part) => part.length > 0);
      let currentLine: Array<{ text: string; width: number; accent: boolean }> = [];
      let currentWidth = 0;

      parts.forEach((part) => {
        const width = measureContext.measureText(part).width;
        const isSpace = /^\s+$/.test(part);
        const normalized = part.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
        const accent = !isSpace && accentWordsSet.has(normalized);

        if (!isSpace && currentLine.length > 0 && currentWidth + width > maxWidth) {
          lines.push(currentLine);
          currentLine = [];
          currentWidth = 0;
        }

        currentLine.push({ text: part, width, accent });
        currentWidth += width;
      });

      lines.push(currentLine);
    });

    const lineHeight = titleLayer.fontSize * (titleLayer.lineHeight || 1.2);

    return lines.flatMap((line, lineIndex) => {
      const lineWidth = line.reduce((sum, token) => sum + token.width, 0);
      const alignOffset =
        titleLayer.align === 'center'
          ? (maxWidth - lineWidth) / 2
          : titleLayer.align === 'right'
            ? maxWidth - lineWidth
            : 0;

      let cursorX = titleLayer.x + Math.max(0, alignOffset);
      const y = titleLayer.y + lineIndex * lineHeight;

      return line.map((token, tokenIndex) => {
        const node = token.accent ? (
          <Text
            key={`accent-${lineIndex}-${tokenIndex}`}
            x={cursorX}
            y={y}
            text={token.text}
            fontSize={titleLayer.fontSize}
            fontStyle={titleLayer.fontWeight === 'bold' ? 'bold' : 'normal'}
            fontFamily={fontFamily}
            fill={accentColor}
            listening={false}
          />
        ) : null;
        cursorX += token.width;
        return node;
      });
    });
  };

  return (
    <div className="relative inline-block">
      <Stage
        ref={stageRef}
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          <BackgroundLayer
            background={slide.background}
            width={canvasWidth}
            height={canvasHeight}
          />
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={themeTintColor}
            opacity={themeTintOpacity}
            listening={false}
          />
          {overlay && overlay.style !== 'none' ? (
            overlay.style === 'diag-inf-dir' || overlay.style === 'diag-sup-esq' ? (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fillLinearGradientStartPoint={overlay.style === 'diag-inf-dir' ? { x: 0, y: 0 } : { x: canvasWidth, y: 0 }}
                fillLinearGradientEndPoint={overlay.style === 'diag-inf-dir' ? { x: canvasWidth, y: canvasHeight } : { x: 0, y: canvasHeight }}
                fillLinearGradientColorStops={[0, `${overlay.color}00`, 1, overlay.color]}
                opacity={overlayOpacity}
                listening={false}
              />
            ) : overlay.style === 'topo-forte' ? (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: canvasHeight }}
                fillLinearGradientColorStops={[0, overlay.color, 0.65, `${overlay.color}80`, 1, `${overlay.color}00`]}
                opacity={overlayOpacity}
                listening={false}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill={overlay.color}
                opacity={overlay.style === 'base-forte' ? overlayOpacity : overlayOpacity * 0.78}
                listening={false}
              />
            )
          ) : null}

          {slide.imageGrid?.visible && gridImage ? (
            <>
              <Image
                x={slide.imageGrid.placement?.x ?? (canvasWidth - 380)}
                y={slide.imageGrid.placement?.y ?? (canvasHeight - 480)}
                width={slide.imageGrid.placement?.width ?? 300}
                height={slide.imageGrid.placement?.height ?? 360}
                image={gridImage}
                cornerRadius={Math.max(0, Math.min(40, slide.imageGrid.placement?.borderRadius ?? gridCornerRadius))}
                listening={false}
              />
              <Rect
                x={slide.imageGrid.placement?.x ?? (canvasWidth - 380)}
                y={slide.imageGrid.placement?.y ?? (canvasHeight - 480)}
                width={slide.imageGrid.placement?.width ?? 300}
                height={slide.imageGrid.placement?.height ?? 360}
                stroke="#ffffff"
                strokeWidth={4}
                cornerRadius={Math.max(0, Math.min(40, slide.imageGrid.placement?.borderRadius ?? gridCornerRadius))}
                listening={false}
              />
            </>
          ) : null}

          {isProfileMode ? (
            <>
              <Rect
                x={36}
                y={96}
                width={300}
                height={880}
                fill={profilePanelBg}
                cornerRadius={32}
                listening={false}
              />
              {profilePhotoImage ? (
                <Image
                  x={66}
                  y={130}
                  width={68}
                  height={68}
                  image={profilePhotoImage}
                  cornerRadius={999}
                  listening={false}
                />
              ) : (
                <Rect
                  x={66}
                  y={130}
                  width={68}
                  height={68}
                  fill="#ffffff"
                  cornerRadius={999}
                  listening={false}
                />
              )}
              <Rect
                x={66}
                y={130}
                width={68}
                height={68}
                stroke={slideTheme === 'light' ? '#d1d5db' : '#ffffff'}
                strokeWidth={2}
                cornerRadius={999}
                listening={false}
              />
              <Text
                x={148}
                y={140}
                text={profileName}
                fontSize={22}
                fontStyle="bold"
                fill={slideTheme === 'light' ? '#111827' : '#ffffff'}
                listening={false}
              />
              <Text
                x={148}
                y={170}
                text={profileHandle}
                fontSize={16}
                fill={slideTheme === 'light' ? '#374151' : '#d1d5db'}
                listening={false}
              />

              {gridImage ? (
                <>
                  <Image
                    x={66}
                    y={240}
                    width={240}
                    height={thumbnailCount === 2 ? 260 : 560}
                    image={gridImage}
                    cornerRadius={Math.max(0, Math.min(40, profileConfig?.borderRadius ?? 18))}
                    listening={false}
                  />
                  <Rect
                    x={66}
                    y={240}
                    width={240}
                    height={thumbnailCount === 2 ? 260 : 560}
                    stroke="#ffffff"
                    strokeWidth={3}
                    cornerRadius={Math.max(0, Math.min(40, profileConfig?.borderRadius ?? 18))}
                    listening={false}
                  />

                  {thumbnailCount === 2 ? (
                    <>
                      <Image
                        x={66}
                        y={528}
                        width={240}
                        height={260}
                        image={gridImage}
                        cornerRadius={Math.max(0, Math.min(40, profileConfig?.borderRadius ?? 18))}
                        listening={false}
                      />
                      <Rect
                        x={66}
                        y={528}
                        width={240}
                        height={260}
                        stroke="#ffffff"
                        strokeWidth={3}
                        cornerRadius={Math.max(0, Math.min(40, profileConfig?.borderRadius ?? 18))}
                        listening={false}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {badge?.visible && !isProfileMode ? (
            <>
              <Rect
                x={40}
                y={40}
                width={Math.max(220, (badge.name?.length ?? 0) * 8 + 120)}
                height={72}
                fill={badgeBgColor}
                cornerRadius={24}
                listening={false}
              />
              {badgePhotoImage ? (
                <Image
                  x={52}
                  y={52}
                  width={Math.max(36, Math.min(80, badge.size * 0.7))}
                  height={Math.max(36, Math.min(80, badge.size * 0.7))}
                  image={badgePhotoImage}
                  cornerRadius={999}
                  listening={false}
                />
              ) : (
                <Rect
                  x={52}
                  y={52}
                  width={Math.max(36, Math.min(80, badge.size * 0.7))}
                  height={Math.max(36, Math.min(80, badge.size * 0.7))}
                  fill="#ffffff"
                  cornerRadius={999}
                  listening={false}
                />
              )}
              <Text
                x={108}
                y={58}
                text={badge.name || 'Seu Nome'}
                fontSize={20}
                fontStyle="bold"
                fill={badgeTextColor}
                listening={false}
              />
              <Text
                x={108}
                y={84}
                text={badge.handle || '@seuhandle'}
                fontSize={16}
                fill={badgeTextColor}
                opacity={0.85}
                listening={false}
              />
            </>
          ) : null}

          {cta?.visible ? (
            <>
              <Rect
                x={ctaX}
                y={ctaY}
                width={ctaWidth}
                height={64}
                fill={ctaBgColor}
                stroke={ctaStrokeColor}
                strokeWidth={ctaStyle === 'outline' ? 2 : 0}
                cornerRadius={Math.max(0, Math.min(50, cta.borderRadius))}
                listening={false}
              />
              <Text
                x={ctaTextX}
                y={ctaY + 22}
                width={ctaTextWidth}
                text={cta.text || 'Saiba mais'}
                align="center"
                fontSize={Math.max(14, Math.min(32, cta.size))}
                fontStyle="bold"
                fill={ctaTextColor}
                listening={false}
              />
            </>
          ) : null}
        </Layer>
        <Layer>
          {slide.layers.map((layer) => {
            const isSelected = selectedLayerId === layer.id && !readOnly;

            if (layer.type === 'text') {
              return (
                <TextLayer
                  key={layer.id}
                  layer={layer}
                  isSelected={isSelected}
                  onSelect={() => handleSelectLayer(layer.id)}
                  onChange={(updates) => handleLayerChange(layer.id, updates)}
                  onEditStart={handleEditStart}
                />
              );
            }

            if (layer.type === 'image') {
              return (
                <ImageLayer
                  key={layer.id}
                  layer={layer}
                  isSelected={isSelected}
                  onSelect={() => handleSelectLayer(layer.id)}
                  onChange={(updates) => handleLayerChange(layer.id, updates)}
                />
              );
            }

            return null;
          })}
        </Layer>
        <Layer>{renderAccentWordOverlay()}</Layer>
      </Stage>
    </div>
  );
}
