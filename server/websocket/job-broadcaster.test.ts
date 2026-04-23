/**
 * Tests for job-broadcaster.ts
 * Sprint 5 — Story S5-01: WebSocket Real-Time
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerConnection,
  removeConnection,
  getActiveConnectionCount,
  getConnectedUserIds,
  isUserConnected,
  sendToUser,
  broadcastJobEvent,
  broadcastToUsers,
  clearConnections,
} from './job-broadcaster';
import type { JobEvent } from './job-events';

// Mock WebSocket
function createMockWebSocket(readyState = 1): any {
  return {
    readyState,
    send: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn(),
  };
}

function makeEvent(overrides: Partial<JobEvent> = {}): JobEvent {
  return {
    type: 'job:stage',
    jobId: 'job-1',
    stage: 'processing',
    progress: 50,
    tenantId: 'tenant-1',
    ...overrides,
  } as JobEvent;
}

describe('job-broadcaster', () => {
  beforeEach(() => {
    clearConnections();
  });

  // ─────────────────────────────────────────────
  // registerConnection / removeConnection
  // ─────────────────────────────────────────────
  describe('registerConnection', () => {
    it('should register a new connection', () => {
      const ws = createMockWebSocket();
      registerConnection('user-1', ws);
      expect(getActiveConnectionCount()).toBe(1);
      expect(isUserConnected('user-1')).toBe(true);
    });

    it('should replace existing connection for same user', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      registerConnection('user-1', ws1);
      registerConnection('user-1', ws2);
      expect(getActiveConnectionCount()).toBe(1);
      expect(ws1.close).toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('should remove by userId', () => {
      const ws = createMockWebSocket();
      registerConnection('user-1', ws);
      removeConnection('user-1');
      expect(isUserConnected('user-1')).toBe(false);
      expect(getActiveConnectionCount()).toBe(0);
    });

    it('should remove by ws instance', () => {
      const ws = createMockWebSocket();
      registerConnection('user-1', ws);
      removeConnection(ws);
      expect(isUserConnected('user-1')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // getConnectedUserIds
  // ─────────────────────────────────────────────
  describe('getConnectedUserIds', () => {
    it('should return all connected userIds', () => {
      registerConnection('user-a', createMockWebSocket());
      registerConnection('user-b', createMockWebSocket());
      expect(getConnectedUserIds()).toEqual(['user-a', 'user-b']);
    });
  });

  // ─────────────────────────────────────────────
  // isUserConnected
  // ─────────────────────────────────────────────
  describe('isUserConnected', () => {
    it('should return false for unregistered user', () => {
      expect(isUserConnected('unknown')).toBe(false);
    });

    it('should return false for closed connection', () => {
      const ws = createMockWebSocket(3); // CLOSED = 3
      registerConnection('user-1', ws);
      expect(isUserConnected('user-1')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // sendToUser
  // ─────────────────────────────────────────────
  describe('sendToUser', () => {
    it('should send message to connected user', () => {
      const ws = createMockWebSocket();
      registerConnection('user-1', ws);
      const event = makeEvent();
      const sent = sendToUser('user-1', event);

      expect(sent).toBe(true);
      expect(ws.send).toHaveBeenCalledOnce();
      const sentData = JSON.parse(ws.send.mock.calls[0][0]);
      expect(sentData.event).toEqual(event);
      expect(sentData.timestamp).toBeDefined();
    });

    it('should return false for disconnected user', () => {
      const event = makeEvent();
      const sent = sendToUser('unknown', event);
      expect(sent).toBe(false);
    });

    it('should return false for closed connection', () => {
      const ws = createMockWebSocket(3);
      registerConnection('user-1', ws);
      const event = makeEvent();
      const sent = sendToUser('user-1', event);
      expect(sent).toBe(false);
    });

    it('should handle send errors gracefully', () => {
      const ws = createMockWebSocket();
      ws.send = vi.fn(() => { throw new Error('Send failed'); });
      registerConnection('user-1', ws);
      const event = makeEvent();
      const sent = sendToUser('user-1', event);
      expect(sent).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // broadcastJobEvent
  // ─────────────────────────────────────────────
  describe('broadcastJobEvent', () => {
    it('should deliver event to connected user', () => {
      const ws = createMockWebSocket();
      registerConnection('user-1', ws);
      const event = makeEvent({ type: 'agent:start', nodeId: 'n1', agentName: 'researcher' });
      const delivered = broadcastJobEvent('user-1', event);

      expect(delivered).toBe(true);
      expect(ws.send).toHaveBeenCalledOnce();
    });

    it('should return false when user not connected', () => {
      const event = makeEvent();
      const delivered = broadcastJobEvent('offline-user', event);
      expect(delivered).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // broadcastToUsers
  // ─────────────────────────────────────────────
  describe('broadcastToUsers', () => {
    it('should deliver to multiple users and count successes', () => {
      registerConnection('user-1', createMockWebSocket());
      registerConnection('user-2', createMockWebSocket());
      const event = makeEvent();
      const delivered = broadcastToUsers(['user-1', 'user-2', 'offline'], event);

      expect(delivered).toBe(2);
    });
  });

  // ─────────────────────────────────────────────
  // clearConnections
  // ─────────────────────────────────────────────
  describe('clearConnections', () => {
    it('should close all connections and clear maps', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      registerConnection('user-1', ws1);
      registerConnection('user-2', ws2);
      clearConnections();

      expect(ws1.close).toHaveBeenCalled();
      expect(ws2.close).toHaveBeenCalled();
      expect(getActiveConnectionCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // Multi-tenant isolation
  // ─────────────────────────────────────────────
  describe('multi-tenant isolation', () => {
    it('should only send to target user, not broadcast to all', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      registerConnection('tenant-a-user', ws1);
      registerConnection('tenant-b-user', ws2);

      const event = makeEvent({ tenantId: 'tenant-a' });
      broadcastJobEvent('tenant-a-user', event);

      expect(ws1.send).toHaveBeenCalledOnce();
      expect(ws2.send).not.toHaveBeenCalled();
    });
  });
});
