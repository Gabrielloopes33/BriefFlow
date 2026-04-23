import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardFormData } from "../ClientWizard";

const TONES = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "inspirador", label: "Inspirador" },
  { value: "educativo", label: "Educativo" },
  { value: "bem-humorado", label: "Bem-humorado" },
] as const;

const PILLAR_SUGGESTIONS = [
  "Produtividade", "Liderança", "Marketing Digital", "Vendas", "Inovação",
  "Carreira", "Empreendedorismo", "Finanças", "Saúde", "Educação",
];

interface Props {
  form: UseFormReturn<WizardFormData>;
}

export function Step2Voice({ form }: Props) {
  const [pillarInput, setPillarInput] = useState("");
  const [forbiddenInput, setForbiddenInput] = useState("");

  const pillars: string[] = form.watch("content_pillars") ?? [];
  const forbidden: string[] = form.watch("forbidden_words") ?? [];

  function addPillar(value: string) {
    const trimmed = value.trim();
    if (!trimmed || pillars.includes(trimmed) || pillars.length >= 5) return;
    form.setValue("content_pillars", [...pillars, trimmed]);
    setPillarInput("");
  }

  function removePillar(p: string) {
    form.setValue("content_pillars", pillars.filter((x) => x !== p));
  }

  function addForbidden(value: string) {
    const trimmed = value.trim();
    if (!trimmed || forbidden.includes(trimmed)) return;
    form.setValue("forbidden_words", [...forbidden, trimmed]);
    setForbiddenInput("");
  }

  function removeForbidden(w: string) {
    form.setValue("forbidden_words", forbidden.filter((x) => x !== w));
  }

  const selectedTone = form.watch("tone_of_voice");

  return (
    <div className="space-y-5">
      {/* Tom de voz */}
      <FormField
        control={form.control}
        name="tone_of_voice"
        render={() => (
          <FormItem>
            <FormLabel>Tom de voz</FormLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {TONES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue("tone_of_voice", value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm transition-colors",
                    selectedTone === value
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

      {/* Pilares de conteúdo */}
      <FormItem>
        <FormLabel>Pilares de conteúdo <span className="text-muted-foreground font-normal">(máx. 5)</span></FormLabel>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Produtividade..."
            value={pillarInput}
            onChange={(e) => setPillarInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addPillar(pillarInput); }
            }}
            disabled={pillars.length >= 5}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addPillar(pillarInput)}
            disabled={pillars.length >= 5}
          >
            Adicionar
          </Button>
        </div>
        {pillars.length === 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {PILLAR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addPillar(s)}
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
        {pillars.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pillars.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1">
                {p}
                <button type="button" onClick={() => removePillar(p)}>
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </FormItem>

      {/* Público-alvo */}
      <FormField
        control={form.control}
        name="target_audience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Público-alvo</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Ex: Empreendedores de 30-45 anos que querem escalar seus negócios online"
                rows={2}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Palavras proibidas */}
      <FormItem>
        <FormLabel>Palavras que NÃO deve usar <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: barato, perfeito..."
            value={forbiddenInput}
            onChange={(e) => setForbiddenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addForbidden(forbiddenInput); }
            }}
          />
          <Button type="button" variant="outline" onClick={() => addForbidden(forbiddenInput)}>
            Adicionar
          </Button>
        </div>
        {forbidden.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {forbidden.map((w) => (
              <Badge key={w} variant="destructive" className="gap-1 bg-destructive/20 text-destructive border-destructive/30">
                {w}
                <button type="button" onClick={() => removeForbidden(w)}>
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </FormItem>
    </div>
  );
}
