import { useState, type ComponentType } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Trash2, Youtube, Linkedin, Instagram } from "lucide-react";
import type { WizardFormData, SourceItem } from "../ClientWizard";

function inferSourceType(url: string): SourceItem["type"] {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/linkedin\.com/.test(url)) return "linkedin";
  return "blog";
}

const TYPE_ICONS: Record<SourceItem["type"], ComponentType<{ size?: string | number; className?: string }>> = {
  blog: Globe,
  youtube: Youtube,
  instagram: Instagram,
  linkedin: Linkedin,
};

const TYPE_LABELS: Record<SourceItem["type"], string> = {
  blog: "Blog / Site",
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

interface Props {
  form: UseFormReturn<WizardFormData>;
}

export function Step3Sources({ form }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const watchedSources = form.watch("sources");
  const sources: SourceItem[] = Array.isArray(watchedSources)
    ? watchedSources.filter(
        (item): item is SourceItem =>
          !!item &&
          typeof item.url === "string" &&
          ["instagram", "linkedin", "blog", "youtube"].includes(String(item.type))
      )
    : [];

  function addSource() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const type = inferSourceType(trimmed);
    form.setValue("sources", [...sources, { url: trimmed, type }]);
    setUrlInput("");
  }

  function removeSource(idx: number) {
    form.setValue("sources", sources.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cole links de blogs, perfis do Instagram, canais do YouTube ou páginas do LinkedIn que inspiram o cliente. Os agentes usarão essas fontes para criar conteúdo mais relevante.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="https://blog.exemplo.com.br"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addSource(); }
          }}
        />
        <Button type="button" variant="outline" onClick={addSource}>
          Adicionar
        </Button>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
          Nenhuma fonte adicionada. Esta etapa é opcional.
        </div>
      ) : (
        <ul className="space-y-2">
          {sources.map((src, idx) => {
            const Icon = TYPE_ICONS[src.type];
            return (
              <li
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
              >
                <div className="p-1.5 rounded bg-primary/10">
                  <Icon size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{TYPE_LABELS[src.type]}</p>
                  <p className="text-sm truncate">{src.url}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSource(idx)}
                >
                  <Trash2 size={13} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
