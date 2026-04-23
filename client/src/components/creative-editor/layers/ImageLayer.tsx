/**
 * Camada de imagem no Konva
 * Suporta seleção, resize e object-fit
 */

import { useRef, useEffect, useState } from 'react';
import { Image, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { ImageLayer as ImageLayerType } from '@/lib/creative-editor-types';

interface ImageLayerProps {
  layer: ImageLayerType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ImageLayerType>) => void;
}

export function ImageLayer({ layer, isSelected, onSelect, onChange }: ImageLayerProps) {
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Carrega a imagem
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = layer.src;
    img.onload = () => setImageObj(img);
    img.onerror = () => {
      // Fallback: imagem de placeholder
      const fallback = new window.Image();
      fallback.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
      setImageObj(fallback);
    };
  }, [layer.src]);

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!imageObj) return null;

  return (
    <>
      <Image
        ref={imageRef}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        image={imageObj}
        draggable={layer.editable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = imageRef.current;
          if (!node) return;
          onChange({
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && layer.editable && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
