/**
 * Tests for State Merger (S6-04)
 */

import { describe, it, expect } from "vitest";
import { mergeState } from "./state-merger";
import type { AgentState } from "./state";

function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    jobId: "test-job",
    tenantId: "tenant-1",
    clientId: "client-1",
    userId: "user-1",
    channels: ["blog"],
    goal: "authority",
    language: "pt-BR",
    tone: "consultivo",
    titleHint: "Test",
    maxWords: 500,
    clientName: "Test Client",
    clientNiche: "tech",
    clientDescription: "A test client",
    sources: [{ url: "https://a.com", title: "A", content_text: "", source_type: "blog" }],
    research: "",
    draft: { title: "Original", content: "Original content" },
    review: { score: 0, feedback: "", approved: false },
    metadata: { totalTokens: 100, totalLatency: 500, models: ["gpt-4"] },
    retryCount: 0,
    errors: [],
    ...overrides,
  };
}

describe("mergeState", () => {
  // ─────────────────────────────────────────────
  // CT-S6-04-001: Merge básico de primitivos
  // ─────────────────────────────────────────────
  it("overrides primitives from partial", () => {
    const base = makeState({ research: "old research" });
    const partial = { research: "new research" };

    const result = mergeState(base, partial);

    expect(result.research).toBe("new research");
    expect(result.clientName).toBe("Test Client"); // preservado
  });

  // ─────────────────────────────────────────────
  // CT-S6-04-002: Arrays concatenam
  // ─────────────────────────────────────────────
  it("concatenates arrays (sources, references, errors)", () => {
    const base = makeState({
      sources: [{ url: "https://a.com", title: "A", content_text: "", source_type: "blog" }],
      references: [{ title: "Ref A", url: "", summary: "", angle: "", relevanceScore: 0.5 }],
      errors: [{ node: "n1", message: "err1", timestamp: "2024-01-01" }],
    });
    const partial = {
      sources: [{ url: "https://b.com", title: "B", content_text: "", source_type: "blog" }],
      references: [{ title: "Ref B", url: "", summary: "", angle: "", relevanceScore: 0.8 }],
      errors: [{ node: "n2", message: "err2", timestamp: "2024-01-02" }],
    };

    const result = mergeState(base, partial);

    expect(result.sources).toHaveLength(2);
    expect(result.references).toHaveLength(2);
    expect(result.errors).toHaveLength(2);
  });

  // ─────────────────────────────────────────────
  // CT-S6-04-003: Metadata soma tokens/latência
  // ─────────────────────────────────────────────
  it("sums metadata tokens and latency", () => {
    const base = makeState({
      metadata: { totalTokens: 100, totalLatency: 500, models: ["gpt-4"] },
    });
    const partial = {
      metadata: { totalTokens: 200, totalLatency: 300, models: ["moonshot"] },
    };

    const result = mergeState(base, partial);

    expect(result.metadata.totalTokens).toBe(300);
    expect(result.metadata.totalLatency).toBe(800);
    expect(result.metadata.models).toEqual(["gpt-4", "moonshot"]);
  });

  // ─────────────────────────────────────────────
  // CT-S6-04-004: analyticsInsights não sobrescreve
  // ─────────────────────────────────────────────
  it("preserves analyticsInsights if partial has none", () => {
    const base = makeState({
      analyticsInsights: {
        topFormats: ["carrossel"],
        topTopics: ["produtividade"],
        avgEngagementRate: 0.05,
        bestPostingHours: ["18:00"],
        recentWins: [],
        insightSummary: "Summary",
        dataSource: "meta_cache",
        lastUpdated: "2024-01-01",
      },
    });
    const partial = { research: "new research" };

    const result = mergeState(base, partial);

    expect(result.analyticsInsights).toBeDefined();
    expect(result.analyticsInsights!.topFormats).toContain("carrossel");
  });

  // ─────────────────────────────────────────────
  // CT-S6-04-005: Merge de draft
  // ─────────────────────────────────────────────
  it("merges draft objects deeply", () => {
    const base = makeState({ draft: { title: "Original", content: "Original content" } });
    const partial = { draft: { title: "Updated", content: "" } };

    const result = mergeState(base, partial);

    expect(result.draft.title).toBe("Updated");
    expect(result.draft.content).toBe("");
  });

  // ─────────────────────────────────────────────
  // CT-S6-04-006: Partial vazio não altera nada
  // ─────────────────────────────────────────────
  it("does not modify state when partial is empty", () => {
    const base = makeState();
    const result = mergeState(base, {});

    expect(result.clientName).toBe("Test Client");
    expect(result.metadata.totalTokens).toBe(100);
    expect(result.sources).toHaveLength(1);
  });
});
