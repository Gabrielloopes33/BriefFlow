import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useCreateClient } from "@/hooks/use-clients";
import { apiPut } from "@/lib/api";
import { Step1Identity } from "./steps/Step1Identity";
import { Step2Voice } from "./steps/Step2Voice";
import { Step3Sources } from "./steps/Step3Sources";
import { Step4Examples } from "./steps/Step4Examples";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SourceItem {
  url: string;
  type: "blog" | "youtube" | "instagram" | "linkedin";
}

export interface ExamplePost {
  url: string;
  engagement: number;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const wizardSchema = z.object({
  // Step 1
  name: z.string().min(1, "Nome é obrigatório"),
  niche: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  description: z.string().max(200).optional(),
  // Step 2
  tone_of_voice: z.string().optional(),
  content_pillars: z.array(z.string()).max(5).optional(),
  target_audience: z.string().optional(),
  forbidden_words: z.array(z.string()).optional(),
  // Step 3
  sources: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
  // Step 4
  example_posts: z.array(z.object({ url: z.string(), engagement: z.number() })).optional(),
  preferred_format: z.string().optional(),
});

export type WizardFormData = z.infer<typeof wizardSchema>;

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Identidade", description: "Nome e segmento" },
  { label: "Voz e tom", description: "Comunicação e pilares" },
  { label: "Fontes", description: "Referências de conteúdo" },
  { label: "Exemplos", description: "Posts de sucesso" },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, wizard starts in edit mode for an existing client */
  editClientId?: string;
  editInitialData?: Partial<WizardFormData>;
}

export function ClientWizard({ open, onOpenChange, editClientId, editInitialData }: Props) {
  const [step, setStep] = useState(0);
  const [createdClientId, setCreatedClientId] = useState<string | null>(editClientId ?? null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [, setLocation] = useLocation();

  const createClient = useCreateClient();

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: editInitialData ?? {
      name: "",
      niche: "",
      website: "",
      description: "",
      tone_of_voice: undefined,
      content_pillars: [],
      target_audience: "",
      forbidden_words: [],
      sources: [],
      example_posts: [],
      preferred_format: undefined,
    },
  });

  // Save/update client data at given step
  const persistStep = useCallback(async (data: WizardFormData) => {
    setSaving(true);
    try {
      if (!createdClientId) {
        // Step 1 — create client
        const client = await createClient.mutateAsync({
          name: data.name,
          niche: data.niche,
          description: data.description,
        });
        setCreatedClientId(client.id);
      } else {
        // Subsequent steps — patch
        const patch: Record<string, unknown> = {};
        if (step === 0) {
          patch.name = data.name;
          patch.niche = data.niche;
          patch.description = data.description;
        } else if (step === 1) {
          patch.tone_of_voice = data.tone_of_voice;
          patch.content_pillars = data.content_pillars;
          patch.target_audience = data.target_audience;
          patch.forbidden_words = data.forbidden_words;
        } else if (step === 2) {
          patch.sources = data.sources;
        } else if (step === 3) {
          patch.example_posts = data.example_posts;
          patch.preferred_format = data.preferred_format;
        }
        await apiPut(`/api/clients/${createdClientId}`, patch);
      }
    } finally {
      setSaving(false);
    }
  }, [createdClientId, createClient, step]);

  const handleNext = async () => {
    // Validate only step 1 fields by default (step 0 required)
    if (step === 0) {
      const valid = await form.trigger(["name"]);
      if (!valid) return;
    }
    const data = form.getValues();
    await persistStep(data);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Finish
      setDone(true);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleClose = () => {
    if (done && createdClientId) {
      // Redirect to Studio with this client pre-selected
      localStorage.setItem("bf_studio_client_id", createdClientId);
      setLocation("/studio");
    }
    onOpenChange(false);
    // Reset state after close
    setTimeout(() => {
      setStep(0);
      setCreatedClientId(editClientId ?? null);
      setDone(false);
      form.reset(editInitialData ?? {});
    }, 300);
  };

  const progressPct = done ? 100 : ((step) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {editClientId ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? "Cliente salvo com sucesso!"
              : `Etapa ${step + 1} de ${STEPS.length} — ${STEPS[step].description}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span
                key={s.label}
                className={i <= step || done ? "text-primary font-medium" : ""}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-400" />
            <h3 className="text-lg font-semibold">Tudo certo!</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              O cliente foi criado com sucesso. Você será redirecionado ao Studio com este cliente selecionado.
            </p>
            <Button onClick={handleClose} className="mt-2">
              Ir para o Studio
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form className="space-y-4 pt-2" onSubmit={(e) => e.preventDefault()}>
              {step === 0 && <Step1Identity form={form} />}
              {step === 1 && <Step2Voice form={form} />}
              {step === 2 && <Step3Sources form={form} />}
              {step === 3 && <Step4Examples form={form} />}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={step === 0 ? handleClose : handleBack}
                  disabled={saving}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {step === 0 ? "Cancelar" : "Voltar"}
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  {step === STEPS.length - 1 ? "Finalizar" : "Próximo"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
