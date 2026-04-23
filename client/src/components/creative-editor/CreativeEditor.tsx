/**
 * CreativeEditor — Container principal do editor visual Konva
 * Composição: SlideCanvas + SlideThumbnailPanel + SlideControls + TextEditPanel
 */

import { useState, useCallback, useRef } from 'react';
import { Download, Save, ImageIcon, Loader2 } from 'lucide-react';
import type { Slide, Creative, TextLayer, Layer } from '@/lib/creative-editor-types';
import { SlideCanvas } from './SlideCanvas';
import { SlideThumbnailPanel } from './SlideThumbnailPanel';
import { SlideControls } from './SlideControls';
import { TextEditPanel } from './TextEditPanel';

interface CreativeEditorProps {
  creative: Creative;
  onSave?: (creative: Creative) => void;
  onExport?: (creative: Creative) => Promise<string[]>;
  readOnly?: boolean;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const DISPLAY_SCALE = 0.55; // Escala para caber na tela

export function CreativeEditor({ creative, onSave, onExport, readOnly = false }: CreativeEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(creative.slides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const currentSlide = slides[currentIndex];

  const selectedLayer = selectedLayerId
    ? (currentSlide?.layers.find((l) => l.id === selectedLayerId) as TextLayer | undefined)
    : null;

  const handleSlideChange = useCallback(
    (updatedSlide: Slide) => {
      setSlides((prev) =>
        prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
      );
    },
    []
  );

  const handleLayerUpdate = useCallback(
    (updates: Partial<TextLayer>) => {
      if (!selectedLayerId || !currentSlide) return;
      const updatedLayers = currentSlide.layers.map((l) =>
        l.id === selectedLayerId ? { ...l, ...updates } as Layer : l
      );
      handleSlideChange({ ...currentSlide, layers: updatedLayers });
    },
    [selectedLayerId, currentSlide, handleSlideChange]
  );

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setSelectedLayerId(null);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1));
    setSelectedLayerId(null);
  }, [slides.length]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({ ...creative, slides });
    } finally {
      setIsSaving(false);
    }
  }, [creative, slides, onSave]);

  const handleExport = useCallback(async () => {
    if (!onExport) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: slides.length });
    try {
      const urls = await onExport({ ...creative, slides });
      setExportProgress({ current: slides.length, total: slides.length });
      // Pequeno delay para mostrar conclusão
      setTimeout(() => setIsExporting(false), 800);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  }, [creative, slides, onExport]);

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Nenhum slide para exibir
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Painel lateral de thumbnails */}
      <div className="w-36 bg-white border-r border-gray-200 flex-shrink-0">
        <SlideThumbnailPanel
          slides={slides}
          currentIndex={currentIndex}
          onSelectSlide={(index) => {
            setCurrentIndex(index);
            setSelectedLayerId(null);
          }}
        />
      </div>

      {/* Área principal do canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-800 truncate max-w-xs">
              {creative.id.slice(0, 8)}...
            </h1>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                creative.status === 'ready'
                  ? 'bg-green-100 text-green-700'
                  : creative.status === 'published'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {creative.status === 'draft' ? 'Rascunho' : creative.status === 'ready' ? 'Pronto' : 'Publicado'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-2">
            <SlideCanvas
              slide={currentSlide}
              canvasWidth={CANVAS_WIDTH}
              canvasHeight={CANVAS_HEIGHT}
              scale={DISPLAY_SCALE}
              onSlideChange={handleSlideChange}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Controles de navegação */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          <SlideControls
            currentIndex={currentIndex}
            totalSlides={slides.length}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      </div>

      {/* Painel lateral de propriedades */}
      {!readOnly && (
        <div className="w-64 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
          <TextEditPanel
            layer={selectedLayer || null}
            onChange={handleLayerUpdate}
          />
        </div>
      )}
    </div>
  );
}
