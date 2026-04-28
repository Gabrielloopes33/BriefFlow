/**
 * Painel de propriedades do texto selecionado
 * Permite editar cor, tamanho da fonte, alinhamento
 */

import { useEffect, useState } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';
import type { Creative, Slide, TextLayer } from '@/lib/creative-editor-types';
import { FontPreviewSelector } from './FontPreviewSelector';

interface TextEditPanelProps {
  slide: Slide;
  layer: TextLayer | null;
  onChange: (updates: Partial<TextLayer>) => void;
  onSlideSettingsChange: (changes: {
    theme?: NonNullable<Slide['theme']>;
    textLayout?: Partial<NonNullable<Slide['textLayout']>>;
    typography?: Partial<NonNullable<Slide['typography']>>;
    overlay?: Partial<NonNullable<Slide['overlay']>>;
    imageGrid?: Partial<NonNullable<Slide['imageGrid']>>;
    profileBadge?: Partial<NonNullable<Slide['profileBadge']>>;
    ctaButton?: Partial<NonNullable<Slide['ctaButton']>>;
  }) => void;
  onApplyToNextSlide: () => void;
  onGenerateCurrentSlideContent: () => Promise<void>;
  onRefineCurrentSlide: (instruction: string) => Promise<void>;
  onGenerateCurrentSlideImage: (styleHint: string) => Promise<void>;
  layoutMode?: NonNullable<Creative['layoutMode']>;
  profileConfig?: Creative['profileConfig'] | null;
  onProfileConfigChange?: (changes: Partial<NonNullable<Creative['profileConfig']>>) => void;
  isGeneratingContent?: boolean;
  isRefiningContent?: boolean;
  isGeneratingImage?: boolean;
}

const PRESET_COLORS = [
  '#ffffff', '#000000', '#1a1a2e', '#667eea', '#764ba2',
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
];

const POSITION_OPTIONS: Array<{ value: NonNullable<Slide['textLayout']>['position']; label: string }> = [
  { value: 'top-left', label: 'Sup. Esq' },
  { value: 'top-center', label: 'Sup. Centro' },
  { value: 'top-right', label: 'Sup. Dir' },
  { value: 'mid-left', label: 'Meio Esq' },
  { value: 'mid', label: 'Meio' },
  { value: 'mid-right', label: 'Meio Dir' },
  { value: 'bot-left', label: 'Inf. Esq' },
  { value: 'bot-center', label: 'Inf. Centro' },
  { value: 'bot-right', label: 'Inf. Dir' },
];

export const FONT_OPTIONS: Array<NonNullable<Slide['typography']>['titleFontFamily']> = [
  'Inter',
  'Space',
  'Syne',
  'Outfit',
  'DM Sans',
  'Raleway',
  'Oswald',
  'Playfair',
  'Caveat',
];

export function TextEditPanel({
  slide,
  layer,
  onChange,
  onSlideSettingsChange,
  onApplyToNextSlide,
  onGenerateCurrentSlideContent,
  onRefineCurrentSlide,
  onGenerateCurrentSlideImage,
  layoutMode = 'minimalist',
  profileConfig,
  onProfileConfigChange,
  isGeneratingContent = false,
  isRefiningContent = false,
  isGeneratingImage = false,
}: TextEditPanelProps) {
  const [refineInstruction, setRefineInstruction] = useState('');
  const [imageStyleHint, setImageStyleHint] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!actionFeedback) return;
    const timerId = window.setTimeout(() => {
      setActionFeedback(null);
    }, 3500);
    return () => window.clearTimeout(timerId);
  }, [actionFeedback]);
  const textLayout = slide.textLayout ?? {
    position: 'mid-left' as const,
    alignment: 'left' as const,
    title: '',
    subtitle: '',
  };
  const theme = slide.theme ?? 'dark';

  const typography = slide.typography ?? {
    globalScale: 100,
    titleFontSize: 56,
    titleFontFamily: 'Space' as const,
    subtitleFontSize: 28,
    accentColor: '#3B82F6',
    accentWords: [],
  };

  const overlay = slide.overlay ?? {
    style: 'base' as const,
    opacity: 35,
    color: '#000000',
  };

  const imageGrid = slide.imageGrid ?? {
    visible: false,
    imageUrl: '',
    borderRadius: 16,
  };

  const profileBadge = slide.profileBadge ?? {
    visible: false,
    imageUrl: '',
    name: '',
    handle: '',
    style: 'solid' as const,
    size: 64,
    position: 'top-left' as const,
  };

  const ctaButton = slide.ctaButton ?? {
    visible: false,
    text: 'Saiba mais',
    style: 'filled' as const,
    size: 18,
    borderRadius: 18,
    backgroundColor: '#111827',
    textColor: '#ffffff',
  };

  const activeProfileConfig: NonNullable<Creative['profileConfig']> = profileConfig ?? {
    photoUrl: '',
    name: '',
    handle: '',
    badgeStyle: 'solid',
    thumbnailCount: 1,
    borderRadius: 18,
  };

  const runPanelAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionFeedback(null);
    try {
      await action();
      setActionFeedback({ type: 'success', message: successMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel concluir a acao.';
      setActionFeedback({ type: 'error', message });
    }
  };

  const handleBadgePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSlideSettingsChange({ profileBadge: { imageUrl: reader.result } });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4" />
          <span>Tema do Slide</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSlideSettingsChange({ theme: 'dark' })}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-background/50 border-border/60 text-foreground hover:bg-secondary/50'
            }`}
          >
            Escuro
          </button>
          <button
            type="button"
            onClick={() => onSlideSettingsChange({ theme: 'light' })}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary/10 border-blue-300 text-primary'
                : 'bg-background/50 border-border/60 text-foreground hover:bg-secondary/50'
            }`}
          >
            Claro
          </button>
        </div>
      </div>

      {layoutMode === 'profile' ? (
        <div className="space-y-2 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Type className="w-4 h-4" />
            <span>Configuracao Profile</span>
          </div>

          <input
            value={activeProfileConfig.photoUrl ?? ''}
            onChange={(e) => onProfileConfigChange?.({ photoUrl: e.target.value })}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            placeholder="URL da foto do perfil"
          />
          <input
            value={activeProfileConfig.name}
            onChange={(e) => onProfileConfigChange?.({ name: e.target.value })}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            placeholder="Nome no profile"
          />
          <input
            value={activeProfileConfig.handle}
            onChange={(e) => onProfileConfigChange?.({ handle: e.target.value })}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            placeholder="@handle no profile"
          />

          <select
            value={activeProfileConfig.badgeStyle}
            onChange={(e) =>
              onProfileConfigChange?.({
                badgeStyle: e.target.value as NonNullable<Creative['profileConfig']>['badgeStyle'],
              })
            }
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
          >
            <option value="solid">Badge Solido</option>
            <option value="minimal">Badge Minimal</option>
            <option value="glass">Badge Glass</option>
          </select>

          <select
            value={String(activeProfileConfig.thumbnailCount)}
            onChange={(e) => {
              const value = e.target.value === 'alternating'
                ? 'alternating'
                : (Number(e.target.value) as 1 | 2);
              onProfileConfigChange?.({ thumbnailCount: value });
            }}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
          >
            <option value="1">1 thumbnail</option>
            <option value="2">2 thumbnails</option>
            <option value="alternating">Alternado</option>
          </select>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Arredondamento das thumbnails</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={40}
                value={activeProfileConfig.borderRadius}
                onChange={(e) => onProfileConfigChange?.({ borderRadius: parseInt(e.target.value, 10) })}
                className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono w-10 text-right">{activeProfileConfig.borderRadius}px</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4" />
          <span>Layout do Slide</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Posicao do texto</label>
          <div className="grid grid-cols-3 gap-1">
            {POSITION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSlideSettingsChange({ textLayout: { position: option.value } })}
                className={`rounded-md border px-1.5 py-1 text-[10px] transition-colors ${
                  textLayout.position === option.value
                    ? 'bg-primary/10 border-blue-300 text-primary'
                    : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Alinhamento</label>
          <div className="flex gap-1">
            {([
              { value: 'left', icon: AlignLeft },
              { value: 'center', icon: AlignCenter },
              { value: 'right', icon: AlignRight },
            ] as const).map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onSlideSettingsChange({ textLayout: { alignment: value } })}
                className={`flex-1 py-1.5 px-2 rounded-md border transition-colors flex items-center justify-center ${
                  textLayout.alignment === value
                    ? 'bg-primary/10 border-blue-300 text-primary'
                    : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-secondary/50'
                }`}
                title={value}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Titulo</label>
          <textarea
            value={textLayout.title}
            onChange={(e) => onSlideSettingsChange({ textLayout: { title: e.target.value } })}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            rows={2}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Subtitulo</label>
          <textarea
            value={textLayout.subtitle}
            onChange={(e) => onSlideSettingsChange({ textLayout: { subtitle: e.target.value } })}
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
        </div>
      </div>

      {layoutMode !== 'profile' ? (
        <div className="space-y-2 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Type className="w-4 h-4" />
            <span>Badge de Perfil</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={profileBadge.visible}
              onChange={(e) => onSlideSettingsChange({ profileBadge: { visible: e.target.checked } })}
            />
            Exibir badge de perfil
          </label>

          {profileBadge.visible ? (
            <>
              <label className="text-xs text-muted-foreground font-medium">Foto do badge</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBadgePhotoUpload}
                className="w-full text-xs text-muted-foreground"
              />
              <input
                value={profileBadge.imageUrl ?? ''}
                onChange={(e) => onSlideSettingsChange({ profileBadge: { imageUrl: e.target.value } })}
                className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
                placeholder="URL da foto (opcional)"
              />
              <input
                value={profileBadge.name}
                onChange={(e) => onSlideSettingsChange({ profileBadge: { name: e.target.value } })}
                className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
                placeholder="Nome"
              />
              <input
                value={profileBadge.handle}
                onChange={(e) => onSlideSettingsChange({ profileBadge: { handle: e.target.value } })}
                className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
                placeholder="@handle"
              />
              <select
                value={profileBadge.style}
                onChange={(e) =>
                  onSlideSettingsChange({
                    profileBadge: { style: e.target.value as NonNullable<Slide['profileBadge']>['style'] },
                  })
                }
                className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              >
                <option value="solid">Solido</option>
                <option value="minimal">Minimal</option>
                <option value="glass">Glass</option>
              </select>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Tamanho</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={40}
                    max={120}
                    value={profileBadge.size}
                    onChange={(e) => onSlideSettingsChange({ profileBadge: { size: parseInt(e.target.value, 10) } })}
                    className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono w-10 text-right">{profileBadge.size}px</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Type className="w-4 h-4" />
            <span>Botao CTA</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Ultimo slide recomendado
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={ctaButton.visible}
            onChange={(e) => onSlideSettingsChange({ ctaButton: { visible: e.target.checked } })}
          />
          Exibir botao CTA neste slide
        </label>

        {ctaButton.visible ? (
          <>
            <input
              value={ctaButton.text}
              onChange={(e) => onSlideSettingsChange({ ctaButton: { text: e.target.value } })}
              className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              placeholder="Texto do CTA"
            />

            <select
              value={ctaButton.style}
              onChange={(e) =>
                onSlideSettingsChange({
                  ctaButton: { style: e.target.value as NonNullable<Slide['ctaButton']>['style'] },
                })
              }
              className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            >
              <option value="filled">Preenchido</option>
              <option value="outline">Contorno</option>
              <option value="glass">Glass</option>
            </select>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tamanho da fonte</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={14}
                  max={28}
                  value={ctaButton.size}
                  onChange={(e) => onSlideSettingsChange({ ctaButton: { size: parseInt(e.target.value, 10) } })}
                  className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs font-mono w-10 text-right">{ctaButton.size}px</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Arredondamento</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={ctaButton.borderRadius}
                  onChange={(e) => onSlideSettingsChange({ ctaButton: { borderRadius: parseInt(e.target.value, 10) } })}
                  className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs font-mono w-10 text-right">{ctaButton.borderRadius}px</span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4" />
          <span>Tipografia</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Escala global</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={50}
              max={200}
              value={typography.globalScale}
              onChange={(e) => onSlideSettingsChange({ typography: { globalScale: parseInt(e.target.value, 10) } })}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right">{typography.globalScale}%</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Tamanho do titulo</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={20}
              max={140}
              value={typography.titleFontSize}
              onChange={(e) => onSlideSettingsChange({ typography: { titleFontSize: parseInt(e.target.value, 10) } })}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right">{typography.titleFontSize}px</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Fonte do titulo</label>
          <FontPreviewSelector
            value={typography.titleFontFamily}
            onChange={(font) =>
              onSlideSettingsChange({
                typography: { titleFontFamily: font as NonNullable<Slide['typography']>['titleFontFamily'] },
              })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Tamanho do subtitulo</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={12}
              max={72}
              value={typography.subtitleFontSize}
              onChange={(e) => onSlideSettingsChange({ typography: { subtitleFontSize: parseInt(e.target.value, 10) } })}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right">{typography.subtitleFontSize}px</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Cor de destaque</label>
          <input
            type="color"
            value={typography.accentColor}
            onChange={(e) => onSlideSettingsChange({ typography: { accentColor: e.target.value } })}
            className="w-full h-8 rounded-md border border-border/60 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Palavras em destaque</label>
          <input
            value={typography.accentWords.join(', ')}
            onChange={(e) =>
              onSlideSettingsChange({
                typography: {
                  accentWords: e.target.value
                    .split(',')
                    .map((word) => word.trim())
                    .filter(Boolean),
                },
              })
            }
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            placeholder="Ex: IA, marketing, resultado"
          />
        </div>
      </div>

      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4" />
          <span>Imagem e Overlay</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Estilo de sombra/overlay</label>
          <select
            value={overlay.style}
            onChange={(e) =>
              onSlideSettingsChange({
                overlay: {
                  style: e.target.value as NonNullable<Slide['overlay']>['style'],
                },
              })
            }
            className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
          >
            <option value="none">Nenhum</option>
            <option value="base">Base</option>
            <option value="base-forte">Base Forte</option>
            <option value="topo-forte">Topo Forte</option>
            <option value="diag-inf-dir">Diagonal Inf. Dir.</option>
            <option value="diag-sup-esq">Diagonal Sup. Esq.</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Opacidade</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={overlay.opacity}
              onChange={(e) => onSlideSettingsChange({ overlay: { opacity: parseInt(e.target.value, 10) } })}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right">{overlay.opacity}%</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={imageGrid.visible}
            onChange={(e) => onSlideSettingsChange({ imageGrid: { visible: e.target.checked } })}
          />
          Mostrar grade de imagem
        </label>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Arredondamento da grade</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={40}
              value={imageGrid.borderRadius ?? 16}
              onChange={(e) => onSlideSettingsChange({ imageGrid: { borderRadius: parseInt(e.target.value, 10) } })}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right">{imageGrid.borderRadius ?? 16}px</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4" />
          <span>IA por Slide</span>
        </div>

        <button
          type="button"
          onClick={() => runPanelAction(onGenerateCurrentSlideContent, 'Conteudo do slide atualizado.')}
          disabled={isGeneratingContent}
          className="w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
        >
          {isGeneratingContent ? 'Gerando...' : 'Gerar conteudo deste slide'}
        </button>

        <textarea
          value={refineInstruction}
          onChange={(e) => setRefineInstruction(e.target.value)}
          className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
          rows={3}
          placeholder="Instrucao de refinamento (ex: deixe mais direto e com CTA forte)"
        />

        <button
          type="button"
          onClick={() =>
            runPanelAction(async () => {
              await onRefineCurrentSlide(refineInstruction);
              setRefineInstruction('');
            }, 'Slide refinado com sucesso.')
          }
          disabled={isRefiningContent || !refineInstruction.trim()}
          className="w-full rounded-md border border-border/80 bg-background/50 px-2 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
        >
          {isRefiningContent ? 'Refinando...' : 'Refinar este slide'}
        </button>

        <input
          value={imageStyleHint}
          onChange={(e) => setImageStyleHint(e.target.value)}
          className="w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
          placeholder="Dica visual para imagem (opcional)"
        />

        <button
          type="button"
          onClick={() =>
            runPanelAction(async () => {
              await onGenerateCurrentSlideImage(imageStyleHint);
              setImageStyleHint('');
            }, 'Imagem do slide gerada com sucesso.')
          }
          disabled={isGeneratingImage}
          className="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-400 disabled:opacity-50"
        >
          {isGeneratingImage ? 'Gerando imagem...' : 'Gerar imagem deste slide'}
        </button>

        <button
          type="button"
          onClick={() => {
            onApplyToNextSlide();
            setActionFeedback({ type: 'success', message: 'Configuracoes aplicadas no proximo slide.' });
          }}
          className="w-full rounded-md border border-border/80 bg-secondary/50 px-2 py-1.5 text-xs font-medium text-foreground"
        >
          Aplicar configuracoes no proximo slide
        </button>

        {actionFeedback ? (
          <div
            className={`rounded-md px-2 py-1.5 text-xs ${
              actionFeedback.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
            role="status"
            aria-live="polite"
          >
            {actionFeedback.message}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Type className="w-4 h-4" />
        <span>Elemento Selecionado</span>
      </div>

      {!layer ? (
        <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-muted-foreground/70 text-xs">
          Selecione um texto no canvas para ajustes finos.
        </div>
      ) : (
        <>

          {/* Tamanho da fonte */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tamanho</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={12}
                max={120}
                value={layer.fontSize}
                onChange={(e) => onChange({ fontSize: parseInt(e.target.value, 10) })}
                className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono w-8 text-right">{layer.fontSize}px</span>
            </div>
          </div>

          {/* Peso da fonte */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Peso</label>
            <div className="flex gap-1">
              <button
                onClick={() => onChange({ fontWeight: 'normal' })}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors ${
                  layer.fontWeight === 'normal'
                    ? 'bg-primary/10 border-blue-300 text-primary'
                    : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => onChange({ fontWeight: 'bold' })}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors flex items-center justify-center gap-1 ${
                  layer.fontWeight === 'bold'
                    ? 'bg-primary/10 border-blue-300 text-primary'
                    : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <Bold className="w-3 h-3" />
                Bold
              </button>
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Cor</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange({ color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    layer.color === color ? 'border-blue-500 scale-110' : 'border-border/60 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={layer.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 cursor-pointer mt-1"
            />
          </div>

          {/* Alinhamento */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Alinhamento</label>
            <div className="flex gap-1">
              {([
                { value: 'left', icon: AlignLeft },
                { value: 'center', icon: AlignCenter },
                { value: 'right', icon: AlignRight },
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => onChange({ align: value })}
                  className={`flex-1 py-1.5 px-2 rounded-md border transition-colors flex items-center justify-center ${
                    layer.align === value
                      ? 'bg-primary/10 border-blue-300 text-primary'
                      : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-secondary/50'
                  }`}
                  title={value}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
