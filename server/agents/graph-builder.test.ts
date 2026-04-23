/**
 * Tests for graph-builder.ts
 * Sprint 5 — Story S5-03: Custom Nodes Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildGraph, AgentGraph, validateGraph, type AgentGraphDefinition } from './graph-builder';
import { registerNode, clearRegistry, type NodeHandler } from './node-registry';
import type { AgentState } from './state';

// Helper: estado mínimo
function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    jobId: 'test-job',
    tenantId: 'tenant-1',
    clientId: 'client-1',
    userId: 'user-1',
    channels: ['blog'],
    goal: 'authority',
    language: 'pt-BR',
    tone: 'consultivo',
    titleHint: 'Test',
    maxWords: 500,
    clientName: 'Test Client',
    clientNiche: 'tech',
    clientDescription: 'A test client',
    sources: [],
    research: '',
    draft: { title: '', content: '' },
    review: { score: 0, feedback: '', approved: false },
    metadata: { totalTokens: 0, totalLatency: 0, models: [] },
    retryCount: 0,
    errors: [],
    ...overrides,
  };
}

// Handlers dummy
const researcherHandler: NodeHandler = async (state) => ({
  research: `Research for ${state.clientName}`,
});

const writerHandler: NodeHandler = async (state) => ({
  draft: {
    title: `Post about ${state.research || 'general'}`,
    content: 'Generated content',
  },
});

const reviewerHandler: NodeHandler = async (state) => ({
  review: { score: 8, feedback: 'Good', approved: true },
});

const failingHandler: NodeHandler = async () => {
  throw new Error('Node execution failed');
};

describe('graph-builder', () => {
  beforeEach(() => {
    clearRegistry();
    registerNode('researcher', researcherHandler);
    registerNode('writer', writerHandler);
    registerNode('reviewer', reviewerHandler);
  });

  // ─────────────────────────────────────────────
  // validateGraph
  // ─────────────────────────────────────────────
  describe('validateGraph', () => {
    it('should pass for all known node types', () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Test Graph',
        nodes: [
          { id: 'n1', agentId: 'a1', type: 'researcher' },
          { id: 'n2', agentId: 'a2', type: 'writer' },
        ],
        edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      };
      expect(() => validateGraph(def)).not.toThrow();
    });

    it('should throw for unknown node types', () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Test Graph',
        nodes: [
          { id: 'n1', agentId: 'a1', type: 'researcher' },
          { id: 'n2', agentId: 'a2', type: 'custom_xyz' },
        ],
        edges: [],
      };
      expect(() => validateGraph(def)).toThrow("custom_xyz");
      expect(() => validateGraph(def)).toThrow("Available types");
    });

    it('should include graph name in error', () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'My Graph',
        nodes: [{ id: 'n1', agentId: 'a1', type: 'unknown' }],
        edges: [],
      };
      expect(() => validateGraph(def)).toThrow("My Graph");
    });
  });

  // ─────────────────────────────────────────────
  // buildGraph
  // ─────────────────────────────────────────────
  describe('buildGraph', () => {
    it('should create AgentGraph instance', () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Test',
        nodes: [],
        edges: [],
      };
      const graph = buildGraph(def);
      expect(graph).toBeInstanceOf(AgentGraph);
    });
  });

  // ─────────────────────────────────────────────
  // AgentGraph.execute
  // ─────────────────────────────────────────────
  describe('AgentGraph.execute', () => {
    it('should execute researcher → writer → reviewer pipeline', async () => {
      const def: AgentGraphDefinition = {
        id: 'pipeline',
        tenantId: 't1',
        name: 'Pipeline',
        nodes: [
          { id: 'researcher', agentId: 'a1', type: 'researcher' },
          { id: 'writer', agentId: 'a2', type: 'writer' },
          { id: 'reviewer', agentId: 'a3', type: 'reviewer' },
        ],
        edges: [
          { id: 'e1', from: 'researcher', to: 'writer' },
          { id: 'e2', from: 'writer', to: 'reviewer' },
        ],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState({ clientName: 'Acme' }));

      expect(result.status).toBe('completed');
      expect(result.finalState.research).toBe('Research for Acme');
      expect(result.finalState.draft.title).toBe('Post about Research for Acme');
      expect(result.finalState.review.approved).toBe(true);
    });

    it('should return failed status when node throws', async () => {
      clearRegistry();
      registerNode('failing', failingHandler);

      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Failing Graph',
        nodes: [{ id: 'n1', agentId: 'a1', type: 'failing' }],
        edges: [],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.status).toBe('failed');
      expect(result.nodeResults[0].status).toBe('failed');
      expect(result.nodeResults[0].error).toContain('Node execution failed');
      expect(result.finalState.errors).toHaveLength(1);
    });

    it('should fail fast on validation error before execution', async () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Invalid Graph',
        nodes: [{ id: 'n1', agentId: 'a1', type: 'unknown_type' }],
        edges: [],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.status).toBe('failed');
      expect(result.nodeResults[0].nodeId).toBe('graph-validation');
      expect(result.nodeResults[0].error).toContain('unknown_type');
    });

    it('should call onNodeStart and onNodeComplete callbacks', async () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Callbacks',
        nodes: [
          { id: 'researcher', agentId: 'a1', type: 'researcher' },
          { id: 'writer', agentId: 'a2', type: 'writer' },
        ],
        edges: [{ id: 'e1', from: 'researcher', to: 'writer' }],
      };
      const graph = buildGraph(def);

      const started: string[] = [];
      const completed: string[] = [];

      await graph.execute(makeState(), {
        onNodeStart: (nodeId) => started.push(nodeId),
        onNodeComplete: (nodeId) => completed.push(nodeId),
      });

      expect(started).toEqual(['researcher', 'writer']);
      expect(completed).toEqual(['researcher', 'writer']);
    });

    it('should handle conditional edges', async () => {
      const approvedHandler: NodeHandler = async () => ({
        review: { score: 9, feedback: 'Great', approved: true },
      });
      const publishHandler: NodeHandler = async () => ({
        draft: { title: 'Published', content: 'Content' },
      });

      clearRegistry();
      registerNode('reviewer_approved', approvedHandler);
      registerNode('publish', publishHandler);

      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Conditional',
        nodes: [
          { id: 'review', agentId: 'a1', type: 'reviewer_approved' },
          { id: 'publish', agentId: 'a2', type: 'publish' },
          { id: 'revise', agentId: 'a3', type: 'publish' }, // reusa handler para teste
        ],
        edges: [
          { id: 'e1', from: 'review', to: 'publish', condition: 'review.approved === true' },
          { id: 'e2', from: 'review', to: 'revise', condition: 'review.approved === false' },
        ],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.status).toBe('completed');
      // Com approved=true, apenas o caminho para 'publish' deve ser seguido
      const visitedNodes = result.nodeResults.map((r) => r.nodeId);
      expect(visitedNodes).toContain('review');
      expect(visitedNodes).toContain('publish');
    });

    it('should merge state across nodes', async () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Merge',
        nodes: [
          { id: 'researcher', agentId: 'a1', type: 'researcher' },
          { id: 'writer', agentId: 'a2', type: 'writer' },
        ],
        edges: [{ id: 'e1', from: 'researcher', to: 'writer' }],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState({ clientName: 'Acme' }));

      // Estado deve conter tanto research quanto draft
      expect(result.finalState.research).toBe('Research for Acme');
      expect(result.finalState.draft.title).toContain('Research for Acme');
      // Metadados originais devem ser preservados
      expect(result.finalState.clientName).toBe('Acme');
    });

    it('should handle empty graph', async () => {
      const def: AgentGraphDefinition = {
        id: 'empty',
        tenantId: 't1',
        name: 'Empty',
        nodes: [],
        edges: [],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.status).toBe('completed');
      expect(result.nodeResults).toHaveLength(0);
    });

    it('should pass config to node handlers', async () => {
      const configHandler: NodeHandler = async (state, config) => ({
        research: config?.customParam || 'no-config',
      });
      clearRegistry();
      registerNode('configurable', configHandler);

      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Config',
        nodes: [{ id: 'n1', agentId: 'a1', type: 'configurable', config: { customParam: 'hello' } }],
        edges: [],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.finalState.research).toBe('hello');
    });

    it('should execute parallel nodes (metrics-analyst + references → writer)', async () => {
      const metricsHandler: NodeHandler = async (state) => ({
        analyticsInsights: {
          topFormats: ['carrossel'],
          topTopics: ['produtividade'],
          avgEngagementRate: 0.05,
          bestPostingHours: ['18:00'],
          recentWins: [],
          insightSummary: 'Carrosséis funcionam bem',
          dataSource: 'meta_cache' as const,
          lastUpdated: new Date().toISOString(),
        },
      });

      const referencesHandler: NodeHandler = async (state) => ({
        references: [
          { title: 'Ref 1', url: 'https://example.com', summary: 'Summary', angle: 'Angle', relevanceScore: 0.9 },
        ],
      });

      const writerHandler: NodeHandler = async (state) => ({
        draft: {
          title: `Post with ${state.analyticsInsights?.topFormats[0] || 'no'} format and ${state.references?.length || 0} refs`,
          content: 'Generated content',
        },
      });

      clearRegistry();
      registerNode('metrics-analyst', metricsHandler);
      registerNode('references', referencesHandler);
      registerNode('writer', writerHandler);

      const def: AgentGraphDefinition = {
        id: 'parallel',
        tenantId: 't1',
        name: 'Parallel',
        nodes: [
          { id: 'metrics', agentId: 'a1', type: 'metrics-analyst' },
          { id: 'refs', agentId: 'a2', type: 'references' },
          { id: 'writer', agentId: 'a3', type: 'writer' },
        ],
        edges: [
          { id: 'e1', from: 'metrics', to: 'writer' },
          { id: 'e2', from: 'refs', to: 'writer' },
        ],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      expect(result.status).toBe('completed');
      // Writer recebeu estado mergeado de ambos os nós paralelos
      expect(result.finalState.analyticsInsights).toBeDefined();
      expect(result.finalState.references).toHaveLength(1);
      expect(result.finalState.draft.title).toContain('carrossel');
      expect(result.finalState.draft.title).toContain('1 refs');
      // Ambos os nós paralelos devem ter sido executados
      const visitedNodes = result.nodeResults.map((r) => r.nodeId);
      expect(visitedNodes).toContain('metrics');
      expect(visitedNodes).toContain('refs');
      expect(visitedNodes).toContain('writer');
    });

    it('should continue when one parallel node fails', async () => {
      const metricsHandler: NodeHandler = async () => {
        throw new Error('Metrics failed');
      };

      const referencesHandler: NodeHandler = async (state) => ({
        references: [{ title: 'Ref 1', url: 'https://example.com', summary: 'S', angle: 'A', relevanceScore: 0.9 }],
      });

      const writerHandler: NodeHandler = async (state) => ({
        draft: {
          title: `Post with ${state.references?.length || 0} refs`,
          content: 'Generated content',
        },
      });

      clearRegistry();
      registerNode('metrics-analyst', metricsHandler);
      registerNode('references', referencesHandler);
      registerNode('writer', writerHandler);

      const def: AgentGraphDefinition = {
        id: 'partial-fail',
        tenantId: 't1',
        name: 'Partial Fail',
        nodes: [
          { id: 'metrics', agentId: 'a1', type: 'metrics-analyst' },
          { id: 'refs', agentId: 'a2', type: 'references' },
          { id: 'writer', agentId: 'a3', type: 'writer' },
        ],
        edges: [
          { id: 'e1', from: 'metrics', to: 'writer' },
          { id: 'e2', from: 'refs', to: 'writer' },
        ],
      };
      const graph = buildGraph(def);
      const result = await graph.execute(makeState());

      // Status é failed porque um nó falhou, mas writer ainda executou
      expect(result.status).toBe('failed');
      expect(result.finalState.references).toHaveLength(1);
      expect(result.finalState.draft.title).toContain('1 refs');
      const metricsResult = result.nodeResults.find((r) => r.nodeId === 'metrics');
      expect(metricsResult?.status).toBe('failed');
      const refsResult = result.nodeResults.find((r) => r.nodeId === 'refs');
      expect(refsResult?.status).toBe('completed');
    });

    it('should emit onNodeStart for each parallel node individually', async () => {
      const delayHandler: NodeHandler = async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { research: 'done' };
      };

      clearRegistry();
      registerNode('delay', delayHandler);

      const def: AgentGraphDefinition = {
        id: 'parallel-start',
        tenantId: 't1',
        name: 'Parallel Start',
        nodes: [
          { id: 'n1', agentId: 'a1', type: 'delay' },
          { id: 'n2', agentId: 'a2', type: 'delay' },
        ],
        edges: [],
      };
      const graph = buildGraph(def);

      const started: string[] = [];
      await graph.execute(makeState(), {
        onNodeStart: (nodeId) => started.push(nodeId),
      });

      expect(started).toContain('n1');
      expect(started).toContain('n2');
      expect(started).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────
  // AgentGraph accessors
  // ─────────────────────────────────────────────
  describe('AgentGraph accessors', () => {
    it('should return definition, nodes and edges', () => {
      const def: AgentGraphDefinition = {
        id: 'g1',
        tenantId: 't1',
        name: 'Test',
        nodes: [
          { id: 'n1', agentId: 'a1', type: 'researcher' },
        ],
        edges: [],
      };
      const graph = buildGraph(def);

      expect(graph.getDefinition()).toEqual(def);
      expect(graph.getNodes()).toHaveLength(1);
      expect(graph.getEdges()).toHaveLength(0);
    });
  });
});
