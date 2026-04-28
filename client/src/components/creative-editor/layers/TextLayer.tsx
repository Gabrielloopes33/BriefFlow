/**
 * Camada de texto editável no Konva
 * Suporta seleção, edição inline via textarea sobreposta
 */

import { useRef, useEffect, useState } from 'react';
import { Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { TextLayer as TextLayerType } from '@/lib/creative-editor-types';
import { FONT_NAME_MAP } from '../FontLoader';

interface TextLayerProps {
  layer: TextLayerType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TextLayerType>) => void;
  onEditStart: (layer: TextLayerType, textNode: Konva.Text) => void;
}

export function TextLayer({ layer, isSelected, onSelect, onChange, onEditStart }: TextLayerProps) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDblClick = () => {
    if (!layer.editable || !textRef.current) return;
    onEditStart(layer, textRef.current);
  };

  return (
    <>
      <Text
        ref={textRef}
        x={layer.x}
        y={layer.y}
        width={layer.width}
          wrap="word"
        text={layer.text}
        fontSize={layer.fontSize}
        fontFamily={FONT_NAME_MAP[layer.fontFamily ?? ''] || layer.fontFamily || 'Inter, sans-serif'}
        fontStyle={layer.fontWeight === 'bold' ? 'bold' : 'normal'}
        fill={layer.color}
        align={layer.align}
        lineHeight={layer.lineHeight || 1.2}
        draggable={layer.editable}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = textRef.current;
          if (!node) return;
          onChange({
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && layer.editable && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Limita tamanho mínimo
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
