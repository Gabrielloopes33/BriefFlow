/**
 * Job Broadcaster — Emite eventos de progresso via WebSocket
 * Isolado por tenant, com fallback silencioso se WS não estiver disponível
 */

import type { WebSocket } from 'ws';
import type { JobEvent } from './job-events';

// Mapa de conexões ativas: userId → WebSocket
const connections = new Map<string, WebSocket>();

// Mapa inverso para lookup rápido: ws → userId
const wsToUserId = new Map<WebSocket, string>();

/**
 * Registra uma conexão WebSocket ativa para um usuário
 */
export function registerConnection(userId: string, ws: WebSocket): void {
  // Remove conexão anterior do mesmo usuário, se existir
  const existing = connections.get(userId);
  if (existing && existing !== ws && existing.readyState === 1) {
    existing.close(1000, 'Replaced by new connection');
  }
  connections.set(userId, ws);
  wsToUserId.set(ws, userId);
}

/**
 * Remove uma conexão WebSocket (por userId ou pela própria instância)
 */
export function removeConnection(userIdOrWs: string | WebSocket): void {
  if (typeof userIdOrWs === 'string') {
    const ws = connections.get(userIdOrWs);
    if (ws) {
      wsToUserId.delete(ws);
      connections.delete(userIdOrWs);
    }
  } else {
    const userId = wsToUserId.get(userIdOrWs);
    if (userId) {
      connections.delete(userId);
      wsToUserId.delete(userIdOrWs);
    }
  }
}

/**
 * Retorna o número de conexões ativas
 */
export function getActiveConnectionCount(): number {
  return connections.size;
}

/**
 * Retorna a lista de userIds conectados
 */
export function getConnectedUserIds(): string[] {
  return Array.from(connections.keys());
}

/**
 * Verifica se um usuário está conectado
 */
export function isUserConnected(userId: string): boolean {
  const ws = connections.get(userId);
  return ws !== undefined && ws.readyState === 1; // OPEN = 1
}

/**
 * Envia um evento para um usuário específico
 * Retorna true se enviou com sucesso, false se usuário não conectado
 */
export function sendToUser(userId: string, event: JobEvent): boolean {
  const ws = connections.get(userId);
  if (!ws || ws.readyState !== 1) {
    return false;
  }

  try {
    const message = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
    });
    ws.send(message);
    return true;
  } catch (err: any) {
    console.error('[broadcaster] Failed to send to user', userId, err.message);
    return false;
  }
}

/**
 * Broadcast de um evento de job
 * Envia para o usuário dono do job (userId) se conectado
 * Retorna true se entregue via WS, false se caiu em fallback
 */
export function broadcastJobEvent(userId: string, event: JobEvent): boolean {
  const delivered = sendToUser(userId, event);
  if (!delivered) {
    // Evento não entregue via WS — quem chamou deve usar fallback (polling)
    // Não logamos aqui para não poluir; o caller decide
  }
  return delivered;
}

/**
 * Broadcast para múltiplos usuários (ex: admins de um tenant)
 */
export function broadcastToUsers(userIds: string[], event: JobEvent): number {
  let delivered = 0;
  for (const userId of userIds) {
    if (sendToUser(userId, event)) {
      delivered++;
    }
  }
  return delivered;
}

/**
 * Limpa todas as conexões (útil para testes e shutdown)
 */
export function clearConnections(): void {
  for (const [userId, ws] of Array.from(connections.entries())) {
    if (ws.readyState === 1) {
      ws.close(1000, 'Server shutting down');
    }
  }
  connections.clear();
  wsToUserId.clear();
}
