import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface HtmlSlidePreviewProps {
  slides: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  containerWidth?: number;
}

const SLIDE_SIZE = 1080;

export function HtmlSlidePreview({
  slides,
  currentIndex,
  onIndexChange,
  containerWidth = 540,
}: HtmlSlidePreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scale = containerWidth / SLIDE_SIZE;

  const handleLoad = useCallback(() => setLoaded(true), []);

  const currentHtml = slides[currentIndex] ?? '';

  if (!currentHtml) {
    return (
      <div
        className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm"
        style={{ width: containerWidth, height: containerWidth }}
      >
        Preview indisponível
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Wrapper com overflow hidden para clip do iframe escalado */}
      <div
        className="relative overflow-hidden rounded-lg border border-border shadow-sm"
        style={{ width: containerWidth, height: containerWidth }}
      >
        {!loaded && (
          <Skeleton className="absolute inset-0 z-10 rounded-lg" />
        )}
        <iframe
          ref={iframeRef}
          key={`slide-${currentIndex}`}
          srcDoc={currentHtml}
          sandbox=""
          title={`Slide ${currentIndex + 1}`}
          scrolling="no"
          onLoad={handleLoad}
          style={{
            width: SLIDE_SIZE,
            height: SLIDE_SIZE,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>

      {/* Navegação */}
      {slides.length > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {currentIndex + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onIndexChange(Math.min(slides.length - 1, currentIndex + 1))}
            disabled={currentIndex === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
