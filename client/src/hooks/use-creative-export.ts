/**
 * Hook para exportar slides como PNG e fazer upload para o Supabase Storage
 */

import { useState, useCallback } from 'react';
import type Konva from 'konva';
import type { Creative } from '@/lib/creative-editor-types';
import { useUpdateExportUrls } from './use-creatives';

interface ExportProgress {
  current: number;
  total: number;
  status: 'idle' | 'exporting' | 'uploading' | 'zipping' | 'done' | 'error';
}

function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function useCreativeExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    current: 0,
    total: 0,
    status: 'idle',
  });
  const updateExportUrls = useUpdateExportUrls();

  const exportSlides = useCallback(
    async (
      stageRefs: Array<React.RefObject<Konva.Stage | null>>,
      creative: Creative,
      tenantId: string
    ): Promise<{ urls: string[]; zipBlob?: Blob }> => {
      if (!stageRefs.length) {
        throw new Error('Nenhum slide para exportar');
      }

      setProgress({ current: 0, total: stageRefs.length, status: 'exporting' });
      const urls: string[] = [];
      const blobs: Blob[] = [];

      // 1. Exporta cada slide como PNG
      for (let i = 0; i < stageRefs.length; i++) {
        const stage = stageRefs[i].current;
        if (!stage) continue;

        const dataUrl = stage.toDataURL({
          pixelRatio: 2,
          mimeType: 'image/png',
        });

        const blob = dataURLtoBlob(dataUrl);
        blobs.push(blob);

        // Simula upload (em produção, usaria Supabase Storage)
        // const path = `${tenantId}/${creative.id}/slide-${i + 1}.png`;
        // const { data } = await supabase.storage.from('creatives').upload(path, blob, { upsert: true });
        // const { publicUrl } = supabase.storage.from('creatives').getPublicUrl(path).data;
        // urls.push(publicUrl);

        // Simulação: gera URL local temporária
        const localUrl = URL.createObjectURL(blob);
        urls.push(localUrl);

        setProgress({ current: i + 1, total: stageRefs.length, status: 'uploading' });
      }

      // 2. Atualiza URLs no banco
      setProgress({ current: stageRefs.length, total: stageRefs.length, status: 'uploading' });
      await updateExportUrls.mutateAsync({ id: creative.id, exportUrls: urls });

      // 3. Gera ZIP
      setProgress({ current: stageRefs.length, total: stageRefs.length, status: 'zipping' });
      let zipBlob: Blob | undefined;
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        blobs.forEach((blob, i) => {
          zip.file(`slide-${i + 1}.png`, blob);
        });
        zipBlob = await zip.generateAsync({ type: 'blob' });
      } catch {
        // JSZip não disponível, ignora ZIP
      }

      setProgress({ current: stageRefs.length, total: stageRefs.length, status: 'done' });
      return { urls, zipBlob };
    },
    [updateExportUrls]
  );

  const downloadZip = useCallback((zipBlob: Blob, filename = 'carrossel.zip') => {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadSingle = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    exportSlides,
    downloadZip,
    downloadSingle,
    progress,
  };
}
