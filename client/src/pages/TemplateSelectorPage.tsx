/**
 * Página de seleção de template
 * Exibe cards com thumbnails dos templates disponíveis
 */

import { useState } from 'react';
import { useCreativeTemplates } from '@/hooks/use-creative-templates';
import { useLocation } from 'wouter';
import { Loader2, ImageIcon, Layers, ArrowRight } from 'lucide-react';
import type { CreativeTemplate } from '@/lib/creative-editor-types';

function TemplateCard({
  template,
  onSelect,
}: {
  template: CreativeTemplate;
  onSelect: (template: CreativeTemplate) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={() => onSelect(template)}
      className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 text-left"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {template.thumbnailUrl && !imageError ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon className="w-10 h-10" />
            <span className="text-xs">{template.name}</span>
          </div>
        )}
        {/* Badge de tipo */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
            {template.type === 'carousel' ? 'Carrossel' : template.type === 'single' ? 'Único' : template.type}
          </span>
          <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm capitalize">
            {template.platform}
          </span>
        </div>
        {/* Slide count */}
        {template.slidesCount > 1 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
            <Layers className="w-3 h-3" />
            {template.slidesCount} slides
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
            Usar template
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm truncate">{template.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {template.isGlobal ? 'Template global' : 'Template do tenant'}
        </p>
      </div>
    </button>
  );
}

export function TemplateSelectorPage() {
  const { data: templates, isLoading, error } = useCreativeTemplates();
  const [, setLocation] = useLocation();

  const handleSelect = (template: CreativeTemplate) => {
    // Redireciona para o editor com o template selecionado
    // Na prática, criaria um novo creative primeiro via API
    // Por enquanto, apenas loga a seleção
    console.log('Template selecionado:', template.id);
    // TODO: Criar creative e redirecionar para /creatives/:id/edit
    setLocation(`/creatives/new?template=${template.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-gray-600">Erro ao carregar templates</p>
        <p className="text-sm text-gray-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Escolha um template</h1>
          <p className="text-gray-500 mt-1">
            Selecione um template para começar seu criativo. O conteúdo será preenchido automaticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates?.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={handleSelect} />
          ))}
        </div>

        {(!templates || templates.length === 0) && (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum template disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
