/**
 * Página de seleção de template
 * Exibe cards com thumbnails dos templates disponíveis
 */

import { useEffect, useMemo, useState } from 'react';
import { useCreativeTemplates } from '@/hooks/use-creative-templates';
import { useLocation } from 'wouter';
import { Loader2, ImageIcon, Layers, ArrowRight, Filter, X } from 'lucide-react';
import type { CreativeTemplate } from '@/lib/creative-editor-types';
import { apiGet, apiPost } from '@/lib/api';

interface PostDetailForCreative {
  id: string;
  client_id: string;
  title?: string | null;
  content?: string | null;
}

interface CreativeCreateResponse {
  id: string;
}

function resolveTemplatePlaceholders(
  text: string,
  post?: { title?: string | null; content?: string | null },
  options?: { isLastSlide?: boolean; ctaText?: string }
): string {
  if (!text) return text;
  const title = post?.title?.trim() || 'Título do Post';
  const content = (post?.content || '').trim();
  const body = (content.split('\n')[0] || content).slice(0, 220) || 'Conteúdo do post';
  const cta = options?.isLastSlide
    ? (options?.ctaText || 'Salve este post')
    : '';

  return text
    .replaceAll('{{headline}}', title)
    .replaceAll('{{body}}', body)
    .replaceAll('{{cta}}', cta);
}

function buildSlidesFromTemplate(
  template: CreativeTemplate,
  post?: { title?: string | null; content?: string | null },
  options?: { slidesCount?: number; format?: string }
) {
  const totalSlides = options?.slidesCount ?? template.slidesCount;
  let slides = template.structure.slides.map((slide, index) => {
    const isLastSlide = index === totalSlides - 1;
    const ctaText = slide.ctaButton?.text || 'Salve este post';
    return {
      ...slide,
      index,
      // CTA visível apenas no último slide por padrão
      ctaButton: {
        ...(slide.ctaButton ?? {
          visible: false,
          text: 'Salve este post',
          style: 'filled' as const,
          size: 16,
          borderRadius: 4,
          backgroundColor: '#ffffff',
          textColor: '#000000',
        }),
        visible: isLastSlide ? (slide.ctaButton?.visible ?? true) : false,
      },
      layers: slide.layers.map((layer) => {
        if (layer.type !== 'text') return layer;
        const text = resolveTemplatePlaceholders(layer.text || '', post, {
          isLastSlide,
          ctaText,
        });
        return { ...layer, text };
      }),
    };
  });

  // Ajustar número de slides se necessário
  if (totalSlides < slides.length) {
    slides = slides.slice(0, totalSlides);
  } else if (totalSlides > slides.length) {
    const lastSlide = slides[slides.length - 1];
    while (slides.length < totalSlides) {
      const idx = slides.length;
      slides.push({
        ...lastSlide,
        id: `${lastSlide.id}-dup-${idx}`,
        index: idx,
        ctaButton: { ...lastSlide.ctaButton, visible: idx === totalSlides - 1 },
        layers: lastSlide.layers.map((layer) => ({
          ...layer,
          id: `${layer.id}-dup-${idx}`,
          text: layer.type === 'text' && layer.placeholder
            ? ''
            : layer.type === 'text'
              ? layer.text
              : '',
        })),
      });
    }
  }

  return slides;
}

type FormatFilter = 'all' | 'square' | 'portrait' | 'story';
type TypeFilter = 'all' | 'carousel' | 'single' | 'story' | 'ad';
type PlatformFilter = 'all' | 'instagram' | 'linkedin' | 'facebook' | 'universal';

function getFormatBadge(template: CreativeTemplate): { label: string; ratio: string } {
  const format = (template.structure as any)?.format || 'square';
  if (format === 'portrait') return { label: 'Portrait', ratio: '4:5' };
  if (format === 'story') return { label: 'Story', ratio: '9:16' };
  return { label: 'Quadrado', ratio: '1:1' };
}

function getAspectRatioClass(template: CreativeTemplate): string {
  const format = (template.structure as any)?.format || 'square';
  if (format === 'portrait') return 'aspect-[4/5]';
  if (format === 'story') return 'aspect-[9/16]';
  return 'aspect-square';
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: CreativeTemplate;
  onSelect: (template: CreativeTemplate) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const formatBadge = getFormatBadge(template);
  const aspectClass = getAspectRatioClass(template);

  return (
    <button
      onClick={() => onSelect(template)}
      className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 text-left"
    >
      {/* Thumbnail */}
      <div className={`${aspectClass} bg-gray-100 relative overflow-hidden`}>
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
        {/* Format badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
          {formatBadge.ratio}
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
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<PostDetailForCreative | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CreativeTemplate | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configFormat, setConfigFormat] = useState<FormatFilter>('portrait');
  const [configSlidesCount, setConfigSlidesCount] = useState(6);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams('');
    return new URLSearchParams(window.location.search);
  }, []);

  const queryClientId = searchParams.get('client_id') || '';
  const queryPostId = searchParams.get('post_id') || '';
  const resolvedClientId = queryClientId || postDetail?.client_id || '';

  useEffect(() => {
    if (!queryPostId) return;

    let mounted = true;
    apiGet<PostDetailForCreative>(`/api/posts/${queryPostId}`)
      .then((post) => {
        if (!mounted) return;
        setPostDetail(post);
      })
      .catch(() => {
        if (!mounted) return;
        setPostDetail(null);
      });

    return () => {
      mounted = false;
    };
  }, [queryPostId]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (platformFilter !== 'all' && t.platform !== platformFilter) return false;
      if (formatFilter !== 'all') {
        const format = (t.structure as any)?.format || 'square';
        if (format !== formatFilter) return false;
      }
      return true;
    });
  }, [templates, typeFilter, formatFilter, platformFilter]);

  const handleSelectTemplate = (template: CreativeTemplate) => {
    setSelectedTemplate(template);
    setConfigFormat((template.structure as any)?.format || 'portrait');
    setConfigSlidesCount(template.slidesCount);
    setShowConfigModal(true);
  };

  const handleCreateCreative = async () => {
    if (!selectedTemplate || !resolvedClientId) {
      setCreateError('Selecione um cliente no Studio antes de criar o creative.');
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    setShowConfigModal(false);

    try {
      const slides = buildSlidesFromTemplate(
        selectedTemplate,
        postDetail || undefined,
        { slidesCount: configSlidesCount, format: configFormat }
      );
      const creative = await apiPost<CreativeCreateResponse>('/api/creatives', {
        client_id: resolvedClientId,
        post_id: queryPostId || null,
        template_id: selectedTemplate.id,
        type: selectedTemplate.type,
        platform: selectedTemplate.platform,
        format: configFormat,
        slides_count: configSlidesCount,
        slides,
      });
      setLocation(`/creatives/${creative.id}/edit`);
    } catch (err: any) {
      setCreateError(err?.message || 'Não foi possível criar o creative com este template.');
    } finally {
      setIsCreating(false);
    }
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
          {queryPostId ? (
            <p className="text-sm text-blue-700 mt-2">Conteúdo da pauta detectado: ao escolher um template, o creative será criado já vinculado ao post.</p>
          ) : null}
          {isCreating ? (
            <p className="text-sm text-gray-500 mt-2">Criando creative...</p>
          ) : null}
          {createError ? (
            <p className="text-sm text-red-600 mt-2">{createError}</p>
          ) : null}
        </div>

        {/* Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            <span>Filtrar templates</span>
            {(typeFilter !== 'all' || formatFilter !== 'all' || platformFilter !== 'all') && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setFormatFilter('all');
                  setPlatformFilter('all');
                }}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Tipo */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500 self-center mr-1">Tipo:</span>
              {(['all', 'carousel', 'single', 'story', 'ad'] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'carousel' ? 'Carrossel' : t === 'single' ? 'Post Único' : t === 'story' ? 'Story' : 'Ad'}
                </button>
              ))}
            </div>
            {/* Formato */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500 self-center mr-1">Formato:</span>
              {(['all', 'square', 'portrait', 'story'] as FormatFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    formatFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'square' ? 'Quadrado (1:1)' : f === 'portrait' ? 'Portrait (4:5)' : 'Story (9:16)'}
                </button>
              ))}
            </div>
            {/* Plataforma */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500 self-center mr-1">Plataforma:</span>
              {(['all', 'instagram', 'linkedin', 'facebook', 'universal'] as PlatformFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    platformFilter === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p === 'all' ? 'Todas' : p === 'universal' ? 'Universal' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={handleSelectTemplate} />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum template corresponde aos filtros selecionados</p>
          </div>
        )}

        {/* Config Modal */}
        {showConfigModal && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Configurar Carrossel</h2>
              <p className="text-sm text-gray-500 mb-4">
                Template: <span className="font-medium text-gray-700">{selectedTemplate.name}</span>
              </p>

              {/* Formato */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Formato</label>
                <div className="space-y-2">
                  {[
                    { value: 'square' as const, label: 'Quadrado (1:1) — 1080×1080' },
                    { value: 'portrait' as const, label: 'Portrait (4:5) — 1080×1350', default: true },
                    { value: 'story' as const, label: 'Story (9:16) — 1080×1920' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value={opt.value}
                        checked={configFormat === opt.value}
                        onChange={() => setConfigFormat(opt.value)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                      {opt.default && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">padrão</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Número de slides */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-gray-700">Número de Slides</label>
                <div className="flex flex-wrap gap-2">
                  {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setConfigSlidesCount(n)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        configSlidesCount === n
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Template tem {selectedTemplate.slidesCount} slides por padrão
                </p>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCreative}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Criar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
