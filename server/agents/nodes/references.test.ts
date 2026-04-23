/**
 * Tests for References Node (S6-03)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { referencesNode } from "./references";
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

// Mock crawler-provider
const mockCrawlBatch = vi.fn();

vi.mock("../../services/crawler-provider", () => ({
  selectProvider: vi.fn(() => ({
    crawlBatch: mockCrawlBatch,
  })),
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

describe("references node", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockChatCompletion.mockReset();
    mockCrawlBatch.mockReset();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CT-S6-03-001: Fontes cadastradas → references com ângulos
  // ─────────────────────────────────────────────
  it("returns ranked references when sources exist", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { url: "https://blog.com/post1", source_type: "blog", title: "Post 1" },
        { url: "https://blog.com/post2", source_type: "blog", title: "Post 2" },
      ],
    });

    mockCrawlBatch.mockResolvedValueOnce({
      contents: [
        { url: "https://blog.com/post1", title: "Post 1", content_text: "Content about AI", source_type: "blog" },
        { url: "https://blog.com/post2", title: "Post 2", content_text: "Content about marketing", source_type: "blog" },
      ],
      total_urls: 2,
      successful: 2,
      failed: 0,
    });

    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        references: [
          { title: "Post 1", url: "https://blog.com/post1", summary: "About AI", angle: "Use AI for productivity", relevanceScore: 0.92 },
          { title: "Post 2", url: "https://blog.com/post2", summary: "About marketing", angle: "Marketing strategies", relevanceScore: 0.85 },
        ],
      }),
      usage: { total_tokens: 200 },
      model: "moonshot-v1-8k",
      provider: "moonshot" as const,
    });

    const result = await referencesNode(makeState());

    expect(result.references).toBeDefined();
    expect(result.references).toHaveLength(2);
    expect(result.references![0].title).toBe("Post 1");
    expect(result.references![0].relevanceScore).toBe(0.92);
    expect(result.references![0].angle).toBe("Use AI for productivity");
    expect(result.metadata!.totalTokens).toBe(200);
  });

  // ─────────────────────────────────────────────
  // CT-S6-03-002: Zero fontes → array vazio
  // ─────────────────────────────────────────────
  it("returns empty array when no sources registered", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await referencesNode(makeState());

    expect(result.references).toBeDefined();
    expect(result.references).toEqual([]);
  });

  // ─────────────────────────────────────────────
  // CT-S6-03-003: Erro crawler → graceful
  // ─────────────────────────────────────────────
  it("handles crawler error gracefully", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ url: "https://blog.com/post1", source_type: "blog", title: "Post 1" }],
    });

    mockCrawlBatch.mockRejectedValueOnce(new Error("Crawler timeout"));

    const result = await referencesNode(makeState());

    expect(result.references).toBeDefined();
    expect(result.references).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].node).toBe("references");
  });

  // ─────────────────────────────────────────────
  // CT-S6-03-004: Erro LLM → graceful
  // ─────────────────────────────────────────────
  it("handles LLM error gracefully", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ url: "https://blog.com/post1", source_type: "blog", title: "Post 1" }],
    });

    mockCrawlBatch.mockResolvedValueOnce({
      contents: [{ url: "https://blog.com/post1", title: "Post 1", content_text: "Content", source_type: "blog" }],
      total_urls: 1,
      successful: 1,
      failed: 0,
    });

    mockChatCompletion.mockRejectedValueOnce(new Error("LLM error"));

    const result = await referencesNode(makeState());

    expect(result.references).toBeDefined();
    expect(result.references).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});
