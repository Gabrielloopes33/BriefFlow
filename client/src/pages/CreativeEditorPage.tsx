/**
 * Página do Editor de Criativos
 * Carrega um criativo por ID e renderiza o CreativeEditor
 */

import { useLocation, useParams } from 'wouter';
import { useCreative, useUpdateCreative, useUpdateExportUrls } from '@/hooks/use-creatives';
import { CreativeEditor } from '@/components/creative-editor/CreativeEditor';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

export function CreativeEditorPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { data: creative, isLoading, error } = useCreative(id || '');
  const updateCreative = useUpdateCreative();
  const updateExportUrls = useUpdateExportUrls();
  const { toast } = useToast();

  const handleSave = async (updated: Parameters<typeof updateCreative.mutateAsync>[0]['data']) => {
    if (!id) return;
    try {
      await updateCreative.mutateAsync({ id, data: updated });
      toast({ title: 'Salvo', description: 'Criativo salvo com sucesso' });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (updatedCreative: any) => {
    if (!id) return [];

    const htmlSlideConfigs = Array.isArray(updatedCreative?.htmlSlideConfigs)
      ? updatedCreative.htmlSlideConfigs
      : [];

    if (htmlSlideConfigs.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'Nao foram encontrados slides HTML para exportacao.',
        variant: 'destructive',
      });
      return [];
    }

    const exportedUrls: string[] = [];

    for (let slideIndex = 0; slideIndex < htmlSlideConfigs.length; slideIndex++) {
      const resp = await fetch('/api/export-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId: id,
          slideIndex,
          htmlSlideConfig: htmlSlideConfigs[slideIndex],
        }),
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || !payload?.pngUrl) {
        throw new Error(payload?.error || `Falha ao exportar slide ${slideIndex + 1}`);
      }

      exportedUrls.push(String(payload.pngUrl));

      const anchor = document.createElement('a');
      anchor.href = String(payload.pngUrl);
      anchor.download = `creative-${id}-slide-${slideIndex + 1}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }

    await updateExportUrls.mutateAsync({ id, exportUrls: exportedUrls });

    toast({
      title: 'Exportacao concluida',
      description: `${exportedUrls.length} slide(s) exportado(s) com sucesso.`,
    });

    return exportedUrls;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !creative) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background text-foreground">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-muted-foreground">Erro ao carregar criativo</p>
        <p className="text-sm text-muted-foreground/70">{error?.message}</p>
      </div>
    );
  }

  return (
    <CreativeEditor
      creative={creative}
      onSave={handleSave}
      onExport={handleExport}
      onBackToApp={() => {
        if (creative?.clientId) {
          setLocation(`/clients/${creative.clientId}`);
          return;
        }
        setLocation('/studio');
      }}
    />
  );
}
