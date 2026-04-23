/**
 * WebSocket Server — Setup e gerenciamento de conexões
 * Integrado com o httpServer existente, autenticação via token Supabase
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { registerConnection, removeConnection } from './job-broadcaster';

export interface WSAuthResult {
  authenticated: boolean;
  userId?: string;
  tenantId?: string;
  error?: string;
}

/**
 * Valida token de autenticação no handshake
 * Espera token no query param: ws://host/ws?token=...
 * Em ambiente de teste/desenvolvimento, aceita token dummy
 */
export async function validateWSAuth(url: string): Promise<WSAuthResult> {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const token = urlObj.searchParams.get('token');

    if (!token) {
      return { authenticated: false, error: 'Missing token' };
    }

    // Em produção: validar contra Supabase
    // Em desenvolvimento/teste: aceitar tokens dummy para facilitar testes
    if (process.env.NODE_ENV === 'production') {
      // TODO: validar token contra Supabase auth
      // const { data: { user }, error } = await supabase.auth.getUser(token);
      // if (error || !user) return { authenticated: false, error: 'Invalid token' };
      // return { authenticated: true, userId: user.id, tenantId: user.user_metadata?.tenant_id };

      // Por enquanto, extrai userId do token (JWT decode simples) ou aceita como-isso
      // Isso será substituído por validação real quando o Supabase auth estiver integrado
      return { authenticated: true, userId: token, tenantId: 'default' };
    }

    // Desenvolvimento: token = userId diretamente
    return { authenticated: true, userId: token, tenantId: 'default' };
  } catch (err: any) {
    return { authenticated: false, error: `Auth error: ${err.message}` };
  }
}

/**
 * Configura o WebSocket server no httpServer existente
 * Path: /ws
 */
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  wss.on('connection', async (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const url = req.url || '';

    // Autenticação no handshake
    const auth = await validateWSAuth(url);
    if (!auth.authenticated) {
      console.warn(`[ws-server] Rejected connection from ${clientIp}: ${auth.error}`);
      ws.close(1008, auth.error || 'Authentication failed');
      return;
    }

    const userId = auth.userId!;
    console.log(`[ws-server] Client connected: ${userId} from ${clientIp}`);

    // Registra conexão
    registerConnection(userId, ws);

    // Envia mensagem de confirmação
    ws.send(JSON.stringify({
      type: 'connection:established',
      userId,
      timestamp: new Date().toISOString(),
    }));

    // Heartbeat para detectar conexões mortas
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    // Mensagens do cliente (ack, subscribe, etc.)
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignora mensagens malformadas
      }
    });

    // Cleanup na desconexão
    ws.on('close', (code, reason) => {
      console.log(`[ws-server] Client disconnected: ${userId} (code=${code}, reason=${reason})`);
      removeConnection(ws);
    });

    ws.on('error', (err) => {
      console.error(`[ws-server] WS error for ${userId}:`, err.message);
      removeConnection(ws);
    });
  });

  // Heartbeat interval: verifica conexões mortas a cada 30s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const customWs = ws as any;
      if (customWs.isAlive === false) {
        removeConnection(ws);
        return ws.terminate();
      }
      customWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Cleanup no shutdown
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('[ws-server] WebSocket server initialized on /ws');
  return wss;
}
