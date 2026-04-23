/**
 * Página do Editor de Criativos
 * Carrega um criativo por ID e renderiza o CreativeEditor
 */

import { useParams } from 'wouter';
import { useCreative, useUpdateCreative } from '@/hooks/use-creatives';
import { CreativeEditor } from '@/components/creative-editor/CreativeEditor';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

export function CreativeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: creative, isLoading, error } = useCreative(id || '');
  const updateCreative = useUpdateCreative();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !creative) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-600">Erro ao carregar criativo</p>
        <p className="text-sm text-gray-400">{error?.message}</p>
      </div>
    );
  }

  return (
    <CreativeEditor
      creative={creative}
      onSave={handleSave}
    />
  );
}
