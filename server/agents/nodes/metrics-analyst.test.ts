/**
 * Tests for Metrics Analyst Node (S6-02)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { metricsAnalystNode } from "./metrics-analyst";
import type { AgentState } from "../state";

// Mock pg-pool
const mockQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock("../../pg-pool", () => ({
  getClientForUser: vi.fn(async () => ({
    query: mockQuery,
    release: mockRelease,
  })),
}));

// Mock llm-provider
const mockChatCompletion = vi.fn();

vi.mock("../../services/llm-provider", () => ({
  createLLMClient: vi.fn(() => ({
    chatCompletion: mockChatCompletion,
  })),
  getDefaultModel: vi.fn(() => "moonshot-v1-8k"),
}));

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
    sources: [],
    research: "",
    draft: { title: "", content: "" },
    review: { score: 0, feedback: "", approved: false },
    metadata: { totalTokens: 0, totalLatency: 0, models: [] },
    retryCount: 0,
    errors: [],
    ...overrides,
  };
}

describe("metrics-analyst node", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockChatCompletion.mockReset();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CT-S6-02-001: Cache populada → insights gerados
  // ─────────────────────────────────────────────
  it("generates insights when cache is available", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        raw_data: { reach: 15000, engagement: 1200 },
        insights: { topFormats: ["carrossel"] },
        fetched_at: new Date(),
      }],
    });

    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        topFormats: ["carrossel", "reels"],
        topTopics: ["produtividade", "marketing"],
        avgEngagementRate: 0.045,
        bestPostingHours: ["18:00", "20:00"],
        recentWins: [{ format: "carrossel", topic: "produtividade", engagementRate: 0.08 }],
        insightSummary: "Carrosséis sobre produtividade têm melhor performance.",
      }),
      usage: { total_tokens: 150 },
      model: "moonshot-v1-8k",
      provider: "moonshot" as const,
    });

    const result = await metricsAnalystNode(makeState());

    expect(result.analyticsInsights).toBeDefined();
    expect(result.analyticsInsights!.dataSource).toBe("meta_cache");
    expect(result.analyticsInsights!.topFormats).toContain("carrossel");
    expect(result.analyticsInsights!.insightSummary).toBeDefined();
    expect(result.metadata!.totalTokens).toBe(150);
  });

  // ─────────────────────────────────────────────
  // CT-S6-02-002: Cache vazia → dataSource 'empty'
  // ─────────────────────────────────────────────
  it("returns empty insights when cache is missing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await metricsAnalystNode(makeState());

    expect(result.analyticsInsights).toBeDefined();
    expect(result.analyticsInsights!.dataSource).toBe("empty");
    expect(result.analyticsInsights!.topFormats).toEqual([]);
    expect(result.analyticsInsights!.insightSummary).toContain("Sem dados");
  });

  // ─────────────────────────────────────────────
  // CT-S6-02-003: Erro LLM → graceful fallback
  // ─────────────────────────────────────────────
  it("handles LLM error gracefully", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        raw_data: { reach: 15000 },
        insights: {},
        fetched_at: new Date(),
      }],
    });

    mockChatCompletion.mockRejectedValueOnce(new Error("LLM timeout"));

    const result = await metricsAnalystNode(makeState());

    expect(result.analyticsInsights).toBeDefined();
    expect(result.analyticsInsights!.dataSource).toBe("empty");
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].node).toBe("metrics-analyst");
  });

  // ─────────────────────────────────────────────
  // CT-S6-02-004: Erro DB → graceful fallback
  // ─────────────────────────────────────────────
  it("handles database error gracefully", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection failed"));

    const result = await metricsAnalystNode(makeState());

    expect(result.analyticsInsights).toBeDefined();
    expect(result.analyticsInsights!.dataSource).toBe("empty");
  });
});
