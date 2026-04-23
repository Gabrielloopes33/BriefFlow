/**
 * Canvas de um slide individual no Konva
 * Renderiza background + layers (texto, imagem) com seleção e transformação
 */

import { useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import type { Slide, Layer as LayerType, TextLayer as TextLayerType } from '@/lib/creative-editor-types';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { TextLayer } from './layers/TextLayer';
import { ImageLayer } from './layers/ImageLayer';

interface SlideCanvasProps {
  slide: Slide;
  canvasWidth: number;
  canvasHeight: number;
  scale?: number;
  onSlideChange?: (updatedSlide: Slide) => void;
  readOnly?: boolean;
}

interface InlineEditState {
  layer: TextLayerType;
  textNode: Konva.Text;
  textarea: HTMLTextAreaElement | null;
}

export function SlideCanvas({
  slide,
  canvasWidth,
  canvasHeight,
  scale = 1,
  onSlideChange,
  readOnly = false,
}: SlideCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);

  const handleSelectLayer = useCallback((layerId: string) => {
    if (readOnly) return;
    setSelectedLayerId((prev) => (prev === layerId ? null : layerId));
  }, [readOnly]);

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
    textarea.style.fontFamily = layer.fontFamily || 'Inter, sans-serif';
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
    }
  }, [inlineEdit]);

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
      </Stage>
    </div>
  );
}
