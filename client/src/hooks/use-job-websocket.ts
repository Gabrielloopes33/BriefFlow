/**
 * useJobWebSocket — Hook para acompanhar progresso de jobs em tempo real
 * Conecta via WebSocket com fallback automático para polling HTTP
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type JobEventType =
  | 'job:stage'
  | 'agent:start'
  | 'agent:complete'
  | 'agent:error'
  | 'job:complete'
  | 'job:failed'
  | 'connection:established';

export interface JobEvent {
  type: JobEventType;
  jobId?: string;
  stage?: string;
  progress?: number;
  nodeId?: string;
  agentName?: string;
  summary?: string;
  error?: string;
  postId?: string;
  tenantId?: string;
}

export interface JobWebSocketState {
  connected: boolean;
  usingFallback: boolean;
  lastEvent: JobEvent | null;
  events: JobEvent[];
  error: string | null;
}

export interface UseJobWebSocketReturn extends JobWebSocketState {
  connect: (token: string) => void;
  disconnect: () => void;
}

const WS_PATH = '/ws';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${WS_PATH}`;
}

/**
 * Hook para conexão WebSocket de jobs
 * @param jobId — ID do job para filtrar eventos (opcional; se omitido, recebe todos)
 */
export function useJobWebSocket(jobId?: string): UseJobWebSocketReturn {
  const [state, setState] = useState<JobWebSocketState>({
    connected: false,
    usingFallback: false,
    lastEvent: null,
    events: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<string>('');

  const connect = useCallback((token: string) => {
    tokenRef.current = token;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Já conectado
    }

    const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useJobWebSocket] Connected');
      reconnectAttemptsRef.current = 0;
      setState((prev) => ({
        ...prev,
        connected: true,
        usingFallback: false,
        error: null,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Ignora heartbeats/pongs
        if (data.type === 'pong') return;

        const jobEvent: JobEvent = data.event || data;

        // Filtra por jobId se especificado
        if (jobId && jobEvent.jobId !== jobId) {
          return;
        }

        setState((prev) => ({
          ...prev,
          lastEvent: jobEvent,
          events: [...prev.events, jobEvent],
        }));
      } catch (err) {
        console.warn('[useJobWebSocket] Failed to parse message:', event.data);
      }
    };

    ws.onerror = (err) => {
      console.error('[useJobWebSocket] WS error:', err);
      setState((prev) => ({
        ...prev,
        connected: false,
        error: 'WebSocket connection error',
      }));
    };

    ws.onclose = (event) => {
      console.log(`[useJobWebSocket] Closed (code=${event.code})`);
      wsRef.current = null;
      setState((prev) => ({
        ...prev,
        connected: false,
      }));

      // Tenta reconectar se não foi fechado propositalmente
      if (event.code !== 1000 && event.code !== 1001) {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
          console.log(`[useJobWebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimerRef.current = setTimeout(() => {
            connect(token);
          }, delay);
        } else {
          console.log('[useJobWebSocket] Max reconnect attempts reached, switching to fallback');
          setState((prev) => ({
            ...prev,
            usingFallback: true,
            error: 'WebSocket unavailable — using polling fallback',
          }));
        }
      }
    };
  }, [jobId]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnected');
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setState({
      connected: false,
      usingFallback: false,
      lastEvent: null,
      events: [],
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
