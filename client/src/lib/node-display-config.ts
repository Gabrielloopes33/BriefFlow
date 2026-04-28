/**
 * Node Display Config — Mapeamento de tipos técnicos para nomes amigáveis
 * Usado no board visual para tornar a experiência compreensível
 */

export interface NodeDisplayInfo {
  label: string;
  icon: string;
  description: string;
  color: string;
  tailwindColor: string;
}

export const NODE_DISPLAY_CONFIG: Record<string, NodeDisplayInfo> = {
  researcher: {
    label: "Pesquisador",
    icon: "🔍",
    description: "Busca e analisa suas fontes de referência",
    color: "#3b82f6",
    tailwindColor: "blue",
  },
  "metrics-analyst": {
    label: "Analista de Performance",
    icon: "📊",
    description: "Lê o que funcionou no perfil do cliente",
    color: "#8b5cf6",
    tailwindColor: "violet",
  },
  references: {
    label: "Curador de Referências",
    icon: "📚",
    description: "Seleciona referências relevantes para o tema",
    color: "#f59e0b",
    tailwindColor: "amber",
  },
  writer: {
    label: "Redator Estratégico",
    icon: "✍️",
    description: "Cria o conteúdo com base nos insights",
    color: "#22c55e",
    tailwindColor: "green",
  },
  reviewer: {
    label: "Revisor de Qualidade",
    icon: "✅",
    description: "Avalia e pontua o conteúdo gerado",
    color: "#14b8a6",
    tailwindColor: "teal",
  },
  "visual-formatter": {
    label: "Formatador Visual",
    icon: "🎨",
    description: "Estrutura o conteúdo para carrossel",
    color: "#ec4899",
    tailwindColor: "pink",
  },
  custom: {
    label: "Agente Customizado",
    icon: "⚙️",
    description: "Agente de tipo personalizado",
    color: "#6b7280",
    tailwindColor: "gray",
  },
  start: {
    label: "Início",
    icon: "🚀",
    description: "Ponto de partida do fluxo",
    color: "#f97316",
    tailwindColor: "orange",
  },
};

/**
 * Retorna a configuração de display para um tipo de nó
 * Fallback para 'custom' se o tipo não estiver registrado
 */
export function getNodeDisplayInfo(type: string): NodeDisplayInfo {
  return NODE_DISPLAY_CONFIG[type] || NODE_DISPLAY_CONFIG.custom;
}

/**
 * Retorna as classes Tailwind para o status do nó
 */
export function getNodeStatusClasses(
  status: "idle" | "running" | "completed" | "failed" | undefined,
  colorName: string
): string {
  const base = "rounded-xl border-2 bg-background shadow-sm min-w-[160px] transition-all";

  switch (status) {
    case "running":
      return `${base} animate-pulse border-${colorName}-400 bg-${colorName}-50`;
    case "completed":
      return `${base} border-${colorName}-500 bg-${colorName}-50`;
    case "failed":
      return `${base} border-red-400 bg-red-50`;
    case "idle":
    default:
      return `${base} border-gray-300 bg-gray-50`;
  }
}
