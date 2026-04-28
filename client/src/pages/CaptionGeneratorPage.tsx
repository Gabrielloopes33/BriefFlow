import { useState } from 'react';
import { useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useCreative, useGenerateCaption } from '@/hooks/use-creatives';

export function CaptionGeneratorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: creative, isLoading } = useCreative(id || '');
  const generateCaption = useGenerateCaption();
  const [tone, setTone] = useState('engajamento');
  const [copySuccess, setCopySuccess] = useState(false);

  const caption = generateCaption.data?.caption || '';
  const hashtags = generateCaption.data?.hashtags || [];

  const onGenerate = async () => {
    if (!id) return;
    setCopySuccess(false);
    await generateCaption.mutateAsync({ id, tone });
  };

  const onCopy = async () => {
    const text = [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Creative nao encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Gerador de Legenda</h1>
        <p className="mt-1 text-sm text-slate-600">Crie caption e hashtags com base nos slides do creative.</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Tom da legenda</span>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="rounded-md border px-3 py-2"
            >
              <option value="engajamento">Engajamento</option>
              <option value="educativo">Educativo</option>
              <option value="profissional">Profissional</option>
              <option value="direto">Direto</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onGenerate}
            disabled={generateCaption.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {generateCaption.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Gerar legenda
          </button>

          {generateCaption.error ? (
            <p className="text-sm text-red-600">
              {(generateCaption.error as Error).message || 'Falha ao gerar legenda.'}
            </p>
          ) : null}

          {caption ? (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-800">{caption}</p>
              {hashtags.length ? (
                <p className="mt-3 text-sm text-blue-700">{hashtags.join(' ')}</p>
              ) : null}
              <button
                type="button"
                onClick={onCopy}
                className="mt-4 rounded-md border px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Copiar legenda
              </button>
              {copySuccess ? <p className="mt-2 text-xs text-green-700">Copiado para area de transferencia.</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
