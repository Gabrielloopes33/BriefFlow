/**
 * Controles de navegação entre slides
 * Prev/Next + indicador de progresso
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideControlsProps {
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
}

export function SlideControls({ currentIndex, totalSlides, onPrev, onNext }: SlideControlsProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalSlides - 1;

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={`p-2 rounded-lg transition-colors ${
          canGoPrev
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        }`}
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSlides }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === currentIndex ? 'bg-blue-500 w-4' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <span className="text-sm text-gray-500 font-medium min-w-[3rem] text-center">
        {currentIndex + 1} / {totalSlides}
      </span>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`p-2 rounded-lg transition-colors ${
          canGoNext
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        }`}
        aria-label="Próximo slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
