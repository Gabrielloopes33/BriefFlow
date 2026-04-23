/**
 * Tests for node-registry.ts
 * Sprint 5 — Story S5-03: Custom Nodes Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerNode,
  getNodeHandler,
  hasNodeHandler,
  getRegisteredNodeTypes,
  getAllRegistrations,
  validateGraphNodes,
  clearRegistry,
  type NodeHandler,
} from './node-registry';
import type { AgentState } from './state';

// Helper: cria um estado mínimo para testes
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

// Helper: handler dummy
const dummyHandler: NodeHandler = async (state) => ({ research: 'test' });
const anotherHandler: NodeHandler = async (state) => ({ draft: { title: 'T', content: 'C' } });

describe('node-registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  // ─────────────────────────────────────────────
  // registerNode
  // ─────────────────────────────────────────────
  describe('registerNode', () => {
    it('should register a node type', () => {
      registerNode('custom_test', dummyHandler);
      expect(hasNodeHandler('custom_test')).toBe(true);
    });

    it('should overwrite existing node with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerNode('test', dummyHandler);
      registerNode('test', anotherHandler);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("already registered"));
      consoleSpy.mockRestore();
    });

    it('should store description', () => {
      registerNode('described', dummyHandler, 'A described node');
      const regs = getAllRegistrations();
      expect(regs.find((r) => r.type === 'described')?.description).toBe('A described node');
    });
  });

  // ─────────────────────────────────────────────
  // getNodeHandler
  // ─────────────────────────────────────────────
  describe('getNodeHandler', () => {
    it('should return handler for registered type', () => {
      registerNode('test', dummyHandler);
      const handler = getNodeHandler('test');
      expect(handler).toBe(dummyHandler);
    });

    it('should throw descriptive error for unknown type', () => {
      expect(() => getNodeHandler('unknown_xyz')).toThrow(
        "Node type 'unknown_xyz' is not registered"
      );
    });

    it('should list available types in error message', () => {
      registerNode('alpha', dummyHandler);
      registerNode('beta', dummyHandler);
      expect(() => getNodeHandler('gamma')).toThrow(/alpha.*beta/);
    });
  });

  // ─────────────────────────────────────────────
  // hasNodeHandler
  // ─────────────────────────────────────────────
  describe('hasNodeHandler', () => {
    it('should return true for registered type', () => {
      registerNode('exists', dummyHandler);
      expect(hasNodeHandler('exists')).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(hasNodeHandler('missing')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // getRegisteredNodeTypes
  // ─────────────────────────────────────────────
  describe('getRegisteredNodeTypes', () => {
    it('should return empty array when registry is empty', () => {
      expect(getRegisteredNodeTypes()).toEqual([]);
    });

    it('should return all registered types', () => {
      registerNode('a', dummyHandler);
      registerNode('b', dummyHandler);
      expect(getRegisteredNodeTypes()).toContain('a');
      expect(getRegisteredNodeTypes()).toContain('b');
      expect(getRegisteredNodeTypes()).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────
  // getAllRegistrations
  // ─────────────────────────────────────────────
  describe('getAllRegistrations', () => {
    it('should return empty array when registry is empty', () => {
      expect(getAllRegistrations()).toEqual([]);
    });

    it('should return all registrations with metadata', () => {
      registerNode('r1', dummyHandler, 'First');
      registerNode('r2', anotherHandler, 'Second');
      const regs = getAllRegistrations();
      expect(regs).toHaveLength(2);
      expect(regs.map((r) => r.type)).toContain('r1');
      expect(regs.map((r) => r.type)).toContain('r2');
    });
  });

  // ─────────────────────────────────────────────
  // validateGraphNodes
  // ─────────────────────────────────────────────
  describe('validateGraphNodes', () => {
    it('should return empty array for all known types', () => {
      registerNode('researcher', dummyHandler);
      registerNode('writer', dummyHandler);
      const errors = validateGraphNodes(['researcher', 'writer']);
      expect(errors).toEqual([]);
    });

    it('should return errors for unknown types', () => {
      registerNode('known', dummyHandler);
      const errors = validateGraphNodes(['known', 'unknown_1', 'unknown_2']);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain("unknown_1");
      expect(errors[1]).toContain("unknown_2");
    });

    it('should include available types in error messages', () => {
      registerNode('alpha', dummyHandler);
      const errors = validateGraphNodes(['beta']);
      expect(errors[0]).toContain('alpha');
    });
  });

  // ─────────────────────────────────────────────
  // clearRegistry
  // ─────────────────────────────────────────────
  describe('clearRegistry', () => {
    it('should remove all registrations', () => {
      registerNode('a', dummyHandler);
      registerNode('b', dummyHandler);
      clearRegistry();
      expect(getRegisteredNodeTypes()).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // Handler execution
  // ─────────────────────────────────────────────
  describe('handler execution', () => {
    it('should execute registered handler and return partial state', async () => {
      const handler: NodeHandler = async (state) => ({
        research: `Research for ${state.clientName}`,
      });
      registerNode('exec_test', handler);

      const result = await getNodeHandler('exec_test')(makeState({ clientName: 'Acme' }));
      expect(result.research).toBe('Research for Acme');
    });

    it('should pass config to handler', async () => {
      const handler: NodeHandler = async (state, config) => ({
        research: config?.topic || 'default',
      });
      registerNode('config_test', handler);

      const result = await getNodeHandler('config_test')(makeState(), { topic: 'AI' });
      expect(result.research).toBe('AI');
    });
  });
});
