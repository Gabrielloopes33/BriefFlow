import { Download, Save, ImageIcon, Loader2 } from 'lucide-react';

interface DownloadBarProps {
  readOnly?: boolean;
  isSaving: boolean;
  isExporting: boolean;
  exportProgress: {
    current: number;
    total: number;
  };
  currentSlideNumber: number;
  onSave: () => void;
  onDownloadCurrentSlide: () => void;
  onExport: () => void;
}

export function DownloadBar({
  readOnly = false,
  isSaving,
  isExporting,
  exportProgress,
  currentSlideNumber,
  onSave,
  onDownloadCurrentSlide,
  onExport,
}: DownloadBarProps) {
  return (
    <div className="h-14 bg-card/70 border-t border-border/60 flex items-center justify-end px-4 gap-2 flex-shrink-0">
      {!readOnly && (
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary/50 border border-border/60 rounded-lg hover:bg-secondary disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      )}

      <button
        onClick={onDownloadCurrentSlide}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary/50 border border-border/60 rounded-lg hover:bg-secondary transition-colors"
      >
        <ImageIcon className="w-4 h-4" />
        Baixar Slide {currentSlideNumber}
      </button>

      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-[0_0_15px_-5px_rgba(250,93,25,0.4)]"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isExporting
          ? `Exportando ${exportProgress.current}/${exportProgress.total}`
          : 'Exportar PNG'}
      </button>
    </div>
  );
}
