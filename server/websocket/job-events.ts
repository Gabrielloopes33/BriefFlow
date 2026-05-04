/**
 * Tipos de eventos de job para WebSocket
 * Protocolo unificado entre backend e frontend
 */

export type JobEvent =
  | { type: 'job:stage'; jobId: string; stage: string; progress: number; tenantId: string }
  | { type: 'agent:start'; jobId: string; nodeId: string; agentName: string; tenantId: string }
  | { type: 'agent:complete'; jobId: string; nodeId: string; summary: string; tenantId: string }
  | { type: 'agent:error'; jobId: string; nodeId: string; error: string; tenantId: string }
  | { type: 'job:complete'; jobId: string; postId: string; tenantId: string }
  | { type: 'job:failed'; jobId: string; error: string; tenantId: string }
  | {
      type: 'workspace:post-updated';
      tenantId: string;
      clientId: string;
      postId: string;
      status?: string;
      stageTag?: string;
      scheduledFor?: string | null;
    }
  | {
      type: 'workspace:message-created';
      tenantId: string;
      clientId: string;
      threadId: string;
      messageId: string;
      authorRole: 'team' | 'client';
    };

/**
 * Payload genérico enviado pelo WebSocket
 */
export interface WebSocketMessage {
  event: JobEvent;
  timestamp: string;
}

/**
 * Filtro de eventos por jobId
 */
export function isEventForJob(event: JobEvent, jobId: string): boolean {
  return event.jobId === jobId;
}

/**
 * Filtro de eventos por tenantId (isolamento multi-tenant)
 */
export function isEventForTenant(event: JobEvent, tenantId: string): boolean {
  return event.tenantId === tenantId;
}
