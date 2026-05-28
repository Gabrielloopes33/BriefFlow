import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Creative } from '@/lib/creative-editor-types';

interface SlideNavigationBarProps {
  creativeId: string;
  status: Creative['status'];
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onBackToApp?: () => void;
}

function getStatusLabel(status: Creative['status']) {
  if (status === 'draft') return 'Rascunho';
  if (status === 'ready') return 'Pronto';
  return 'Publicado';
}

function getStatusClassName(status: Creative['status']) {
  if (status === 'ready') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (status === 'published') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
  return 'bg-secondary text-muted-foreground border border-border/50';
}

export function SlideNavigationBar({
  creativeId,
  status,
  currentIndex,
  totalSlides,
  onPrev,
  onNext,
  onBackToApp,
}: SlideNavigationBarProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalSlides - 1;

  return (
    <div className="h-14 bg-card/70 border-b border-border/60 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToApp}
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/70 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao app
        </button>
        <h1 className="text-sm font-semibold text-foreground truncate max-w-xs">
          {creativeId.slice(0, 8)}...
        </h1>
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusClassName(status)}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className={`p-2 rounded-lg transition-colors ${
            canGoPrev
              ? 'bg-secondary hover:bg-secondary/80 text-foreground'
              : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
          }`}
          aria-label="Slide anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-semibold text-foreground min-w-[7rem] text-center">
          Slide {currentIndex + 1} de {totalSlides}
        </span>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={`p-2 rounded-lg transition-colors ${
            canGoNext
              ? 'bg-secondary hover:bg-secondary/80 text-foreground'
              : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
          }`}
          aria-label="Proximo slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
