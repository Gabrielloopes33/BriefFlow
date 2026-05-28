import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GenerateCarouselDto } from '@/lib/creative-editor-types';
import { useCreativeGenerationJob, useGenerateCreative } from '@/hooks/use-creatives';
import { useClients } from '@/hooks/use-clients';
import { usePostDetail } from '@/hooks/use-posts-library';
import { Loader2, Sparkles, User, Type } from 'lucide-react';

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
  const [format, setFormat] = useState<'square' | 'portrait' | 'story'>('portrait');
  const [imageStyleHint, setImageStyleHint] = useState('');
  const [imageModel, setImageModel] = useState<'schnell' | 'dev'>('dev');
  const [fontPreset, setFontPreset] = useState<'tech' | 'brand' | 'editorial'>('tech');
  const [generateImages, setGenerateImages] = useState(true);
  const [textDepth, setTextDepth] = useState<'concise' | 'detailed'>('concise');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      imageStyleHint: imageStyleHint.trim() || undefined,
      imageModel,
      format,
      fontCombination:
        fontPreset === 'brand'
          ? { title: 'Outfit', body: 'Inter' }
          : fontPreset === 'editorial'
            ? { title: 'Playfair', body: 'Inter' }
            : { title: 'Space', body: 'Inter' },
      generateImages,
      textDepth,
      templateStrategy: 'predefined',
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

            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Sistema visual ativo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Este wizard agora usa o motor novo com templates predefinidos da marca, paleta fixa e distribuicao automatica por slot.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">Hook e CTA definidos automaticamente pelo sistema</div>
                <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">Tipografia segue o preset escolhido e cores seguem a biblioteca visual da marca</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Combinação tipográfica</span>
                <select
                  value={fontPreset}
                  onChange={(e) => setFontPreset(e.target.value as 'tech' | 'brand' | 'editorial')}
                  className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="tech">Tech (Space + Inter)</option>
                  <option value="brand">Brand (Outfit + Inter)</option>
                  <option value="editorial">Editorial (Playfair + Inter)</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Motor de imagem (fal.ai)</span>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value as 'schnell' | 'dev')}
                  className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="dev">Flux Dev (mais qualidade, custo moderado)</option>
                  <option value="schnell">Flux Schnell (mais barato)</option>
                </select>
              </label>
            </div>

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

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">Estilo visual da imagem (opcional)</span>
              <input
                value={imageStyleHint}
                onChange={(e) => setImageStyleHint(e.target.value)}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Ex: foto realista, luz natural, fundo limpo"
              />
              <span className="text-xs text-muted-foreground">
                Isso ainda influencia bastante a geracao das imagens. Use termos de fotografia, luz, ambiente e acabamento visual.
              </span>
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
