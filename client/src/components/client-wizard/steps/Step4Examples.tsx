import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardFormData, ExamplePost } from "../ClientWizard";

const FORMATS = [
  { value: "carousel", label: "Carrossel" },
  { value: "reels", label: "Reels" },
  { value: "single", label: "Foto única" },
  { value: "text", label: "Texto" },
] as const;

interface Props {
  form: UseFormReturn<WizardFormData>;
}

export function Step4Examples({ form }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [engagementInput, setEngagementInput] = useState("");
  const examples: ExamplePost[] = form.watch("example_posts") ?? [];
  const preferredFormat = form.watch("preferred_format");

  function addExample() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const engagement = parseInt(engagementInput) || 0;
    form.setValue("example_posts", [...examples, { url: trimmed, engagement }]);
    setUrlInput("");
    setEngagementInput("");
  }

  function removeExample(idx: number) {
    form.setValue("example_posts", examples.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Adicione URLs de posts que performaram bem. Isso ajuda os agentes a entender o estilo e formato que funciona para este cliente.
      </p>

      {/* Formato preferido */}
      <FormField
        control={form.control}
        name="preferred_format"
        render={() => (
          <FormItem>
            <FormLabel>Formato preferido de publicação</FormLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {FORMATS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue("preferred_format", value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm transition-colors",
                    preferredFormat === value
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Adicionar post */}
      <div className="space-y-2">
        <FormLabel>Posts de sucesso</FormLabel>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.instagram.com/p/..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExample(); } }}
            className="flex-1"
          />
          <Input
            placeholder="Curtidas"
            type="number"
            min={0}
            value={engagementInput}
            onChange={(e) => setEngagementInput(e.target.value)}
            className="w-28"
          />
          <Button type="button" variant="outline" onClick={addExample}>
            Adicionar
          </Button>
        </div>
      </div>

      {examples.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
          Nenhum exemplo adicionado. Esta etapa é opcional.
        </div>
      ) : (
        <ul className="space-y-2">
          {examples.map((ex, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{ex.url}</p>
                {ex.engagement > 0 && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    ~{ex.engagement.toLocaleString()} curtidas
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeExample(idx)}
              >
                <Trash2 size={13} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
