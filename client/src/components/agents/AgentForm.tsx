import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAgent, useUpdateAgent, type Agent } from "@/hooks/use-agents";

const agentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  role: z.enum(["researcher", "writer", "reviewer", "custom"]),
  system_prompt: z.string().min(1, "Prompt do sistema é obrigatório"),
  model: z.string().default("gpt-4o-mini"),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(128).max(4096).default(2048),
});

type AgentFormData = z.infer<typeof agentSchema>;

const ROLE_OPTIONS = [
  { value: "researcher", label: "Pesquisador — Coleta e sintetiza fontes" },
  { value: "writer", label: "Redator — Gera conteúdo com contexto" },
  { value: "reviewer", label: "Revisor — Avalia qualidade do output" },
  { value: "custom", label: "Custom — Agente genérico" },
];

const MODEL_OPTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "claude-3-haiku",
  "claude-3-sonnet",
];

const PROMPT_TEMPLATES: Record<string, string> = {
  researcher: `Você é um pesquisador especializado. Analise as fontes fornecidas e extraia:
1. Tendências e insights principais
2. Dados relevantes para o nicho do cliente
3. Ângulos de conteúdo que podem ser explorados
4. Lacunas de informação que o post pode preencher

Seja conciso e estruturado. Máximo 800 palavras.`,
  writer: `Você é um redator especialista em marketing de conteúdo.
Regras:
1. Escreva no idioma solicitado
2. Respeite o tom de voz do cliente
3. Use os insights da pesquisa para enriquecer o conteúdo
4. Inclua título e corpo do texto
5. Respeite o limite aproximado de palavras`,
  reviewer: `Você é um editor de conteúdo sênior. Avalie o post segundo critérios objetivos.
Responda APENAS em formato JSON com esta estrutura:
{
  "score": number (0-10),
  "feedback": "string com pontos fortes e fracos",
  "approved": boolean,
  "suggestions": ["array de sugestões específicas"]
}

Critérios:
- Clareza e coesão (0-3)
- Relevância para o público (0-3)
- Originalidade (0-2)
- Adequação ao tom (0-2)`,
  custom: `Você é um assistente de IA especializado. Siga as instruções do usuário com precisão.`,
};

interface AgentFormProps {
  agent?: Agent;
  onSuccess?: () => void;
}

export function AgentForm({ agent, onSuccess }: AgentFormProps) {
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description,
          role: agent.role,
          system_prompt: agent.system_prompt,
          model: agent.model,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
        }
      : {
          name: "",
          description: "",
          role: "custom",
          system_prompt: PROMPT_TEMPLATES.custom,
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 2048,
        },
  });

  const selectedRole = form.watch("role");

  const onSubmit = (data: AgentFormData) => {
    if (agent) {
      updateAgent.mutate(
        { id: agent.id, data },
        { onSuccess }
      );
    } else {
      createAgent.mutate(data, { onSuccess });
    }
  };

  const applyTemplate = (role: string) => {
    form.setValue("system_prompt", PROMPT_TEMPLATES[role] || PROMPT_TEMPLATES.custom);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Agente</Label>
          <Input
            id="name"
            placeholder="Ex: Pesquisador de Tendências"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Função</Label>
          <Select
            value={selectedRole}
            onValueChange={(value: any) => {
              form.setValue("role", value);
              applyTemplate(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          placeholder="Breve descrição do que este agente faz"
          {...form.register("description")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="system_prompt">Prompt do Sistema</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyTemplate(selectedRole)}
          >
            Aplicar Template
          </Button>
        </div>
        <Textarea
          id="system_prompt"
          rows={8}
          placeholder="Instruções de sistema para o agente..."
          {...form.register("system_prompt")}
        />
        {form.formState.errors.system_prompt && (
          <p className="text-sm text-destructive">
            {form.formState.errors.system_prompt.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">Modelo</Label>
          <Select
            value={form.watch("model")}
            onValueChange={(value) => form.setValue("model", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Temperatura: {form.watch("temperature")}</Label>
          <Slider
            value={[form.watch("temperature")]}
            onValueChange={([v]) => form.setValue("temperature", v)}
            min={0}
            max={2}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_tokens">Max Tokens</Label>
          <Input
            id="max_tokens"
            type="number"
            min={128}
            max={4096}
            {...form.register("max_tokens", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={createAgent.isPending || updateAgent.isPending}>
          {agent ? "Salvar Alterações" : "Criar Agente"}
        </Button>
      </div>
    </form>
  );
}
