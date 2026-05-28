import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Creative } from '@/lib/creative-editor-types';
import type { HtmlSlideConfig } from '@shared/types/html-slide-config';
import { configToHtml } from '@/lib/html-slide-renderer';
import { SlideThumbnailPanel } from './SlideThumbnailPanel';
import { SlideNavigationBar } from './SlideNavigationBar';
import { DownloadBar } from './DownloadBar';
import { HtmlSlideEditorPanel } from './HtmlSlideEditorPanel';

interface HtmlSlideEditorProps {
  creative: Creative;
  onSave?: (creative: Creative) => void | Promise<void>;
  onExport?: (creative: Creative) => Promise<string[]>;
  readOnly?: boolean;
  onBackToApp?: () => void;
}

const DISPLAY_SCALE = 0.55;

export function HtmlSlideEditor({ creative, onSave, onExport, readOnly = false, onBackToApp }: HtmlSlideEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [configs, setConfigs] = useState<HtmlSlideConfig[]>(creative.htmlSlideConfigs || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const normalizedConfigs = (creative.htmlSlideConfigs || []).map((config, index) => ({
      ...config,
      canvasWidth: config.canvasWidth || creative.canvasWidth || 1080,
      canvasHeight: config.canvasHeight || creative.canvasHeight || 1080,
      templateVariant: config.templateVariant || (index % 4 === 0 ? 'spotlight' : index % 4 === 1 ? 'glass-card' : index % 4 === 2 ? 'editorial-band' : 'minimal'),
    }));

    setConfigs((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(normalizedConfigs);
      return prevJson === nextJson ? prev : normalizedConfigs;
    });

    setCurrentIndex((prev) => {
      if (normalizedConfigs.length === 0) return 0;
      return Math.max(0, Math.min(prev, normalizedConfigs.length - 1));
    });
  }, [creative.id, creative.htmlSlideConfigs]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const htmlSlides = useMemo(() => configs.map((config) => configToHtml(config)), [configs]);
  const currentHtml = htmlSlides[currentIndex] || '';

  const queueSave = useCallback((nextConfigs: HtmlSlideConfig[]) => {
    if (readOnly || !onSave) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const nextHtmlSlides = nextConfigs.map((config) => configToHtml(config));
        await onSave({ ...creative, htmlSlideConfigs: nextConfigs, htmlSlides: nextHtmlSlides });
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [creative, onSave, readOnly]);

  const handleConfigChange = useCallback((nextConfig: HtmlSlideConfig) => {
    setConfigs((prev) => {
      const next = prev.map((config, index) => (index === currentIndex ? nextConfig : config));
      queueSave(next);
      return next;
    });
  }, [currentIndex, queueSave]);

  const handleSaveNow = useCallback(async () => {
    if (!onSave || readOnly) return;
    setIsSaving(true);
    try {
      await onSave({ ...creative, htmlSlideConfigs: configs, htmlSlides });
    } finally {
      setIsSaving(false);
    }
  }, [configs, creative, htmlSlides, onSave, readOnly]);

  const handleDownloadCurrentSlide = useCallback(async () => {
    const config = configs[currentIndex];
    if (!config) return;

    try {
      const resp = await fetch('/api/export-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId: creative.id,
          slideIndex: currentIndex,
          htmlSlideConfig: config,
        }),
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || !payload?.pngUrl) {
        throw new Error(payload?.error || 'Falha ao exportar slide');
      }

      const anchor = document.createElement('a');
      anchor.href = String(payload.pngUrl);
      anchor.download = `creative-${creative.id}-slide-${currentIndex + 1}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      console.error('Slide export failed:', error);
      const message = error instanceof Error ? error.message : 'Falha ao exportar slide';
      window.alert(message);
    }
  }, [configs, creative.id, currentIndex]);

  const handleExport = useCallback(async () => {
    if (!onExport) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: configs.length });
    try {
      await onExport({ ...creative, htmlSlideConfigs: configs, htmlSlides });
      setExportProgress({ current: configs.length, total: configs.length });
      setTimeout(() => setIsExporting(false), 800);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  }, [configs, creative, htmlSlides, onExport]);

  const canvasWidth = creative.canvasWidth || 1080;
  const canvasHeight = creative.canvasHeight || 1080;

  const clampedIndex = Math.max(0, Math.min(currentIndex, configs.length - 1));
  const currentConfig = configs[clampedIndex];

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-36 bg-card/70 border-r border-border/60 flex-shrink-0">
        <SlideThumbnailPanel
          slides={creative.slides || []}
          htmlSlides={htmlSlides}
          currentIndex={clampedIndex}
          onSelectSlide={(index) => setCurrentIndex(index)}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <SlideNavigationBar
          creativeId={creative.id}
          status={creative.status}
          currentIndex={clampedIndex}
          totalSlides={configs.length}
          onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setCurrentIndex((prev) => Math.min(configs.length - 1, prev + 1))}
          onBackToApp={onBackToApp}
        />

        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <div className="bg-card/70 rounded-xl shadow-lg p-2 border border-border/60">
            <div
              className="relative overflow-hidden rounded-lg border border-border"
              style={{ width: Math.round(canvasWidth * DISPLAY_SCALE), height: Math.round(canvasHeight * DISPLAY_SCALE) }}
            >
              <iframe
                key={`html-slide-${clampedIndex}`}
                srcDoc={currentHtml}
                sandbox=""
                title={`Slide ${clampedIndex + 1}`}
                scrolling="no"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  border: 'none',
                  transform: `scale(${DISPLAY_SCALE})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>
        </div>

        <DownloadBar
          readOnly={readOnly}
          isSaving={isSaving}
          isExporting={isExporting}
          exportProgress={exportProgress}
          currentSlideNumber={clampedIndex + 1}
          onSave={handleSaveNow}
          onDownloadCurrentSlide={handleDownloadCurrentSlide}
          onExport={handleExport}
        />
      </div>

      {!readOnly && currentConfig && (
        <div className="w-72 bg-card/70 border-l border-border/60 flex-shrink-0 overflow-y-auto">
          <HtmlSlideEditorPanel
            config={currentConfig}
            onConfigChange={handleConfigChange}
          />
        </div>
      )}
    </div>
  );
}
