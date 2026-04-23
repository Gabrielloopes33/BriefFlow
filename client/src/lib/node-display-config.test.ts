/**
 * Tests for Node Display Config (S6-05)
 */

import { describe, it, expect } from "vitest";
import { NODE_DISPLAY_CONFIG, getNodeDisplayInfo, getNodeStatusClasses } from "./node-display-config";

describe("node-display-config", () => {
  // ─────────────────────────────────────────────
  // CT-S6-05-001: Todos os tipos têm config
  // ─────────────────────────────────────────────
  it("has display config for all node types", () => {
    const types = [
      "researcher",
      "metrics-analyst",
      "references",
      "writer",
      "reviewer",
      "visual-formatter",
      "custom",
    ];

    for (const type of types) {
      const info = getNodeDisplayInfo(type);
      expect(info.label).toBeDefined();
      expect(info.icon).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.color).toBeDefined();
    }
  });

  // ─────────────────────────────────────────────
  // CT-S6-05-002: Fallback para custom
  // ─────────────────────────────────────────────
  it("falls back to custom for unknown types", () => {
    const info = getNodeDisplayInfo("unknown_type_xyz");
    expect(info.label).toBe("Agente Customizado");
    expect(info.icon).toBe("⚙️");
  });

  // ─────────────────────────────────────────────
  // CT-S6-05-003: Classes de status
  // ─────────────────────────────────────────────
  it("returns correct Tailwind classes for each status", () => {
    const idle = getNodeStatusClasses("idle", "blue");
    expect(idle).toContain("border-gray-300");

    const running = getNodeStatusClasses("running", "blue");
    expect(running).toContain("animate-pulse");

    const completed = getNodeStatusClasses("completed", "green");
    expect(completed).toContain("border-green-500");

    const failed = getNodeStatusClasses("failed", "blue");
    expect(failed).toContain("border-red-400");
  });

  // ─────────────────────────────────────────────
  // CT-S6-05-004: Nomes amigáveis não técnicos
  // ─────────────────────────────────────────────
  it("uses human-friendly names, not technical types", () => {
    expect(getNodeDisplayInfo("researcher").label).toBe("Pesquisador");
    expect(getNodeDisplayInfo("metrics-analyst").label).toBe("Analista de Performance");
    expect(getNodeDisplayInfo("references").label).toBe("Curador de Referências");
    expect(getNodeDisplayInfo("writer").label).toBe("Redator Estratégico");
    expect(getNodeDisplayInfo("reviewer").label).toBe("Revisor de Qualidade");
  });
});
