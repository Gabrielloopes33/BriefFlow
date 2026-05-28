/**
 * State Merger — Merge determinístico de AgentState após execução paralela
 * Garante que campos de nós paralelos sejam combinados sem sobrescrever
 */

import type { AgentState } from './state';

/**
 * Faz merge de um estado parcial no estado base
 * - Arrays: concatenam (sources, references, errors)
 * - Objetos: merge profundo (metadata, analyticsInsights)
 * - Primitivos: o parcial sobrescreve o base
 */
export function mergeState(base: AgentState, partial: Partial<AgentState>): AgentState {
  return {
    ...base,
    ...partial,
    // Arrays: concatenar, não substituir
    sources: [...base.sources, ...(partial.sources ?? [])],
    references: [...(base.references ?? []), ...(partial.references ?? [])],
    errors: [...base.errors, ...(partial.errors ?? [])],
    // Objetos: merge profundo
    creativeId: partial.creativeId ?? base.creativeId,
    analyticsInsights: partial.analyticsInsights ?? base.analyticsInsights,
    htmlSlideConfigs: partial.htmlSlideConfigs ?? base.htmlSlideConfigs,
    htmlSlides: partial.htmlSlides ?? base.htmlSlides,
    imagePrompts: partial.imagePrompts ?? base.imagePrompts,
    imageUrls: partial.imageUrls ?? base.imageUrls,
    draft: partial.draft
      ? { ...base.draft, ...partial.draft }
      : base.draft,
    review: partial.review
      ? { ...base.review, ...partial.review }
      : base.review,
    metadata: {
      ...base.metadata,
      ...partial.metadata,
      totalTokens: base.metadata.totalTokens + (partial.metadata?.totalTokens ?? 0),
      totalLatency: base.metadata.totalLatency + (partial.metadata?.totalLatency ?? 0),
      models: [...base.metadata.models, ...(partial.metadata?.models ?? [])],
    },
  };
}
