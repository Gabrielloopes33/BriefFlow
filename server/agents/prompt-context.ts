import type { AgentState } from './state';

export function buildClientContextBlock(
  state: Pick<AgentState, 'clientKnowledgeContext' | 'clientVisualContext'>
): string {
  const sections: string[] = [];

  if (state.clientKnowledgeContext?.trim()) {
    sections.push(`## Base de conhecimento do cliente\n${state.clientKnowledgeContext.trim()}`);
  }

  if (state.clientVisualContext?.trim()) {
    sections.push(`## Referências visuais do cliente\n${state.clientVisualContext.trim()}`);
  }

  return sections.length > 0 ? `${sections.join('\n\n')}\n\n` : '';
}