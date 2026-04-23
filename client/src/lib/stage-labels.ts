export const stageLabels: Record<string, string> = {
  validating_input: "Preparando sua solicitação...",
  fetching_sources: "Buscando suas fontes de referência...",
  crawling_content: "Pesquisando referências relevantes...",
  extracting_insights: "Analisando o que funcionou no seu perfil...",
  drafting_post: "Redigindo o conteúdo...",
  finalizing: "Revisando a qualidade e finalizando...",
  "agent:metrics-analyst": "Analisando sua performance histórica...",
  "agent:references": "Selecionando referências relevantes...",
  "agent:writer": "Escrevendo o conteúdo...",
  "agent:reviewer": "Revisando qualidade...",
};

export function resolveStageLabel(stage?: string): string {
  if (!stage) return "Preparando sua solicitação...";
  return stageLabels[stage] ?? "Trabalhando no seu conteúdo...";
}
