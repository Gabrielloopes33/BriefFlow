import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FontCombination, GenerateCarouselDto } from '@/lib/creative-editor-types';
import { useCreativeGenerationJob, useGenerateCreative } from '@/hooks/use-creatives';
import { useClients } from '@/hooks/use-clients';
import { usePostDetail } from '@/hooks/use-posts-library';
import { Loader2, Sparkles, User, LayoutTemplate, Image, Grid3X3, Layers, Type, AlignLeft, Maximize2, Film, MessageSquare, LayoutList } from 'lucide-react';

const FONT_OPTIONS: FontCombination[] = [
  { title: 'Space', body: 'Inter' },
  { title: 'Syne', body: 'Outfit' },
  { title: 'DM Sans', body: 'Raleway' },
  { title: 'Oswald', body: 'Inter' },
  { title: 'Playfair', body: 'DM Sans' },
  { title: 'Caveat', body: 'Inter' },
];

const GOOGLE_FONT_MAP: Record<string, string> = {
  'Space': 'Space+Grotesk',
  'Inter': 'Inter',
  'Syne': 'Syne',
  'Outfit': 'Outfit',
  'DM Sans': 'DM+Sans',
  'Raleway': 'Raleway',
  'Oswald': 'Oswald',
  'Playfair': 'Playfair+Display',
  'Caveat': 'Caveat',
};

const IMAGE_MODES: { value: 'background' | 'grid' | 'both'; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'background', label: 'Apenas fundo', description: 'Imagem preenche o slide atrás do texto', icon: <Image size={20} /> },
  { value: 'grid', label: 'Apenas grade', description: 'Imagem em caixa inset ao lado do texto', icon: <Grid3X3 size={20} /> },
  { value: 'both', label: 'Fundo + Grade', description: 'Imagem de fundo + inset em destaque', icon: <Layers size={20} /> },
];

type LayoutModeValue = 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';

const LAYOUT_MODES: { value: LayoutModeValue; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'minimalist', label: 'Minimalista', description: 'Texto centralizado sobre a imagem', icon: <LayoutTemplate size={20} /> },
  { value: 'profile', label: 'Com Perfil', description: 'Badge de perfil + texto à direita', icon: <User size={20} /> },
  { value: 'editorial', label: 'Editorial', description: 'Coluna de texto à esquerda, imagem à direita', icon: <AlignLeft size={20} /> },
  { value: 'bold', label: 'Impactante', description: 'Texto grande centralizado, máximo impacto', icon: <Maximize2 size={20} /> },
  { value: 'split', label: 'Dividido', description: 'Imagem no topo, texto fixo no terço inferior', icon: <LayoutList size={20} /> },
  { value: 'cinematic', label: 'Cinemático', description: 'Texto no canto inferior, imagem limpa', icon: <Film size={20} /> },
  { value: 'twitter', label: 'Twitter / X', description: 'Card de tweet — texto em destaque, fundo limpo', icon: <MessageSquare size={20} /> },
];

function FontPreviewLinks({ fonts }: { fonts: FontCombination[] }) {
  const families = useMemo(() => {
    const set = new Set<string>();
    fonts.forEach((f) => {
      set.add(GOOGLE_FONT_MAP[f.title] || f.title);
      set.add(GOOGLE_FONT_MAP[f.body] || f.body);
    });
    return Array.from(set);
  }, [fonts]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href={`https://fonts.googleapis.com/css2?family=${families.map((f) => `${f}:wght@400;700`).join('&family=')}&display=swap`}
        rel="stylesheet"
      />
    </>
  );
}

export function CarouselWizardPage() {
  const [, setLocation] = useLocation();
  const generateMutation = useGenerateCreative();

  const initialQueryParams = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);

  const queryClientId = useMemo(() => {
    if (!initialQueryParams) return '';
    return new URLSearchParams(initialQueryParams).get('client_id') || '';
  }, [initialQueryParams]);

  const queryPostId = useMemo(() => {
    if (!initialQueryParams) return '';
    return new URLSearchParams(initialQueryParams).get('post_id') || '';
  }, [initialQueryParams]);

  const { data: clients = [] } = useClients();
  const { data: selectedPost } = usePostDetail(queryPostId || null);
  const [clientId, setClientId] = useState(queryClientId);
  const [prompt, setPrompt] = useState('');
  const [slidesCount, setSlidesCount] = useState(6);
  const [imageMode, setImageMode] = useState<'background' | 'grid' | 'both'>('both');
  const [layoutMode, setLayoutMode] = useState<LayoutModeValue>('minimalist');
  const [format, setFormat] = useState<'square' | 'portrait' | 'story'>('portrait');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [imageStyleHint, setImageStyleHint] = useState('');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [fontIdx, setFontIdx] = useState(0);
  const [generateImages, setGenerateImages] = useState(true);
  const [textDepth, setTextDepth] = useState<'concise' | 'detailed'>('concise');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedFont = FONT_OPTIONS[fontIdx];
  const generationJob = useCreativeGenerationJob(activeJobId ?? undefined);

  useEffect(() => {
    const job = generationJob.data;
    if (!job) return;

    if (job.status === 'completed' && job.creativeId) {
      setLocation(`/creatives/${job.creativeId}/edit`);
      return;
    }

    if (job.status === 'failed') {
      setError(job.error || 'Falha ao processar geracao do carrossel.');
      setActiveJobId(null);
    }
  }, [generationJob.data, setLocation]);

  useEffect(() => {
    if (!selectedPost) return;

    if (!clientId) {
      setClientId(selectedPost.client_id);
    }

    if (!prompt.trim()) {
      const title = (selectedPost.title || '').trim();
      const content = (selectedPost.content || '').trim();
      const basePrompt = [title, content].filter(Boolean).join('\n\n');
      if (basePrompt) {
        setPrompt(basePrompt);
      }
    }
  }, [selectedPost, clientId, prompt]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!clientId.trim()) {
      setError('Informe o clientId para iniciar a geracao.');
      return;
    }

    if (!prompt.trim()) {
      setError('Escreva um prompt para gerar os slides.');
      return;
    }

    const payload: GenerateCarouselDto = {
      clientId: clientId.trim(),
      prompt: prompt.trim(),
      slidesCount,
      imageMode,
      imageStyleHint: imageStyleHint.trim() || undefined,
      layoutMode,
      format,
      instagramHandle: instagramHandle.trim(),
      fontCombination: selectedFont,
      accentColor,
      generateImages,
      textDepth,
    };

    try {
      const result = await generateMutation.mutateAsync(payload);
      if (result.creativeId) {
        setLocation(`/creatives/${result.creativeId}/edit`);
        return;
      }
      setActiveJobId(result.job_id);
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar carrossel.');
    }
  };

  return (
    <AppShell>
      <FontPreviewLinks fonts={FONT_OPTIONS} />
      <div className="py-6 px-4 md:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gerador de conteúdo com IA</h1>
              <p className="text-sm text-muted-foreground">Configure o briefing e gere um creative pronto para edicao.</p>
            </div>
          </div>

          <form className="grid gap-5" onSubmit={onSubmit}>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Cliente</p>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-10 bg-secondary/40 border-border/50 text-foreground">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-muted-foreground" />
                    <SelectValue placeholder="Selecione um cliente" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Prompt</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-24 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Ex: Crie um carrossel sobre 5 erros comuns em marketing de conteudo"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Numero de slides</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={slidesCount}
                  onChange={(e) => setSlidesCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Formato</span>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'square' | 'portrait' | 'story')}
                  className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="square">Quadrado (1:1)</option>
                  <option value="portrait">Retrato (4:5)</option>
                  <option value="story">Story (9:16)</option>
                </select>
              </label>
            </div>

            {/* Seletor visual de imageMode */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Modo de imagem</span>
              <div className="grid grid-cols-3 gap-3">
                {IMAGE_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setImageMode(mode.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                      imageMode === mode.value
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-background/50 text-muted-foreground hover:border-border hover:bg-background'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      imageMode === mode.value ? 'bg-primary/20' : 'bg-secondary/50'
                    }`}>
                      {mode.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{mode.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{mode.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor visual de layoutMode */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Modo de layout</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LAYOUT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setLayoutMode(mode.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                      layoutMode === mode.value
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-background/50 text-muted-foreground hover:border-border hover:bg-background'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      layoutMode === mode.value ? 'bg-primary/20' : 'bg-secondary/50'
                    }`}>
                      {mode.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{mode.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{mode.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview de combinações de fontes */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Combinacao de fontes</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FONT_OPTIONS.map((font, idx) => {
                  const titleFamily = GOOGLE_FONT_MAP[font.title] || font.title;
                  const bodyFamily = GOOGLE_FONT_MAP[font.body] || font.body;
                  return (
                    <button
                      key={`${font.title}-${font.body}`}
                      type="button"
                      onClick={() => setFontIdx(idx)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        fontIdx === idx
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border/60 bg-background/50 hover:border-border hover:bg-background'
                      }`}
                    >
                      <p
                        className="text-base font-bold text-foreground truncate"
                        style={{ fontFamily: titleFamily.replace(/\+/g, ' ') }}
                      >
                        Título do Slide
                      </p>
                      <p
                        className="text-sm text-muted-foreground truncate"
                        style={{ fontFamily: bodyFamily.replace(/\+/g, ' ') }}
                      >
                        Subtítulo de exemplo
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {font.title} + {font.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Instagram handle</span>
                <input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="@sua_marca"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Cor de destaque</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-full rounded-md border border-border/60 bg-background/50 px-1 py-1"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Estilo visual da imagem (opcional)</span>
              <input
                value={imageStyleHint}
                onChange={(e) => setImageStyleHint(e.target.value)}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Ex: foto realista, luz natural, fundo limpo"
              />
            </label>

            {/* Densidade textual */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Densidade textual</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTextDepth('concise')}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                    textDepth === 'concise'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  <Type size={16} />
                  Conciso (padrão)
                </button>
                <button
                  type="button"
                  onClick={() => setTextDepth('detailed')}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                    textDepth === 'detailed'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  <Type size={16} />
                  Detalhado
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {textDepth === 'detailed'
                  ? 'Subtítulos mais extensos (até 80 palavras) para conteúdo educacional aprofundado.'
                  : 'Subtítulos curtos e diretos (até 45 palavras) — ideal para engajamento rápido.'}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={generateImages}
                onChange={(e) => setGenerateImages(e.target.checked)}
                className="accent-primary"
              />
              Gerar imagens automaticamente
            </label>

            {activeJobId && generationJob.data ? (
              <div className="rounded-md border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground">
                <p className="font-medium">{generationJob.data.stage}</p>
                <p className="text-xs text-muted-foreground">
                  Progresso: {generationJob.data.progress}% · Job: {activeJobId}
                </p>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={generateMutation.isPending || Boolean(activeJobId)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-5px_rgba(250,93,25,0.4)] transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_-5px_rgba(250,93,25,0.6)] disabled:opacity-50"
            >
              {(generateMutation.isPending || Boolean(activeJobId)) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {activeJobId ? 'Gerando em background...' : 'Gerar carrossel'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
